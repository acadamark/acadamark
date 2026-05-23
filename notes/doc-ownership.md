# Documentation ownership

This file exists to fix a structural problem, not to describe a feature.

The acadamark repository has accumulated many documents. Several facts —
the test count, the pipeline plugin order, the slice status, the backlog —
are written down in more than one place. When a slice changes one of those
facts, it updates some copies and misses others. The documents drift apart.
Repeated "doc-staleness sweeps" (F2 and its predecessors) have each missed
files, because a sweep is the symptom, not the cure.

The cure is this: **every category of fact has exactly one owning document.
Every other mention of that fact is a pointer to the owner, never a copy.**

A slice that changes a fact updates the owner. It does not hunt for copies,
because there are no copies — only pointers, and a pointer does not go stale.

---

## How to use this file

Before writing a fact into any document, find its category below and check
who owns it.

- If you own it: write the fact.
- If you do not own it: write a pointer instead — "see `<owner>`" — or
  write nothing and let the reader follow the existing pointer.

When a slice changes a fact, update **only the owning document**. If you
find the same fact stated (not pointed-to) in a non-owning document, that
is drift: replace it with a pointer as part of whatever slice you are in.

When a new category of fact appears that is not listed here, add a row to
the ownership table in the same slice that introduces it. This file is
itself owned (see the table) and is kept current the same way.

---

## The ownership table

| Fact category | Owning document | Everyone else |
|---|---|---|
| Project premise, layered model, the display ladder, JATS relationship, scope decisions, accepted tradeoffs | `DESIGN.md` | Pointer |
| Current project state — what is built, in flight, pending | `STATUS.md` | Pointer |
| Pipeline plugin chain — names, order, what each produces | `notes/pipeline.md` | Pointer |
| Interpreter internals — dispatch, handlers, schema, asset injection | `notes/interpreter.md` | Pointer |
| Shorthand syntax — grammar, attribute forms, closing rules, node shapes | `notes/shorthand-syntax.md` | Pointer |
| Layer 1 vocabulary — element entries, attributes, JATS mappings | `packages/layer1-vocabulary/SPEC.md` + `elements/*.md` | Pointer |
| Layer 1 naming rules, render-mode lowering map, compilation targets | `notes/layer1-naming.md` | Pointer |
| Backlog — what to build, dependency order, layer structure | `notes/acadamark-backlog-roadmap.md` | Pointer |
| Specified-but-unbuilt inventory — the DF / PG / DS / OQ items | `notes/specified-not-implemented.md` | Pointer |
| Audit findings — the AUD / DRIFT / GAP items | `notes/audit-findings.md` | Pointer |
| Session orientation — where things stand, working method, the slice rhythm | `acadamark-session-handoff.md` | Pointer |
| Build plan — phases, the BUILD-era slice map | `BUILD.md` | Pointer |
| Core principles — always-renders, delegation, spec-first, max-correct-output | `notes/principles.md` | Pointer |
| Delegation principle in detail, the two-layer rule, accepted bare idioms | `notes/idioms.md` | Pointer |
| Development process — verify script, snapshot updates, browser verification | `notes/process.md` | Pointer |
| Reading order — where a newcomer starts | `notes/reading-order.md` | Pointer |
| Documentation ownership (this file) | `notes/doc-ownership.md` | Pointer |

---

## Specific drift hazards (the facts that move most)

These are the facts most likely to be copied and go stale. Each names its
single owner explicitly so there is no excuse for a copy.

**Test count.** Owned by `STATUS.md`. The number of test suites and tests
changes nearly every slice. No other document states a count — not the
handoff, not `process.md`, not `BUILD.md`, not a package README. They say
"see `STATUS.md` for the current count" or say nothing. `process.md` in
particular must not embed a suite count in its description of the verify
script; it describes what the script does, not how many suites exist today.

**Pipeline plugin order.** Owned by `notes/pipeline.md`. `notes/interpreter.md`
may describe the *internals* of each plugin but points to `pipeline.md` for
the order. `STATUS.md` may give a one-line summary of the pipeline shape
(shape → index → number → resolve) but points to `pipeline.md` for the
plugin-by-plugin list. `BUILD.md` is planning-era and must say so rather
than presenting its diagram as current.

**Slice / item status (done vs. open).** A DF/PG/DS/OQ item's status is
owned by `notes/specified-not-implemented.md`. An AUD item's status is
owned by `notes/audit-findings.md`. The roadmap and the handoff may say
"done" or "next" for sequencing purposes, but they point to the inventory
or the findings file for the authoritative status — they do not re-describe
what was done.

**Doc-staleness items themselves.** Owned by `notes/specified-not-implemented.md`
(the DS section) and `notes/audit-findings.md`. When a stale doc is fixed,
the fix is recorded in the owner; the fixed doc itself just becomes correct.

---

## The display ladder (recorded here, owned by DESIGN.md)

This principle was decided in a 2026-05 design session and must be written
into `DESIGN.md`, which owns it. It is restated here only because this file
was the occasion for the decision; once `DESIGN.md` carries it, this section
becomes a pointer.

Acadamark documents compile to one canonical representation: Layer 1 —
semantic HTML with custom elements. Layer 1 is the archival form, the JATS
export source, and the input to every display strategy.

Display is a separate, downstream concern with three targets, forming a
ladder from richest to plainest:

1. **Layer 1 + CSS, no JavaScript.** The default. Sufficient for static
   rich documents — structure, figures, captions, typography. Browsers
   render unknown custom elements as generic boxes; CSS styles them.

2. **Layer 1 + CSS + conditionally-injected JavaScript.** Adds interactive
   affordances — hover previews for citations, cross-reference popovers.
   The interpreter already injects this JS only when the document contains
   notes, refs, or citations.

3. **Render mode — lossy lowering to plain HTML headings.** For consumers
   that cannot accept custom elements (a plain feed, an email, a context
   with no custom-element CSS). `<section-title>` becomes `<h1>`, and the
   semantic role is no longer recoverable from the output.

The canonical form is never the lossy one. Lowering is one-directional:
Layer 1 can always be projected down to plain HTML+CSS; plain HTML+CSS can
never be raised back to Layer 1, because the semantic information was
discarded. This asymmetry is why Layer 1, not render-mode output, is
canonical — the JATS export depends on the semantic distinctions that
render mode throws away.

"Compiles to HTML" means compiles to Layer 1. How Layer 1 reaches a screen
is a display-target choice, made per consumer, not per document.

---

## What this file is not

It is not a restructure of the documentation. The restructure — actually
going through each non-owning document and replacing its stale copies with
pointers — is its own filed slice. This file is the keystone that makes
that restructure mechanical and makes every slice in between stop adding
new drift. It is cheap on purpose.
