/* NiCER — admin dashboard: add, edit, publish/unpublish and delete notices.
   The page check below is only for convenience; the real protection is Row Level Security in Supabase. */
(function () {
  "use strict";
  var A = window.NicerAuth, el = A.el, $ = function (id) { return document.getElementById(id); };
  var form, editing = null, user = null, rows = [];

  function deny(text, linkText, href) {
    var g = $("ad-gate"); g.hidden = false; g.textContent = "";
    g.appendChild(el("p", null, text));
    if (linkText) { var a = el("a", "btn btn--primary btn--sm", linkText); a.href = href; g.appendChild(a); }
  }
  function say(text, kind) { var m = $("ad-msg"); m.textContent = text || ""; m.hidden = !text; m.className = "auth__msg" + (kind ? " is-" + kind : ""); }

  function resetForm() {
    editing = null; form.reset(); $("n-published").checked = true;
    $("ad-form-title").textContent = "Add a notice"; $("n-save").textContent = "Publish notice"; $("n-cancel").hidden = true; say("");
  }
  function edit(n) {
    editing = n.id;
    form.elements.title.value = n.title; form.elements.category.value = n.category; form.elements.organisation.value = n.organisation || "";
    form.elements.location.value = n.location || ""; form.elements.deadline.value = n.deadline || ""; form.elements.link_url.value = n.link_url || "";
    form.elements.body.value = n.body; $("n-published").checked = n.is_published; $("n-pinned").checked = n.pinned;
    $("ad-form-title").textContent = "Edit notice"; $("n-save").textContent = "Save changes"; $("n-cancel").hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "start" }); form.elements.title.focus();
  }

  function row(n) {
    var li = el("li", "adrow");
    var main = el("div", "adrow__main");
    main.appendChild(el("strong", null, n.title));
    var meta = el("div", "adrow__meta");
    meta.appendChild(el("span", "badge badge--navy", A.categories[n.category] || n.category));
    if (!n.is_published) meta.appendChild(el("span", "badge", "Draft"));
    if (n.pinned) meta.appendChild(el("span", "badge badge--green", "Pinned"));
    main.appendChild(meta); li.appendChild(main);
    var act = el("div", "adrow__act");
    function btn(label, fn, danger) { var b = el("button", "btn btn--outline btn--sm" + (danger ? " btn--danger" : ""), label); b.type = "button"; b.addEventListener("click", fn); act.appendChild(b); }
    btn("Edit", function () { edit(n); });
    btn(n.is_published ? "Unpublish" : "Publish", async function () {
      var r = await A.sb.from("notices").update({ is_published: !n.is_published }).eq("id", n.id);
      if (r.error) { A.toast("Couldn't update that notice."); return; } load();
    });
    btn("Delete", async function () {
      if (!window.confirm("Delete “" + n.title + "”? This can't be undone.")) return;
      var r = await A.sb.from("notices").delete().eq("id", n.id);
      if (r.error) { A.toast("Couldn't delete that notice."); return; }
      if (editing === n.id) resetForm(); load();
    }, true);
    li.appendChild(act); return li;
  }

  async function load() {
    var r = await A.sb.from("notices").select("*").order("created_at", { ascending: false });
    if (r.error) { A.toast("Couldn't load notices."); return; }
    rows = r.data || []; var ul = $("ad-list"); ul.textContent = "";
    rows.forEach(function (n) { ul.appendChild(row(n)); });
    $("ad-count").textContent = rows.length + (rows.length === 1 ? " notice" : " notices");
    $("ad-empty").hidden = rows.length > 0;
  }

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
    A.toast(editing ? "Notice updated." : "Notice added."); resetForm(); load();
  }

  async function init() {
    if (!A.ok) { deny("The dashboard isn't connected to its database yet. Add your Supabase details to assets/js/supabase-config.js."); return; }
    user = await A.getUser();
    if (!user) { window.location.replace("signin.html?next=admin.html"); return; }
    var p = await A.getProfile(user);
    if (!p || p.role !== "admin") { deny("This area is for NiCER administrators.", "Go to the Notice Board", "noticeboard.html"); return; }
    form = $("ad-form"); $("ad-app").hidden = false;
    var sel = form.elements.category; Object.keys(A.categories).forEach(function (k) { var o = el("option", null, A.categories[k]); o.value = k; sel.appendChild(o); });
    form.addEventListener("submit", save); $("n-cancel").addEventListener("click", resetForm); resetForm(); load();
  }
  init();
})();
