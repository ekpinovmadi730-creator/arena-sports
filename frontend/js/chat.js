(function () {
  const log = document.getElementById("chat-log");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  const exerciseSelect = document.getElementById("exercise-select");
  const videoHost = document.getElementById("video-host");
  const videoFrame = document.getElementById("video-frame");
  const videoNote = document.getElementById("video-note");
  const videoHeading = document.getElementById("video-heading");

  if (!log || !form || !input) return;

  /** @type {AbortController|null} */
  let activeSend = null;

  function appendBubble(role, text) {
    const wrap = document.createElement("div");
    wrap.className = `bubble bubble--${role}`;
    const label = document.createElement("div");
    label.className = "bubble__label";
    label.textContent = role === "user" ? "Сіз" : "Жаттықтырушы-бот";
    const body = document.createElement("div");
    body.className = "bubble__body";
    body.textContent = text;
    wrap.appendChild(label);
    wrap.appendChild(body);
    log.appendChild(wrap);
    log.scrollTop = log.scrollHeight;
  }

  function appendExerciseBubble(payload) {
    const wrap = document.createElement("div");
    wrap.className = "bubble bubble--bot";
    const label = document.createElement("div");
    label.className = "bubble__label";
    label.textContent = "Жаттықтырушы-бот";
    wrap.appendChild(label);

    const title = document.createElement("div");
    title.className = "bubble-exercise__title";
    title.textContent = payload.exercise_title || "Жаттығу";
    wrap.appendChild(title);

    if (payload.how_to) {
      const block = document.createElement("div");
      block.className = "bubble-section";
      const h = document.createElement("div");
      h.className = "bubble-section__head";
      h.textContent = "Қалай орындау керек";
      const p = document.createElement("p");
      p.className = "bubble-section__text";
      p.textContent = payload.how_to;
      block.appendChild(h);
      block.appendChild(p);
      wrap.appendChild(block);
    }

    if (payload.avoid) {
      const block = document.createElement("div");
      block.className = "bubble-section bubble-section--warn";
      const h = document.createElement("div");
      h.className = "bubble-section__head";
      h.textContent = "Нені жасамау керек";
      const p = document.createElement("p");
      p.className = "bubble-section__text";
      p.textContent = payload.avoid;
      block.appendChild(h);
      block.appendChild(p);
      wrap.appendChild(block);
    }

    log.appendChild(wrap);
    log.scrollTop = log.scrollHeight;
  }

  function setVideo(src, headingText, noteText) {
    if (!videoHost || !videoFrame) return;
    if (!src) {
      videoHost.hidden = true;
      videoFrame.removeAttribute("src");
      if (videoNote) videoNote.textContent = "";
      return;
    }
    videoHost.hidden = false;
    videoFrame.src = src;
    if (videoHeading) videoHeading.textContent = headingText || "Бейне мысал";
    if (videoNote) videoNote.textContent = noteText || "Кіріктірілген бейне (YouTube)";
  }

  function renderBotReply(data) {
    const hasStructured =
      (data.how_to && String(data.how_to).trim()) ||
      (data.avoid && String(data.avoid).trim()) ||
      (data.exercise_title && String(data.exercise_title).trim());

    if (hasStructured && (data.how_to || data.avoid)) {
      appendExerciseBubble({
        exercise_title: data.exercise_title,
        how_to: data.how_to,
        avoid: data.avoid,
      });
      setVideo(data.video || null, "Бейне мысал", "Техника үлгісі (YouTube)");
    } else if (data.answer && String(data.answer).trim()) {
      appendBubble("bot", data.answer);
      setVideo(data.video || null, "Ұқсас бейне", "Кіріктірілген бейне (YouTube)");
    } else {
      appendBubble("bot", "(жауап жоқ)");
      setVideo(null);
    }
  }

  function populateExercises() {
    if (!exerciseSelect) return;
    fetch(apiUrl("/chat/exercises"))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const items = data.items || [];
        for (const row of items) {
          if (!row.id || !row.title) continue;
          const opt = document.createElement("option");
          opt.value = row.id;
          opt.textContent = row.title;
          exerciseSelect.appendChild(opt);
        }
      })
      .catch(() => {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "Тізім қолжетімсіз (серверді тексеріңіз)";
        opt.disabled = true;
        exerciseSelect.appendChild(opt);
      });
  }

  /**
   * @param {{ preserveInput?: boolean }} [opts]
   */
  function sendChat(opts) {
    const preserveInput = opts?.preserveInput === true;
    const rawMsg = input.value.trim();
    const exId = exerciseSelect ? exerciseSelect.value.trim() : "";

    if (!rawMsg && !exId) return;

    let titleFromSelect = "";
    if (exId && exerciseSelect) {
      const opt = exerciseSelect.selectedOptions[0];
      titleFromSelect = opt && opt.value ? opt.textContent.trim() : "";
    }

    const msgSameAsTitle =
      Boolean(exId && titleFromSelect && rawMsg && rawMsg === titleFromSelect);
    const msg = msgSameAsTitle ? "" : rawMsg;

    let userLine = rawMsg;
    if (exId && titleFromSelect) {
      userLine = msg ? `${titleFromSelect} — ${msg}` : titleFromSelect;
    }
    appendBubble("user", userLine);

    const payload = {};
    if (exId) payload.exercise_id = exId;
    if (msg) payload.message = msg;
    if (exId && !msg) payload.message = "";

    if (!preserveInput) {
      input.value = "";
    }

    if (activeSend) activeSend.abort();
    activeSend = new AbortController();

    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    if (exerciseSelect) exerciseSelect.disabled = true;

    fetch(apiUrl("/chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: activeSend.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        renderBotReply(data);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        appendBubble("bot", "Қате шықты. Сервер іске қосулы ма?");
        setVideo(null);
      })
      .finally(() => {
        activeSend = null;
        if (btn) btn.disabled = false;
        if (exerciseSelect) exerciseSelect.disabled = false;
        input.focus();
      });
  }

  appendBubble(
    "bot",
    "Тізімнен жаттығуды таңдаңыз — атауы өріске қойылып, бірден сұраныс жіберіледі (мәтін және бейне). Немесе кілт сөзбен сұрақ жазыңыз (қыздыру, жарақат, ереже...) және «Жіберу» батырмасын басыңыз."
  );

  const prefill = new URLSearchParams(window.location.search).get("q");
  if (prefill && prefill.trim()) {
    input.value = prefill.trim();
    sendChat({ preserveInput: false });
  }

  populateExercises();

  if (exerciseSelect) {
    exerciseSelect.addEventListener("change", () => {
      const id = exerciseSelect.value.trim();
      if (!id) return;
      const opt = exerciseSelect.selectedOptions[0];
      const title = opt && opt.value ? opt.textContent.trim() : "";
      if (title) {
        input.value = title;
        sendChat({ preserveInput: true });
      }
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    sendChat({ preserveInput: false });
  });
})();
