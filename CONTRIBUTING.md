# Contributing to enscribe

This file defines how enscribe's documentation is organized, so that every piece of information has one home and the documentation stays coherent with the code. A contributor — or an AI session — works against this system: a slice ends with the coherence check below, and a piece of content always has a single owning document.

## The coherence principle

The documentation and the code are one coherent description of the project.
The standard: **if every code file were deleted, the remaining documentation
would be sufficient to rebuild the project.** If the spec falls behind the
code, a design decision was made and recorded only in the code — fix that by
recording it in the spec.

## Two rules

1. **One job per document.** Every document does exactly one of: describe the
   intended design (a spec), name the build sequence (the roadmap), show where
   the project is now (STATUS.md), or define this system (this file). A spec
   carries no progress tracking. The roadmap carries no per-item detail. A
   document that needs two jobs is two documents. (Open work is not a document —
   it lives in GitHub Issues.)

2. **No document states a computable fact.** Test counts, vocabulary counts,
   and similar fast-changing checkable numbers appear in no document. Run
   `npm run verify`.

## The documents

| Document | Role | Holds |
|----------|------|-------|
| `README.md` | Front door | The pitch. No tracking detail. |
| `DESIGN.md` | Spec | Design rationale; the layer model; design directions. |
| `notes/decisions.md` | Spec (strategic) | Product-shape / strategic design decisions — the target default views and the cross-cutting choices that steer them. The tier above `DESIGN.md`'s engineering rationale; subsystem specs defer up to it. |
| `notes/taxonomies/*.md` (`semantic-taxonomy.md`, `document-taxonomy.md`, `proposed-processing-taxonomy.md`) | Spec (conceptual tier) | A conceptual tier that drives the subsystem specs — the semantic / document / processing taxonomies the `notes/specs/` files conform to. Sibling to `DESIGN.md`'s conceptual framing. |
| `notes/specs/*.md` (`interpreter.md`, `pipeline.md`, `pipeline-contract.md`, `core.md`, `shorthand-syntax.md`, `escape-rules-spec.md`, `multiline-spec.md`, `recursive-content-spec.md`, `strict-mode.md`, `tag-forms-reference.md`, `idioms.md`, `principles.md`, `ehtml-naming.md`, `shape-tokens.md`, `frameable.md`, `appendices.md`, `format-words.md`, `render-quality.md`, `render-parity.md`, `sidenotes.md`, `lift-lower-round-trip.md`, `master-document.md`, `multi-column-display.md`, `render-mode.md`, `lists.md`, `interchange.md`, `book-navigation.md`, `toc-and-numbering.md`) | Spec | Their subject — the intended design, present-tense, built and unbuilt alike. |
| `notes/audits/release-audits.md` | Spec | The release-audit procedure — the five reconciliations and how each is run. A process spec; see "The release audit." |
| `notes/audits/code-review.md` | Governance/Spec (process) | The deep code-review method — the method behind release-audit reconciliation #1. |
| `notes/audits/deep-drift-audit-design.md` | Governance/Spec (process) | The deep-drift-audit method — how to run a whole-repo, read-only, verify-against-code, report-only three-way (code ⇄ spec ⇄ taxonomy) drift audit. |
| `ROADMAP.md` | Roadmap | The high-level plan: the releases the work moves through and what each aims at, plus current position. No per-item detail — individual items live in GitHub Issues. |
| `STATUS.md` | Status | Capability checklist: what works today, what is planned. No changelog. |
| `docs-source/*.emd` | User docs | User-facing how-to, rendered to the docs site by `docs-site/build.js`: the Quickstart, the Authoring Guide, and the Enscribe HTML (eHTML) Reference. Working examples, each demonstrated by a test fixture. The specs hold *intended design*; this tier holds *how-to*. |
| Coverage gallery (`docs-site/gen-gallery.js` + `gallery-non-vocab.js`) | Completeness | The project's *completeness* surface and authoring catalog. **Inclusion rule: every construct an author writes, and only those** — "would an author ever write this?" Vocab elements via their `shorthand_examples`, plus the curated non-vocabulary supplement (`gallery-non-vocab.js`, for Enscribe shorthand constructs like `<list>` with no vocab entry). **Generated output an author never writes is excluded** (`authoring: output-only`, e.g. `<note-list>` — notes auto-collect into it). A new construct isn't done until it has a gallery cell; a non-authored output element must not appear. |
| GitHub Issues | Open work | ALL open work — bugs, enhancements, features, open questions — grouped by milestone and label. The home for open-work detail. (Not a repo file.) |
| `CONTRIBUTING.md` | Governance | This system. |
| `CLAUDE.md` | Governance | Collaboration conventions for AI sessions. |

