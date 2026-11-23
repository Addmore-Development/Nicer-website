/* NiCER website — progressive enhancement. The site is fully readable without this file. */
(function () {
  "use strict";
  var doc = document;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- toast + links that are not live yet ---------- */
  var toast = doc.getElementById("toast"), toastTimer;
  function say(msg) {
    if (!toast) return;
    toast.textContent = msg; toast.classList.add("is-on");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toast.classList.remove("is-on"); }, 3800);
  }
  doc.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest("a[data-pending]");
    if (!a) return;
    ev.preventDefault();
    say(a.getAttribute("data-pending") + " will open here once the platform goes live.");
  });

  /* ---------- mega menus ---------- */
  var items = Array.prototype.slice.call(doc.querySelectorAll(".nav-item[data-menu]"));
  var closeTimer;
  function setOpen(item, open) {
    item.classList.toggle("is-open", open);
    var b = item.querySelector(".nav-link"); if (b) b.setAttribute("aria-expanded", open ? "true" : "false");
  }
  function closeAll(except) { items.forEach(function (i) { if (i !== except) setOpen(i, false); }); }
  items.forEach(function (item) {
    var btn = item.querySelector(".nav-link");
    btn.addEventListener("click", function () {
      var open = !item.classList.contains("is-open"); closeAll(item); setOpen(item, open);
    });
    item.addEventListener("pointerenter", function (e) {
      if (e.pointerType !== "mouse" || !fine) return;
      clearTimeout(closeTimer); closeAll(item); setOpen(item, true);
    });
    item.addEventListener("pointerleave", function (e) {
      if (e.pointerType !== "mouse" || !fine) return;
      closeTimer = setTimeout(function () { setOpen(item, false); }, 160);
    });
    item.addEventListener("focusout", function (e) {
      if (!item.contains(e.relatedTarget)) setOpen(item, false);
    });
  });
  doc.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var open = items.filter(function (i) { return i.classList.contains("is-open"); })[0];
    if (open) { setOpen(open, false); open.querySelector(".nav-link").focus(); }
    closeMobile();
  });
  doc.addEventListener("click", function (e) {
    if (!e.target.closest(".nav-item[data-menu]")) closeAll();
  });

  /* ---------- mobile nav ---------- */
  var toggle = doc.querySelector(".nav-toggle"), mnav = doc.getElementById("mobile-nav");
  function closeMobile() {
    if (!toggle || !mnav) return;
    mnav.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu"); doc.body.classList.remove("nav-lock");
  }
  if (toggle && mnav) {
    toggle.addEventListener("click", function () {
      var open = !mnav.classList.contains("is-open");
      mnav.classList.toggle("is-open", open); toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu"); doc.body.classList.toggle("nav-lock", open);
    });
    mnav.addEventListener("click", function (e) { if (e.target.closest("a:not([data-pending])")) closeMobile(); });
    window.addEventListener("resize", function () { if (window.innerWidth > 1100) closeMobile(); });
  }

  /* ---------- audience tabs ---------- */
  Array.prototype.forEach.call(doc.querySelectorAll("[data-tabs]"), function (root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false"); t.tabIndex = on ? 0 : -1;
        var p = doc.getElementById(t.getAttribute("aria-controls")); if (p) p.hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        var n = null;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") n = tabs[(i + 1) % tabs.length];
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === "Home") n = tabs[0]; if (e.key === "End") n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
  });

  /* ---------- hero trajectory ---------- */
  var traj = doc.getElementById("traj");
  if (traj) {
    var nodes = Array.prototype.slice.call(traj.querySelectorAll(".traj__node"));
    var nEl = traj.querySelector("[data-trl-n]"), tEl = traj.querySelector("[data-trl-title]"), dEl = traj.querySelector("[data-trl-desc]");
    var timers = [], userTouched = false;
    function show(node) {
      nodes.forEach(function (n) { n.classList.toggle("is-active", n === node); });
      nEl.textContent = node.getAttribute("data-trl"); tEl.textContent = node.getAttribute("data-title");
      var d = node.getAttribute("data-desc");
      if (node.getAttribute("data-trl") === "9") d += " It is then scaled through the Innovation to Market Accelerator.";
      dEl.textContent = d;
    }
    show(nodes[0]);
    nodes.forEach(function (n) {
      function take() { userTouched = true; timers.forEach(clearTimeout); show(n); }
      n.addEventListener("pointerenter", take); n.addEventListener("focus", take); n.addEventListener("click", take);
      n.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); take(); } });
    });
    if (!reduce) {
      nodes.forEach(function (n) {
        var at = parseFloat(n.getAttribute("data-at")) * 1000;
        timers.push(setTimeout(function () { if (!userTouched) show(n); }, at));
      });
    } else { show(nodes[nodes.length - 1]); }
  }

  /* ---------- contact form: open the visitor's email app ---------- */
  function wireContactForm(form, after) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var g = function (n) { return (form.elements[n] && form.elements[n].value || "").trim(); };
      var body = "Name: " + g("Name") + "\nEmail: " + g("Email") + "\nOrganisation: " + g("Organisation") + "\nRole: " + g("Role") + "\n\n" + g("Message");
      var to = form.getAttribute("action").replace("mailto:", "");
      window.location.href = "mailto:" + to + "?subject=" + encodeURIComponent("Message from the NiCER website") + "&body=" + encodeURIComponent(body);
      say("Opening your email app…");
      if (after) after();
    });
  }
  var form = doc.getElementById("contact-form");
  if (form) wireContactForm(form);

  /* ---------- contact pop-up: any link to contact.html opens this instead of leaving the page ----------
     Without JS or <dialog> support the links still go to contact.html, which stays as the fallback page. */
  (function () {
    var canModal = typeof HTMLDialogElement === "function" && typeof HTMLDialogElement.prototype.showModal === "function";
    if (!canModal || /(^|\/)contact\.html$/.test(location.pathname)) return;   /* that page already shows the form */
    var dlg, opener;
    var MARKUP =
      '<div class="cmodal__panel">' +
      '<button class="cmodal__close" type="button" data-close aria-label="Close the contact form">' +
        '<svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>' +
      '<p class="cmodal__kicker">Contact</p>' +
      '<h2 id="cmodal-title" tabindex="-1">Contact NiCER</h2>' +
      '<p class="cmodal__lead">Thank you for your interest in the NiCER Network. Let’s stay connected.</p>' +
      '<div class="contact cmodal__grid">' +
        '<div class="contact__card"><h3>NiCER Network NPC</h3><dl class="kv">' +
          '<div class="kv__row"><dt>Contact</dt><dd>Muimeleli Mutangwa<br>Chairperson, NiCER Network</dd></div>' +
          '<div class="kv__row"><dt>Telephone</dt><dd><a href="tel:+27728957425">+27 72 895 7425</a></dd></div>' +
          '<div class="kv__row"><dt>Email</dt><dd><a href="mailto:mutangwa@khoro.co.za">mutangwa@khoro.co.za</a></dd></div>' +
          '<div class="kv__row"><dt>Head office</dt><dd>10 Clamant Road, Johannesburg, 2001, South Africa</dd></div>' +
          '<div class="kv__row"><dt>LinkedIn</dt><dd>@NiCER</dd></div></dl></div>' +
        '<form class="form" id="contact-modal-form" action="mailto:mutangwa@khoro.co.za" method="post" enctype="text/plain">' +
          '<h3>Send a message</h3>' +
          '<div class="form__row"><div class="field"><label for="cm-name">Full name</label><input id="cm-name" name="Name" autocomplete="name" required></div>' +
            '<div class="field"><label for="cm-email">Email address</label><input id="cm-email" name="Email" type="email" autocomplete="email" required></div></div>' +
          '<div class="form__row"><div class="field"><label for="cm-org">Organisation</label><input id="cm-org" name="Organisation" autocomplete="organization"></div>' +
            '<div class="field"><label for="cm-role">I am</label><select id="cm-role" name="Role"><option>Choose a role</option><option>Companies and industry</option><option>Universities and research institutions</option><option>Postgraduate students and graduates</option><option>Entrepreneurs and start-ups</option><option>Government and public entities</option><option>Funders and investors</option><option>Professional bodies and SETAs</option><option>Communities</option><option>An ecosystem organisation</option><option>Something else</option></select></div></div>' +
          '<div class="field"><label for="cm-msg">How can we work together?</label><textarea id="cm-msg" name="Message" required></textarea></div>' +
          '<p class="form__note">Sending opens your email app with this message ready to send to mutangwa@khoro.co.za.</p>' +
          '<div><button class="btn btn--primary" type="submit">Send message</button></div>' +
        '</form>' +
      '</div></div>';

    function build() {
      dlg = doc.createElement("dialog");
      dlg.className = "cmodal";
      dlg.setAttribute("aria-labelledby", "cmodal-title");
      dlg.innerHTML = MARKUP;
      doc.body.appendChild(dlg);
      wireContactForm(dlg.querySelector("form"), function () { dlg.close(); });
      dlg.addEventListener("click", function (e) {
        if (e.target.closest("[data-close]")) { dlg.close(); return; }
        /* backdrop click closes it, unless the visitor has started typing */
        if (e.target === dlg) {
          var typed = Array.prototype.some.call(dlg.querySelectorAll("input,textarea"), function (f) { return f.value.trim(); });
          if (!typed) dlg.close();
        }
      });
      dlg.addEventListener("close", function () {
        doc.documentElement.classList.remove("cmodal-lock");
        if (opener && opener.focus && doc.contains(opener)) opener.focus();
      });
    }
    function open(from) {
      if (!dlg) build();
      opener = from || null;
      closeAll(); closeMobile();
      doc.documentElement.classList.add("cmodal-lock");
      dlg.showModal();
      /* wide screens: straight into the first field; phones: start at the top so the details are seen first */
      var wide = window.matchMedia("(min-width: 901px)").matches;
      dlg.querySelector(wide ? "#cm-name" : "#cmodal-title").focus({ preventScroll: true });
      dlg.querySelector(".cmodal__panel").scrollTop = 0;
    }
    doc.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest('[data-contact], a[href$="contact.html"]');
      if (!t) return;
      if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      open(t);
    });
  })();


  /* ---------- partner logos: use assets/partners/<slug>.(svg|png|webp|jpg) when the file exists, otherwise keep the text name ---------- */
  var selfScript = doc.querySelector('script[src*="assets/js/main.js"]'), base = selfScript ? selfScript.getAttribute("src").replace(/assets\/js\/main\.js.*$/, "") : "";
  Array.prototype.forEach.call(doc.querySelectorAll("[data-logo]"), function (slot) {
    var slug = slot.getAttribute("data-logo"), exts = ["svg", "png", "webp", "jpg", "jpeg", "gif", "avif"], name = slot.textContent.trim();
    (function tryNext(i) {
      if (i >= exts.length) return;
      var img = new Image(); img.alt = name; img.decoding = "async";
      img.onload = function () { slot.insertBefore(img, slot.firstChild); slot.classList.add("has-logo"); };
      img.onerror = function () { tryNext(i + 1); };
      img.src = base + "assets/partners/" + slug + "." + exts[i];
    })(0);
  });

  /* ---------- ensure the News & Events link exists in the header, mobile menu and footer ---------- */
  (function () {
    var root = (selfScript ? selfScript.getAttribute("src").replace(/assets\/js\/main\.js.*$/, "") : ""), label = "News & Events", href = root + "news.html";
    function after(ref, make) { if (ref && ref.parentNode) ref.parentNode.insertBefore(make(), ref.nextSibling); }
    var d = doc.querySelector('.nav-item > a.nav-link[href$="partners.html"]');
    if (d && !doc.querySelector('.nav-item > a.nav-link[href$="news.html"]')) after(d.parentNode, function () { var li = doc.createElement("li"), a = doc.createElement("a"); li.className = "nav-item"; a.className = "nav-link"; a.href = href; a.textContent = label; li.appendChild(a); return li; });
    var m = doc.querySelector('a.m-top[href$="partners.html"]');
    if (m && !doc.querySelector('a.m-top[href$="news.html"]')) after(m, function () { var a = doc.createElement("a"); a.className = "m-top"; a.href = href; a.textContent = label; return a; });
    var f = doc.querySelector('footer li > a[href$="partners.html"]');
    if (f && !doc.querySelector('footer li > a[href$="news.html"]')) after(f.parentNode, function () { var li = doc.createElement("li"), a = doc.createElement("a"); a.href = href; a.textContent = label; li.appendChild(a); return li; });
  })();

  /* ---------- footer year ---------- */
  Array.prototype.forEach.call(doc.querySelectorAll("[data-year]"), function (el) { el.textContent = new Date().getFullYear(); });
})();