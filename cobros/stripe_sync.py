#!/usr/bin/env python3
"""Crea en Stripe todo lo necesario para cobrar los packs de Big Bang Agency.

Lee cobros/catalogo.json y deja en la cuenta de Stripe:
  - un producto y sus precios por cada pack y extra (precios sin IVA),
  - el cupón y el código promocional del Programa Fundadores,
  - los enlaces de pago que se envían al cliente (diagnóstico, reserva y lanzamiento de cada pack).

Uso:
  python cobros/stripe_sync.py --dry-run   # enseña lo que haría, sin llamar a Stripe
  python cobros/stripe_sync.py             # cuenta en MODO PRUEBA (se niega a tocar una cuenta real)
  python cobros/stripe_sync.py --live      # cuenta real, solo cuando estés dado de alta

La clave secreta se lee de la variable de entorno STRIPE_SECRET_KEY. Si tu red usa un proxy que
re-firma TLS, indica su certificado en STRIPE_CA_BUNDLE.
Es idempotente: si lo ejecutas dos veces no duplica nada. Si cambias un importe en el catálogo,
crea el precio nuevo, le pasa la lookup_key, archiva el anterior y rehace los enlaces afectados.
Al terminar escribe cobros/enlaces-prueba.json (o enlaces-real.json) con las URL de pago.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import sys

import stripe

AQUI = pathlib.Path(__file__).resolve().parent
INTERVALOS = {"mensual": "month", "anual": "year"}
MARCA = {"bba": "1"}  # metadato para reconocer lo que crea este script


# --------------------------------------------------------------------------- catálogo
def cargar_catalogo(ruta: pathlib.Path = AQUI / "catalogo.json") -> dict:
    cat = json.loads(ruta.read_text(encoding="utf-8"))
    claves = [pr["lookup_key"] for p in cat["productos"] for pr in p["precios"]]
    if len(claves) != len(set(claves)):
        raise ValueError("Hay lookup_key repetidas en el catálogo")
    for e in cat["enlaces"]:
        for k in e["lineas"]:
            if k not in claves:
                raise ValueError(f"El enlace {e['clave']} usa un precio inexistente: {k}")
    return cat


def centimos(euros: float) -> int:
    return int(round(euros * 100))


def precios_del_catalogo(cat: dict) -> dict:
    """lookup_key -> (id de producto, definición del precio)."""
    return {pr["lookup_key"]: (p["id"], pr) for p in cat["productos"] for pr in p["precios"]}


# ----------------------------------------------------------- cuerpos de las peticiones
def payload_producto(p: dict) -> dict:
    d = {"id": p["id"], "name": p["nombre"], "metadata": dict(MARCA)}
    if p.get("descripcion"):
        d["description"] = p["descripcion"]
    return d


def payload_precio(producto_id: str, pr: dict, moneda: str) -> dict:
    d = {
        "product": producto_id,
        "currency": moneda,
        "unit_amount": centimos(pr["importe"]),
        "lookup_key": pr["lookup_key"],
        "nickname": pr["lookup_key"],
        "tax_behavior": "exclusive",  # el IVA, cuando se active, se suma encima
        "metadata": dict(MARCA),
    }
    if pr["tipo"] in INTERVALOS:
        d["recurring"] = {"interval": INTERVALOS[pr["tipo"]]}
    elif pr["tipo"] != "unico":
        raise ValueError(f"Tipo de precio desconocido: {pr['tipo']}")
    return d


def payload_cupon(c: dict) -> dict:
    return {
        "id": c["id"],
        "name": c["nombre"],
        "percent_off": c["porcentaje"],
        "duration": "once",
        "applies_to": {"products": list(c["aplica_a"])},
        "max_redemptions": c["usos_maximos"],
        "metadata": dict(MARCA),
    }


def payload_codigo(c: dict) -> dict:
    return {
        "code": c["codigo"],
        "promotion": {"type": "coupon", "coupon": c["id"]},
        "max_redemptions": c["usos_maximos"],
        "metadata": dict(MARCA),
    }


def es_recurrente(enlace: dict, cat: dict) -> bool:
    defs = precios_del_catalogo(cat)
    return any(defs[k][1]["tipo"] in INTERVALOS for k in enlace["lineas"])


def payload_enlace(enlace: dict, cat: dict, id_precio: dict) -> dict:
    lineas = [{"price": id_precio[k], "quantity": 1} for k in enlace["lineas"]]
    d = {
        "line_items": lineas,
        "after_completion": {
            "type": "hosted_confirmation",
            "hosted_confirmation": {"custom_message": cat["mensaje_confirmacion"]},
        },
        "billing_address_collection": "required",
        "tax_id_collection": {"enabled": True},  # NIF/CIF del cliente para la factura
        "allow_promotion_codes": bool(enlace["codigos_promocionales"]),
        "custom_text": {
            "submit": {
                "message": f"{enlace['descripcion']}. Al pagar aceptas las condiciones de contratación: {cat['url_condiciones']}"
            }
        },
    }
    if not es_recurrente(enlace, cat):
        d["invoice_creation"] = {"enabled": True}  # las suscripciones ya generan factura
    if cat.get("iva_automatico"):
        d["automatic_tax"] = {"enabled": True}
    firma = hashlib.sha256(json.dumps(d, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:12]
    d["metadata"] = {**MARCA, "bba_clave": enlace["clave"], "bba_firma": firma}
    return d


# ------------------------------------------------------------------ sincronización
def _d(obj):
    """Los objetos del SDK de Stripe no son diccionarios desde la v13: se convierten para leerlos igual."""
    return obj.to_dict() if hasattr(obj, "to_dict") else obj


class Sincronizador:
    def __init__(self, cliente, cat: dict, log=print):
        self.c = cliente.v1
        self.cat = cat
        self.log = log
        self.creados = 0
        self.actualizados = 0

    def _crear(self, servicio: str, datos: dict, etiqueta: str):
        obj = _d(getattr(self.c, servicio).create(datos))
        self.creados += 1
        self.log(f"  + {servicio[:-1]} {etiqueta}")
        return obj

    def _actualizar(self, servicio: str, id_: str, datos: dict, etiqueta: str):
        obj = _d(getattr(self.c, servicio).update(id_, datos))
        self.actualizados += 1
        self.log(f"  ~ {servicio[:-1]} {etiqueta}: {', '.join(datos)}")
        return obj

    # productos -------------------------------------------------------------
    def productos(self) -> None:
        self.log("Productos")
        for p in self.cat["productos"]:
            try:
                actual = _d(self.c.products.retrieve(p["id"]))
            except stripe.InvalidRequestError as e:
                if getattr(e, "code", None) != "resource_missing":
                    raise
                self._crear("products", payload_producto(p), p["id"])
                continue
            cambios = {}
            if actual.get("name") != p["nombre"]:
                cambios["name"] = p["nombre"]
            if p.get("descripcion") and actual.get("description") != p["descripcion"]:
                cambios["description"] = p["descripcion"]
            if not actual.get("active", True):
                cambios["active"] = True
            if cambios:
                self._actualizar("products", p["id"], cambios, p["id"])

    # precios ---------------------------------------------------------------
    def precios(self) -> dict:
        """Devuelve lookup_key -> id del precio vigente en Stripe."""
        self.log("Precios")
        defs = precios_del_catalogo(self.cat)
        claves = list(defs)
        existentes = {}
        for i in range(0, len(claves), 10):  # Stripe acepta hasta 10 lookup_keys por consulta
            res = self.c.prices.list({"lookup_keys": claves[i:i + 10], "limit": 100})
            for pr in map(_d, res.auto_paging_iter()):
                existentes[pr.get("lookup_key")] = pr

        ids = {}
        for clave, (producto_id, pr) in defs.items():
            quiero = payload_precio(producto_id, pr, self.cat["moneda"])
            actual = existentes.get(clave)
            if actual is not None and self._mismo_precio(actual, quiero):
                if not actual.get("active", True):
                    self._actualizar("prices", actual["id"], {"active": True}, clave)
                ids[clave] = actual["id"]
                continue
            if actual is not None:
                quiero["transfer_lookup_key"] = True  # el precio nuevo hereda la lookup_key
            nuevo = self._crear("prices", quiero, f"{clave} ({pr['importe']} €)")
            ids[clave] = nuevo["id"]
            if actual is not None:
                self._actualizar("prices", actual["id"], {"active": False}, f"{clave} anterior")
        return ids

    @staticmethod
    def _mismo_precio(actual, quiero: dict) -> bool:
        rec = actual.get("recurring") or {}
        intervalo = rec.get("interval") if rec else None
        producto = actual.get("product")
        producto = producto if isinstance(producto, str) else (producto or {}).get("id")
        return (
            actual.get("unit_amount") == quiero["unit_amount"]
            and actual.get("currency") == quiero["currency"]
            and intervalo == (quiero.get("recurring") or {}).get("interval")
            and producto == quiero["product"]
        )

    # cupones ---------------------------------------------------------------
    def cupones(self) -> None:
        self.log("Cupones")
        for c in self.cat.get("cupones", []):
            try:
                actual = _d(self.c.coupons.retrieve(c["id"]))
                if actual.get("percent_off") != c["porcentaje"]:
                    raise SystemExit(
                        f"El cupón {c['id']} ya existe con otro porcentaje. Los cupones no se pueden "
                        "modificar en Stripe: cambia su id en el catálogo y vuelve a ejecutar."
                    )
            except stripe.InvalidRequestError as e:
                if getattr(e, "code", None) != "resource_missing":
                    raise
                self._crear("coupons", payload_cupon(c), c["id"])
            if c.get("codigo"):
                codigos = self.c.promotion_codes.list({"code": c["codigo"], "limit": 10})
                if not any(_d(pc).get("active", True) for pc in codigos.auto_paging_iter()):
                    self._crear("promotion_codes", payload_codigo(c), c["codigo"])

    # enlaces de pago -------------------------------------------------------
    def enlaces(self, id_precio: dict) -> dict:
        """Devuelve clave -> URL del enlace de pago vigente."""
        self.log("Enlaces de pago")
        vigentes = {}
        for pl in map(_d, self.c.payment_links.list({"active": True, "limit": 100}).auto_paging_iter()):
            meta = pl.get("metadata") or {}
            if meta.get("bba_clave"):
                vigentes.setdefault(meta["bba_clave"], []).append(pl)

        urls = {}
        for enlace in self.cat["enlaces"]:
            quiero = payload_enlace(enlace, self.cat, id_precio)
            firma = quiero["metadata"]["bba_firma"]
            previos = vigentes.get(enlace["clave"], [])
            igual = next((pl for pl in previos if (pl.get("metadata") or {}).get("bba_firma") == firma), None)
            if igual is not None:
                urls[enlace["clave"]] = igual["url"]
            else:
                nuevo = self._crear("payment_links", quiero, enlace["clave"])
                urls[enlace["clave"]] = nuevo["url"]
            for pl in previos:  # desactiva versiones antiguas o duplicadas
                if pl is not igual:
                    self._actualizar("payment_links", pl["id"], {"active": False}, f"{enlace['clave']} anterior")
        return urls

    def todo(self) -> dict:
        self.productos()
        ids = self.precios()
        self.cupones()
        return self.enlaces(ids)


# ------------------------------------------------------------------------ programa
def simular(cat: dict) -> None:
    """--dry-run: imprime los cuerpos de las peticiones sin llamar a Stripe."""
    ids = {k: f"price_<{k}>" for k in precios_del_catalogo(cat)}
    plan = {
        "productos": [payload_producto(p) for p in cat["productos"]],
        "precios": [payload_precio(pid, pr, cat["moneda"]) for pid, pr in precios_del_catalogo(cat).values()],
        "cupones": [payload_cupon(c) for c in cat.get("cupones", [])],
        "codigos": [payload_codigo(c) for c in cat.get("cupones", []) if c.get("codigo")],
        "enlaces": [payload_enlace(e, cat, ids) for e in cat["enlaces"]],
    }
    print(json.dumps(plan, indent=2, ensure_ascii=False))


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--live", action="store_true", help="permite operar sobre una cuenta real (cobros de verdad)")
    ap.add_argument("--dry-run", action="store_true", help="muestra lo que haría, sin llamar a Stripe")
    args = ap.parse_args(argv)

    cat = cargar_catalogo()
    if args.dry_run:
        simular(cat)
        return 0

    clave = os.environ.get("STRIPE_SECRET_KEY")
    if not clave:
        print("Falta STRIPE_SECRET_KEY (Stripe › Desarrolladores › Claves de API).", file=sys.stderr)
        return 2
    if os.environ.get("STRIPE_CA_BUNDLE"):  # redes con proxy que re-firma TLS (p. ej. proxies corporativos)
        stripe.ca_bundle_path = os.environ["STRIPE_CA_BUNDLE"]
    cliente = stripe.StripeClient(clave)

    real = bool(_d(cliente.v1.balance.retrieve()).get("livemode"))
    if real and not args.live:
        print("Esta clave es de una cuenta REAL. Si de verdad quieres crear los cobros reales, añade --live.", file=sys.stderr)
        return 3
    modo = "real" if real else "prueba"
    print(f"Cuenta de Stripe en modo {modo.upper()}")

    s = Sincronizador(cliente, cat)
    urls = s.todo()

    salida = AQUI / f"enlaces-{modo}.json"
    salida.write_text(json.dumps(urls, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\n{s.creados} creados, {s.actualizados} actualizados. Enlaces guardados en {salida.relative_to(AQUI.parent)}:")
    for clave_enlace, url in urls.items():
        print(f"  {clave_enlace:34} {url}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
