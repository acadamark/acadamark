# Pipeline refactor plan

**Status:** Plan. Not yet implemented. This document is the design input for a
multi-slice refactor of the enscribe interpreter pipeline. It is the product of
the 2026-Q2 architecture audit (see `notes/audit-2026-Q2/`).

**Revision note:** This plan was revised after slice R1's Phase 0 investigation.
Phase 0 found that note numbering and equation/figure/table numbering are the
*same operation* implemented in two separate plugins. The original slice
breakdown would have produced an intermediate state with two distinct numbering
processes — which is the exact kind of fragmentation this refactor exists to
remove. The plan below is recut so that **numbering is unified into a single
stage in one slice**, and no intermediate state ever has more than one numbering
process.

**Sequencing:** This refactor is Tier 2 of the post-audit work. Tier 1 (small,
independent AUD fixes) is complete. The refactor proper is done as the slices
described in section 6. Tier 3 fixes (the AUD findings this refactor absorbs or
reshapes) are folded into the relevant slices, never fixed separately
beforehand.

---

## 1. Why

The interpreter pipeline works and is well-tested, but it accreted slice by
slice. `notes/interpreter.md` describes it honestly as ten mdast plugins in a
chain, grouped retrospectively into "three phases." The audit found that the
phase model does not match the real structure, and that the same kind of
problem recurs at several levels:

- The "three phases" are not phases. There is **one mandatory prefix** (tree
  shaping) and, after it, **four mutually independent strands** (config,
  cross-references, citations, notes). The strands are interleaved in run
  order for no reason the dependency graph can see.
- `enscribeLibraryLoad` is registered as a pipeline plugin — a tree pass —
  but it mutates no tree. It builds an index (`file.data.enscribeCitations`).
  It is an index build masquerading as a transformation.
- Cross-reference handling currently uses several independent tree walks.
  The same non-standard traversal of `enscribeTag.content` arrays is
  hand-rolled in at least three plugins, because `unist-util-visit` only
  follows `.children`.
- **Numbering is fragmented.** `numbering.js` assigns numbers to equations,
  figures, and tables. `notes.js` separately assigns numbers to notes. These
  are the same operation — "assign sequential numbers to elements of a type" —
  implemented twice, in two plugins, because each was added by a different
  slice. There should be exactly one numbering.
- The registry (`lib/registry.js`) is clean and well-built, but its `assign()`
  method **fuses discovery and numbering**: recording an entry and assigning
  its sequential number happen in the same call.

None of this is tangle. It is **fusion and fragmentation** — steps that should
be separable got combined, and one operation got scattered across plugins.
Both are the cheap kind of problem to fix: the result is less code, not more.

## 2. The principle

The interpreter is **shape, then index, then number, then resolve.**

1. **Shape.** One stage shapes the tree: recursive content parsing, article
   wrapping, section nesting. This is the only mandatory ordered prefix.
   Everything downstream assumes a shaped tree.

2. **Index.** One discovery walk records everything the document *defines or
   refers to* — sections, figures, tables, equations, notes, cross-references,
   citations — into the registry, in document order. Forward references are
   fine: discovery only records, it does not resolve. External inputs
   (`<data>`/`<library>`, `<config>`, `<meta>`) are indexed in the same
   conceptual stage — they are inputs the document refers to, not document
   content.

3. **Number.** Numbering is a **single stage**: one pass over the registry
   that numbers **every numbered type** — equations, figures, tables, notes,
   and any future numbered type — by handing out each type's own sequence in
   document order. It is not per-plugin work. There is exactly one numbering
   operation, owned by no individual plugin. A note and a figure are numbered
   by the identical mechanism, differing only in their `type` string.

4. **Resolve.** Resolution matches the recorded references against the
   now-numbered registry and the external indexes. It mostly does not walk the
   tree — discovery already collected the reference nodes; resolution iterates
   those collected nodes, looks each up, and replaces it.

After the discovery walk, nothing touches the tree shape until the compile
step; plugins only annotate nodes or replace reference nodes.

