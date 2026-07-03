# Compensating-layer audit — method (scoping doc, for `notes/audits/`)

**Whole-repo, read-only, verify-against-code, report-only.** A sibling to `deep-drift-audit-design.md`, same
disciplines. Where the deep-drift audit maps *descriptions diverging from code*, this audit maps a different
class of debt: **code that compensates for an earlier stage's wrong output instead of the earlier stage
producing the right thing.** Report-only — it FLAGS and FILES issues; it fixes nothing.

## The pattern being audited (the "disease")
A transform-then-reverse pair: stage A produces something wrong or lossy, and stage B detects and undoes/redoes
it. It "works," but it is two layers fighting — drift-prone (B can miss a new case A introduces), hard to
reason about, and a symptom of the root fix being deferred. Whitespace is the most frequent instance
(parser trims a meaningful space → downstream restores it, e.g. #330's seam block), but the pattern is general:
any place a later stage exists to reverse an earlier stage's effect.

## Detection heuristics (leads, not conclusions — verify each against code)
Grep/read for code whose *purpose* is to reverse a prior step:
- restore / re-add / re-insert / put back / undo / redo / recover / re-attach
- post-hoc `trim` **followed elsewhere** by space re-insertion (or the reverse); "collapse then expand"
- a `replace(/^\s/…)` or slice that strips, paired with a later concat that re-adds
- comments containing "compensate", "work around", "the parser drops/eats/strips … so we …", "restore the …"
- normalize-then-denormalize, escape-then-unescape at different stages, sort-then-reorder
- a special-case branch that exists only to counter another stage's general behavior

For each candidate, **verify against code**: is this genuinely compensating for an earlier stage's wrong
output, or is it legitimate independent processing? (A stage that *adds* required structure is not
compensation; only *reversing a prior stage's effect* is.) A prior comment calling itself a workaround is a
LEAD, not proof — confirm the transform-then-reverse actually exists.

## Calibration — what is NOT this smell (avoid false positives)
**The discriminator is WHY, not SHAPE.** A stage that reverses an earlier one is only a smell if the earlier
stage's output is *wrong on its own terms*. The test for every candidate:

> Can the earlier stage's output be justified independently, without reference to the later stage?
> **Yes → not this smell** (a legitimate pipeline). **No** (only explicable as "wrong, but later-fixed") →
> confirmed compensation.

Over-flagging legitimate reversal is itself a drift this audit must not introduce. Explicitly NOT the smell:
- **Reversible-by-design round-trips** — escape→unescape, normalize→denormalize-for-target,
  serialize→deserialize. The round-trip is the design; neither end is a mistake.
- **Intentional two-pass processing** where each pass has an independent, separately-justifiable job (not
  reversing the other).
- **Third-party-boundary adaptation** genuinely outside our control (e.g. adapting a markdown library's fixed
  output) — this IS compensation, but the root fix may be legitimately impossible; flag it as *tolerated
  stopgap* debt, distinct from *fixable-at-root* debt. The audit records which bucket each falls in.
- **Behavior-neutral derived-index guards** (the registries / section-kinds pattern) — those PREVENT drift,
  they don't compensate for a prior stage. Not this smell.

A candidate is only filed as a defect if it *fails* the independent-justification test — a tell-word match
(restore/re-add/undo) is a lead to investigate, never a verdict on its own.

## Deliverable
- **One issue per confirmed site**, labeled (e.g. `refactor`, `tech-debt`), each stating: the two stages, what
  A does wrong, how B compensates, and whether the root fix looks *fixable-at-root* or *tolerated-stopgap*.
- A short **summary report** (`~/enscribe-reports/`) indexing the sites by bucket, so the root-cause refactor
  work can be prioritized (fixable-at-root first; stopgaps tracked but lower priority).
- **Fixes nothing** — each root-cause refactor is its own later, byte-identity-gated slice, informed by the
  filed issue.

## When to run
After heavy parser/interpreter development, or on demand when the transform-then-reverse pattern is suspected to
have accumulated. Not release-gating.

## Tracking
File a tracking issue ("Compensating-layer audit — flag transform-then-reverse debt") pointing at this doc, so
the audit itself is queued as future work. #330's seam block is the seed example to include in that issue.
