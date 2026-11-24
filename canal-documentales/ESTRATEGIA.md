# Estrategia del canal: documentales de desastres y misterios reales (en español)

## 1. Qué replicamos y por qué

En las muestras de canales sin cara que despegaron en octubre y noviembre de 2026, los nichos más fuertes son:
- desastres, historia, *true crime* y ciencia explicada;
- en **formato documental**, que usan 16 de los 40 canales analizados.

Educación y ciencia es además la categoría con mejor pago por cada 1.000 visitas: mediana de unos 10 $ frente a 2,3 $ de media.

En inglés el formato está muy explotado. Lo replicamos en español, donde hay poca oferta de calidad, y con un enfoque propio:
**muchos temas del mundo hispano** (Armero, Valdivia, Los Rodeos, San Juanico…) que los canales en inglés apenas tocan.

## 2. El canal

- **Nombre**: propuestas *Expediente Cero*, *Caja Negra Docs* y *Lo Que Nadie Vio Venir*. Antes de elegir, comprueba que el @nombre esté libre en YouTube. Se cambia en `herramientas/comun.js` (`CONFIG.canal`).
- **Promesa**: «Qué pasó, por qué pasó y qué cambió después». Rigor y respeto, cero morbo.
- **Público**: hispanohablantes de 25 a 55 años de Latinoamérica y España. No es contenido para niños.

## 3. El formato de cada vídeo

Es la estructura que usan los canales que funcionan; está incorporada en el generador de guiones.

| Bloque | Duración | Qué ocurre |
|---|---|---|
| Gancho en frío | 30–40 s | El momento crítico en presente y la pregunta que sostiene el vídeo |
| Contexto | 1–2 min | Mapa animado, el lugar, la gente, el sistema que fallará |
| Señales y cadena de errores | 2–3 min | Cada decisión que acerca el desastre: aquí está la tensión |
| El desastre | 2–3 min | Casi minuto a minuto: rótulos con hora y línea de tiempo |
| Consecuencias | 1 min | Cifras exactas de las fuentes |
| Causa | 1–2 min | Qué falló, explicado de forma sencilla |
| Legado y cierre | 1 min | Qué cambió después; responde a la pregunta del gancho |

**Especificaciones de producción**:
- Duración de 8 a 14 minutos, en 1080p.
- Escenas de 10 a 25 s. Nunca más de dos escenas seguidas del mismo tipo.
- Subtítulos en un archivo .srt y capítulos en la descripción.
- Pantalla final de 12 s.

**Miniatura**: foto real oscurecida, 1 a 3 palabras en amarillo y una etiqueta roja con «LUGAR · AÑO».

**Títulos**: curiosidad + dato concreto, sin mentir. Por ejemplo: «Armero: la tragedia que todos vieron venir». Sube siempre 3 títulos a la prueba A/B de YouTube (*Probar y comparar*).

## 4. Cómo se mantiene monetizable (normas de julio de 2025 y julio de 2026)

YouTube desmonetiza el contenido genérico o repetitivo y el que busca visitas con morbo. Este sistema lo evita así:

- ✅ **Cada guion parte de fuentes reales** y se revisa a mano. Esa revisión es obligatoria en el flujo: el sistema se detiene tras el guion.
- ✅ **Cada vídeo es distinto**: mapas de cada lugar, cifras y líneas de tiempo propias, fotos de archivo concretas. No es «diapositivas con voz».
- ✅ **Nada de personaje IA** que se haga pasar por experto. La voz es la de un narrador.
- ✅ **Tono sobrio**: se explican causas, sin regodearse en las víctimas.
- ⚠️ **Nunca** subas recopilaciones de clips de otros ni leas artículos tal cual: eso es contenido reutilizado.

## 5. Ritmo de publicación

| Semana | Vídeos largos | Shorts (opcionales) |
|---|---|---|
| 1 | 2 (Armero + 1) | 3 |
| 2–4 | 2 por semana | 3 por semana |

Con este sistema, un vídeo te lleva unos **30–60 minutos de trabajo**:
- elegir el tema;
- revisar el guion;
- ver el resultado y subirlo.

El render tarda de 10 a 20 minutos en segundo plano.

## 6. Dinero: qué esperar y cuándo

- **Anuncios**: hacen falta 1.000 suscriptores y 4.000 horas de visualización. Varias fuentes indican que desde el 1 de febrero de 2027 serán **8.000 horas**; confírmalo en YouTube Studio → Ingresos. Con 2 vídeos semanales de unos 10 minutos, lo realista es de 3 a 6 meses *si* algún vídeo despega. No hay garantía.
- **Desde el primer mes**: solo enlaces de afiliado en la descripción, por ejemplo libros sobre cada desastre en Amazon. Son ingresos pequeños pero inmediatos.
- **Después**: patrocinios y un segundo canal en inglés con el mismo sistema (traducir el guion y cambiar la voz). El inglés paga unas 3 veces más por cada 1.000 visitas.

## 7. Costes mensuales

| Concepto | Coste | Nota |
|---|---|---|
| ElevenLabs Starter o superior | desde unos 5 $/mes | **Obligatorio para monetizar**: el plan gratuito no permite uso comercial, solo da 10.000 caracteres al mes (≈ 1,5 vídeos) y no deja usar por API voces nativas en español |
| API de Claude (guiones) | ≈ 0,30 $ por guion | Unos 25.000 tokens de entrada y 10.000 de salida con Claude Opus 5.5 |
| Imágenes | 0 € | Wikimedia Commons, con créditos automáticos en la descripción |
| Música | 0 € | Generada por código, o la Biblioteca de audio de YouTube |
