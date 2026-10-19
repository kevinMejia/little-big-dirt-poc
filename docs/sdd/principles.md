# Development principles

1. Preserve existing behavior unless the task specification explicitly changes it. State preservation requirements beside new behavior.
2. Extend current module ownership. Keep index.html as orchestration and put bounded domain behavior in modules. No unrelated refactoring, relocation, bundler or backend migration.
3. Keep one movement authority per simulation step. Visuals consume simulation state; observational gameplay must not write vehicle transforms or forces.
4. Reuse authoritative terrain/road data for rendering, detection and collision. Play uses Rapier / Hybrid exclusively; preserve shared terrain and explicit loading failure recovery.
5. Keep file defaults distinct from browser overrides. Document configuration units, clamps, mode support, live/reload timing and storage scope. Storage failures must degrade safely.
6. Preserve relative URLs, static HTTP hosting and the GitHub Pages subdirectory. Consequential dependency changes require an explicit plan decision; retain version/source/license metadata.
7. Preserve input ownership, input clearing, audio gesture unlocking, focus and page lifecycle. New UI must coexist with touch controls and existing dialogs.
8. Bound per-frame work, allocations, effects and resources. Dispose owned resources/listeners. Prefer existing deterministic placement and shared/pool rendering patterns.
9. Verify observable requirements using scenarios and justified numeric tolerances. Source-text checks alone do not establish runtime behavior.
10. Distinguish observed behavior, proposed requirements and unknowns. Report failed, blocked, untested and passed validation separately. Compatibility/performance claims require matching evidence.

11. Use risk-based autonomy: specify/plan then implement small and moderate work without approval gates. Ask only for high-risk architecture, new dependencies, destructive/irreversible changes or material ambiguity; honor existing authorization.
12. Keep specs/plans/tasks proportional. One brief note normally suffices for a rename. Resolve minor ambiguities with documented assumptions; do not require separate spec and plan approval.
13. Preserve saved settings and URLs where practical. Run relevant checks automatically, fix in-scope issues, and communicate significant decisions and remaining limitations.
