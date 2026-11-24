// Utilidades compartidas del canal de documentales.
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

// El fetch nativo de Node solo usa el proxy HTTPS del sistema con NODE_USE_ENV_PROXY=1:
// si hace falta, el script se relanza a sí mismo con esa variable.
if ((process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY && require.main && process.argv[1]) {
  const r = spawnSync(process.execPath, process.argv.slice(1), { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' } });
  process.exit(r.status == null ? 1 : r.status);
}

const RAIZ = path.join(__dirname, '..');
const UA = 'DocuCanalBot/0.1 (investigacion de documentales; contacto via repo)';

const CONFIG = {
  // Voz. En el plan gratuito de ElevenLabs solo funcionan las voces prediseñadas por API.
  // Con un plan de pago, cambia a una voz nativa en español de la biblioteca, por ejemplo
  // "Alberto Rodríguez - Serious, Narrative" (l1zE9xgNpUTaQCZzpNJa, español latino).
  vozId: process.env.VOZ_ID || 'JBFqnCBsd6RMkjVDRZzb', // George, narrador (multilingüe)
  modeloVoz: process.env.MODELO_VOZ || 'eleven_multilingual_v2',
  modeloGuion: 'claude-opus-5-5',
  canal: process.env.CANAL || 'Expediente Cero',
  ancho: 1920,
  alto: 1080,
  fps: 30,
  pausaEntreEscenas: 0.45, // segundos de silencio tras cada escena
};

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

function dirTrabajo(id) {
  const d = path.join(RAIZ, 'trabajo', id);
  fs.mkdirSync(d, { recursive: true });
  return d;
}

// Respeta los límites de Wikimedia: un solo User-Agent fijo, peticiones en serie
// y, ante un 429, espera lo que indique Retry-After (o un retroceso creciente).
let ultimaPeticion = 0;
async function pedir(url, intentos = 6) {
  for (let i = 0; i < intentos; i++) {
    const espera = ultimaPeticion + 400 - Date.now();
    if (espera > 0) await new Promise((r) => setTimeout(r, espera));
    ultimaPeticion = Date.now();
    let r;
    try { r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) }); }
    catch (e) { if (process.env.DEPURAR) console.warn('  red:', e.message); await new Promise((res) => setTimeout(res, 2000)); continue; }
    if (process.env.DEPURAR) console.warn('  ', r.status, url.slice(0, 90));
    if (r.ok) return r;
    if (r.status === 429 || r.status >= 500) {
      const ra = parseInt(r.headers.get('retry-after') || '0', 10);
      await new Promise((res) => setTimeout(res, Math.max(ra * 1000, 3000 * 2 ** i)));
      continue;
    }
    throw new Error(`HTTP ${r.status} en ${url}`);
  }
  throw new Error(`Límite de peticiones alcanzado (429) en ${url}. Prueba de nuevo en unos minutos.`);
}
const getJSON = async (url) => (await pedir(url)).json();
async function descargar(url, destino) {
  const r = await pedir(url);
  fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
  return destino;
}

function ejecutar(cmd, args, { entrada } = {}) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: [entrada ? 'pipe' : 'ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (c) => (c === 0 ? res(out) : rej(new Error(`${cmd} salió con ${c}\n${err.slice(-2000)}`))));
    if (entrada) entrada(p.stdin);
  });
}

async function duracion(archivo) {
  const out = await ejecutar('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', archivo]);
  return parseFloat(out.trim());
}

const limpiarHTML = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

module.exports = { RAIZ, UA, CONFIG, slug, dirTrabajo, getJSON, descargar, ejecutar, duracion, limpiarHTML };
