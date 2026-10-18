// GAME AUDIO — edit these defaults, save, then refresh Play.
// Settings → Audio changes the same values live and saves browser overrides.
// Volumes are percentages: 0 = silent, 50 = half gain, 100 = full sample gain.
// enabled:false disables just that bus/sound. Master multiplies every category.
// Reset Audio in Settings restores these file defaults. No physics values here.
export const audioConfig={
  master:{enabled:true,volume:75}, // Overall sound; disable to mute everything.
  engine:{enabled:true,volume:60}, // Both engines; each has its own control below.
  effects:{enabled:true,volume:80}, // Impacts, collectibles, jumps and cannon.
  music:{enabled:true,volume:70}, // Completion/record jingles (no background music).
  sounds:{
    // Original vehicle horn. Routed through Master/Effects like every new effect.
    horn:{enabled:true,volume:55},
    // Dirty · mechanical diesel idle — A prepared slow-idle engine loop. Audition against the heavier truck below; not a verified backhoe recording.
    "dirty-diesel":{enabled:true,volume:65},
    // Stinky · heavy rattling diesel — An old school-bus diesel recording: heavier truck character rather than a garbage-truck-specific recording.
    "stinky-diesel":{enabled:true,volume:65},
    // Gentle trunk bump — Short wood contact for light impacts.
    "wood-bump":{enabled:true,volume:70},
    // Trunk creak — A creak alternative for wobble; audition its character before choosing.
    "wood-creak":{enabled:true,volume:70},
    // Strong wood crack A — A recorded crack for knockdown onset.
    "wood-crack-a":{enabled:true,volume:70},
    // Strong wood crack B — An alternate crack for occasional variation.
    "wood-crack-b":{enabled:true,volume:70},
    // Brief foliage burst at tree knockdown; limited to 0.45 seconds, not the full 2-second recording.
    "foliage":{enabled:true,volume:70},
    // Tree ground thud — A heavier wood hit to pair with the fall landing.
    "tree-thud":{enabled:true,volume:70},
    // Launch · low arcade boom — An exaggerated bass launch candidate, not audio from Motocross Madness.
    "cannon-boom":{enabled:true,volume:70},
    // Flight · rushing wind loop — A short crossfaded excerpt from a synthesized wind recording.
    "air-wind":{enabled:true,volume:70},
    // Landing · soft heavy impact — A broad landing thump; less brittle than a metal hit.
    "cannon-land":{enabled:true,volume:70},
    // Collection · rising power-up — A quick rising cue for collection.
    "turbo-pickup":{enabled:true,volume:70},
    // Activation · energetic jump — An alternate activation accent; compare with the pickup alone.
    "turbo-active":{enabled:true,volume:70},
    // Expiration · falling cue — A short downward cue for boost ending.
    "turbo-expire":{enabled:true,volume:70},
    // Letter · bright chirp A — A compact collectible candidate suitable for small pitch variations.
    "letter-a":{enabled:true,volume:70},
    // Letter · two-tone B — A second letter-collection character to compare.
    "letter-b":{enabled:true,volume:70},
    // Word complete · plucked jingle — A short plucked-instrument completion candidate.
    "word-complete":{enabled:true,volume:70},
    // Personal record · brass jingle — A more prominent record cue; compare against the smaller word jingle.
    "record-fanfare":{enabled:true,volume:70},
    // Rock damage · stone strike — A stone/mining hit for the first qualifying crack.
    "rock-crack":{enabled:true,volume:70},
    // Rock break · crunchy burst — A stylized breaking burst, to play once when the rock breaks.
    "rock-break":{enabled:true,volume:70},
    // Fragments · small stone ticks — An optional debris accent; reserve for limited fragment contacts.
    "rock-scatter":{enabled:true,volume:70},
    // Ramp takeoff · swish — A short recorded swish for takeoff.
    "ramp-takeoff":{enabled:true,volume:70},
    // Ramp landing · cushioned hit — A cushioned alternative for ordinary landings.
    "ramp-land":{enabled:true,volume:70},
  },
};

