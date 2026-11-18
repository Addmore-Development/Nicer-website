/* NiCER — admin dashboard: overview, post management (add, edit, publish/unpublish, delete) and programme sign-ups.
   The page check below is only for convenience; the real protection is Row Level Security in Supabase. */
(function () {
  "use strict";
  var A = window.NicerAuth, el = A.el, $ = function (id) { return document.getElementById(id); };
  var form, editing = null, user = null, rows = [], signups = [], view = "overview";

  function deny(text, linkText, href) {
    var g = $("ad-gate"); g.hidden = false; g.textContent = "";
    g.appendChild(el("p", null, text));
    if (linkText) { var a = el("a", "btn btn--primary btn--sm", linkText); a.href = href; g.appendChild(a); }
  }
  function say(text, kind) { var m = $("ad-msg"); m.textContent = text || ""; m.hidden = !text; m.className = "auth__msg" + (kind ? " is-" + kind : ""); }
  function day(iso) { return A.fmtDate(String(iso).slice(0, 10)); }

  /* ---------- views ---------- */
  function show(name) {
    view = name; say("");
    Array.prototype.forEach.call(document.querySelectorAll(".dview"), function (s) { s.hidden = s.id !== "v-" + name; });
    Array.prototype.forEach.call($("ad-nav").querySelectorAll("button"), function (b) {
      if (b.getAttribute("data-view") === name) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    if (name === "editor" && !editing) resetForm();
    if (name === "signups") loadSignups();
    var h = document.querySelector("#v-" + name + " h2"); if (h) { h.setAttribute("tabindex", "-1"); }
  }

  /* ---------- editor ---------- */
  function resetForm() {
    editing = null; form.reset(); $("n-published").checked = true;
    $("ad-form-title").textContent = "Add a notice"; $("n-save").textContent = "Publish notice"; $("n-delete").hidden = true;
  }
  function edit(n) {
    editing = n.id; show("editor");
    form.elements.title.value = n.title; form.elements.category.value = n.category; form.elements.organisation.value = n.organisation || "";
    form.elements.location.value = n.location || ""; form.elements.deadline.value = n.deadline || ""; form.elements.link_url.value = n.link_url || "";
    form.elements.body.value = n.body; $("n-published").checked = n.is_published; $("n-pinned").checked = n.pinned;
    $("ad-form-title").textContent = "Edit notice"; $("n-save").textContent = "Save changes"; $("n-delete").hidden = false;
    form.elements.title.focus(); window.scrollTo({ top: form.getBoundingClientRect().top + window.scrollY - 140, behavior: "smooth" });
  }
  async function remove(n) {
    if (!window.confirm("Delete “" + n.title + "”? This can't be undone.")) return;
    var r = await A.sb.from("notices").delete().eq("id", n.id);
    if (r.error) { A.toast("Couldn't delete that post."); return; }
    A.toast("Post deleted.");
    if (editing === n.id) { resetForm(); show("posts"); }
    load();
  }
  async function togglePublish(n) {
    var r = await A.sb.from("notices").update({ is_published: !n.is_published }).eq("id", n.id);
    if (r.error) { A.toast("Couldn't update that post."); return; }
    A.toast(n.is_published ? "Post unpublished." : "Post published."); load();
  }

  /* ---------- lists ---------- */
  function row(n, compact) {
    var li = el("li", "adrow");
    var main = el("div", "adrow__main");
    main.appendChild(el("strong", null, n.title));
    var meta = el("div", "adrow__meta");
    meta.appendChild(el("span", "badge badge--navy", A.categories[n.category] || n.category));
    meta.appendChild(el("span", n.is_published ? "badge badge--green" : "badge badge--draft", n.is_published ? "Published" : "Draft"));
    if (n.pinned) meta.appendChild(el("span", "badge", "Pinned"));
    main.appendChild(meta);
    var sub = [n.organisation, "Posted " + day(n.created_at)].filter(Boolean).join(" · ");
    main.appendChild(el("span", "adrow__sub", sub)); li.appendChild(main);
    var act = el("div", "adrow__act");
    function btn(label, fn, danger) { var b = el("button", "btn btn--outline btn--sm" + (danger ? " btn--danger" : ""), label); b.type = "button"; b.setAttribute("aria-label", label + ": " + n.title); b.addEventListener("click", fn); act.appendChild(b); }
    btn("Edit", function () { edit(n); });
    if (!compact || !n.is_published) btn(n.is_published ? "Unpublish" : "Publish", function () { togglePublish(n); });
    if (!compact) btn("Delete", function () { remove(n); }, true);
    li.appendChild(act); return li;
  }
  function fill(ul, list, compact, emptyText) {
    ul.textContent = "";
    if (!list.length) { var li = el("li", "muted", emptyText); ul.appendChild(li); return; }
    list.forEach(function (n) { ul.appendChild(row(n, compact)); });
  }

  function stat(label, value, note, warn) {
    var d = el("div", "stat" + (warn ? " stat--warn" : "")); d.appendChild(el("span", null, label)); d.appendChild(el("b", null, String(value)));
    if (note) d.appendChild(el("small", null, note)); return d;
  }
  function renderOverview() {
    var pub = rows.filter(function (n) { return n.is_published; }), drafts = rows.filter(function (n) { return !n.is_published; });
    var pinned = rows.filter(function (n) { return n.pinned; }).length;
    var s = $("ad-stats"); s.textContent = "";
    s.appendChild(stat("Total posts", rows.length, pinned + " pinned"));
    s.appendChild(stat("Published", pub.length, "Visible to members"));
    s.appendChild(stat("Drafts", drafts.length, drafts.length ? "Need publishing" : "Nothing waiting", drafts.length > 0));
    s.appendChild(stat("Sign-ups", signups === null ? "–" : signups.length, "From programme pages"));
    fill($("ad-recent"), rows.slice(0, 5), true, "No posts yet. Create your first post.");
    fill($("ad-queue"), drafts.slice(0, 5), true, "No drafts waiting.");
    var max = 1, counts = {}; rows.forEach(function (n) { counts[n.category] = (counts[n.category] || 0) + 1; max = Math.max(max, counts[n.category]); });
    var bc = $("ad-bycat"); bc.textContent = "";
    Object.keys(A.categories).forEach(function (k) {
      var c = counts[k] || 0, li = el("li", "bar");
      var head = el("div", "bar__head"); head.appendChild(el("span", null, A.plural[k])); head.appendChild(el("b", null, String(c))); li.appendChild(head);
      var tr = el("div", "bar__track"), f = el("div", "bar__fill"); f.style.width = (c / max * 100) + "%"; tr.appendChild(f); li.appendChild(tr); bc.appendChild(li);
    });
  }
  function renderPosts() {
    var q = $("f-q").value.trim().toLowerCase(), c = $("f-cat").value, st = $("f-status").value;
    var list = rows.filter(function (n) {
      if (c && n.category !== c) return false;
      if (st === "published" && !n.is_published) return false;
      if (st === "draft" && n.is_published) return false;
      return !q || [n.title, n.organisation, n.location].join(" ").toLowerCase().indexOf(q) !== -1;
    });
    fill($("ad-list"), list, false, "");
    $("ad-empty").hidden = list.length > 0;
    $("ad-count").textContent = list.length + (list.length === 1 ? " post" : " posts") + (list.length !== rows.length ? " of " + rows.length : "");
  }

  async function load() {
    var r = await A.sb.from("notices").select("*").order("created_at", { ascending: false });
    if (r.error) { A.toast("Couldn't load posts."); return; }
    rows = r.data || []; renderOverview(); renderPosts();
  }

  /* ---------- sign-ups ---------- */
  function renderSignups() {
    var body = $("su-body"); body.textContent = "";
    signups.forEach(function (s) {
      var tr = el("tr");
      [s.full_name, s.email, s.phone, s.programme].forEach(function (t) { tr.appendChild(el("td", null, t)); });
      tr.appendChild(el("td", "nw", day(s.created_at)));
      var td = el("td"), b = el("button", "btn btn--outline btn--sm btn--danger", "Delete"); b.type = "button";
      b.setAttribute("aria-label", "Delete sign-up from " + s.full_name);
      b.addEventListener("click", async function () {
        if (!window.confirm("Delete the sign-up from " + s.full_name + "?")) return;
        var r = await A.sb.from("programme_signups").delete().eq("id", s.id);
        if (r.error) { A.toast("Couldn't delete that sign-up."); return; }
        loadSignups();
      });
      td.appendChild(b); tr.appendChild(td); body.appendChild(tr);
    });
    $("su-count").textContent = signups.length + (signups.length === 1 ? " sign-up" : " sign-ups");
    $("su-empty").hidden = signups.length > 0; $("su-empty").textContent = "No sign-ups yet. They appear here when visitors use the Sign Up form on a programme page.";
  }
  async function loadSignups() {
    var r = await A.sb.from("programme_signups").select("*").order("created_at", { ascending: false });
    if (r.error) {
      signups = null; $("su-body").textContent = ""; $("su-count").textContent = "";
      $("su-empty").hidden = false; $("su-empty").textContent = "Sign-ups aren't available yet. Run the latest supabase/schema.sql in the Supabase SQL Editor to create the sign-ups table.";
      renderOverview(); return;
    }
    signups = r.data || []; renderSignups(); renderOverview();
  }
  function exportCsv() {
    if (!signups || !signups.length) { A.toast("There are no sign-ups to export."); return; }
    function cell(v) { v = String(v == null ? "" : v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; }
    var lines = [["Name", "Email", "Contact number", "Programme", "Date"].join(",")].concat(signups.map(function (s) {
      return [s.full_name, s.email, s.phone, s.programme, s.created_at.slice(0, 10)].map(cell).join(",");
    }));
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/csv" }));
    a.download = "nicer-signups.csv"; document.body.appendChild(a); a.click(); a.remove();
  }

  /* ---------- save ---------- */
  async function save(e) {
    e.preventDefault();
    var link = form.elements.link_url.value.trim();
    if (link && !A.safeUrl(link)) { say("The link must start with http:// or https://", "error"); return; }
    var data = {
      title: form.elements.title.value.trim(), category: form.elements.category.value, organisation: form.elements.organisation.value.trim() || null,
      location: form.elements.location.value.trim() || null, deadline: form.elements.deadline.value || null, link_url: link || null,
      body: form.elements.body.value.trim(), is_published: $("n-published").checked, pinned: $("n-pinned").checked
    };
    $("n-save").disabled = true;
    var r = editing ? await A.sb.from("notices").update(data).eq("id", editing)
                    : await A.sb.from("notices").insert(Object.assign({ created_by: user.id }, data));
    $("n-save").disabled = false;
    if (r.error) { say("Couldn't save: " + r.error.message, "error"); return; }
    A.toast(editing ? "Post updated." : "Post published."); resetForm(); await load(); show("posts");
  }

  async function init() {
    if (!A.ok) { deny("The dashboard isn't connected to its database yet. Add your Supabase details to assets/js/supabase-config.js."); return; }
    user = await A.getUser();
    if (!user) { window.location.replace("signin.html?next=admin.html"); return; }
    var p = await A.getProfile(user);
    if (!p || p.role !== "admin") { deny("This area is for NiCER administrators.", "Go to the Notice Board", "noticeboard.html"); return; }
    form = $("ad-form"); $("ad-app").hidden = false;
    if (p.full_name) $("ad-user").textContent = p.full_name;
    ["n-category", "f-cat"].forEach(function (id) {
      var sel = $(id); Object.keys(A.categories).forEach(function (k) { var o = el("option", null, id === "f-cat" ? A.plural[k] : A.categories[k]); o.value = k; sel.appendChild(o); });
    });
    $("ad-nav").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-view]"); if (!b) return;
      if (b.getAttribute("data-view") === "editor") resetForm();
      show(b.getAttribute("data-view"));
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-go]"), function (b) { b.addEventListener("click", function () { resetForm(); show(b.getAttribute("data-go")); }); });
    ["f-q", "f-cat", "f-status"].forEach(function (id) { $(id).addEventListener("input", renderPosts); });
    form.addEventListener("submit", save);
    $("n-cancel").addEventListener("click", function () { resetForm(); show("posts"); });
    $("n-delete").addEventListener("click", function () { var n = rows.filter(function (x) { return x.id === editing; })[0]; if (n) remove(n); });
    $("su-export").addEventListener("click", exportCsv);
    resetForm(); await load(); loadSignups();
  }
  init();
})();
