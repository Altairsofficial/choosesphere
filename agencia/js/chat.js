/* ==========================================================================
   Big Bang Agency — chat con el asistente de IA
   - Solo se muestra si /api/chat responde { activo: true } (función de Netlify configurada)
   - Respuestas en streaming (eventos JSON por text/event-stream)
   - La conversación se guarda en sessionStorage mientras dura la visita
   Clases con prefijo bbc- para no chocar con la demo de chat de la portada.
   ========================================================================== */
(function () {
  "use strict";

  var ENDPOINT = "/api/chat";
  var CLAVE = "bba-chat-v1";
  var MAX_CARACTERES = 1000;
  var SALUDO = "¡Hola! Soy el asistente de IA de Big Bang Agency. Puedo explicarte los packs, ayudarte a elegir y prepararte una propuesta gratis por escrito. ¿Qué te gustaría automatizar en tu empresa?";
  var SUGERENCIAS = ["¿Qué pack me conviene?", "¿Cuánto cuesta?", "¿Cómo protegéis mis datos?"];
  var ERROR = "Ahora mismo no puedo responder. Puedes pedir tu propuesta en el formulario: /agencia/#contacto";

  var SVG = {
    bot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="12" rx="3"/><path d="M12 8V4M8 14h.01M16 14h.01"/><circle cx="12" cy="3" r="1"/></svg>',
    enviar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>'
  };

  var mensajes = cargar();
  var ocupado = false;
  var el = {};

  function cargar() {
    try {
      var datos = JSON.parse(sessionStorage.getItem(CLAVE) || "[]");
      return Array.isArray(datos) ? datos.filter(function (m) {
        return m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string";
      }) : [];
    } catch (e) { return []; }
  }
  function guardar() {
    try { sessionStorage.setItem(CLAVE, JSON.stringify(mensajes.slice(-30))); } catch (e) { /* sin almacenamiento */ }
  }

  // Texto plano -> HTML seguro con saltos de línea y enlaces (/agencia/... o https://...).
  function formatear(texto) {
    var seguro = texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    seguro = seguro.replace(/(https?:\/\/[^\s<]+|\/agencia\/[^\s<]*)/g, function (url) {
      var cola = (url.match(/[.,;:!?)]+$/) || [""])[0];
      var limpio = url.slice(0, url.length - cola.length);
      var externo = /^https?:/.test(limpio);
      return '<a href="' + limpio + '"' + (externo ? ' target="_blank" rel="noopener"' : "") + ">" + limpio + "</a>" + cola;
    });
    return seguro.replace(/\n/g, "<br>");
  }

  function pintar(role, texto) {
    var div = document.createElement("div");
    div.className = "bbc-msg bbc-msg--" + role;
    div.innerHTML = formatear(texto);
    el.log.appendChild(div);
    el.log.scrollTop = el.log.scrollHeight;
    return div;
  }
  function nota(texto, error) {
    var div = document.createElement("div");
    div.className = "bbc-nota" + (error ? " bbc-nota--error" : "");
    div.innerHTML = formatear(texto);
    el.log.appendChild(div);
    el.log.scrollTop = el.log.scrollHeight;
  }

  function montar() {
    var lanzador = document.createElement("button");
    lanzador.type = "button";
    lanzador.className = "bbc-launcher";
    lanzador.setAttribute("aria-controls", "bbc-panel");
    lanzador.setAttribute("aria-expanded", "false");
    lanzador.innerHTML = '<span class="bbc-ico">' + SVG.bot + '</span><span class="bbc-etiqueta">¿Dudas? Pregunta a la IA</span>';
    lanzador.setAttribute("aria-label", "Abrir el chat con el asistente de IA");

    var panel = document.createElement("section");
    panel.className = "bbc-panel";
    panel.id = "bbc-panel";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-labelledby", "bbc-titulo");
    panel.innerHTML =
      '<header class="bbc-head">' +
        '<div class="bbc-avatar">' + SVG.bot + '</div>' +
        '<div><p class="bbc-titulo" id="bbc-titulo">Asistente de IA</p><p class="bbc-sub">Big Bang Agency · responde al momento</p></div>' +
        '<button type="button" class="bbc-cerrar" aria-label="Cerrar el chat">×</button>' +
      '</header>' +
      '<p class="bbc-aviso">Te atiende una inteligencia artificial, no una persona. No compartas datos sensibles. <a href="privacidad.html">Privacidad</a></p>' +
      '<div class="bbc-log" aria-live="polite"></div>' +
      '<div class="bbc-sugerencias"></div>' +
      '<form class="bbc-form">' +
        '<label class="visually-hidden" for="bbc-entrada">Escribe tu mensaje</label>' +
        '<textarea id="bbc-entrada" rows="1" maxlength="' + MAX_CARACTERES + '" placeholder="Escribe tu pregunta…"></textarea>' +
        '<button type="submit" class="bbc-enviar" aria-label="Enviar">' + SVG.enviar + '</button>' +
      '</form>';

    document.body.appendChild(lanzador);
    document.body.appendChild(panel);

    el = {
      lanzador: lanzador, panel: panel,
      log: panel.querySelector(".bbc-log"),
      sugerencias: panel.querySelector(".bbc-sugerencias"),
      form: panel.querySelector(".bbc-form"),
      entrada: panel.querySelector("#bbc-entrada"),
      boton: panel.querySelector(".bbc-enviar"),
      cerrar: panel.querySelector(".bbc-cerrar")
    };

    pintar("assistant", SALUDO);
    mensajes.forEach(function (m) { pintar(m.role, m.content); });

    SUGERENCIAS.forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = s;
      b.addEventListener("click", function () { enviar(s); });
      el.sugerencias.appendChild(b);
    });
    el.sugerencias.hidden = mensajes.length > 0;

    lanzador.addEventListener("click", abrir);
    el.cerrar.addEventListener("click", cerrar);
    panel.addEventListener("keydown", function (e) { if (e.key === "Escape") cerrar(); });
    el.form.addEventListener("submit", function (e) { e.preventDefault(); enviar(el.entrada.value); });
    el.entrada.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(el.entrada.value); }
    });
    el.entrada.addEventListener("input", autoajustar);
  }

  function autoajustar() {
    el.entrada.style.height = "auto";
    el.entrada.style.height = Math.min(el.entrada.scrollHeight, 120) + "px";
  }
  function abrir() {
    el.panel.hidden = false;
    el.lanzador.setAttribute("aria-expanded", "true");
    el.log.scrollTop = el.log.scrollHeight;
    el.entrada.focus();
  }
  function cerrar() {
    el.panel.hidden = true;
    el.lanzador.setAttribute("aria-expanded", "false");
    el.lanzador.focus();
  }

  // Lee el flujo de eventos "data: {...}\n\n" y llama a alEvento con cada objeto.
  function leerFlujo(cuerpo, alEvento) {
    var lector = cuerpo.getReader();
    var decodificador = new TextDecoder();
    var resto = "";
    function paso() {
      return lector.read().then(function (r) {
        if (r.done) return;
        resto += decodificador.decode(r.value, { stream: true });
        var partes = resto.split("\n\n");
        resto = partes.pop();
        partes.forEach(function (p) {
          var linea = p.trim();
          if (linea.indexOf("data: ") !== 0) return;
          try { alEvento(JSON.parse(linea.slice(6))); } catch (e) { /* evento ilegible */ }
        });
        return paso();
      });
    }
    return paso();
  }

  function enviar(texto) {
    texto = (texto || "").trim().slice(0, MAX_CARACTERES);
    if (ocupado || !texto) return;
    ocupado = true;
    el.boton.disabled = true;
    el.sugerencias.hidden = true;
    el.entrada.value = "";
    autoajustar();

    mensajes.push({ role: "user", content: texto });
    guardar();
    pintar("user", texto);

    var burbuja = pintar("assistant", "");
    burbuja.innerHTML = '<span class="bbc-escribiendo" aria-label="Escribiendo"><span></span><span></span><span></span></span>';
    var acumulado = "";
    var huboError = false;

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: mensajes })
    }).then(function (r) {
      if (!r.ok || !r.body) throw new Error("HTTP " + r.status);
      return leerFlujo(r.body, function (ev) {
        if (ev.type === "text") {
          acumulado += ev.text;
          burbuja.innerHTML = formatear(acumulado);
          el.log.scrollTop = el.log.scrollHeight;
        } else if (ev.type === "reset") {
          acumulado = "";
          burbuja.innerHTML = '<span class="bbc-escribiendo" aria-label="Escribiendo"><span></span><span></span><span></span></span>';
        } else if (ev.type === "lead") {
          nota(ev.ok ? "✓ Solicitud enviada. Te escribiremos por email." : "No se pudo enviar la solicitud. Usa el formulario: /agencia/#contacto", !ev.ok);
        } else if (ev.type === "error") {
          huboError = true;
        }
      });
    }).then(function () {
      if (acumulado) {
        mensajes.push({ role: "assistant", content: acumulado });
        guardar();
      } else {
        burbuja.remove();
      }
      if (huboError || !acumulado) nota(ERROR, true);
    }).catch(function () {
      if (!acumulado) burbuja.remove();
      nota(ERROR, true);
    }).then(function () {
      ocupado = false;
      el.boton.disabled = false;
      el.entrada.focus();
    });
  }

  // Solo se monta si el servidor confirma que el chat está configurado.
  fetch(ENDPOINT, { headers: { Accept: "application/json" } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { if (d && d.activo) montar(); })
    .catch(function () { /* sin chat */ });
})();
