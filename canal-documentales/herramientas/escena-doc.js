/* Motor gráfico de los documentales (se ejecuta dentro de Chromium).
 * window.render(escena, t, dur) dibuja el fotograma del segundo t de una escena.
 * Necesita d3 (d3-array + d3-geo), topojson y window.MUNDO (TopoJSON de world-atlas).
 */
(function () {
  const W = 1920, H = 1080;
  const C = { fondo: '#0D1015', texto: '#F3EFE6', suave: '#9AA3AE', ambar: '#F2A33A', rojo: '#E5484D', tierra: '#1E252E', borde: '#3A4552', mar: '#0A0D12' };
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const fase = (t, a, b) => clamp((t - a) / (b - a));
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const out = (x) => 1 - Math.pow(1 - x, 3);
  const lerp = (a, b, x) => a + (b - a) * x;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const lienzo = () => document.getElementById('lienzo');

  const paises = topojson.feature(window.MUNDO, window.MUNDO.objects.countries).features;

  function marco(contenido, t) {
    // Viñeta y grano sutil: dan textura de documental a los fondos lisos
    const grano = `<filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".9" seed="${Math.floor(t * 12)}" numOctaves="2"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .05 0"/></filter>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <defs>${grano}<radialGradient id="v" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".65"/></radialGradient></defs>
      <rect width="${W}" height="${H}" fill="${C.fondo}"/>${contenido}
      <rect width="${W}" height="${H}" fill="url(#v)"/><rect width="${W}" height="${H}" filter="url(#g)"/></svg>`;
  }

  function partir(texto, max) {
    const ps = String(texto).split(/\s+/), l = []; let a = '';
    for (const p of ps) { if ((a + ' ' + p).trim().length > max && a) { l.push(a); a = p; } else a = (a + ' ' + p).trim(); }
    if (a) l.push(a);
    return l;
  }

  const R = {};

  R.titulo = (e, t) => {
    const a = out(fase(t, 0.2, 1.2)), b = out(fase(t, 0.8, 1.8)), lin = ease(fase(t, 0.5, 1.6));
    const size = e.texto.length > 22 ? 96 : 124;
    return marco(`
      <text x="${W / 2}" y="${H / 2 - 10 + (1 - a) * 30}" text-anchor="middle" font-family="Inter Display, Inter" font-weight="700" font-size="${size}" fill="${C.texto}" opacity="${a}" letter-spacing="-2">${esc(e.texto)}</text>
      <rect x="${W / 2 - 260 * lin}" y="${H / 2 + 40}" width="${520 * lin}" height="4" fill="${C.ambar}"/>
      ${e.subtexto ? `<text x="${W / 2}" y="${H / 2 + 120}" text-anchor="middle" font-family="Inter" font-weight="500" font-size="48" fill="${C.ambar}" opacity="${b}" letter-spacing="4">${esc(e.subtexto.toUpperCase())}</text>` : ''}`, t);
  };

  R.dato = (e, t) => {
    const a = out(fase(t, 0.1, 1.6)), b = out(fase(t, 1.0, 2.0));
    // Cuenta progresiva si la cifra es numérica ("20 000", "+23 000", "10 %", "75 000")
    const m = /^([^\d]*)(\d(?:[\d\s.,]*\d)?)(.*)$/.exec(e.cifra);
    let cifra = e.cifra;
    if (m) {
      const n = parseFloat(m[2].replace(/[\s.]/g, '').replace(',', '.'));
      if (!isNaN(n)) cifra = m[1] + Math.round(n * a).toLocaleString('es-ES').replace(/\./g, ' ') + m[3];
    }
    const lineas = partir(e.texto, 46);
    return marco(`
      <text x="${W / 2}" y="${H / 2 + 20}" text-anchor="middle" font-family="Inter Display, Inter" font-weight="800" font-size="230" fill="${C.ambar}" letter-spacing="-6">${esc(cifra)}</text>
      ${lineas.map((l, i) => `<text x="${W / 2}" y="${H / 2 + 140 + i * 62}" text-anchor="middle" font-family="Inter" font-weight="500" font-size="50" fill="${C.texto}" opacity="${b}">${esc(l)}</text>`).join('')}`, t);
  };

  R.cita = (e, t) => {
    const lineas = partir(`«${e.texto}»`, 38);
    const a = out(fase(t, 0.2, 1.4)), b = out(fase(t, 1.2, 2.2));
    const y0 = H / 2 - (lineas.length - 1) * 42 - 20;
    return marco(`
      <text x="230" y="${y0 - 40}" font-family="Georgia, serif" font-size="260" fill="${C.ambar}" opacity="${0.35 * a}">“</text>
      ${lineas.map((l, i) => `<text x="${W / 2}" y="${y0 + i * 84}" text-anchor="middle" font-family="Georgia, 'DejaVu Serif', serif" font-style="italic" font-size="68" fill="${C.texto}" opacity="${a}">${esc(l)}</text>`).join('')}
      <text x="${W / 2}" y="${y0 + lineas.length * 84 + 50}" text-anchor="middle" font-family="Inter" font-weight="500" font-size="34" fill="${C.suave}" opacity="${b}">— ${esc(e.autor || '')}</text>`, t);
  };

  R.linea_tiempo = (e, t, dur) => {
    const ev = e.eventos || [], n = ev.length;
    const x0 = 220, x1 = W - 220, y = H / 2 + 40;
    const lin = ease(fase(t, 0.3, 1.5));
    const paso = (dur - 2) / Math.max(1, n); // cada evento aparece a lo largo de la locución
    let g = `<text x="${W / 2}" y="210" text-anchor="middle" font-family="Inter Display, Inter" font-weight="700" font-size="64" fill="${C.texto}" opacity="${out(fase(t, 0, 0.8))}">${esc(e.titulo || '')}</text>
      <rect x="${x0}" y="${y - 2}" width="${(x1 - x0) * lin}" height="4" fill="${C.borde}"/>`;
    ev.forEach((v, i) => {
      const x = n === 1 ? W / 2 : x0 + ((x1 - x0) * i) / (n - 1);
      const a = out(fase(t, 1 + i * paso, 1.6 + i * paso));
      const activo = t >= 1 + i * paso && (i === n - 1 || t < 1 + (i + 1) * paso);
      const lineas = partir(v.texto, 22);
      g += `<g opacity="${a}">
        <circle cx="${x}" cy="${y}" r="${activo ? 18 : 12}" fill="${activo ? C.ambar : C.texto}"/>
        <text x="${x}" y="${y - 50}" text-anchor="middle" font-family="Inter Display, Inter" font-weight="700" font-size="54" fill="${activo ? C.ambar : C.texto}">${esc(v.hora)}</text>
        ${lineas.map((l, k) => `<text x="${x}" y="${y + 70 + k * 44}" text-anchor="middle" font-family="Inter" font-size="36" fill="${C.suave}">${esc(l)}</text>`).join('')}
      </g>`;
    });
    return marco(g, t);
  };

  R.mapa = (e, t, dur) => {
    const L = e.lugar, S = e.secundario;
    // De la vista continental a la vista local en ~5 s
    const z = ease(fase(t, 0.4, 5.0));
    const lon = lerp(-70, S ? (L.lon + S.lon) / 2 : L.lon, z);
    const lat = lerp(-5, S ? (L.lat + S.lat) / 2 : L.lat, z);
    const escala = Math.exp(lerp(Math.log(900), Math.log(S ? 30000 : 22000), z));
    const proj = d3.geoMercator().center([lon, lat]).scale(escala).translate([W / 2, H / 2]);
    const ruta = d3.geoPath(proj);
    const punto = [L.lon, L.lat];
    let g = `<rect width="${W}" height="${H}" fill="${C.mar}"/>`;
    for (const f of paises) {
      const dentro = d3.geoContains(f, punto);
      g += `<path d="${ruta(f) || ''}" fill="${dentro ? '#3B3222' : C.tierra}" stroke="${dentro ? C.ambar : C.borde}" stroke-width="${dentro ? 2.5 : 1.2}"/>`;
    }
    const [px, py] = proj(punto);
    const etiqueta = (x, y, txt, col, a) => `<g opacity="${a}"><rect x="${x + 26}" y="${y - 30}" width="${txt.length * 21 + 30}" height="58" rx="6" fill="#000" opacity=".6"/>
      <text x="${x + 41}" y="${y + 10}" font-family="Inter" font-weight="600" font-size="36" fill="${col}">${esc(txt)}</text></g>`;
    if (S) {
      const [sx, sy] = proj([S.lon, S.lat]);
      const a = out(fase(t, 4.2, 5.2));
      if (e.trayecto) {
        const k = ease(fase(t, 5.0, Math.min(dur - 1, 12)));
        g += `<line x1="${sx}" y1="${sy}" x2="${sx + (px - sx) * k}" y2="${sy + (py - sy) * k}" stroke="${C.rojo}" stroke-width="10" stroke-linecap="round" stroke-dasharray="2 18" opacity="${a}"/>`;
      }
      g += `<path d="M${sx} ${sy - 26} L${sx + 24} ${sy + 16} L${sx - 24} ${sy + 16} Z" fill="${C.texto}" opacity="${a}"/>` + etiqueta(sx - 40 - S.nombre.length * 21 - 70, sy, S.nombre, C.texto, a);
    }
    // Referencias para orientarse (p. ej. la capital) y barra de escala
    for (const r of e.referencias || []) {
      const [rx, ry] = proj([r.lon, r.lat]); const a = out(fase(t, 4.4, 5.4));
      g += `<circle cx="${rx}" cy="${ry}" r="9" fill="${C.suave}" opacity="${a}"/>` + etiqueta(rx - 10, ry, r.nombre, C.suave, a * 0.9);
    }
    const km = 50, px50 = (km / 6371) * escala / Math.cos((lat * Math.PI) / 180), ab = out(fase(t, 4.6, 5.6));
    if (px50 > 40 && px50 < 900) g += `<g opacity="${ab}"><rect x="100" y="${H - 120}" width="${px50}" height="8" fill="${C.texto}"/><text x="100" y="${H - 135}" font-family="Inter" font-size="30" fill="${C.texto}">${km} km</text></g>`;
    const ap = out(fase(t, 3.6, 4.6)), pulso = (t * 0.8) % 1;
    g += `<circle cx="${px}" cy="${py}" r="${14 + pulso * 50}" fill="none" stroke="${C.ambar}" stroke-width="4" opacity="${ap * (1 - pulso)}"/>
      <circle cx="${px}" cy="${py}" r="14" fill="${C.ambar}" opacity="${ap}"/>` + etiqueta(px, py, L.nombre, C.ambar, ap);
    return marco(g, t);
  };

  // Rótulo inferior para las escenas de imagen (se superpone con transparencia)
  window.pie = (texto, credito) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></linearGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#s)"/>
      ${texto ? `<rect x="90" y="${H - 170}" width="6" height="58" fill="${C.ambar}"/><text x="116" y="${H - 125}" font-family="Inter" font-weight="600" font-size="44" fill="${C.texto}">${esc(texto)}</text>` : ''}
      ${credito ? `<text x="${W - 60}" y="${H - 40}" text-anchor="end" font-family="Inter" font-size="20" fill="#fff" opacity=".7">${esc(credito)}</text>` : ''}</svg>`;

  window.render = (e, t, dur) => {
    const fn = R[e.tipo] || R.titulo;
    lienzo().innerHTML = fn(e.tipo in R ? e : { texto: e.pie || '', subtexto: '' }, t, dur);
  };
  window.htmlCrudo = (svg) => { lienzo().innerHTML = svg; };
})();
