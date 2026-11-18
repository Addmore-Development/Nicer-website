/* NiCER — programme-fit test. 15 statements, 3 per programme, answered on a 5-point scale.
   Nothing is sent or stored: answers live in this page only. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };

  var PROGRAMMES = {
    network: {
      name: "iCE-Cold Networking Ecosystem", href: "programmes/ice-cold-networking-ecosystem.html",
      line: "You are at your best when people, information and opportunities are connected.",
      why: "Your answers point to someone who builds bridges. The iCE-Cold Networking Ecosystem brings researchers, innovators, entrepreneurs, industry, policymakers and funders together so they coordinate instead of working in isolation.",
      start: [["The NiCER Notice Board", "noticeboard.html"], ["Communities of Practice", "programmes/ice-cold-networking-ecosystem.html#communities-of-practice"], ["Before You Change the World dialogue", "programmes/ice-cold-networking-ecosystem.html#before-you-change-the-world-dialogue"]]
    },
    academy: {
      name: "NiCER Academy", href: "programmes/nicer-academy.html",
      line: "You grow through structured learning, guidance and sharing what you know.",
      why: "Your answers point to someone who values building capability first. The NiCER Academy offers accessible, industry-led and accredited learning on research commercialisation, innovation and entrepreneurship, with mentorship alongside.",
      start: [["NiCER Academy courses", "programmes/nicer-academy.html#academy"], ["Student Entrepreneur Mentorship", "programmes/nicer-academy.html#mentorship-framework"], ["Sasol Research Capacity Building", "programmes/nicer-academy.html#sasol-research-capacity-building"]]
    },
    lab: {
      name: "Research to Innovation Lab", href: "programmes/research-to-innovation-lab.html",
      line: "You are drawn to turning discoveries into technology that works.",
      why: "Your answers point to someone who enjoys rigorous, step-by-step development. The Research to Innovation Lab raises the technology readiness of research outputs and IP, from early research towards a market-ready technology.",
      start: [["University IP Commercialisation", "programmes/research-to-innovation-lab.html#university-ip-commercialisation"], ["Sasol Research to Innovation", "programmes/research-to-innovation-lab.html#sasol-research-to-innovation"], ["The VICtry Centre", "programmes/research-to-innovation-lab.html#victry-centre"]]
    },
    accelerator: {
      name: "Innovation to Market Accelerator", href: "programmes/innovation-to-market-accelerator.html",
      line: "You want to see ideas reach real customers and grow.",
      why: "Your answers point to someone who is comfortable with commercial risk and focused on traction. The Innovation to Market Accelerator scales innovations and supports start-ups to reach the market, with seed funding and a route to sell creative products.",
      start: [["Ndjaba Seed Fund", "programmes/innovation-to-market-accelerator.html#ndjaba-seed-fund"], ["IMA start-ups", "programmes/innovation-to-market-accelerator.html#ima-start-ups"], ["Sasol Innovation to Market", "programmes/innovation-to-market-accelerator.html#sasol-innovation-to-market"]]
    },
    social: {
      name: "Innovation for Social Investment", href: "programmes/innovation-for-social-investment.html",
      line: "You measure success by the difference made to communities.",
      why: "Your answers point to someone motivated by social impact. Innovation for Social Investment partners with corporate social investment programmes to deliver innovative projects in areas such as education and disability inclusion.",
      start: [["CSI Innovation Partnerships", "programmes/innovation-for-social-investment.html#csi-innovation-partnerships"], ["National Before Varsity Program", "programmes/innovation-for-social-investment.html#before-varsity"], ["Sustainability for CBOs", "programmes/innovation-for-social-investment.html#sustainability-for-cbos"]]
    }
  };

  /* 3 statements per programme, ordered so no two in a row measure the same thing. */
  var QUESTIONS = [
    ["lab", "I am fascinated by taking a scientific finding and working out whether it can become a useful technology."],
    ["social", "The most important measure of my work is the lasting benefit it brings to communities in need."],
    ["network", "I enjoy introducing people who should know each other and I remember who might help whom."],
    ["accelerator", "I am driven to get a product or service in front of paying customers, even when that involves risk."],
    ["academy", "I feel most confident after completing a structured course or earning a recognised qualification."],
    ["network", "I would rather join a community working on similar problems than tackle a problem alone."],
    ["accelerator", "I would rather launch something imperfect and improve it with customer feedback than wait until it is perfect."],
    ["social", "I am drawn to working with schools, NGOs or community organisations on problems such as education or disability inclusion."],
    ["academy", "I enjoy explaining what I know to others, and I learn well from a mentor."],
    ["lab", "I am comfortable with long, careful testing to prove that something works before I show it to the world."],
    ["social", "I am motivated to help community organisations become strong enough to sustain their own work."],
    ["academy", "There are skills in research, business or innovation that I want to build before I take my next big step."],
    ["lab", "Protecting and commercialising intellectual property from a university or lab sounds like a worthwhile challenge."],
    ["network", "I regularly look out for jobs, funding calls and events so I do not miss opportunities."],
    ["accelerator", "I think about funding, pricing and growth as much as I think about the idea itself."]
  ];
  var SCALE = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"];

  var answers = new Array(QUESTIONS.length), idx = 0;
  var views = { intro: $("t-intro"), quiz: $("t-quiz"), result: $("t-result") };
  function show(name) {
    Object.keys(views).forEach(function (k) { views[k].hidden = k !== name; });
    var h = views[name].querySelector("[data-focus]"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    views[name].scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  function renderQuestion() {
    $("t-count").textContent = "Question " + (idx + 1) + " of " + QUESTIONS.length;
    var bar = $("t-bar"); bar.style.width = ((idx) / QUESTIONS.length * 100) + "%";
    $("t-progress").setAttribute("aria-valuenow", idx + 1);
    $("t-legend").textContent = QUESTIONS[idx][1];
    var box = $("t-options"); box.textContent = "";
    SCALE.forEach(function (label, i) {
      var id = "opt-" + i, wrap = el("div", "opt");
      var inp = el("input"); inp.type = "radio"; inp.name = "q"; inp.id = id; inp.value = i + 1; inp.checked = answers[idx] === i + 1;
      inp.addEventListener("change", function () { answers[idx] = i + 1; $("t-next").disabled = false; });
      var lab = el("label", null, label); lab.setAttribute("for", id);
      wrap.appendChild(inp); wrap.appendChild(lab); box.appendChild(wrap);
    });
    $("t-next").disabled = !answers[idx];
    $("t-next").textContent = idx === QUESTIONS.length - 1 ? "See my results" : "Next";
    $("t-back").hidden = idx === 0;
    $("t-legend").focus({ preventScroll: true });
  }

  function score() {
    var t = { network: 0, academy: 0, lab: 0, accelerator: 0, social: 0 };
    QUESTIONS.forEach(function (q, i) { t[q[0]] += answers[i]; });
    return Object.keys(t).map(function (k) {
      return { key: k, raw: t[k], pct: Math.round((t[k] - 3) / 12 * 100) };   /* 3 items: raw runs 3 to 15 */
    }).sort(function (a, b) { return b.raw - a.raw; });
  }

  function renderResult() {
    var ranked = score(), top = ranked[0], P = PROGRAMMES[top.key];
    var also = ranked.slice(1).filter(function (r) { return top.raw - r.raw <= 1 && r.raw >= 10; });
    var spread = top.raw - ranked[ranked.length - 1].raw;
    var flat = spread <= 2;            /* no programme stands out from the rest */
    var weak = flat || top.raw < 9;
    function list(a) { return a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]; }

    if (flat) {
      $("r-eyebrow").textContent = "Your results";
      $("r-name").textContent = top.raw >= 12 ? "You are a fit across the board" : "No single programme stands out yet";
      $("r-line").textContent = top.raw >= 12 ? "You scored highly for all five programmes." : "Your answers were spread evenly across the programmes.";
      $("r-why").textContent = "The five programmes are designed to work as one pathway, from a connected ecosystem to the market and social impact. Start with " + P.name + " below, or browse all five and see which feels right.";
    } else {
      $("r-eyebrow").textContent = weak ? "Your closest match" : (also.length ? "Your strongest match" : "Your best-fit programme");
      $("r-name").textContent = P.name;
      $("r-line").textContent = P.line;
      $("r-why").textContent = weak
        ? "No single programme scored strongly, but " + P.name + " came out slightly ahead. Browse all five to see which feels right."
        : P.why;
    }
    $("r-open").setAttribute("href", flat ? "programmes.html" : P.href);
    $("r-open").textContent = flat ? "Browse all programmes" : "Explore " + P.name;

    var alsoBox = $("r-also"); alsoBox.textContent = "";
    if (also.length && !weak && !flat) {
      alsoBox.appendChild(el("p", null, "You also scored strongly for " + list(also.map(function (r) { return PROGRAMMES[r.key].name; })) + ". Many people benefit from combining programmes."));
      alsoBox.hidden = false;
    } else alsoBox.hidden = true;

    var st = $("r-start"); st.textContent = "";
    P.start.forEach(function (s) { var li = el("li"), a = el("a", "link", s[0]); a.href = s[1]; li.appendChild(a); st.appendChild(li); });

    var bars = $("r-bars"); bars.textContent = "";
    ranked.forEach(function (r) {
      var li = el("li", "bar" + (r === top ? " is-top" : ""));
      var head = el("div", "bar__head"); head.appendChild(el("span", null, PROGRAMMES[r.key].name)); head.appendChild(el("b", null, r.pct + "%"));
      var track = el("div", "bar__track"), fill = el("div", "bar__fill"); fill.style.width = r.pct + "%";
      track.appendChild(fill); li.appendChild(head); li.appendChild(track); bars.appendChild(li);
    });
    show("result");
  }

  $("t-start").addEventListener("click", function () { idx = 0; show("quiz"); renderQuestion(); });
  $("t-next").addEventListener("click", function () {
    if (!answers[idx]) return;
    if (idx < QUESTIONS.length - 1) { idx++; renderQuestion(); } else renderResult();
  });
  $("t-back").addEventListener("click", function () { if (idx > 0) { idx--; renderQuestion(); } });
  $("t-retake").addEventListener("click", function () { answers = new Array(QUESTIONS.length); idx = 0; show("intro"); });
})();
