#!/usr/bin/env node
// Orquestador del canal. El flujo tiene una parada deliberada: revisas el guion antes de producir el vídeo.
//
//   node herramientas/producir.js guion "Explosión de San Juanico"   -> investiga y escribe guiones/<id>.json
//   node herramientas/producir.js video guiones/<id>.json            -> voz, imágenes, montaje, miniatura y textos
//   node herramientas/producir.js lote temas.txt                     -> un guion por línea del archivo (para revisar después)
const fs = require('fs');
const { escribirGuion } = require('./guion');
const { montar } = require('./montar');

const [orden, ...resto] = process.argv.slice(2);
const arg = resto.join(' ');

(async () => {
  if (orden === 'guion' && arg) {
    const g = await escribirGuion(arg);
    console.log(`\nSiguiente paso: revisa y corrige ${g}; luego ejecuta:\n  node herramientas/producir.js video ${g}`);
  } else if (orden === 'video' && arg) {
    const m = resto.indexOf('--musica');
    await montar(resto[0], { musica: m >= 0 ? resto[m + 1] : null });
  } else if (orden === 'lote' && arg) {
    const temas = fs.readFileSync(arg, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    for (const t of temas) {
      try { await escribirGuion(t); } catch (e) { console.error(`✘ ${t}: ${e.message}`); }
    }
  } else {
    console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 7).join('\n').replace(/^\/\/ ?/gm, ''));
    process.exit(1);
  }
})().catch((e) => { console.error(e.message || e); process.exit(1); });
