// Miniatura 1280x720: foto de fondo oscurecida, 2-3 palabras enormes y una etiqueta con lugar y año.
const fs = require('fs');
const { chromium } = require('playwright');

const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function miniatura(datos = {}, fondo, salida) {
  const img = fondo && fs.existsSync(fondo) ? `data:image/jpeg;base64,${fs.readFileSync(fondo).toString('base64')}` : null;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;width:1280px;height:720px;overflow:hidden;background:#0D1015;font-family:'Inter Display',Inter,sans-serif}
    .f{position:absolute;inset:0;background:${img ? `url(${img}) center/cover` : 'radial-gradient(circle at 70% 40%,#3a2a14,#0D1015 70%)'};filter:saturate(.8) contrast(1.15)}
    .o{position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.92) 0%,rgba(0,0,0,.6) 45%,rgba(0,0,0,.05) 80%)}
    .t{position:absolute;left:60px;top:150px;width:780px;font-weight:900;font-size:${(datos.texto || '').length > 12 ? 118 : 150}px;line-height:.95;color:#FFD23F;
       text-transform:uppercase;letter-spacing:-3px;-webkit-text-stroke:4px #000;paint-order:stroke fill;text-shadow:0 8px 30px rgba(0,0,0,.8)}
    .s{position:absolute;left:62px;bottom:90px;background:#E5484D;color:#fff;font-weight:800;font-size:46px;padding:10px 22px;letter-spacing:2px}
  </style></head><body><div class="f"></div><div class="o"></div>
  <div class="t">${esc(datos.texto)}</div>${datos.subtexto ? `<div class="s">${esc(datos.subtexto)}</div>` : ''}</body></html>`;
  const b = await chromium.launch();
  try {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
    await p.setContent(html);
    await p.screenshot({ path: salida });
  } finally { await b.close(); }
  return salida;
}

module.exports = { miniatura };
