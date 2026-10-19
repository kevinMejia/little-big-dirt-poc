# Project development workflow

Follow docs/sdd/README.md and docs/sdd/principles.md. Keep specifications and plans proportional: one short note or internal plan suffices for small/moderate changes, then implement autonomously. Document reasonable minor assumptions. Do not require separate specification and plan approvals.

Ask only for high-risk architectural changes, new dependencies, destructive operations, irreversible data changes or genuinely material ambiguity; honor authorization already given by the user. Keep significant decisions visible without interrupting routine work.

Preserve existing structure, behavior, saved settings and URLs where practical. Run relevant validation automatically and fix in-scope failures. Build before tools/check_project.py; select additional browser/asset tests for affected features. Report actual results and untested platforms honestly. No physical-device or 60 FPS guarantee without matching measurements.
