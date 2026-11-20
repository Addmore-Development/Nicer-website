/* NiCER — opens the psychometric test in a pop-up instead of sending the visitor to assessment.html.
   Any link or button marked data-assessment (or pointing at assessment.html) opens it. The test, the results
   and the "retake" step all happen inside the pop-up. Needs assessment.js. Nothing is stored or sent. */
(function () {
  "use strict";
  var doc = document, dlg, panel, api, opener;
  var canModal = typeof HTMLDialogElement === "function" && typeof HTMLDialogElement.prototype.showModal === "function";

  var MARKUP =
    '<div class="amodal__panel" id="amodal-panel">' +
    '<button class="amodal__close" type="button" data-close aria-label="Close the psychometric test">' +
      '<svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>' +
    '<p class="amodal__kicker" id="amodal-title">Psychometric test</p>' +
    '<div class="test__card" id="t-intro">' +
      '<h2 data-focus>Which programme is right for you?</h2>' +
      '<p>Fifteen short statements, about three minutes. We will show you the NiCER programme you could benefit from most.</p>' +
      '<ul class="ticks">' +
        '<li>You will see 15 statements, one at a time. Choose how far you agree with each.</li>' +
        '<li>There are no right or wrong answers. Go with your first instinct.</li>' +
        '<li>Your answers stay on this page. Nothing is sent or saved.</li>' +
      '</ul>' +
      '<p class="form__note">This is a short guide to help you explore NiCER\'s programmes, not a clinical or professional assessment.</p>' +
      '<div><button class="btn btn--primary" type="button" id="t-start">Start the test</button></div>' +
    '</div>' +
    '<div class="test__card" id="t-quiz" hidden>' +
      '<div class="prog" id="t-progress" role="progressbar" aria-label="Test progress" aria-valuemin="1" aria-valuemax="15" aria-valuenow="1"><div class="prog__bar" id="t-bar"></div></div>' +
      '<p class="test__count" id="t-count" aria-live="polite"></p>' +
      '<fieldset class="q"><legend id="t-legend" tabindex="-1"></legend><div class="opts" id="t-options"></div></fieldset>' +
      '<div class="test__nav"><button class="btn btn--outline" type="button" id="t-back" hidden>Back</button><button class="btn btn--primary" type="button" id="t-next" disabled>Next</button></div>' +
    '</div>' +
    '<div class="test__card" id="t-result" hidden>' +
      '<p class="result__eyebrow" id="r-eyebrow"></p>' +
      '<h2 id="r-name" data-focus></h2>' +
      '<p class="result__line" id="r-line"></p>' +
      '<p id="r-why"></p>' +
      '<div class="callout-soft" id="r-also" hidden></div>' +
      '<h3>Good places to start</h3>' +
      '<ul class="ticks" id="r-start"></ul>' +
      '<div class="test__nav"><a class="btn btn--primary" id="r-open" href="#">Explore</a><button class="btn btn--outline" type="button" id="t-retake">Retake the test</button></div>' +
      '<h3 style="margin-top:24px">How you scored across all five programmes</h3>' +
      '<ul class="bars" id="r-bars"></ul>' +
    '</div>' +
    '</div>';

  function build() {
    dlg = doc.createElement("dialog");
    dlg.className = "amodal";
    dlg.setAttribute("aria-labelledby", "amodal-title");
    dlg.innerHTML = MARKUP;
    doc.body.appendChild(dlg);
    panel = dlg.querySelector("#amodal-panel");
    api = window.NICERAssessment.init(dlg, { onShow: function () { panel.scrollTop = 0; } });

    dlg.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]")) { dlg.close(); return; }
      /* a click on the dark backdrop closes it, except mid-test so answers are not lost by accident */
      if (e.target === dlg && dlg.querySelector("#t-quiz").hidden) { dlg.close(); return; }
      /* following a link (results) leaves the pop-up behind */
      if (e.target.closest("a[href]")) dlg.close();
    });
    dlg.addEventListener("close", function () {
      doc.documentElement.classList.remove("amodal-lock");
      if (opener && opener.focus) opener.focus();
    });
  }

  function open(from) {
    if (!dlg) build();
    opener = from || null;
    doc.documentElement.classList.add("amodal-lock");
    dlg.showModal();
    api.reset();
  }

  doc.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest('[data-assessment], a[href$="assessment.html"]');
    if (!t || !canModal || !window.NICERAssessment) return;      /* no support: the link still opens assessment.html */
    if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    open(t);
  });
})();
