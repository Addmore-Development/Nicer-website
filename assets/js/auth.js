/* NiCER — shared Supabase auth helpers (used by signin, noticeboard and admin pages). */
(function () {
  "use strict";
  var cfg = window.NICER_SUPABASE || {};
  var ok = !!(cfg.url && cfg.anonKey && cfg.url.indexOf("YOUR-") === -1 && window.supabase);
  var sb = ok ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;

  function toast(msg) {
    var t = document.getElementById("toast"); if (!t) return;
    t.textContent = msg; t.classList.add("is-on");
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove("is-on"); }, 4200);
  }
  async function getUser() {
    if (!sb) return null;
    var r = await sb.auth.getSession();
    return r.data.session ? r.data.session.user : null;
  }
  async function getProfile(user) {
    var r = await sb.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle();
    return r.error ? null : r.data;
  }
  async function signOut() {
    if (sb) await sb.auth.signOut();
    window.location.href = "signin.html";
  }
  /* Only http(s) links are ever used as hrefs. */
  function safeUrl(u) {
    try { var x = new URL(u); return (x.protocol === "https:" || x.protocol === "http:") ? x.href : null; }
    catch (e) { return null; }
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function fmtDate(iso) {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
  }

  /* Swap "Sign in" for "Sign out" in the utility bar and footer when someone is signed in. */
  async function wireNav() {
    var user = await getUser(); if (!user) return;
    Array.prototype.forEach.call(document.querySelectorAll('.util a[href="signin.html"], .footer a[href="signin.html"]'), function (a) {
      a.textContent = "Sign out"; a.setAttribute("href", "#");
      a.addEventListener("click", function (e) { e.preventDefault(); signOut(); });
    });
  }

  window.NicerAuth = { ok: ok, sb: sb, toast: toast, getUser: getUser, getProfile: getProfile,
    signOut: signOut, safeUrl: safeUrl, el: el, fmtDate: fmtDate,
    categories: { job: "Job", funding: "Funding", programme: "Programme", event: "Event", announcement: "Announcement" },
    ready: ok ? wireNav() : Promise.resolve() };
})();