This replaces "ten plugins, three retrospective phases" with four named stages
and a clear rule for where any new feature belongs.

## 3. Target structure

```
shape(tree)                  one stage — recursive content, article wrap, section nesting
  │
indexInputs(tree, file)      config + data/library — build the external indexes
  │
discover(tree, registry)     ONE walk — record every defined/referring node
  │
numberRegistry(registry)     ONE stage — number every numbered type
  │
resolve(registry, indexes)   match references; replace ref/cite nodes
  │
compile                      toHast → asset injection → format → serialize  (unchanged)
```

The stages have clean contracts and own disjoint registry slices. That
disjointness is what makes eventual browser-side parallelism safe — but
parallelism is a later payoff, explicitly out of scope for this refactor.

**Numbering is a stage, not an errand.** No plugin numbers anything. Plugins
*register* elements (discovery) and *consume* numbers (annotation,
construction). `numbering.js`, in the target structure, is a discovery
contributor plus a consumer — it registers `$$`/`figure`/`table` nodes and
later reads their assigned numbers onto `node.computedNumber`. `notes.js` is
likewise a discovery contributor plus a consumer — it registers notes and
later reads their numbers to build markers. Neither assigns numbers. The
assignment happens once, in `numberRegistry`.

## 4. The registry change

`lib/registry.js` is clean and stays clean. Today `assign()` does:

```js
assign(type, providedId, { numbered = true, data = {} } = {}) {
  const t = ensure(type);
  t.sequence += 1;
  const number = numbered ? ++t.counter : null;   // <-- numbering, fused in
  const id = providedId || `${type}-${t.sequence}`;
  const entry = { type, id, number, numbered, data };
  ...
}
```

The change:

- **`assign()` becomes record-only.** It records the entry, generates an
  auto-id from the `sequence` counter if no id was provided, updates
  `labelIndex` for colon-ids, and returns the entry — but it does **not**
  assign a display number. The recorded entry has `number: undefined`
  (meaning "not yet numbered"), distinct from `null` (meaning "registered and
  deliberately unnumbered", set later by the numbering stage for
  `numbered: false` entries). Confirm downstream code tolerates the
  `undefined` interim state; if the `undefined`/`null` distinction proves
  awkward, document the chosen representation.
- The per-type **`sequence`** counter (auto-id generation) **stays** in
  `assign()` — id generation is part of recording. Only the **display-number**
  counter (`counter`) moves out.
- **Add `numberRegistry(registry)`** — a single function that numbers the
  whole registry. It iterates every type; for each type, it walks that type's
  entries in insertion order (= document order, since discovery records in
  order) and assigns sequential numbers to the `numbered` entries, leaving
  `number: null` on the un-numbered ones. **No type parameter** — it numbers
  everything. One call numbers equations, figures, tables, and notes together.

Net effect on `registry.js`: delete the counter increment from `assign`, add
`numberRegistry`. The registry gets simpler.

`numberRegistry` reads `entry.numbered` to decide whether an entry gets a
number. It does **not** evaluate numbering *policy* (the `+numbered`/`-numbered`
kwargs, config disable keys, defaults). That policy is computed by the
registering plugin and passed into `assign()` as the `numbered` option, exactly
as today. This refactor moves the *counting*, not the *policy decision*.

## 5. Relationship to AUD findings

**Absorbed — do NOT fix separately; the refactor handles them:**

- **AUD-09** (sections/code-blocks not referenceable). The current cause is
  that nothing calls `assign('section', ...)`. The discovery walk records
  sections like any other defined element, so `findByLabel('sec:...')`
  resolves for free. Done in the discovery slice (R2).

**Reshaped — fold into the relevant slice, do not fix beforehand:**

- **AUD-13** (`<config>` accepts metadata kwargs silently). `config-discovery`
  is part of `indexInputs`. Add the validation when that stage is touched.
