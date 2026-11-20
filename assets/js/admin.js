/* NiCER admin control centre: dashboard, Notice Board, News and Events, partner logos, sign-ups and reports.
   The checks in this file are for convenience only; the real protection is Row Level Security in Supabase (supabase/schema.sql). */
(function () {
  "use strict";
  var A = window.NicerAuth, el = A.el, $ = function (id) { return document.getElementById(id); };
  var KINDS = { news: "News", press: "Press release", media: "Media coverage", event: "Event", publication: "Publication", video: "Video" };
  var user = null, notices = [], news = null, partners = null, signups = null;
  var editingNotice = null, editingNews = null, editingNewsItem = null, view = "dashboard";

  /* ---------- small helpers ---------- */
  function say(text, kind) { var m = $("ad-msg"); m.textContent = text || ""; m.hidden = !text; m.className = "msg" + (kind ? " is-" + kind : ""); }
  function day(iso) { return iso ? A.fmtDate(String(iso).slice(0, 10)) : "–"; }
  function ago(iso) {
    var s = Math.max(1, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 3600) return Math.round(s / 60) + " min ago";
    if (s < 86400) { var h = Math.round(s / 3600); return h + (h === 1 ? " hour ago" : " hours ago"); }
    var d = Math.round(s / 86400); return d < 30 ? d + (d === 1 ? " day ago" : " days ago") : day(iso);
  }
  function today() { return new Date().toISOString().slice(0, 10); }
  function badge(text, cls) { return el("span", "badge " + cls, text); }
  function td(content, cls) { var c = el("td", cls || null); if (content && content.nodeType) c.appendChild(content); else c.textContent = content == null ? "" : content; return c; }
  function btn(label, cls, fn, aria) { var b = el("button", "btn btn--sm " + cls, label); b.type = "button"; if (aria) b.setAttribute("aria-label", aria); b.addEventListener("click", fn); return b; }
  function noticeStatus(n) {
    if (!n.is_published) return { t: "Draft", c: "b-wait", k: "draft" };
    if (n.deadline && n.deadline < today()) return { t: "Expired", c: "b-bad", k: "expired" };
    return { t: "Published", c: "b-ok", k: "published" };
  }
  function csv(name, head, rows) {
    if (!rows.length) { A.toast("There is nothing to export yet."); return; }
    function cell(v) { v = String(v == null ? "" : v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; }
    var lines = [head.map(cell).join(",")].concat(rows.map(function (r) { return r.map(cell).join(","); }));
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv" }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  function schemaHint(what) { return what + " isn't available yet. Run the latest supabase/schema.sql in the Supabase SQL Editor, then reload."; }

  /* ---------- navigation ---------- */
  var PARENT = { "notice-form": "notices", "news-form": "news" };
  function show(name) {
    view = name; say("");
    Array.prototype.forEach.call(document.querySelectorAll(".view"), function (s) { s.hidden = s.id !== "v-" + name; });
    var navKey = PARENT[name] || name;
    Array.prototype.forEach.call($("ad-nav").querySelectorAll("button"), function (b) {
      if (b.getAttribute("data-view") === navKey) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    document.body.classList.remove("menu-open"); $("ad-burger").setAttribute("aria-expanded", "false");
    window.scrollTo({ top: 0 });
    if (name === "news" && news === null) loadNews();
    if (name === "partners" && partners === null) loadPartners();
    if (name === "signups" && signups === null) loadSignups();
    if (name === "reports") { if (news === null) loadNews(); if (signups === null) loadSignups(); renderReports(); }
  }
  function go(target) {
    if (target === "notice-new") { resetNotice(); show("notice-form"); }
    else if (target === "news-new") { resetNews(); show("news-form"); }
    else show(target);
  }

  /* ---------- notices ---------- */
  function resetNotice() {
    editingNotice = null; $("n-form").reset(); $("n-published").checked = true;
    $("nf-title").textContent = "New notice"; $("n-save").textContent = "Publish notice"; $("n-delete").hidden = true;
  }
  function editNotice(n) {
    editingNotice = n.id; var f = $("n-form").elements;
    f.title.value = n.title; f.category.value = n.category; f.organisation.value = n.organisation || ""; f.location.value = n.location || "";
    f.deadline.value = n.deadline || ""; f.link_url.value = n.link_url || ""; f.body.value = n.body;
    $("n-published").checked = n.is_published; $("n-pinned").checked = n.pinned;
    $("nf-title").textContent = "Edit notice"; $("n-save").textContent = "Save changes"; $("n-delete").hidden = false; show("notice-form");
  }
  async function saveNotice(e) {
    e.preventDefault(); var f = $("n-form").elements, link = f.link_url.value.trim();
    if (link && !A.safeUrl(link)) { say("The link must start with http:// or https://", "error"); return; }
    var data = { title: f.title.value.trim(), category: f.category.value, organisation: f.organisation.value.trim() || null, location: f.location.value.trim() || null,
      deadline: f.deadline.value || null, link_url: link || null, body: f.body.value.trim(), is_published: $("n-published").checked, pinned: $("n-pinned").checked };
    $("n-save").disabled = true;
    var r = editingNotice ? await A.sb.from("notices").update(data).eq("id", editingNotice) : await A.sb.from("notices").insert(Object.assign({ created_by: user.id }, data));
    $("n-save").disabled = false;
    if (r.error) { say("Couldn't save: " + r.error.message, "error"); return; }
    A.toast(editingNotice ? "Notice updated." : "Notice saved."); resetNotice(); await loadNotices(); show("notices");
  }
  async function deleteNotice(n) {
    if (!window.confirm("Delete “" + n.title + "”? This can't be undone.")) return;
    var r = await A.sb.from("notices").delete().eq("id", n.id); if (r.error) { A.toast("Couldn't delete that notice."); return; }
    A.toast("Notice deleted."); if (view === "notice-form") { resetNotice(); show("notices"); } loadNotices();
  }
  async function toggleNotice(n) {
    var r = await A.sb.from("notices").update({ is_published: !n.is_published }).eq("id", n.id);
    if (r.error) { A.toast("Couldn't update that notice."); return; } A.toast(n.is_published ? "Notice unpublished." : "Notice published."); loadNotices();
  }
  function noticeRow(n, full) {
    var tr = el("tr"), st = noticeStatus(n), t = el("td", "t", n.title);
    if (n.organisation) t.appendChild(el("span", "sub", n.organisation));
    tr.appendChild(t); tr.appendChild(td(badge(A.categories[n.category] || n.category, "b-navy"))); tr.appendChild(td(badge(st.t, st.c)));
    tr.appendChild(td(day(n.created_at), "nw"));
    if (full) {
      var a = el("td", "act"); a.appendChild(btn("Edit", "btn--ghost", function () { editNotice(n); }, "Edit " + n.title));
      a.appendChild(btn(n.is_published ? "Unpublish" : "Publish", "btn--ghost", function () { toggleNotice(n); }, (n.is_published ? "Unpublish " : "Publish ") + n.title));
      a.appendChild(btn("Delete", "btn--danger", function () { deleteNotice(n); }, "Delete " + n.title)); tr.appendChild(a);
    }
    return tr;
  }
  function renderNotices() {
    var q = $("nf-q").value.trim().toLowerCase(), c = $("nf-cat").value, s = $("nf-st").value;
    var list = notices.filter(function (n) {
      if (c && n.category !== c) return false; if (s && noticeStatus(n).k !== s) return false;
      return !q || [n.title, n.organisation, n.location].join(" ").toLowerCase().indexOf(q) !== -1;
    });
    var b = $("n-body"); b.textContent = ""; list.forEach(function (n) { b.appendChild(noticeRow(n, true)); });
    $("n-empty").hidden = list.length > 0;
    $("n-count").textContent = list.length + (list.length === 1 ? " notice" : " notices") + (list.length !== notices.length ? " of " + notices.length : "") + " · posted to signed-in members";
  }
  async function loadNotices() {
    var r = await A.sb.from("notices").select("*").order("created_at", { ascending: false });
    if (r.error) { A.toast("Couldn't load notices."); return; }
    notices = r.data || []; renderNotices(); renderDashboard();
  }

  /* ---------- image upload (news images and partner logos) ---------- */
  async function upload(file, folder, name) {
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) throw new Error("Please choose a PNG, JPG, WebP or SVG image.");
    if (file.size > 5 * 1024 * 1024) throw new Error("That image is over 5 MB. Please choose a smaller one.");
    var ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg" }[file.type];
    var path = folder + "/" + name + "-" + Date.now() + "." + ext;
    var r = await A.sb.storage.from("site-media").upload(path, file, { contentType: file.type, upsert: false });
    if (r.error) throw new Error(/not found|bucket/i.test(r.error.message) ? schemaHint("Image storage") : r.error.message);
    return A.sb.storage.from("site-media").getPublicUrl(path).data.publicUrl;
  }

  /* ---------- news & media ---------- */
  function evRow() { $("m-event-row").hidden = $("m-form").elements.kind.value !== "event"; }
  function resetNews() {
    editingNews = null; editingNewsItem = null; $("m-form").reset(); evRow(); $("m-published").checked = true; $("m-form").elements.published_at.value = today();
    $("mf-title").textContent = "New post"; $("m-save").textContent = "Publish post"; $("m-delete").hidden = true; setPreview("");
  }
  function setPreview(url) {
    var i = $("m-prev"), ph = $("m-ph"), safe = url && A.safeUrl(url);
    if (safe) { i.src = safe; i.hidden = false; ph.hidden = true; } else { i.removeAttribute("src"); i.hidden = true; ph.hidden = false; }
    $("m-rm").hidden = !safe;
  }
  function editNews(n) {
    editingNews = n.id; editingNewsItem = n; var f = $("m-form").elements;
    f.title.value = n.title; f.kind.value = n.kind; f.published_at.value = n.published_at || today(); f.summary.value = n.summary || ""; f.body.value = n.body || "";
    f.image_url.value = n.image_url || ""; f.link_url.value = n.link_url || ""; f.event_date.value = n.event_date || ""; f.event_location.value = n.event_location || ""; evRow(); $("m-published").checked = n.is_published; $("m-featured").checked = n.featured;
    setPreview(n.image_url); $("mf-title").textContent = "Edit post"; $("m-save").textContent = "Save changes"; $("m-delete").hidden = false; show("news-form");
  }
  async function saveNews(e) {
    e.preventDefault(); var f = $("m-form").elements, link = f.link_url.value.trim(), img = f.image_url.value.trim();
    if ((link && !A.safeUrl(link)) || (img && !A.safeUrl(img))) { say("Links and image addresses must start with http:// or https://", "error"); return; }
    var data = { title: f.title.value.trim(), kind: f.kind.value, published_at: f.published_at.value, summary: f.summary.value.trim() || null, body: f.body.value.trim() || null,
      image_url: img || null, link_url: link || null, is_published: $("m-published").checked, featured: $("m-featured").checked };
    var hadEv = editingNewsItem && (editingNewsItem.event_date || editingNewsItem.event_location);
    if (data.kind === "event") { data.event_date = f.event_date.value || null; data.event_location = f.event_location.value.trim() || null; }
    else if (hadEv) { data.event_date = null; data.event_location = null; }
    $("m-save").disabled = true;
    var r = editingNews ? await A.sb.from("news").update(data).eq("id", editingNews) : await A.sb.from("news").insert(Object.assign({ created_by: user.id }, data));
    $("m-save").disabled = false;
    if (r.error) { say(/relation|does not exist|schema cache/i.test(r.error.message) ? schemaHint("News and Events") : "Couldn't save: " + r.error.message, "error"); return; }
    A.toast(editingNews ? "Post updated." : "Post saved."); resetNews(); await loadNews(); show("news");
  }
  async function deleteNews(n) {
    if (!window.confirm("Delete “" + n.title + "”? This can't be undone.")) return;
    var r = await A.sb.from("news").delete().eq("id", n.id); if (r.error) { A.toast("Couldn't delete that post."); return; }
    A.toast("Post deleted."); if (view === "news-form") { resetNews(); show("news"); } loadNews();
  }
  async function toggleNews(n) {
    var r = await A.sb.from("news").update({ is_published: !n.is_published }).eq("id", n.id);
    if (r.error) { A.toast("Couldn't update that post."); return; } A.toast(n.is_published ? "Post unpublished." : "Post published."); loadNews();
  }
  function renderNews() {
    var b = $("m-body"); b.textContent = "";
    if (news === null) { $("m-empty").hidden = false; $("m-empty").textContent = schemaHint("News and Events"); $("m-count").textContent = ""; return; }
    var q = $("mf-q").value.trim().toLowerCase(), k = $("mf-kind").value, s = $("mf-st").value;
    var list = news.filter(function (n) {
      if (k && n.kind !== k) return false; if (s === "published" && !n.is_published) return false; if (s === "draft" && n.is_published) return false;
      return !q || [n.title, n.summary].join(" ").toLowerCase().indexOf(q) !== -1;
    });
    list.forEach(function (n) {
      var tr = el("tr"), t = el("td", "t", n.title); if (n.featured) { t.appendChild(el("span", "sub", "★ Featured")); }
      tr.appendChild(t); tr.appendChild(td(badge(KINDS[n.kind] || n.kind, "b-navy")));
      tr.appendChild(td(n.is_published ? badge("Published", "b-ok") : badge("Draft", "b-wait"))); tr.appendChild(td(day(n.kind === "event" && n.event_date ? n.event_date : n.published_at), "nw"));
      var a = el("td", "act"); a.appendChild(btn("Edit", "btn--ghost", function () { editNews(n); }, "Edit " + n.title));
      a.appendChild(btn(n.is_published ? "Unpublish" : "Publish", "btn--ghost", function () { toggleNews(n); }));
      a.appendChild(btn("Delete", "btn--danger", function () { deleteNews(n); }, "Delete " + n.title)); tr.appendChild(a); b.appendChild(tr);
    });
    $("m-empty").hidden = list.length > 0; $("m-empty").textContent = news.length ? "No posts match the filters." : "No posts yet. Create your first news post.";
    $("m-count").textContent = list.length + (list.length === 1 ? " post" : " posts") + (list.length !== news.length ? " of " + news.length : "") + " · shown on the News and Events page";
  }
  var newsMissing = false;
  async function loadNews() {
    var r = await A.sb.from("news").select("*").order("published_at", { ascending: false }).order("created_at", { ascending: false });
    if (r.error) { news = null; newsMissing = true; renderNews(); renderDashboard(); return; }
    newsMissing = false; news = r.data || []; renderNews(); renderDashboard(); renderReports();
  }

  /* ---------- partner logos ---------- */
  var partnersMissing = false;
  function renderPartners() {
    var g = $("p-grid"); g.textContent = ""; $("p-note").hidden = !partnersMissing;
    if (partnersMissing) { $("p-note").textContent = schemaHint("Partner logos"); $("p-note").className = "msg is-error"; return; }
    (partners || []).forEach(function (p) {
      var c = el("div", "pcard"), box = el("div", "pcard__logo");
      var u = p.logo_url && A.safeUrl(p.logo_url);
      if (u) { var i = new Image(); i.src = u; i.alt = p.name + " logo"; box.appendChild(i); } else box.appendChild(el("span", null, "No logo yet"));
      c.appendChild(box); c.appendChild(el("h4", null, p.name));
      var act = el("div", "pcard__act"), lab = el("label", "btn btn--ghost btn--sm", u ? "Replace logo" : "Upload logo"), inp = document.createElement("input");
      inp.type = "file"; inp.accept = "image/png,image/jpeg,image/webp,image/svg+xml"; inp.className = "sr-only"; inp.id = "pf-" + p.slug; lab.setAttribute("for", inp.id);
      inp.addEventListener("change", async function () {
        if (!inp.files[0]) return; lab.textContent = "Uploading…";
        try {
          var url = await upload(inp.files[0], "partners", p.slug);
          var r = await A.sb.from("partners").update({ logo_url: url, updated_at: new Date().toISOString() }).eq("slug", p.slug);
          if (r.error) throw new Error(r.error.message); A.toast(p.name + " logo saved."); loadPartners();
        } catch (e) { A.toast(e.message); lab.textContent = u ? "Replace logo" : "Upload logo"; }
      });
      act.appendChild(lab); act.appendChild(inp);
      if (u) act.appendChild(btn("Remove", "btn--danger", async function () {
        var r = await A.sb.from("partners").update({ logo_url: null }).eq("slug", p.slug); if (r.error) { A.toast("Couldn't remove that logo."); return; } A.toast("Logo removed."); loadPartners();
      }, "Remove " + p.name + " logo"));
      c.appendChild(act); g.appendChild(c);
    });
  }
  async function loadPartners() {
    var r = await A.sb.from("partners").select("*").order("sort_order");
    if (r.error) { partnersMissing = true; partners = []; } else { partnersMissing = false; partners = r.data || []; }
    renderPartners();
  }

  /* ---------- sign-ups ---------- */
  function renderSignups() {
    var b = $("s-body"); b.textContent = "";
    if (signups === null) { $("s-empty").hidden = false; $("s-empty").textContent = schemaHint("Sign-ups"); $("s-count").textContent = ""; return; }
    var q = $("sf-q").value.trim().toLowerCase(), p = $("sf-prog").value;
    var list = signups.filter(function (s) { return (!p || s.programme === p) && (!q || [s.full_name, s.email, s.phone].join(" ").toLowerCase().indexOf(q) !== -1); });
    list.forEach(function (s) {
      var tr = el("tr"); tr.appendChild(td(s.full_name, "t")); tr.appendChild(td(s.email)); tr.appendChild(td(s.phone, "nw")); tr.appendChild(td(badge(s.programme, "b-navy"))); tr.appendChild(td(day(s.created_at), "nw"));
      var a = el("td", "act"); a.appendChild(btn("Delete", "btn--danger", async function () {
        if (!window.confirm("Delete the sign-up from " + s.full_name + "?")) return;
        var r = await A.sb.from("programme_signups").delete().eq("id", s.id); if (r.error) { A.toast("Couldn't delete that sign-up."); return; } loadSignups();
      }, "Delete sign-up from " + s.full_name)); tr.appendChild(a); b.appendChild(tr);
    });
    $("s-empty").hidden = list.length > 0; $("s-empty").textContent = signups.length ? "No sign-ups match the filters." : "No sign-ups yet. They appear here when visitors use the Sign Up form on a programme page.";
    $("s-count").textContent = list.length + (list.length === 1 ? " sign-up" : " sign-ups") + (list.length !== signups.length ? " of " + signups.length : "");
    var sel = $("sf-prog"), cur = sel.value, progs = {}; signups.forEach(function (s) { progs[s.programme] = 1; });
    if (sel.options.length - 1 !== Object.keys(progs).length) { sel.textContent = ""; var o = el("option", null, "All programmes"); o.value = ""; sel.appendChild(o);
      Object.keys(progs).sort().forEach(function (k) { var x = el("option", null, k); x.value = k; sel.appendChild(x); }); sel.value = cur; }
  }
  async function loadSignups() {
    var r = await A.sb.from("programme_signups").select("*").order("created_at", { ascending: false });
    signups = r.error ? null : (r.data || []); renderSignups(); renderDashboard(); renderReports();
  }

  /* ---------- exports ---------- */
  var EXPORT = {
    notices: function () { csv("nicer-notices.csv", ["Title", "Category", "Organisation", "Location", "Status", "Deadline", "Pinned", "Posted"],
      notices.map(function (n) { return [n.title, A.categories[n.category], n.organisation, n.location, noticeStatus(n).t, n.deadline, n.pinned ? "Yes" : "No", String(n.created_at).slice(0, 10)]; })); },
    news: function () { csv("nicer-news.csv", ["Title", "Type", "Status", "Featured", "Date", "Event date", "Event location", "Link"],
      (news || []).map(function (n) { return [n.title, KINDS[n.kind], n.is_published ? "Published" : "Draft", n.featured ? "Yes" : "No", n.published_at, n.event_date || "", n.event_location || "", n.link_url]; })); },
    signups: function () { csv("nicer-signups.csv", ["Name", "Email", "Contact number", "Programme", "Date"],
      (signups || []).map(function (s) { return [s.full_name, s.email, s.phone, s.programme, String(s.created_at).slice(0, 10)]; })); }
  };

  /* ---------- dashboard + reports ---------- */
  function metric(label, value, note, warn) {
    var d = el("div", "metric" + (warn ? " metric--warn" : "")); d.appendChild(el("span", null, label)); d.appendChild(el("b", null, String(value))); d.appendChild(el("small", null, note)); return d;
  }
  function renderDashboard() {
    var pub = notices.filter(function (n) { return noticeStatus(n).k === "published"; }).length, drafts = notices.filter(function (n) { return !n.is_published; }).length;
    var m = $("d-metrics"); m.textContent = "";
    m.appendChild(metric("Total notices", notices.length, pub + " live on the Notice Board"));
    m.appendChild(metric("News & Events posts", news === null ? "–" : news.length, news === null ? "Run the latest schema.sql" : news.filter(function (n) { return n.is_published; }).length + " published"));
    m.appendChild(metric("Programme sign-ups", signups === null ? "–" : signups.length, signups === null ? "Not available yet" : "From programme pages"));
    m.appendChild(metric("Drafts awaiting review", drafts, drafts ? "Need publishing" : "Nothing waiting", drafts > 0));
    var b = $("d-recent"); b.textContent = "";
    notices.slice(0, 5).forEach(function (n) { b.appendChild(noticeRow(n, false)); });
    if (!notices.length) { var tr = el("tr"), c = el("td", "empty", "No notices yet. Create your first notice."); c.colSpan = 4; tr.appendChild(c); b.appendChild(tr); }
    var items = [];
    notices.forEach(function (n) { items.push({ at: n.created_at, i: n.is_published ? "✓" : "…", c: n.is_published ? "" : " ico--o", h: n.is_published ? "Notice published" : "Notice saved as draft", p: n.title }); });
    (news || []).forEach(function (n) { items.push({ at: n.created_at, i: "N", c: " ico--n", h: n.is_published ? "News post published" : "News post drafted", p: n.title }); });
    (signups || []).forEach(function (s) { items.push({ at: s.created_at, i: "↗", c: " ico--o", h: "New programme sign-up", p: s.full_name + " · " + s.programme }); });
    items.sort(function (a, b2) { return new Date(b2.at) - new Date(a.at); });
    var f = $("d-feed"); f.textContent = "";
    items.slice(0, 6).forEach(function (x) {
      var li = el("li"); li.appendChild(el("div", "ico" + x.c, x.i)); var d = el("div"); d.appendChild(el("h4", null, x.h)); d.appendChild(el("p", null, x.p)); d.appendChild(el("span", null, ago(x.at))); li.appendChild(d); f.appendChild(li);
    });
    if (!items.length) f.appendChild(el("li", "empty", "Activity appears here as you and your visitors use the site."));
    var cn = $("cnt-notices"); cn.hidden = !drafts; cn.textContent = drafts;
    var cs = $("cnt-signups"); cs.hidden = !(signups && signups.length); cs.textContent = signups ? signups.length : "";
  }
  function bars(ul, entries) {
    ul.textContent = ""; var max = 1; entries.forEach(function (e) { max = Math.max(max, e[1]); });
    if (!entries.length) { ul.appendChild(el("li", "empty", "No data yet.")); return; }
    entries.forEach(function (e) {
      var li = el("li"), h = el("div", "bar__h"); h.appendChild(el("span", null, e[0])); h.appendChild(el("b", null, String(e[1]))); li.appendChild(h);
      var t = el("div", "bar__t"), fl = el("div", "bar__f"); fl.style.width = (e[1] / max * 100) + "%"; t.appendChild(fl); li.appendChild(t); ul.appendChild(li);
    });
  }
  function renderReports() {
    var c = {}; notices.forEach(function (n) { c[n.category] = (c[n.category] || 0) + 1; });
    bars($("r-cat"), Object.keys(A.categories).map(function (k) { return [A.plural[k], c[k] || 0]; }));
    var p = {}; (signups || []).forEach(function (s) { p[s.programme] = (p[s.programme] || 0) + 1; });
    bars($("r-prog"), Object.keys(p).sort(function (a, b) { return p[b] - p[a]; }).map(function (k) { return [k, p[k]]; }));
  }

  /* ---------- init ---------- */
  function gate(text, linkText, href) {
    $("ad-gate").hidden = false; $("ad-app").hidden = true; $("ad-gate-text").textContent = text; var s = $("ad-gate-act"); s.textContent = "";
    if (linkText) { var a = el("a", "btn btn--primary", linkText); a.href = href; s.appendChild(a); }
  }
  async function init() {
    if (!A.ok) { gate("The dashboard isn't connected to its database yet. Add your Supabase details to assets/js/supabase-config.js."); return; }
    user = await A.getUser();
    if (!user) { window.location.replace("signin.html?next=admin.html"); return; }
    var p = await A.getProfile(user);
    if (!p || p.role !== "admin") { gate("This area is for NiCER administrators.", "Go to the Notice Board", "noticeboard.html"); return; }
    $("ad-gate").hidden = true; $("ad-app").hidden = false;
    var name = p.full_name || user.email || "Administrator"; $("ad-user").textContent = name; $("ad-av").textContent = name.trim().charAt(0).toUpperCase();
    Object.keys(A.categories).forEach(function (k) {
      var o = el("option", null, A.categories[k]); o.value = k; $("n-category").appendChild(o);
      var o2 = el("option", null, A.plural[k]); o2.value = k; $("nf-cat").appendChild(o2);
    });
    Object.keys(KINDS).forEach(function (k) {
      var o = el("option", null, KINDS[k]); o.value = k; $("m-kind").appendChild(o);
      var o2 = el("option", null, KINDS[k]); o2.value = k; $("mf-kind").appendChild(o2);
    });
    $("ad-nav").addEventListener("click", function (e) { var b = e.target.closest("button[data-view]"); if (b) go(b.getAttribute("data-view")); });
    document.addEventListener("click", function (e) {
      var g = e.target.closest("[data-go]"); if (g) go(g.getAttribute("data-go"));
      var x = e.target.closest("[data-export]"); if (x) EXPORT[x.getAttribute("data-export")]();
    });
    $("ad-burger").addEventListener("click", function () { var o = !document.body.classList.contains("menu-open"); document.body.classList.toggle("menu-open", o); this.setAttribute("aria-expanded", o ? "true" : "false"); });
    $("ad-scrim").addEventListener("click", function () { document.body.classList.remove("menu-open"); $("ad-burger").setAttribute("aria-expanded", "false"); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") document.body.classList.remove("menu-open"); });
    $("ad-out").addEventListener("click", function () { A.signOut(); });
    $("d-export").addEventListener("click", function () { go("reports"); });
    ["nf-q", "nf-cat", "nf-st"].forEach(function (id) { $(id).addEventListener("input", renderNotices); });
    ["mf-q", "mf-kind", "mf-st"].forEach(function (id) { $(id).addEventListener("input", renderNews); });
    ["sf-q", "sf-prog"].forEach(function (id) { $(id).addEventListener("input", renderSignups); });
    $("n-form").addEventListener("submit", saveNotice); $("m-form").addEventListener("submit", saveNews); $("m-kind").addEventListener("change", evRow);
    $("n-cancel").addEventListener("click", function () { resetNotice(); show("notices"); });
    $("m-cancel").addEventListener("click", function () { resetNews(); show("news"); });
    $("n-delete").addEventListener("click", function () { var n = notices.filter(function (x) { return x.id === editingNotice; })[0]; if (n) deleteNotice(n); });
    $("m-delete").addEventListener("click", function () { var n = (news || []).filter(function (x) { return x.id === editingNews; })[0]; if (n) deleteNews(n); });
    $("s-export").addEventListener("click", EXPORT.signups);
    $("m-img").addEventListener("input", function () { setPreview(this.value.trim()); });
    $("m-rm").addEventListener("click", function () { $("m-img").value = ""; setPreview(""); });
    $("m-file").addEventListener("change", async function () {
      var f = this.files[0]; if (!f) return; say("Uploading image…");
      try { var u = await upload(f, "news", "post"); $("m-img").value = u; setPreview(u); say("Image uploaded. Save the post to keep it.", "ok"); }
      catch (e) { say(e.message, "error"); } this.value = "";
    });
    resetNotice(); resetNews();
    await Promise.all([loadNotices(), loadNews(), loadSignups()]);
  }
  init();
})();