/* NiCER — sign in, create account, forgot / reset password. */
(function () {
  "use strict";
  var A = window.NicerAuth, $ = function (id) { return document.getElementById(id); };
  var msg = $("auth-msg"), panels = ["p-in", "p-up", "p-forgot", "p-reset"];
  var tabs = $("auth-tabs"), tabIn = $("tab-in"), tabUp = $("tab-up");
  var recovering = /type=recovery/.test(window.location.hash);

  var next = (function () {
    var n = new URLSearchParams(window.location.search).get("next");
    return /^[a-z-]+\.html$/.test(n || "") ? n : "noticeboard.html";
  })();
  var here = new URL("signin.html", window.location.href).href;

  function say(text, kind) { msg.textContent = text || ""; msg.hidden = !text; msg.className = "auth__msg" + (kind ? " is-" + kind : ""); }
  function show(id) {
    panels.forEach(function (p) { $(p).hidden = p !== id; });
    var main = id === "p-in" || id === "p-up";
    tabs.hidden = !main;
    tabIn.setAttribute("aria-selected", id === "p-in"); tabUp.setAttribute("aria-selected", id === "p-up");
    say("");
  }
  function busy(form, on) { Array.prototype.forEach.call(form.querySelectorAll("button, input"), function (c) { c.disabled = on; }); }
  function friendly(err) {
    var m = (err && err.message) || "Something went wrong. Please try again.";
    if (/invalid login/i.test(m)) return "That email and password don't match. Please try again.";
    if (/not confirmed/i.test(m)) return "Please confirm your email first. Check your inbox for the confirmation link.";
    if (/already registered/i.test(m)) return "An account with that email already exists. Try signing in instead.";
    return m;
  }

  tabIn.addEventListener("click", function () { show("p-in"); });
  tabUp.addEventListener("click", function () { show("p-up"); });
  $("go-forgot").addEventListener("click", function () { show("p-forgot"); });
  $("back-in").addEventListener("click", function () { show("p-in"); });

  if (!A.ok) {
    $("cfg-warn").hidden = false;
    Array.prototype.forEach.call(document.querySelectorAll(".auth__card form"), function (f) { busy(f, true); });
    return;
  }

  $("p-in").addEventListener("submit", async function (e) {
    e.preventDefault(); var f = e.target; busy(f, true); say("Signing in…");
    var r = await A.sb.auth.signInWithPassword({ email: f.elements.email.value.trim(), password: f.elements.password.value });
    if (r.error) { busy(f, false); say(friendly(r.error), "error"); return; }
    window.location.href = next;
  });

  $("p-up").addEventListener("submit", async function (e) {
    e.preventDefault(); var f = e.target; busy(f, true); say("Creating your account…");
    var r = await A.sb.auth.signUp({
      email: f.elements.email.value.trim(), password: f.elements.password.value,
      options: { data: { full_name: f.elements.full_name.value.trim() }, emailRedirectTo: here }
    });
    busy(f, false);
    if (r.error) { say(friendly(r.error), "error"); return; }
    if (r.data.session) { window.location.href = next; return; }
    f.reset(); say("Almost there. We've sent a confirmation link to your email. Open it, then sign in.", "ok");
  });

  $("p-forgot").addEventListener("submit", async function (e) {
    e.preventDefault(); var f = e.target; busy(f, true);
    var r = await A.sb.auth.resetPasswordForEmail(f.elements.email.value.trim(), { redirectTo: here });
    busy(f, false);
    if (r.error) { say(friendly(r.error), "error"); return; }
    say("If that email has an account, a reset link is on its way.", "ok");
  });

  $("p-reset").addEventListener("submit", async function (e) {
    e.preventDefault(); var f = e.target; busy(f, true);
    var r = await A.sb.auth.updateUser({ password: f.elements.password.value });
    busy(f, false);
    if (r.error) { say(friendly(r.error), "error"); return; }
    window.location.href = next;
  });

  A.sb.auth.onAuthStateChange(function (event) { if (event === "PASSWORD_RECOVERY") show("p-reset"); });

  show(window.location.hash === "#create" ? "p-up" : "p-in");
  if (recovering) { show("p-reset"); return; }
  A.getUser().then(function (u) {
    if (!u) return;
    /* Sent here by a page that needs a login: carry on to it. */
    if (new URLSearchParams(window.location.search).get("next")) { window.location.replace(next); return; }
    /* Otherwise show who is signed in instead of silently skipping the page. */
    panels.forEach(function (p) { $(p).hidden = true; }); tabs.hidden = true;
    var box = document.createElement("div");
    var p = document.createElement("p"); p.textContent = "You're signed in as " + (u.email || "your account") + "."; box.appendChild(p);
    var go = document.createElement("a"); go.className = "btn btn--primary"; go.href = next; go.textContent = "Continue to the Notice Board"; box.appendChild(go);
    var out = document.createElement("button"); out.type = "button"; out.className = "btn btn--outline"; out.style.marginLeft = "10px"; out.textContent = "Sign out";
    out.addEventListener("click", function () { A.signOut(); }); box.appendChild(out);
    $("p-in").parentNode.appendChild(box);
  });
})();