- **AUD-14** (citations/rich content in `caption="..."` not parsed). The
  DD-1/DD-2 caption-as-content work. Cleaner once shape/index/number/resolve
  is in place.

**Independent — Tier 1, already complete:** AUD-16, AUD-01, AUD-12.

**Parser-side, sequence after the refactor:** AUD-08, AUD-15.

## 6. Slice breakdown

Each slice ends with the full test suite green and is the same
investigation-first, end-green discipline used throughout the project.

### Slice R1 — Unify numbering into a single stage

**This is the corrected R1.** The original R1 was scoped as "split `assign()`
and fix `numbering.js`." Phase 0 revealed that `notes.js` also numbers, and
that note numbering and figure numbering are one operation. R1 is therefore
recut: it unifies numbering, end to end, in one slice. No intermediate state
has two numbering processes.

**Scope:** `lib/registry.js`, `numbering.js`, `notes.js`, and the pipeline
assembly point where the numbering stage is invoked.

**The work:**

1. **`registry.js`:** `assign()` becomes record-only; add
   `numberRegistry(registry)` (type-agnostic, numbers all types). Per
   section 4.

2. **Introduce the numbering stage.** `numberRegistry(registry)` is called
   **once**, as a distinct step, after the plugins that register numbered
   elements have run and before the plugins that consume numbers need them.
   In the current (pre-R2) pipeline the registering work still happens inside
   `numbering.js`'s and `notes.js`'s own tree walks — that is fine for R1; the
   *single shared discovery walk* is R2. What R1 establishes is that the
   *numbering itself* is one call, not two. Determine the cleanest place to
   invoke it given the current plugin order (it must run after both
   `numbering.js` and `notes.js` have registered their elements, and before
   anything consumes numbers). Document the choice.

3. **`numbering.js` becomes a pure consumer.** It still walks the tree and
   calls `assign()` to register `$$`/`figure`/`table` nodes (record-only now).
   It no longer assigns numbers. After the numbering stage has run, it reads
   `entry.number` onto `node.computedNumber`. Concretely: during its walk it
   keeps `(node, entry)` associations; after `numberRegistry` runs it replays
   them to set `computedNumber`. The entry objects are stable references in
   the registry, so holding the reference is sufficient — no array-index
   bookkeeping.

4. **`notes.js` becomes a pure consumer.** It still walks the tree and calls
   `assign('note', ...)` to register notes (record-only now). It no longer
   assigns numbers. The note marker's number and its `noteref-${number}`
   anchor id are filled in **after** the numbering stage runs. Structure
   notes.js as: (a) a collect walk that registers each note, creates the
   `__note-marker` node and splices it into the tree, and keeps a **direct
   object reference** to each marker and each pending note-list-item; (b) the
   numbering stage runs; (c) a fill step that walks the held references and
   sets `number` and `refId` on each marker and list-item. The marker is not
   "built wrong then patched" — its number field is simply unfilled until step
   (c), and the notes pass is not complete until (c) has run. Use object
   references, never array indices, for the fill step.

**Why `notes.js` and `numbering.js` are symmetrical after R1:** both register
elements and both consume numbers; neither numbers anything. They differ only
in *what they build from the numbers* — `numbering.js` annotates an existing
node, `notes.js` constructs marker nodes. That asymmetry is real and fine. The
numbering itself is identical and now lives in one place.

**Phase 0:** Largely done already (the investigation that triggered this
revision). The known call sites of `assign()` are `numbering.js` and
`notes.js`; both read `entry.number` synchronously today. Confirm no handler
or other plugin also calls `assign()`. Confirm whether any test depends on
`assign()` returning a populated `number` synchronously — test files may need
updating, and that is in scope for R1.

**End state:** All tests pass. `numberRegistry` is the single numbering
operation. `numbering.js` and `notes.js` both number nothing — they register
and consume. **No rendered output changes** — every equation, figure, table,
and note gets the identical number it got before. The fixture HTML `git diff`
must be empty.

### Slice R2 — Introduce the single discovery walk; migrate the cross-reference strand

