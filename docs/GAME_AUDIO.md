# Game audio controls

Open **Settings → Audio · volumes & sound switches**. Every sound has an Enable checkbox, a 0–100% volume slider, Test and Reset. Changes apply immediately and save in this browser. Search by sound name to find a control quickly.

Master multiplies every sound. Engines controls Dirty and Stinky; Effects controls impacts, collectibles, jumps and cannon; Music / jingles controls word completion and records. Each sound also has its own level. Existing Word Hunt mute and volume settings still apply to its cues.

**Reset all audio** restores file defaults. **Export audio settings** downloads the current config object. To change permanent defaults, edit `AudioConfig.js`: each entry has a comment describing its gameplay event. `enabled:false` disables that sound or category; `volume:0` silences it. Browser overrides take priority until reset.

The 23 approved CC0 clips include distinct cached engine loops, trunk bumps/creaks/cracks, foliage and tree landing, rock crack/break/scatter, Turbo collection/activation/expiration, letters/completion/records, ramp takeoff/landing and cannon launch/wind/landing. The original horn also has an individual control. Foliage is trimmed to 0.45 seconds. Launch crunchy alternative and Descent digital are excluded.

Engines remain running while pitch and gain follow driving; changing vehicles stops the previous loop. Cannon launch triggers once, wind follows flight and landing uses the existing landing event. Impact cooldowns, a 12-voice cap, short fades and a master limiter control overlap. No physics or world settings are changed.

Clips preload and decode once after the first user gesture. Total compressed download is about 371 KiB. The original recordings, source URLs, CC0 licenses, processing and hashes are recorded in `assets/audio-candidates/manifest.json` and its `licenses/` directory. Asset Showroom → Audio Auditions remains available for listening.

Desktop Edge automated checks cover decoding, cache reuse, engine pitch, individual/category muting, settings persistence and gameplay triggers. Phone-sized layout checks do not verify physical iPhone Safari audio unlocking, output quality or performance; those require device testing.

## Phone startup reliability

Audio still requires a user gesture. The shared manager listens in capture phase to pointer down/up, touch end and key down, so driving controls cannot swallow the unlock. It starts a silent frame in that gesture and requests resume without waiting for its promise before loading clips. Downloads/decodes run with four workers; failed clips retry after another gesture and successful buffers stay cached. Background suspension clears voices immediately, and a tap can resume the same context. Cached-page navigation preserves the manager rather than disposing it permanently.

`tests/audio-startup.cjs` simulates a never-resolving resume promise, a temporary HTTP 503, swallowed touch events and suspension/resume. These automated regressions pass in desktop Edge with touch emulation; they do not reproduce or verify every iOS Safari interruption.
