# Documentation — spec (design of record for the docs site's content)

**Role.** This is the missing spec for the documentation site's authored/generated content —
the #223 information architecture promoted out of issue comments into a real `notes/specs/`
document. It records *what the docs pages are and how they come to exist*; the generator's
mechanics are implementation of this spec.

Held to the rebuild-from-docs standard (CONTRIBUTING §coherence): with the code deleted, this
spec plus the element specs must be enough to regenerate the docs.

---

## The core decision: the guides are GENERATED from the spec, not hand-authored

The vocabulary guides **and** the authoring guide are **generated** from the element
definitions (`packages/ehtml/elements/*.md`) plus the semantic taxonomy
(`notes/taxonomies/semantic-taxonomy.md`), by a docs generator run as part of the site build.
They are **generator output** — never hand-edited. This is the whole point of #223: docs
derived from the spec are correct and complete by construction and cannot drift from it. A
CI/test **freshness guard** (`docs-gen/check-docs-fresh.mjs`, the root `docs:check` script, #373)
enforces this: it regenerates the pages and fails if a committed `docs-source` page no longer
matches generator output — the analogue of each package's `check-data-fresh`, so a hand-edit or a
spec change committed without regenerating is caught rather than silently drifting.

This supersedes the current state, in which `docs-source/**/*.emd` are hand-maintained. Those
pages become generator output. (Prior generators — `gen-reference.js`, `vocab-extract.js`,
`gen-books.js` — are archived under `notes/archive/old-docs*/` as prior art.)

### What is generated vs. sourced vs. app

| Page | Origin |
|---|---|
| **eHTML Vocabulary** (reference) | **Generated** from `elements/*.md` + taxonomy — comprehensive |
| **Enscribe Shorthand Vocabulary** (reference) | **Generated** from `elements/*.md` + taxonomy — comprehensive |
| **Authoring Guide** | **Generated** from the same source — *lighter*, not exhaustive |
| Home | Sourced (single-source) from `README.md` |
| Design | Sourced (single-source) from `DESIGN.md` |
| JATS (import/export) | Custom — hand-authored, not spec-generated |
| Try It | The in-browser editor app, not generated content |

The single-source pages (Home ← README, Design ← DESIGN) are derived from their source file,
not hand-copied, so they cannot drift either.

### Preserved hand-authored chapters (the one exception)

A generated book may carry a **preserved hand-authored chapter** — narrative the per-element
template cannot express, sitting inside a generated book as a real chapter. Two exist today: the
Enscribe Vocabulary's **Showcase**, and the Authoring Guide's **Multi-file documents** (the `src` /
`<include>` transclusion path — a conceptual model, not a per-element reference). The mechanism is
deliberately narrow:

- The generator **emits the index reference** to the chapter (via each surface's `extra` list) but
  **never writes the chapter body**. The body is hand-authored and committed once; the reference is
  guarded by `existsSync`, so it appears only while the file does.
- The freshness guard (`check-docs-fresh.mjs`) asserts that *regenerating changes nothing*: because
  the generator never touches a preserved chapter's body, it survives regeneration byte-for-byte and
  the guard stays green. The chapter's **placement** is generated (and thus guarded); its **content**
  is authored (and thus outside the content check).
- Such a chapter is still bound by the docs-clean guard — it must build with zero unexplained
  diagnostics, in pure Enscribe shorthand (no raw HTML).

This is the *only* exception to "generated, never hand-edited," reserved for genuinely conceptual
material — a mental model, a worked cross-cutting example — that has no per-element home.

---

## Generation rules (correct by construction)

The generator emits pages that obey these rules, so the whole drift class we hit — collapsed
code, headerless tables, stale content — cannot recur:

1. **Organized by the semantic taxonomy.** Pages and sections follow the taxonomy families
   (`semantic-taxonomy.md`): primary prose, emphasis & marking, notation, structural
   scaffolding, and the rest. Page structure derives from the taxonomy, not a hand-kept order.
2. **Reference guides are comprehensive.** Every element, every option (kwarg / boolean flag),
   every authoring form (canonical / sigil / markdown), each with a rendered example. Nothing an
   author can write is absent.
3. **The authoring guide is lighter.** It teaches the common path — it is deliberately *not*
   exhaustive — but it is still generated from the same source and still taxonomy-following, so
   it is accurate even though it is not complete.
4. **Every generated table has a header row. No special cases.** The generator never emits a
   headerless table and never uses `-headers` in docs output. (This is the D2 decision — stated
   as an absolute so no downstream tool invents per-table bandaids.)
5. **Multi-line code examples use `<code-block>`.** Never inline `<code>` for multi-line content
   (inline `<code>` reflows to one line). Single-value inline examples may use inline `<code>`.
6. **Examples show source and rendered result** (the `<code-block>` source + a rendered
   companion), so the reader sees both what to type and what it produces. The rendered
   companion is a sealed `<minipage>` preview. **Citations render live** (#411): the seal
   reads citations through, so a `<cite>` example resolves against the page-level docs
   example library the generator appends to any chapter whose previews cite
   (`DOCS_EXAMPLE_LIBRARY` — its keys stay in sync with the vocabulary examples'). An
   example whose source needs a *storage-side* document-scope counterpart (a `<data>`
   store, an `@`-src consumer) still shows source only, with a one-line stated reason —
   those pulls remain sealed out. Never a silently-broken preview, and never an
   unintentional failure marker.
7. **Failure behavior is demonstrated, not just named (#395/D1).** The authoring guide's
   quotation-and-sourcing chapter carries a "When citation resolution fails" passage that
   renders the visible `??cite: …??` markers live: an unknown key (a sealed preview
   resolving through the seal against the page's libraries — #411 — with a key none of
   them contain, stated honestly), a key missing from a real in-scope library (rendered
   in the chapter body against the chapter's own small `<library>`, the found key
   resolving beside the missing key's marker), and a `<library>` inside the preview box —
   prohibited under #411's one-document-one-library rule — whose box renders the
   misplacement-family flag with its box-scoped cannot-resolve citation count, so the
   placement cause is demonstrated the same way the key causes are (the body-level
   outside-`<data>` misplacement, #410, is described with a pointer to `library.md`
   §Placement rather than rendered live — its whole-document cite-count hint would read
   confusingly on a page full of resolving cites). The passage claims only what
   renders on every surface — the auto-placed References list does not land on a
   book-in-website page (the bibliography-placement gap in the #395 inventory), so the
   docs do not claim it. Resolution failure is part of the authored surface; the docs show
   it the way they show every other rendered result.

8. **A new family member joins every family inventory (cross-reference).** When a new
   member of an enumerable family ships (a sigil, a tag form, a config kwarg, …), every
   docs surface that ENUMERATES that family gains the member in the same slice — the sigil
   entries (the authoring guide's **Sigil Tag Shorthand** chapter — see rule 9) are the
   canonical docs-side case (#416's `<^` was the motivating miss). The rule itself — scope,
   the disposition-table requirement, and the full surface list beyond the docs — lives in
   `notes/coding-conventions.md` §8.

9. **A surface may split a family, and the `<config>` reference is generated.** Two
   authoring-guide refinements, both generated (so `check-docs-fresh` guards them):
   (a) the *authoring guide* renders the `notation` family as **two** chapters —
   **Mathematical Typesetting** (the math elements) and **Sigil Tag Shorthand** (the code
   elements + the footnote sigil) — partitioned by each element's `category` (a build guard
   fails if a member is neither math nor code); the comprehensive Vocabulary / eHTML
   surfaces keep the single **Notation** chapter, where the member list is self-evident and
   the teaching titles don't fit. (b) the exhaustive **document `<config>` options
   reference** is generated from `config-options-doc.js` (held in lockstep with
   `CONFIG_KWARGS` by `config-options-doc.test.js`) as its **own guide chapter** — placed in
   the nav right after *Declarations & metadata* and `<ref>`-linked from that chapter's
   `<config>` teaching entry (#447; as an unlinked chapter tail it was effectively
   unfindable): the live set grouped by `CONFIG_FAMILIES`, reserved keys omitted and named
   once, one home — the chapter-tail copy is gone, so there is no drift twin.

---

## Prerequisite: the spec must be reconciled with the code first

The generator reads the element spec, so its input must be true. Before the generator is trusted,
run a **spec ⇄ code ⇄ docs reconciliation over the vocabulary** (method:
`notes/audits/deep-drift-audit-design.md`; read-only, report-only, drift-map).

**Adjudication rule (this project's, stated here):** neither the spec nor the code is the gold
standard — both drift, and the **spec is generally the tighter of the two**. Where the audit
finds spec ⇄ code disagreement, it **surfaces the discrepancy to Ariel for decision**; it does
**not** auto-resolve toward the code. (This narrows the deep-drift method's default "verify
against code," which is a reliability check for descriptions, into an adjudicated reconciliation
for the specific case where the spec may be the correct party.)

---

## Relationship / status

- **Realizes #223.** #223 is "the docs are generated from the spec." The spec↔code audit
  (`~/enscribe-reports/vocab-drift-audit.md`) and the generator (`docs-gen/generate-docs.mjs`, wired
  into `build:site` via the `docs:gen` script) are built; the hand-authored vocabulary + authoring
  pages are now generator output. Remaining: the em/strong prose and `remark` numbering the audit
  surfaced (the concurrent `spec-reconcile` slice) flow into the generated pages on the next
  regeneration; and the authoring guide's per-family template can grow richer common-path prose.
- **Supersedes hand-editing.** Fixing a rendered docs glitch by editing a `docs-source/*.emd`
  page is patching generator output; the fix belongs in the generator (or the element spec it
  reads). The only exceptions are genuine **engine** bugs surfaced via the docs (e.g. the
  `<code-block>` registration bug, the `<span>`/link fallback), which are fixed in the engine.
- **Mechanics are implementation.** The generator's file layout, template details, and build
  wiring are implementation of this spec and live with the code; this spec holds the *decisions*.
