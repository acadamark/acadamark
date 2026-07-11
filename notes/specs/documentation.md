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
   companion is a sealed `<minipage>` preview, and document-scope resolution cannot cross the
   seal — an example whose source needs a document-scope counterpart (a `<data>` store, an
   `@`-src consumer, a `<cite>` against a `<library>`) shows source only, with a one-line
   stated reason. Never a silently-broken preview, and never an unintentional failure marker.
7. **Failure behavior is demonstrated, not just named (#395/D1).** The authoring guide's
   quotation-and-sourcing chapter carries a "When citation resolution fails" passage that
   renders the visible `??cite: …??` markers live: a cite with no `<library>` in scope (a
   sealed preview is exactly that, stated honestly), a key missing from a real in-scope
   library (rendered in the chapter body against the chapter's own small `<library>`, the
   found key resolving beside the missing key's marker), and a misplaced `<library>` —
   outside a `<data>` block (#410) — whose sealed preview renders both the markers and
   the misplacement flag with its cannot-resolve citation count, so the placement cause
   is demonstrated the same way the key causes are. The passage claims only what
   renders on every surface — the auto-placed References list does not land on a
   book-in-website page (the bibliography-placement gap in the #395 inventory), so the
   docs do not claim it. Resolution failure is part of the authored surface; the docs show
   it the way they show every other rendered result.

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
