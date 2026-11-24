# Tilo y Nuba: kit de canal infantil (aparcado)

Este primer enfoque se ha dejado de lado para centrarse en un canal automatizado sin cara.
Se guarda porque el motor de render (Playwright + ffmpeg) sirve para el nuevo canal y porque
los productos se pueden vender por separado.

## Contenido

| Carpeta | Qué hay |
|---|---|
| `marca/` | Avatar 800×800, banner 2560×1440, logo, miniatura de ejemplo, hoja de personajes y los SVG de los personajes |
| `productos/` | Libro para colorear en PDF (11 páginas A4), portada y 2 láminas gratuitas de muestra |
| `ejemplos/` | Vídeo de cumpleaños personalizado de ejemplo (vertical, 26 s) |
| `herramientas/` | Scripts que generan todo lo anterior |

## Uso

Requiere Node 18+, Playwright con Chromium y ffmpeg.

```bash
cd canal-infantil
node herramientas/generar-marca.js        # regenera marca/
node herramientas/generar-colorear.js     # regenera productos/
node herramientas/video-cumple.js --nombre "Lucía" --edad 4
node herramientas/video-cumple.js --pedidos pedidos.csv   # CSV: nombre,edad,mensaje
```

Los vídeos de pedidos se guardan en `pedidos/`. Esa carpeta está excluida de git porque contiene nombres de menores.

## Licencias

- Fuente Fredoka: SIL Open Font License (`herramientas/fuentes/OFL-Fredoka.txt`).
- La melodía de "Cumpleaños feliz" es de dominio público.
- Los personajes y la música sintetizada son originales.
