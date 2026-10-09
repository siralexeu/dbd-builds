/* 1v1 rules (allowed / banned) — shown in the "1v1" tab of every killer and of the survivor page,
   and used to mark banned perks / add-ons when you make a 1v1 build.

   Source: DBDLeague — "General 1v1 Balance" (scrim / informative balancing, not the seasonal ladder rules;
   if they conflict, the Seasonal Ladder rules win).

   Names are written exactly as on the wiki (e.g. "Hex: Blood Favour", "Play with Your Food");
   perk aliases work too ("Will to Live" = Decisive Strike).

   Per killer (perKiller), keyed by killer id ("blight", "nurse", ...):
     notes:        game rules for that killer (not about add-ons), e.g. "must use 1 rush in place and fatigue"
     bannedPerks:  perks banned only for that killer (added to killer.bannedPerks)
     allowedPerks: perks from killer.bannedPerks that this killer may still use
     bannedAddons: that killer's banned add-ons — a rarity ("Ultra Rare", "Very Rare", ...) bans all of that rarity
     addonsNote:   the add-on rule in one line, shown above the banned add-ons (every killer has one)
     "All" in bannedPerks / bannedAddons bans every perk / add-on of that killer.
     map:          the map the 1v1 is played on with that killer — click it on the site to see the map picture

   maps: picture + realm for each map used above, keyed by the map name without the variant number
   ("Suffocation Pit 1" → "Suffocation Pit"). Pictures are the in-game map images from deadbydaylight.wiki.gg. */
