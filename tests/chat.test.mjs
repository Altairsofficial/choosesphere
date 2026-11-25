// Pruebas sin red de la función del chat (node --test tests/).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import Anthropic from "@anthropic-ai/sdk";

import { crearManejador, sanearMensajes, validarSolicitud } from "../netlify/functions/chat/chat.mjs";
import { INSTRUCCIONES, PRECIOS } from "../netlify/functions/chat/conocimiento.mjs";

const SITIO = "https://agencia.test";
const ENV = { ANTHROPIC_API_KEY: "sk-ant-prueba" };

// ---------------------------------------------------------------- dobles de prueba
const delta = (text) => ({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text } });

function respuestaTexto(texto, stop_reason = "end_turn") {
  return () => ({
    async *[Symbol.asyncIterator]() {
      for (const trozo of texto.match(/.{1,8}/gs) || []) yield delta(trozo);
    },
    async finalMessage() {
      return { role: "assistant", content: [{ type: "text", text: texto }], stop_reason };
    },
  });
}

function respuestaHerramienta(input) {
  return () => ({
    async *[Symbol.asyncIterator]() {
      yield delta("Lo registro ahora. ");
    },
    async finalMessage() {
      return {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "", signature: "firma" },
          { type: "text", text: "Lo registro ahora. " },
          { type: "tool_use", id: "toolu_1", name: "registrar_solicitud", input },
        ],
        stop_reason: "tool_use",
      };
    },
  });
}

function respuestaQueFalla(error, { conTexto = false } = {}) {
  return () => ({
    async *[Symbol.asyncIterator]() {
      if (conTexto) yield delta("texto a medias");
      throw error;
    },
    async finalMessage() {
      throw error;
    },
  });
}

function clienteFalso(respuestas) {
  const llamadas = [];
  return {
    llamadas,
    crear: () => ({
      beta: {
        messages: {
          stream(params) {
            llamadas.push(structuredClone(params));
            return respuestas.shift()(params);
          },
        },
      },
    }),
  };
}

function fetchFalso(estado = 200) {
  const envios = [];
  const fn = async (url, opciones) => {
    envios.push({ url, opciones, campos: Object.fromEntries(new URLSearchParams(opciones.body)) });
    return { status: estado };
  };
  fn.envios = envios;
  return fn;
}

function peticion(messages, { origen = SITIO, metodo = "POST" } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (origen) headers.Origin = origen;
  return new Request(`${SITIO}/api/chat`, {
    method: metodo,
    headers,
    body: metodo === "POST" ? JSON.stringify({ messages }) : undefined,
  });
}

async function eventos(respuesta) {
  const texto = await respuesta.text();
  return texto.split("\n\n").filter(Boolean).map((l) => JSON.parse(l.replace(/^data: /, "")));
}

const textoDe = (evs) => evs.filter((e) => e.type === "text").map((e) => e.text).join("");

const SOLICITUD = {
  nombre: "Ana", empresa: "Clínica Ejemplo SL", email: "ana@ejemplo.es", sector: "Clínica / salud",
  tamano: "10–49", pack: "Crecimiento", proceso: "Citas por WhatsApp", consentimiento: true,
};

// ---------------------------------------------------------------- pruebas
test("GET indica si el chat está configurado", async () => {
  const sin = crearManejador({ env: {} });
  assert.deepEqual(await (await sin(peticion(null, { metodo: "GET" }))).json(), { activo: false });
  const con = crearManejador({ env: ENV });
  assert.deepEqual(await (await con(peticion(null, { metodo: "GET" }))).json(), { activo: true });
});

test("rechaza peticiones sin origen o desde otro sitio", async () => {
  const m = crearManejador({ env: ENV });
  const msgs = [{ role: "user", content: "hola" }];
  assert.equal((await m(peticion(msgs, { origen: null }))).status, 403);
  assert.equal((await m(peticion(msgs, { origen: "https://otro.test" }))).status, 403);
});

test("sin clave de API responde 503 y no llama al modelo", async () => {
  const c = clienteFalso([]);
  const m = crearManejador({ env: {}, crearCliente: c.crear });
  assert.equal((await m(peticion([{ role: "user", content: "hola" }]))).status, 503);
  assert.equal(c.llamadas.length, 0);
});

