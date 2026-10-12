(function () {
  "use strict";

  const D = window.DBD_DATA;
  const RARITY = { common: "Common", uncommon: "Uncommon", rare: "Rare", veryrare: "Very Rare", ultrarare: "Ultra Rare" };
  const SLOT_LABEL = { perks: "perk", addons: "add-on", offering: "offering", item: "item", survivor: "survivor", alt: "alternative perk" };
  // try-out: alternative perks open as a dropdown under the perk (false = the old pop-up in the middle of the screen)
  const ALT_DROPDOWN = true;
  const SHAPE = { perks: "perk", addons: "addon", offering: "offering", item: "item", survivor: "survivor", alt: "perk" };

  /* one lookup for every perk / add-on / offering / item by id */
  const INDEX = {};
  [D.killerPerks, D.survivorPerks, D.offerings, D.survivorItems, D.survivorAddons, D.survivors]
    .forEach((list) => list.forEach((e) => (INDEX[e.id] = e)));
  D.killers.forEach((k) => k.addons.forEach((a) => (INDEX[a.id] = a)));
  // each killer's power, shown first in the add-on chain (not selectable — it belongs to the killer)
  D.killers.forEach((k) => (INDEX["pw-" + k.id] = { id: "pw-" + k.id, name: k.power, owner: "Power · " + k.name, img: k.powerImg, desc: k.powerDesc }));

  /* ---------------- 1v1 rules (js/rules-1v1.js) ---------------- */
  const R1 = window.DBD_1V1 || { survivor: {}, killer: {} };
  const nameKey = (x) => String(x || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  function idsByName(list, names) {
    const out = [];
    for (const n of names || []) {
      const e = list.find((x) => nameKey(x.name) === nameKey(n) || (x.aliases || []).some((a) => nameKey(a) === nameKey(n)));
      if (e) out.push(e.id); else console.warn("1v1 rules: not found:", n);
    }
    return out;
  }
  // add-on bans: names, or a whole rarity ("Ultra Rare" = all of that killer's ultra rare add-ons)
  const RARITY_KEYS = { common: "common", uncommon: "uncommon", rare: "rare", veryrare: "veryrare", ultrarare: "ultrarare", iridescent: "ultrarare", visceral: "ultrarare" };
  function addonBans(killer, names) {
    if (!killer) return [];
    const out = [];
    for (const n of names || []) {
      if (nameKey(n) === "all") return killer.addons.map((a) => a.id);
      const r = RARITY_KEYS[nameKey(n)];
      if (r) killer.addons.filter((a) => a.rarity === r).forEach((a) => out.push(a.id));
      else out.push(...idsByName(killer.addons, [n]));
    }
    return [...new Set(out)];
  }

  /* everything that applies to one killer (id) or to survivors ("survivor") */
  function rulesFor(scope) {
    if (scope === "survivor") {
      const r = R1.survivor || {};
      return { role: "survivor", rules: r.rules || [], notes: [], bannedPerks: idsByName(D.survivorPerks, r.bannedPerks),
        bannedAddons: [], map: r.map || null, perkSlots: r.perkSlots || 2, addonSlots: 0 };
    }
    const r = R1.killer || {}, pk = (r.perKiller || {})[scope] || {};
    const killer = D.killers.find((x) => x.id === scope);
    const allowed = new Set(idsByName(D.killerPerks, pk.allowedPerks));
    const allPerks = (pk.bannedPerks || []).some((x) => nameKey(x) === "all");
    const banned = allPerks ? D.killerPerks.map((p) => p.id)
      : [...new Set([...idsByName(D.killerPerks, r.bannedPerks), ...idsByName(D.killerPerks, pk.bannedPerks)])];
    return { role: "killer", rules: r.rules || [], notes: pk.notes || [], addonsNote: pk.addonsNote || "", hasRules: !!R1.killer.perKiller && !!(R1.killer.perKiller || {})[scope],
      allPerksBanned: allPerks, bannedPerks: banned.filter((id) => !allowed.has(id)),
      bannedAddons: addonBans(killer, pk.bannedAddons), map: pk.map || null,
      perkSlots: r.perkSlots || 3, addonSlots: r.addonSlots || 5 };
  }

  const svg = (w, body, extra = "") =>
    `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${body}</svg>`;
  const ICONS = {
    edit: svg(15, '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>'),
    copy: svg(15, '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
    trash: svg(15, '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>'),
    search: svg(15, '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
    lines: svg(16, '<path d="M4 6h16M4 12h11M4 18h7"/>'),
    chevron: svg(16, '<path d="M9 6l6 6-6 6"/>'),
    close: svg(18, '<path d="M6 6l12 12M18 6L6 18"/>', 'stroke-width="2.4"'),
  };

  /* ---------------- state ---------------- */

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function blankBuild(role) {
    const b = { id: uid(), name: "New build", perks: [null, null, null, null], addons: [null, null], offering: null };
    if (role === "survivor") { b.item = null; b.survivor = null; }
    return b;
  }

  // 1v1 build: fewer perks / add-ons than a normal build; like every build, its perks can have alternatives
  function blank1v1(scope) {
    const r = rulesFor(scope);
    return { id: uid(), name: "1v1 Build", perks: Array(r.perkSlots).fill(null), addons: Array(r.addonSlots).fill(null), alts: {} };
  }
  function ensureV1(s) {
    s.v1 = s.v1 || {};
    s.v1.killers = s.v1.killers || {};
    s.v1.survivor = Array.isArray(s.v1.survivor) ? s.v1.survivor : [];
    D.killers.forEach((k) => { if (!Array.isArray(s.v1.killers[k.id])) s.v1.killers[k.id] = []; });
    [s.v1.survivor, ...Object.values(s.v1.killers)].forEach((list) => list.forEach((b) => {
      b.alts = b.alts || {};
      for (const sw of b.swaps || []) {
        const to = (sw.to || []).filter(Boolean);
        if (!sw.from || !to.length) continue;
        let i = b.perks.indexOf(sw.from);
        if (i < 0) { i = b.perks.indexOf(null); if (i >= 0) b.perks[i] = sw.from; }
        if (i >= 0) b.alts[i] = [...new Set([...(b.alts[i] || []), ...to])].slice(0, 3);
      }
      delete b.swaps;
    }));
    // killer 1v1 builds: fit older builds to the current slot counts (keeps the first chosen perk / add-ons)
    const KR = rulesFor(D.killers[0].id);
    Object.values(s.v1.killers).forEach((list) => list.forEach((b) => {
      if (b.perks.length !== KR.perkSlots) {
        const keep = b.perks.map((id, n) => ({ id, n })).filter((x) => x.id).slice(0, KR.perkSlots);
        const alts = {};
        b.perks = Array(KR.perkSlots).fill(null);
        keep.forEach((x, i) => { b.perks[i] = x.id; if (b.alts[x.n]) alts[i] = b.alts[x.n]; });
        b.alts = alts;
      }
      if (b.addons.length !== KR.addonSlots) {
        const kept = b.addons.filter(Boolean).slice(0, KR.addonSlots);
        b.addons = [...kept, ...Array(KR.addonSlots - kept.length).fill(null)];
      }
    }));
    return s;
  }

  function seed() {
    const killers = {};
    D.killers.forEach((k) => (killers[k.id] = []));
    killers.trapper.push({
      ...blankBuild("killer"),
      name: "Trap Mastery",
      perks: ["kp-barbecue-chilli", "kp-corrupt-intervention", "kp-pop-goes-the-weasel", "kp-agitation"],
      addons: ["ka-trapper-trapper-sack", "ka-trapper-fastening-tools"],
      offering: "of-ivory-memento-mori",
    });
    return ensureV1({
      updatedAt: Date.now(),
      killers,
      survivor: [{
        ...blankBuild("survivor"),
        name: "Chase Build",
        perks: ["sp-sprint-burst", "sp-adrenaline", "sp-windows-of-opportunity", "sp-resilience"],
        item: "it-ranger-med-kit",
        addons: ["sa-styptic-agent", "sa-gauze-roll"],
      }],
    });
  }

  /* builds saved with the first starter data use older ids — point them at the current ones */
  function migrate(s) {
    const map = D.legacyIds || {};
    const fix = (id) => (id && map[id]) || id;
    [s.survivor, ...Object.values(s.killers)].forEach((list) => list.forEach((b) => {
      b.perks = b.perks.map(fix);
      b.addons = b.addons.map(fix);
      b.offering = fix(b.offering);
      if ("item" in b) b.item = fix(b.item);
    }));
  }

  /* builds come only from js/builds.js (written by "Save builds"); nothing is kept in the browser,
     so edits last until the page is closed / reloaded unless you save the file. No file yet = starter builds. */
  function load() {
    const s = window.DBD_BUILDS ? JSON.parse(JSON.stringify(window.DBD_BUILDS)) : null;
    if (!(s && s.killers && Array.isArray(s.survivor))) return seed();
    D.killers.forEach((k) => { if (!Array.isArray(s.killers[k.id])) s.killers[k.id] = []; });
    migrate(s);
    return ensureV1(s);
  }

  /* writes every build into js/builds.js — save it over the one in the project folder, then commit it.
     Chrome / Edge let you pick where to save it; other browsers download it to Downloads. */
  async function exportBuilds() {
    const text = `/* Your builds — written by the "Save builds" button on the home page.
   Save it over js/builds.js in the project folder and commit it; the site loads it for everyone. */
window.DBD_BUILDS = ${JSON.stringify(state, null, 1)};
`;
    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({ suggestedName: "builds.js", types: [{ description: "JavaScript", accept: { "text/javascript": [".js"] } }] });
        const out = await handle.createWritable();
        await out.write(text);
        await out.close();
        unsaved = false;
        return toast("Builds saved. Commit js/builds.js to put them on GitHub.");
      }
    } catch (err) {
      if (err && err.name === "AbortError") return; // closed the save window
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/javascript" }));
    a.download = "builds.js";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    unsaved = false;
    toast("builds.js downloaded. Move it into the project's js folder, then commit it.");
  }

  let state = load();
  // edits only live in this page until "Save builds" — leaving / reloading with unsaved edits asks first
  let unsaved = false;
  function save() {
    state.updatedAt = Date.now();
    unsaved = true;
  }
  window.addEventListener("beforeunload", (e) => { if (unsaved) { e.preventDefault(); e.returnValue = ""; } });

  /* edit mode: add / edit / copy / delete builds and save them to a file. View mode: look only, like otzdarva-builds.
     It opens in edit mode on your own computer (localhost / 127.0.0.1 / index.html opened as a file) and in view
     mode anywhere else (e.g. GitHub Pages); the button under "Save builds" on the home page switches. */
  const isLocal = location.protocol === "file:" || ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  let editMode = isLocal;
  const editing = new Set();   // ids of builds currently in edit mode
  let query = "";              // character search on the killers page
  let buildQuery = "";         // build search on the survivors page
  let pendingFocus = null;     // build to scroll to after the next render

  /* ---------------- routing ---------------- */

  /* Page addresses. Inside the code a page is written "#/killers/trapper"; on a web server it is shown as a clean
     path — /killers/trapper (under /dbd-builds/ on GitHub Pages' project address). Opened as a file (index.html
     double-clicked) it stays "#/killers/trapper", because a file has no server to answer paths. SITE_BASE comes
     from the small script at the top of index.html. */
  const BASE = window.SITE_BASE || "/";
  const CLEAN = location.protocol !== "file:";
  const url = (h) => (CLEAN ? BASE + h.replace(/^#\/?/, "") : h);   // "#/killers" → "/killers"
  function currentHash() {
    const rest = CLEAN
      ? (location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) : "")
      : location.hash.replace(/^#\/?/, "");
    return "#/" + rest.replace(/index\.html$/, "").replace(/\/+$/, "");
  }
  function navigate(h) {   // go to a page without animation; the same page = just redraw
    if (currentHash() === h) return render();
    if (CLEAN) { history.pushState(null, "", url(h)); closeAlts(); render(); }
    else location.hash = h;   // the hashchange listener redraws
  }
  // links from before (/#/killers/trapper) and the hand-over from 404.html on GitHub Pages become clean paths
  if (CLEAN) {
    let saved = null;
    try { saved = sessionStorage.getItem("spa-path"); sessionStorage.removeItem("spa-path"); } catch (_) { /* blocked */ }
    if (saved && saved.startsWith(BASE)) history.replaceState(null, "", saved);
    else if (/^#\//.test(location.hash)) history.replaceState(null, "", url(location.hash));
  }

  // the pages that exist: /  /killers  /killers/<killer>[/1v1]  /survivors[/1v1] — anything else is "notfound"
  function route() {
    const parts = currentHash().replace(/^#\/?/, "").split("/").filter(Boolean);
    const [page, sub, tab] = parts;
    if (!page) return { page: "home" };
    if (page === "killers") {
      if (!sub) return { page, role: "killer", open: null, tab: "builds" };
      const k = D.killers.find((x) => x.id === sub);
      if (k && parts.length <= 3 && (!tab || tab === "1v1")) return { page, role: "killer", open: k.id, tab: tab === "1v1" ? "1v1" : "builds" };
    } else if (page === "survivors" && parts.length <= 2 && (!sub || sub === "1v1")) {
      return { page, role: "survivor", open: null, tab: sub === "1v1" ? "1v1" : "builds" };
    }
    return { page: "notfound" };
  }
  const baseScope = (scope) => scope.replace(/^v1:/, "");
  const isV1 = (scope) => scope.startsWith("v1:");
  const listFor = (scope) => isV1(scope)
    ? (baseScope(scope) === "survivor" ? state.v1.survivor : state.v1.killers[baseScope(scope)])
    : (scope === "survivor" ? state.survivor : state.killers[scope]);
  const roleOf = (scope) => (baseScope(scope) === "survivor" ? "survivor" : "killer");

  /* find a build anywhere — cards for one scope can show up on the list page and in the overlay */
  function locate(id) {
    const base = ["survivor", ...D.killers.map((k) => k.id)];
    for (const scope of [...base, ...base.map((x) => "v1:" + x)]) {
      const list = listFor(scope);
      const i = list.findIndex((b) => b.id === id);
      if (i !== -1) return { b: list[i], i, list, scope, role: roleOf(scope), v1: isV1(scope), killer: D.killers.find((k) => k.id === baseScope(scope)) };
    }
    return null;
  }

  /* ---------------- helpers ---------------- */

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* search helpers: case- and accent-insensitive; "ghostface" also finds "Ghost Face" */
  const fold = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const searchText = (...parts) => parts.filter(Boolean).map(fold).join(" | ");
  function matches(text, q) {
    q = fold(q).trim();
    if (!q) return true;
    const compact = (x) => x.replace(/[^a-z0-9\u0400-\u04ff]+/g, "");
    return text.includes(q) || compact(text).includes(compact(q));
  }

  function initials(name) {
    const words = name.replace(/^Hex:\s*/i, "").replace(/["'!&]/g, "").split(/[\s-]+/).filter(Boolean);
    return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  }

  function icon(shape, e) {
    const cls = shape === "perk" ? "" : "r-" + e.rarity;
    const inner = e.img ? `<img src="${esc(e.img)}" alt="">` : `<span class="ico-txt">${esc(initials(e.name))}</span>`;
    return `<span class="ico ico-${shape} ${cls}">${inner}</span>`;
  }

  function slot(kind, index, id, ed) {
    const e = id && INDEX[id];
    const shape = SHAPE[kind];
    const face = e ? icon(shape, e) : `<span class="ico ico-${shape} empty"><span class="plus">+</span></span>`;
    const tip = e ? `data-tip="${e.id}"` : "";
    if (!ed) return `<span class="slot slot-${shape}" ${tip}>${face}</span>`;
    const label = e ? `Change ${esc(e.name)}` : `Choose ${SLOT_LABEL[kind]}`;
    return `<button class="slot slot-${shape}" data-action="pick" data-slot="${kind}" data-index="${index}" ${tip} aria-label="${label}">${face}</button>`;
  }

  /* ---------------- rendering ---------------- */

  const app = document.getElementById("app");
  const overlay = document.getElementById("overlay");

  function hero(withDate) {
    const date = new Date(state.updatedAt || Date.now()).toLocaleDateString();
    return `<header class="hero">
      <h1>
        <span class="hero-top"><span class="logo-mark" aria-hidden="true"></span><span><span class="accent">${esc(D.site.brand)}</span> builds for</span></span>
        <span class="hero-big">Dead by Daylight</span>
      </h1>
      ${withDate && D.site.gameVersion ? `<p class="updated">Game version: ${esc(D.site.gameVersion)}</p>` : ""}
      ${withDate ? `<p class="updated">Last updated: ${date}</p>` : ""}
    </header>`;
  }

  // v1: a 1v1 build — same card, but no offering and no survivor portrait / item
  function buildCard(b, role, killer, v1 = false) {
    const ed = editing.has(b.id);
    const loadout = [];
    const addons = b.addons.map((id, n) => slot("addons", n, id, ed));
    if (v1) {
      if (role === "killer") {
        const power = killer ? `<span class="slot slot-power" data-tip="pw-${killer.id}">${icon("power", INDEX["pw-" + killer.id])}</span><span class="link link-item"></span>` : "";
        loadout.push(`<div class="chain">${power}${addons.join('<span class="link"></span>')}</div>`);
      }
    } else if (role === "survivor") {
      // like in-game: item — add-on — add-on, joined by a thin line
      loadout.push(`<div class="chain">${slot("item", 0, b.item, ed)}<span class="link link-item"></span>${addons[0]}<span class="link"></span>${addons[1]}</div>`);
    } else {
      // like in-game: power — add-on — add-on
      const power = killer ? `<span class="slot slot-power" data-tip="pw-${killer.id}">${icon("power", INDEX["pw-" + killer.id])}</span><span class="link link-item"></span>` : "";
      loadout.push(`<div class="chain">${power}${addons[0]}<span class="link"></span>${addons[1]}</div>`);
    }
    // offering slot for both roles (survivors have no offerings in the data yet — the slot stays empty)
    if (!v1) loadout.push('<span class="divider"></span>', slot("offering", 0, b.offering, ed));
    const hasLoadout = loadout.length > 0 && (ed || killer || b.addons.some(Boolean) || b.offering || b.item);
    const perks = b.perks.map((id, n) => {
      const alts = ((b.alts || {})[n] || []).filter(Boolean);
      // try-out: outside edit mode the +N badge opens a dropdown under the perk (editing still uses the pop-up)
      if (ALT_DROPDOWN && alts.length && !ed) {
        return `<div class="perk-wrap">${slot("perks", n, id, ed)}
          <button class="alt-badge" data-action="alt-drop" title="Alternatives" aria-label="${alts.length} alternative perks" aria-expanded="false">+${alts.length}</button>
          <div class="alt-drop">${alts.map((a) => slot("perks", 0, a, false)).join("")}</div></div>`;
      }
      // a perk with alternatives opens them on click (like otzdarva); in edit mode the badge adds / edits them
      const badge = alts.length ? `<button class="alt-badge" data-action="alts" data-index="${n}" title="Alternatives" aria-label="${alts.length} alternative perks">+${alts.length}</button>`
        : ed && id ? `<button class="alt-badge add" data-action="alts" data-index="${n}" title="Add alternatives" aria-label="Add alternative perks">+</button>` : "";
      return `<div class="perk-wrap" ${alts.length && !ed ? `data-action="alts" data-index="${n}"` : ""}>${slot("perks", n, id, ed)}${badge}</div>`;
    });

    const main = `<header class="bcard-head">
        ${ed
          ? `<input class="bcard-name" data-field="name" value="${esc(b.name)}" maxlength="60" aria-label="Build name">`
          : `<h3 class="bcard-title">${esc(b.name)}</h3>`}
      </header>
      <div class="perks">${perks.join("")}</div>
      ${hasLoadout ? `<div class="loadout">${loadout.join("")}</div>` : ""}
      ${editMode ? `<div class="bcard-tools">
        ${ed
          ? navBtn(`done ${role === "survivor" ? "survivors" : "killers"}`, "", "Done", "check", false, "button", "data-action=\"done\"")
          : `<button class="tool" data-action="edit" title="Edit build" aria-label="Edit build">${ICONS.edit}</button>`}
        <button class="tool" data-action="duplicate" title="Duplicate build" aria-label="Duplicate build">${ICONS.copy}</button>
        <button class="tool danger" data-action="delete" title="Delete build" aria-label="Delete build">${ICONS.trash}</button>
      </div>` : ""}`;

    if (role !== "survivor" || v1) return `<article class="bcard ${ed ? "editing" : ""}" data-build="${b.id}">${main}</article>`;
    return `<article class="bcard with-portrait ${ed ? "editing" : ""}" data-build="${b.id}">
      ${survivorPortrait(b, ed)}
      <div class="bcard-main">${main}</div>
    </article>`;
  }

  /* survivor builds show a portrait of a survivor you pick (like hens / otzdarva); empty = role emblem */
  function survivorPortrait(b, ed) {
    const sv = b.survivor && INDEX[b.survivor];
    const face = sv && sv.img
      ? `<img src="${esc(sv.img)}" alt="${esc(sv.name)}">`
      : `<img class="emblem" src="img/survivor-icon.png" alt="">${ed ? `<span class="choose">Choose survivor</span>` : ""}`;
    const tip = sv ? `data-tip="${sv.id}"` : "";
    if (!ed) return `<span class="bportrait ${sv ? "" : "is-empty"}" ${tip}>${face}</span>`;
    return `<button class="bportrait ${sv ? "" : "is-empty"}" data-action="pick" data-slot="survivor" data-index="0" ${tip}
      aria-label="${sv ? "Change survivor (" + esc(sv.name) + ")" : "Choose survivor"}">${face}</button>`;
  }

  function portraitFace(k) {
    return k.img
      ? `<img src="${esc(k.img)}" alt="">`
      : `<span class="initial">${esc(k.name.replace(/^The\s+/, "")[0])}</span>`;
  }

  function killerTile(k, active) {
    const n = state.killers[k.id].length;
    const glow = (D.killerGlow || {})[k.id];
    return `<a class="ktile ${active ? "active" : ""}" href="${url("#/killers/" + k.id)}" ${glow ? `style="--kc: ${glow}"` : ""}
        data-search="${esc(searchText(k.name, k.realName, ...(k.aliases || [])))}" ${active ? 'aria-current="page"' : ""} title="${esc(k.name)}">
      <span class="ktile-face">${portraitFace(k)}</span>
      <span class="ktile-label"><b>${esc(k.name)}</b><small>${n} build${n === 1 ? "" : "s"}</small></span>
    </a>`;
  }

  // top-right Swap / Back, styled like otzdarva-builds' buttons in their expanded (hover) state, always expanded;
  // Swap is tinted with the current page's role colour (killers red / survivors slate)
  const NAV_ICONS = {
    swap: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.05 12.05 21 17l-4.95 4.95-1.414-1.415L17.172 18H4v-2h13.172l-2.536-2.536 1.414-1.414ZM7.95 2.05l1.414 1.414L6.828 6H20v2H6.828l2.536 2.536L7.95 11.95 3 7l4.95-4.95Z"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.172 12 8.222 7.05l1.414-1.414L16 12l-6.364 6.364-1.414-1.414L13.172 12Z"/></svg>',
    builds: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>',
    v1: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  };
  // the site's one button style: label + icon (a link, or a <button> when tag = "button" with extra attributes)
  const navBtn = (cls, href, label, icon, current, tag = "a", attrs = "") => {
    const inner = `<span class="nav-btn-label">${label}</span><span class="nav-btn-icon">${NAV_ICONS[icon]}</span>`;
    return tag === "button" ? `<button class="nav-btn ${cls}" ${attrs}>${inner}</button>`
      : `<a class="nav-btn ${cls}" href="${url(href)}" ${current ? 'aria-current="page"' : ""}>${inner}</a>`;
  };
  // "Add another build" / "Add 1v1 build": a big tile with a Swap / Back style button in the middle
  // view mode with a single build: centre it (in edit mode the Add tile sits next to it)
  const soloCls = (count) => (!editMode && count === 1 ? "solo" : "");
  // view mode: no Add tile — and a short note instead when there are no builds at all
  const addTile = (scope, label, cls = "", count = 1) => !editMode
    ? (count ? "" : `<p class="no-builds">No builds yet.</p>`)
    : `<button class="add-tile ${cls}" data-action="add" data-scope="${scope}"><span class="nav-btn add-pill"><span class="nav-btn-label">${label}</span><span class="nav-btn-icon">${NAV_ICONS.plus}</span></span></button>`;
  // extra: buttons placed before Swap (the survivors page's 1v1 / Builds switch)
  const cornerNav = (other, extra = "") => {
    const role = other === "#/survivors" ? "killers" : "survivors";
    return `<nav class="corner-nav">${extra}
      <a class="nav-btn tint ${role}" href="${url(other)}"><span class="nav-btn-label">Swap</span><span class="nav-btn-icon">${NAV_ICONS.swap}</span></a>
      <a class="nav-btn back" href="${url("#/")}"><span class="nav-btn-label">Back</span><span class="nav-btn-icon">${NAV_ICONS.back}</span></a>
    </nav>`;
  };

  // an address that is not a page (typed wrong, an old link…)
  function renderNotFound() {
    return `<div class="page-list">${hero(false)}</div>
      <section class="not-found">
        <div class="not-found-code">404</div>
        <h2 class="page-title">Page not found</h2>
        <p>This address doesn't lead anywhere — it may have been typed wrong or moved.</p>
        <div class="not-found-actions">${navBtn("tint killers", "#/", "Back to home", "back")}</div>
      </section>`;
  }

  function renderKillers(r) {
    const k = r.open && D.killers.find((x) => x.id === r.open);
    return `${cornerNav("#/survivors")}
      <div class="page-list">${hero(false)}</div>
      <h2 class="page-title">Choose Killer</h2>
      <div class="search">${ICONS.search}<input type="search" id="char-q" placeholder="Search for killer…" value="${esc(query)}" autocomplete="off"></div>
      <div class="kgrid">${D.killers.map((x) => killerTile(x, k && x.id === k.id)).join("")}</div>
      <p class="picker-empty" id="no-match" hidden>No killer matches your search.</p>`;
  }

  function renderSurvivors(r) {
    const body = r.tab === "1v1"
      ? `<div class="v1-wrap">${render1v1("survivor")}</div>`
      : `<div class="search">${ICONS.search}<input type="search" id="build-q" placeholder="Search for build…" value="${esc(buildQuery)}" autocomplete="off"></div>
        <div class="build-grid survivors-grid ${soloCls(state.survivor.length)}">
          ${state.survivor.map((b) => buildCard(b, "survivor")).join("")}
          ${addTile("survivor", "Add another build", "", state.survivor.length)}
        </div>
        <p class="picker-empty" id="no-build-match" hidden>No build matches your search.</p>`;
    // the 1v1 switch sits top-right next to Swap / Back, so the page's top matches the killers page
    const v1 = r.tab === "1v1";
    const toggle = v1 ? navBtn("", "#/survivors", "Builds", "builds") : navBtn("", "#/survivors/1v1", "1v1", "v1");
    return `${cornerNav("#/killers", toggle)}
      <div class="page-list">${hero(false)}</div>
      <h2 class="page-title">${v1 ? "Survivor 1v1" : "Survivor Builds"}</h2>
      ${body}`;
  }

  // Builds / 1v1 — same buttons as Swap / Back; the open tab is tinted with the page's role colour
  const tabsBar = (base, tab) => {
    const role = base.startsWith("#/survivors") ? "survivors" : "killers";
    const btn = (id, href, label) => navBtn(tab === id ? `tint ${role}` : "", href, label, id === "1v1" ? "v1" : "builds", tab === id);
    return `<nav class="tabs-bar" aria-label="Build type">${btn("builds", base, "Builds")}${btn("1v1", base + "/1v1", "1v1")}</nav>`;
  };

  /* 1v1 tab: the rules (allowed / banned) + the 1v1 builds (no limit on how many) */
  function render1v1(scope) {
    const R = rulesFor(scope), killer = D.killers.find((k) => k.id === scope), list = listFor("v1:" + scope);
    return `${rulesBox(R, killer)}
      <h3 class="v1-heading">1v1 Builds <span>${list.length}</span></h3>
      <div class="build-grid v1-grid ${soloCls(list.length)}">
        ${list.map((b) => buildCard(b, R.role, killer, true)).join("")}
        ${addTile("v1:" + scope, "Add 1v1 build", "v1-add", list.length)}
      </div>`;
  }

  // "Suffocation Pit 1" → the entry for "Suffocation Pit" in rules-1v1.js maps (picture + realm)
  function mapInfo(name) {
    const maps = R1.maps || {};
    const base = String(name).replace(/\s+(\d+|[IVX]+)$/, "");
    return maps[name] || maps[base] || null;
  }

  function rulesBox(R, killer) {
    const grid = (ids, kind) => `<div class="ban-grid">${ids.map((id) => `<div class="ban-item">${slot(kind, 0, id, false)}<span>${esc(INDEX[id].name)}</span></div>`).join("")}</div>`;
    const list = (items) => `<ul class="rules-list">${items.map((x) => `<li>${x}</li>`).join("")}</ul>`; // rule texts come from our own rules file
    return `<section class="rules-box">
      <h3>1v1 Rules · ${R.role === "killer" ? "Killer" : "Survivor"}</h3>
      ${R.role === "killer" ? (R.map
        ? `<button class="v1-map" data-map="${esc(R.map)}" title="Show the map"><span class="v1-label">Map</span><b>${esc(R.map)}</b>${mapInfo(R.map) ? `<span class="v1-map-hint">${ICONS.search}</span>` : ""}</button>`
        : `<div class="v1-map is-empty"><span class="v1-label">Map</span><b>Not set yet</b></div>`) : ""}
      ${list(R.rules)}
      ${killer ? (R.notes.length ? `<h4>${esc(killer.name)}</h4>${list(R.notes)}` : R.hasRules ? "" : `<h4>${esc(killer.name)}</h4><p class="rules-empty">No rules for ${esc(killer.name)} yet.</p>`) : ""}
      <h4 class="banned-title">Banned perks <span>${R.allPerksBanned ? "All" : R.bannedPerks.length}</span></h4>
      ${R.allPerksBanned ? `<p class="rules-all-banned">All perks are banned for ${esc(killer.name)}.</p>`
        : R.bannedPerks.length ? grid(R.bannedPerks, "perks") : `<p class="rules-empty">None.</p>`}
      ${R.role === "killer" ? `<h4 class="banned-title">Banned add-ons <span>${killer && R.bannedAddons.length === killer.addons.length ? "All" : R.bannedAddons.length}</span></h4>
        ${R.addonsNote ? `<p class="addon-rule ${R.bannedAddons.length === killer.addons.length ? "all-banned" : ""}">${esc(R.addonsNote)}</p>` : ""}
        ${R.bannedAddons.length && R.bannedAddons.length < killer.addons.length ? grid(R.bannedAddons, "addons") : !R.addonsNote ? `<p class="rules-empty">None.</p>` : ""}` : ""}
      <p class="rules-source">${esc(R1.source || "")}${R1.sourceNote ? " — " + esc(R1.sourceNote) : ""}</p>
    </section>`;
  }

  function renderHome() {
    return `${hero(true)}
      <div class="role-cards">
        <a class="role-card killer" href="${url("#/killers")}">
          <kbd class="role-key">Q</kbd><h2>Killers</h2>
          <img src="img/killer-icon.png" alt="" width="736" height="706">
        </a>
        <a class="role-card survivor" href="${url("#/survivors")}">
          <kbd class="role-key">E</kbd><h2>Survivors</h2>
          <img src="img/survivor-icon.png" alt="" width="692" height="692">
        </a>
      </div>
      <div class="credits">
        <span>Created by <a href="https://github.com/siralexeu" target="_blank" rel="noopener">siralexeu</a></span>
        <span>Inspired by <a href="https://otzdarva-builds.com/" target="_blank" rel="noopener">Otzdarva</a></span>
        ${editMode ? `<button class="credits-link" data-action="export">Save builds</button>` : ""}
        <button class="credits-link" data-action="mode">${editMode ? "Switch to view mode" : "Switch to edit mode"}</button>
      </div>`;
  }

  /* a killer's builds open in a centered pop-up on top of the grid */
  function renderOverlay(k, tab) {
    const list = state.killers[k.id];
    const keepTab = tab === "1v1" ? "/1v1" : "";
    const i = D.killers.indexOf(k);
    const prev = D.killers[(i - 1 + D.killers.length) % D.killers.length];
    const next = D.killers[(i + 1) % D.killers.length];
    const arrow = (dir) => svg(30, dir === "prev" ? '<path d="M15 5l-7 7 7 7"/>' : '<path d="M9 5l7 7-7 7"/>');
    return `<a class="popup-nav prev" href="${url("#/killers/" + prev.id + keepTab)}" aria-label="Previous killer: ${esc(prev.name)}">${arrow("prev")}</a>
      <div class="popup-box" role="dialog" aria-label="${esc(k.name)} builds">
        <button class="close-btn popup-close" data-action="close" aria-label="Close">${ICONS.close}</button>
        <h2 class="sec-title">${esc(k.name)}</h2>
        <p class="popup-meta">${[k.realName && esc(k.realName), `Power: <b>${esc(k.power)}</b>`, k.difficulty && esc(k.difficulty)].filter(Boolean).join("<span class=\"sep\">·</span>")}</p>
        ${tabsBar("#/killers/" + k.id, tab)}
        ${tab === "1v1" ? render1v1(k.id) : `<div class="build-grid ${soloCls(list.length)}">
          ${list.map((b) => buildCard(b, "killer", k)).join("")}
          ${addTile(k.id, "Add another build", "", list.length)}
        </div>`}
      </div>
      <a class="popup-nav next" href="${url("#/killers/" + next.id + keepTab)}" aria-label="Next killer: ${esc(next.name)}">${arrow("next")}</a>`;
  }

  // survivor builds: found by build name, survivor, perks (+ alternatives), item, add-ons and offering
  function buildSearchText(b) {
    const ids = [b.survivor, ...b.perks, ...Object.values(b.alts || {}).flat(), b.item, ...b.addons, b.offering];
    return searchText(b.name, ...ids.filter((id) => id && INDEX[id]).flatMap((id) => [INDEX[id].name, ...(INDEX[id].aliases || [])]));
  }
  function applyBuildSearch() {
    const grid = app.querySelector(".survivors-grid");
    if (!grid) return;
    const q = buildQuery.trim();
    let shown = 0;
    state.survivor.forEach((b) => {
      const card = grid.querySelector(`[data-build="${b.id}"]`);
      const ok = editing.has(b.id) || matches(buildSearchText(b), q); // a build being edited never disappears
      if (card) card.hidden = !ok;
      shown += ok;
    });
    const add = grid.querySelector(".add-tile"); // not there in view mode
    if (add) add.hidden = !!q; // adding a build while filtering would hide it straight away
    app.querySelector("#no-build-match").hidden = shown > 0 || !q;
  }

  function applySearch() {
    applyBuildSearch();
    const tiles = app.querySelectorAll(".kgrid .ktile");
    if (!tiles.length) return;
    const q = query.trim().toLowerCase();
    let shown = 0;
    tiles.forEach((t) => { const ok = matches(t.dataset.search, q); t.hidden = !ok; shown += ok; });
    app.querySelector("#no-match").hidden = shown > 0;
  }

  let lastPage = null;
  let lastOpen = null;
  let lastTab = null;
  function render() {
    hideTip();
    const r = route();
    document.title = "DBD Builds" + (r.page === "killers" ? " · Killers" : r.page === "survivors" ? " · Survivors" : r.page === "notfound" ? " · Page not found" : "");

    const focusedSearch = document.activeElement && ["char-q", "build-q"].includes(document.activeElement.id) ? document.activeElement.id : null;
    app.innerHTML = r.page === "home" ? renderHome() : r.page === "killers" ? renderKillers(r) : r.page === "survivors" ? renderSurvivors(r) : renderNotFound();
    applySearch();
    if (focusedSearch) { const s = app.querySelector("#" + focusedSearch); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); } }

    const k = r.open && D.killers.find((x) => x.id === r.open);
    const keepScroll = k && r.open === lastOpen && r.tab === lastTab ? overlay.scrollTop : 0;
    const wasOpen = !overlay.hidden;
    overlay.className = "overlay" + (k && !wasOpen ? " opening" : "");
    overlay.innerHTML = k ? renderOverlay(k, r.tab) : "";
    overlay.hidden = !k;
    overlay.scrollTop = keepScroll;
    document.body.classList.toggle("locked", !!k);

    if (lastPage !== null && lastPage !== r.page) window.scrollTo(0, 0);
    lastPage = r.page;
    lastOpen = r.open;
    lastTab = r.tab;

    if (pendingFocus) { const id = pendingFocus; pendingFocus = null; focusBuild(id); }
    if (altState) renderAlts();
  }

  /* ---------------- build actions ---------------- */

  function focusBuild(id) {
    const root = overlay.hidden ? app : overlay;
    const el = root.querySelector(`[data-build="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("flash");
    const name = el.querySelector(".bcard-name");
    if (name) { name.focus({ preventScroll: true }); name.select(); }
  }

  /* new / copied builds are shown on their character's page */
  function showBuild(scope, id) {
    pendingFocus = id;
    const base = baseScope(scope), tab = isV1(scope) ? "/1v1" : "";
    const target = (base === "survivor" ? "#/survivors" : "#/killers/" + base) + tab;
    navigate(target);
  }

  function addBuild(scope) {
    const list = listFor(scope);
    const b = isV1(scope) ? blank1v1(baseScope(scope)) : blankBuild(roleOf(scope));
    b.name = (isV1(scope) ? "1v1 Build " : "Build ") + (list.length + 1);
    list.push(b);
    editing.add(b.id);
    save();
    showBuild(scope, b.id);
  }

  function duplicateBuild(id) {
    const { list, i, scope } = locate(id);
    const copy = JSON.parse(JSON.stringify(list[i]));
    copy.id = uid();
    copy.name = (copy.name + " (copy)").slice(0, 60);
    list.splice(i + 1, 0, copy);
    save();
    showBuild(scope, copy.id);
  }

  function deleteBuild(id) {
    const { list, i, scope } = locate(id);
    const [removed] = list.splice(i, 1);
    editing.delete(id);
    save(); render();
    toast(`“${removed.name}” deleted`, "Undo", () => {
      listFor(scope).splice(i, 0, removed);
      save(); render();
    });
  }

  function finishEdit(id) {
    const { b } = locate(id);
    if (!b.name.trim()) b.name = "Untitled build";
    editing.delete(id);
    save(); render();
  }

  /* where a slot's value lives: perks[i], addons[i], alts[p][j] ("p:j" = alternative j of perk p), or b[kind] */
  function slotRef(b, kind, index) {
    if (kind === "perks" || kind === "addons") return [b[kind], +index];
    if (kind === "alt") { const [p, j] = String(index).split(":").map(Number); b.alts = b.alts || {}; b.alts[p] = b.alts[p] || []; return [b.alts[p], j]; }
    return [b, kind];
  }

  function setSlot(b, kind, index, id) {
    const [obj, key] = slotRef(b, kind, index);
    obj[key] = id;
    if (kind === "alt") { const [p] = String(index).split(":").map(Number); b.alts[p] = b.alts[p].filter(Boolean); if (!b.alts[p].length) delete b.alts[p]; }
    if (kind === "perks" && !id && b.alts) delete b.alts[index]; // a removed perk takes its alternatives with it
    // survivor add-ons belong to an item type — drop the ones that no longer fit
    if (kind === "item") {
      const type = id && INDEX[id].type;
      b.addons = b.addons.map((a) => (a && INDEX[a].item === type ? a : null));
    }
    save(); render();
  }

  /* ---------------- picker ---------------- */

  const dlg = document.getElementById("picker");
  const qInput = document.getElementById("picker-q");
  const listEl = document.getElementById("picker-list");
  const detailEl = document.getElementById("picker-detail");
  let pick = null; // { buildId, kind, index }

  /* picker search in descriptions: a word that starts with what you typed ("heal" finds heal, heals, healing,
     healed…), only from 3 letters on so 1-2 letters don't match half the list */
  const plainDesc = new Map(); // id → description as plain lower-case text, built on first search
  function descMatches(e, q) {
    q = fold(q).trim();
    if (q.length < 3 || !e.desc) return false;
    if (!plainDesc.has(e.id)) {
      const tpl = document.createElement("template"); // inert: nothing in the description gets loaded
      tpl.innerHTML = e.desc;
      plainDesc.set(e.id, fold(tpl.content.textContent).replace(/\s+/g, " "));
    }
    const word = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp("(^|[^a-z0-9])" + word).test(plainDesc.get(e.id));
  }

  function pickerOptions(loc, kind) {
    const { b, role, killer } = loc;
    if (kind === "perks" || kind === "alt") return role === "killer" ? D.killerPerks : D.survivorPerks;
    if (kind === "offering") return D.offerings.filter((o) => o.role === "both" || o.role === role);
    if (kind === "item") return D.survivorItems;
    if (kind === "survivor") return D.survivors;
    if (role === "killer") return killer.addons;
    const type = b.item && INDEX[b.item].type;
    return type ? D.survivorAddons.filter((a) => a.item === type) : [];
  }

  const currentValue = (b, kind, index) => { const [obj, key] = slotRef(b, kind, index); return obj[key] ?? null; };

  function openPicker(buildId, kind, index) {
    pick = { buildId, kind, index };
    const loc = locate(buildId);
    const who = loc.killer && kind === "addons" ? ` · ${loc.killer.name}` : "";
    document.getElementById("picker-title").textContent = `Choose ${SLOT_LABEL[kind]}${who}`;
    qInput.value = "";
    renderPicker();
    hideTip();
    dlg.showModal();
    qInput.focus();
  }

  function renderPicker() {
    const loc = locate(pick.buildId);
    const { b } = loc;
    const { kind, index } = pick;
    const shape = SHAPE[kind];
    const current = currentValue(b, kind, index);
    const used = new Set(kind === "perks" || kind === "addons" ? b[kind].filter((id, n) => id && n !== +index)
      : kind === "alt" ? (() => { const [p, j] = String(index).split(":").map(Number); return [b.perks[p], ...((b.alts || {})[p] || []).filter((id, n) => id && n !== j)]; })() : []);
    // 1v1 builds: banned perks / add-ons (and alternatives) can't be picked
    const R = loc.v1 ? rulesFor(baseScope(loc.scope)) : null;
    const banned = R ? new Set([...R.bannedPerks, ...R.bannedAddons]) : new Set();
    const q = qInput.value.trim().toLowerCase();
    const all = pickerOptions(loc, kind);
    // aliases are only searched, never shown (e.g. "will to live" finds Decisive Strike)
    const byName = all.filter((e) => matches(searchText(e.name, e.owner, ...(e.aliases || [])), q));
    // then the ones whose description mentions it ("heal" → Leverage, Sloppy Butcher…), listed after the name matches
    const named = new Set(byName);
    const opts = [...byName, ...all.filter((e) => !named.has(e) && descMatches(e, q))];

    if (!all.length) {
      listEl.innerHTML = `<div class="picker-empty">${
        kind === "offering"
          ? `No ${loc.role} offerings yet.`
          : kind === "addons" && loc.role === "survivor" && !b.item
            ? "Choose an item first — add-ons depend on the item type."
            : "No add-ons for this item yet."
      }</div>`;
    } else if (!opts.length) {
      listEl.innerHTML = `<div class="picker-empty">Nothing matches “${esc(qInput.value)}”.</div>`;
    } else {
      listEl.innerHTML = opts.map((e) => {
        const isUsed = used.has(e.id), isBanned = banned.has(e.id);
        return `<button class="opt ${e.id === current ? "is-current" : ""} ${isBanned ? "is-banned" : ""}" data-id="${e.id}" ${isUsed || isBanned ? "disabled" : ""}>
          ${isBanned ? '<span class="opt-tag banned">Banned</span>' : isUsed ? '<span class="opt-tag">Equipped</span>' : ""}
          <span class="ico-wrap">${icon(shape, e)}</span>
          <span class="opt-name">${esc(e.name)}</span>
        </button>`;
      }).join("");
    }
    showDetail(INDEX[current] || opts[0]);
  }

  function metaChips(e) {
    const chips = [];
    if (e.rarity) chips.push(`<span class="chip rarity r-${e.rarity}">${RARITY[e.rarity]}</span>`);
    if (e.owner) chips.push(`<span class="chip">${esc(e.owner)}</span>`);
    if (e.role) chips.push(`<span class="chip">${e.role === "both" ? "Killer & Survivor" : e.role[0].toUpperCase() + e.role.slice(1)}</span>`);
    if (e.type) chips.push(`<span class="chip">${esc(e.type)}</span>`);
    return chips.join("");
  }

  function showDetail(e) {
    if (!e) { detailEl.innerHTML = ""; return; }
    const filled = currentValue(locate(pick.buildId).b, pick.kind, pick.index);
    detailEl.innerHTML = `${icon(SHAPE[pick.kind], e)}
      <div class="d-body">
        <h3>${esc(e.name)}</h3>
        <div class="chips">${metaChips(e)}</div>
      </div>
      ${filled ? `<button class="btn-outline" data-remove>Remove</button>` : ""}`;
  }

  function choose(id) {
    setSlot(locate(pick.buildId).b, pick.kind, pick.index, id);
    dlg.close();
  }

  qInput.addEventListener("input", renderPicker);
  qInput.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const first = listEl.querySelector(".opt:not(:disabled)");
    if (first) choose(first.dataset.id);
  });
  listEl.addEventListener("click", (e) => {
    const opt = e.target.closest(".opt");
    if (opt && !opt.disabled) choose(opt.dataset.id);
  });
  ["mouseover", "focusin"].forEach((ev) => listEl.addEventListener(ev, (e) => {
    const opt = e.target.closest(".opt");
    if (opt) showDetail(INDEX[opt.dataset.id]);
  }));
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg || e.target.closest("[data-close]")) dlg.close();
    if (e.target.closest("[data-remove]")) choose(null);
  });

  /* ---------------- tooltip ---------------- */

  const tipEl = document.getElementById("tip");
  /* the element under the pointer / finger gets a subtle red aura (like otzdarva) */
  let glowEl = null;
  function setGlow(el) {
    if (glowEl === el) return;
    if (glowEl) glowEl.classList.remove("glow");
    glowEl = el;
    if (el) el.classList.add("glow");
  }

  function showTip(target, withDesc = true) {
    const e = INDEX[target.dataset.tip];
    if (!e) return;
    setGlow(target);
    const sub = e.rarity
      ? `<small class="r r-${e.rarity}">${RARITY[e.rarity]}</small>`
      : e.owner ? `<small>${esc(e.owner)}</small>` : "";
    tipEl.innerHTML = `<b class="tip-name">${esc(e.name)}</b>${sub}${withDesc && e.desc ? `<div class="desc">${e.desc}</div>` : ""}`;
    tipEl.hidden = false;
    const r = target.getBoundingClientRect();
    const t = tipEl.getBoundingClientRect();
    let top = r.top - t.height - 10;
    if (top < 8) top = r.bottom + 10;
    if (top + t.height > innerHeight - 8) top = Math.max(8, innerHeight - t.height - 8);
    const left = Math.min(Math.max(8, r.left + r.width / 2 - t.width / 2), innerWidth - t.width - 8);
    tipEl.style.top = top + "px";
    tipEl.style.left = left + "px";
  }
  /* perks, add-ons, items, offerings, power: aura + name on hover, full description on click
     (a pinned card that stays until you click elsewhere). In edit mode a click on a slot opens the
     picker instead (those slots are buttons, not spans). */
  let pinned = null;
  const isSlot = (t) => t.classList.contains("slot");
  function hideTip() { tipEl.hidden = true; tipEl.classList.remove("pinned", "map-tip"); pinned = null; setGlow(null); }

  document.addEventListener("mouseover", (e) => {
    if (pinned) return;
    const t = e.target.closest("[data-tip]");
    if (!t) return hideTip();
    showTip(t, !isSlot(t)); // slots: no description on hover, only on click
  });
  function showMapTip(el) {
    const name = el.dataset.map, info = mapInfo(name);
    setGlow(null);
    tipEl.classList.add("pinned", "map-tip");
    tipEl.innerHTML = `<b class="tip-name">${esc(name)}</b>${info && info.realm ? `<small>${esc(info.realm)}</small>` : ""}
      ${info && info.img ? `<img class="map-img" src="${esc(info.img)}" alt="${esc(name)}">` : `<p class="rules-empty">No picture for this map yet.</p>`}`;
    tipEl.hidden = false;
    const place = () => {
      const r = el.getBoundingClientRect(), t = tipEl.getBoundingClientRect();
      let top = r.bottom + 10;
      if (top + t.height > innerHeight - 8) top = Math.max(8, r.top - t.height - 10);
      tipEl.style.top = top + "px";
      tipEl.style.left = Math.min(Math.max(8, r.left), innerWidth - t.width - 8) + "px";
    };
    place();
    const img = tipEl.querySelector("img");
    if (img && !img.complete) img.addEventListener("load", place, { once: true });
    pinned = el;
  }

  document.addEventListener("click", (e) => {
    const m = e.target.closest(".v1-map[data-map]");
    if (m) { if (pinned === m) hideTip(); else showMapTip(m); return; }
    const t = e.target.closest("span.slot[data-tip]");
    if (t && t.closest(".bcard.editing")) return; // no descriptions while building
    if (t && t.closest(".perk-wrap[data-action]")) return; // opens the alternatives pop-up instead
    if (t) {
      if (pinned === t) return hideTip();
      tipEl.classList.add("pinned"); // scrollable while pinned (long power texts)
      showTip(t);
      pinned = t;
      return;
    }
    if (pinned && !e.target.closest("#tip")) hideTip();
  });
  window.addEventListener("scroll", (e) => { if (e.target !== tipEl) hideTip(); }, true);

  /* touch: tap a perk / add-on / item / offering / power for its description */
  let holdTimer = null;
  document.addEventListener("touchstart", (e) => {
    if (e.target.closest("#tip")) return; // scrolling inside an open description
    const t = e.target.closest("[data-tip]");
    clearTimeout(holdTimer);
    hideTip();
    if (!t) return;
    setGlow(t);
    if (!isSlot(t)) holdTimer = setTimeout(() => showTip(t), 300);
  }, { passive: true });
  ["touchend", "touchcancel", "touchmove"].forEach((ev) =>
    document.addEventListener(ev, (e) => { clearTimeout(holdTimer); if (!pinned && !e.target.closest("#tip")) hideTip(); }, { passive: true }));
  document.addEventListener("contextmenu", (e) => { if (e.target.closest("[data-tip]")) e.preventDefault(); });

  /* ---------------- alternatives pop-up (1v1) ---------------- */

  const altEl = document.createElement("div");
  altEl.id = "altpop";
  altEl.className = "altpop";
  altEl.hidden = true;
  document.body.appendChild(altEl);
  let altState = null; // { buildId, p }

  function renderAlts() {
    const loc = altState && locate(altState.buildId);
    if (!loc || !loc.b.perks[altState.p]) return closeAlts();
    const { b } = loc, p = altState.p, ed = editing.has(b.id);
    const alts = ((b.alts || {})[p] || []).filter(Boolean);
    const row = (id, extra = "") => {
      const e = INDEX[id];
      return `<div class="alt-row">${slot("perks", 0, id, false)}<div class="alt-text"><b>${esc(e.name)}</b><small>${esc(e.owner || "")}</small></div>${extra}</div>`;
    };
    const editRow = (id, j) => `<div class="alt-row">${slot("alt", p + ":" + j, id, true)}<div class="alt-text">${id ? `<b>${esc(INDEX[id].name)}</b><small>${esc(INDEX[id].owner || "")}</small>` : '<span class="muted">Choose alternative</span>'}</div>
      ${id ? `<button class="tool danger" data-action="alt-remove" data-index="${j}" title="Remove" aria-label="Remove alternative">${ICONS.trash}</button>` : ""}</div>`;
    const list = ed ? [...alts.map((id, j) => editRow(id, j)), ...(alts.length < 3 ? [editRow(null, alts.length)] : [])].join("")
      : alts.map((id) => row(id)).join("");
    altEl.innerHTML = `<div class="altpop-box" role="dialog" aria-label="Alternative perks">
      <button class="close-btn altpop-close" data-action="alts-close" aria-label="Close">${ICONS.close}</button>
      <div class="v1-label">Instead of</div>
      ${row(b.perks[p])}
      <div class="v1-label">You can try</div>
      ${list || '<p class="rules-empty">No alternatives yet.</p>'}
    </div>`;
  }
  function openAlts(buildId, p) {
    hideTip();
    altState = { buildId, p };
    altEl.hidden = false;
    renderAlts();
  }
  function closeAlts() { altState = null; altEl.hidden = true; altEl.innerHTML = ""; }
  altEl.addEventListener("click", (e) => { if (e.target === altEl) closeAlts(); });

  /* ---------------- toast ---------------- */

  const toastEl = document.getElementById("toast");
  let toastTimer = null;
  function toast(msg, actionLabel, onAction) {
    toastEl.innerHTML = `<span>${esc(msg)}</span>${actionLabel ? `<button>${esc(actionLabel)}</button>` : ""}`;
    toastEl.hidden = false;
    const btn = toastEl.querySelector("button");
    if (btn) btn.onclick = () => { toastEl.hidden = true; onAction(); };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.hidden = true), 6000);
  }

  /* ---------------- events ---------------- */

  function closeOverlay() {
    navigate("#/killers");
  }

  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeOverlay(); });

  /* alternatives dropdown (ALT_DROPDOWN): one open at a time, closes on a click outside it or Escape */
  function closeDrops(except) {
    document.querySelectorAll(".perk-wrap.drop-open").forEach((w) => {
      if (w === except) return;
      w.classList.remove("drop-open");
      w.querySelector("[data-action=alt-drop]").setAttribute("aria-expanded", "false");
    });
  }
  function toggleDrop(badge) {
    const wrap = badge.closest(".perk-wrap");
    closeDrops(wrap);
    badge.setAttribute("aria-expanded", String(wrap.classList.toggle("drop-open")));
  }

  document.addEventListener("click", (e) => {
    // the Back button gets the same fade as Esc (a plain click; ctrl / middle click still opens a new tab)
    const back = e.target.closest(".corner-nav .nav-btn.back");
    if (back && e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      slideTo("#/", "back");
      return;
    }
    if (!e.target.closest(".alt-drop, [data-action=alt-drop]")) closeDrops();
    const el = e.target.closest("[data-action]");
    if (!el || dlg.contains(el)) return;
    const card = el.closest("[data-build]");
    const id = card ? card.dataset.build : altState && el.closest("#altpop") ? altState.buildId : null;
    switch (el.dataset.action) {
      case "add": if (editMode) addBuild(el.dataset.scope); break;
      case "edit": if (editMode) { editing.add(id); render(); } break;
      case "done": finishEdit(id); break;
      case "duplicate": if (editMode) duplicateBuild(id); break;
      case "delete": if (editMode) deleteBuild(id); break;
      case "pick": if (editMode) openPicker(id, el.dataset.slot, el.dataset.index); break;
      case "alts": openAlts(id, +el.dataset.index); break;
      case "alt-drop": toggleDrop(el); break;
      case "export": exportBuilds(); break;
      case "mode": editMode = !editMode; editing.clear(); render(); toast(editMode ? "Switched to edit mode" : "Switched to view mode"); break;
      case "alt-remove": { const { b } = locate(altState.buildId); b.alts[altState.p].splice(+el.dataset.index, 1); if (!b.alts[altState.p].length) delete b.alts[altState.p]; save(); render(); break; }
      case "alts-close": closeAlts(); break;
      case "close": closeOverlay(); break;
    }
  });

  document.addEventListener("input", (e) => {
    if (e.target.id === "char-q") { query = e.target.value; applySearch(); return; }
    if (e.target.id === "build-q") { buildQuery = e.target.value; applyBuildSearch(); return; }
    const field = e.target.dataset.field;
    if (!field) return;
    locate(e.target.closest("[data-build]").dataset.build).b[field] = e.target.value;
    save();
  });

  /* animated page switch. from = "left" / "right": Q / E slide sideways — killers come in from the left, survivors
     from the right (like the role cards' order); "back": Esc / Back to the home page, the page fades out and the
     home page fades in. Uses the browser's view transitions; without them (or with reduced motion) it just switches. */
  function slideTo(hash, from) {
    if (currentHash() === hash) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduce) { navigate(hash); return; }
    document.documentElement.dataset.slide = from;
    const t = document.startViewTransition(() => new Promise((done) => {
      if (CLEAN) { navigate(hash); done(); }   // redraws straight away
      else { window.addEventListener("hashchange", done, { once: true }); location.hash = hash; } // after the hashchange render below
    }));
    // the browser may skip the animation (e.g. tab hidden) — the page still switches, so that's not an error
    t.ready.catch(() => {});
    t.finished.catch(() => {}).finally(() => delete document.documentElement.dataset.slide);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.classList.contains("bcard-name")) {
      finishEdit(e.target.closest("[data-build]").dataset.build);
    }
    if (e.key === "Escape" && pinned) { hideTip(); return; }
    if (e.key === "Escape" && document.querySelector(".perk-wrap.drop-open")) { closeDrops(); return; }
    if (e.key === "Escape" && altState && !dlg.open) { closeAlts(); return; }
    if (e.key === "Escape" && !dlg.open && route().open) { closeOverlay(); return; }
    // Escape on the killers / survivors page = back to the home page (not while typing in a search or a build name)
    if (e.key === "Escape" && !dlg.open && route().page !== "home" && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
      slideTo("#/", "back");
      return;
    }
    // Q = killers, E = survivors (the hints on the home page's role cards) — on every page, so Q / E also swap
    // between the killers and survivors pages; not while typing or with the picker / alternatives open
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && !dlg.open && !altState) {
      const k = e.key.toLowerCase(), page = route().page;
      if (k === "q" && page !== "killers") slideTo("#/killers", "left");
      if (k === "e" && page !== "survivors") slideTo("#/survivors", "right");
    }
  });

  // internal links (killer tiles, Swap, tabs…) change the page without reloading it; ctrl / middle click still opens a tab
  document.addEventListener("click", (e) => {
    if (!CLEAN || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest("a[href]");
    if (!a || a.target || a.origin !== location.origin || !a.pathname.startsWith(BASE)) return;
    e.preventDefault();
    navigate("#/" + a.pathname.slice(BASE.length).replace(/\/+$/, ""));
  });
  window.addEventListener("popstate", () => { closeAlts(); render(); });
  window.addEventListener("hashchange", () => {
    if (CLEAN && /^#\//.test(location.hash)) history.replaceState(null, "", url(location.hash)); // an old-style address typed in
    closeAlts(); render();
  });
  render();
})();
