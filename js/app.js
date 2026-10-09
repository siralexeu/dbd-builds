(function () {
  "use strict";

  const D = window.DBD_DATA;
  const STORE_KEY = "dbd-builds:v1";
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
        bannedAddons: [], map: r.map || null, maxBuilds: r.maxBuilds || 2, perkSlots: r.perkSlots || 2, addonSlots: 0 };
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
      maxBuilds: r.maxBuilds || 3, perkSlots: r.perkSlots || 3, addonSlots: r.addonSlots || 5 };
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

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && s.killers && Array.isArray(s.survivor)) {
        D.killers.forEach((k) => { if (!Array.isArray(s.killers[k.id])) s.killers[k.id] = []; });
        migrate(s);
        return ensureV1(s);
      }
    } catch (_) { /* storage blocked or corrupt — fall back to seed */ }
    return seed();
  }

  let state = load();
  let saveTimer = null;
  function save() {
    state.updatedAt = Date.now();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) { /* ignore */ }
    }, 150);
  }

  const editing = new Set();   // ids of builds currently in edit mode
  let query = "";              // character search on the killers page
  let pendingFocus = null;     // build to scroll to after the next render

  /* ---------------- routing ---------------- */

  function route() {
    const [page, sub, tab] = location.hash.replace(/^#\/?/, "").split("/");
    if (page === "killers") {
      const k = D.killers.find((x) => x.id === sub);
      return { page, role: "killer", open: k ? k.id : null, tab: tab === "1v1" ? "1v1" : "builds" };
    }
    if (page === "survivors") return { page, role: "survivor", open: null, tab: sub === "1v1" ? "1v1" : "builds" };
    return { page: "home" };
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
      <div class="bcard-tools">
        ${ed
          ? `<button class="tool done" data-action="done">Done</button>`
          : `<button class="tool" data-action="edit" title="Edit build" aria-label="Edit build">${ICONS.edit}</button>`}
        <button class="tool" data-action="duplicate" title="Duplicate build" aria-label="Duplicate build">${ICONS.copy}</button>
        <button class="tool danger" data-action="delete" title="Delete build" aria-label="Delete build">${ICONS.trash}</button>
      </div>`;

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
    return `<a class="ktile ${active ? "active" : ""}" href="#/killers/${k.id}"
        data-search="${esc(searchText(k.name, k.realName, ...(k.aliases || [])))}" ${active ? 'aria-current="page"' : ""} title="${esc(k.name)}">
      <span class="ktile-face">${portraitFace(k)}</span>
      <span class="ktile-label"><b>${esc(k.name)}</b><small>${n} build${n === 1 ? "" : "s"}</small></span>
    </a>`;
  }

  const cornerNav = (other) =>
    `<nav class="corner-nav"><a class="btn" href="${other}">Swap</a><a class="btn" href="#/">Back ${ICONS.chevron}</a></nav>`;

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
      : `<div class="build-grid survivors-grid">
          ${state.survivor.map((b) => buildCard(b, "survivor")).join("")}
          <button class="add-tile" data-action="add" data-scope="survivor"><span class="plus-circle">+</span>Add another build</button>
        </div>`;
    return `${cornerNav("#/killers")}
      <div class="page-list">${hero(false)}</div>
      <h2 class="page-title">Survivor Builds</h2>
      <p class="page-sub">General builds — usable on any survivor.</p>
      ${tabsBar("#/survivors", r.tab)}
      ${body}`;
  }

  const tabsBar = (base, tab) => `<nav class="tabs-bar" aria-label="Build type">
      <a class="tab ${tab === "builds" ? "active" : ""}" href="${base}" ${tab === "builds" ? 'aria-current="page"' : ""}>Builds</a>
      <a class="tab ${tab === "1v1" ? "active" : ""}" href="${base}/1v1" ${tab === "1v1" ? 'aria-current="page"' : ""}>1v1</a>
    </nav>`;

  /* 1v1 tab: the rules (allowed / banned) + up to maxBuilds 1v1 builds */
  function render1v1(scope) {
    const R = rulesFor(scope), killer = D.killers.find((k) => k.id === scope), list = listFor("v1:" + scope);
    return `${rulesBox(R, killer)}
      <h3 class="v1-heading">1v1 Builds <span>${list.length}/${R.maxBuilds}</span></h3>
      <div class="build-grid v1-grid">
        ${list.map((b) => buildCard(b, R.role, killer, true)).join("")}
        ${list.length < R.maxBuilds ? `<button class="add-tile v1-add" data-action="add" data-scope="v1:${scope}"><span class="plus-circle">+</span>Add 1v1 build</button>` : ""}
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
        <a class="role-card killer" href="#/killers">
          <kbd class="role-key">Q</kbd><h2>Killers</h2>
          <img src="img/killer-icon.png" alt="" width="736" height="706">
        </a>
        <a class="role-card survivor" href="#/survivors">
          <kbd class="role-key">E</kbd><h2>Survivors</h2>
          <img src="img/survivor-icon.png" alt="" width="692" height="692">
        </a>
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
    return `<a class="popup-nav prev" href="#/killers/${prev.id}${keepTab}" aria-label="Previous killer: ${esc(prev.name)}">${arrow("prev")}</a>
      <div class="popup-box" role="dialog" aria-label="${esc(k.name)} builds">
        <button class="close-btn popup-close" data-action="close" aria-label="Close">${ICONS.close}</button>
        <h2 class="sec-title">${esc(k.name)}</h2>
        <p class="popup-meta">${[k.realName && esc(k.realName), `Power: <b>${esc(k.power)}</b>`, k.difficulty && esc(k.difficulty)].filter(Boolean).join("<span class=\"sep\">·</span>")}</p>
        ${tabsBar("#/killers/" + k.id, tab)}
        ${tab === "1v1" ? render1v1(k.id) : `<div class="build-grid">
          ${list.map((b) => buildCard(b, "killer", k)).join("")}
          <button class="add-tile" data-action="add" data-scope="${k.id}"><span class="plus-circle">+</span>Add another build</button>
        </div>`}
      </div>
      <a class="popup-nav next" href="#/killers/${next.id}${keepTab}" aria-label="Next killer: ${esc(next.name)}">${arrow("next")}</a>`;
  }

  function applySearch() {
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
    document.title = "DBD Builds" + (r.page === "killers" ? " · Killers" : r.page === "survivors" ? " · Survivors" : "");

    const searchFocused = document.activeElement && document.activeElement.id === "char-q";
    app.innerHTML = r.page === "home" ? renderHome() : r.page === "killers" ? renderKillers(r) : renderSurvivors(r);
    applySearch();
    if (searchFocused) { const s = app.querySelector("#char-q"); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); } }

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
    if (location.hash === target) render();
    else location.hash = target;
  }

  function addBuild(scope) {
    const list = listFor(scope);
    if (isV1(scope) && list.length >= rulesFor(baseScope(scope)).maxBuilds) return toast("You already have the maximum number of 1v1 builds.");
    const b = isV1(scope) ? blank1v1(baseScope(scope)) : blankBuild(roleOf(scope));
    b.name = (isV1(scope) ? "1v1 Build " : "Build ") + (list.length + 1);
    list.push(b);
    editing.add(b.id);
    save();
    showBuild(scope, b.id);
  }

  function duplicateBuild(id) {
    const { list, i, scope } = locate(id);
    if (isV1(scope) && list.length >= rulesFor(baseScope(scope)).maxBuilds) return toast("You already have the maximum number of 1v1 builds.");
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
    const opts = all.filter((e) => matches(searchText(e.name, e.owner, ...(e.aliases || [])), q));

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
    location.hash = "#/killers";
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
    if (!e.target.closest(".alt-drop, [data-action=alt-drop]")) closeDrops();
    const el = e.target.closest("[data-action]");
    if (!el || dlg.contains(el)) return;
    const card = el.closest("[data-build]");
    const id = card ? card.dataset.build : altState && el.closest("#altpop") ? altState.buildId : null;
    switch (el.dataset.action) {
      case "add": addBuild(el.dataset.scope); break;
      case "edit": editing.add(id); render(); break;
      case "done": finishEdit(id); break;
      case "duplicate": duplicateBuild(id); break;
      case "delete": deleteBuild(id); break;
      case "pick": openPicker(id, el.dataset.slot, el.dataset.index); break;
      case "alts": openAlts(id, +el.dataset.index); break;
      case "alt-drop": toggleDrop(el); break;
      case "alt-remove": { const { b } = locate(altState.buildId); b.alts[altState.p].splice(+el.dataset.index, 1); if (!b.alts[altState.p].length) delete b.alts[altState.p]; save(); render(); break; }
      case "alts-close": closeAlts(); break;
      case "close": closeOverlay(); break;
    }
  });

  document.addEventListener("input", (e) => {
    if (e.target.id === "char-q") { query = e.target.value; applySearch(); return; }
    const field = e.target.dataset.field;
    if (!field) return;
    locate(e.target.closest("[data-build]").dataset.build).b[field] = e.target.value;
    save();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.classList.contains("bcard-name")) {
      finishEdit(e.target.closest("[data-build]").dataset.build);
    }
    if (e.key === "Escape" && pinned) { hideTip(); return; }
    if (e.key === "Escape" && document.querySelector(".perk-wrap.drop-open")) { closeDrops(); return; }
    if (e.key === "Escape" && altState && !dlg.open) { closeAlts(); return; }
    if (e.key === "Escape" && !dlg.open && route().open) closeOverlay();
    // home page shortcuts, shown as the Q / E hints on the role cards
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && route().page === "home") {
      const k = e.key.toLowerCase();
      if (k === "q") location.hash = "#/killers";
      if (k === "e") location.hash = "#/survivors";
    }
  });

  window.addEventListener("hashchange", () => { closeAlts(); render(); });
  render();
})();
