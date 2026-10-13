# DBD Builds

My Dead by Daylight builds for killers and survivors: perks, add-ons, items, offerings and the 1v1 rules.

**Live:** [dbdbuilds.vercel.app](https://dbdbuilds.vercel.app/) · [siralexeu.github.io/dbd-builds](https://siralexeu.github.io/dbd-builds/)

Inspired by [Otzdarva's builds](https://otzdarva-builds.com/) and [Hens333](https://hens333.com/).

## Features

- A page for every killer with its builds, plus a survivors page.
- Each build shows 4 perks, the add-ons, item and offering, with the name on hover and the full description on click or hold.
- Hover / hold aura in the colour of each icon (perks, add-ons, items, offerings, powers); coloured border on killer and survivor portraits.
- A **1v1** tab for every killer and for survivors: the rules, banned perks and add-ons, and builds that respect them.
- Edit mode to make and change builds, search by build, killer or perk, clean addresses (`/killers/trapper`).
- No framework, no build step: plain HTML, CSS and JavaScript.

## Project layout

```
index.html          the page (the whole site is rendered by js/app.js)
404.html            page not found
css/style.css       all the styles
js/data.js          killers, perks, add-ons, items, offerings, survivors and their descriptions
js/builds.js        the saved builds (written by the "Save builds" button)
js/rules-1v1.js     the 1v1 rules
js/glow-colors.js   aura colours (generated, do not edit by hand)
js/app.js           the site itself
img/                the pictures the site uses (WebP)
tools/              helper scripts (not part of the site)
vercel.json         rewrites + cache headers (Vercel only)
```

## Run it locally

Any static server works, for example:

```bash
npx serve -s . -l 5188
```

then open `http://localhost:5188`.

## Adding or changing builds

1. Open the site and go to **Switch to edit mode** (bottom-left of the home page).
2. Make the builds, then press **Save builds** to download `builds.js`.
3. Replace `js/builds.js` with it and commit.

## Adding or changing pictures

The original PNGs live in `img-originals/` (only on my computer, not in the repo). The scripts in `tools/` make the small WebP files and the aura colours.

```bash
npm install --prefix tools          # the first time only
node tools/convert-images.js        # new or changed pictures -> img/*.webp
node tools/glow-colors.js           # aura colours -> js/glow-colors.js
```

Run `glow-colors.js` again whenever a picture or an entry in `js/data.js` is added or changed. A colour that comes out wrong can be fixed in `OVERRIDES` inside the script.

## Hosting

The site is static and works on both GitHub Pages and Vercel. `vercel.json` sets the cache headers (images 7 days, CSS / JS 1 hour) and the rewrite for the clean addresses. GitHub Pages ignores it and uses its own 10 minute cache.

## Credits

Created by [siralexeu](https://github.com/siralexeu). *Dead by Daylight* and all its names and pictures belong to Behaviour Interactive; this is an unofficial fan project.