window.DBD_1V1 = {
  source: "DBDLeague — General 1v1 Balance",

  maps: {
    "Azarov's Resting Place":    { realm: "Autohaven Wreckers", img: "img/maps/azarovs-resting-place.png" },
    "Blood Lodge":               { realm: "Autohaven Wreckers", img: "img/maps/blood-lodge.png" },
    "Coal Tower":                { realm: "The MacMillan Estate", img: "img/maps/coal-tower.png" },
    "Dead Dawg Saloon":          { realm: "Grave of Glenvale", img: "img/maps/dead-dawg-saloon.png" },
    "Fractured Cowshed":         { realm: "Coldwind Farm", img: "img/maps/fractured-cowshed.png" },
    "Groaning Storehouse":       { realm: "The MacMillan Estate", img: "img/maps/groaning-storehouse.png" },
    "Ironworks of Misery":       { realm: "The MacMillan Estate", img: "img/maps/ironworks-of-misery.png" },
    "Léry's Memorial Institute": { realm: "Léry's Memorial Institute", img: "img/maps/lerys-memorial-institute.png" },
    "Midwich Elementary School": { realm: "Silent Hill", img: "img/maps/midwich-elementary-school.png" },
    "Suffocation Pit":           { realm: "The MacMillan Estate", img: "img/maps/suffocation-pit.png" },
    "Wreckers' Yard":            { realm: "Autohaven Wreckers", img: "img/maps/wreckers-yard.png" },
    "Wretched Shop":             { realm: "Autohaven Wreckers", img: "img/maps/wretched-shop.png" },
  },
  sourceNote: "Scrim-friendly general balancing, not the official balancing of the current competitive season. In an official Ladder match the Seasonal Ladder rules take priority.",

  survivor: {
    maxBuilds: 2,
    perkSlots: 2,
    rules: [
      "You may bring up to <b>2 perks</b> of your choice that are not banned.",
      "You may bring a <b>Flashlight</b> (purple, no add-ons) into every 1v1, <b>except vs The Trapper and The Wraith</b>.",
      "Flashlights are not allowed together with the perk <b>Champion of Light</b>.",
      "<b>Firecrackers</b> are banned.",
      "<b>Dramaturgy items</b> are not allowed to be used.",
      "<b>Any aura-revealing perks / add-ons</b> are not allowed to be used.",
    ],
    bannedPerks: [
      "Alert", "Dance with Me", "Deception", "Distortion", "Dramaturgy", "Lightweight", "Low Profile",
      "Lucky Break", "Object of Obsession", "Overcome", "Parental Guidance", "Scene Partner", "Sprint Burst",
      "Troubleshooter",
    ],
  },

  killer: {
    maxBuilds: 3,
    perkSlots: 1,
    addonSlots: 2,
    rules: [],
    bannedPerks: [
      "Beast of Prey", "Dissolution", "Hex: Blood Favour", "Hex: Crowd Control", "Hex: Undying", "I'm All Ears",
      "Knock Out", "Languid Touch", "Play with Your Food", "Predator", "Superior Anatomy", "Spirit Fury",
      "Zanshin Tactics",
    ],
    perKiller: {
      artist: {
        map: "Azarov's Resting Place",
        addonsNote: "Untitled Agony, O Grief, O Lover and Garden of Rot are banned.",
        bannedAddons: ["Untitled Agony","O Grief, O Lover","Garden of Rot"],
      },
      blight: {
        map: "Suffocation Pit 1",
        notes: ["The Blight must use 1 rush in place and fatigue."],
        bannedPerks: ["Brutal Strength"],
        addonsNote: "Ultra Rare add-ons, Compound Twenty-One and Adrenaline Vial are banned.",
        bannedAddons: ["Ultra Rare","Compound Twenty-One","Adrenaline Vial"],
      },
      cannibal: {
        map: "Wreckers' Yard",
        addonsNote: "Light Chassis is banned.",
        bannedAddons: ["Light Chassis"],
      },
      cenobite: {
        map: "Dead Dawg Saloon",
        addonsNote: "Ultra Rare add-ons, Greasy Black Lens and Impaling Wire are banned.",
        bannedAddons: ["Ultra Rare","Greasy Black Lens","Impaling Wire"],
      },
      clown: {
        map: "Wreckers' Yard",
        addonsNote: "All add-ons allowed.",
      },
      "dark-lord": {
        map: "Wretched Shop",
        addonsNote: "Ultra Rare add-ons, Lapis Lazuli and Medusa's Hair are banned.",
        bannedAddons: ["Ultra Rare","Lapis Lazuli","Medusa's Hair"],
      },
      deathslinger: {
        map: "Suffocation Pit 1",
        addonsNote: "Ultra Rare add-ons are banned.",
        bannedAddons: ["Ultra Rare"],
      },
      demogorgon: {
        map: "Wreckers' Yard",
        addonsNote: "All add-ons allowed.",
      },
      doctor: {
        map: "Wreckers' Yard",
        addonsNote: "All \"Restraint\" add-ons are banned.",
        bannedAddons: ["\"Restraint\" - Class II","\"Restraint\" - Class III","\"Restraint\" - Carter's Notes"],
      },
      dredge: {
        map: "Midwich Elementary School",
        addonsNote: "Ultra Rare add-ons and Field Recorder are banned.",
        bannedAddons: ["Ultra Rare","Field Recorder"],
      },
      executioner: {
        map: "Azarov's Resting Place",
        addonsNote: "Range add-ons can't be combined (Black Strap, Lead Ring, Wax Doll, Iridescent Seal of Metatron).",
      },
      "ghost-face": {
        map: "Léry's Memorial Institute",
        addonsNote: "All Very Rare add-ons are banned.",
        bannedAddons: ["Very Rare"],
      },
      ghoul: {
        map: "Wreckers' Yard",
        addonsNote: "Only Uncommon add-ons and below.",
        bannedAddons: ["Rare","Very Rare","Ultra Rare"],
      },
      "good-guy": {
        map: "Coal Tower 1",
        addonsNote: "Ultra Rare add-ons, Plastic Bag and Yardstick are banned.",
        bannedAddons: ["Ultra Rare","Plastic Bag","Yardstick"],
      },
      hag: {
        map: "Fractured Cowshed",
        addonsNote: "No add-ons allowed.",
        bannedAddons: ["All"],
      },
      hillbilly: {
        map: "Blood Lodge",
        notes: ["The Hillbilly must start the chase with 0% Overdrive. You can either walk to shack or proc Overdrive and let it run out."],
        addonsNote: "LoPro Chains is banned.",
        bannedAddons: ["LoPro Chains"],
      },
      houndmaster: {
        map: "Coal Tower 1",
        addonsNote: "Only Uncommon add-ons and below.",
        bannedAddons: ["Rare","Very Rare","Ultra Rare"],
      },
      huntress: {
        map: "Wreckers' Yard",
        addonsNote: "Only Rare add-ons and below.",
        bannedAddons: ["Very Rare","Ultra Rare"],
      },
      legion: {
        map: "Groaning Storehouse",
        addonsNote: "All add-ons allowed.",
      },
      lich: {
        map: "Coal Tower 1",
        addonsNote: "Ultra Rare add-ons are banned.",
        bannedAddons: ["Ultra Rare"],
      },
      mastermind: {
        map: "Coal Tower 1",
        addonsNote: "Ultra Rare add-ons and Uroboros Virus are banned.",
        bannedAddons: ["Ultra Rare","Uroboros Virus"],
      },
      nemesis: {
        map: "Ironworks of Misery",
        addonsNote: "All add-ons allowed.",
      },
      nightmare: {
        map: "Dead Dawg Saloon",
        notes: ["The Survivors are allowed to bring Visionary + 2 perks."],
        addonsNote: "Dream Pallet add-ons are banned.",
        bannedAddons: ["Wool Shirt","Paint Thinner","Unicorn Block","\"Z\" Block"],
      },
      nurse: {
        map: "Coal Tower 1",
        notes: ["The Nurse must use 1 blink in place and fatigue."],
        bannedPerks: ["All"],
        addonsNote: "No add-ons allowed.",
        bannedAddons: ["All"],
      },
      oni: {
        map: "Coal Tower 1",
        addonsNote: "Ultra Rare add-ons are banned.",
        bannedAddons: ["Ultra Rare"],
      },
      onryo: {
        map: "Midwich Elementary School",
        addonsNote: "All aura-revealing add-ons are banned.",
        bannedAddons: ["Mother's Comb","Distorted Photo","Tape Editing Deck","Remote Control"],
      },
      pig: {
        map: "Wreckers' Yard",
        addonsNote: "Amanda's Letter is banned.",
        bannedAddons: ["Amanda's Letter"],
      },
      plague: {
        map: "Suffocation Pit 1",
        addonsNote: "No add-ons allowed.",
        bannedAddons: ["All"],
      },
      singularity: {
        map: "Wreckers' Yard",
        notes: ["We recommend starting the trial with EMP equipped."],
        addonsNote: "Spent Oxygen Tank and Soma Family Photo are banned.",
        bannedAddons: ["Spent Oxygen Tank","Soma Family Photo"],
      },
      spirit: {
        map: "Wreckers' Yard",
        addonsNote: "Only Uncommon add-ons and below.",
        bannedAddons: ["Rare","Very Rare","Ultra Rare"],
      },
      trapper: {
        map: "Suffocation Pit 1",
        addonsNote: "Ultra Rare add-ons are banned.",
        bannedAddons: ["Ultra Rare"],
      },
      twins: {
        map: "Suffocation Pit 1",
        addonsNote: "Ultra Rare add-ons are banned.",
        bannedAddons: ["Ultra Rare"],
      },
      unknown: {
        map: "Wreckers' Yard",
        addonsNote: "Ultra Rare and Exhaustion add-ons are banned.",
        bannedAddons: ["Ultra Rare","Hypnotist's Watch","Serum Vial"],
      },
      wraith: {
        map: "Coal Tower",
        addonsNote: "All add-ons allowed.",
      },
      xenomorph: {
        map: "Wretched Shop",
        addonsNote: "Self-Destruct Bolt is banned.",
        bannedAddons: ["Self-Destruct Bolt"],
      },
    },
  },
};
