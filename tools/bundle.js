/* Fold the whole game back into one file you can email, drop on a USB stick,
 * or open with no server at all.
 *
 *   node tools/bundle.js            -> dist/multiverse-vessel.html
 *
 * It reads index.html, inlines src/style.css and every <script src> in the
 * order the page lists them, and writes one self-contained page. Nothing is
 * minified: the bundle is meant to stay readable.
 */
const fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..");
const out  = path.join(root, "dist", "multiverse-vessel.html");

let html = fs.readFileSync(path.join(root, "index.html"), "utf8");

const css = /<link rel="stylesheet" href="(src\/[^"]+\.css)">/.exec(html);
if(!css) throw new Error("index.html no longer links a local stylesheet");
html = html.replace(css[0], "<style>\n" + read(css[1]) + "</style>");

const tags = [...html.matchAll(/<script src="(src\/[^"]+)"><\/script>\n?/g)];
if(!tags.length) throw new Error("index.html no longer loads any source files");
const js = tags.map(t => read(t[1])).join("\n");
for(const t of tags) html = html.replace(t[0], "");
html = html.replace("</body></html>", "<script>\n" + js + "\n</script>\n</body></html>");

fs.mkdirSync(path.dirname(out), {recursive:true});
fs.writeFileSync(out, html);
console.log(`${path.relative(root, out)}  ${(html.length/1024).toFixed(0)} KB  `
          + `from ${tags.length} source files`);

function read(rel){
  const p = path.join(root, rel);
  if(!fs.existsSync(p)) throw new Error("index.html asks for " + rel + ", which is not there");
  return fs.readFileSync(p, "utf8");
}
