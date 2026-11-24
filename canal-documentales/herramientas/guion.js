// Paso 2: escribe el guion del documental con Claude a partir de las fuentes investigadas.
// Requiere ANTHROPIC_API_KEY (variable de entorno).
//   node herramientas/guion.js "Tragedia de Armero"
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk').default;
const { z } = require('zod');
const { CONFIG, RAIZ, slug, dirTrabajo } = require('./comun');
const { investigar } = require('./investigar');

const Lugar = z.object({ nombre: z.string(), lat: z.number(), lon: z.number() });
const Escena = z.object({
  tipo: z.enum(['titulo', 'dato', 'cita', 'imagen', 'mapa', 'linea_tiempo']),
  narracion: z.string().min(40),
  capitulo: z.string().optional(),
  texto: z.string().optional(), subtexto: z.string().optional(),
  cifra: z.string().optional(), autor: z.string().optional(),
  busqueda: z.string().optional(), alternativas: z.array(z.string()).optional(), pie: z.string().optional(),
  lugar: Lugar.optional(), secundario: Lugar.optional(), referencias: z.array(Lugar).optional(), trayecto: z.boolean().optional(),
  titulo: z.string().optional(), eventos: z.array(z.object({ hora: z.string(), texto: z.string() })).optional(),
});
const Guion = z.object({
  tema: z.string(), titulo: z.string().max(100), titulos_alternativos: z.array(z.string()).min(2),
  miniatura: z.object({ texto: z.string(), subtexto: z.string() }),
  descripcion: z.string().optional(), etiquetas: z.array(z.string()),
  fuentes: z.array(z.object({ titulo: z.string(), url: z.string() })),
  verificar: z.array(z.string()), escenas: z.array(Escena).min(12),
});

const SISTEMA = `Eres el guionista de un canal de YouTube en español de documentales sobre desastres y misterios reales.
Formato que replicamos (documental narrado, 8-14 minutos):
1. Gancho en frío (30-40 s): el momento crítico contado en presente, sin revelar todo. Termina con la pregunta que sostiene el vídeo.
2. Contexto: lugar (escena "mapa"), personas, el sistema que luego fallará.
3. Señales de aviso y cadena de errores: cada pequeña decisión que acerca el desastre (aquí está la tensión).
4. El desastre, casi minuto a minuto (escenas "titulo" con hora, "linea_tiempo").
5. Consecuencias: cifras exactas de las fuentes (escenas "dato").
6. Investigación y causa: qué falló y por qué, explicado de forma sencilla.
7. Legado: qué cambió después. Cierre que responde a la pregunta del gancho.

Reglas no negociables:
- Usa SOLO hechos presentes en las fuentes. Si un dato no está, no lo inventes. Anota en "verificar" cualquier cifra u hora en la que las fuentes discrepen.
- Tono sobrio y respetuoso con las víctimas: nada de morbo, detalles escabrosos ni sensacionalismo. Explica causas, no regodeos.
- La narración es para voz sintética: frases cortas y claras, sin paréntesis, sin abreviaturas ni siglas sin explicar. Las cifras grandes, escritas en palabras dentro de "narracion".
- Varía el tipo de escena; nunca más de dos escenas seguidas del mismo tipo. Entre 18 y 30 escenas; cada narración entre 25 y 90 palabras.
- Escenas "imagen": "busqueda" con 2-4 palabras pensadas para encontrar fotos en Wikimedia Commons (nombres propios de lugares u objetos; en inglés si es más probable) y 1-2 "alternativas".
- Escenas "mapa": coordenadas reales (lat, lon) del lugar principal; "secundario" si hay un segundo punto clave; 1-2 "referencias" (ciudades cercanas) para orientar; "trayecto": true si algo se desplaza de uno a otro.
- "linea_tiempo": 3-5 eventos con "hora" corta (año, fecha u hora).
- "capitulo" en la primera escena de cada bloque (5-7 capítulos), para los capítulos de YouTube.
- Título: curiosidad + concreción, máx. 70 caracteres, sin clickbait falso. Miniatura: 1-3 palabras de impacto + subtexto "LUGAR · AÑO".
- "fuentes": las URLs de las fuentes proporcionadas.
Responde SOLO con el objeto JSON del guion, sin texto adicional ni bloques de código.`;

async function escribirGuion(tema) {
  const { id, dir } = await investigar(tema);
  const fuentesTxt = fs.readFileSync(path.join(dir, 'fuentes.md'), 'utf8');
  const client = new Anthropic();
  const stream = client.beta.messages.stream({
    model: CONFIG.modeloGuion,
    max_tokens: 64000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high' },
    system: SISTEMA,
    messages: [{ role: 'user', content: `<fuentes>\n${fuentesTxt}\n</fuentes>\n\nEscribe el guion del documental sobre: ${tema}` }],
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') throw new Error('El modelo rechazó la petición; prueba con otro enfoque del tema.');
  if (msg.stop_reason === 'max_tokens') throw new Error('Respuesta cortada por longitud; vuelve a intentarlo.');
  const texto = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim().replace(/^```(json)?|```$/g, '');
  let guion;
  try { guion = Guion.parse(JSON.parse(texto)); } catch (e) {
    fs.writeFileSync(path.join(dir, 'guion-invalido.txt'), texto);
    throw new Error(`El guion no tiene el formato esperado (${e.message.slice(0, 300)}). Respuesta guardada en ${dir}/guion-invalido.txt`);
  }
  const destino = path.join(RAIZ, 'guiones', `${id}.json`);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, JSON.stringify(guion, null, 2));
  const car = guion.escenas.reduce((s, e) => s + e.narracion.length, 0);
  console.log(`✔ Guion: ${destino}\n  ${guion.escenas.length} escenas · ${car} caracteres de locución (~${Math.round(car / 900)} min)`);
  if (guion.verificar.length) console.log(`  Revisa antes de producir:\n${guion.verificar.map((v) => `   - ${v}`).join('\n')}`);
  return destino;
}

module.exports = { escribirGuion, Guion, slug };
if (require.main === module) escribirGuion(process.argv.slice(2).join(' ')).catch((e) => { console.error(e.message); process.exit(1); });
