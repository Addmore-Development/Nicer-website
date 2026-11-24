/* NiCER website chatbot widget. Progressive enhancement: the site works without it.
   Talks to /api/chat (api/chat.js). Styles live in styles.css, section "Website chatbot". */
(function () {
  "use strict";
  var doc = document;
  var me = doc.currentScript || doc.querySelector('script[src*="chatbot.js"]');
  var base = me ? me.src.replace(/assets\/js\/chatbot\.js.*$/, "") : "/";
  var API = (window.NICER_API_BASE || "") + "/api/chat";
  var KEY = "nicer-chat-v1", MAX_LEN = 500;
  var EMAIL = "mutangwa@khoro.co.za", PHONE = "+27728957425", PHONE_TXT = "+27 72 895 7425";

  var CHIPS = ["What does NiCER do?", "Tell me about the programmes", "How can my organisation get involved?", "How do I contact NiCER?"];
  var GREETING = "Hi, I'm NiCER's website assistant. Ask me about our programmes, partners or how to work with us.";

  var history = [], busy = false;
  try { history = JSON.parse(sessionStorage.getItem(KEY) || "[]").filter(function (m) { return m && m.content; }).slice(-20); } catch (e) {}
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(history.slice(-20))); } catch (e) {} }

  function el(tag, cls, text) { var n = doc.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  var ICON_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.8 8.8 0 0 1-3.6-.8L3 21l1.9-5A8.4 8.4 0 1 1 21 11.5z"/></svg>';
  var ICON_X = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12"/></svg>';
  var ICON_SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';

  /* ---------- build ---------- */
  var launch = el("button", "cb-launch"); launch.type = "button";
  launch.setAttribute("aria-expanded", "false"); launch.setAttribute("aria-controls", "cb");
  launch.innerHTML = ICON_CHAT + "<span>Ask NiCER</span>";

  var box = el("section", "cb"); box.id = "cb"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "NiCER chat assistant");
  var head = el("div", "cb__head");
  var av = el("img", "cb__av"); av.src = base + "assets/img/mark.png"; av.alt = ""; av.width = 40; av.height = 40;
  var ttl = el("div"); ttl.innerHTML = "<strong>NiCER assistant</strong><small>AI assistant · answers about NiCER</small>";
  var close = el("button", "cb__close"); close.type = "button"; close.setAttribute("aria-label", "Close chat"); close.innerHTML = ICON_X;
  head.appendChild(av); head.appendChild(ttl); head.appendChild(close);
  var log = el("div", "cb__log"); log.setAttribute("role", "log"); log.setAttribute("aria-live", "polite");
  var chips = el("div", "cb__chips");
  var form = el("form", "cb__form"); form.setAttribute("autocomplete", "off");
  var input = el("input"); input.type = "text"; input.maxLength = MAX_LEN; input.placeholder = "Type your question…"; input.setAttribute("aria-label", "Your question");
  var send = el("button"); send.type = "submit"; send.setAttribute("aria-label", "Send"); send.innerHTML = ICON_SEND;
  form.appendChild(input); form.appendChild(send);
  var note = el("p", "cb__note", "AI answers can be wrong. For anything important, please contact us directly.");
  [head, log, chips, form, note].forEach(function (n) { box.appendChild(n); });
  doc.body.appendChild(launch); doc.body.appendChild(box);

  /* ---------- rendering ---------- */
  function scroll() { log.scrollTop = log.scrollHeight; }
  function textBlocks(parent, text) {
    var list = null;
    text.split("\n").forEach(function (line) {
      line = line.trim(); if (!line) { list = null; return; }
      if (/^[-•]\s+/.test(line)) {
        if (!list) { list = el("ul"); parent.appendChild(list); }
        list.appendChild(el("li", null, line.replace(/^[-•]\s+/, "")));
      } else { list = null; parent.appendChild(el("p", null, line)); }
    });
  }
  function addMsg(role, text, links, extra) {
    var m = el("div", "cb__m cb__m--" + (role === "user" ? "me" : "bot"));
    textBlocks(m, text);
    if ((links && links.length) || extra) {
      var src = el("div", "cb__src");
      (links || []).forEach(function (l, i) {
        var a = el("a", i === 0 ? "is-primary" : "", l.label); a.href = base + l.href.replace(/^\//, ""); src.appendChild(a);
      });
      if (extra) extra(src);
      m.appendChild(src);
    }
    log.appendChild(m); scroll(); return m;
  }
  function typing() { var t = el("div", "cb__typing"); t.setAttribute("aria-label", "Assistant is typing"); t.innerHTML = "<i></i><i></i><i></i>"; log.appendChild(t); scroll(); return t; }
  function contactButtons(src) {
    var a = el("a", "", "Email us"); a.href = "mailto:" + EMAIL; src.appendChild(a);
    var b = el("a", "", "Call " + PHONE_TXT); b.href = "tel:" + PHONE; src.appendChild(b);
    var c = el("a", "", "Contact page"); c.href = base + "contact.html"; src.appendChild(c);
  }
  function showChips() {
    chips.textContent = "";
    CHIPS.forEach(function (q) { var b = el("button", "", q); b.type = "button"; b.addEventListener("click", function () { ask(q); }); chips.appendChild(b); });
  }

  /* ---------- conversation ---------- */
  function ask(q) {
    q = (q || "").trim().slice(0, MAX_LEN);
    if (!q || busy) return;
    busy = true; chips.textContent = ""; input.value = "";
    addMsg("user", q); history.push({ role: "user", content: q }); save();
    var t = typing(); send.disabled = true;
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 30000);
    fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history.slice(-10) }), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, status: r.status, d: d }; }); })
      .then(function (x) {
        t.remove();
        if (x.ok && x.d.reply) { history.push({ role: "assistant", content: x.d.reply }); save(); addMsg("bot", x.d.reply, x.d.links); return; }
        history.pop(); save();
        if (window.console) console.warn("NiCER chat error", x.status, x.d);
        if (x.status === 429) addMsg("bot", "You've asked a lot of questions in a short time. Please try again in a few minutes, or reach us directly.", null, contactButtons);
        else addMsg("bot", "Sorry, I can't answer right now. You can reach the NiCER team directly:", null, contactButtons);
      })
      .catch(function () { t.remove(); history.pop(); save(); addMsg("bot", "Sorry, I couldn't connect. Please try again, or reach the NiCER team directly:", null, contactButtons); })
      .then(function () { clearTimeout(timer); busy = false; send.disabled = false; if (box.classList.contains("is-open")) input.focus(); });
  }

  function open(on) {
    box.classList.toggle("is-open", on); launch.setAttribute("aria-expanded", on ? "true" : "false");
    if (on) {
      if (!log.childNodes.length) {
        addMsg("bot", GREETING);
        history.forEach(function (m) { addMsg(m.role, m.content); });
        if (!history.length) showChips();
      }
      setTimeout(function () { input.focus(); scroll(); }, 60);
    } else launch.focus();
  }
  launch.addEventListener("click", function () { open(true); });
  close.addEventListener("click", function () { open(false); });
  form.addEventListener("submit", function (e) { e.preventDefault(); ask(input.value); });
  doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && box.classList.contains("is-open")) open(false); });
})();
