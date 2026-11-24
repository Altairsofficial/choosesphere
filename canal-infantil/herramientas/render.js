// Utilidades comunes: abre Chromium (Playwright) y convierte HTML/SVG en PNG o PDF.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const TyN = require('./personajes');

const FUENTES = path.join(__dirname, 'fuentes');
const b64 = (p) => fs.readFileSync(path.join(FUENTES, p)).toString('base64');
const FONT_CSS = TyN.cssFuentes({
  400: b64('fredoka-latin-400-normal.woff2'),
  600: b64('fredoka-latin-600-normal.woff2'),
  700: b64('fredoka-latin-700-normal.woff2'),
});

function paginaHTML(cuerpo, css = '') {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
${FONT_CSS}
html,body{margin:0;padding:0;background:transparent}
*{box-sizing:border-box}
${css}
</style></head><body>${cuerpo}</body></html>`;
}

function svg(ancho, alto, contenido, extra = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}" ${extra}>${TyN.defs()}${contenido}</svg>`;
}

async function conNavegador(fn) {
  const browser = await chromium.launch();
  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
}

async function aPNG(browser, html, ancho, alto, salida, { transparente = false } = {}) {
  const page = await browser.newPage({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: salida, omitBackground: transparente, clip: { x: 0, y: 0, width: ancho, height: alto } });
  await page.close();
  console.log('✔', path.relative(process.cwd(), salida));
}

async function aPDF(browser, html, salida) {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: salida, format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await page.close();
  console.log('✔', path.relative(process.cwd(), salida));
}

module.exports = { TyN, FONT_CSS, paginaHTML, svg, conNavegador, aPNG, aPDF };
