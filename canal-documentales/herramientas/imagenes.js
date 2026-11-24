// Paso 4: imágenes libres de Wikimedia Commons para las escenas de tipo "imagen".
// Solo acepta dominio público, CC0, CC BY y CC BY-SA, y guarda el crédito de cada una.
//   node herramientas/imagenes.js guiones/tragedia-de-armero.json
const fs = require('fs');
const path = require('path');
const { getJSON, descargar, dirTrabajo, limpiarHTML } = require('./comun');

const API = 'https://commons.wikimedia.org/w/api.php';
const LICENCIA_OK = /^(public domain|pd|cc0|cc by(-sa)? \d)/i;

async function candidatas(busqueda) {
  const q = `${API}?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=25&gsrsearch=${encodeURIComponent(`${busqueda} filetype:bitmap`)}`
    + '&prop=imageinfo&iiprop=url|size|extmetadata|mime&iiurlwidth=1920';
  const d = await getJSON(q);
  if (!d.query) return [];
  return Object.values(d.query.pages).sort((a, b) => a.index - b.index).map((p) => {
    const ii = p.imageinfo[0], m = ii.extmetadata || {};
    return {
      archivo: p.title, ancho: ii.width, alto: ii.height, mime: ii.mime, url: ii.thumburl || ii.url, pagina: ii.descriptionurl,
      licencia: limpiarHTML(m.LicenseShortName && m.LicenseShortName.value),
      autor: limpiarHTML(m.Artist && m.Artist.value).slice(0, 120) || 'Autor desconocido',
    };
  }).filter((c) => /jpeg|png/.test(c.mime) && c.ancho >= 1000 && c.ancho / c.alto >= 1.1 && LICENCIA_OK.test(c.licencia));
}

async function imagenesGuion(guion, id) {
  const dir = path.join(dirTrabajo(id), 'imagenes');
  fs.mkdirSync(dir, { recursive: true });
  const usadas = new Set(), res = {};
  for (const [i, e] of guion.escenas.entries()) {
    if (e.tipo !== 'imagen') continue;
    const destino = path.join(dir, `${String(i).padStart(2, '0')}.jpg`), meta = `${destino}.json`;
    if (fs.existsSync(destino) && fs.existsSync(meta)) { res[i] = { ...JSON.parse(fs.readFileSync(meta, 'utf8')), ruta: destino }; usadas.add(res[i].archivo); continue; }
    let elegida = null;
    if (process.env.SIN_IMAGENES) continue; // usar solo las imágenes ya descargadas
    try {
      for (const q of [e.busqueda, ...(e.alternativas || []), e.busqueda.split(' ').slice(0, 2).join(' ')]) {
        const c = (await candidatas(q)).filter((x) => !usadas.has(x.archivo));
        if (c.length) { elegida = c[0]; break; }
      }
      if (elegida) await descargar(elegida.url, destino);
    } catch (err) {
      console.warn(`  (aviso) escena ${i}: ${err.message}`);
      elegida = null;
    }
    if (!elegida) { console.warn(`  (aviso) sin imagen para "${e.busqueda}": la escena usará un rótulo gráfico (vuelve a ejecutar más tarde para reintentarlo)`); continue; }
    usadas.add(elegida.archivo);
    fs.writeFileSync(meta, JSON.stringify(elegida, null, 2));
    res[i] = { ...elegida, ruta: destino };
    console.log(`  ✔ escena ${i}: ${elegida.archivo} (${elegida.licencia})`);
  }
  return res;
}

module.exports = { imagenesGuion };
if (require.main === module) {
  const archivo = process.argv[2];
  imagenesGuion(JSON.parse(fs.readFileSync(archivo, 'utf8')), path.basename(archivo, '.json')).catch((e) => { console.error(e.message); process.exit(1); });
}
