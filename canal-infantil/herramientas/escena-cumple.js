/* Escena animada del vídeo de cumpleaños (se ejecuta dentro de Chromium).
 * window.render(t) dibuja el fotograma del segundo t. Todo es determinista:
 * el mismo nombre produce siempre el mismo vídeo.
 * Requiere window.TyN (personajes.js) y window.DATOS = { nombre, edad, mensaje, tiempos }.
 */
(function () {
  const W = 1080, H = 1920;
  const { TyN } = window;
  const P = TyN.PALETA;
  const D = window.DATOS;
  const T = D.tiempos;

  const clamp = (x) => Math.max(0, Math.min(1, x));
  const fase = (t, a, b) => clamp((t - a) / (b - a));
  const outBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const outCubic = (x) => 1 - Math.pow(1 - x, 3);
  const lerp = (a, b, x) => a + (b - a) * x;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Semilla fija -> confeti y globos siempre iguales
  let semilla = 42;
  const rnd = () => ((semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648);
  const COLORES = [P.rosa, P.sol, P.morado, P.cielo, P.bufanda, P.naranja, '#FF6B6B'];
  const confeti = Array.from({ length: 110 }, () => ({
    x: rnd() * W, d: rnd() * 0.7, vy: 420 + rnd() * 520, amp: 15 + rnd() * 50, f: 1 + rnd() * 2.5,
    rot: rnd() * 360, vr: (rnd() - 0.5) * 720, c: COLORES[Math.floor(rnd() * COLORES.length)], forma: rnd() < 0.6 ? 'r' : 'c',
  }));
  const globos = Array.from({ length: 7 }, (_, i) => ({ x: 80 + i * 150 + rnd() * 40, off: rnd() * 9, c: COLORES[i % COLORES.length], s: 0.9 + rnd() * 0.5 }));

  function rotulo(texto, x, y, size, fill, extra = '') {
    const b = `x="${x}" y="${y}" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="${size}" ${extra}`;
    return `<text ${b} fill="none" stroke="${P.tinta}" stroke-width="${size * 0.2}" stroke-linejoin="round">${texto}</text>
      <text ${b} fill="none" stroke="#fff" stroke-width="${size * 0.1}" stroke-linejoin="round">${texto}</text>
      <text ${b} fill="${fill}">${texto}</text>`;
  }
  const escalaEn = (x, y, s, g) => `<g transform="translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})">${g}</g>`;

  function partirLineas(texto, max) {
    const palabras = texto.split(/\s+/); const lineas = []; let l = '';
    for (const p of palabras) { if ((l + ' ' + p).trim().length > max && l) { lineas.push(l); l = p; } else l = (l + ' ' + p).trim(); }
    if (l) lineas.push(l);
    return lineas.slice(0, 3);
  }

  function pastilla(lineas, y, alfa = 1, color = P.morado) {
    const size = lineas.length > 1 ? 50 : 60, alto = 60 + lineas.length * size * 1.2;
    const ytxt = y - alto / 2 + 30 + size;
    return `<g opacity="${alfa}"><rect x="70" y="${y - alto / 2}" width="${W - 140}" height="${alto}" rx="${Math.min(60, alto / 2)}" fill="${color}" stroke="${P.tinta}" stroke-width="8"/>
      ${lineas.map((l, i) => `<text x="${W / 2}" y="${ytxt + i * size * 1.2 - 8}" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="${size}" fill="#fff">${esc(l)}</text>`).join('')}</g>`;
  }

  const nombre = D.nombre;
  const tamNombre = Math.min(180, Math.floor(1650 / Math.max(4, nombre.length + 2)));
  const anios = `${D.edad} ${Number(D.edad) === 1 ? 'año' : 'años'}`;
  // Frases de la canción en pulsos: [inicio, fin, texto]
  const FRASES = [[0, 6, 'Cumpleaños feliz'], [6, 12, 'te deseamos a ti'], [12, 18, `¡Feliz cumple, ${nombre}!`], [18, 25, 'cumpleaños feliz']];
  const ANIMOS = ['feliz', 'alegre', 'arcoiris', 'calma'];

  window.render = function (t) {
    const pulsoN = (t - T.inicio) / T.pulso; // pulsos desde que empieza la canción
    const enCancion = t >= T.inicio && t < T.finCancion;
    const golpe = enCancion ? Math.exp(-((pulsoN % 1 + 1) % 1) * 5) : 0;
    const parpadeo = (t % 3.3) < 0.12 ? 1 : 0;
    let g = `<rect width="${W}" height="${H}" fill="url(#tyn-cielo)"/>`;

    // Sol girando y nubes de fondo
    g += `<g transform="translate(930 230) rotate(${t * 12})">${TyN.sol({ s: 1.3 })}</g>`;
    g += TyN.nubeFondo({ x: ((t * 30 + 200) % 1400) - 150, y: 190, s: 1.6 });
    g += TyN.nubeFondo({ x: ((t * 18 + 900) % 1400) - 150, y: 700, s: 1.1 });

    // Globos subiendo
    for (const b of globos) {
      const per = 9, y = 2150 - (((t + b.off) % per) / per) * 2600;
      g += TyN.globo({ x: b.x + Math.sin(t * 1.3 + b.off) * 25, y, s: b.s, color: b.c });
    }
    g += TyN.colinas(W, H, 1520);
    g += TyN.flor({ x: 110, y: 1750, s: 2.2 }) + TyN.flor({ x: 980, y: 1770, s: 2.2, color: P.sol }) + TyN.flor({ x: 860, y: 1840, s: 1.8, color: P.morado });

    // ---- Personajes y tarta
    const fiesta = t >= T.finCancion; // tras la canción: tarta en el centro
    const desplaza = outCubic(fase(t, T.finCancion, T.finCancion + 0.8));
    // Tilo
    const tiloEntrada = outBack(fase(t, 1.0, 1.9));
    let tx = lerp(390, 200, desplaza), ty = lerp(2200, 1290, tiloEntrada);
    let tr = 0, brazo = 'saluda', exp = 'feliz';
    if (enCancion) { ty += -Math.abs(Math.sin(Math.PI * pulsoN)) * 22; tr = 5 * Math.sin(Math.PI * pulsoN); brazo = Math.floor(pulsoN) % 2 ? 'arriba' : 'saluda'; exp = 'risa'; }
    if (fiesta) { exp = t < T.soplo + 0.2 ? 'sorpresa' : 'risa'; brazo = t < T.soplo + 0.2 ? 'abajo' : 'arriba'; ty -= t > T.soplo + 0.2 ? Math.abs(Math.sin(t * 6)) * 25 : 0; }
    // Nuba
    const nubaEntrada = outBack(fase(t, 0.3, 1.5));
    let nx = lerp(1400, 760, nubaEntrada), ny = 960 + Math.sin(t * 2) * 18;
    nx = lerp(nx, 880, desplaza); ny = lerp(ny, 1000, desplaza);
    let animo = 'normal';
    if (enCancion) { const fr = FRASES.findIndex(([a, b]) => pulsoN >= a && pulsoN < b); animo = ANIMOS[Math.max(0, fr)]; }
    if (fiesta) animo = t > T.soplo + 0.2 ? 'arcoiris' : 'alegre';

    // Tarta
    if (fiesta) {
      const subida = outBack(fase(t, T.finCancion + 0.2, T.finCancion + 1.1));
      const llama = 1 - fase(t, T.soplo + 0.15, T.soplo + 0.45);
      const parpLlama = 0.9 + 0.1 * Math.sin(t * 30);
      g += TyN.tarta({ x: 560, y: lerp(2300, 1460, subida), s: 1.5, velas: Number(D.edad) || 1, llama: llama * parpLlama });
    }
    g += TyN.nuba({ x: nx, y: ny, s: 1.7, animo, expresion: fiesta && t < T.soplo + 0.2 ? 'sorpresa' : 'risa', parpadeo: enCancion ? 0 : parpadeo });
    g += TyN.tilo({ x: tx, y: ty, s: 2.6, r: tr, brazo, expresion: exp, parpadeo: exp === 'risa' ? 0 : parpadeo, id: 'v' });

    // ---- Textos superiores
    if (t < 3.0) {
      const a = fase(t, 0.4, 1.0) * (1 - fase(t, 2.5, 3.0));
      g += `<g opacity="${a}">${rotulo('¡Hoy es un día', W / 2, 360, 100, P.sol)}${rotulo('muy especial!', W / 2, 490, 100, P.sol)}</g>`;
    } else if (t < T.fin) {
      const aparece = outBack(fase(t, 3.0, 3.6));
      const resalto = enCancion && pulsoN >= 12 && pulsoN < 18 ? 0.08 : 0;
      g += escalaEn(W / 2, 330, aparece, rotulo('¡Feliz cumpleaños!', W / 2, 330, 104, P.naranja));
      g += escalaEn(W / 2, 500, aparece * (1 + golpe * (0.05 + resalto)), rotulo(esc(nombre), W / 2, 540, tamNombre, '#4FB8F5'));
      if (fiesta) {
        const s = outBack(fase(t, T.finCancion + 0.4, T.finCancion + 1.0));
        g += escalaEn(W / 2, 680, s, rotulo(`¡Ya tienes ${anios}!`, W / 2, 700, 84, P.sol));
      }
    } else {
      const s = outBack(fase(t, T.fin, T.fin + 0.6));
      g += escalaEn(W / 2, 450, s, `${rotulo(`<tspan fill="${P.naranja}">Tilo</tspan> <tspan fill="${P.tinta}">y</tspan> <tspan fill="#4FB8F5">Nuba</tspan>`, W / 2, 440, 150, '#fff')}
        <rect x="${W / 2 - 200}" y="500" width="400" height="90" rx="45" fill="${P.morado}" stroke="${P.tinta}" stroke-width="8"/>
        <text x="${W / 2}" y="563" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="56" fill="${P.sol}">¡Tú eliges!</text>`);
    }

    // ---- Cuenta atrás 3-2-1
    if (t >= T.cuenta && t < T.soplo) {
      const k = Math.min(2, Math.floor((t - T.cuenta) / 0.6));
      const local = (t - T.cuenta - k * 0.6) / 0.6;
      g += escalaEn(W / 2, 960, outBack(clamp(local * 2.5)), rotulo(String(3 - k), W / 2, 1010, 200, P.rosa));
    }

    // ---- Pastilla inferior (letra de la canción / mensajes)
    let lineas = null, color = P.morado;
    if (enCancion) { const fr = FRASES.find(([a, b]) => pulsoN >= a - 0.3 && pulsoN < b - 0.3); if (fr) lineas = partirLineas(fr[2], 22); }
    else if (t >= T.finCancion && t < T.soplo + 0.3) { lineas = ['¡Sopla las velas!']; color = P.naranja; }
    else if (t >= T.soplo + 0.6 && t < T.fin) { lineas = partirLineas(D.mensaje, 26); color = P.bufanda; }
    if (lineas) g += pastilla(lineas, 1700, 1, color);
    if (t >= T.soplo + 1.2 && t < T.fin) g += `<text x="${W / 2}" y="${1700 + 140}" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="40" fill="${P.tinta}" opacity="${fase(t, T.soplo + 1.2, T.soplo + 1.6)}">Con cariño, Tilo y Nuba</text>`;

    // ---- Confeti
    if (t >= T.soplo + 0.4) {
      const tc = t - (T.soplo + 0.4);
      for (const c of confeti) {
        const lt = tc - c.d; if (lt < 0) continue;
        const y = -40 + c.vy * lt; if (y > H + 40) continue;
        const x = c.x + Math.sin(lt * c.f * 3) * c.amp;
        g += c.forma === 'r'
          ? `<rect x="-11" y="-6" width="22" height="12" rx="3" fill="${c.c}" transform="translate(${x} ${y}) rotate(${c.rot + c.vr * lt})"/>`
          : `<circle cx="${x}" cy="${y}" r="8" fill="${c.c}"/>`;
      }
    }

    // Fundidos de entrada y salida
    const blanco = Math.max(1 - fase(t, 0, 0.35), fase(t, T.duracion - 0.45, T.duracion));
    if (blanco > 0) g += `<rect width="${W}" height="${H}" fill="#fff" opacity="${blanco}"/>`;

    document.getElementById('lienzo').innerHTML =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${TyN.defs()}${g}</svg>`;
  };
})();
