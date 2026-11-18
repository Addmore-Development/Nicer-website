/* NiCER — Notice Board (signed-in members). Access is enforced by Row Level Security; this page only renders. */
(function () {
  "use strict";
  var A = window.NicerAuth, el = A.el, $ = function (id) { return document.getElementById(id); };
  var all = [], cat = "all", q = "";
  var ORDER = ["job", "funding", "programme", "event", "announcement"];
  var PLURAL = { job: "Jobs", funding: "Funding", programme: "Programmes", event: "Events", announcement: "Announcements" };

  function gate(text, linkText, href) {
    var g = $("nb-gate"); g.hidden = false; g.textContent = "";
    g.appendChild(el("p", null, text));
    if (linkText) { var a = el("a", "btn btn--primary btn--sm", linkText); a.href = href; g.appendChild(a); }
  }

  function card(n) {
    var c = el("article", "notice" + (n.pinned ? " is-pinned" : ""));
    var top = el("div", "notice__top");
    top.appendChild(el("span", "badge badge--navy", A.categories[n.category] || n.category));
    var closed = n.deadline && n.deadline < new Date().toISOString().slice(0, 10);
    if (n.pinned) top.appendChild(el("span", "badge badge--green", "Pinned"));
    if (closed) top.appendChild(el("span", "badge", "Closed"));
    c.appendChild(top);
    c.appendChild(el("h3", null, n.title));
    var meta = [n.organisation, n.location].filter(Boolean).join(" · ");
    if (meta) c.appendChild(el("p", "notice__meta", meta));
    c.appendChild(el("p", "notice__body", n.body));
    var foot = el("div", "notice__foot");
    foot.appendChild(el("span", "notice__date", n.deadline ? "Deadline: " + A.fmtDate(n.deadline) : "Posted " + A.fmtDate(n.created_at.slice(0, 10))));
    var url = n.link_url && A.safeUrl(n.link_url);
    if (url) { var a = el("a", "link", "Learn more"); a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; foot.appendChild(a); }
    c.appendChild(foot);
    return c;
  }

  function render() {
    var list = $("nb-list"); list.textContent = "";
    var term = q.toLowerCase(), total = 0;
    var rows = all.filter(function (n) {
      return !term || [n.title, n.body, n.organisation, n.location].join(" ").toLowerCase().indexOf(term) !== -1;
    });
    ORDER.forEach(function (k) {
      if (cat !== "all" && cat !== k) return;
      var group = rows.filter(function (n) { return n.category === k; });
      if (!group.length) return;
      total += group.length;
      var sec = el("section", "nb-section"); sec.setAttribute("aria-labelledby", "sec-" + k);
      var h = el("h2", null, PLURAL[k]); h.id = "sec-" + k;
      var head = el("div", "nb-section__head"); head.appendChild(h);
      head.appendChild(el("span", "nb-section__n", group.length + (group.length === 1 ? " notice" : " notices")));
      sec.appendChild(head);
      var grid = el("div", "nb-grid");
      group.forEach(function (n) { grid.appendChild(card(n)); });
      sec.appendChild(grid); list.appendChild(sec);
    });
    $("nb-count").textContent = "";
    $("nb-empty").textContent = cat === "all" ? "No notices match your search yet." : "No " + PLURAL[cat].toLowerCase() + " to show right now.";
    $("nb-empty").hidden = total > 0;
  }

  function chips() {
    var box = $("nb-chips"); box.textContent = "";
    [["all", "All"]].concat(ORDER.map(function (k) { return [k, PLURAL[k]]; })).forEach(function (p) {
      var b = el("button", "chip", p[1]); b.type = "button"; b.setAttribute("aria-pressed", p[0] === cat);
      b.addEventListener("click", function () {
        cat = p[0]; Array.prototype.forEach.call(box.children, function (x) { x.setAttribute("aria-pressed", x === b); }); render();
      });
      box.appendChild(b);
    });
  }

  async function init() {
    if (!A.ok) { gate("The notice board isn't connected to its database yet. Add your Supabase details to assets/js/supabase-config.js."); return; }
    var user = await A.getUser();
    if (!user) { window.location.replace("signin.html?next=noticeboard.html"); return; }
    var profile = await A.getProfile(user);
    if (profile && profile.full_name) $("nb-title").textContent = "Welcome, " + profile.full_name;
    if (profile && profile.role === "admin") $("nb-admin").hidden = false;
    var r = await A.sb.from("notices").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false });
    if (r.error) { gate("We couldn't load the notices. Please refresh and try again."); return; }
    all = r.data || [];
    $("nb-app").hidden = false; chips(); render();
    $("nb-q").addEventListener("input", function (e) { q = e.target.value.trim(); render(); });
  }
  init();
})();
