// Genera el libro digital para colorear (PDF A4) en canal-infantil/productos/
//   node herramientas/generar-colorear.js
// También exporta 2 láminas de muestra en PNG (gancho gratuito para Pinterest / la web).
const fs = require('fs');
const path = require('path');
const { TyN, paginaHTML, svg, conNavegador, aPDF, aPNG } = require('./render');

const OUT = path.join(__dirname, '..', 'productos');
fs.mkdirSync(OUT, { recursive: true });
const W = 794, H = 1123; // A4 a 96 ppp
const L = { modo: 'linea' };
const P = TyN.PALETA;
const CANAL = 'youtube.com/@TiloyNuba';

const titulo = (t, y = 110, size = 64) => `
  <text x="${W / 2}" y="${y}" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="${size}" fill="#fff" stroke="#111" stroke-width="4" stroke-linejoin="round" paint-order="stroke">${t}</text>`;
const subt = (t, y = 160) => `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="26" fill="#333">${t}</text>`;
const pie = (n) => `<text x="${W / 2}" y="${H - 34}" text-anchor="middle" font-family="Fredoka" font-weight="400" font-size="15" fill="#888">Tilo y Nuba · ¡Tú eliges! · ${CANAL} · Lámina ${n}</text>`;
const marco = `<rect x="28" y="28" width="${W - 56}" height="${H - 56}" rx="28" fill="none" stroke="#111" stroke-width="4"/>`;
const caja = (x, y, w, h, texto = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#fff" stroke="#111" stroke-width="4"/>${texto ? `<text x="${x + w / 2}" y="${y + h + 32}" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="24" fill="#222">${texto}</text>` : ''}`;

function luna(x, y, s) {
  return `<path transform="translate(${x} ${y}) scale(${s})" d="M20 -60 A62 62 0 1 0 20 60 A48 48 0 1 1 20 -60 Z" fill="#fff" stroke="#111" stroke-width="5" stroke-linejoin="round"/>`;
}

// Laberinto determinista (backtracking con semilla fija)
function laberinto(cols, rows, celda, ox, oy, semilla = 7) {
  let s = semilla;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const visit = Array.from({ length: rows }, () => Array(cols).fill(false));
  const paredes = { h: Array.from({ length: rows + 1 }, () => Array(cols).fill(true)), v: Array.from({ length: rows }, () => Array(cols + 1).fill(true)) };
  const pila = [[0, 0]]; visit[0][0] = true;
  while (pila.length) {
    const [r, c] = pila[pila.length - 1];
    const vec = [[r - 1, c, 'N'], [r + 1, c, 'S'], [r, c - 1, 'O'], [r, c + 1, 'E']].filter(([rr, cc]) => rr >= 0 && rr < rows && cc >= 0 && cc < cols && !visit[rr][cc]);
    if (!vec.length) { pila.pop(); continue; }
    const [rr, cc, d] = vec[Math.floor(rnd() * vec.length)];
    if (d === 'N') paredes.h[r][c] = false; if (d === 'S') paredes.h[r + 1][c] = false;
    if (d === 'O') paredes.v[r][c] = false; if (d === 'E') paredes.v[r][c + 1] = false;
    visit[rr][cc] = true; pila.push([rr, cc]);
  }
  paredes.h[0][0] = false; paredes.h[rows][cols - 1] = false; // entrada y salida
  let d = '';
  for (let r = 0; r <= rows; r++) for (let c = 0; c < cols; c++) if (paredes.h[r][c]) d += `M${ox + c * celda} ${oy + r * celda}h${celda}`;
  for (let r = 0; r < rows; r++) for (let c = 0; c <= cols; c++) if (paredes.v[r][c]) d += `M${ox + c * celda} ${oy + r * celda}v${celda}`;
  return `<path d="${d}" fill="none" stroke="#111" stroke-width="7" stroke-linecap="round"/>`;
}

function arcoiris(cx, cy, r0, banda, etiquetas) {
  let g = '';
  etiquetas.forEach((et, i) => {
    const r = r0 - i * banda;
    g += `<path d="M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy} L${cx + r - banda} ${cy} A${r - banda} ${r - banda} 0 0 0 ${cx - r + banda} ${cy} Z" fill="#fff" stroke="#111" stroke-width="4"/>`;
    g += `<text x="${cx}" y="${cy - r + banda * 0.68}" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="${banda * 0.5}" fill="#666">${et}</text>`;
  });
  return g;
}

const paginas = [];

// 0. Portada (a color)
paginas.push(`<rect width="${W}" height="${H}" fill="url(#tyn-cielo)"/>
  ${TyN.sol({ x: 660, y: 150, s: 0.9 })}${TyN.nubeFondo({ x: 150, y: 140, s: 1.2 })}
  ${TyN.colinas(W, H, 820)}
  <text x="${W / 2}" y="330" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="74" fill="${P.naranja}" stroke="${P.tinta}" stroke-width="12" stroke-linejoin="round" paint-order="stroke">¡A colorear con</text>
  <text x="${W / 2}" y="420" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="84" fill="#4FB8F5" stroke="${P.tinta}" stroke-width="12" stroke-linejoin="round" paint-order="stroke">Tilo y Nuba!</text>
  ${TyN.tilo({ x: 300, y: 760, s: 1.9, expresion: 'risa', brazo: 'saluda', id: 'p0' })}
  ${TyN.nuba({ x: 560, y: 600, s: 1.25, animo: 'arcoiris', expresion: 'risa' })}
  <rect x="147" y="950" width="500" height="80" rx="40" fill="${P.morado}" stroke="${P.tinta}" stroke-width="6"/>
  <text x="${W / 2}" y="1003" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="34" fill="${P.sol}">10 láminas para colorear y jugar</text>
  <text x="${W / 2}" y="1085" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="20" fill="${P.tinta}">De 3 a 6 años · Imprime todas las copias que quieras en casa o en clase</text>`);

// 1. Tilo
paginas.push(`${marco}${titulo('¡Hola, soy Tilo!')}${subt('Un zorrito curioso que siempre lleva su bufanda')}
  ${TyN.sol({ ...L, x: 640, y: 260, s: 0.8 })}
  ${TyN.tilo({ ...L, x: 380, y: 640, s: 3.1, brazo: 'saluda', expresion: 'risa', id: 'l1' })}
  ${TyN.flor({ ...L, x: 110, y: 940, s: 2 })}${TyN.flor({ ...L, x: 680, y: 950, s: 2 })}
  <path d="M40 1010 Q400 980 754 1010" fill="none" stroke="#111" stroke-width="4"/>${pie(1)}`);

// 2. Nuba y sus colores
paginas.push(`${marco}${titulo('¡Hola, soy Nuba!')}${subt('Cambio de color según cómo me siento')}
  ${TyN.estrella({ ...L, x: 120, y: 260, s: 1.6 })}${TyN.estrella({ ...L, x: 680, y: 300, s: 1.3 })}
  ${TyN.nuba({ ...L, x: W / 2, y: 470, s: 2.9 })}
  ${caja(70, 760, 120, 110, 'feliz')}${caja(230, 760, 120, 110, 'triste')}${caja(390, 760, 120, 110, 'emocionada')}${caja(550, 760, 120, 110, 'tranquila')}
  <text x="${W / 2}" y="970" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="22" fill="#444">Pinta cada cajita del color de Nuba: rosa, gris, amarillo y azul.</text>
  ${pie(2)}`);

// 3. ¡Tú eliges!
paginas.push(`${marco}${titulo('¡Tú eliges!')}${subt('¿Qué hay al final de cada camino? ¡Dibújalo!')}
  ${caja(70, 200, 300, 260)}${caja(424, 200, 300, 260)}
  <path d="M220 470 C240 600 330 640 397 700 M574 470 C554 600 464 640 397 700" fill="none" stroke="#111" stroke-width="5" stroke-dasharray="14 12"/>
  ${TyN.cartel({ ...L, x: W / 2, y: 820, s: 1.2 })}
  ${TyN.tilo({ ...L, x: 210, y: 900, s: 1.3, expresion: 'duda', id: 'l3' })}
  ${TyN.nuba({ ...L, x: 610, y: 820, s: 1 })}${pie(3)}`);

// 4. Cumpleaños
paginas.push(`${marco}${titulo('¡Feliz cumpleaños!')}${subt('Dibuja tantas velas como años cumples')}
  ${TyN.globo({ ...L, x: 150, y: 290, s: 1.4, cuerda: 160 })}${TyN.globo({ ...L, x: 640, y: 270, s: 1.5, cuerda: 180 })}
  ${TyN.tarta({ ...L, x: W / 2, y: 930, s: 1.2, velas: 0, llama: 0 })}
  ${TyN.tilo({ ...L, x: 170, y: 680, s: 1.5, brazo: 'arriba', expresion: 'risa', id: 'l4' })}
  ${TyN.nuba({ ...L, x: 600, y: 600, s: 1.1, expresion: 'risa' })}${pie(4)}`);

// 5. Laberinto
paginas.push(`${marco}${titulo('El laberinto')}${subt('Ayuda a Tilo a encontrar el camino hasta Nuba')}
  ${TyN.tilo({ ...L, x: 92, y: 300, s: 0.6, id: 'l5' })}
  ${laberinto(9, 10, 60, 172, 260)}
  ${TyN.nuba({ ...L, x: 680, y: 930, s: 0.62 })}${pie(5)}`);

// 6. Cuenta y colorea
{
  const fila = (y, n, fn, label) => {
    let g = '';
    for (let i = 0; i < n; i++) g += fn(110 + i * 105, y);
    return g + `<rect x="620" y="${y - 45}" width="110" height="90" rx="16" fill="#fff" stroke="#111" stroke-width="4"/><text x="560" y="${y + 12}" font-family="Fredoka" font-weight="600" font-size="22" fill="#666" text-anchor="end">${label}</text>`;
  };
  paginas.push(`${marco}${titulo('Cuenta y colorea')}${subt('¿Cuántos hay? Escribe el número en la caja')}
    ${fila(270, 1, (x, y) => TyN.sol({ ...L, x, y, s: 0.55 }), '')}
    ${fila(430, 2, (x, y) => TyN.arbol({ ...L, x, y: y - 10, s: 0.75 }), '')}
    ${fila(600, 3, (x, y) => TyN.globo({ ...L, x, y: y - 20, s: 0.8, cuerda: 40 }), '')}
    ${fila(760, 4, (x, y) => TyN.flor({ ...L, x, y: y - 20, s: 1.8 }), '')}
    ${fila(920, 5, (x, y) => TyN.estrella({ ...L, x: x - 15 * (x > 400 ? 1 : 0), y, s: 1.6 }), '')}
    ${pie(6)}`);
}

// 7. El río (episodio 1)
paginas.push(`${marco}${titulo('¿Puente o barca?')}${subt('¿Cómo cruzarías tú el río? Colorea tu camino favorito')}
  <path d="M40 760 Q400 700 754 760 L754 1040 Q400 1000 40 1040 Z" fill="#fff" stroke="#111" stroke-width="5"/>
  <path d="M90 860 q40 -20 80 0 M300 900 q40 -20 80 0 M560 870 q40 -20 80 0 M180 980 q40 -20 80 0 M470 990 q40 -20 80 0" fill="none" stroke="#111" stroke-width="4" stroke-linecap="round"/>
  <g transform="translate(250 735) scale(1.1)">
    <path d="M-170 -60 Q0 -150 170 -60" fill="none" stroke="#111" stroke-width="6"/>
    ${Array.from({ length: 9 }, (_, i) => { const t = i / 8; return `<rect x="${-176 + t * 320}" y="${-8 - Math.sin(t * Math.PI) * 50}" width="32" height="22" rx="4" fill="#fff" stroke="#111" stroke-width="4"/>`; }).join('')}
  </g>
  <g transform="translate(590 900)"><path d="M0 -170 L0 -20" stroke="#111" stroke-width="6"/><path d="M6 -166 L100 -40 L6 -40 Z" fill="#fff" stroke="#111" stroke-width="5" stroke-linejoin="round"/><path d="M-110 -30 L110 -30 L80 30 L-80 30 Z" fill="#fff" stroke="#111" stroke-width="6" stroke-linejoin="round"/></g>
  ${TyN.tilo({ ...L, x: 170, y: 410, s: 1.25, expresion: 'sorpresa', brazo: 'arriba', id: 'l7' })}
  ${TyN.nuba({ ...L, x: 600, y: 330, s: 1 })}${pie(7)}`);

// 8. Arcoíris (colorea por palabras)
paginas.push(`${marco}${titulo('El arcoíris de Nuba')}${subt('Colorea cada franja del color que dice')}
  ${arcoiris(W / 2, 720, 340, 52, ['rojo', 'naranja', 'amarillo', 'verde', 'azul', 'morado'])}
  ${TyN.nuba({ ...L, x: 150, y: 760, s: 1, expresion: 'risa' })}
  ${TyN.nuba({ ...L, x: 644, y: 760, s: 1, espejo: true })}
  ${TyN.flor({ ...L, x: 300, y: 930, s: 1.8 })}${TyN.flor({ ...L, x: 490, y: 930, s: 1.8 })}${pie(8)}`);

// 9. Buenas noches
paginas.push(`${marco}${titulo('¡Buenas noches!')}${subt('Tilo y Nuba miran las estrellas. ¿Cuántas ves?')}
  ${luna(620, 300, 1.3)}
  ${[[120, 260], [260, 340], [420, 230], [160, 470], [690, 520], [480, 420]].map(([x, y], i) => TyN.estrella({ ...L, x, y, s: 1.2 + (i % 3) * 0.25 })).join('')}
  ${TyN.tilo({ ...L, x: 300, y: 820, s: 1.9, parpadeo: 1, id: 'l9' })}
  ${TyN.nuba({ ...L, x: 560, y: 700, s: 1.2, parpadeo: 1 })}
  <path d="M40 1052 Q400 1036 754 1052" fill="none" stroke="#111" stroke-width="4"/>${pie(9)}`);

// 10. Diploma
paginas.push(`<rect x="28" y="28" width="${W - 56}" height="${H - 56}" rx="28" fill="none" stroke="#111" stroke-width="10"/>
  <rect x="48" y="48" width="${W - 96}" height="${H - 96}" rx="20" fill="none" stroke="#111" stroke-width="3" stroke-dasharray="10 8"/>
  ${titulo('DIPLOMA', 190, 92)}
  <text x="${W / 2}" y="260" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="34" fill="#222">de Gran Artista</text>
  <text x="${W / 2}" y="380" text-anchor="middle" font-family="Fredoka" font-weight="400" font-size="26" fill="#444">Tilo y Nuba entregan este diploma a</text>
  <line x1="150" y1="470" x2="644" y2="470" stroke="#111" stroke-width="3"/>
  <text x="${W / 2}" y="540" text-anchor="middle" font-family="Fredoka" font-weight="400" font-size="26" fill="#444">por colorear con mucha imaginación.</text>
  ${TyN.tilo({ ...L, x: 250, y: 790, s: 1.5, brazo: 'arriba', expresion: 'risa', id: 'l10' })}
  ${TyN.nuba({ ...L, x: 540, y: 720, s: 1.1, expresion: 'risa' })}
  ${TyN.estrella({ ...L, x: 400, y: 640, s: 1.6 })}
  <text x="${W / 2}" y="1010" text-anchor="middle" font-family="Fredoka" font-weight="400" font-size="15" fill="#777">© Tilo y Nuba. Uso personal, familiar y en el aula: imprime todas las copias que necesites.</text>
  <text x="${W / 2}" y="1032" text-anchor="middle" font-family="Fredoka" font-weight="400" font-size="15" fill="#777">Prohibida la reventa o redistribución del archivo. Más aventuras en ${CANAL}</text>`);

const htmlLibro = paginaHTML(
  paginas.map((p) => `<div class="pagina">${svg(W, H, p, 'class="h"')}</div>`).join(''),
  `@page{size:A4;margin:0} .pagina{width:210mm;height:297mm;page-break-after:always;overflow:hidden;background:#fff} .pagina:last-child{page-break-after:auto} svg.h{width:210mm;height:297mm;display:block}`
);

conNavegador(async (b) => {
  await aPDF(b, htmlLibro, path.join(OUT, 'libro-colorear-tilo-y-nuba.pdf'));
  // Muestras gratuitas en PNG (para Pinterest, la web y grupos de familias)
  const muestra = (i, nombre) => aPNG(b, paginaHTML(svg(W, H, `<rect width="${W}" height="${H}" fill="#fff"/>${paginas[i]}`)), W, H, path.join(OUT, nombre));
  await muestra(0, 'portada.png');
  await muestra(1, 'muestra-gratis-tilo.png');
  await muestra(5, 'muestra-gratis-laberinto.png');
});