// Asset/event labels for Settings; volumes above are the editable defaults.
export const audioDefinitions=[
  {id:"horn",label:"Vehicle horn (original)",group:"Vehicle",bus:"effects",file:null,loop:false},
  {
    "id": "dirty-diesel",
    "label": "Dirty · mechanical diesel idle",
    "group": "Engines",
    "bus": "engine",
    "file": "dirty-diesel.m4a",
    "loop": true
  },
  {
    "id": "stinky-diesel",
    "label": "Stinky · heavy rattling diesel",
    "group": "Engines",
    "bus": "engine",
    "file": "stinky-diesel.m4a",
    "loop": true
  },
  {
    "id": "wood-bump",
    "label": "Gentle trunk bump",
    "group": "Trees",
    "bus": "effects",
    "file": "wood-bump.m4a",
    "loop": false
  },
  {
    "id": "wood-creak",
    "label": "Trunk creak",
    "group": "Trees",
    "bus": "effects",
    "file": "wood-creak.m4a",
    "loop": false
  },
  {
    "id": "wood-crack-a",
    "label": "Strong wood crack A",
    "group": "Trees",
    "bus": "effects",
    "file": "wood-crack-a.m4a",
    "loop": false
  },
  {
    "id": "wood-crack-b",
    "label": "Strong wood crack B",
    "group": "Trees",
    "bus": "effects",
    "file": "wood-crack-b.m4a",
    "loop": false
  },
  {
    "id": "foliage",
    "label": "Falling foliage rustle",
    "group": "Trees",
    "bus": "effects",
    "file": "foliage.m4a",
    "loop": false
  },
  {
    "id": "tree-thud",
    "label": "Tree ground thud",
    "group": "Trees",
    "bus": "effects",
    "file": "tree-thud.m4a",
    "loop": false
  },
  {
    "id": "cannon-boom",
    "label": "Launch · low arcade boom",
    "group": "Boundary cannon",
    "bus": "effects",
    "file": "cannon-boom.m4a",
    "loop": false
  },
  {
    "id": "air-wind",
    "label": "Flight · rushing wind loop",
    "group": "Boundary cannon",
    "bus": "effects",
    "file": "air-wind.m4a",
    "loop": true
  },
  {
    "id": "cannon-land",
    "label": "Landing · soft heavy impact",
    "group": "Boundary cannon",
    "bus": "effects",
    "file": "cannon-land.m4a",
    "loop": false
  },
  {
    "id": "turbo-pickup",
    "label": "Collection · rising power-up",
    "group": "Turbo Boost",
    "bus": "effects",
    "file": "turbo-pickup.m4a",
    "loop": false
  },
  {
    "id": "turbo-active",
    "label": "Activation · energetic jump",
    "group": "Turbo Boost",
    "bus": "effects",
    "file": "turbo-active.m4a",
    "loop": false
  },
  {
    "id": "turbo-expire",
    "label": "Expiration · falling cue",
    "group": "Turbo Boost",
    "bus": "effects",
    "file": "turbo-expire.m4a",
    "loop": false
  },
  {
    "id": "letter-a",
    "label": "Letter · bright chirp A",
    "group": "Word Hunt",
    "bus": "effects",
    "file": "letter-a.m4a",
    "loop": false
  },
  {
    "id": "letter-b",
    "label": "Letter · two-tone B",
    "group": "Word Hunt",
    "bus": "effects",
    "file": "letter-b.m4a",
    "loop": false
  },
  {
    "id": "word-complete",
    "label": "Word complete · plucked jingle",
    "group": "Word Hunt",
    "bus": "music",
    "file": "word-complete.m4a",
    "loop": false
  },
  {
    "id": "record-fanfare",
    "label": "Personal record · brass jingle",
    "group": "Word Hunt",
    "bus": "music",
    "file": "record-fanfare.m4a",
    "loop": false
  },
  {
    "id": "rock-crack",
    "label": "Rock damage · stone strike",
    "group": "Rocks",
    "bus": "effects",
    "file": "rock-crack.m4a",
    "loop": false
  },
  {
    "id": "rock-break",
    "label": "Rock break · crunchy burst",
    "group": "Rocks",
    "bus": "effects",
    "file": "rock-break.m4a",
    "loop": false
  },
  {
    "id": "rock-scatter",
    "label": "Fragments · small stone ticks",
    "group": "Rocks",
    "bus": "effects",
    "file": "rock-scatter.m4a",
    "loop": false
  },
  {
    "id": "ramp-takeoff",
    "label": "Ramp takeoff · swish",
    "group": "Jumps",
    "bus": "effects",
    "file": "ramp-takeoff.m4a",
    "loop": false
  },
  {
    "id": "ramp-land",
    "label": "Ramp landing · cushioned hit",
    "group": "Jumps",
    "bus": "effects",
    "file": "ramp-land.m4a",
    "loop": false
  }
];
