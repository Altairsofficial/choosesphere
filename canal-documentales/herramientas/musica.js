// Fondo musical ambiental generado por código (sin derechos de terceros).
// Sustitúyelo por una pista de la Biblioteca de audio de YouTube con: montar.js --musica pista.mp3
const fs = require('fs');

const SR = 44100;
const f = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
// La menor - Fa - Do - Sol, en voces graves y oscuras (notas MIDI)
const ACORDES = [[45, 57, 60, 64], [41, 57, 60, 65], [48, 55, 60, 64], [43, 55, 59, 62]];

function musicaAmbiente(ruta, segundos, { compas = 8 } = {}) {
  const n = Math.ceil(segundos * SR), buf = new Float32Array(n);
  const fundido = 2.5; // cada acorde entra y sale lentamente
  for (let k = 0; k * compas < segundos + compas; k++) {
    const t0 = k * compas, notas = ACORDES[k % ACORDES.length];
    const i0 = Math.max(0, Math.floor((t0 - fundido) * SR)), i1 = Math.min(n, Math.floor((t0 + compas + fundido) * SR));
    for (const [j, m] of notas.entries()) {
      const fr = f(m), vol = j === 0 ? 0.22 : 0.09, det = 1 + (j % 2 ? 0.0015 : -0.0015);
      for (let i = i0; i < i1; i++) {
        const t = i / SR, lt = t - (t0 - fundido);
        const env = Math.min(1, lt / (fundido * 2)) * Math.min(1, (t0 + compas + fundido - t) / (fundido * 2));
        const trem = 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.11 * t + j);
        buf[i] += vol * env * trem * (Math.sin(2 * Math.PI * fr * t) + 0.25 * Math.sin(2 * Math.PI * fr * det * 2 * t));
      }
    }
  }
  // Paso bajo simple para suavizar
  let y = 0, pico = 0;
  for (let i = 0; i < n; i++) { y += 0.08 * (buf[i] - y); buf[i] = y; pico = Math.max(pico, Math.abs(y)); }
  const g = pico ? 0.7 / pico : 1, out = Buffer.alloc(44 + n * 2);
  out.write('RIFF', 0); out.writeUInt32LE(36 + n * 2, 4); out.write('WAVEfmt ', 8); out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28);
  out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i] * g)) * 32767), 44 + i * 2);
  fs.writeFileSync(ruta, out);
  return ruta;
}

module.exports = { musicaAmbiente };
