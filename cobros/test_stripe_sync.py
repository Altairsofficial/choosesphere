"""Pruebas sin red de stripe_sync.py.

    python -m pytest cobros/        (o)    python cobros/test_stripe_sync.py

1. Cada cuerpo de petición se valida contra los tipos oficiales del SDK de Stripe (campos y valores permitidos).
2. Un cliente de Stripe simulado en memoria comprueba que la sincronización es idempotente
   y que un cambio de importe rehace el precio y los enlaces afectados.
3. Los importes del catálogo coinciden con los publicados en agencia/index.html.
"""
from __future__ import annotations

import copy
import itertools
import pathlib
import re
import sys
import types
import typing
from typing import Any, Literal, Union, get_args, get_origin

import stripe
import typing_extensions
from stripe.params import _coupon_create_params, _payment_link_create_params, _price_create_params
from stripe.params import _product_create_params, _promotion_code_create_params

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import stripe_sync as ss  # noqa: E402

RAIZ = pathlib.Path(__file__).resolve().parent.parent


# ----------------------------------------------------- 1. validación contra el SDK
def _evalua(texto: str, ns: dict):
    entorno = {**vars(typing), **vars(typing_extensions), **ns}
    try:
        return eval(texto, entorno)  # noqa: S307 (anotaciones del propio SDK)
    except NameError:
        # Algunos tipos del SDK solo existen al comprobar tipos (TYPE_CHECKING): se descartan esas ramas.
        ramas = []
        for parte in texto.split("|"):
            try:
                ramas.append(eval(parte.strip(), entorno))  # noqa: S307
            except NameError:
                pass
        if not ramas:
            raise
        return Union[tuple(ramas)] if len(ramas) > 1 else ramas[0]


def _resuelve(tipo, ns: dict):
    """Evalúa anotaciones en texto o ForwardRef con el espacio de nombres del módulo del SDK."""
    while True:
        if isinstance(tipo, typing.ForwardRef):
            tipo = tipo.__forward_arg__
        if isinstance(tipo, str):
            tipo = _evalua(tipo, ns)
            continue
        if get_origin(tipo) in (typing_extensions.NotRequired, typing_extensions.Required):
            tipo = get_args(tipo)[0]
            continue
        return tipo


def _anotaciones(td) -> dict:
    """Anotaciones propias de un TypedDict y de sus bases, sin evaluar (el SDK usa referencias diferidas)."""
    anots = {}
    for base in reversed(td.__mro__):
        anots.update(getattr(base, "__annotations__", {}))
    return anots


def _comprueba(valor, tipo, ruta: str, ns: dict | None = None) -> None:
    ns = ns or {}
    tipo = _resuelve(tipo, ns)
    if tipo is Any:
        return
    origen, args = get_origin(tipo), get_args(tipo)
    if origen in (Union, types.UnionType):
        # El SDK acepta "Literal[...] | str" por compatibilidad futura; aquí exigimos un valor documentado.
        literales = [v for arm in args if get_origin(arm) is Literal for v in get_args(arm)]
        if literales and isinstance(valor, str) and str in args:
            assert valor in literales, f"{ruta}: {valor!r} no está entre {tuple(literales)}"
            return
        fallos = []
        for arm in args:
            try:
                _comprueba(valor, arm, ruta, ns)
                return
            except AssertionError as e:
                fallos.append(str(e))
        raise AssertionError(f"{ruta}: no encaja en ningún tipo ({'; '.join(fallos)})")
    if origen is Literal:
        assert valor in args, f"{ruta}: {valor!r} no está entre {args}"
        return
    if origen in (list, typing.List):
        assert isinstance(valor, list), f"{ruta}: se esperaba lista"
        for i, v in enumerate(valor):
            _comprueba(v, args[0], f"{ruta}[{i}]", ns)
        return
    if origen in (dict, typing.Dict):
        assert isinstance(valor, dict), f"{ruta}: se esperaba objeto"
        for k, v in valor.items():
            _comprueba(v, args[1], f"{ruta}.{k}", ns)
        return
    if typing.is_typeddict(tipo) or typing_extensions.is_typeddict(tipo):
        assert isinstance(valor, dict), f"{ruta}: se esperaba objeto {tipo.__name__}"
        anots = _anotaciones(tipo)
        ns_td = vars(sys.modules[tipo.__module__])
        for k, v in valor.items():
            assert k in anots, f"{ruta}.{k}: campo desconocido para {tipo.__name__}"
            _comprueba(v, anots[k], f"{ruta}.{k}", ns_td)
        return
    if tipo is bool:
        assert isinstance(valor, bool), f"{ruta}: se esperaba booleano"
        return
    if tipo in (int, float):
        assert isinstance(valor, (int, float)) and not isinstance(valor, bool), f"{ruta}: se esperaba número"
        return
    if tipo is str:
        assert isinstance(valor, str), f"{ruta}: se esperaba texto"
        return
    raise AssertionError(f"{ruta}: tipo no contemplado en la prueba: {tipo!r}")


