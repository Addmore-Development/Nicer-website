/* NiCER — News and Events page. Reads published items from the "news" table and renders them safely (textContent only). */
(function () {
  "use strict";
  var P = window.NicerPublic, doc = document;
  var grid = doc.getElementById("nm-grid"); if (!grid || !P) return;
  var chipsEl = doc.getElementById("nm-chips"), emptyEl = doc.getElementById("nm-empty"), statusEl = doc.getElementById("nm-status");
  var dlg = doc.getElementById("nm-dlg");
  var KINDS = { news: "News", press: "Press release", media: "Media coverage", event: "Event", publication: "Publication", video: "Video" };
  var PLURAL = { news: "News", press: "Press releases", media: "Media coverage", event: "Events", publication: "Publications", video: "Videos" };
  var items = [], filter = "all", lastFocus = null;

  var ARC = '<svg viewBox="0 0 400 260" aria-hidden="true"><path d="M10 170C60 60 210 10 390 20C260 55 170 120 130 250C60 235 20 215 10 170Z" fill="#F38406" fill-opacity=".55"/><path d="M45 210C85 120 220 60 395 66C280 100 200 150 170 255C110 250 65 240 45 210Z" fill="#95C21D" fill-opacity=".5"/></svg>';

  function el(tag, cls, text) { var n = doc.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function fmt(d) { try { return new Date(String(d).slice(0, 10) + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return ""; } }
  function isEvent(it) { return it.kind === "event"; }
  function evDate(it) { return it.event_date ? String(it.event_date).slice(0, 10) : ""; }
  function isUpcoming(it) { var d = evDate(it); return !!d && d >= new Date().toISOString().slice(0, 10); }
  function meta(it) {
    var m = el("div", "nm-card__meta"); m.appendChild(el("span", "badge badge--navy", KINDS[it.kind] || "News"));
    if (isEvent(it) && evDate(it)) {
      m.appendChild(el("span", isUpcoming(it) ? "badge badge--green" : "badge", isUpcoming(it) ? "Upcoming" : "Past"));
      m.appendChild(el("span", null, fmt(evDate(it))));
      if (it.event_location) m.appendChild(el("span", null, it.event_location));
    } else if (it.published_at) m.appendChild(el("span", null, fmt(it.published_at)));
    return m;
  }
  function image(it) {
    var wrap = el("div", "nm-card__img"), u = it.image_url && P.safeUrl(it.image_url);
    if (u) { var i = new Image(); i.src = u; i.alt = ""; i.loading = "lazy"; i.decoding = "async"; i.onerror = function () { i.remove(); wrap.insertAdjacentHTML("beforeend", ARC); }; wrap.appendChild(i); }
    else wrap.insertAdjacentHTML("beforeend", ARC);
    return wrap;
  }
  function card(it, featured) {
    var b = el("button", "nm-card" + (featured ? " is-featured" : "")); b.type = "button";
    b.appendChild(image(it));
    var body = el("div", "nm-card__body"); body.appendChild(meta(it)); body.appendChild(el("h3", null, it.title));
    var sum = it.summary || (it.body || "").slice(0, 220); if (sum) body.appendChild(el("p", null, sum));
    body.appendChild(el("span", "nm-card__more", "Read more →")); b.appendChild(body);
    b.addEventListener("click", function () { open(it); }); return b;
  }
  function render() {
    var list = items.filter(function (i) { return filter === "all" || i.kind === filter; });
    if (filter === "event") list.sort(function (a, b) {
      var ua = isUpcoming(a), ub = isUpcoming(b); if (ua !== ub) return ua ? -1 : 1;
      var da = evDate(a), db = evDate(b); return ua ? (da < db ? -1 : da > db ? 1 : 0) : (da < db ? 1 : da > db ? -1 : 0);
    });
    grid.textContent = ""; grid.setAttribute("aria-busy", "false");
    emptyEl.hidden = list.length > 0; grid.hidden = list.length === 0;
    if (!list.length && items.length) { doc.getElementById("nm-empty-text").textContent = (filter === "event" ? "No events are listed right now. Check back soon, or see all updates." : "Nothing in this category yet. Try another filter."); }
    list.forEach(function (it, idx) { grid.appendChild(card(it, filter === "all" && idx === 0 && it.featured)); });
    statusEl.textContent = list.length + (list.length === 1 ? " item" : " items") + " shown";
  }
  function chips() {
    var present = {}; items.forEach(function (i) { present[i.kind] = true; });
    present.news = present.event = !!items.length;
    var kinds = Object.keys(KINDS).filter(function (k) { return present[k]; });
    chipsEl.textContent = ""; if (!items.length) { chipsEl.hidden = true; return; }
    chipsEl.hidden = false;
    [["all", "All"]].concat(kinds.map(function (k) { return [k, PLURAL[k]]; })).forEach(function (p) {
      var c = el("button", "chip", p[1]); c.type = "button"; c.setAttribute("aria-pressed", p[0] === filter ? "true" : "false");
      c.addEventListener("click", function () { filter = p[0]; Array.prototype.forEach.call(chipsEl.children, function (x) { x.setAttribute("aria-pressed", x === c ? "true" : "false"); }); render(); });
      chipsEl.appendChild(c);
    });
  }
  function open(it) {
    lastFocus = doc.activeElement;
    var img = doc.getElementById("nm-dlg-img"); img.textContent = "";
    var u = it.image_url && P.safeUrl(it.image_url); if (u) { var i = new Image(); i.src = u; i.alt = ""; img.appendChild(i); }
    var m = doc.getElementById("nm-dlg-meta"); m.textContent = ""; m.appendChild(el("span", "badge badge--navy", KINDS[it.kind] || "News"));
    if (isEvent(it) && evDate(it)) { m.appendChild(el("span", null, fmt(evDate(it)))); if (it.event_location) m.appendChild(el("span", null, it.event_location)); }
    else if (it.published_at) m.appendChild(el("span", null, fmt(it.published_at)));
    doc.getElementById("nm-dlg-title").textContent = it.title;
    doc.getElementById("nm-dlg-body").textContent = it.body || it.summary || "";
    var l = doc.getElementById("nm-dlg-link"); l.textContent = ""; var lu = it.link_url && P.safeUrl(it.link_url);
    if (lu) { var a = el("a", "btn btn--primary btn--sm", "Read the full story"); a.href = lu; a.target = "_blank"; a.rel = "noopener"; l.appendChild(a); }
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    try { history.replaceState(null, "", "#post-" + it.id); } catch (e) {}
  }
  function close() { if (dlg.close) dlg.close(); else dlg.removeAttribute("open"); }
  doc.getElementById("nm-dlg-x").addEventListener("click", close);
  dlg.addEventListener("click", function (e) { if (e.target === dlg) close(); });
  dlg.addEventListener("close", function () { try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} if (lastFocus && lastFocus.focus) lastFocus.focus(); });

  P.get("news?select=*&is_published=eq.true&order=featured.desc,published_at.desc.nullslast,created_at.desc").then(function (rows) {
    items = rows || []; chips(); render();
    var m = /^#post-(.+)$/.exec(location.hash); if (m) { var it = items.filter(function (i) { return i.id === m[1]; })[0]; if (it) open(it); }
  }).catch(function (e) {
    items = []; chips(); render();
    if (e && e.message === "not-configured") doc.getElementById("nm-empty-text").textContent = "News is not connected yet. Add the Supabase details to assets/js/supabase-config.js.";
    else doc.getElementById("nm-empty-text").textContent = "We couldn't load the latest updates just now. Please try again shortly.";
  });
})();