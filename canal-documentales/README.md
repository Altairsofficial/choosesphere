# Canal de documentales sin cara: sistema de producción

Este sistema produce documentales narrados sobre desastres y misterios reales, en español.
La estrategia, los costes y las normas de YouTube están en [ESTRATEGIA.md](ESTRATEGIA.md).

```
tema ─► investigar ─► guion (Claude) ─► REVISIÓN HUMANA ─► voz (ElevenLabs) ─► imágenes (Wikimedia) ─► montaje ─► publicar
```

## Puesta en marcha

Requisitos: Node 22+, ffmpeg y Playwright con Chromium.

```bash
cd canal-documentales
npm install
export ANTHROPIC_API_KEY=...      # solo para escribir guiones
export ELEVENLABS_API_KEY=...     # en este entorno de Claude la clave la pone el proxy automáticamente
```

## Producir un vídeo

```bash
# 1. Investigar y escribir el guion (unos 2 minutos)
node herramientas/producir.js guion "Explosión de San Juanico"

# 2. REVISAR guiones/explosion-de-san-juanico.json:
#    - corregir datos (mira el apartado "verificar")
#    - mejorar el gancho y comprobar que el tono es respetuoso

# 3. Producir el vídeo (de 10 a 20 minutos)
node herramientas/producir.js video guiones/explosion-de-san-juanico.json
```

Resultado en `salida/<tema>/`:

| Archivo | Para qué |
|---|---|
| `<tema>.mp4` | El vídeo (1080p, audio normalizado a -14 LUFS, el nivel que usa YouTube) |
| `<tema>.srt` | Subtítulos para subir a YouTube |
| `miniatura.png` | Miniatura de 1280×720 |
| `publicar.md` | Título, 2 títulos alternativos para la prueba A/B, descripción con capítulos, fuentes y créditos, etiquetas y ajustes de subida |

Otras opciones:
- **Varios guiones de golpe**: `node herramientas/producir.js lote temas.txt`.
- **Música propia**: añade `--musica pista.mp3` al paso de vídeo, por ejemplo con una pista de la Biblioteca de audio de YouTube.
- **Otra voz**: `VOZ_ID=<id de ElevenLabs> node herramientas/producir.js video ...`.

## Piezas

| Archivo | Función |
|---|---|
| `herramientas/investigar.js` | Reúne los artículos de Wikipedia en español e inglés sobre el tema |
| `herramientas/guion.js` | Claude escribe el guion con el formato del canal y solo con hechos de las fuentes |
| `herramientas/voz.js` | Locución por escenas, con marcas de tiempo para los subtítulos |
| `herramientas/imagenes.js` | Fotos libres de Wikimedia Commons (dominio público, CC0, CC BY y CC BY-SA), con crédito |
| `herramientas/escena-doc.js` | Gráficos: mapas animados, rótulos de fecha, cifras, citas y líneas de tiempo |
| `herramientas/montar.js` | Monta el vídeo, la música, los subtítulos, los capítulos y los textos para publicar |
| `herramientas/miniatura.js` | Genera la miniatura |
| `guiones/` | Guiones revisados. `tragedia-de-armero.json` es el piloto |
| `temas.txt` | Lista de 30 temas |

Todo se guarda en caché en `trabajo/` (ignorado por git): si cambias una escena, solo se vuelve a generar esa escena.
Si Wikimedia limita las peticiones (error 429), la escena usa un rótulo gráfico. Vuelve a lanzar el paso de vídeo más tarde para completar las fotos.

## Subir a YouTube

La subida se hace a mano desde YouTube Studio; son unos 3 minutos con `publicar.md`.
Los vídeos subidos por API desde un proyecto de Google sin auditar quedan bloqueados como privados, así que no compensa automatizarla al principio.
Programa los vídeos a la misma hora siempre; por ejemplo, martes y viernes a las 19:00, hora de Ciudad de México.
