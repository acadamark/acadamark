# Deep drift audit — design

The original goal of the taxonomy arc. **Whole-repo, read-only, verify-against-code, report-only.** Now on
solid ground: the specs conform to the three committed taxonomies (`notes/taxonomies/`), so the audit is a
clean **three-way check (code ⇄ spec ⇄ taxonomy)**, not a mutual-consistency guess.

## The disease being audited (Ariel's diagnosis)
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
The codebase is mid-migration and deliberately divergent in places. Each audit slice MUST carry these, or it
will flood false positives on things Ariel has *chosen*:
1. **Custom-element-shaped ≠ drift.** Layer 1 is migrating to HTML-shaped group-by-group (#147); lists +
   figures done, the rest custom-element-shaped. "This element is custom-element-shaped" is **un-migrated**,
   not drifted. Flag only if it contradicts a *completed* migration.
2. **Not-JATS/TEI-compliant ≠ drift.** Reference standards **guide, don't gate** (notes/decisions.md): Enscribe
   may diverge, file an issue, proceed. A divergence WITH a tracked issue is **tracked debt**, not drift. Flag
   only undocumented divergence.
3. **"Current/measured" snapshots describing the old state ≠ drift.** e.g. `current-processing-taxonomy.md`
   describes content.type in present tense BY DESIGN (a dated measurement). Do not flag dated snapshots.
4. **Deferred/aspirational ≠ drift.** A spec describing a not-yet-built feature it explicitly marks deferred is
   not drift (it's a plan). Flag only claims of DONE that are not done.

## Partition — concurrent read-only slices (each reports independently)
Read-only ⇒ maximally concurrent. Partition by CONCERN over the same frozen tree; launch together:

- **Audit A — processing-taxonomy conformance.** Does each element's ACTUAL processing (handler via
  `getContentHandler`/`LANGUAGES`; flow via `FLOW_TAGNAMES`/`content.shape`; the two-lookup model; the
  pipeline) match what `proposed-processing-taxonomy.md` says its class should do? Carries the A3 seed (4 stale
  `content.type` spec refs: interpreter.md, pipeline.md, shape-tokens.md, tag-forms-reference.md — the last a
  generated input). Checks the dissolution is fully reflected. Scope: dsl-registry, recursive-content,
  interpret-plugin, content-model, the handlers, the element frontmatter.

- **Audit B — semantic-taxonomy conformance.** Is each of the 109 elements correctly classed into its semantic
  family, and does its behavior match the family? (marginnote/span were previews — the audit does this
  systematically.) Flag mis-classed elements, family-vs-behavior mismatches, the named bridges (does each
  divergence have a stated bridge, or is it unflagged drift?). Scope: element specs vs semantic-taxonomy.md.

- **Audit C — document/addressing-taxonomy conformance.** Do article/book/website actually compose as
  document-taxonomy.md says (the three addressing primitives; scaffolding incl. the now-fixed nav)? Does the
  assembler/master-document reality match the addressing model? Scope: master-document, website-structuring,
  doc-type, the document taxonomy.

- **Audit D — spec ⇄ code drift (broad).** The classic drift sweep: stale comments, superseded claims,
  doc-vs-reality gaps, DONE-claims-that-aren't, dead references. Carries the reference-standards seed (DESIGN.md
  :44/:102 first-class-JATS language to reconcile; :106 already partially corrected). Scope: notes/specs/*,
  DESIGN.md, STATUS.md, code comments, slice-report-derived claims in specs.

Each slice: read-only, carries the calibration, reports findings to `~/enscribe-reports/audit-<X>-findings.md`
as a prioritized list (severity × certainty), changes nothing, merges nothing.

## Synthesis (sequential, after all return)
Collate the four findings into ONE drift-map: deduplicated, prioritized (real drift first; un-migrated /
tracked-debt / dated-snapshot separated out as NOT-drift-but-noted), with a recommended fix order. The fixes
themselves are SEPARATE downstream slices — never concurrent with the audit, never fixed mid-audit.

## Pre-seeded findings (already surfaced; the audit confirms + extends, doesn't re-discover)
- 4 specs with stale `content.type` (Audit A/D): interpreter.md, pipeline.md, shape-tokens.md,
  tag-forms-reference.md (generated input — widens blast radius).
- DESIGN.md first-class-JATS at :44, :102 (Audit D) — reconcile to reference-standards; :106 already nuanced.
- code-block/inline-code non-HTML `html_output.element` dispatch keys (Audit A — #147-adjacent naming).
- These are LEADS to confirm against current code, not facts to transcribe.