The live documentation lives in a few places: governance and status docs (`README.md`, `DESIGN.md`, `STATUS.md`, `CONTRIBUTING.md`, `CLAUDE.md`, `ROADMAP.md`) at the repository root; the conceptual taxonomies in `notes/taxonomies/`; the subsystem specs in `notes/specs/`; the audit-method docs in `notes/audits/`; the historical record in `notes/archive/`. Open work lives in GitHub Issues, not in a repo file. Anything outside those documentation locations is code or does not belong in the repo's documentation surface.

## The spec tier — DESIGN.md and notes/specs/

The "Spec" role covers two tiers. **`DESIGN.md` is the conceptual master
blueprint**: the layer model, the architectural primitives, the design
directions, the JATS relationship, the DSL-processor model, scope decisions —
*what enscribe fundamentally is*. **The `notes/specs/` files are the
technical blueprint set** — each is the implementation-precise design of one
subsystem, sitting inside the conceptual frame `DESIGN.md` provides. There is
no single master technical blueprint file; the technical blueprint is the
`notes/specs/` set, collectively. Each spec defers up to `DESIGN.md` for
architecture-level framing.

Both tiers are held to the rebuild-from-docs standard: `DESIGN.md` must be
sufficient at the conceptual level; each subsystem spec must be sufficient at
the technical level.

**Placement rule** (which already operated implicitly and is now stated): a
fact about *how the whole system is structured* belongs in `DESIGN.md`; a
fact about *how one subsystem works* belongs in that subsystem's
`notes/specs/` file. The DSL-processor model is the canonical example — it
is a cross-cutting architectural primitive, so it lives in `DESIGN.md`, not
as a peer subsystem spec.

### Subsystem index

Each subsystem's blueprint:

- **Authoring syntax / parser** — `notes/specs/shorthand-syntax.md` (the
  syntactic ground truth), with `notes/specs/escape-rules-spec.md`,
  `notes/specs/multiline-spec.md`, and `notes/specs/recursive-content-spec.md`
  for the related parser-layer details, and `notes/specs/tag-forms-reference.md`
  (the per-tag matrix of which syntactic forms each element supports), plus
  `notes/specs/strict-mode.md` (the strictness register switch — which authoring
  registers the reader interprets).
- **Interpreter / pipeline** — `notes/specs/interpreter.md` (interpreter
  architecture: dispatch, handlers, schema, asset injection) and
  `notes/specs/pipeline.md` (stage ordering, plugin dependencies, data flow), and
  `notes/specs/pipeline-contract.md` (the single source for the three tables the
  two share — the plugin roster, the `file.data` namespace, and the internal node
  types), with `notes/specs/core.md` (the inward-pointing, `fs`-free shared foundation
  the package is built on), `notes/specs/format-words.md` (the host/format-word
  "kind" convention), `notes/specs/render-quality.md` (the standard for
  well-rendered output), `notes/specs/render-parity.md` (the live/static
  one-engine invariant — byte-identity on matched options, and what is
  scoped out of it), and `notes/specs/sidenotes.md` (the margin render mode for
  footnotes/notes — an HTML projection, not new vocabulary). The rendered
  navigation chrome — computed products, never source (Rule 2) — is specified in
  `notes/specs/toc-and-numbering.md` (the generated contents listing and heading
  numbering, for any document) and `notes/specs/book-navigation.md` (a book's
  chapter rail, prev/next links, cover, and pagination unit).
