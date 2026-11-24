// Paso 5: monta el documental (vídeo 1080p, subtítulos SRT, miniatura y textos para publicar).
//   node herramientas/montar.js guiones/tragedia-de-armero.json [--musica pista.mp3]
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright');
const { CONFIG, RAIZ, dirTrabajo, ejecutar, duracion } = require('./comun');
const { vozGuion, subtitulos } = require('./voz');
const { imagenesGuion } = require('./imagenes');
const { musicaAmbiente } = require('./musica');
const { miniatura } = require('./miniatura');

const { ancho: W, alto: H, fps: FPS } = CONFIG;
const NM = (p) => path.join(RAIZ, 'node_modules', p);
const ANIMACION_COMPLETA = new Set(['mapa', 'linea_tiempo']);
const INTRO = 2.4; // segundos animados en rótulos, cifras y citas; después, plano fijo con zoom lento

async function abrirMotor(browser) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.setContent('<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#000}</style></head><body><div id="lienzo"></div></body></html>');
  await page.addScriptTag({ path: NM('d3-array/dist/d3-array.min.js') });
  await page.addScriptTag({ path: NM('d3-geo/dist/d3-geo.min.js') });
  await page.addScriptTag({ path: NM('topojson-client/dist/topojson-client.min.js') });
  await page.addScriptTag({ content: `window.MUNDO = ${fs.readFileSync(NM('world-atlas/countries-50m.json'), 'utf8')};` });
  await page.addScriptTag({ path: path.join(__dirname, 'escena-doc.js') });
  return page;
}

const fundido = (dur) => `fade=t=in:st=0:d=0.35,fade=t=out:st=${Math.max(0, dur - 0.35).toFixed(2)}:d=0.35`;
const x264 = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(FPS)];

// Renderiza fotogramas en Chromium y los envía a ffmpeg
async function clipAnimado(page, e, dur, salida, segundosAnimados) {
  const total = Math.round(dur * FPS), animados = Math.min(total, Math.round(segundosAnimados * FPS));
  const resto = (total - animados) / FPS;
  const filtro = resto > 0
    ? `tpad=stop_mode=clone:stop_duration=${resto.toFixed(3)},scale=2880:-1,zoompan=z='1+0.05*on/${total}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${W}x${H}:fps=${FPS},${fundido(dur)}`
    : fundido(dur);
  await ejecutar('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-vf', filtro, ...x264, '-t', dur.toFixed(3), salida], {
    entrada: async (stdin) => {
      for (let f = 0; f < animados; f++) {
        await page.evaluate(([e2, t, d]) => window.render(e2, t, d), [e, f / FPS, dur]);
        const img = await page.screenshot({ type: 'jpeg', quality: 90 });
        if (!stdin.write(img)) await new Promise((r) => stdin.once('drain', r));
      }
      stdin.end();
    },
  });
}

async function clipImagen(page, img, e, dur, salida, i) {
  const pie = salida.replace(/\.mp4$/, '-pie.png');
  await page.evaluate(([t, c]) => window.htmlCrudo(window.pie(t, c)), [e.pie || '', `${img.autor} · ${img.licencia} · Wikimedia Commons`]);
  await page.screenshot({ path: pie, omitBackground: true });
  const N = Math.round(dur * FPS);
  // Alterna acercamiento y alejamiento para que las fotos no se muevan siempre igual
  const z = i % 2 ? `1.12-0.10*on/${N}` : `1.02+0.10*on/${N}`;
  const filtro = `[0]scale=3840:2160:force_original_aspect_ratio=increase,crop=3840:2160,zoompan=z='${z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${W}x${H}:fps=${FPS},eq=saturation=0.85:contrast=1.05[v];`
    + `[1]format=rgba,fade=t=in:st=0.6:d=0.6:alpha=1[p];[v][p]overlay=0:0,${fundido(dur)}`;
  await ejecutar('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-loop', '1', '-i', img.ruta, '-loop', '1', '-i', pie,
    '-filter_complex', filtro, ...x264, '-t', dur.toFixed(3), salida]);
}

