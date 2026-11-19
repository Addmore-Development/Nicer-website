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
  var form = doc.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var g = function (n) { return (form.elements[n] && form.elements[n].value || "").trim(); };
      var body = "Name: " + g("Name") + "\nEmail: " + g("Email") + "\nOrganisation: " + g("Organisation") + "\nRole: " + g("Role") + "\n\n" + g("Message");
      var to = form.getAttribute("action").replace("mailto:", "");
      window.location.href = "mailto:" + to + "?subject=" + encodeURIComponent("Message from the NiCER website") + "&body=" + encodeURIComponent(body);
      say("Opening your email app…");
    });
  }


  /* ---------- partner logos: use assets/partners/<slug>.(svg|png|webp|jpg) when the file exists, otherwise keep the text name ---------- */
  var selfScript = doc.querySelector('script[src*="assets/js/main.js"]'), base = selfScript ? selfScript.getAttribute("src").replace(/assets\/js\/main\.js.*$/, "") : "";
  Array.prototype.forEach.call(doc.querySelectorAll("[data-logo]"), function (slot) {
    var slug = slot.getAttribute("data-logo"), exts = ["svg", "png", "webp", "jpg", "jpeg", "gif", "avif"], name = slot.textContent.trim();
    (function tryNext(i) {
      if (i >= exts.length) return;
      var img = new Image(); img.alt = name; img.decoding = "async"; img.loading = "lazy";
      img.onload = function () { slot.insertBefore(img, slot.firstChild); slot.classList.add("has-logo"); };
      img.onerror = function () { tryNext(i + 1); };
      img.src = base + "assets/partners/" + slug + "." + exts[i];
    })(0);
  });

  /* ---------- footer year ---------- */
  Array.prototype.forEach.call(doc.querySelectorAll("[data-year]"), function (el) { el.textContent = new Date().getFullYear(); });
})();