- **eHTML vocabulary** — `notes/specs/ehtml-naming.md` (the four naming
  rules), `notes/specs/shape-tokens.md` (content-shape machinery),
  `notes/specs/frameable.md` (the out-of-flow frameable element family),
  `notes/specs/minipage.md` (the `<minipage>` sealed frameable — a sub-document
  processed in its own pipeline run with its own registry, #115),
  `notes/specs/lists.md` (the `<list>` / `<li>` marker model), and
  `notes/specs/appendices.md` (the `<appendix>` element's article + book
  projections). The per-element vocabulary entries live separately in
  `packages/ehtml/elements/` with `SPEC.md` alongside.
- **Round-trip transforms** — `notes/specs/lift-lower-round-trip.md`
  (the correctness model for the `lift` / `lower` register transforms).
- **Cross-cutting principles** — `notes/specs/idioms.md` (the lexer- and
  processor-delegation principle) and `notes/specs/principles.md`
  (always-renders, parser-knows-nothing-about-meaning, etc.).
- **Document composition & delivery** — `notes/specs/website.md` (the website
  document class — a multi-page site assembled from a master document, each page
  itself natively an article or a book; the third document class alongside
  article and book), `notes/specs/spec-internal-links.md` (page-slug identity and
  the `<a {slug}>` internal-link form — identity vs nav position), and
  `notes/specs/delivery-modes.md` (how a rendered `.emd` is packaged and reaches
  a reader — static / live / single-file — owning delivery shape, not render
  content). `website.md` sits inside the multi-file frame
  `notes/specs/master-document.md` provides (below).
- **Data store** — `notes/specs/data-store.md` (the build-time `<data>` / `@id`
  store — opaque storage, consumer-agnostic `@id` resolution, per-consumer
  interpretation; the #313 design of record), with its two deferred siblings
  `notes/specs/runtime-data-store.md` (a client-side runtime store — re-read
  after load + single-copy dedup; additive, unbuilt) and
  `notes/specs/shared-registry-store.md` (persistence of the merged registry
  across parallel / incremental / live renders; deferred).
- **Extension blueprints (designed; unbuilt unless noted)** —
  `notes/specs/master-document.md` (the multi-file assembler — article-level
  assembly with cross-file numbering/refs is **built** (#190) and renders live
  in the browser (#194); the remaining slices are designed),
  `notes/specs/multi-column-display.md`,
  `notes/specs/render-mode.md`, and
  `notes/specs/interchange.md`. Their design is specified at the
  rebuild standard; the unbuilt fact (where it still holds) is tracked in
  GitHub Issues, and the milestone in `ROADMAP.md`.

## Where each kind of fact lives

- The intended design of any part of the system → its spec.
- User-facing how-to (the syntax for a feature, worked examples a reader can copy) → the docs site (`docs-source/`), not the specs. The specs hold intended design; the docs site holds how-to, and every feature's how-to has a page there.
- Open work of any kind, with detail → [GitHub Issues](https://github.com/enscribejs/enscribe/issues), by milestone and label. Nowhere else.
- The build sequence and current position → `ROADMAP.md`. Nowhere else.
- What is true now / what is built → `STATUS.md` checklist.
- What is being worked on now → the active GitHub milestone.
- Test count, vocabulary count, etc. → no document. Run `npm run verify`.

## Reading order (for newcomers)

The document table above lists every doc and its role. For someone new to the
project, the recommended sequence:

1. `README.md` — the project's purpose and high-level approach.
2. `STATUS.md` — what is working today, what is in flight, what is pending.
3. `ROADMAP.md` — the releases the project moves through and what each aims
   at. Gives a one-screen view of where things are heading.
4. `DESIGN.md` — design rationale: the layer model, JATS relationship, DSL
   processor delegation, scope decisions, design directions.
5. `notes/specs/idioms.md` and `notes/specs/principles.md` — the cross-cutting principles
   (lexer delegation; always-renders; parser-knows-nothing-about-meaning).

For specific subsystems, read the spec for that subsystem under `notes/specs/`: the
parser specs together (`shorthand-syntax.md`, `escape-rules-spec.md`,
`multiline-spec.md`, `recursive-content-spec.md`); the interpreter spec
(`interpreter.md` and `pipeline.md`); the vocabulary spec
(`packages/ehtml/SPEC.md` and the per-element entries); the naming
rules (`ehtml-naming.md`); the shape-token machinery (`shape-tokens.md`).

Open work — [GitHub Issues](https://github.com/enscribejs/enscribe/issues).
Working conventions for AI sessions — `CLAUDE.md`.

## The coherence check

Every implementation slice ends with this check, and reports its result. A
slice is not done until code and documentation agree.

> **Coherence check — perform and report before committing.**
>
> 1. **Spec ⇄ code.** Did this slice make any decision about how the system is
>    *designed* (not merely coded)? If so, the relevant spec must state it now.
>    Test: *with the code deleted, would the spec still describe what this slice
>    decided?* If not, the spec has a hole — fix it in this slice.
>
> 2. **Issues ⇄ code.** Every item this slice completed: close (or check off)
>    its GitHub Issue. Every item this slice discovered: file a new GitHub Issue
>    with the appropriate milestone and labels — a finding reaches Issues in the
>    slice that surfaces it, not a follow-on slice. If the slice changes a
>    release's scope, update `ROADMAP.md` in the same edit.
>
> 3. **STATUS.** Flip the relevant `STATUS.md` checkbox for any capability that
>    shipped, and confirm the checklist still matches reality. STATUS is a
>    capability checklist, not a changelog — the commit log is the changelog.
>
> 4. **User docs.** Did this slice ship or change a *user-facing* feature or add a
>    new authoring construct? It is not done until a docs-site page covers it (the
>    Authoring Guide / Quickstart / eHTML Reference, as fits), a test fixture
>    demonstrates it, **and** the coverage **gallery** has a cell for every
>    construct it adds — a vocab element via its `shorthand_examples`, a
>    non-vocabulary construct (Enscribe shorthand authoring with no vocab entry) via the
>    curated `docs-site/gallery-non-vocab.js` supplement. The gallery is the
>    project's *completeness* surface: every construct a user can write is on it.
>    Code and tests with no docs page, no demonstrating fixture, or no gallery
>    cell is an incomplete feature — the gap is closed in this slice, not deferred.
>
> 5. **Rule 2.** No computable fact was written into any document.
>
> 6. **Report** what was reconciled. If a category needed nothing, say so
>    explicitly — a silent skip and a deliberate "nothing needed" must not look
>    the same.

**Generated-artifact freshness — applies whenever a slice touches a generated-artifact source.** Several `notes/specs/` files and all `elements/*.md` frontmatter are *build inputs* to committed, guarded artifacts (`packages/enscribe/test/coverage/spec-data.generated.json`, `packages/ehtml/src/data.js`). A `notes/specs/` edit is therefore **not** automatically inert: a slice that touches one is not done until the artifact is regenerated and **both** package suites (`packages/ehtml` *and* `packages/enscribe`) are green — the spec→artifact mapping crosses package boundaries, so running only the package you think you touched is insufficient. The exact source→artifact map and the regenerate commands live in `CLAUDE.md` §"Generated artifacts and their sources." This rule exists because the six points above did not, on their own, prevent a stale `spec-data.generated.json` from reaching `main` during v0.4.5 ([#182](https://github.com/enscribejs/enscribe/issues/182)).

**Render-path parity — applies whenever a slice touches the render path.** Live (in-browser) and static (CLI) rendering are one engine, and must produce byte-identical output on matched options. A change to either entry point — the CLI build path or the browser `render*` façade — or to any shared pipeline stage both run must preserve this; do not touch one render path without the other. The standing parity test ([#193](https://github.com/enscribejs/enscribe/issues/193)) renders a representative corpus both ways and asserts byte-identity on matched options, gating render-path changes automatically once it lands. "Matched options" is load-bearing: the live and static *defaults* differ by design — resource link-vs-inline, DSL runtime-vs-baked — and those packaging differences are deliberately outside the byte-parity claim. The invariant, and exactly what is in and out of it, is specified in `notes/specs/render-parity.md` (rationale: `DESIGN.md`'s "Live and static rendering are one engine" direction); the per-mode render predicates that legitimately diverge live in `notes/specs/render-quality.md`, which this rule must not be read to contradict.

## The release audit

The coherence check gates a slice; the release audit gates a `.x.0` milestone — the milestone-level analogue, and the last step before a `.x.0` is tagged.

**When.** A `.x.0` is not complete until, with all its issues closed, the release audit has run. Running it is the final act of the `.x.0`.

**What it produces.** Like any audit, its only output is GitHub Issues — there is no findings document. Findings are filed as they surface and routed by the Maintenance rules below (open work → an Issue; a deliberate, permanent boundary → `DESIGN.md`'s "Design tensions and accepted tradeoffs"; an idea → a discussion Issue), grouped under the next `.x.5` milestone. A finding that blocks the `.x.0` release is assigned to the `.x.0`, not deferred to `.x.5`.

**The cadence.** A `.x.0` ships features; the following `.x.5` is a consolidation pass that resolves the audit's findings and ships no new features. `.x.5` is therefore finite by construction — its scope is exactly what the `.x.0`-close audit surfaced.

**The audit itself** — the five reconciliations and how to run each — is specified in `notes/audits/release-audits.md`.

## Maintenance

- A prior observation is a lead, not a fact. When a documentation pass
  migrates, transcribes, or files an observation from an earlier
  investigation, an older notes file, or a past slice, it must empirically
  re-verify that observation against the current code before recording it
  as live — the earlier observation establishes only that something was
  once true. Re-verification is part of the pass: the pass is not complete
  until every filed observation has been re-checked, and an observation
  that no longer holds is filed with its corrected status, not as live.
- A spec is edited the moment the design it describes changes — in the same
  slice, never "later."
- A limitation is one of two things and is filed accordingly — it never gets
  its own document. A limitation that is a bug or a missing feature is open
  work: it goes in GitHub Issues (and the roadmap if it changes a release's
  scope). A limitation that is a deliberate, permanent design boundary is part of the
  design: it goes in `DESIGN.md`'s "Design tensions and accepted tradeoffs"
  section, with its rationale. Every limitation must be classified as one
  or the other.
- Discussing an idea is a type of work. It can be filed as a GitHub Issue
  like any other — "discuss whether to do X" — and routed normally.
  Resolving the item produces a spec change, a work item, or a recorded
  decision not to pursue. An idea worth keeping does not become its own
  document or a "deferred" file; it becomes a discussion issue.
- The roadmap stays small. If a milestone's item list is growing past a
  handful of items, the right move is usually to split the milestone, not to
  lengthen the roadmap. Item detail does not move into the roadmap to
  compensate; it stays in GitHub Issues.
- Provenance for a shipped change is the commit log, not a phase number or
  slice label. A document records *what* the system does and *why*; *when* and
  *in which slice* live in git. Documents do not cite phase numbers as identity
  anchors — where a historical reference is genuinely useful, cite the commit
  SHA (or say "an earlier change"), never a phase definition that no longer
  exists.
