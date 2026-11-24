// Paso 1: reúne las fuentes del tema (Wikipedia en español e inglés) en un único archivo de texto.
//   node herramientas/investigar.js "Tragedia de Armero"
const fs = require('fs');
const path = require('path');
const { getJSON, slug, dirTrabajo } = require('./comun');

async function articulo(idioma, consulta) {
  const api = `https://${idioma}.wikipedia.org/w/api.php`;
  const b = await getJSON(`${api}?action=query&format=json&list=search&srlimit=1&srsearch=${encodeURIComponent(consulta)}`);
  const hit = b.query.search[0];
  if (!hit) return null;
  const d = await getJSON(`${api}?action=query&format=json&prop=extracts|info|langlinks&inprop=url&lllang=${idioma === 'es' ? 'en' : 'es'}&explaintext=1&redirects=1&titles=${encodeURIComponent(hit.title)}`);
  const p = Object.values(d.query.pages)[0];
  return { idioma, titulo: p.title, url: p.fullurl, texto: p.extract, enlace: p.langlinks && p.langlinks[0] && p.langlinks[0]['*'] };
}

async function investigar(tema) {
  const id = slug(tema);
  const fuentes = [];
  const es = await articulo('es', tema);
  if (es) fuentes.push(es);
  // Artículo en inglés: el enlazado desde el español o, si no hay, el primer resultado
  try {
    const en = await articulo('en', es && es.enlace ? es.enlace : tema);
    if (en) fuentes.push(en);
  } catch (e) { console.warn(`  (aviso) sin artículo en inglés: ${e.message}`); }
  if (!fuentes.length) throw new Error(`No se encontraron fuentes para "${tema}"`);
  const recorte = (t) => (t.length > 60000 ? `${t.slice(0, 60000)}\n[...]` : t);
  const texto = fuentes.map((f) => `### FUENTE: ${f.titulo} (${f.url})\n\n${recorte(f.texto)}`).join('\n\n');
  const dir = dirTrabajo(id);
  fs.writeFileSync(path.join(dir, 'fuentes.md'), texto);
  fs.writeFileSync(path.join(dir, 'fuentes.json'), JSON.stringify(fuentes.map(({ texto: _, ...f }) => f), null, 2));
  console.log(`✔ Fuentes de "${tema}": ${fuentes.map((f) => `${f.titulo} [${f.idioma}, ${Math.round(f.texto.length / 1000)}k car.]`).join(' + ')}`);
  return { id, dir, fuentes };
}

module.exports = { investigar };
if (require.main === module) investigar(process.argv.slice(2).join(' ')).catch((e) => { console.error(e.message); process.exit(1); });
