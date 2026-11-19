/* NiCER — programme Sign Up form. Saves to the programme_signups table in Supabase.
   If the database can't be reached, it falls back to opening the visitor's email app. */
(function () {
  "use strict";
  var form = document.getElementById("signup-form"); if (!form) return;
  var msg = document.getElementById("signup-msg"), btn = document.getElementById("su-btn");
  var cfg = window.NICER_SUPABASE || {};
  var TO = "mutangwa@khoro.co.za";

  /* Saves one row with a plain request to Supabase's REST API.
     Why not the supabase-js client: the v2.45 build used on this site copies the key into the Authorization header,
     and Supabase rejects the new "sb_publishable_..." keys there ("Invalid JWT"), which makes the insert fail.
     Publishable keys must go in the apikey header only, which is what this does. It also works with old anon keys. */
  async function save(d) {
    if (!(cfg.url && cfg.anonKey)) throw new Error("Supabase is not configured (assets/js/supabase-config.js)");
    var ctl = window.AbortController ? new AbortController() : null, timer = ctl && setTimeout(function () { ctl.abort(); }, 15000);
    try {
      var res = await fetch(cfg.url.replace(/\/+$/, "") + "/rest/v1/programme_signups", {
        method: "POST",
        headers: { "apikey": cfg.anonKey, "Content-Type": "application/json", "Prefer": "return=minimal" },
        body: JSON.stringify(d),
        signal: ctl ? ctl.signal : undefined
      });
      if (!res.ok) { var detail = ""; try { detail = await res.text(); } catch (e) {} throw new Error("Supabase answered " + res.status + " " + detail); }
    } finally { if (timer) clearTimeout(timer); }
  }

  function say(text, kind) { msg.textContent = text; msg.hidden = !text; msg.className = "auth__msg" + (kind ? " is-" + kind : ""); if (text) msg.focus && msg.setAttribute("tabindex", "-1"); }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (form.elements.website.value) return;                       /* honeypot */
    if (!form.checkValidity()) { form.reportValidity(); return; }
    var d = {
      programme: form.getAttribute("data-programme"),
      full_name: form.elements.full_name.value.trim(),
      email: form.elements.email.value.trim(),
      phone: form.elements.phone.value.trim()
    };
    btn.disabled = true; say("");
    var failed = false;
    try { await save(d); } catch (err) { failed = true; if (window.console) console.error("NiCER sign-up could not be saved:", err); }
    btn.disabled = false;
    if (!failed) { form.reset(); say("Thank you, " + d.full_name.split(" ")[0] + ". Your interest in " + d.programme + " has been registered.", "ok"); msg.focus(); return; }
    var body = "Programme: " + d.programme + "\nName: " + d.full_name + "\nEmail: " + d.email + "\nContact number: " + d.phone;
    say("We couldn't save your details online, so we're opening your email app to send them instead.", "error");
    window.location.href = "mailto:" + TO + "?subject=" + encodeURIComponent("Sign up: " + d.programme) + "&body=" + encodeURIComponent(body);
  });
})();
