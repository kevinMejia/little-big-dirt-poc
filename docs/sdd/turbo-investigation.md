# Turbo investigation - 2026-10-19

Baseline: d05e492, Windows, headless Microsoft Edge through bundled Playwright.

Scope: reproduce reported turbo failure before changing gameplay. Preserve tuning, saved settings, placement and URLs. Extend the existing browser regression to cover acceleration and Rally Car; repair its ambiguous Turbo Boost Settings selector.

Observed: fresh-profile desktop and phone-sized touch emulation collect pickups for all three vehicles. Desktop speed assertions verify immediate acceleration above 2.5 times normal speed. Cooldowns, reset isolation, live pickup count and showroom load pass. Physics regression verifies 3x boost, two-second timer/refill, smooth expiry, airborne momentum and boosted ramps for Dirty/Stinky.

Validation: build_site.py and check_project.py passed; run_rapier_world_tests.py passed; turbo-world.cjs passed desktop and phone viewport emulation. No physical phone or other browser tested.

No gameplay defect reproduced. Existing configuration can disable turbo or set its duration/speed/count to zero. The saved Original physics mode does not collect turbo; current default Rapier does. The user subsequently identified the saved older physics mode as the likely cause. Retiring Original and migrating saved preferences to Rapier/Hybrid was proposed; that gameplay change is not implemented in this commit.