test("rechaza historiales no válidos", async () => {
  const m = crearManejador({ env: ENV, crearCliente: clienteFalso([]).crear });
  assert.equal((await m(peticion("hola"))).status, 400);
  assert.equal((await m(peticion([{ role: "assistant", content: "hola" }]))).status, 400);
  assert.equal((await m(peticion([{ role: "user", content: "x".repeat(2000) }, { role: "assistant", content: "y".repeat(2000) }].concat(
    Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "z".repeat(1999) })))))).status, 400);
});

test("sanearMensajes une turnos seguidos, quita el saludo inicial y recorta", () => {
  const r = sanearMensajes([
    { role: "assistant", content: "¡Hola! Soy el asistente" },
    { role: "user", content: " a " },
    { role: "user", content: "b" },
    { role: "assistant", content: "c" },
    { role: "user", content: "d".repeat(3000) },
  ]);
  assert.deepEqual(r.map((m) => m.role), ["user", "assistant", "user"]);
  assert.equal(r[0].content, "a\n\nb");
  assert.equal(r[2].content.length, 2000);
});

test("responde en streaming con el modelo, el esfuerzo, la caché y el respaldo esperados", async () => {
  const c = clienteFalso([respuestaTexto("Hola, soy el asistente de IA de Big Bang Agency.")]);
  const m = crearManejador({ env: ENV, crearCliente: c.crear });
  const r = await m(peticion([{ role: "user", content: "¿Quién eres?" }]));
  assert.equal(r.headers.get("content-type"), "text/event-stream; charset=utf-8");
  const evs = await eventos(r);
  assert.equal(textoDe(evs), "Hola, soy el asistente de IA de Big Bang Agency.");
  assert.equal(evs.at(-1).type, "done");
  const p = c.llamadas[0];
  assert.equal(p.model, "claude-opus-5-5");
  assert.deepEqual(p.output_config, { effort: "low" });
  assert.deepEqual(p.betas, ["server-side-fallback-2026-07-01"]);
  assert.equal(p.fallbacks, "default");
  assert.deepEqual(p.system[0].cache_control, { type: "ephemeral" });
  assert.equal(p.tools[0].name, "registrar_solicitud");
  assert.ok(!("thinking" in p), "Opus 5.5 no admite desactivar el razonamiento: no se envía");
});

test("con un modelo sin respaldo del servidor no se envía el parámetro fallbacks", async () => {
  const c = clienteFalso([respuestaTexto("ok")]);
  const m = crearManejador({ env: { ...ENV, CLAUDE_MODEL: "claude-haiku-5-5" }, crearCliente: c.crear });
  await eventos(await m(peticion([{ role: "user", content: "hola" }])));
  assert.equal(c.llamadas[0].model, "claude-haiku-5-5");
  assert.ok(!("fallbacks" in c.llamadas[0]) && !("betas" in c.llamadas[0]));
});

test("registra la solicitud en el formulario de la web y continúa la conversación", async () => {
  const c = clienteFalso([respuestaHerramienta(SOLICITUD), respuestaTexto("Hecho, te escribimos por email.")]);
  const f = fetchFalso(200);
  const m = crearManejador({ env: ENV, crearCliente: c.crear, fetchImpl: f });
  const evs = await eventos(await m(peticion([{ role: "user", content: "Quiero una propuesta" }])));

  assert.deepEqual(evs.find((e) => e.type === "lead"), { type: "lead", ok: true });
  assert.equal(f.envios.length, 1);
  assert.equal(f.envios[0].url, `${SITIO}/agencia/gracias.html`);
  assert.equal(f.envios[0].campos["form-name"], "contacto-agencia");
  assert.equal(f.envios[0].campos.email, "ana@ejemplo.es");
  assert.equal(f.envios[0].campos.mensaje, "[Vía chat] Citas por WhatsApp");
  assert.equal(f.envios[0].campos.consentimiento, "acepto");

  const segunda = c.llamadas[1].messages;
  assert.equal(segunda.at(-2).role, "assistant");
  assert.equal(segunda.at(-2).content[0].type, "thinking", "los bloques del modelo se devuelven tal cual");
  assert.equal(segunda.at(-1).content[0].type, "tool_result");
  assert.equal(segunda.at(-1).content[0].is_error, false);
  assert.match(textoDe(evs), /te escribimos por email/);
});

