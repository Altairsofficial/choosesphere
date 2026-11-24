// Genera la identidad visual del canal en canal-infantil/marca/
//   node herramientas/generar-marca.js
const fs = require('fs');
const path = require('path');
const { TyN, paginaHTML, svg, conNavegador, aPNG } = require('./render');

const OUT = path.join(__dirname, '..', 'marca');
fs.mkdirSync(path.join(OUT, 'svg'), { recursive: true });
const P = TyN.PALETA;

// Texto con doble contorno (tinta + blanco), estilo dibujos animados.
function rotulo(texto, { x, y, size, fill = '#fff', anchor = 'middle', tinta = P.tinta, grosor = 1 }) {
  const base = `x="${x}" y="${y}" text-anchor="${anchor}" font-family="Fredoka" font-weight="700" font-size="${size}"`;
  return `<text ${base} fill="none" stroke="${tinta}" stroke-width="${size * 0.2 * grosor}" stroke-linejoin="round">${texto}</text>
    <text ${base} fill="none" stroke="#fff" stroke-width="${size * 0.1 * grosor}" stroke-linejoin="round">${texto}</text>
    <text ${base} fill="${fill}">${texto}</text>`;
}

function logo(cx, cy, s = 1) {
  return `<g transform="translate(${cx} ${cy}) scale(${s})">
    ${rotulo(`<tspan fill="${P.naranja}">Tilo</tspan> <tspan fill="${P.tinta}">y</tspan> <tspan fill="#4FB8F5">Nuba</tspan>`, { x: 0, y: 0, size: 150 })}
    <g transform="translate(0 92)">
      <rect x="-190" y="-48" width="380" height="80" rx="40" fill="${P.morado}" stroke="${P.tinta}" stroke-width="8"/>
      <text x="0" y="12" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="50" fill="${P.sol}">¡Tú eliges!</text>
    </g>
  </g>`;
}

function paisaje(w, h, { horizonte = 0.62, sol = true } = {}) {
  const y = h * horizonte;
  return `<rect width="${w}" height="${h}" fill="url(#tyn-cielo)"/>
    ${sol ? TyN.sol({ x: w * 0.88, y: h * 0.18, s: h / 900 }) : ''}
    ${TyN.nubeFondo({ x: w * 0.12, y: h * 0.16, s: h / 500 })}
    ${TyN.nubeFondo({ x: w * 0.55, y: h * 0.1, s: h / 700 })}
    ${TyN.colinas(w, h, y)}`;
}

function puente(x, y, s) {
  let tablas = '';
  for (let i = 0; i < 9; i++) {
    const t = i / 8, px = -160 + t * 320, py = -Math.sin(t * Math.PI) * 50;
    tablas += `<rect x="${px - 16}" y="${py - 8}" width="32" height="22" rx="4" fill="#C98B52" stroke="${P.tinta}" stroke-width="5"/>`;
  }
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-170 -60 Q0 -150 170 -60" fill="none" stroke="#8A5A2B" stroke-width="8"/>
    <rect x="-176" y="-80" width="14" height="90" rx="5" fill="#8A5A2B" stroke="${P.tinta}" stroke-width="5"/>
    <rect x="162" y="-80" width="14" height="90" rx="5" fill="#8A5A2B" stroke="${P.tinta}" stroke-width="5"/>
    ${tablas}</g>`;
}

function barca(x, y, s) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M0 -150 L0 -10" stroke="${P.tinta}" stroke-width="8"/>
    <path d="M6 -146 L100 -30 L6 -30 Z" fill="#fff" stroke="${P.tinta}" stroke-width="6" stroke-linejoin="round"/>
    <path d="M-120 -20 L120 -20 L90 40 L-90 40 Z" fill="${P.rosa}" stroke="${P.tinta}" stroke-width="7" stroke-linejoin="round"/>
    <path d="M-160 60 Q-120 40 -80 60 Q-40 80 0 60 Q40 40 80 60 Q120 80 160 60" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/>
  </g>`;
}

