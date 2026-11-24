// Paso 3: locución con ElevenLabs (una petición por escena, con marcas de tiempo para subtítulos).
// La clave la inyecta el proxy del entorno; si ejecutas esto en tu ordenador, exporta ELEVENLABS_API_KEY.
//   node herramientas/voz.js guiones/tragedia-de-armero.json
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { CONFIG, dirTrabajo, duracion } = require('./comun');

async function locutar(texto, destinoBase) {
  const clave = crypto.createHash('sha1').update(`${CONFIG.vozId}|${CONFIG.modeloVoz}|${texto}`).digest('hex').slice(0, 10);
  const mp3 = `${destinoBase}-${clave}.mp3`, json = `${destinoBase}-${clave}.json`;
  if (fs.existsSync(mp3) && fs.existsSync(json)) return { mp3, alineacion: JSON.parse(fs.readFileSync(json, 'utf8')) };
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${CONFIG.vozId}/with-timestamps?output_format=mp3_44100_128`;
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY || 'proxy-injected', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: texto, model_id: CONFIG.modeloVoz, language_code: 'es',
        voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.15, speed: 0.95 },
      }),
    });
    if (r.ok) {
      const d = await r.json();
      fs.writeFileSync(mp3, Buffer.from(d.audio_base64, 'base64'));
      fs.writeFileSync(json, JSON.stringify(d.alignment));
      return { mp3, alineacion: d.alignment };
    }
    const cuerpo = await r.text();
    if (r.status === 429 || r.status >= 500) { await new Promise((res) => setTimeout(res, 3000 * (i + 1))); continue; }
    throw new Error(`ElevenLabs ${r.status}: ${cuerpo.slice(0, 300)}`);
  }
  throw new Error('ElevenLabs no respondió tras varios intentos');
}

// Agrupa los caracteres alineados en subtítulos de ≤ 42 caracteres y ≤ 3,2 s.
function subtitulos(al, desfase) {
  const ch = al.characters, ini = al.character_start_times_seconds, fin = al.character_end_times_seconds;
  const palabras = []; let w = null;
  ch.forEach((c, i) => {
    if (/\s/.test(c)) { if (w) { palabras.push(w); w = null; } return; }
    if (!w) w = { t: '', a: ini[i], b: fin[i] };
    w.t += c; w.b = fin[i];
  });
  if (w) palabras.push(w);
  const cues = []; let cur = null;
  for (const p of palabras) {
    if (cur && ((cur.t + ' ' + p.t).length > 42 || p.b - cur.a > 3.2 || /[.?!]$/.test(cur.t))) { cues.push(cur); cur = null; }
    cur = cur ? { ...cur, t: `${cur.t} ${p.t}`, b: p.b } : { ...p };
  }
  if (cur) cues.push(cur);
  return cues.map((c) => ({ a: c.a + desfase, b: c.b + desfase, t: c.t }));
}

async function vozGuion(guion, id) {
  const dir = path.join(dirTrabajo(id), 'voz');
  fs.mkdirSync(dir, { recursive: true });
  const res = [];
  for (const [i, e] of guion.escenas.entries()) {
    const { mp3, alineacion } = await locutar(e.narracion, path.join(dir, String(i).padStart(2, '0')));
    res.push({ mp3, alineacion, dur: await duracion(mp3) });
    process.stdout.write(`\r  voz: ${i + 1}/${guion.escenas.length}`);
  }
  process.stdout.write('\n');
  return res;
}

module.exports = { vozGuion, subtitulos };
if (require.main === module) {
  const archivo = process.argv[2];
  const g = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  vozGuion(g, path.basename(archivo, '.json')).then((r) => console.log(`✔ ${r.length} locuciones, ${r.reduce((s, x) => s + x.dur, 0).toFixed(1)} s`)).catch((e) => { console.error(e.message); process.exit(1); });
}
