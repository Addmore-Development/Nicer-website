/* NiCER — read public data (published news, partner logos) from Supabase without the Supabase library.
   Uses the project's public key only. What is visible is decided by Row Level Security (see supabase/schema.sql). */
(function () {
  "use strict";
  var cfg = window.NICER_SUPABASE || {};
  var ok = !!(cfg.url && cfg.anonKey && cfg.url.indexOf("YOUR-") === -1);
  function get(path) {
    if (!ok) return Promise.reject(new Error("not-configured"));
    return fetch(cfg.url.replace(/\/$/, "") + "/rest/v1/" + path, { headers: { apikey: cfg.anonKey, Accept: "application/json" } })
      .then(function (r) { if (!r.ok) throw new Error("http-" + r.status); return r.json(); });
  }
  function safeUrl(u) {
    try { var x = new URL(u); return (x.protocol === "https:" || x.protocol === "http:") ? x.href : null; } catch (e) { return null; }
  }
  window.NicerPublic = { ok: ok, get: get, safeUrl: safeUrl };
})();