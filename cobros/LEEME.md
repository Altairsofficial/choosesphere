# Cobros de Big Bang Agency (Stripe)

Todo lo necesario para cobrar los packs con Stripe: catálogo de precios, cupón del Programa
Fundadores y enlaces de pago listos para enviar a cada cliente.

| Fichero | Qué es |
| --- | --- |
| `catalogo.json` | Fuente única de productos, precios (sin IVA), cupones y enlaces de pago. Debe coincidir con la web. |
| `stripe_sync.py` | Crea o actualiza todo en Stripe. Idempotente: ejecutarlo dos veces no duplica nada. |
| `test_stripe_sync.py` | Pruebas sin red: validan cada petición contra los tipos del SDK de Stripe, simulan Stripe en memoria y comprueban que los precios coinciden con `agencia/index.html`. |
| `enlaces-prueba.json` / `enlaces-real.json` | Se generan al ejecutar el script: URL de cada enlace de pago. |

## Uso

```bash
pip install -r cobros/requirements.txt
python cobros/test_stripe_sync.py              # pruebas
python cobros/stripe_sync.py --dry-run          # ver qué se enviaría, sin Stripe
STRIPE_SECRET_KEY=sk_test_... python cobros/stripe_sync.py         # cuenta en modo prueba
STRIPE_SECRET_KEY=sk_live_... python cobros/stripe_sync.py --live  # cuenta real (con alta fiscal)
```

Sin `--live`, el script se niega a tocar una cuenta real.

## Cómo se cobra a un cliente

1. **Firma** → envías el enlace `<pack>_reserva`: cobra el 50 % de la puesta en marcha y genera factura.
   Los clientes del Programa Fundadores escriben el código `FUNDADORES` (−50 % sobre ese pago).
2. **Lanzamiento** → envías `<pack>_lanzamiento_mensual` (o `_anual`): cobra el 50 % restante de la
   puesta en marcha y la primera cuota, y deja la suscripción activa. Stripe renueva, factura y
   reintenta los impagos automáticamente.
3. **Diagnóstico** → enlace `diagnostico`. Si el cliente contrata en 30 días, crea en Stripe un código
   de un solo uso de 490 € para su enlace de reserva (Productos › Cupones).
4. **Extras y uso extra** → factura puntual desde Stripe (Facturas › Crear) con los productos «Extra · …».

## Antes de cobrar dinero real

- Estar dado de alta en Hacienda (autónomo o sociedad): sin alta no se puede facturar.
- Activar la cuenta de Stripe (datos fiscales e IBAN) y completar los datos de facturación.
- IVA: activar Stripe Tax con el registro en España y poner `"iva_automatico": true` en el catálogo,
  o facturar con un programa compatible con Veri*factu conectado a Stripe (Holded, Quaderno…).
- Activar el portal del cliente de Stripe (cambiar tarjeta, descargar facturas, cancelar).
- Ejecutar `python cobros/stripe_sync.py --live` y usar los enlaces de `enlaces-real.json`.
