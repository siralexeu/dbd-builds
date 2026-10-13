/* Makes the small WebP pictures the site uses from the big original PNGs.

   The originals live in img-originals/ (same sub-folders and names as in img/, e.g. img-originals/perks/kp-agitation.png);
   that folder stays on your computer only (it is in .gitignore). This script reads them and writes the WebP files into
   img/ — same sub-folder, same name, .webp instead of .png — made smaller (about 2x the size the picture is shown at, so
   it stays sharp on phones and laptops with dense screens).

   Adding or changing a picture:
     1. put the PNG in img-originals/<folder>/  (folders: killers survivors powers maps items item-addons offerings addons perks)
     2. run, from the project folder:     node tools/convert-images.js
        (the first time: npm install --prefix tools)
     3. in js/data.js use the path with .webp, e.g.  img: "img/perks/kp-agitation.webp"

   node tools/convert-images.js          only pictures that are new or changed
   node tools/convert-images.js --all    everything again (e.g. after changing the sizes below) */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const SRC = path.join(root, "img-originals");
const OUT = path.join(root, "img");
const all = process.argv.includes("--all");

// folder → [largest width in px, WebP quality]   ("." = the loose pictures in img-originals itself, e.g. the home page icons)
const PLAN = {
  killers: [320, 82], survivors: [320, 82], powers: [160, 85], maps: [512, 80],
  items: [160, 85], "item-addons": [160, 85], offerings: [160, 85], addons: [160, 85], perks: [192, 85],
  ".": [512, 85],
};

(async () => {
  if (!fs.existsSync(SRC)) { console.error("img-originals/ not found — the original PNGs are not on this computer."); process.exit(1); }
  let done = 0, skipped = 0, before = 0, after = 0;
  for (const [dir, [width, quality]] of Object.entries(PLAN)) {
    const from = path.join(SRC, dir);
    if (!fs.existsSync(from)) continue;
    for (const name of fs.readdirSync(from)) {
      const file = path.join(from, name);
      if (!/\.png$/i.test(name) || !fs.statSync(file).isFile()) continue;
      const target = path.join(OUT, dir, name.replace(/\.png$/i, ".webp"));
      if (!all && fs.existsSync(target) && fs.statSync(target).mtimeMs >= fs.statSync(file).mtimeMs) { skipped++; continue; }
      fs.mkdirSync(path.dirname(target), { recursive: true });
      await sharp(file).resize({ width, withoutEnlargement: true }).webp({ quality, alphaQuality: 90, effort: 5 }).toFile(target);
      before += fs.statSync(file).size; after += fs.statSync(target).size; done++;
    }
  }
  console.log(`converted ${done}, already up to date ${skipped}` + (done ? ` | ${(before / 1048576).toFixed(1)} MB → ${(after / 1048576).toFixed(1)} MB` : ""));
})();
