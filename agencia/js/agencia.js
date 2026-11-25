/* ==========================================================================
   Big Bang Agency — interacciones de la web
   - Menú móvil y cabecera
   - Interruptor mensual/anual de precios
   - Botones de pack que preseleccionan el formulario
   - Calculadora de ahorro (ROI)
   - Demo animada del chat
   ========================================================================== */
(function () {
  "use strict";

  // Packs (precios con IVA incluido): fuente de la calculadora; deben coincidir con el HTML y cobros/catalogo.json.
  var PLANS = {
    Arranque: { monthly: 349, setup: 1190 },
    Crecimiento: { monthly: 839, setup: 3490 },
    Escala: { monthly: 2169, setup: 8350 }
  };
  var WEEKS_PER_MONTH = 4.33;

  // "de-DE" agrupa también los números de 4 cifras con punto (1.490), como se escribe en la web.
  // "es-ES" no lo hace (1490) por la regla CLDR de agrupación mínima.
  var nf0 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
  var nf1 = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  var NBSP = "\u00a0"; // espacio que no parte el número de su unidad
  function eur(n) { return nf0.format(Math.round(n)) + NBSP + "€"; }

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------- Cabecera */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var toggle = document.querySelector(".nav-toggle");
  var links = document.getElementById("nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    });
    links.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        links.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Abrir menú");
      }
    });
  }

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ------------------------------------------------- Mensual / anual */
  var billingButtons = document.querySelectorAll("[data-billing]");
  function setBilling(mode) {
    billingButtons.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-billing") === mode));
    });
    document.querySelectorAll("[data-price]").forEach(function (el) {
      var v = Number(el.getAttribute(mode === "annual" ? "data-annual" : "data-monthly"));
      el.textContent = nf0.format(v);
    });
    document.querySelectorAll("[data-note-monthly]").forEach(function (el) {
      el.textContent = el.getAttribute(mode === "annual" ? "data-note-annual" : "data-note-monthly");
    });
  }
  billingButtons.forEach(function (b) {
    b.addEventListener("click", function () { setBilling(b.getAttribute("data-billing")); });
  });

  /* ------------------------------- Botones de pack -> formulario */
  var planSelect = document.getElementById("f-plan");
  function preselect(plan) {
    if (!planSelect || !plan) return;
    for (var i = 0; i < planSelect.options.length; i++) {
      if (planSelect.options[i].value === plan) { planSelect.selectedIndex = i; break; }
    }
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-plan]");
    if (a) preselect(a.getAttribute("data-plan"));
  });
  // También desde la URL: /agencia/?pack=Crecimiento#contacto
  try {
    var qp = new URLSearchParams(window.location.search).get("pack");
    if (qp) preselect(qp);
  } catch (err) { /* navegadores antiguos */ }

  /* ---------------------------------------------------- Calculadora */
  var inputs = {
    people: document.getElementById("roi-people"),
    hours: document.getElementById("roi-hours"),
    cost: document.getElementById("roi-cost"),
    pct: document.getElementById("roi-pct")
  };

  function fill(input) {
    var min = Number(input.min), max = Number(input.max), val = Number(input.value);
    input.style.setProperty("--fill", ((val - min) / (max - min)) * 100 + "%");
  }

  function recommend(hoursFreed) {
    if (hoursFreed < 45) return "Arranque";
    if (hoursFreed < 160) return "Crecimiento";
    return "Escala";
  }

  function calc() {
    if (!inputs.people) return;
    var people = Number(inputs.people.value);
    var hours = Number(inputs.hours.value);
    var cost = Number(inputs.cost.value);
    var pct = Number(inputs.pct.value) / 100;

    Object.keys(inputs).forEach(function (k) { fill(inputs[k]); });
    document.getElementById("out-people").textContent = String(people);
    document.getElementById("out-hours").textContent = hours + " h";
    document.getElementById("out-cost").textContent = cost + " €";
    document.getElementById("out-pct").textContent = Math.round(pct * 100) + " %";

    var hoursFreed = people * hours * WEEKS_PER_MONTH * pct;
    var saving = hoursFreed * cost;
    var planName = recommend(hoursFreed);
    var plan = PLANS[planName];
    var net = saving - plan.monthly;
    var year1 = saving * 12 - (plan.setup + plan.monthly * 12);

    var paybackText, planLabel = planName, planDetail, ctaPlan = planName;
    if (net <= 0) {
      paybackText = "Aún no compensa";
      planLabel = "Empieza por el Diagnóstico";
      planDetail = "Con este volumen, te ayudamos a encontrar procesos con más retorno antes de invertir.";
      ctaPlan = "Diagnóstico";
    } else {
      var payback = plan.setup / net;
      paybackText = payback > 24 ? ">" + NBSP + "24" + NBSP + "meses" : nf1.format(Math.max(payback, 0.1)) + NBSP + "meses";
      planDetail = nf0.format(plan.monthly) + " €/mes + " + nf0.format(plan.setup) + " € de puesta en marcha";
    }

    document.getElementById("res-hours").textContent = nf0.format(Math.round(hoursFreed)) + NBSP + "h";
    document.getElementById("res-saving").textContent = eur(saving);
    document.getElementById("res-payback").textContent = paybackText;
    document.getElementById("res-year").textContent = year1 > 0 ? eur(Math.round(year1 / 10) * 10) : "—";
    document.getElementById("res-plan").textContent = planLabel;
    document.getElementById("res-plan-detail").textContent = planDetail;

    document.querySelectorAll(".kpi-value").forEach(encaja);

    var cta = document.getElementById("roi-cta");
    if (cta) cta.setAttribute("data-plan", ctaPlan);

    var hidden = document.getElementById("roi-hidden");
    if (hidden) {
      hidden.value = people + " personas x " + hours + " h/sem x " + cost + " €/h x " + Math.round(pct * 100) +
        " % => " + Math.round(hoursFreed) + " h/mes, " + eur(saving) + "/mes. Recomendado: " + planLabel;
    }
  }

  // Reduce la letra de una cifra hasta que quepa en su tarjeta (importes grandes en móviles estrechos).
  // El ancho del texto es proporcional al tamaño de letra, así que basta un único cálculo.
  function encaja(el) {
    el.style.fontSize = "";
    var sobra = el.scrollWidth / el.clientWidth;
    if (sobra > 1.01) {
      el.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) / sobra) * 0.97 + "px";
    }
  }

  Object.keys(inputs).forEach(function (k) {
    if (inputs[k]) inputs[k].addEventListener("input", calc);
  });
  window.addEventListener("resize", calc);
  calc();

  /* ---------------------------------------------------- Demo del chat */
  var chatBody = document.getElementById("chat-body");
  var replay = document.getElementById("demo-replay");
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  var SCRIPT = [
    { who: "user", text: "Hola, ¿tenéis cita esta semana para una limpieza?" },
    { who: "bot", text: "¡Hola! Soy el asistente virtual de la clínica. Tengo hueco el jueves a las 10:30 o el viernes a las 17:00. ¿Cuál te viene mejor?" },
    { who: "user", text: "El jueves. ¿Cuánto cuesta?" },
    { who: "bot", text: "La limpieza son 45 € e incluye revisión. Te reservo el jueves a las 10:30. ¿Me dices tu nombre y teléfono?" },
    { who: "user", text: "Marta López, 600 000 000" },
    { who: "system", text: "Cita creada en Google Calendar" },
    { who: "system", text: "Paciente registrada en el CRM" },
    { who: "bot", text: "¡Listo, Marta! Te he enviado la confirmación por WhatsApp y te lo recordaré el día antes." }
  ];

  function makeMsg(step) {
    var el = document.createElement("div");
    el.className = "msg msg-" + step.who;
    if (step.who === "system") {
      el.innerHTML = CHECK;
      el.appendChild(document.createTextNode(step.text));
    } else {
      el.textContent = step.text;
    }
    return el;
  }

  var timers = [];
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function renderAll() {
    chatBody.innerHTML = "";
    SCRIPT.forEach(function (s) {
      var m = makeMsg(s);
      m.style.animation = "none";
      chatBody.appendChild(m);
    });
  }

  function play() {
    clearTimers();
    chatBody.innerHTML = "";
    if (replay) replay.hidden = true;
    var t = 400;
    SCRIPT.forEach(function (step, i) {
      if (step.who === "bot") {
        var typing;
        timers.push(setTimeout(function () {
          typing = document.createElement("div");
          typing.className = "typing";
          typing.setAttribute("aria-hidden", "true");
          typing.innerHTML = "<span></span><span></span><span></span>";
          chatBody.appendChild(typing);
        }, t));
        t += 1100;
        timers.push(setTimeout(function () {
          if (typing && typing.parentNode) typing.parentNode.removeChild(typing);
          chatBody.appendChild(makeMsg(step));
        }, t));
        t += 1500;
      } else {
        timers.push(setTimeout(function () { chatBody.appendChild(makeMsg(step)); }, t));
        t += step.who === "system" ? 700 : 1300;
      }
      if (i === SCRIPT.length - 1 && replay) {
        timers.push(setTimeout(function () { replay.hidden = false; }, t));
      }
    });
  }

  if (chatBody) {
    if (reduceMotion) {
      renderAll();
    } else if ("IntersectionObserver" in window) {
      var played = false;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !played) { played = true; play(); io.disconnect(); }
        });
      }, { threshold: 0.35 });
      io.observe(chatBody);
    } else {
      renderAll();
    }
    if (replay) replay.addEventListener("click", play);
  }
})();
