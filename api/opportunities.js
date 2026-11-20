/* NiCER Notice Board feed (Vercel serverless function).
   Pulls public opportunity listings from RSS feeds (plus Adzuna jobs if ADZUNA_APP_ID / ADZUNA_APP_KEY are set),
   sorts them into categories, drops expired ones and returns JSON. Cached at the edge for 1 hour.
   We only keep the title, a short snippet and the link back to the original page. */
const crypto = require("crypto");

/* Add, remove or reorder sources here. intl:true = international feed, kept only when the item looks relevant to Africa. */
const SOURCES = [
  { name: "SETA Careers", url: "https://www.setacareers.co.za/feed/" },
  { name: "Youth Village", url: "https://youthvillage.co.za/feed/" },
  { name: "Edupstairs", url: "https://www.edupstairs.org/feed/" },
  { name: "Opportunity Desk", url: "https://opportunitydesk.org/feed/", intl: true },
  { name: "Opportunities for Africans", url: "https://www.opportunitiesforafricans.com/feed/", intl: true },
  { name: "Funds for NGOs", url: "https://www.fundsforngos.org/feed/", intl: true }
];
const MONTHS = "january february march april may june july august september october november december".split(" ");
const AFRICA = /south africa|africa|global|worldwide|all countries|international|developing countr/i;
const MAX_AGE_DAYS = { job: 45, def: 120 };

function decode(s) {
  return s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#x27;|&apos;/g, "'").replace(/&amp;/g, "&");
}
function clean(s) {
  return decode(String(s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}
function tag(x, n) { const m = x.match(new RegExp("<" + n + "[^>]*>([\\s\\S]*?)</" + n + ">", "i")); return m ? m[1] : ""; }

function classify(t) {
  t = t.toLowerCase();
  if (/learnership|apprentice|internship|trainee|graduate programme/.test(t)) return "learnership";
  if (/bursar/.test(t)) return "bursary";
  if (/scholarship|fellowship/.test(t)) return "scholarship";
  if (/\bgrants?\b|funding|seed fund|call for proposals|prize|competition|award|loan/.test(t)) return "funding";
  if (/hackathon|summit|conference|webinar|workshop|expo|festival|\bevent/.test(t)) return "event";
  if (/accelerator|incubator|programme|program\b|bootcamp|cohort/.test(t)) return "programme";
  if (/vacanc|\bjobs?\b|hiring|position|recruit|manager|officer|engineer|developer|assistant|clerk/.test(t)) return "job";
  return null;
}
function deadline(text) {
  const m = text.match(/(?:clos(?:ing|es)(?: date)?|deadline|apply (?:before|by)|until)[^.\d]{0,25}(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(20\d\d)/i);
  if (!m) return null;
  return m[3] + "-" + String(MONTHS.indexOf(m[2].toLowerCase()) + 1).padStart(2, "0") + "-" + String(m[1]).padStart(2, "0");
}
function snippet(s) {
  s = s.replace(/The post .* appeared first on .*$/i, "").trim();
  return s.length > 220 ? s.slice(0, 220).replace(/\s+\S*$/, "") + "…" : s;
}
function build(src, title, link, desc, cats, date, extra) {
  const text = title + " " + cats.join(" ");
  const category = classify(text) || classify(title + " " + desc);
  if (!category || !/^https?:\/\//.test(link)) return null;
  if (src.intl && !AFRICA.test(title + " " + desc + " " + cats.join(" "))) return null;
  const pub = date && !isNaN(new Date(date)) ? new Date(date) : new Date();
  return Object.assign({ id: crypto.createHash("md5").update(link).digest("hex").slice(0, 12), title, category, source: src.name,
    summary: snippet(desc), url: link, published: pub.toISOString(), deadline: deadline(title + ". " + desc) }, extra || {});
}
function parseRss(src, xml) {
  return (xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || []).map((x) => {
    const full = clean(tag(x, "content:encoded"));
    const desc = clean(tag(x, "description")) || full;
    const cats = (x.match(/<category[^>]*>[\s\S]*?<\/category>/gi) || []).map(clean);
    const it = build(src, clean(tag(x, "title")), clean(tag(x, "link")), desc, cats, tag(x, "pubDate"));
    if (it && !it.deadline) it.deadline = deadline(full);
    return it;
  }).filter(Boolean);
}

async function get(url, opts) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(url, Object.assign({ signal: ctl.signal, headers: { "User-Agent": "NiCER-Noticeboard/1.0 (+https://nicer.org)", Accept: "application/rss+xml, application/json, */*" } }, opts));
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r;
  } finally { clearTimeout(t); }
}
async function loadFeed(src) { return parseRss(src, await (await get(src.url)).text()); }
async function loadAdzuna() {
  const id = process.env.ADZUNA_APP_ID, key = process.env.ADZUNA_APP_KEY;
  if (!id || !key) return null;
  const src = { name: "Adzuna" };
  const j = await (await get("https://api.adzuna.com/v1/api/jobs/za/search/1?app_id=" + id + "&app_key=" + key + "&results_per_page=40&sort_by=date&content-type=application/json")).json();
  return (j.results || []).map((r) => {
    const it = build(src, clean(r.title), r.redirect_url, clean(r.description), [], r.created, { organisation: r.company && r.company.display_name, location: r.location && r.location.display_name });
    if (it) it.category = "job";
    return it;
  }).filter(Boolean);
}

module.exports = async (req, res) => {
  const jobs = SOURCES.map((s) => ({ name: s.name, run: () => loadFeed(s) })).concat([{ name: "Adzuna", run: loadAdzuna }]);
  const results = await Promise.allSettled(jobs.map((j) => j.run()));
  const status = [], seen = new Set(), today = new Date().toISOString().slice(0, 10);
  let items = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value === null) return; /* source switched off (no API key) */
    status.push({ name: jobs[i].name, ok: r.status === "fulfilled", count: r.status === "fulfilled" ? r.value.length : 0, error: r.status === "rejected" ? String(r.reason && r.reason.message || r.reason) : undefined });
    if (r.status === "fulfilled") items = items.concat(r.value);
  });
  items = items.filter((n) => {
    if (n.deadline && n.deadline < today) return false;
    if (!n.deadline && Date.now() - new Date(n.published) > (MAX_AGE_DAYS[n.category] || MAX_AGE_DAYS.def) * 864e5) return false;
    const k = n.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (seen.has(k)) return false; seen.add(k); return true;
  }).sort((a, b) => new Date(b.published) - new Date(a.published)).slice(0, 300);
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json({ updated: new Date().toISOString(), count: items.length, items, sources: status });
};
module.exports._test = { parseRss, classify, deadline };
