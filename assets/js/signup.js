/* NiCER — programme Sign Up form. Saves to the programme_signups table in Supabase.
   If the database can't be reached, it falls back to opening the visitor's email app. */
(function () {
  "use strict";
  var form = document.getElementById("signup-form"); if (!form) return;
  var msg = document.getElementById("signup-msg"), btn = document.getElementById("su-btn");
  var cfg = window.NICER_SUPABASE || {};
  var sb = (cfg.url && cfg.anonKey && window.supabase) ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;
  var TO = "mutangwa@khoro.co.za";

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
    var failed = true;
    if (sb) { try { var r = await sb.from("programme_signups").insert(d); failed = !!r.error; } catch (err) { failed = true; } }
    btn.disabled = false;
    if (!failed) { form.reset(); say("Thank you, " + d.full_name.split(" ")[0] + ". Your interest in " + d.programme + " has been registered.", "ok"); msg.focus(); return; }
    var body = "Programme: " + d.programme + "\nName: " + d.full_name + "\nEmail: " + d.email + "\nContact number: " + d.phone;
    say("We couldn't save your details online, so we're opening your email app to send them instead.", "error");
    window.location.href = "mailto:" + TO + "?subject=" + encodeURIComponent("Sign up: " + d.programme) + "&body=" + encodeURIComponent(body);
  });
})();
