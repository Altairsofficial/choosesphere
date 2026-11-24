/*
 * Tilo y Nuba — biblioteca de personajes y escenarios en SVG.
 *
 * Funciona igual en Node (require) y en el navegador (window.TyN), para que
 * la marca, el libro para colorear y los vídeos usen exactamente el mismo dibujo.
 *
 * Cada función devuelve un fragmento <g>…</g> dibujado alrededor de (0,0).
 * Opciones comunes:
 *   modo: 'color' (por defecto) | 'linea'  -> 'linea' = dibujo para colorear
 *   x, y, s (escala), r (rotación en grados)
 */
(function (root) {
  const PALETA = {
    tinta: '#2B2D42',
    naranja: '#F5892B',
    naranjaOscuro: '#C8661A',
    crema: '#FFF3E0',
    orejaInterior: '#FFD3B8',
    bufanda: '#2EB872',
    bufandaOscuro: '#1F8F57',
    marron: '#8A4B1F',
    rubor: '#FF8A8A',
    sol: '#FFC93C',
    morado: '#7B5CFF',
    cielo: '#7FD3FF',
    cieloClaro: '#D6F1FF',
    rosa: '#FF8FB1',
    hierba: '#7ED957',
    hierbaOscura: '#4CB944',
    nubaBorde: '#4A5A8C',
  };

  // Colores de ánimo de Nuba (gancho educativo: emociones y colores)
  const ANIMO_NUBA = {
    normal: '#FFFFFF',
    feliz: '#FFD1E3',
    triste: '#C9CED6',
    alegre: '#FFF1A8',
    calma: '#CDEBFF',
    arcoiris: 'url(#tyn-arcoiris)',
  };

  function tr(o) {
    const x = o.x || 0, y = o.y || 0, s = o.s == null ? 1 : o.s, r = o.r || 0;
    const sx = o.espejo ? -s : s;
    return `translate(${x} ${y}) rotate(${r}) scale(${sx} ${s})`;
  }

  function estilo(o) {
    const linea = o.modo === 'linea';
    return {
      linea,
      sw: linea ? 5 : 4,
      ink: linea ? '#111' : PALETA.tinta,
      f: (c) => (linea ? '#fff' : c),
      ojo: linea ? '#111' : PALETA.tinta,
    };
  }

  // Definiciones compartidas (degradados). Incluir una vez por <svg>.
  function defs() {
    return `<defs>
      <linearGradient id="tyn-arcoiris" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#FF7A7A"/><stop offset=".2" stop-color="#FFB54D"/>
        <stop offset=".4" stop-color="#FFE45C"/><stop offset=".6" stop-color="#7EE081"/>
        <stop offset=".8" stop-color="#6EC8FF"/><stop offset="1" stop-color="#B08CFF"/>
      </linearGradient>
      <linearGradient id="tyn-cielo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8EDBFF"/><stop offset="1" stop-color="#E3F7FF"/>
      </linearGradient>
      <linearGradient id="tyn-noche" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3B2F7A"/><stop offset="1" stop-color="#7B5CFF"/>
      </linearGradient>
    </defs>`;
  }

  /* ---------------------------------------------------------------- TILO */
  // Zorrito naranja, curioso y valiente, con bufanda verde.
  // expresion: 'feliz' | 'sorpresa' | 'risa' | 'duda'
  // brazo: 'abajo' | 'saluda' | 'arriba'
  function tilo(o = {}) {
    const e = estilo(o);
    const exp = o.expresion || 'feliz';
    const brazo = o.brazo || 'abajo';
    const parpadeo = o.parpadeo || 0; // 0 abierto … 1 cerrado
    const st = `stroke="${e.ink}" stroke-width="${e.sw}" stroke-linejoin="round" stroke-linecap="round"`;

    const cola = `
      <path d="M28 78 C70 92 112 52 98 4 C92 -14 72 -14 70 2 C68 30 52 54 22 52 Z" fill="${e.f(PALETA.naranja)}" ${st}/>
      <path d="M98 4 C92 -14 72 -14 70 2 C70 12 76 20 88 20 C96 18 100 12 98 4 Z" fill="${e.f(PALETA.crema)}" ${st}/>`;

    const pies = `
      <ellipse cx="-20" cy="108" rx="17" ry="9" fill="${e.f(PALETA.marron)}" ${st}/>
      <ellipse cx="20" cy="108" rx="17" ry="9" fill="${e.f(PALETA.marron)}" ${st}/>`;

    const cuerpo = `
      <ellipse cx="0" cy="64" rx="42" ry="46" fill="${e.f(PALETA.naranja)}" ${st}/>
      <ellipse cx="0" cy="72" rx="25" ry="31" fill="${e.f(PALETA.crema)}" ${e.linea ? `stroke="${e.ink}" stroke-width="3"` : 'stroke="none"'}/>`;

    const brazoIzq = brazo === 'abajo'
      ? `<ellipse cx="-42" cy="62" rx="11" ry="21" transform="rotate(18 -42 62)" fill="${e.f(PALETA.naranja)}" ${st}/>`
      : brazo === 'saluda'
        ? `<ellipse cx="-52" cy="30" rx="11" ry="22" transform="rotate(50 -52 30)" fill="${e.f(PALETA.naranja)}" ${st}/>`
        : `<ellipse cx="-50" cy="22" rx="11" ry="23" transform="rotate(35 -50 22)" fill="${e.f(PALETA.naranja)}" ${st}/>`;
    const brazoDer = brazo === 'arriba'
      ? `<ellipse cx="50" cy="22" rx="11" ry="23" transform="rotate(-35 50 22)" fill="${e.f(PALETA.naranja)}" ${st}/>`
      : `<ellipse cx="42" cy="62" rx="11" ry="21" transform="rotate(-18 42 62)" fill="${e.f(PALETA.naranja)}" ${st}/>`;

    const bufanda = `
      <path d="M14 22 C20 36 26 46 34 58 L20 64 C14 50 8 38 4 26 Z" fill="${e.f(PALETA.bufandaOscuro)}" ${st}/>
      <rect x="-40" y="10" width="80" height="20" rx="10" fill="${e.f(PALETA.bufanda)}" ${st}/>`;

    const orejas = `
      <path d="M-52 -58 L-60 -122 L-12 -84 Z" fill="${e.f(PALETA.naranja)}" ${st}/>
      <path d="M-47 -70 L-53 -108 L-25 -86 Z" fill="${e.f(PALETA.orejaInterior)}" stroke="none"/>
      <path d="M52 -58 L60 -122 L12 -84 Z" fill="${e.f(PALETA.naranja)}" ${st}/>
      <path d="M47 -70 L53 -108 L25 -86 Z" fill="${e.f(PALETA.orejaInterior)}" stroke="none"/>`;

    const cabeza = `
      <clipPath id="tyn-cab-${o.id || 'a'}"><ellipse cx="0" cy="-40" rx="62" ry="50"/></clipPath>
      <ellipse cx="0" cy="-40" rx="62" ry="50" fill="${e.f(PALETA.naranja)}" stroke="none"/>
      <g clip-path="url(#tyn-cab-${o.id || 'a'})">
        <path d="M-70 -34 C-44 -26 -26 -40 0 -30 C26 -40 44 -26 70 -34 L70 20 L-70 20 Z" fill="${e.f(PALETA.crema)}" ${e.linea ? st : 'stroke="none"'}/>
      </g>
      <ellipse cx="0" cy="-40" rx="62" ry="50" fill="none" ${st}/>`;

    const ry = 11 * (1 - parpadeo * 0.92);
    let ojos;
    if (exp === 'risa') {
      ojos = `<path d="M-31 -46 Q-22 -58 -13 -46" fill="none" stroke="${e.ojo}" stroke-width="5" stroke-linecap="round"/>
              <path d="M13 -46 Q22 -58 31 -46" fill="none" stroke="${e.ojo}" stroke-width="5" stroke-linecap="round"/>`;
    } else {
      const er = exp === 'sorpresa' ? 1.18 : 1;
      ojos = `<ellipse cx="-22" cy="-48" rx="${8 * er}" ry="${ry * er}" fill="${e.ojo}"/>
              <ellipse cx="22" cy="-48" rx="${8 * er}" ry="${ry * er}" fill="${e.ojo}"/>`;
      if (parpadeo < 0.5) ojos += `<circle cx="-19" cy="-52" r="3.2" fill="#fff"/><circle cx="25" cy="-52" r="3.2" fill="#fff"/>`;
      if (exp === 'duda') ojos += `<path d="M-33 -66 Q-23 -76 -12 -70" fill="none" stroke="${e.ojo}" stroke-width="4" stroke-linecap="round"/><path d="M13 -64 L31 -64" stroke="${e.ojo}" stroke-width="4" stroke-linecap="round"/>`;
    }

    const nariz = `<path d="M-9 -30 Q0 -35 9 -30 Q5 -21 0 -20 Q-5 -21 -9 -30 Z" fill="${e.ojo}"/>`;
    let boca;
    if (exp === 'sorpresa') boca = `<ellipse cx="0" cy="-8" rx="6" ry="8" fill="${e.linea ? '#fff' : '#7A2E2E'}" stroke="${e.ink}" stroke-width="3"/>`;
    else if (exp === 'risa') boca = `<path d="M-14 -14 Q0 -14 14 -14 Q12 4 0 4 Q-12 4 -14 -14 Z" fill="${e.linea ? '#fff' : '#7A2E2E'}" stroke="${e.ink}" stroke-width="3" stroke-linejoin="round"/><path d="M-7 -2 Q0 -6 7 -2 Q4 3 0 3 Q-4 3 -7 -2Z" fill="${e.linea ? '#fff' : '#FF8A8A'}"/>`;
    else if (exp === 'duda') boca = `<path d="M-9 -12 Q0 -16 9 -10" fill="none" stroke="${e.ink}" stroke-width="3.5" stroke-linecap="round"/>`;
    else boca = `<path d="M-11 -15 Q-5 -7 0 -14 Q5 -7 11 -15" fill="none" stroke="${e.ink}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    const rubor = e.linea ? '' : `<circle cx="-40" cy="-24" r="8" fill="${PALETA.rubor}" opacity=".55"/><circle cx="40" cy="-24" r="8" fill="${PALETA.rubor}" opacity=".55"/>`;

    return `<g transform="${tr(o)}">${cola}${pies}${brazoIzq}${cuerpo}${brazoDer}${bufanda}${orejas}${cabeza}${rubor}${ojos}${nariz}${boca}</g>`;
  }

  /* ---------------------------------------------------------------- NUBA */
  // Nubecita alegre que cambia de color según cómo se siente.
  // animo: normal | feliz | triste | alegre | calma | arcoiris
  // expresion: 'feliz' | 'sorpresa' | 'risa' | 'triste'
  function nuba(o = {}) {
    const e = estilo(o);
    const exp = o.expresion || 'feliz';
    const fill = e.linea ? '#fff' : (ANIMO_NUBA[o.animo || 'normal'] || o.animo);
    const borde = e.linea ? '#111' : PALETA.nubaBorde;
    const parpadeo = o.parpadeo || 0;
    const formas = [
      ['circle', { cx: -56, cy: 12, r: 36 }],
      ['circle', { cx: -22, cy: -22, r: 46 }],
      ['circle', { cx: 28, cy: -18, r: 42 }],
      ['circle', { cx: 62, cy: 14, r: 34 }],
      ['ellipse', { cx: 2, cy: 26, rx: 80, ry: 32 }],
    ];
    const pinta = (extra) => formas.map(([t, a]) =>
      `<${t} ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(' ')} ${extra}/>`).join('');
    const brazos = `
      <ellipse cx="-96" cy="30" rx="12" ry="15" transform="rotate(-25 -96 30)" fill="${fill}" stroke="${borde}" stroke-width="${e.sw}"/>
      <ellipse cx="98" cy="30" rx="12" ry="15" transform="rotate(25 98 30)" fill="${fill}" stroke="${borde}" stroke-width="${e.sw}"/>`;
    // Truco de contorno limpio: primero todas las formas con trazo doble, luego el relleno encima.
    const cuerpo = `${pinta(`fill="${borde}" stroke="${borde}" stroke-width="${e.sw * 2}"`)}${pinta(`fill="${fill}" stroke="none"`)}`;
    const estrella = `<path transform="translate(40 -60) rotate(12)" d="M0 -16 L4.7 -6.5 L15.2 -4.9 L7.6 2.5 L9.4 13 L0 8 L-9.4 13 L-7.6 2.5 L-15.2 -4.9 L-4.7 -6.5 Z" fill="${e.linea ? '#fff' : PALETA.sol}" stroke="${e.ink}" stroke-width="3.5" stroke-linejoin="round"/>`;
    const ry = 10 * (1 - parpadeo * 0.92);
    let ojos;
    if (exp === 'risa') {
      ojos = `<path d="M-30 -2 Q-22 -12 -14 -2" fill="none" stroke="${e.ojo}" stroke-width="5" stroke-linecap="round"/><path d="M14 -2 Q22 -12 30 -2" fill="none" stroke="${e.ojo}" stroke-width="5" stroke-linecap="round"/>`;
    } else {
      const er = exp === 'sorpresa' ? 1.2 : 1;
      ojos = `<ellipse cx="-22" cy="-2" rx="${7 * er}" ry="${ry * er}" fill="${e.ojo}"/><ellipse cx="22" cy="-2" rx="${7 * er}" ry="${ry * er}" fill="${e.ojo}"/>`;
      if (parpadeo < 0.5) ojos += `<circle cx="-19.5" cy="-6" r="3" fill="#fff"/><circle cx="24.5" cy="-6" r="3" fill="#fff"/>`;
      if (exp === 'triste') ojos += `<path d="M-32 -18 L-14 -22" stroke="${e.ojo}" stroke-width="4" stroke-linecap="round"/><path d="M14 -22 L32 -18" stroke="${e.ojo}" stroke-width="4" stroke-linecap="round"/>`;
    }
    let boca;
    if (exp === 'sorpresa') boca = `<ellipse cx="0" cy="20" rx="6" ry="8" fill="${e.linea ? '#fff' : '#7A2E4E'}" stroke="${e.ink}" stroke-width="3"/>`;
    else if (exp === 'risa') boca = `<path d="M-13 12 L13 12 Q11 30 0 30 Q-11 30 -13 12 Z" fill="${e.linea ? '#fff' : '#7A2E4E'}" stroke="${e.ink}" stroke-width="3" stroke-linejoin="round"/>`;
    else if (exp === 'triste') boca = `<path d="M-10 24 Q0 16 10 24" fill="none" stroke="${e.ink}" stroke-width="3.5" stroke-linecap="round"/>`;
    else boca = `<path d="M-12 14 Q0 28 12 14" fill="none" stroke="${e.ink}" stroke-width="3.5" stroke-linecap="round"/>`;
    const mejillas = e.linea ? '' : `<circle cx="-42" cy="14" r="8" fill="${PALETA.rosa}" opacity=".7"/><circle cx="42" cy="14" r="8" fill="${PALETA.rosa}" opacity=".7"/>`;
    return `<g transform="${tr(o)}">${cuerpo}${brazos}${estrella}${mejillas}${ojos}${boca}</g>`;
  }

  /* ------------------------------------------------------- ESCENARIO */
  function arbol(o = {}) {
    const e = estilo(o);
    const st = `stroke="${e.ink}" stroke-width="${e.sw}" stroke-linejoin="round"`;
    return `<g transform="${tr(o)}">
      <rect x="-9" y="0" width="18" height="60" rx="6" fill="${e.f('#A86B3C')}" ${st}/>
      <circle cx="0" cy="-22" r="42" fill="${e.f(o.color || PALETA.hierbaOscura)}" ${st}/>
      ${e.linea ? '' : '<circle cx="-14" cy="-36" r="10" fill="#fff" opacity=".18"/>'}
    </g>`;
  }

  function flor(o = {}) {
    const e = estilo(o);
    const c = o.color || PALETA.rosa;
    let p = '';
    for (let i = 0; i < 5; i++) {
      const a = (i * 72 * Math.PI) / 180;
      p += `<circle cx="${(Math.cos(a) * 9).toFixed(1)}" cy="${(Math.sin(a) * 9).toFixed(1)}" r="7" fill="${e.f(c)}" stroke="${e.ink}" stroke-width="${e.sw * 0.6}"/>`;
    }
    return `<g transform="${tr(o)}"><path d="M0 8 L0 40" stroke="${e.linea ? '#111' : PALETA.hierbaOscura}" stroke-width="${e.sw * 0.8}" stroke-linecap="round"/>${p}<circle r="6" fill="${e.f(PALETA.sol)}" stroke="${e.ink}" stroke-width="${e.sw * 0.6}"/></g>`;
  }

  function sol(o = {}) {
    const e = estilo(o);
    let rayos = '';
    for (let i = 0; i < 12; i++) {
      const a = (i * 30 * Math.PI) / 180;
      rayos += `<line x1="${(Math.cos(a) * 58).toFixed(1)}" y1="${(Math.sin(a) * 58).toFixed(1)}" x2="${(Math.cos(a) * 78).toFixed(1)}" y2="${(Math.sin(a) * 78).toFixed(1)}" stroke="${e.linea ? '#111' : '#FFB800'}" stroke-width="${e.sw * 1.6}" stroke-linecap="round"/>`;
    }
    return `<g transform="${tr(o)}">${rayos}<circle r="48" fill="${e.f(PALETA.sol)}" stroke="${e.linea ? '#111' : '#F0A500'}" stroke-width="${e.sw}"/></g>`;
  }

  function estrella(o = {}) {
    const e = estilo(o);
    return `<path transform="${tr(o)}" d="M0 -20 L5.9 -8.1 L19 -6.2 L9.5 3.1 L11.8 16.2 L0 10 L-11.8 16.2 L-9.5 3.1 L-19 -6.2 L-5.9 -8.1 Z" fill="${e.f(o.color || PALETA.sol)}" stroke="${e.ink}" stroke-width="${e.sw * 0.8}" stroke-linejoin="round"/>`;
  }

  function globo(o = {}) {
    const e = estilo(o);
    const c = o.color || PALETA.rosa;
    const cuerda = o.cuerda == null ? 120 : o.cuerda;
    return `<g transform="${tr(o)}">
      <path d="M0 46 C-10 ${46 + cuerda * 0.35} 10 ${46 + cuerda * 0.65} 0 ${46 + cuerda}" fill="none" stroke="${e.linea ? '#111' : '#666'}" stroke-width="2.5"/>
      <path d="M-6 50 L6 50 L0 42 Z" fill="${e.f(c)}" stroke="${e.ink}" stroke-width="3" stroke-linejoin="round"/>
      <ellipse cx="0" cy="0" rx="36" ry="44" fill="${e.f(c)}" stroke="${e.ink}" stroke-width="${e.sw}"/>
      ${e.linea ? '' : '<ellipse cx="-12" cy="-16" rx="8" ry="13" fill="#fff" opacity=".45" transform="rotate(20 -12 -16)"/>'}
    </g>`;
  }

  // Poste con dos flechas: el símbolo del canal ("¡Tú eliges!")
  function cartel(o = {}) {
    const e = estilo(o);
    const st = `stroke="${e.ink}" stroke-width="${e.sw}" stroke-linejoin="round"`;
    const iz = o.izquierda || '', de = o.derecha || '';
    const txt = (t, x) => t ? `<text x="${x}" y="-61" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="20" fill="${e.linea ? '#111' : '#fff'}">${t}</text>` : '';
    return `<g transform="${tr(o)}">
      <rect x="-9" y="-110" width="18" height="190" rx="5" fill="${e.f('#B57A45')}" ${st}/>
      <path d="M-12 -92 L-112 -92 L-136 -70 L-112 -48 L-12 -48 Z" fill="${e.f(PALETA.sol)}" ${st}/>
      <path d="M12 -92 L112 -92 L136 -70 L112 -48 L12 -48 Z" fill="${e.f(PALETA.morado)}" ${st}/>
      ${txt(iz, -68)}${txt(de, 68)}
    </g>`;
  }

  function tarta(o = {}) {
    const e = estilo(o);
    const st = `stroke="${e.ink}" stroke-width="${e.sw}" stroke-linejoin="round"`;
    const velas = o.velas == null ? 3 : o.velas;
    const llama = o.llama == null ? 1 : o.llama;
    let v = '';
    const n = Math.max(0, Math.min(velas, 9));
    for (let i = 0; i < n; i++) {
      const x = -((n - 1) * 22) / 2 + i * 22;
      v += `<rect x="${x - 5}" y="-128" width="10" height="38" rx="3" fill="${e.f(i % 2 ? PALETA.cielo : PALETA.rosa)}" ${st}/>`;
      if (llama > 0) v += `<path d="M${x} ${-150 - 6 * llama} C${x + 9} -140 ${x + 7} -130 ${x} -130 C${x - 7} -130 ${x - 9} -140 ${x} ${-150 - 6 * llama} Z" fill="${e.f('#FFB800')}" stroke="${e.linea ? '#111' : '#F07800'}" stroke-width="3" opacity="${llama}"/>`;
    }
    return `<g transform="${tr(o)}">
      ${v}
      <rect x="-120" y="-92" width="240" height="70" rx="16" fill="${e.f('#FFE1EC')}" ${st}/>
      <path d="M-120 -66 C-100 -46 -80 -46 -60 -66 C-40 -46 -20 -46 0 -66 C20 -46 40 -46 60 -66 C80 -46 100 -46 120 -66 L120 -80 L-120 -80 Z" fill="${e.f(PALETA.rosa)}" stroke="none"/>
      <rect x="-150" y="-24" width="300" height="84" rx="18" fill="${e.f('#FFF6D6')}" ${st}/>
      <path d="M-150 4 C-125 28 -100 28 -75 4 C-50 28 -25 28 0 4 C25 28 50 28 75 4 C100 28 125 28 150 4 L150 -10 L-150 -10 Z" fill="${e.f(PALETA.sol)}" stroke="none"/>
      <rect x="-170" y="58" width="340" height="16" rx="8" fill="${e.f('#DDE3F0')}" ${st}/>
    </g>`;
  }

  function colinas(ancho, alto, y, o = {}) {
    const e = estilo(o);
    const st = `stroke="${e.ink}" stroke-width="${e.sw}" stroke-linejoin="round"`;
    return `
      <path d="M0 ${y + 40} C${ancho * 0.2} ${y - 60} ${ancho * 0.45} ${y - 30} ${ancho * 0.6} ${y + 20} C${ancho * 0.75} ${y - 50} ${ancho * 0.92} ${y - 40} ${ancho} ${y} L${ancho} ${alto} L0 ${alto} Z" fill="${e.f(PALETA.hierba)}" ${st}/>
      <path d="M0 ${y + 110} C${ancho * 0.3} ${y + 50} ${ancho * 0.6} ${y + 70} ${ancho} ${y + 90} L${ancho} ${alto} L0 ${alto} Z" fill="${e.f(PALETA.hierbaOscura)}" ${st}/>`;
  }

  function nubeFondo(o = {}) {
    const e = estilo(o);
    return `<g transform="${tr(o)}" opacity="${e.linea ? 1 : 0.95}">
      <path d="M-60 20 C-80 20 -80 -10 -55 -10 C-55 -35 -20 -40 -10 -20 C0 -45 45 -40 45 -12 C70 -14 75 20 55 20 Z" fill="#fff" stroke="${e.linea ? '#111' : '#BFE3F5'}" stroke-width="${e.sw * 0.8}" stroke-linejoin="round"/>
    </g>`;
  }

  // Fuentes incrustadas (Fredoka, licencia OFL) para que todo renderice sin red.
  function cssFuentes(base64PorPeso) {
    return Object.entries(base64PorPeso).map(([peso, b64]) =>
      `@font-face{font-family:'Fredoka';font-weight:${peso};src:url(data:font/woff2;base64,${b64}) format('woff2');}`).join('\n');
  }

  const TyN = { PALETA, ANIMO_NUBA, defs, tilo, nuba, arbol, flor, sol, estrella, globo, cartel, tarta, colinas, nubeFondo, cssFuentes };
  if (typeof module !== 'undefined' && module.exports) module.exports = TyN;
  else root.TyN = TyN;
})(typeof window !== 'undefined' ? window : globalThis);