def test_cuerpos_validos_segun_sdk():
    cat = ss.cargar_catalogo()
    ids = {k: f"price_{k}" for k in ss.precios_del_catalogo(cat)}
    for p in cat["productos"]:
        _comprueba(ss.payload_producto(p), _product_create_params.ProductCreateParams, f"producto {p['id']}")
    for pid, pr in ss.precios_del_catalogo(cat).values():
        _comprueba(ss.payload_precio(pid, pr, cat["moneda"]), _price_create_params.PriceCreateParams, f"precio {pr['lookup_key']}")
    for c in cat["cupones"]:
        _comprueba(ss.payload_cupon(c), _coupon_create_params.CouponCreateParams, f"cupón {c['id']}")
        assert len(c["nombre"]) <= 40, f"cupón {c['id']}: Stripe admite nombres de 40 caracteres como máximo"
        _comprueba(ss.payload_codigo(c), _promotion_code_create_params.PromotionCodeCreateParams, f"código {c['codigo']}")
    for e in cat["enlaces"]:
        _comprueba(ss.payload_enlace(e, cat, ids), _payment_link_create_params.PaymentLinkCreateParams, f"enlace {e['clave']}")
        assert len(ss.payload_enlace(e, cat, ids)["custom_text"]["submit"]["message"]) <= 1200


def test_iva_automatico_valido_segun_sdk():
    cat = ss.cargar_catalogo()
    cat["iva_automatico"] = True
    ids = {k: f"price_{k}" for k in ss.precios_del_catalogo(cat)}
    for e in cat["enlaces"]:
        _comprueba(ss.payload_enlace(e, cat, ids), _payment_link_create_params.PaymentLinkCreateParams, e["clave"])


def test_suscripciones_sin_invoice_creation():
    cat = ss.cargar_catalogo()
    ids = {k: f"price_{k}" for k in ss.precios_del_catalogo(cat)}
    for e in cat["enlaces"]:
        d = ss.payload_enlace(e, cat, ids)
        assert ("invoice_creation" in d) == (not ss.es_recurrente(e, cat)), e["clave"]


# ----------------------------------------------------- 2. Stripe simulado en memoria
class Obj(dict):
    def __getattr__(self, k):
        try:
            return self[k]
        except KeyError as e:
            raise AttributeError(k) from e


class Lista:
    def __init__(self, datos):
        self.data = datos

    def auto_paging_iter(self):
        return iter(self.data)


