/* NiCER — News and Events page.
   Reads published rows from the "news" table (see supabase/schema.sql) and renders them with textContent only.
   Interactive: next-event countdown, type tabs with counts, search, sort, card/list layout, events calendar,
   add-to-calendar (.ics), copy link, and previous/next inside the story pop-up. */
(function () {
  "use strict";

  /* Show clearly-labelled sample content while the news table is empty or not connected yet.
     Set to false at launch if you would rather show the plain "Updates will appear here" message. */
  var DEMO_WHEN_EMPTY = true;

  var doc = document, P = window.NicerPublic;
  var grid = doc.getElementById("nm-grid"); if (!grid) return;
  function $(id) { return doc.getElementById(id); }
  function safeUrl(u) { try { var x = new URL(u); return (x.protocol === "https:" || x.protocol === "http:") ? x.href : null; } catch (e) { return null; } }
  P = P || { get: function () { return Promise.reject(new Error("not-configured")); }, safeUrl: safeUrl };
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var KINDS = { news: "News", event: "Event", press: "Press release", media: "Media coverage", publication: "Publication", video: "Video" };
  var PLURAL = { news: "News", event: "Events", press: "Press releases", media: "Media coverage", publication: "Publications", video: "Videos" };
  var ORDER = ["news", "event", "press", "media", "publication", "video"];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  var items = [], demo = false, tab = "all", q = "", sort = "new", view = "grid", dateFilter = "", cal = null;
  var shown = [], openIdx = -1, lastFocus = null, tickTimer = null;

  /* ---------- helpers ---------- */
  function el(tag, cls, text) { var n = doc.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function today() { return ymd(new Date()); }
  function parse(s) { return new Date(String(s).slice(0, 10) + "T00:00:00"); }
  function fmt(s) { try { return parse(s).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return ""; } }
  function isEvent(it) { return it.kind === "event"; }
  function evDate(it) { return it.event_date ? String(it.event_date).slice(0, 10) : ""; }
  function isUpcoming(it) { var d = evDate(it); return !!d && d >= today(); }
  function when(it) { return isEvent(it) && evDate(it) ? evDate(it) : String(it.published_at || it.created_at || "").slice(0, 10); }
  function sortKey(it) { return tab === "event" && evDate(it) ? evDate(it) : String(it.published_at || it.created_at || "").slice(0, 10); }
  function readTime(it) { var w = String((it.body || "") + " " + (it.summary || "")).trim().split(/\s+/).length; return Math.max(1, Math.round(w / 200)) + " min read"; }
  function svg(path) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + path + "</svg>"; }
  var ICON = {
    pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'
  };
  function withIcon(tag, cls, icon, text) { var n = el(tag, cls); n.insertAdjacentHTML("beforeend", svg(ICON[icon])); n.appendChild(doc.createTextNode(" " + text)); return n; }

  /* ---------- sample content (dates are relative to today so "upcoming" always makes sense) ---------- */
  function off(n) { var d = new Date(); d.setDate(d.getDate() + n); return ymd(d); }
  function sample() {
    function it(id, kind, title, summary, body, o) { return Object.assign({ id: "demo-" + id, kind: kind, title: title, summary: summary, body: body, image_url: null, link_url: null, featured: false, is_published: true, demo: true }, o); }
    return [
      it("hub", "news", "Introducing the NiCER News and Events hub", "One place for announcements, events and resources from across the NiCER network.",
        "This is where the NiCER team will share what is happening across the network: new programme intakes, events, partnerships and publications.\n\nUse the tabs to browse by type, search for a topic, or open the calendar to see what is coming up. Events can be added straight to your own calendar.",
        { published_at: off(-2), featured: true }),
      it("lab", "event", "Research to Innovation Lab: open day", "Meet the team, see how the Lab works and find out how to take part.",
        "Join us for an open day on the Research to Innovation Lab. We will walk through how the programme works, what support is available to researchers, and how to apply.\n\nThere will be time for questions at the end. Everyone interested in turning research into impact is welcome.",
        { published_at: off(-9), event_date: off(6), event_location: "Johannesburg" }),
      it("ice", "event", "iCE-Cold Networking evening", "An informal evening to meet other researchers, founders and ecosystem builders.",
        "A relaxed, online evening designed for making real connections across the NiCER ecosystem. Come with a question, an idea or an offer to help.",
        { published_at: off(-5), event_date: off(21), event_location: "Online" }),
      it("acc", "event", "Innovation to Market Accelerator: pitch showcase", "See early-stage ventures present what they have been building.",
        "Cohort teams share their progress and what they need next. A good chance to meet founders, mentors and potential partners.",
        { published_at: off(-3), event_date: off(48), event_location: "Johannesburg" }),
      it("ws", "event", "NiCER Academy: researcher workshop", "A practical session on communicating research to non-specialists.",
        "A hands-on workshop from the NiCER Academy. Participants practised explaining their work clearly to funders, partners and the public.",
        { published_at: off(-30), event_date: off(-18), event_location: "Online" }),
      it("psy", "news", "Discover your entrepreneurial profile", "The NiCER psychometric test is a quick way to reflect on how you approach innovation.",
        "The short psychometric test helps you understand your strengths when it comes to enterprise and innovation. It takes only a few minutes and is free to take.\n\nThe results can help you decide which NiCER programme is the best next step.",
        { published_at: off(-6) }),
      it("soc", "news", "How Innovation for Social Investment works", "A plain-language explainer on the programme, who it is for, and how to join.",
        "Innovation for Social Investment connects research-based ideas with the people and organisations that can help them create social impact.\n\nThis explainer covers who the programme is for, what participants can expect, and how to sign up.",
        { published_at: off(-14) }),
      it("media", "press", "Working with the NiCER media team", "Contact details, brand assets and a short boilerplate for journalists and partners.",
        "Journalists and partners can find the media contact, logo files and an approved description of NiCER in the Media centre further down this page.\n\nFor interviews or comment, get in touch with the team directly.",
        { published_at: off(-20) }),
      it("guide", "publication", "A short guide to research commercialisation", "From idea to impact: the main steps, explained simply.",
        "Taking research to market involves more than a good idea. This guide outlines the main stages, the questions to ask at each one, and where NiCER programmes can help.",
        { published_at: off(-35) }),
      it("video", "video", "Walkthrough: signing up to a programme", "A two-minute tour of how to register your interest.",
        "A short walkthrough of the sign-up form on each programme page, so you know exactly what to expect before you start.",
        { published_at: off(-45) })
    ];
  }

  /* ---------- generated cover art (no photos needed) ---------- */
  var PAL = {
    news: ["#032241", "#164573", "#95C21D", "#F38406"], event: ["#032241", "#0A3158", "#F38406", "#95C21D"],
    press: ["#021830", "#164573", "#9DB4CC", "#F38406"], media: ["#021830", "#164573", "#9DB4CC", "#F38406"],
    publication: ["#0A3158", "#245B8F", "#95C21D", "#FFB35C"], video: ["#032241", "#245B8F", "#F38406", "#FFB35C"]
  };
  var GLYPH = {
    news: '<path d="M4 5h12a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2z"/><path d="M8 9h6M8 12.5h6M8 16h3"/>',
    event: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
    press: '<path d="M4 13v-2a1 1 0 0 1 1-1h3l7-4v12l-7-4H5a1 1 0 0 1-1-1z"/><path d="M18 9.5a4 4 0 0 1 0 5"/>',
    media: '<path d="M4 13v-2a1 1 0 0 1 1-1h3l7-4v12l-7-4H5a1 1 0 0 1-1-1z"/><path d="M18 9.5a4 4 0 0 1 0 5"/>',
    publication: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
    video: '<rect x="3.5" y="5.5" width="17" height="13" rx="3"/><path d="m10.5 9.5 4 2.5-4 2.5z"/>'
  };
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function art(it) {
    var p = PAL[it.kind] || PAL.news, h = hash(String(it.id || it.title)), rot = (h % 50) - 25, sc = (0.85 + ((h >> 3) % 6) / 10).toFixed(2), gid = "nmg" + (h % 99991);
    return '<svg class="nm-art" viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + p[0] + '"/><stop offset="1" stop-color="' + p[1] + '"/></linearGradient></defs>' +
      '<rect width="400" height="225" fill="url(#' + gid + ')"/>' +
      '<g transform="translate(200 112) rotate(' + rot + ') scale(' + sc + ') translate(-200 -112)"><path d="M-10 190C60 60 230 0 420 10C280 50 180 120 140 250C60 235 0 215 -10 190Z" fill="' + p[3] + '" fill-opacity=".55"/><path d="M30 230C90 130 240 70 430 76C300 110 210 160 180 260C110 255 50 250 30 230Z" fill="' + p[2] + '" fill-opacity=".5"/></g>' +
      '<circle cx="345" cy="52" r="30" fill="#fff" fill-opacity=".14"/><g transform="translate(327 34) scale(1.5)" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + (GLYPH[it.kind] || GLYPH.news) + "</g></svg>";
  }
  function cover(it, cls) {
    var wrap = el("div", cls), u = it.image_url && P.safeUrl(it.image_url);
    wrap.insertAdjacentHTML("beforeend", art(it));
    if (u) { var i = new Image(); i.alt = ""; i.decoding = "async"; i.onload = function () { wrap.textContent = ""; wrap.appendChild(i); if (cls === "nm-card__img") addDate(wrap, it); }; i.src = u; }
    if (cls === "nm-card__img") addDate(wrap, it);
    return wrap;
  }
  function addDate(wrap, it) {
    if (!isEvent(it) || !evDate(it) || wrap.querySelector(".nm-date")) return;
    var d = parse(evDate(it)), b = el("div", "nm-date"); b.appendChild(el("b", null, String(d.getDate()))); b.appendChild(el("span", null, MONTHS[d.getMonth()].slice(0, 3)));
    wrap.appendChild(b);
  }

  /* ---------- add to calendar (.ics) ---------- */
  function download(name, type, text) {
    var a = doc.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: type })); a.download = name; doc.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }
  function ics(it) {
    var s = evDate(it); if (!s) return;
    var e = parse(s); e.setDate(e.getDate() + 1);
    function esc(v) { return String(v || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }
    var stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//NiCER//News and Events//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT", "UID:" + it.id + "@nicer.org", "DTSTAMP:" + stamp,
      "DTSTART;VALUE=DATE:" + s.replace(/-/g, ""), "DTEND;VALUE=DATE:" + ymd(e).replace(/-/g, ""), "SUMMARY:" + esc(it.title),
      it.event_location ? "LOCATION:" + esc(it.event_location) : null, "DESCRIPTION:" + esc(it.summary || ""), "END:VEVENT", "END:VCALENDAR"].filter(Boolean);
    download(String(it.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) + ".ics", "text/calendar", lines.join("\r\n"));
  }

  /* ---------- filtering ---------- */
  function visible() {
    var term = q.trim().toLowerCase();
    var list = items.filter(function (i) {
      if (tab !== "all" && i.kind !== tab) return false;
      if (dateFilter && !(isEvent(i) && evDate(i) === dateFilter)) return false;
      return !term || [i.title, i.summary, i.body, i.event_location].join(" ").toLowerCase().indexOf(term) !== -1;
    });
    list.sort(function (a, b) {
      if (tab === "event" && sort === "new") {
        var ua = isUpcoming(a), ub = isUpcoming(b); if (ua !== ub) return ua ? -1 : 1;
        var da = evDate(a), db = evDate(b); return ua ? (da < db ? -1 : da > db ? 1 : 0) : (da < db ? 1 : da > db ? -1 : 0);
      }
      var x = sortKey(a), y = sortKey(b); if (x === y) return 0; return sort === "new" ? (x < y ? 1 : -1) : (x < y ? -1 : 1);
    });
    if (sort === "new" && tab === "all" && !term && !dateFilter) {
      var f = list.filter(function (i) { return i.featured; })[0];
      if (f) { list.splice(list.indexOf(f), 1); list.unshift(f); }
    }
    return list;
  }

  /* ---------- rendering ---------- */
  function meta(it) {
    var m = el("div", "nm-card__meta"); m.appendChild(el("span", "badge badge--navy", KINDS[it.kind] || "News"));
    if (isEvent(it) && evDate(it)) {
      m.appendChild(el("span", "badge " + (isUpcoming(it) ? "badge--green" : ""), isUpcoming(it) ? "Upcoming" : "Past"));
      if (it.event_location) m.appendChild(withIcon("span", "nm-where", "pin", it.event_location));
    } else {
      var d = when(it); if (d) m.appendChild(el("span", null, fmt(d)));
      m.appendChild(el("span", null, readTime(it)));
    }
    return m;
  }
  function card(it, idx, featured) {
    var b = el("button", "nm-card nm-rv" + (featured ? " is-featured" : "") + (isEvent(it) && !isUpcoming(it) ? " is-past" : "")); b.type = "button";
    b.style.setProperty("--i", Math.min(idx, 8));
    b.appendChild(cover(it, "nm-card__img"));
    var body = el("div", "nm-card__body"); body.appendChild(meta(it)); body.appendChild(el("h3", null, it.title));
    if (isEvent(it) && evDate(it)) body.appendChild(withIcon("span", "nm-tag", "cal", fmt(evDate(it))));
    var sum = it.summary || (it.body || "").slice(0, 200); if (sum) body.appendChild(el("p", null, sum));
    body.appendChild(el("span", "nm-card__more", isEvent(it) ? "Details and calendar →" : "Read more →")); b.appendChild(body);
    b.addEventListener("click", function () { openStory(it); });
    if (!reduce) b.addEventListener("pointermove", function (e) { if (e.pointerType !== "mouse") return; var r = b.getBoundingClientRect(); b.style.setProperty("--mx", (e.clientX - r.left) + "px"); b.style.setProperty("--my", (e.clientY - r.top) + "px"); });
    return b;
  }
  var io = null;
  function reveal(cards) {
    if (!("IntersectionObserver" in window) || reduce) { cards.forEach(function (c) { c.classList.add("nm-in"); }); return; }
    if (io) io.disconnect();
    io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("nm-in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -6% 0px" });
    cards.forEach(function (c) { io.observe(c); });
    setTimeout(function () { cards.forEach(function (c) { c.classList.add("nm-in"); }); }, 2500);
  }
  function render() {
    shown = visible();
    grid.textContent = ""; grid.setAttribute("aria-busy", "false"); grid.classList.toggle("is-list", view === "list");
    var filtered = !!(q.trim() || dateFilter || tab !== "all");
    $("nm-empty").hidden = shown.length > 0; grid.hidden = shown.length === 0; $("nm-clear").hidden = !filtered || !items.length;
    if (!shown.length && items.length) {
      $("nm-empty-h").textContent = "No matches";
      $("nm-empty-text").textContent = dateFilter ? "There are no events on " + fmt(dateFilter) + "." : tab === "event" ? "No events are listed right now. Check back soon." : "Nothing matches your search. Try different words or another type.";
    }
    var cards = shown.map(function (it, i) { return card(it, i, view === "grid" && i === 0 && sort === "new" && tab === "all" && !q.trim() && !dateFilter && it.featured); });
    cards.forEach(function (c) { grid.appendChild(c); }); reveal(cards);
    $("nm-status").textContent = shown.length + (shown.length === 1 ? " item" : " items") + " shown";
    renderActive(); renderCal();
  }
  function renderActive() {
    var box = $("nm-active"); box.textContent = ""; var any = false;
    function pill(t, fn) { var b = el("button", "nm-pill", t + "  ✕"); b.type = "button"; b.setAttribute("aria-label", "Remove filter: " + t); b.addEventListener("click", fn); box.appendChild(b); any = true; }
    if (dateFilter) pill("Date: " + fmt(dateFilter), function () { dateFilter = ""; render(); });
    if (q.trim()) pill("Search: " + q.trim(), function () { q = ""; $("nm-q").value = ""; render(); });
    box.hidden = !any;
  }
  function renderTabs() {
    var box = $("nm-tabs"); box.textContent = "";
    var counts = { all: items.length }; items.forEach(function (i) { counts[i.kind] = (counts[i.kind] || 0) + 1; });
    var kinds = ORDER.filter(function (k) { return counts[k] || k === "news" || k === "event"; });
    box.hidden = !items.length;
    [["all", "All"]].concat(kinds.map(function (k) { return [k, PLURAL[k]]; })).forEach(function (p) {
      var b = el("button", null, p[1]); b.type = "button"; b.setAttribute("aria-pressed", p[0] === tab ? "true" : "false");
      b.appendChild(el("i", null, String(counts[p[0]] || 0)));
      b.addEventListener("click", function () { tab = p[0]; if (tab !== "all" && tab !== "event") dateFilter = ""; Array.prototype.forEach.call(box.children, function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); render(); });
      box.appendChild(b);
    });
  }
  function setTab(k) { tab = k; renderTabs(); }

  /* ---------- calendar ---------- */
  function renderCal() {
    var box = $("nm-cal"), evs = items.filter(function (i) { return isEvent(i) && evDate(i); });
    $("nm-layout").classList.toggle("has-cal", evs.length > 0 && (tab === "all" || tab === "event")); box.hidden = !(evs.length > 0 && (tab === "all" || tab === "event"));
    if (box.hidden) return;
    if (!cal) { var n = evs.filter(isUpcoming).sort(function (a, b) { return evDate(a) < evDate(b) ? -1 : 1; })[0], d = parse(n ? evDate(n) : today()); cal = { y: d.getFullYear(), m: d.getMonth() }; }
    var by = {}; evs.forEach(function (e) { by[evDate(e)] = (by[evDate(e)] || 0) + 1; });
    box.textContent = "";
    var h = el("div", "nm-cal__h"), prev = el("button", null, "‹"), next = el("button", null, "›"); prev.type = next.type = "button";
    prev.setAttribute("aria-label", "Previous month"); next.setAttribute("aria-label", "Next month");
    function go(dm) { var d = new Date(cal.y, cal.m + dm, 1); cal = { y: d.getFullYear(), m: d.getMonth() }; renderCal(); var f = $("nm-cal").querySelector(dm < 0 ? "[aria-label='Previous month']" : "[aria-label='Next month']"); if (f) f.focus(); }
    prev.addEventListener("click", function () { go(-1); }); next.addEventListener("click", function () { go(1); });
    h.appendChild(prev); h.appendChild(el("h3", null, MONTHS[cal.m] + " " + cal.y)); h.appendChild(next); box.appendChild(h);
    var g = el("div", "nm-cal__g"); ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].forEach(function (w) { g.appendChild(el("span", "nm-cal__w", w)); });
    var lead = (new Date(cal.y, cal.m, 1).getDay() + 6) % 7, days = new Date(cal.y, cal.m + 1, 0).getDate(), t = today();
    for (var i = 0; i < lead; i++) g.appendChild(el("span"));
    for (var d = 1; d <= days; d++) (function (d) {
      var key = cal.y + "-" + pad(cal.m + 1) + "-" + pad(d), n = by[key];
      if (!n) { g.appendChild(el("span", "nm-cal__d" + (key === t ? " is-today" : ""), String(d))); return; }
      var b = el("button", "nm-cal__d" + (key === t ? " is-today" : "") + (key < t ? " is-past" : ""), String(d)); b.type = "button";
      b.setAttribute("aria-pressed", dateFilter === key ? "true" : "false"); b.setAttribute("aria-label", d + " " + MONTHS[cal.m] + " " + cal.y + ", " + n + (n === 1 ? " event" : " events"));
      b.addEventListener("click", function () { dateFilter = dateFilter === key ? "" : key; if (dateFilter) setTab("event"); render(); });
      g.appendChild(b);
    })(d);
    box.appendChild(g);
    var f = el("p", "nm-cal__f"); f.insertAdjacentHTML("beforeend", '<span><i></i> Upcoming</span><span><i class="p"></i> Past</span>'); box.appendChild(f);
  }

  /* ---------- spotlight: next event with live countdown ---------- */
  var ARCS = '<svg class="nm-spot__arcs" viewBox="0 0 800 520" aria-hidden="true"><path d="M20 330C120 120 420 20 780 40C520 110 330 230 250 500C120 470 40 420 20 330Z" fill="#F38406" fill-opacity=".22"/><path d="M90 410C170 230 440 120 790 130C560 200 400 300 340 515C220 500 130 470 90 410Z" fill="#95C21D" fill-opacity=".2"/></svg>';
  function renderSpot() {
    var box = $("nm-spot"), n = items.filter(function (i) { return isEvent(i) && isUpcoming(i); }).sort(function (a, b) { return evDate(a) < evDate(b) ? -1 : 1; })[0];
    clearInterval(tickTimer); box.hidden = !n; if (!n) return;
    box.textContent = ""; box.insertAdjacentHTML("beforeend", ARCS);
    var inn = el("div", "nm-spot__in"), txt = el("div");
    txt.appendChild(el("span", "nm-eyebrow", "Next event")); txt.appendChild(el("h2", null, n.title));
    var m = el("p", "nm-spot__meta"); m.appendChild(withIcon("span", null, "cal", fmt(evDate(n)))); if (n.event_location) m.appendChild(withIcon("span", null, "pin", n.event_location)); txt.appendChild(m);
    if (n.summary) txt.appendChild(el("p", "nm-spot__sum", n.summary));
    var act = el("div", "nm-spot__act"), a = el("button", "btn btn--primary", "Event details"), b = el("button", "btn btn--ghost", "Add to calendar"); a.type = b.type = "button";
    a.addEventListener("click", function () { lastFocus = a; openStory(n); }); b.addEventListener("click", function () { ics(n); });
    act.appendChild(a); act.appendChild(b); txt.appendChild(act);
    var c = el("div", "nm-count"); c.setAttribute("role", "timer"); c.setAttribute("aria-label", "Countdown to " + n.title);
    var units = {}, target = parse(evDate(n)).getTime();
    ["days", "hours", "mins", "secs"].forEach(function (u) { var w = el("div", "nm-count__u"), v = el("b", null, "00"); w.appendChild(v); w.appendChild(el("span", null, u)); w.setAttribute("aria-hidden", "true"); c.appendChild(w); units[u] = v; });
    function set(u, v) { var s = pad(v); if (units[u].textContent !== s) { units[u].textContent = s; if (u === "secs" && !reduce) { units[u].classList.remove("bump"); void units[u].offsetWidth; units[u].classList.add("bump"); } } }
    function tick() {
      var ms = target - Date.now();
      if (ms <= 0) { c.textContent = ""; var t = el("div", "nm-today", "Happening today"); c.appendChild(t); clearInterval(tickTimer); return; }
      var s = Math.floor(ms / 1000); set("days", Math.floor(s / 86400)); set("hours", Math.floor(s % 86400 / 3600)); set("mins", Math.floor(s % 3600 / 60)); set("secs", s % 60);
    }
    tick(); if (!reduce) tickTimer = setInterval(tick, 1000);
    inn.appendChild(txt); inn.appendChild(c); box.appendChild(inn);
  }

  /* ---------- story pop-up ---------- */
  var dlg = $("nm-dlg");
  function openStory(it) {
    lastFocus = lastFocus || doc.activeElement; openIdx = shown.indexOf(it);
    var img = $("nm-dlg-img"); img.textContent = ""; img.appendChild(cover(it, "nm-dlg__cover"));
    var mt = $("nm-dlg-meta"); mt.textContent = ""; var mm = meta(it); while (mm.firstChild) mt.appendChild(mm.firstChild);
    $("nm-dlg-title").textContent = it.title;
    var f = $("nm-dlg-facts"); f.textContent = ""; f.hidden = !(isEvent(it) && evDate(it));
    if (!f.hidden) {
      var row = function (icon, dt, dd) { var r = el("div"); r.insertAdjacentHTML("beforeend", svg(ICON[icon])); var w = el("div"); w.appendChild(el("dt", null, dt)); w.appendChild(el("dd", null, dd)); r.appendChild(w); f.appendChild(r); };
      row("cal", "When", fmt(evDate(it))); if (it.event_location) row("pin", "Where", it.event_location);
    }
    var body = $("nm-dlg-body"); body.textContent = ""; String(it.body || it.summary || "").split(/\n{2,}/).forEach(function (p) { if (p.trim()) body.appendChild(el("p", null, p.trim())); });
    var act = $("nm-dlg-link"); act.textContent = "";
    function btn(label, cls, fn) { var b = el("button", "btn btn--sm " + cls, label); b.type = "button"; b.addEventListener("click", fn); act.appendChild(b); return b; }
    if (isEvent(it) && evDate(it)) { btn("Add to calendar", "btn--primary", function () { ics(it); }); var reg = el("a", "btn btn--sm btn--outline", "Register interest"); reg.href = "contact.html"; act.appendChild(reg); }
    var lu = it.link_url && P.safeUrl(it.link_url); if (lu) { var a = el("a", "btn btn--sm " + (isEvent(it) ? "btn--outline" : "btn--primary"), isEvent(it) ? "More information" : "Read the full story"); a.href = lu; a.target = "_blank"; a.rel = "noopener"; act.appendChild(a); }
    btn("Copy link", "btn--outline", function () { copy(location.origin + location.pathname + "#post-" + it.id); });
    $("nm-prev").disabled = openIdx <= 0; $("nm-next").disabled = openIdx < 0 || openIdx >= shown.length - 1; $("nm-msg").textContent = "";
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); }
    dlg.scrollTop = 0;
    try { history.replaceState(null, "", "#post-" + it.id); } catch (e) {}
  }
  function copy(text) {
    function ok() { $("nm-msg").textContent = "Link copied"; setTimeout(function () { $("nm-msg").textContent = ""; }, 2200); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, function () { fallback(); }); else fallback();
    function fallback() { var t = doc.createElement("textarea"); t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0"; doc.body.appendChild(t); t.select(); try { doc.execCommand("copy"); ok(); } catch (e) {} t.remove(); }
  }
  function step(d) { var n = openIdx + d; if (n >= 0 && n < shown.length) openStory(shown[n]); }
  function closeStory() { if (dlg.close) dlg.close(); else dlg.removeAttribute("open"); }
  $("nm-dlg-x").addEventListener("click", closeStory);
  $("nm-prev").addEventListener("click", function () { step(-1); }); $("nm-next").addEventListener("click", function () { step(1); });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) closeStory(); });
  dlg.addEventListener("keydown", function (e) { if (e.key === "ArrowLeft") step(-1); else if (e.key === "ArrowRight") step(1); });
  dlg.addEventListener("close", function () { try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} if (lastFocus && lastFocus.focus) lastFocus.focus(); lastFocus = null; });

  /* ---------- controls ---------- */
  var qTimer; $("nm-q").addEventListener("input", function () { var v = this.value; clearTimeout(qTimer); qTimer = setTimeout(function () { q = v; render(); }, 120); });
  $("nm-sort").addEventListener("change", function () { sort = this.value; render(); });
  function setView(v) { view = v; $("nm-v-grid").setAttribute("aria-pressed", v === "grid"); $("nm-v-list").setAttribute("aria-pressed", v === "list"); render(); }
  $("nm-v-grid").addEventListener("click", function () { setView("grid"); }); $("nm-v-list").addEventListener("click", function () { setView("list"); });
  $("nm-clear").addEventListener("click", function () { q = ""; $("nm-q").value = ""; dateFilter = ""; setTab("all"); render(); });

  /* ---------- load ---------- */
  function start(rows, isDemo) {
    items = rows; demo = isDemo; $("nm-demo").hidden = !demo; cal = null;
    renderTabs(); renderSpot(); render();
    var m = /^#post-(.+)$/.exec(location.hash); if (m) { var it = items.filter(function (i) { return i.id === m[1]; })[0]; if (it) { lastFocus = null; openStory(it); } }
  }
  window.addEventListener("hashchange", function () {
    var m = /^#post-(.+)$/.exec(location.hash); if (!m) return;
    var it = items.filter(function (i) { return i.id === m[1]; })[0]; if (it && !(dlg.open && $("nm-dlg-title").textContent === it.title)) openStory(it);
  });
  var force = /[?&]demo=1\b/.test(location.search);
  P.get("news?select=*&is_published=eq.true&order=featured.desc,published_at.desc.nullslast,created_at.desc").then(function (rows) {
    rows = rows || [];
    if ((!rows.length && DEMO_WHEN_EMPTY) || force) start(sample(), true); else start(rows, false);
  }).catch(function (e) {
    if (DEMO_WHEN_EMPTY && (!e || e.message === "not-configured" || force)) { start(sample(), true); return; }
    start([], false); $("nm-empty-text").textContent = "We couldn't load the latest updates just now. Please try again shortly.";
  });
})();