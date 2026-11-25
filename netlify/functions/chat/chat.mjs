// Función de Netlify: chat con el asistente de IA de la web de Big Bang Agency.
//
//   GET  /api/chat  -> { activo: true|false }  (la web solo muestra el chat si está configurado)
//   POST /api/chat  -> respuesta en streaming (text/event-stream) con eventos JSON:
//        {type:"text", text}   fragmento de la respuesta
//        {type:"reset"}        descartar el texto recibido (se reintenta el turno)
//        {type:"lead", ok}     resultado de registrar una solicitud de propuesta
//        {type:"error"}        no se pudo responder
//        {type:"done"}         fin
//
// Variables de entorno (Netlify › Site configuration › Environment variables):
//   ANTHROPIC_API_KEY  obligatoria; sin ella el chat no se muestra
//   CLAUDE_MODEL       opcional; por defecto claude-opus-5-5
//   CLAUDE_EFFORT      opcional; por defecto low (respuestas de chat, rápidas)
//
// Privacidad: no se registra el contenido de las conversaciones. Solo se guardan los datos que la persona
// acepta enviar como solicitud de propuesta (en el formulario «contacto-agencia» de Netlify Forms).

import Anthropic from "@anthropic-ai/sdk";
import { HERRAMIENTAS, INSTRUCCIONES, PACKS, SECTORES, TAMANOS } from "./conocimiento.mjs";

export const config = { path: "/api/chat" };

const MODELO_POR_DEFECTO = "claude-opus-5-5";
const MAX_MENSAJES = 20;
const MAX_CARACTERES_MENSAJE = 2000;
const MAX_CARACTERES_TOTAL = 20000;
const MAX_VUELTAS = 4; // llamadas al modelo por turno (respuesta + herramienta + reintentos)