class Servicio:
    def __init__(self, nombre, prefijo, estado):
        self.nombre, self.prefijo, self.estado = nombre, prefijo, estado
        self.objs: dict[str, Obj] = {}

    def _id(self):
        return f"{self.prefijo}_{next(self.estado['contador'])}"

    def create(self, params):
        self.estado["llamadas"].append((self.nombre, "create", copy.deepcopy(params)))
        d = Obj(copy.deepcopy(params))
        d.setdefault("id", self._id())
        d.setdefault("active", True)
        if self.nombre == "prices":
            if d.pop("transfer_lookup_key", False):
                for o in self.objs.values():
                    if o.get("lookup_key") == d["lookup_key"]:
                        o["lookup_key"] = None
            elif any(o.get("lookup_key") == d["lookup_key"] for o in self.objs.values()):
                raise stripe.InvalidRequestError("lookup_key duplicada", param="lookup_key")
        if self.nombre == "payment_links":
            d["url"] = f"https://buy.stripe.com/test_{d['id']}"
        self.objs[d["id"]] = d
        return d

    def retrieve(self, id_):
        if id_ not in self.objs:
            raise stripe.InvalidRequestError("No such object", param="id", code="resource_missing")
        return self.objs[id_]

    def update(self, id_, params):
        self.estado["llamadas"].append((self.nombre, "update", copy.deepcopy(params)))
        self.objs[id_].update(copy.deepcopy(params))
        return self.objs[id_]

    def list(self, params=None):
        params = params or {}
        datos = list(self.objs.values())
        if "lookup_keys" in params:
            datos = [o for o in datos if o.get("lookup_key") in params["lookup_keys"]]
        if "active" in params:
            datos = [o for o in datos if o.get("active") == params["active"]]
        if "code" in params:
            datos = [o for o in datos if o.get("code") == params["code"]]
        if "product" in params:
            datos = [o for o in datos if o.get("product") == params["product"]]
        return Lista(datos)


class StripeFalso:
    def __init__(self):
        self.estado = {"contador": itertools.count(1), "llamadas": []}
        self.v1 = types.SimpleNamespace(
            products=Servicio("products", "prod", self.estado),
            prices=Servicio("prices", "price", self.estado),
            coupons=Servicio("coupons", "coupon", self.estado),
            promotion_codes=Servicio("promotion_codes", "promo", self.estado),
            payment_links=Servicio("payment_links", "plink", self.estado),
            balance=types.SimpleNamespace(retrieve=lambda: Obj(livemode=False)),
        )


def test_sincronizacion_idempotente():
    cat = ss.cargar_catalogo()
    falso = StripeFalso()
    s1 = ss.Sincronizador(falso, cat, log=lambda *_: None)
    urls1 = s1.todo()
    n_precios = sum(len(p["precios"]) for p in cat["productos"])
    assert s1.creados == len(cat["productos"]) + n_precios + 2 + len(cat["enlaces"])
    assert set(urls1) == {e["clave"] for e in cat["enlaces"]}

    s2 = ss.Sincronizador(falso, cat, log=lambda *_: None)
    urls2 = s2.todo()
    assert (s2.creados, s2.actualizados) == (0, 0), "la segunda ejecución no debe tocar nada"
    assert urls1 == urls2


def test_cambio_de_importe_rehace_precio_y_enlaces():
    cat = ss.cargar_catalogo()
    falso = StripeFalso()
    urls1 = ss.Sincronizador(falso, cat, log=lambda *_: None).todo()

    cat2 = copy.deepcopy(cat)
    for p in cat2["productos"]:
        for pr in p["precios"]:
            if pr["lookup_key"] == "bba_arranque_mensual":
                pr["importe"] = 359
    s = ss.Sincronizador(falso, cat2, log=lambda *_: None)
    urls2 = s.todo()

    precios = falso.v1.prices.objs.values()
    vigentes = [o for o in precios if o.get("lookup_key") == "bba_arranque_mensual"]
    assert len(vigentes) == 1 and vigentes[0]["unit_amount"] == 35900 and vigentes[0]["active"]
    antiguos = [o for o in precios if o.get("nickname") == "bba_arranque_mensual" and o["unit_amount"] == 34900]
    assert antiguos and not antiguos[0]["active"], "el precio antiguo debe quedar archivado"

    cambiados = {k for k in urls1 if urls1[k] != urls2[k]}
    assert cambiados == {"arranque_lanzamiento_mensual"}, cambiados
    activos = [pl for pl in falso.v1.payment_links.objs.values()
               if pl["metadata"]["bba_clave"] == "arranque_lanzamiento_mensual" and pl["active"]]
    assert len(activos) == 1, "solo debe quedar activo el enlace nuevo"


