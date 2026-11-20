/* NiCER — partner logos managed in the admin dashboard. Fills any [data-logo] slot that does not already have a logo file. */
(function () {
  "use strict";
  var P = window.NicerPublic, slots = document.querySelectorAll("[data-logo]"); if (!P || !slots.length) return;
  P.get("partners?select=slug,name,logo_url&logo_url=not.is.null").then(function (rows) {
    var by = {}; (rows || []).forEach(function (r) { var u = P.safeUrl(r.logo_url); if (u) by[r.slug] = u; });
    Array.prototype.forEach.call(slots, function (slot) {
      var u = by[slot.getAttribute("data-logo")]; if (!u || slot.querySelector("img")) return;
      var img = new Image(); img.alt = slot.textContent.trim(); img.decoding = "async";
      img.onload = function () { if (!slot.querySelector("img")) { slot.insertBefore(img, slot.firstChild); slot.classList.add("has-logo"); } };
      img.src = u;
    });
  }).catch(function () { /* text names stay in place */ });
})();