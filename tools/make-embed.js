/* Makes img/embed.webp — the picture shown when the site's link is shared (Discord, Twitter / X, WhatsApp ...).
   Run, from the project folder:     node tools/make-embed.js */
const sharp = require("sharp");
const path = require("path");
const root = path.join(__dirname, "..");
const W = 1200, H = 630;

(async () => {
  const icon = async (f, h) => sharp(path.join(root, "img", f)).resize({ height: h }).png().toBuffer();
  const killer = await icon("killer-icon.webp", 300), survivor = await icon("survivor-icon.webp", 300);
  const text = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="g" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#2a0f17"/><stop offset="1" stop-color="#0c0c0d"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <text x="600" y="108" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="700" fill="#f5f5f5" text-anchor="middle" letter-spacing="2"><tspan fill="#cf2a4e">alex sir</tspan> BUILDS FOR</text>
    <text x="600" y="190" font-family="Arial, Helvetica, sans-serif" font-size="76" font-weight="800" fill="#f5f5f5" text-anchor="middle" letter-spacing="3">DEAD BY DAYLIGHT</text>
    <rect x="500" y="215" width="200" height="4" rx="2" fill="#cf2a4e"/>
    <text x="600" y="585" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#9a9aa0" text-anchor="middle">Killer &amp; survivor builds · 1v1 rules</text>
  </svg>`);
  await sharp(text)
    .composite([{ input: killer, left: 250, top: 262 }, { input: survivor, left: 650, top: 262 }])
    .webp({ quality: 88 }).toFile(path.join(root, "img", "embed.webp"));
  console.log("img/embed.webp written");
})();
