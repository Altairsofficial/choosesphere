// Sintetizador mínimo (sin dependencias) para la banda sonora de los vídeos.
// "Cumpleaños feliz" (Happy Birthday / Good Morning to All) es de dominio público
// en la UE desde 2017 y en EE. UU. desde la sentencia de 2015-2016.
const fs = require('fs');

const SR = 44100;
const NOTAS = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
function hz(n) { // 'C5', 'G4', 'F#4'
  const m = /^([A-G])(#?)(\d)$/.exec(n);
  const semis = NOTAS[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * Math.pow(2, semis / 12);
}

class Mezcla {
  constructor(segundos) { this.buf = new Float32Array(Math.ceil(segundos * SR)); }
  // Timbre de caja de música / celesta: armónicos con caída exponencial.
  campana(t0, nota, dur, vol = 0.3) {
    const f = typeof nota === 'number' ? nota : hz(nota);
    const n0 = Math.floor(t0 * SR), len = Math.floor(Math.min(dur + 1.2, 3) * SR);
    for (let i = 0; i < len && n0 + i < this.buf.length; i++) {
      const t = i / SR;
      const ataque = Math.min(1, t / 0.006);
      const caida = Math.exp(-t * (2.2 + 1.5 / Math.max(dur, 0.2)));
      const corte = t > dur + 0.9 ? Math.max(0, 1 - (t - dur - 0.9) / 0.3) : 1;
      const s = Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(2 * Math.PI * 2 * f * t) * Math.exp(-t * 4)
        + 0.12 * Math.sin(2 * Math.PI * 4.2 * f * t) * Math.exp(-t * 9);
      this.buf[n0 + i] += s * ataque * caida * corte * vol;
    }
  }
  // Bajo suave (triangular)
  bajo(t0, nota, dur, vol = 0.22) {
    const f = hz(nota);
    const n0 = Math.floor(t0 * SR), len = Math.floor(dur * SR);
    for (let i = 0; i < len && n0 + i < this.buf.length; i++) {
      const t = i / SR, fase = (f * t) % 1;
      const tri = 4 * Math.abs(fase - 0.5) - 1;
      const env = Math.min(1, t / 0.01) * Math.exp(-t * 2.5) * Math.min(1, (dur - t) / 0.05);
      this.buf[n0 + i] += tri * env * vol;
    }
  }
  // Soplido / "fiuuu" (ruido filtrado)
  soplido(t0, dur = 0.7, vol = 0.25) {
    let y = 0, s = 12345;
    const n0 = Math.floor(t0 * SR), len = Math.floor(dur * SR);
    for (let i = 0; i < len && n0 + i < this.buf.length; i++) {
      s = (s * 1103515245 + 12345) % 2147483648;
      const r = s / 1073741824 - 1, t = i / SR;
      const a = 0.04 + 0.25 * (1 - t / dur);
      y += a * (r - y);
      this.buf[n0 + i] += y * Math.sin(Math.PI * t / dur) * vol * 3;
    }
  }
  // "Pop" de confeti
  pop(t0, vol = 0.25) {
    const n0 = Math.floor(t0 * SR), len = Math.floor(0.12 * SR);
    for (let i = 0; i < len && n0 + i < this.buf.length; i++) {
      const t = i / SR, f = 900 - t * 5000;
      this.buf[n0 + i] += Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 40) * vol;
    }
  }
  wav(ruta) {
    let pico = 0;
    for (const v of this.buf) pico = Math.max(pico, Math.abs(v));
    const g = pico > 0 ? 0.89 / pico : 1; // normaliza a ~ -1 dBFS
    const n = this.buf.length, out = Buffer.alloc(44 + n * 2);
    out.write('RIFF', 0); out.writeUInt32LE(36 + n * 2, 4); out.write('WAVEfmt ', 8);
    out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22);
    out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34);
    out.write('data', 36); out.writeUInt32LE(n * 2, 40);
    for (let i = 0; i < n; i++) out.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(this.buf[i] * g * 32767))), 44 + i * 2);
    fs.writeFileSync(ruta, out);
  }
}

// Melodía en Do mayor, compás 3/4. [nota, duración en pulsos]
const CUMPLE = [
  ['G4', 0.75], ['G4', 0.25],
  ['A4', 1], ['G4', 1], ['C5', 1],
  ['B4', 2], ['G4', 0.75], ['G4', 0.25],
  ['A4', 1], ['G4', 1], ['D5', 1],
  ['C5', 2], ['G4', 0.75], ['G4', 0.25],
  ['G5', 1], ['E5', 1], ['C5', 1],
  ['B4', 1], ['A4', 1], ['F5', 0.75], ['F5', 0.25],
  ['E5', 1], ['C5', 1], ['D5', 1],
  ['C5', 3],
];
// Acordes por compás (el compás 1 empieza en el pulso 1, tras la anacrusa)
const ACORDES = [['C3', 'E4', 'G4'], ['G2', 'D4', 'F4'], ['G2', 'B3', 'F4'], ['C3', 'E4', 'G4'], ['F2', 'A3', 'C4'], ['C3', 'E4', 'G4'], ['G2', 'B3', 'F4'], ['C3', 'E4', 'G4']];

/**
 * Crea la banda sonora del vídeo de cumpleaños y devuelve los tiempos clave
 * para sincronizar la animación.
 */
function bandaSonoraCumple(ruta, { duracion = 24, inicio = 3, bpm = 104 } = {}) {
  const m = new Mezcla(duracion);
  const pulso = 60 / bpm;
  // Intro mágica
  ['C5', 'E5', 'G5', 'C6', 'E6'].forEach((n, i) => m.campana(0.25 + i * 0.16, n, 0.5, 0.18));
  m.campana(1.2, 'G6', 1.2, 0.08);
  // Canción
  let b = 0;
  for (const [n, d] of CUMPLE) { m.campana(inicio + b * pulso, n, d * pulso, 0.34); b += d; }
  ACORDES.forEach((ac, compas) => {
    const t = inicio + (1 + compas * 3) * pulso;
    m.bajo(t, ac[0], pulso * 0.95, 0.24);
    if (compas < 7) for (const k of [1, 2]) { m.campana(t + k * pulso, ac[1], pulso * 0.6, 0.06); m.campana(t + k * pulso, ac[2], pulso * 0.6, 0.06); }
    else { m.campana(t, ac[1], 2, 0.07); m.campana(t, ac[2], 2, 0.07); }
  });
  const finCancion = inicio + b * pulso;
  // Cuenta atrás 3-2-1, soplido y fiesta
  const cuenta = finCancion + 0.9;
  [0, 0.6, 1.2].forEach((dt, i) => m.campana(cuenta + dt, ['E5', 'E5', 'E5'][i], 0.2, 0.16));
  const soplo = cuenta + 1.8;
  m.soplido(soplo, 0.7);
  for (let i = 0; i < 6; i++) m.pop(soplo + 0.55 + i * 0.09 + (i % 2) * 0.03, 0.18);
  ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => m.campana(soplo + 0.7 + i * 0.12, n, 0.6, 0.2));
  // Sintonía final "¡Tú e-li-ges!"
  const fin = duracion - 2.6;
  [['G5', 0], ['E5', 0.22], ['A5', 0.44], ['C6', 0.7]].forEach(([n, dt]) => m.campana(fin + dt, n, 0.8, 0.22));
  m.wav(ruta);
  return { pulso, inicio, finCancion, cuenta, soplo, fin, duracion };
}

module.exports = { Mezcla, hz, bandaSonoraCumple, SR };