// --------------------------------------------------------------------------- utilidades
function json(cuerpo, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// Solo se aceptan peticiones hechas desde la propia web (bloquea el uso desde otros sitios).
export function mismoOrigen(req) {
  const origen = req.headers.get("origin");
  if (!origen) return false;
  try {
    return new URL(origen).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

// Normaliza el historial que envía el navegador: solo texto, alternando usuario/asistente,
// empezando y terminando por el usuario, con límites de tamaño.
export function sanearMensajes(entrada) {
  if (!Array.isArray(entrada)) return null;
  const limpios = [];
  for (const m of entrada) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") return null;
    const texto = m.content.trim().slice(0, MAX_CARACTERES_MENSAJE);
    if (!texto) continue;
    const ultimo = limpios.at(-1);
    if (ultimo && ultimo.role === m.role) ultimo.content += `\n\n${texto}`;
    else limpios.push({ role: m.role, content: texto });
  }
  let recortados = limpios.slice(-MAX_MENSAJES);
  while (recortados.length && recortados[0].role !== "user") recortados = recortados.slice(1);
  if (!recortados.length || recortados.at(-1).role !== "user") return null;
  const total = recortados.reduce((n, m) => n + m.content.length, 0);
  if (total > MAX_CARACTERES_TOTAL) return null;
  return recortados;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Valida la entrada de la herramienta: con streaming de entradas el servidor no la valida por nosotros.
export function validarSolicitud(e) {
  if (!e || typeof e !== "object" || Array.isArray(e)) return { ok: false, error: "entrada no válida" };
  const texto = (k, max) => typeof e[k] === "string" && e[k].trim().length > 0 && e[k].length <= max;
  if (!texto("nombre", 100)) return { ok: false, error: "falta el nombre" };
  if (!texto("empresa", 120)) return { ok: false, error: "falta la empresa" };
  if (!texto("email", 160) || !EMAIL.test(e.email.trim())) return { ok: false, error: "el email no es válido" };
  if (!SECTORES.includes(e.sector)) return { ok: false, error: "sector no válido" };
  if (!TAMANOS.includes(e.tamano)) return { ok: false, error: "tamaño no válido" };
  if (!PACKS.includes(e.pack)) return { ok: false, error: "pack no válido" };
  if (!texto("proceso", 1500)) return { ok: false, error: "falta qué quiere automatizar" };
  if (e.consentimiento !== true) return { ok: false, error: "falta el consentimiento expreso a la política de privacidad" };
  return {
    ok: true,
    datos: {
      nombre: e.nombre.trim(), empresa: e.empresa.trim(), email: e.email.trim(), sector: e.sector,
      tamano: e.tamano, pack: e.pack, proceso: e.proceso.trim(),
    },
  };
}

// Envía la solicitud al mismo formulario de Netlify Forms que usa la web (mismo aviso por email).
export async function registrarSolicitud(datos, origenSitio, fetchImpl) {
  const cuerpo = new URLSearchParams({
    "form-name": "contacto-agencia",
    nombre: datos.nombre,
    empresa: datos.empresa,
    email: datos.email,
    sector: datos.sector,
    tamano: datos.tamano,
    pack: datos.pack,
    mensaje: `[Vía chat] ${datos.proceso}`,
    consentimiento: "acepto",
    "estimacion-roi": "Solicitud recogida por el asistente de IA de la web",
  });
  const r = await fetchImpl(`${origenSitio}/agencia/gracias.html`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: cuerpo.toString(),
    redirect: "manual",
  });
  return r.status >= 200 && r.status < 400;
}

// Modelos que admiten el respaldo automático del servidor ante un rechazo.
const admiteRespaldo = (modelo) => /^claude-(opus-5|fable-5|sonnet-5-5)/.test(modelo);

// --------------------------------------------------------------------------- conversación
async function conversar({ cliente, env, mensajes, enviar, origenSitio, fetchImpl }) {
  const modelo = env.CLAUDE_MODEL || MODELO_POR_DEFECTO;
  const historial = mensajes.map((m) => ({ role: m.role, content: m.content }));
  let reintentos = 0;

  for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
    const params = {
      model: modelo,
      max_tokens: 4096,
      system: [{ type: "text", text: INSTRUCCIONES, cache_control: { type: "ephemeral" } }],
      tools: HERRAMIENTAS,
      messages: historial,
      output_config: { effort: env.CLAUDE_EFFORT || "low" },
    };
    if (admiteRespaldo(modelo)) {
      params.betas = ["server-side-fallback-2026-07-01"];
      params.fallbacks = "default";
    }

    let mensaje;
    let textoEnviado = false;
    try {
      const stream = cliente.beta.messages.stream(params);
      for await (const evento of stream) {
        if (evento.type === "content_block_delta" && evento.delta.type === "text_delta") {
          enviar({ type: "text", text: evento.delta.text });
          textoEnviado = true;
        }
      }
      mensaje = await stream.finalMessage();
      reintentos = 0;
    } catch (err) {
      // Errores de la API: no se reintentan aquí (el SDK ya reintenta 429/5xx). Otros (JSON de herramienta
      // ilegible, conexión cortada): se reintenta el turno, como máximo dos veces seguidas.
      if (err instanceof Anthropic.APIError || reintentos++ >= 2) throw err;
      if (textoEnviado) enviar({ type: "reset" });
      continue;
    }

    if (mensaje.stop_reason === "refusal") {
      enviar({ type: "text", text: "Con eso no puedo ayudarte. Si quieres, te cuento cómo podemos automatizar procesos de tu empresa." });
      return;
    }

    const usos = mensaje.content.filter((b) => b.type === "tool_use");
    if (!usos.length) return; // respuesta normal terminada
    if (mensaje.stop_reason === "max_tokens") return; // entrada de herramienta posiblemente truncada: no se ejecuta

    historial.push({ role: "assistant", content: mensaje.content }); // tal cual (incluye bloques de razonamiento)
    const resultados = [];
    for (const uso of usos) {
      if (uso.name !== "registrar_solicitud") {
        resultados.push({ type: "tool_result", tool_use_id: uso.id, is_error: true, content: "Herramienta desconocida." });
        continue;
      }
      const v = validarSolicitud(uso.input);
      if (!v.ok) {
        resultados.push({ type: "tool_result", tool_use_id: uso.id, is_error: true, content: `No registrada: ${v.error}.` });
        continue;
      }
      let ok = false;
      try {
        ok = await registrarSolicitud(v.datos, origenSitio, fetchImpl);
      } catch {
        ok = false;
      }
      enviar({ type: "lead", ok });
      resultados.push({
        type: "tool_result",
        tool_use_id: uso.id,
        is_error: !ok,
        content: ok
          ? "Solicitud registrada. Confirma a la persona que recibirá por email el pre-diagnóstico y la propuesta en menos de 24 h laborables."
          : "No se pudo registrar por un error técnico. Pide disculpas y sugiere usar el formulario de /agencia/#contacto.",
      });
    }
    historial.push({ role: "user", content: resultados });
  }
}

// --------------------------------------------------------------------------- manejador
export function crearManejador({
  crearCliente = (env) => new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }),
  fetchImpl = (...a) => fetch(...a),
  env = process.env,
} = {}) {
  return async function manejador(req) {
    const activo = Boolean(env.ANTHROPIC_API_KEY);
    if (req.method === "GET") return json({ activo });
    if (req.method !== "POST") return json({ error: "método no permitido" }, 405);
    if (!mismoOrigen(req)) return json({ error: "origen no permitido" }, 403);
    if (!activo) return json({ error: "no_configurado" }, 503);

    let cuerpo;
    try {
      cuerpo = await req.json();
    } catch {
      return json({ error: "JSON no válido" }, 400);
    }
    const mensajes = sanearMensajes(cuerpo && cuerpo.messages);
    if (!mensajes) return json({ error: "mensajes no válidos" }, 400);

    const cliente = crearCliente(env);
    const origenSitio = new URL(req.url).origin;
    const codificador = new TextEncoder();

    const flujo = new ReadableStream({
      async start(controller) {
        const enviar = (obj) => controller.enqueue(codificador.encode(`data: ${JSON.stringify(obj)}\n\n`));
        try {
          await conversar({ cliente, env, mensajes, enviar, origenSitio, fetchImpl });
        } catch (err) {
          // Solo el tipo de error, nunca el contenido de la conversación.
          console.error("chat: error", err instanceof Anthropic.APIError ? `API ${err.status}` : err && err.name);
          enviar({ type: "error" });
        } finally {
          enviar({ type: "done" });
          controller.close();
        }
      },
    });

    return new Response(flujo, {
      headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store" },
    });
  };
}

export default crearManejador();
