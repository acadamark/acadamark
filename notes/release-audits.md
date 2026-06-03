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

## 1 · Code review — fit, dead code, duplication

Three lenses; each finding is the observation, the fix lands in a `.x.5` slice.

- **Architectural fit (primary).** Does each addition sit on the system's grain, or beside
  it? Smells to hunt: a one-off helper or module that does almost what an existing mechanism
  does (a parallel path for one concept); a special-case branch for an input the general
  mechanism could handle if adjusted; logic placed at a stage chosen for convenience — e.g.
  to keep tests quiet — rather than where the concept belongs; a suite that passes without
  covering the shipped behavior. The question is not "does it work" but "should the big
  picture have been adjusted to absorb this case natively?" A working one-off that signals a
  missed generalization is a finding — file the refactor toward the general mechanism, not a
  note that the one-off is fine.
- **Dead code.** Unreferenced exports, functions, branches; stale comments.
- **Duplication.** Copy-paste logic that wants one home.

A behavior-changing fix or a project-sized restructure is itself a finding (its own Issue),
never folded into the audit.

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