**Scope:** new discovery module; migrate `numbering.js`'s and
`ref-resolution.js`'s tree-walking onto it.

- Write the shared discovery walk: one traversal that handles both
  `enscribeTag.content` arrays and mdast `.children`, recording nodes into the
  registry by type. This consolidates the hand-rolled walkers.
- `numbering.js`'s registration half moves onto the shared walk. After R1 it is
  already a pure consumer; after R2 it no longer walks the tree itself — it
  just consumes. AUD-09 (section registration) is done here: the discovery
  walk records sections.
- `ref-resolution.js`: resolution iterates collected `<ref>` nodes instead of
  walking.

**Phase 0 — REQUIRED before implementation.** The discovery walk's shape
depends on code not yet read at audit level: how `notes.js`,
`section-nesting.js`, and `recursive-content.js` currently walk `.content`
arrays. Read those first; design the registration interface from the real
code.

**End state:** All tests pass. Cross-references resolve via discovery → number
→ resolve. One old walker deleted. AUD-09 fixed.

### Slice R3 — Migrate the remaining strands; delete old walkers

**Scope:** `notes.js`, `cite-resolution.js`.

- `notes.js`'s registration half moves onto the shared discovery walk; after
  R1 it is already a pure consumer, so this removes its private walk. Its
  collect step becomes part of the shared walk; its fill step remains.
- `cite-resolution.js` becomes discovery (collect `<cite>` nodes during the
  shared walk) + resolution (match against the citation index).
- Delete the now-unused hand-rolled walkers.

**End state:** All tests pass. One discovery walk for the whole document. The
triplicated-walker redundancy is gone.

### Slice R4 — Reclassify `libraryLoad` as index-build

**Scope:** `library-load.js`, pipeline assembly in `index.js`.

- `libraryLoad` stops being a mid-chain pipeline plugin and becomes part of the
  `indexInputs` stage, conceptually alongside `config-discovery`.
- Confirm the always-renders property: a failed `<library src=...>` produces a
  missing index entry, never a thrown exception.

**End state:** All tests pass. The pipeline reads as the four-stage structure
of section 3.

### After R1–R4

- Tier 3 reshaped fixes (AUD-13, AUD-14) are folded in where they belong.
- The `@`-sigil cross-reference redesign
  (`notes/at-sigil-reference-proposal.md`) becomes cheaper — "resolution
  matches references against indexes" is one mechanism whether the index is
  the document's registry or the external citation library.
- Parser-side AUD-08 / AUD-15 can be sequenced.
- The client-side rebuild (DD-5) has the clean foundation it needs.
- `interpreter.md` and `pipeline.md` are updated to describe the four-stage
  structure.

## 7. What this refactor is NOT

- Not a rewrite. `registry.js` is kept and barely changed. Handlers are
  untouched. The compile step is untouched. The parser is untouched.
- Not parallelism work. Disjoint registry slices make parallelism *safe to add
  later*; adding it is out of scope.
- Not a handler-internals review. The individual handler functions have not
  been read at code level; that is a separate future investigation and does
  not block this refactor (except R2's Phase 0, which reads the walkers).

## 8. Cross-references

- `notes/interpreter.md` — current interpreter architecture (pre-refactor).
- `notes/pipeline.md` — current full data flow (pre-refactor).
- `notes/audit-2026-Q2/` — the audit that produced this plan.
- `archive/audit-findings-2026-05.md` — the AUD findings referenced in section 5 (archived 2026-05-23; open items are now in `notes/enscribe-backlog-roadmap.md`).
- `notes/at-sigil-reference-proposal.md` — the cross-reference sigil redesign
  that becomes cheaper after this refactor.
- `lib/registry.js` — the registry; the `assign()` split and `numberRegistry`
  are slice R1.

When R1–R4 are complete, `interpreter.md` and `pipeline.md` must be updated to
describe the four-stage structure; until then they correctly describe the
pre-refactor pipeline.
