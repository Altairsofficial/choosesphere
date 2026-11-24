# Web de Sphere Agents (`/agencia/`)

Landing estática y autocontenida (HTML + CSS + JS, sin dependencias externas ni cookies).

## Cambiar precios
1. `index.html`: tarjetas de packs (`data-monthly` / `data-annual` y notas `data-note-annual`),
   tabla comparativa, extras, opciones del formulario y el bloque JSON-LD del `<head>`.
2. `js/agencia.js`: objeto `PLANS` (lo usa la calculadora de ahorro).
3. `condiciones.html`: si cambian reglas de pago, permanencia o uso extra.

Precio anual = 10 mensualidades / 12, redondeado al euro.

## Antes de publicar
- Rellenar los datos marcados en amarillo (`class="todo"`) en `aviso-legal.html`, `privacidad.html`
  y `condiciones.html`, y quitar el aviso `.notice` de esas páginas.
- Netlify › Site settings › Forms: activar la detección de formularios y la notificación por email
  del formulario `contacto-agencia`.
- Cambiar `contacto@choosesphere.com` y las URL `choosesphere.netlify.app` si hay dominio propio.

## Estructura
- `index.html` — landing con packs, comparativa, calculadora, FAQ y formulario
- `gracias.html` — confirmación del formulario
- `aviso-legal.html`, `privacidad.html`, `cookies.html`, `condiciones.html` — legales
- `css/agencia.css`, `js/agencia.js`, `fonts/` (Inter y Plus Jakarta Sans, licencia OFL), `img/`
