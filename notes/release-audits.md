# Release audits

The release audit runs at the close of every `.x.0` milestone. **When it runs, what it
produces, and how findings are routed** are defined in `CONTRIBUTING.md` ("The release
audit") and are not restated here. This document specifies the audit *itself* — the four
reconciliations and how to run each.

One rule from `CONTRIBUTING.md`'s Maintenance section bears directly on running these
passes: before filing any finding that originates in an earlier note, observation, or
slice, **re-verify it against the current code** — "a prior observation is a lead, not a
fact." An earlier note establishes only that something was once true.

Run the four in this order. Code is ground truth, so the code-facing audits come first and
the doc audits then reconcile against already-accurate specs.

## 1 · Code review + DRY

Surface, as findings: dead code (unreferenced exports, functions, or branches; stale
comments), duplicated logic that wants one home, and obvious consistency wins.

This audit is **light by boundary**: a finding here is the *observation*, not the fix. The
fix lands in a later `.x.5` slice. A behavior-changing change, or a project-sized
restructure, is itself a finding with its own Issue — never folded into the audit pass.

## 2 · Specs ⇄ code

Every subsystem spec must describe what the code actually does — emitted HTML and JATS, the
Layer 1 vocabulary, the accepted idioms, the error-node shapes. This is the milestone-level
backstop to the per-slice coherence check: it catches **cross-slice drift** and specs that
several slices touched without any single slice owning the reconciliation.

A finding is any spec that no longer matches the code. The standard is rebuild-from-spec:
with the code deleted, the spec must still describe what the subsystem does.

## 3 · Internal docs — DESIGN.md, ROADMAP.md, STATUS.md

- **DESIGN.md** — recorded decisions match what shipped. Any design decision still stranded
  in an Issue body migrates into `DESIGN.md` (or the relevant subsystem spec) so the
  rationale has a durable home.
- **ROADMAP.md** — current: the release sequence and current position reflect reality.
- **STATUS.md** — accurate: nothing over-claimed, nothing shipped-but-unlisted.
- **Rule 2** throughout — no computable facts written into any of them.

## 4 · Documentation site

Every shipped feature is documented; every documented feature still exists (no pages for
retired behavior); examples render and match current output.