def test_rechaza_cuenta_real_sin_live(monkeypatch=None):
    falso = StripeFalso()
    falso.v1.balance = types.SimpleNamespace(retrieve=lambda: Obj(livemode=True))
    original = ss.stripe.StripeClient
    ss.stripe.StripeClient = lambda *_a, **_k: falso
    import os
    previa = os.environ.get("STRIPE_SECRET_KEY")
    os.environ["STRIPE_SECRET_KEY"] = "sk_live_falsa"
    try:
        assert ss.main([]) == 3
        assert not falso.estado["llamadas"], "no debe crear nada en una cuenta real sin --live"
    finally:
        ss.stripe.StripeClient = original
        if previa is None:
            os.environ.pop("STRIPE_SECRET_KEY", None)
        else:
            os.environ["STRIPE_SECRET_KEY"] = previa


# ------------------------------------------- 3. el catálogo coincide con la web
def test_catalogo_coincide_con_la_web():
    cat = ss.cargar_catalogo()
    defs = {k: pr["importe"] for k, (_, pr) in ss.precios_del_catalogo(cat).items()}
    html = (RAIZ / "agencia" / "index.html").read_text(encoding="utf-8")
    for pack in ("arranque", "crecimiento", "escala"):
        bloque = html[html.index(f'id="pack-{pack}"'):]
        mensual = int(re.search(r'data-monthly="(\d+)"', bloque).group(1))
        anual_mes = int(re.search(r'data-annual="(\d+)"', bloque).group(1))
        setup = int(re.search(r'<b>([\d.]+) €</b>', bloque).group(1).replace(".", ""))
        assert defs[f"bba_{pack}_mensual"] == mensual, pack
        assert defs[f"bba_{pack}_anual"] == mensual * 10, pack
        assert round(defs[f"bba_{pack}_anual"] / 12) == anual_mes, pack
        assert defs[f"bba_{pack}_setup_50"] * 2 == setup, pack
    assert defs["bba_diagnostico"] == 590 and "590 €" in html
    assert cat["impuestos_incluidos"] and "IVA incluido" in html


def test_precios_con_iva_incluido():
    cat = ss.cargar_catalogo()
    for pid, pr in ss.precios_del_catalogo(cat).values():
        assert ss.payload_precio(pid, pr, cat["moneda"])["tax_behavior"] == "inclusive", pr["lookup_key"]


def test_retira_productos_fuera_del_catalogo():
    cat = ss.cargar_catalogo()
    falso = StripeFalso()
    ss.Sincronizador(falso, cat, log=lambda *_: None).todo()
    cat2 = copy.deepcopy(cat)
    cat2["productos"] = [p for p in cat2["productos"] if p["id"] != "bba_extra_canal"]
    s = ss.Sincronizador(falso, cat2, log=lambda *_: None)
    s.todo()
    assert not falso.v1.products.objs["bba_extra_canal"]["active"]
    assert all(not pr["active"] for pr in falso.v1.prices.objs.values() if pr["product"] == "bba_extra_canal")
    assert falso.v1.products.objs["bba_extra_uso"]["active"], "los demás productos siguen activos"
    s3 = ss.Sincronizador(falso, cat2, log=lambda *_: None)
    s3.todo()
    assert (s3.creados, s3.actualizados) == (0, 0)


if __name__ == "__main__":
    pruebas = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for t in pruebas:
        t()
        print(f"ok  {t.__name__}")
    print(f"{len(pruebas)} pruebas superadas")
