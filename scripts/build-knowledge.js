/* Rebuilds api/knowledge.txt from the site's pages so the chatbot answers from what the site actually says.
   Run after editing page content:  node scripts/build-knowledge.js */
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const pages = ["index.html", "about.html", "programmes.html", "partners.html", "get-involved.html", "contact.html", "news.html",
  ...fs.readdirSync(path.join(root, "programmes")).filter(f => f.endsWith(".html")).sort().map(f => "programmes/" + f)];
const ent = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " ", "&rsquo;": "’", "&lsquo;": "‘", "&ndash;": "–", "&mdash;": "—" };
function text(html) {
  const m = html.match(/<main[\s\S]*?<\/main>/i); let s = m ? m[0] : html;
  s = s.replace(/<(script|style|svg|form)[\s\S]*?<\/\1>/gi, "").replace(/<\/(p|h\d|li|div|section|tr|dt|dd)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ");
  s = s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).replace(/&[a-z]+;|&#39;/gi, e => ent[e] || " ");
  return s.split("\n").map(l => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
}
const out = pages.map(p => {
  const url = "/" + (p === "index.html" ? "" : p);
  return "### PAGE " + url + "\n" + text(fs.readFileSync(path.join(root, p), "utf8"));
}).join("\n\n");
fs.writeFileSync(path.join(root, "api", "knowledge.txt"), out);
console.log("api/knowledge.txt written:", out.length, "characters from", pages.length, "pages");