test("sin consentimiento expreso no registra nada", async () => {
  const c = clienteFalso([respuestaHerramienta({ ...SOLICITUD, consentimiento: false }), respuestaTexto("Necesito tu consentimiento.")]);
  const f = fetchFalso();
  const m = crearManejador({ env: ENV, crearCliente: c.crear, fetchImpl: f });
  const evs = await eventos(await m(peticion([{ role: "user", content: "Regístrame" }])));
  assert.equal(f.envios.length, 0);
  assert.ok(!evs.some((e) => e.type === "lead"));
  const resultado = c.llamadas[1].messages.at(-1).content[0];
  assert.equal(resultado.is_error, true);
  assert.match(resultado.content, /consentimiento/);
});

test("validarSolicitud rechaza emails y valores fuera de lista", () => {
  assert.equal(validarSolicitud({ ...SOLICITUD, email: "no-es-un-email" }).ok, false);
  assert.equal(validarSolicitud({ ...SOLICITUD, sector: "Otro sector inventado" }).ok, false);
  assert.equal(validarSolicitud({ ...SOLICITUD, nombre: "" }).ok, false);
  assert.equal(validarSolicitud(SOLICITUD).ok, true);
});

test("si el formulario falla, avisa y no da la solicitud por registrada", async () => {
  const c = clienteFalso([respuestaHerramienta(SOLICITUD), respuestaTexto("Usa el formulario.")]);
  const m = crearManejador({ env: ENV, crearCliente: c.crear, fetchImpl: fetchFalso(500) });
  const evs = await eventos(await m(peticion([{ role: "user", content: "Quiero una propuesta" }])));
  assert.deepEqual(evs.find((e) => e.type === "lead"), { type: "lead", ok: false });
  assert.equal(c.llamadas[1].messages.at(-1).content[0].is_error, true);
});

test("un rechazo del modelo termina con un mensaje amable", async () => {
  const c = clienteFalso([respuestaTexto("", "refusal")]);
  const m = crearManejador({ env: ENV, crearCliente: c.crear });
  const evs = await eventos(await m(peticion([{ role: "user", content: "algo fuera de lugar" }])));
  assert.match(textoDe(evs), /no puedo ayudarte/i);
});

test("un corte de conexión se reintenta y descarta el texto a medias", async () => {
  const c = clienteFalso([respuestaQueFalla(new Error("conexión cortada"), { conTexto: true }), respuestaTexto("Respuesta completa.")]);
  const m = crearManejador({ env: ENV, crearCliente: c.crear });
  const evs = await eventos(await m(peticion([{ role: "user", content: "hola" }])));
  const iReset = evs.findIndex((e) => e.type === "reset");
  assert.ok(iReset > 0);
  assert.equal(textoDe(evs.slice(iReset)), "Respuesta completa.");
});

test("un error de la API termina con un evento de error", async () => {
  const errorApi = Object.create(Anthropic.APIError.prototype);
  const c = clienteFalso([respuestaQueFalla(errorApi)]);
  const m = crearManejador({ env: ENV, crearCliente: c.crear });
  const evs = await eventos(await m(peticion([{ role: "user", content: "hola" }])));
  assert.deepEqual(evs.slice(-2), [{ type: "error" }, { type: "done" }]);
  assert.equal(c.llamadas.length, 1, "los errores de la API no se reintentan aquí");
});

test("los precios del asistente coinciden con el catálogo de cobros y con la web", () => {
  const cat = JSON.parse(readFileSync(new URL("../cobros/catalogo.json", import.meta.url), "utf8"));
  const precio = Object.fromEntries(cat.productos.flatMap((p) => p.precios.map((pr) => [pr.lookup_key, pr.importe])));
  for (const pack of ["arranque", "crecimiento", "escala"]) {
    assert.equal(PRECIOS[pack].cuota, precio[`bba_${pack}_mensual`], pack);
    assert.equal(PRECIOS[pack].anual, precio[`bba_${pack}_anual`], pack);
    assert.equal(PRECIOS[pack].puestaEnMarcha, precio[`bba_${pack}_setup_50`] * 2, pack);
  }
  assert.equal(PRECIOS.diagnostico, precio.bba_diagnostico);
  const web = readFileSync(new URL("../agencia/index.html", import.meta.url), "utf8");
  for (const cifra of ["349", "839", "2.169", "1.190 €", "3.490 €", "8.350 €", "590 €", "14.500 €"]) {
    assert.ok(web.includes(cifra), `la web no muestra ${cifra}`);
    assert.ok(INSTRUCCIONES.includes(cifra), `el asistente no conoce ${cifra}`);
  }
});
