# Audit starting point — release audit

Assembled from the three completed sessions' parked findings, structured against the
five reconciliations in `notes/release-audits.md`. This is the input pile and plan, not
the executed audit.

## Prerequisite — merge the notes-cleanup branch first
The `notes-cleanup-and-code-review-spec` branch isn't merged. It must land before the
audit runs, for two reasons: (1) `notes/code-review.md` — the method Reconciliation 1
runs by — only exists on that branch; (2) the CONTRIBUTING spec-index drift is already
fixed there, so running the audit on pre-merge `main` would re-flag things you just fixed.
Review the diff (deletion-heavy but each deletion was reference-checked, both suites
green), merge, then audit on clean `main`.

## Thesis — docs lag code, not the reverse
Across three sessions, nearly every "stale / unimplemented / dead" premise resolved to
"done, live, or already closed": audit-roadmap findings all fixed-and-closed, the archive
woven into live code, the data-asset specs deliberate, #222 a live feature, #226 not inert.
The drift direction is **STATUS and docs prose lagging behind a more-complete codebase.**

Consequence for the audit: expect the findings to cluster in Reconciliation 3 (internal
docs) and 4 (docs site). Reconciliation 1 (code review) is likely light — the last
code-review pass's findings (#220/#225/#229/#231/#232) are all closed with fixes in the
tree. That's a prediction, not a license to skip 1; the pass still runs.

## The five reconciliations (per release-audits.md)
Run in order — code is ground truth, so code-facing first, docs reconcile against
already-accurate specs, parity is the final behavioral confirmation.

1. **Code review** — architectural fit / dead code / duplication, by the `notes/code-review.md` method. Findings are observations; fixes land in a `.x.5` slice.
2. **Specs ⇄ code** — every subsystem spec describes what the code actually emits; catches cross-slice drift. Standard: rebuild-from-spec.
3. **Internal docs** — DESIGN.md / ROADMAP.md / STATUS.md accurate; nothing over- or under-claimed; stranded design decisions migrate out of Issue bodies; Rule 2.
4. **Documentation site** — every shipped feature documented; every documented feature still exists; examples render and match.
5. **Render parity** — live ≡ static byte-identical on matched options; #193 gate green **and** its corpus still covers every entry point / pipeline stage / loader added this milestone.

## Output discipline (the lesson audit-roadmap.md just taught)
Findings become **Issues** — no standing findings document (that's exactly the file the
notes-cleanup pass had to dissolve). And re-verify **every** lead below against current
code before filing: a prior observation is a lead, not a fact. All three of this audit's
seeded leads are leads precisely because the last three sessions kept disproving such
premises.

## Seeded leads (verify against code, then route)

### L1 — `<data>` asset registry: STATUS says complete, #245 says unimplemented → Reconciliation 3 (+2)
STATUS asserts the registry shipped and is **complete** (the multi-file book row states it
five ways and closes "the `<data>` asset registry is complete (#190)"). Open **#245** claims
the asset half is unimplemented; the notes-cleanup Reconciliation-2 check found the asset
functions (`createLazyAsset`, `makeAssetElement`, …) present via #225. **Verify** the code
does what STATUS claims (embedded + external + all media types + duplicate placement +
cross-file merge + JATS `<graphic>`). Expected resolution: **close #245 as already-shipped
(stale).** If verification surfaces a genuine gap STATUS papers over, the finding inverts —
correct STATUS instead. This is the sharpest single instance of the thesis.

### L2 — "Current position" prose understates the project → Reconciliation 3 (+ ROADMAP)
STATUS's "Current position" says **v0.4.0** and describes a v0.4.0 feature set, omitting the
book-navigation / live app-shell / live edit-loop (#203) / separate-pages build / docs-catalog
(#236/#239/#241) / strict-mode / lists arc that the checklist above marks shipped. Reconcile
the prose and ROADMAP's "current position" to reality, and decide whether a release cut is due
(ties to #147, the HTML-shaped reframe epic at v0.5.0). The checklist itself looks accurate;
the **summary prose** is what's stale.

### L3 — config-toc row over-claims uniform static≡live → Reconciliation 3 (+5)
STATUS's config-toc row says the static build and live render honor the listing
"identically." Reframed **#226** established that's false for the default separate-pages book
build and the live book render (`applyConfigToc` runs only inside `compileToHtml`). Caveat the
row to the path-dependence, or note it's resolved when #226's v0.5.0 work lands. **Do not
re-file** — #226 owns the fix; this is only the STATUS-accuracy correction.

## Recommended sequencing — two CC sessions
The full five-pass audit is large, and the one-session-per-worktree discipline applies. Split:

- **Session A — code-facing (Reconciliations 1 + 2).** The discovery passes: code review by
  the code-review.md method, then specs⇄code. Findings → Issues. Expected light on 1, real on 2.
- **Session B — docs + parity (Reconciliations 3 + 4 + 5).** Seeded with L1/L2/L3, run against
  the now-reconciled specs. This is where the thesis pays out.

Each its own worktree. A precedes B (B's STATUS reconciliation leans on A having made the
specs accurate). I'll cut the Session A CC prompt on your nod.
