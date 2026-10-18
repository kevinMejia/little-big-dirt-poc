# Word Hunt

Word Hunt starts automatically in Play. Drive Dirty or Stinky through letters in any order. Every saved word appears once per shuffled round, with no immediate repeat across rounds. No countdown or failure state is involved.

Open **Settings → Word Hunt** to customize the entire word list, enable the feature, independently hide its HUD, adjust world-letter visibility/size/collection distance, or mute/adjust its own sounds. Words are trimmed, uppercased, unique A–Z strings of 2–12 letters. An empty list pauses the feature. Edits restart the hunt and queue; an edited/deleted word loses its old records. Record reset asks for confirmation. Settings do not change Driving HUD preferences.

Defaults are documented in `VehicleConfig.js` under `wordHuntConfig`. `WordHuntState.js` uses the existing `GamePreferences` deployment-scoped local storage approach; only runtime overrides are read over central defaults. The comma-separated default words become an editable array in storage. Records include best/recent milliseconds and completion count. No network persistence or accounts are involved.

`FloatingLetters.js` caches beveled TextGeometry per character and shares a five-color material palette. The locally bundled Helvetiker Bold font and its license are in `assets/fonts`. Showroom → Word Hunt Floating letters previews A–Z using the existing fixed stage and scrollable controls; motion, colors, lighting, glow and scale can be adjusted/exported locally. It uses the same renderer as Play. Rotation is a gentle wobble that preserves the front silhouette.

`WordHuntLayout.js` samples ground and surrounding slopes, checks tree/rock envelopes, excludes ramp approach/landing corridors and map edges, and keeps configurable spacing. It uses a central exploration region scaled to the map, with no collision bodies. Failed placement never starts a partial word; it retries safely. Each repeated character gets an independent world object and spelling-position slot. Locations stay unchanged until completion or a word-list/enable change.

`WordHuntSystem.js` owns progress independently of vehicles. Swept horizontal collection prevents driving through small targets between frames. Reset and switching clear only the movement sweep. A monotonic `performance.now()` timer starts on the first pickup, stops on the last, and excludes garage/background time. Disabling clears incomplete progress. Celebrations let driving continue and last 2.6 seconds by default.

Pickup effects use short pops and bounded particle bursts with disposed buffers/materials. Original sine-wave Web Audio notes unlock on pointer/keyboard interaction; Word Hunt has independent volume/mute. No changes to existing game audio or vehicle physics are required.

Validation: `python tools/build_site.py` then `python tools/check_project.py` runs the project suite, including `node tests/word-hunt.mjs`. Browser smoke checks cover font rendering, world startup, HUD Ready state, and Settings word add/edit/delete/persistence. The lifecycle test also covers independent repeated-letter slots, out-of-order collection, paused timing, reset isolation, records and automatic advancement. Physical iPhone GPU performance, Safari sound output and end-to-end driving collection remain device playtest items.