const tc = (s) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${x.toFixed(3).padStart(6, '0').replace('.', ',')}`; };
const marca = (s) => { const m = Math.floor(s / 60), x = Math.floor(s % 60); return `${m}:${String(x).padStart(2, '0')}`; };

async function montar(archivoGuion, { musica } = {}) {
  const guion = JSON.parse(fs.readFileSync(archivoGuion, 'utf8'));
  const id = path.basename(archivoGuion, '.json');
  const dir = dirTrabajo(id), dirClips = path.join(dir, 'clips');
  fs.mkdirSync(dirClips, { recursive: true });
  const salidaDir = path.join(RAIZ, 'salida', id);
  fs.mkdirSync(salidaDir, { recursive: true });

  console.log('▶ Voz'); const voces = await vozGuion(guion, id);
  console.log('▶ Imágenes'); const imgs = await imagenesGuion(guion, id);

  // Escenas + tarjeta final (sin voz) para las pantallas finales de YouTube
  const escenas = guion.escenas.map((e, i) => ({ e, i, dur: voces[i].dur + CONFIG.pausaEntreEscenas + (i === 0 ? 0.6 : 0), retardo: i === 0 ? 0.6 : 0 }));
  escenas.push({ e: { tipo: 'titulo', texto: CONFIG.canal, subtexto: 'Fuentes y créditos en la descripción' }, i: escenas.length, dur: 12, final: true });

  console.log('▶ Escenas');
  const browser = await chromium.launch();
  const page = await abrirMotor(browser);
  const clips = [];
  try {
    for (const s of escenas) {
      const img = imgs[s.i];
      const clave = crypto.createHash('sha1').update(JSON.stringify([s.e, s.dur.toFixed(3), img && img.archivo, fs.readFileSync(path.join(__dirname, 'escena-doc.js'))])).digest('hex').slice(0, 8);
      const salida = path.join(dirClips, `${String(s.i).padStart(2, '0')}-${clave}.mp4`);
      if (!fs.existsSync(salida)) {
        if (s.e.tipo === 'imagen' && img) await clipImagen(page, img, s.e, s.dur, salida, s.i);
        else await clipAnimado(page, s.e, s.dur, salida, ANIMACION_COMPLETA.has(s.e.tipo) ? s.dur : INTRO);
      }
      clips.push(salida);
      process.stdout.write(`\r  escena ${s.i + 1}/${escenas.length} (${s.e.tipo})        `);
    }
  } finally { await browser.close(); }
  process.stdout.write('\n');

  console.log('▶ Audio, subtítulos y montaje final');
  const lista = path.join(dir, 'clips.txt');
  fs.writeFileSync(lista, clips.map((c) => `file '${c}'`).join('\n'));
  const videoMudo = path.join(dir, 'video-mudo.mp4');
  await ejecutar('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', videoMudo]);
  const total = await duracion(videoMudo);

  // Locución: cada pista colocada en el inicio de su escena
  let t = 0; const inicios = [], srt = [];
  escenas.forEach((s) => { inicios.push(t); t += s.dur; });
  guion.escenas.forEach((_, i) => srt.push(...subtitulos(voces[i].alineacion, inicios[i] + escenas[i].retardo)));
  const narr = path.join(dir, 'narracion.wav');
  const entradas = voces.flatMap((v) => ['-i', v.mp3]);
  const delays = voces.map((v, i) => `[${i}]adelay=${Math.round((inicios[i] + escenas[i].retardo) * 1000)}:all=1[a${i}]`).join(';');
  await ejecutar('ffmpeg', ['-y', '-loglevel', 'error', ...entradas, '-filter_complex',
    `${delays};${voces.map((_, i) => `[a${i}]`).join('')}amix=inputs=${voces.length}:normalize=0:duration=longest,apad=whole_dur=${total.toFixed(2)}[o]`, '-map', '[o]', '-ar', '44100', narr]);

  const pistaMusica = musica || path.join(dir, 'musica.wav');
  if (!musica) musicaAmbiente(pistaMusica, total);
  const final = path.join(salidaDir, `${id}.mp4`);
  await ejecutar('ffmpeg', ['-y', '-loglevel', 'error', '-i', videoMudo, '-i', narr, '-stream_loop', '-1', '-i', pistaMusica, '-filter_complex',
    `[2]volume=0.16,afade=t=in:d=2,afade=t=out:st=${(total - 4).toFixed(2)}:d=4[m];[1][m]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11[a]`,
    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', total.toFixed(3), '-movflags', '+faststart', final]);

  fs.writeFileSync(path.join(salidaDir, `${id}.srt`), srt.map((c, k) => `${k + 1}\n${tc(c.a)} --> ${tc(c.b)}\n${c.t}\n`).join('\n'));

  // Textos para YouTube: descripción con capítulos, fuentes y créditos de imágenes
  const capitulos = escenas.filter((s) => s.e.capitulo).map((s) => `${marca(inicios[s.i])} ${s.e.capitulo}`);
  if (capitulos.length && !capitulos[0].startsWith('0:00')) capitulos.unshift('0:00 Introducción');
  const creditos = Object.values(imgs).map((im) => `• ${im.archivo.replace(/^File:/, '')}: ${im.autor} (${im.licencia}) ${im.pagina}`);
  const desc = [
    guion.descripcion || `${guion.titulo}. Reconstruimos paso a paso qué ocurrió, por qué ocurrió y qué cambió después.`,
    '', 'CAPÍTULOS', ...capitulos,
    '', 'FUENTES', ...guion.fuentes.map((f) => `• ${f.titulo}: ${f.url}`),
    '', 'CRÉDITOS DE IMÁGENES (Wikimedia Commons)', ...creditos,
    '', 'Narración con voz sintética (ElevenLabs). Guion investigado y revisado por el canal.',
    '', '#documental #historia #desastres',
  ].join('\n');
  const publicar = [`# ${guion.titulo}`, '', '## Títulos alternativos (para la prueba A/B de YouTube)', ...guion.titulos_alternativos.map((x) => `- ${x}`),
    '', '## Descripción', '```', desc, '```', '', '## Etiquetas', guion.etiquetas.join(', '),
    '', '## Ajustes al subir', '- Público: NO es contenido para niños', '- Contenido alterado o sintético: no (voz IA narrando hechos reales; no simula personas reales)',
    '- Subtítulos: subir el archivo .srt', '- Pantalla final: últimos 12 s (vídeo recomendado + suscribirse)',
    ...(guion.verificar && guion.verificar.length ? ['', '## Revisar antes de publicar', ...guion.verificar.map((x) => `- ${x}`)] : [])].join('\n');
  fs.writeFileSync(path.join(salidaDir, 'publicar.md'), publicar);

  const fondo = Object.values(imgs)[guion.miniatura && guion.miniatura.imagen != null ? guion.miniatura.imagen : 0];
  await miniatura(guion.miniatura, fondo && fondo.ruta, path.join(salidaDir, 'miniatura.png'));
  console.log(`✔ ${final} (${marca(total)})`);
  return final;
}

module.exports = { montar };
if (require.main === module) {
  const a = process.argv.slice(2), m = a.indexOf('--musica');
  montar(a[0], { musica: m >= 0 ? a[m + 1] : null }).catch((e) => { console.error(e); process.exit(1); });
}