conNavegador(async (b) => {
  const html = (w, h, c) => paginaHTML(svg(w, h, c));

  // 1) Logo (fondo transparente)
  await aPNG(b, html(1400, 520, logo(700, 230)), 1400, 520, path.join(OUT, 'logo.png'), { transparente: true });

  // 2) Avatar / foto de perfil 800x800 (se muestra recortado en círculo)
  {
    const c = `<rect width="800" height="800" fill="${P.sol}"/>
      <circle cx="400" cy="400" r="330" fill="#FFE08A"/>
      ${TyN.nuba({ x: 600, y: 215, s: 1.25, animo: 'normal', expresion: 'risa' })}
      ${TyN.tilo({ x: 380, y: 530, s: 2.9, expresion: 'feliz', brazo: 'saluda', id: 'av' })}`;
    await aPNG(b, html(800, 800, c), 800, 800, path.join(OUT, 'avatar-800.png'));
  }

  // 3) Banner 2560x1440 (zona segura en todos los dispositivos: 1546x423 centrada)
  {
    const W = 2560, H = 1440;
    const c = `${paisaje(W, H, { horizonte: 0.68 })}
      ${TyN.arbol({ x: 300, y: 960, s: 2.2 })}${TyN.arbol({ x: 2420, y: 930, s: 2.4, color: '#5CCB5F' })}
      ${TyN.flor({ x: 520, y: 1150, s: 2 })}${TyN.flor({ x: 2100, y: 1180, s: 2, color: P.sol })}
      ${TyN.cartel({ x: 2170, y: 1000, s: 1.6 })}
      ${TyN.tilo({ x: 660, y: 760, s: 1.45, brazo: 'saluda', expresion: 'risa', id: 'bn' })}
      ${TyN.nuba({ x: 900, y: 600, s: 1.15, animo: 'normal' })}
      ${logo(1430, 700, 1)}
      <text x="1430" y="895" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="44" fill="${P.tinta}">Dibujos animados donde tú decides la aventura</text>
      <!-- guía de zona segura (no visible): x 507-2053, y 508-931 -->`;
    await aPNG(b, html(W, H, c), W, H, path.join(OUT, 'banner-2560x1440.png'));
    // Vista con la zona segura marcada, para revisar
    const guia = c + `<rect x="507" y="508" width="1546" height="423" fill="none" stroke="red" stroke-width="6" stroke-dasharray="20 14"/>`;
    await aPNG(b, html(W, H, guia), W, H, path.join(OUT, 'banner-zona-segura-REVISION.png'));
  }

  // 4) Miniatura del episodio 1 (1280x720)
  {
    const c = `<rect width="640" height="720" fill="${P.sol}"/><rect x="640" width="640" height="720" fill="${P.morado}"/>
      <path d="M0 600 Q320 560 640 610 Q960 660 1280 600 L1280 720 L0 720 Z" fill="#4FB8F5" stroke="${P.tinta}" stroke-width="6"/>
      ${puente(300, 560, 1.25)}
      ${barca(1000, 560, 1.15)}
      ${TyN.tilo({ x: 640, y: 420, s: 2.1, expresion: 'sorpresa', brazo: 'arriba', id: 'mi' })}
      ${TyN.nuba({ x: 1185, y: 300, s: 0.7, expresion: 'risa' })}
      ${rotulo('¿PUENTE', { x: 310, y: 140, size: 104, fill: P.naranja })}
      ${rotulo('o BARCA?', { x: 975, y: 140, size: 104, fill: P.sol })}`;
    await aPNG(b, html(1280, 720, c), 1280, 720, path.join(OUT, 'miniatura-ep01.png'));
  }

  // 5) Hoja de personajes (guía de estilo)
  {
    const W = 1800, H = 1000;
    const animos = [['normal', 'Normal', 'blanca'], ['feliz', 'Feliz', 'rosa'], ['triste', 'Triste', 'gris'], ['alegre', 'Emocionada', 'amarilla'], ['calma', 'Tranquila', 'azul'], ['arcoiris', '¡Contentísima!', 'arcoíris']];
    let nubas = '';
    animos.forEach(([a, n, col], i) => {
      const x = 170 + i * 292;
      nubas += TyN.nuba({ x, y: 770, s: 0.9, animo: a, expresion: a === 'triste' ? 'triste' : a === 'arcoiris' ? 'risa' : 'feliz' });
      nubas += `<text x="${x}" y="880" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="34" fill="${P.tinta}">${n}</text>
        <text x="${x}" y="920" text-anchor="middle" font-family="Fredoka" font-weight="400" font-size="26" fill="#555">nube ${col}</text>`;
    });
    const c = `<rect width="${W}" height="${H}" fill="#FFFBF2"/>
      <text x="60" y="90" font-family="Fredoka" font-weight="700" font-size="64" fill="${P.tinta}">Tilo y Nuba · hoja de personajes</text>
      <text x="60" y="150" font-family="Fredoka" font-weight="600" font-size="34" fill="${P.naranja}">TILO — zorrito curioso y valiente (5 años)</text>
      ${TyN.tilo({ x: 160, y: 330, s: 1.2, id: 'h1' })}
      ${TyN.tilo({ x: 420, y: 330, s: 1.2, expresion: 'risa', brazo: 'saluda', id: 'h2' })}
      ${TyN.tilo({ x: 680, y: 330, s: 1.2, expresion: 'sorpresa', brazo: 'arriba', id: 'h3' })}
      ${TyN.tilo({ x: 940, y: 330, s: 1.2, expresion: 'duda', id: 'h4' })}
      ${TyN.tilo({ x: 1200, y: 330, s: 1.2, modo: 'linea', id: 'h5' })}
      <g font-family="Fredoka" font-weight="600" font-size="28" fill="#555" text-anchor="middle">
        <text x="160" y="490">feliz</text><text x="420" y="490">risa + saluda</text><text x="680" y="490">sorpresa</text><text x="940" y="490">duda</text><text x="1200" y="490">línea (colorear)</text>
      </g>
      <g transform="translate(1390 200)" font-family="Fredoka" font-size="26" fill="${P.tinta}">
        <text font-weight="700" font-size="30">Paleta</text>
        ${[['Naranja Tilo', P.naranja], ['Verde bufanda', P.bufanda], ['Amarillo elige', P.sol], ['Morado elige', P.morado], ['Cielo', P.cielo], ['Tinta', P.tinta]].map(([n, c], i) =>
          `<rect x="0" y="${20 + i * 46}" width="36" height="36" rx="8" fill="${c}" stroke="${P.tinta}" stroke-width="2"/><text x="50" y="${46 + i * 46}">${n} ${c}</text>`).join('')}
      </g>
      <text x="60" y="580" font-family="Fredoka" font-weight="600" font-size="34" fill="#3A8DDE">NUBA — nubecita que cambia de color según cómo se siente</text>
      ${nubas}`;
    await aPNG(b, html(W, H, c), W, H, path.join(OUT, 'hoja-personajes.png'));
  }

  // 6) SVG sueltos de los personajes (para animar en otros programas)
  const suelto = (w, h, cx, cy, g) => svg(w, h, g.replace('<g transform="', `<g transform="translate(${cx} ${cy}) `));
  fs.writeFileSync(path.join(OUT, 'svg', 'tilo.svg'), suelto(240, 260, 110, 140, TyN.tilo({ id: 's' })));
  fs.writeFileSync(path.join(OUT, 'svg', 'tilo-linea.svg'), suelto(240, 260, 110, 140, TyN.tilo({ modo: 'linea', id: 's' })));
  fs.writeFileSync(path.join(OUT, 'svg', 'nuba.svg'), suelto(240, 180, 120, 100, TyN.nuba()));
  fs.writeFileSync(path.join(OUT, 'svg', 'nuba-linea.svg'), suelto(240, 180, 120, 100, TyN.nuba({ modo: 'linea' })));
  console.log('✔ marca/svg/*.svg');
});
