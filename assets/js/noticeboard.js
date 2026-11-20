/* NiCER Notice Board: shows live opportunities from /api/opportunities (see api/opportunities.js). */
(function () {
  "use strict";
  var CATS = { job: "Jobs", funding: "Funding", learnership: "Learnerships", scholarship: "Scholarships", bursary: "Bursaries", programme: "Programmes", event: "Events" };
  var ONE = { job: "Job", funding: "Funding", learnership: "Learnership", scholarship: "Scholarship", bursary: "Bursary", programme: "Programme", event: "Event" };
  var API = (window.NICER_API_BASE || "") + "/api/opportunities", PAGE = 24;
  var all = [], cat = "all", shown = PAGE, $ = function (i) { return document.getElementById(i); };

  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
  function fmt(s) { return new Date(s.length === 10 ? s + "T00:00:00" : s).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }); }
  function when(n) { return n.deadline ? "Closes " + fmt(n.deadline) : "Posted " + fmt(n.published); }
  function meta(n) { return [n.organisation || n.source, ONE[n.category], when(n)].join(" • "); }
  function safe(u) { try { var x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : null; } catch (e) { return null; } }

  function card(n) {
    var c = el("article", "card");
    if (Date.now() - new Date(n.published) < 7 * 864e5) c.appendChild(el("span", "badge", "New"));
    c.appendChild(el("h3", null, n.title)); c.appendChild(el("p", "meta", meta(n)));
    var b = el("button", "btn", "View Details"); b.type = "button"; b.addEventListener("click", function () { detail(n); });
    c.appendChild(b); return c;
  }
  function detail(n) {
    var d = $("nb-dlg"), u = safe(n.url); d.textContent = "";
    d.appendChild(el("span", "badge", ONE[n.category])); d.appendChild(el("h3", null, n.title));
    d.appendChild(el("p", "meta", [n.organisation || n.source, n.location, when(n)].filter(Boolean).join(" • ")));
    if (n.summary) d.appendChild(el("p", null, n.summary));
    d.appendChild(el("p", "note", "Listing found on " + n.source + ". Check the details on the original page before you apply, and never pay to apply for a job, learnership or bursary."));
    var r = el("div", "row");
    if (u) { var a = el("a", "btn", "View on " + n.source); a.href = u; a.target = "_blank"; a.rel = "noopener noreferrer"; r.appendChild(a); }
    var x = el("button", "btn alt", "Close"); x.type = "button"; x.addEventListener("click", function () { d.close(); }); r.appendChild(x);
    d.appendChild(r); d.showModal();
  }
  function latest(list) {
    var by = {}, out = [], keys; list.forEach(function (n) { (by[n.category] = by[n.category] || []).push(n); }); keys = Object.keys(by);
    for (var i = 0; out.length < 6 && i < 6; i++) keys.forEach(function (k) { if (out.length < 6 && by[k][i]) out.push(by[k][i]); });
    return out.sort(function (a, b) { return new Date(b.published) - new Date(a.published); });
  }
  function fill(id, list) { var g = $(id); g.textContent = ""; list.forEach(function (n) { g.appendChild(card(n)); }); }
  function render() {
    var list = all.filter(function (n) { return cat === "all" || n.category === cat; });
    var top = latest(list), rest = list.filter(function (n) { return top.indexOf(n) === -1; });
    $("nb-latest").hidden = !top.length; fill("nb-latest-grid", top); fill("nb-grid", rest.slice(0, shown));
    $("nb-rest").hidden = !rest.length;
    $("nb-more").hidden = rest.length <= shown;
    $("nb-state").hidden = list.length > 0;
    $("nb-state").textContent = "No " + (cat === "all" ? "opportunities" : CATS[cat].toLowerCase()) + " to show right now. Check back soon.";
  }
  function pills() {
    var box = $("nb-pills");
    [["all", "All"]].concat(Object.keys(CATS).map(function (k) { return [k, CATS[k]]; })).forEach(function (p) {
      var b = el("button", "pill", p[1]); b.type = "button"; b.setAttribute("aria-pressed", p[0] === cat);
      b.addEventListener("click", function () { cat = p[0]; shown = PAGE; Array.prototype.forEach.call(box.children, function (x) { x.setAttribute("aria-pressed", x === b); }); render(); });
      box.appendChild(b);
    });
  }
  function fail() {
    var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    $("nb-state").hidden = false;
    $("nb-state").textContent = local ? "The live feed runs on Vercel, so it isn't available in Live Server. Run \"npx vercel dev\" in the project folder, or set window.NICER_API_BASE in noticeboard.html." : "We couldn't load opportunities just now. Please refresh in a moment.";
  }
  pills();
  $("nb-more").addEventListener("click", function () { shown += PAGE; render(); });
  fetch(API).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
    all = d.items || []; $("nb-updated").textContent = "Updated " + fmt(d.updated) + ". "; render();
  }).catch(fail);
})();
