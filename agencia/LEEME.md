# Web de Big Bang Agency (`/agencia/`)

Landing estática y autocontenida (HTML + CSS + JS, sin dependencias externas ni cookies).

## Cambiar precios
1. `index.html`: tarjetas de packs (`data-monthly` / `data-annual` y notas `data-note-annual`),
   tabla comparativa, extras, opciones del formulario y el bloque JSON-LD del `<head>`.
2. `js/agencia.js`: objeto `PLANS` (lo usa la calculadora de ahorro).
3. `condiciones.html`: si cambian reglas de pago, permanencia o uso extra.
4. `cobros/catalogo.json`: los mismos importes para Stripe (una prueba avisa si no coinciden).

Precio anual = 10 mensualidades / 12, redondeado al euro.

## Antes de publicar
- Netlify › Site settings › Forms: activar la detección de formularios y la notificación por email
  del formulario `contacto-agencia`.
- Las páginas legales están en «modo lanzamiento» (proyecto aún sin constituir). Al darte de alta,
  añade nombre o razón social, NIF y domicilio en `aviso-legal.html`, `privacidad.html` y `condiciones.html`.
- Cambiar `contacto@choosesphere.com` y las URL `choosesphere.netlify.app` si hay dominio propio.
- Los cobros se gestionan con Stripe desde la carpeta `cobros/` (ver su LEEME).

## Estructura
- `index.html` — landing con packs, comparativa, calculadora, FAQ y formulario
- `gracias.html` — confirmación del formulario
- `aviso-legal.html`, `privacidad.html`, `cookies.html`, `condiciones.html` — legales
- `css/agencia.css`, `js/agencia.js`, `fonts/` (Inter y Plus Jakarta Sans, licencia OFL), `img/`
