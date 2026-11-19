/* NiCER — partner logo marquee. Turns [data-marquee] into two rows of logo tiles that drift in opposite directions.
   Must load BEFORE main.js and partner-logos.js so the copied tiles are filled with logos like the originals. */
(function () {
  "use strict";
  var box = document.querySelector("[data-marquee]"); if (!box) return;
  var tiles = Array.prototype.slice.call(box.children); if (tiles.length < 4) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var rows = Math.min(2, Math.ceil(tiles.length / 5)), per = Math.ceil(tiles.length / rows);
  box.textContent = ""; box.classList.add("marquee"); if (reduce) box.classList.add("marquee--static");
  var need = Math.ceil(Math.max(window.screen ? window.screen.width : 0, window.innerWidth) / 240) + 2;

  for (var r = 0; r < rows; r++) {
    var set = tiles.slice(r * per, (r + 1) * per), row = document.createElement("div"), track = document.createElement("div");
    row.className = "marquee__row"; track.className = "marquee__track"; track.setAttribute("data-dir", r % 2 ? "right" : "left");
    track.style.setProperty("--n", set.length); track.style.animationDuration = (set.length * (r % 2 ? 7 : 6)) + "s";
    set.forEach(function (t) { t.classList.add("marquee__tile"); track.appendChild(t); });
    if (!reduce) {
      var copies = Math.max(2, Math.ceil(need / set.length));
      for (var c = 0; c < copies; c++) set.forEach(function (t) { var k = t.cloneNode(true); k.setAttribute("aria-hidden", "true"); k.setAttribute("tabindex", "-1"); track.appendChild(k); });
    }
    row.appendChild(track); box.appendChild(row);
  }
})();