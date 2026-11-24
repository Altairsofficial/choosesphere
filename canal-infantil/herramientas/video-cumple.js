#!/usr/bin/env node
/*
 * Vídeo de cumpleaños personalizado de Tilo y Nuba (vertical 1080x1920, 26 s, MP4).
 *
 * Un pedido:
 *   node herramientas/video-cumple.js --nombre "Lucía" --edad 4
 *   node herramientas/video-cumple.js --nombre "Hugo" --edad 3 --mensaje "¡Te queremos mucho!" --voz saludo.m4a
 *
 * Varios pedidos a la vez (CSV con cabecera nombre,edad,mensaje):
 *   node herramientas/video-cumple.js --pedidos pedidos.csv
 *
 * Opciones:
 *   --salida RUTA    Archivo MP4 (por defecto: pedidos/cumple-<nombre>-<edad>.mp4)
 *   --voz ARCHIVO    Audio grabado (versión Premium). Suena desde el segundo 20,6
 *                    con la música bajada. Graba tu voz diciendo el nombre del peque.
 *   --fps N          Fotogramas por segundo (30 por defecto)
 *
 * Requisitos: Node 18+, Playwright con Chromium y ffmpeg.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const { FONT_CSS } = require('./render');
const { bandaSonoraCumple } = require('./musica');

const MENSAJE_DEF = '¡Que tengas un día lleno de aventuras!';

function args() {
  const a = process.argv.slice(2), o = {};
  for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) o[a[i].slice(2)] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true;
  return o;
}

function leerCSV(ruta) {
  const filas = fs.readFileSync(ruta, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  const celdas = (l) => { const out = []; let c = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if ((ch === ',' || ch === ';') && !q) { out.push(c.trim()); c = ''; } else c += ch; } out.push(c.trim()); return out; };
  const cab = celdas(filas[0]).map((h) => h.toLowerCase());
  return filas.slice(1).map((l) => { const v = celdas(l); return Object.fromEntries(cab.map((h, i) => [h, v[i] || ''])); });
}

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'peque';

function validar(p) {
  const nombre = String(p.nombre || '').trim();
  const edad = parseInt(p.edad, 10);
  if (!nombre) throw new Error('Falta --nombre');
  if (nombre.length > 24) throw new Error(`Nombre demasiado largo (máx. 24 caracteres): "${nombre}"`);
  if (!(edad >= 1 && edad <= 12)) throw new Error(`Edad no válida (1-12): "${p.edad}"`);
  const mensaje = String(p.mensaje || MENSAJE_DEF).trim().slice(0, 70);
  return { nombre, edad, mensaje };
}

function ejecutar(cmd, argv, entrada) {
  return new Promise((res, rej) => {
    const pr = spawn(cmd, argv, { stdio: [entrada ? 'pipe' : 'ignore', 'ignore', 'pipe'] });
    let err = ''; pr.stderr.on('data', (d) => { err += d; });
    pr.on('close', (c) => (c === 0 ? res() : rej(new Error(`${cmd} terminó con código ${c}\n${err.slice(-1500)}`))));
    if (entrada) entrada(pr.stdin);
  });
}

async function renderizar(browser, pedido, salida, { fps = 30, voz = null } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tyn-'));
  const wav = path.join(tmp, 'musica.wav');
  const tiempos = bandaSonoraCumple(wav, { duracion: 26 });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  const lib = fs.readFileSync(path.join(__dirname, 'personajes.js'), 'utf8');
  const escena = fs.readFileSync(path.join(__dirname, 'escena-cumple.js'), 'utf8');
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${FONT_CSS} html,body{margin:0;background:#fff}</style></head>
    <body><div id="lienzo"></div><div style="font-family:Fredoka;font-weight:700;position:absolute;opacity:0">a</div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.addScriptTag({ content: lib });
  await page.evaluate((d) => { window.DATOS = d; }, { ...pedido, tiempos });
  await page.addScriptTag({ content: escena });

  const video = path.join(tmp, 'video.mp4');
  const total = Math.round(tiempos.duracion * fps);
  await ejecutar('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', video], async (stdin) => {
    for (let i = 0; i < total; i++) {
      await page.evaluate((t) => window.render(t), i / fps);
      const img = await page.screenshot({ type: 'jpeg', quality: 92 });
      if (!stdin.write(img)) await new Promise((r) => stdin.once('drain', r));
      if (i % fps === 0) process.stdout.write(`\r  ${pedido.nombre}: ${Math.round((i / total) * 100)}%`);
    }
    stdin.end();
  });
  await page.close();

  // Mezcla de audio: música + (opcional) voz grabada desde el segundo 20,6
  const audio = voz
    ? ['-i', wav, '-i', voz, '-filter_complex',
      `[2:a]adelay=20600|20600,volume=1.6[v];[1:a]volume=0.55[m];[m][v]amix=inputs=2:duration=first:normalize=0[a]`, '-map', '0:v', '-map', '[a]']
    : ['-i', wav, '-map', '0:v', '-map', '1:a'];
  await ejecutar('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, ...audio, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', salida]);
  fs.rmSync(tmp, { recursive: true, force: true });
  process.stdout.write(`\r  ✔ ${salida}\n`);
}

(async () => {
  const o = args();
  const pedidos = o.pedidos ? leerCSV(o.pedidos) : [o];
  const dirDef = path.join(process.cwd(), 'pedidos');
  const browser = await chromium.launch();
  let fallos = 0;
  try {
    for (const p of pedidos) {
      try {
        const v = validar(p);
        const salida = (!o.pedidos && o.salida) || path.join(dirDef, `cumple-${slug(v.nombre)}-${v.edad}.mp4`);
        fs.mkdirSync(path.dirname(path.resolve(salida)), { recursive: true });
        await renderizar(browser, v, salida, { fps: Number(o.fps) || 30, voz: o.voz && !o.pedidos ? o.voz : (p.voz || null) });
      } catch (e) { fallos++; console.error(`\n  ✘ ${p.nombre || '(sin nombre)'}: ${e.message}`); }
    }
  } finally { await browser.close(); }
  process.exit(fallos ? 1 : 0);
})();
