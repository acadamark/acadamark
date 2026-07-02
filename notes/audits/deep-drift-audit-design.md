# Deep drift audit — method

**Whole-repo, read-only, verify-against-code, report-only.** When the specs conform to the committed
taxonomies (`notes/taxonomies/`), the audit is a clean **three-way check (code ⇄ spec ⇄ taxonomy)**, not a
mutual-consistency guess. Run it whenever descriptions and code may have diverged across the repo — after a
heavy development push, before a release, or on demand.

## The disease being audited
Most drift during heavy development arises from **CC hooking onto past drift**: CC reasons from *descriptions*
(comments, specs, reports, prior claims), which drift; it reads the drift as truth and builds on it, propagating
it. The audit maps **every place a description diverges from reality**, so the descriptions can be corrected and
the hooks removed. It treats drift as the disease (descriptions diverging from code), not the symptoms
(individual bugs).

## Method (non-negotiable disciplines)
- **Verify against CODE, not against other descriptions.** Descriptions are the unreliable layer; a claim is
  confirmed only against what the code actually does (grep/read; behavioral where needed — JSDOM is not enough
  for real-browser claims).
- **Read-only. Report-only. Fix NOTHING.** Correcting drift is downstream work; a correction premised on a
  finding a later finding contradicts is the disease itself. The deliverable is a **drift-map**, not edits.
- **Reports live OUTSIDE the git tree** (the `~/enscribe-reports/` convention).
- **A prior report/comment/claim is a LEAD, not a fact** — re-verify everything against current code (the
  ~10:1 gate ratio holds: most flagged issues are simpler/already-fixed/different than first framed).

## CALIBRATION — what is NOT drift (so the audit doesn't false-positive)
The codebase may be mid-migration and deliberately divergent in places. Each audit slice MUST carry these, or it
will flood false positives on things Ariel has *chosen*:
1. **Custom-element-shaped ≠ drift.** Layer 1 migrates to HTML-shaped group-by-group. "This element is
   custom-element-shaped" is **un-migrated**, not drifted. Flag only if it contradicts a *completed* migration.
2. **Not-JATS/TEI-compliant ≠ drift.** Reference standards **guide, don't gate** (`notes/decisions.md`): Enscribe
   may diverge, file an issue, proceed. A divergence WITH a tracked issue is **tracked debt**, not drift. Flag
   only undocumented divergence.
3. **"Current/measured" snapshots describing an earlier state ≠ drift.** A doc that by design describes a dated,
   as-measured state in present tense (a point-in-time snapshot) is not drifted. Do not flag dated snapshots.
4. **Deferred/aspirational ≠ drift.** A spec describing a not-yet-built feature it explicitly marks deferred is
   not drift (it's a plan). Flag only claims of DONE that are not done.

## Partition — concurrent read-only slices (each reports independently)
Read-only ⇒ maximally concurrent. Partition by CONCERN over the same frozen tree; launch together. Run one
conformance slice per committed taxonomy, plus one broad spec ⇄ code sweep:

- **Per-taxonomy conformance (one slice per committed taxonomy in `notes/taxonomies/`).** Does the code's
  ACTUAL behavior match what the taxonomy says its classes should do?
  - *Processing-taxonomy conformance.* Does each element's actual processing (handler dispatch; flow vs.
    content shape; the two-lookup model; the pipeline) match the processing taxonomy's class for it?
  - *Semantic-taxonomy conformance.* Is each element correctly classed into its semantic family, and does its
    behavior match the family? Flag mis-classed elements, family-vs-behavior mismatches, and the named bridges
    (does each divergence have a stated bridge, or is it unflagged drift?).
  - *Document/addressing-taxonomy conformance.* Do the document types actually compose as the document taxonomy
    says (the addressing primitives; the scaffolding)? Does the assembler / master-document reality match the
    addressing model?

- **Spec ⇄ code drift (broad).** The classic drift sweep: stale comments, superseded claims, doc-vs-reality
  gaps, DONE-claims-that-aren't, dead references. Scope: `notes/specs/*`, `DESIGN.md`, `STATUS.md`, code
  comments, slice-report-derived claims in specs.

Each slice: read-only, carries the calibration, reports findings to `~/enscribe-reports/audit-<X>-findings.md`
as a prioritized list (severity × certainty), changes nothing, merges nothing.

## Synthesis (sequential, after all return)
Collate the slice findings into ONE drift-map: deduplicated, prioritized (real drift first; un-migrated /
tracked-debt / dated-snapshot separated out as NOT-drift-but-noted), with a recommended fix order. The fixes
themselves are SEPARATE downstream slices — never concurrent with the audit, never fixed mid-audit.

## Seeding a run (optional)
If prior reports, comments, or known-suspect references exist going into a run, list them as **LEADS to confirm
against current code, not facts to transcribe** — the audit confirms and extends them, it never re-asserts them
unchecked. A lead the current code contradicts is dropped.
