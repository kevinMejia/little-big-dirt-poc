# Spec-driven development

Status: risk-based workflow updated from the user's instructions on 2026-10-19.

## Workflow

1. Classify risk and write a proportional specification and plan. Small/moderate work uses one short feature note (or an internal working note for trivial edits); longer features may keep separate files.
2. Proceed autonomously on small/moderate changes. Make reasonable assumptions for minor ambiguities and record them. Do not require separate specification and plan approvals.
3. Request a single focused decision only for high-risk architectural changes, new dependencies, destructive operations, irreversible data changes, or genuinely ambiguous requirements that materially affect the result. Existing explicit user authorization counts; do not ask twice.
4. Work through bounded, independently verifiable tasks. Keep the user informed of significant decisions without interrupting routine implementation.
5. Run relevant validation automatically, fix issues in scope and report actual outcomes. Preserve backward compatibility where practical, especially saved settings and existing URLs.

Use principles.md and architecture.md as context. templates/feature.md is the default short form; templates/validation.md is optional for larger evidence sets. No framework, new dependencies or source relocation is required. Documentation stays proportional to complexity. Deployment/publication still requires applicable authorization.

## Completion

Requirements map to tasks and verification evidence. Record baseline revision, environment, commands, outcomes, manual observations and unresolved failures. Relevant existing regressions must remain intact. Existing failures need explicit evidence and disposition; never silently weaken expectations.

## Platform policy

Intended targets: desktop Chrome, Edge, Firefox and Safari; mobile Safari on iPhone and Chrome on Android. These are targets, not claims of tested compatibility. Record actual OS/browser/device versions for evidence. Desktop viewport or touch emulation does not certify physical mobile behavior.

60 FPS is a performance target, not a strict acceptance gate until device-specific measurable baselines and thresholds are agreed. Compare equivalent warmed scenes, viewport, settings and input; record loading separately from frame performance.

## Pilot

[Rally checkpoints and lap timing](features/001-rally-laps/spec.md) is a draft. It remains a draft and is outside the current rename task. Apply the risk-based workflow when resumed; minor uncertainties do not create approval gates.
