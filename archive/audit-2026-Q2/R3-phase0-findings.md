# R3 Phase 0 findings — notes re-architecture investigation

**Date:** 2026-05-22  
**Purpose:** Design input for the R3 implementation prompt. Read-only investigation of
`notes.js` and supporting machinery. No code, tests, or documents were modified.

**Files read at code level:**
- `packages/acadamark-interpreter/src/plugins/notes.js`
- `packages/acadamark-interpreter/src/plugins/ref-resolution.js`
- `packages/acadamark-interpreter/src/plugins/cite-resolution.js`
- `packages/acadamark-interpreter/src/index.js`
- `packages/acadamark-interpreter/src/lib/registry.js`
- `packages/acadamark-interpreter/src/lib/discover.js` (R2 output)
- `packages/acadamark-interpreter/src/handlers/notes.js`
- `packages/acadamark-interpreter/test/plugins/notes.test.js`
- `packages/layer1-vocabulary/elements/note.md`
- `notes/interpreter.md`, `notes/pipeline.md`
- `notes/pipeline-refactor-plan.md`, `notes/pipeline-refactor-plan-amendment.md`
- `notes/audit-2026-Q2/R2-phase0-findings.md`
- Integration fixtures: `test/fixtures/document-{2,5,6,9}-*.acm`

---

## 1. What does the notes plugin currently do, step by step?

### 1.1 Pipeline position

`acadamarkNotes` is step 6 of 11. At this point the tree looks like:
```
root → article → [article-front, article-body, article-back]
```
All note content is already parsed into mdast node arrays by `remarkRecursiveContent`
(step 1). `<note>.content` is an array of mdast/acadamarkTag nodes, not a raw string.

### 1.2 `walkAndReplace` (notes.js lines 56–78)

Iterative while-loop. For each `<note>` node encountered:

```js
if (isAcadamarkTag(node, 'note')) {
  const replacements = processNote(node);
  nodes.splice(i, 1, ...replacements);  // in-place: splice note out, marker in
  i += replacements.length;
}
```

Recurses into:
- `acadamarkTag.content` (no `isOpaqueContent` check — same gap as numbering's old `walkAndCollect`)
- `node.children` (mdast children: paragraphs, blockquotes, etc.)

Result: every `<note>` node in the tree is replaced with `[markerNode]`. After this
function returns, no `<note>` nodes remain in the main tree anywhere.

### 1.3 `processNote` (notes.js lines 143–174)

Called for each `<note>` node. Performs three things simultaneously:

**a. Registration:**
```js
const placement = notePlacement(node);  // 'end' | 'foot' | 'side'
const entry = registry.assign('note', node.id || null, { numbered: true, data: { placement } });
```
Registers the note with `numbered: true`, so notes get sequential display numbers from
`numberRegistry()`. The `entry.number` is `undefined` at this point — it is not set until
`numberRegistry()` runs at step 8.

**b. Marker creation:**
```js
const markerNode = {
  type: 'acadamarkTag',
  tagname: '__note-marker',
  id: null,
  kwargs: { noteId, number: undefined, refId: undefined },
  content: [],
  ...
};
```
The marker carries `number: undefined` and `refId: undefined` — both are filled in later
by `fillNotes` once `numberRegistry()` has run. The marker goes into the tree in place of
the `<note>` node.

**c. Content extraction into pendingNotes:**
```js
pendingNotes.push({
  markerNode,           // the node already spliced into the tree
  entry,                // the registry entry (number still undefined)
  placement,            // 'end' | 'foot' | 'side'
  sidenote: placement === 'side',
  content: Array.isArray(node.content) ? [...node.content] : [],
});
```
The `content` field is a **shallow copy** of `node.content` — the individual child node
objects are shared, not cloned. After this, the original `<note>` node is gone from the
tree; only the shallow copy in `pendingNotes` holds a reference to the content array.

### 1.4 `pendingNotes` shape

```js
{
  markerNode,     // __note-marker node in the tree; number/refId still undefined
  entry,          // registry entry { type: 'note', id, number: undefined, numbered: true, data: { placement } }
  placement,      // 'end' | 'foot' | 'side'
  sidenote,       // boolean (true iff placement === 'side')
  content,        // shallow copy of the <note>'s original content array
}
```

Stored in `file.data.acadamarkNotesPending` (line 179). Nothing outside `notes.js` reads
this directly — it is read only by `fillNotes`, which is called from `index.js`'s
`acadamarkApplyNumbers` step.

### 1.5 `fillNotes` (notes.js lines 193–250)

Called from `acadamarkApplyNumbers` (step 8), after `registry.numberRegistry()` has run.

**a. Fill marker number and refId:**
```js
for (const { markerNode, entry } of pending) {
  const number = entry.number;          // now a positive integer
  const refId = `noteref-${number}`;
  markerNode.kwargs.number = number;    // mutates the node already in the tree
  markerNode.kwargs.refId = refId;
}
```

**b. Build `__note-list-item` nodes:**
One per pending note. Each gets `{ number, refId, sidenote }` in `kwargs`, and the shallow
copy of the original note content as `.content`. The item's `id` is the registry entry id
(`node.id || 'note-N'`).

**c. Determine CSS class for `__note-list`:**
```
placements.size === 1 && only foot → 'footnotes'
placements.size === 1 && only end  → 'endnotes'
otherwise (mixed or side)          → 'notes'
```
All notes go into **one** `__note-list` regardless of individual placement modes. There is
no per-mode separate list.

**d. Build one `__note-list` and prepend to article-back:**
```js
back.content.unshift(noteList);  // before bibliography, etc.
```
Uses `findOrCreateArticleBack` (which calls `findDeep`) to locate or create the `article-back`
region.

### 1.6 `findDeep` (notes.js lines 82–96)

A recursive search for a node with a specific tagname in a node array. Searches both
`.content` and `.children`. Used exclusively by `findOrCreateArticleBack` — it is part of
the placement machinery (locating `article-back`), not part of the extraction machinery.

**After R3:** `findDeep` can be deleted or replaced by `findTag` from `ast-helpers.js`
(if that covers the same walk). Or kept as a private helper in whichever plugin does
placement. Check `findTag` before deciding.

### 1.7 How note numbers are assigned

Order is determined by `walkAndReplace`'s traversal order: pre-order DFS over the
authored tree (process `<note>`, then recurse into its siblings and children). This equals
document order. `registry.assign` is called in this order, so `numberRegistry()` later
assigns sequential numbers that match document position.

A note with `numbered: true` (all notes) gets a positive integer. There is currently no
mechanism to mark an individual note as unnumbered.

---

## 2. Display modes

### 2.1 Supported modes

Three modes: `end` (default), `foot`, `side`. Read from `node.kwargs?.placement ?? node.kwargs?.position ?? 'end'` (line 44–47). `position` is a legacy alias.

**The `notePlacement` function does NOT read from `file.data.acadamarkConfig`.** There
is no config key like `note-default-placement` that would let authors set a document-wide
default via `<config>`. The default `'end'` is hardcoded. This is a minor drift from the
vocabulary spec, which says "Document-wide default is 'end'" — the hardcoding is consistent
with the specified default, but the implication that a config-based override is possible is
not implemented. Record as a finding; do not fix in R3 without a separate design pass.

### 2.2 Placement behavior per mode

All three modes currently do **the same thing** at placement time: the note content lands
in `article-back` via `fillNotes`. The only differences are:

| Mode | CSS class on `__note-list` | `sidenote` flag on `__note-list-item` |
|------|---------------------------|---------------------------------------|
| `end` | `endnotes` (if all end) | `false` |
| `foot` | `footnotes` (if all foot) | `false` |
| `side` | `notes` (mixed or side) | `true` |

The `sidenote-fallback` class on the `<li>` element in the rendered HTML (from
`noteListItemHandler`) allows theme JS/CSS to extract and reposition sidenotes into
the margin. No inline side content (`__note-side`) is produced — that node type was
removed (per the header comment in notes.js).

### 2.3 Implications for deferred placement

Since all modes produce the same structural result (one `__note-list` in `article-back`),
deferred placement does not need to route notes to different tree locations. A single
`acadamarkNotePlacement` plugin handles all three modes uniformly. The mode distinction is
captured in the CSS class and `sidenote` flag, both of which can be computed at placement
time from `notePlacement(node)`.

---

## 3. What does "discover in place" require?

### 3.1 Registration during the discovery walk

The R3 discovery visit for a `<note>` node needs to:

```js
visitors.set('note', (node) => {
  const placement = notePlacement(node);
  const entry = registry.assign('note', node.id || null, { numbered: true, data: { placement } });
  pending.push({ node, entry });  // node stays in the tree; entry.number still undefined
});
```

The pending array stores `(node reference, entry)` — not a copy of content, not a marker.
The marker is not created until `acadamarkNotePlacement` runs.

### 3.2 Content is reached naturally

After the re-architecture, notes remain in the tree at their authored positions through
steps 6–10. The `discover()` walk recurses into acadamarkTag `.content` (guarded by
`!node.isOpaqueContent`). A `<note>` has `contentHandler: 'default'` and
`isOpaqueContent: false`, so `discover()` descends into its content automatically.
This means:

- `<ref>` nodes inside a `<note>` are visited in document order, at their authored positions.
- `<cite>` nodes inside a `<note>` are similarly visited.
- `<$$>` / `<figure>` / `<table>` nodes inside a `<note>` are visited and registered by
  numbering (in document order, interleaved with identical elements outside notes).

No extra logic is needed to reach note content. The removal of extraction is the full fix.

### 3.3 Does removing extraction remove the ordering problem entirely?

Yes, with one qualification.

The ordering problem (R2 findings §5) was: after step 6 (notes.js extraction), refs
inside notes were off the tree. No single walk point could see both all numbered elements
AND all refs. With notes in the tree, a single discovery walk at step 7 (after
`acadamarkNotes` registers but before `numberRegistry()` runs) sees everything.

**The qualification: numbered elements inside note content.** Currently, `walkAndCollect`
in numbering.js (before R2) walked into note content to find equations, figures, tables.
After R2, `discover()` does the same. If an equation is authored inside a note — unusual
but not invalid — it is registered in document order relative to equations outside notes.
This was true before R2 (walkAndCollect had no isOpaqueContent check, so it descended)
and remains true after R3 (discover() descends into note content).

There is no remaining reason a `<ref>` inside a `<note>` would be invisible to the
discovery walk. Removing extraction removes the problem entirely. Nothing else is lurking.

---

## 4. What does "defer placement to the end" require?

### 4.1 Proposed design: `acadamarkNotePlacement` as a late pipeline plugin

**Recommendation: Option A** — a new `acadamarkNotePlacement` plugin that runs after
cite-resolution and before bibliography (currently step 11).

Revised pipeline:
```
1.  remarkRecursiveContent       (unchanged)
2.  acadamarkConfigDiscovery     (unchanged)
3.  acadamarkArticleStructuring  (unchanged)
4.  acadamarkSectionNesting      (unchanged)
5.  acadamarkLibraryLoad         (unchanged)
6.  acadamarkNotes (revised)     — register only; no extraction; <note> stays in tree
7.  acadamarkNumbering           (unchanged, uses discover())
8.  acadamarkApplyNumbers        — numberRegistry() + fillNumbering(); NO fillNotes call
9.  acadamarkRefResolution       (unchanged in R3a; <ref> inside notes now visible)
10. acadamarkCiteResolution      (unchanged in R3a; <cite> inside notes now visible)
11. acadamarkNotePlacement (new) — splice markers, build __note-list in article-back
12. acadamarkBibliography        (unchanged; still step 11 in current numbering)
```

### 4.2 Between discovery and placement: tree state

Between steps 6 and 11, the tree contains `<note>` nodes at their authored positions.
They are live `acadamarkTag` nodes with `tagname: 'note'`, reachable by any tree walk.
Their content arrays hold the fully-parsed note body, including any `<ref>` nodes already
resolved to `__ref-marker`/`__ref-error` after step 9, and any `<cite>` nodes already
resolved after step 10.

`file.data.acadamarkNotesPending` holds `{ node, entry }` pairs in document order,
where `entry.number` is set after `numberRegistry()` at step 8.

Nothing else in the pipeline cares about the `<note>` nodes between steps 6 and 11.
The hast compiler at step 12+ never sees them (placement has already happened).

### 4.3 How `acadamarkNotePlacement` works

**Step A — Walk and splice markers:**

The placement plugin needs to replace each `<note>` node with `[markerNode]` in-place.
This requires a walk that provides the parent array reference — the same pattern as the
current `walkAndReplace` in notes.js, but now at placement time rather than extraction
time.

The cleanest approach: `acadamarkNotePlacement` uses a local `walkAndSplice` that is
structurally identical to the existing `walkAndReplace`, but with the `isOpaqueContent`
guard included (the gap from the current notes.js walkAndReplace). The walk locates
each `<note>` node, looks it up in a `Map<node, {entry, ...}>` built from
`acadamarkNotesPending`, creates the marker, and splices.

```js
// Build lookup map: note node object → pending record
const noteMap = new Map(pending.map(p => [p.node, p]));

// Walk: find <note> nodes, create markers, splice in place
walkAndSplice(tree.children, (noteNode) => {
  const p = noteMap.get(noteNode);
  // ... create __note-marker using p.entry.number (now set)
  return [markerNode];
});
```

This works because the `pending.node` references are the same objects as the `<note>`
nodes in the tree (no deep copy was made during registration). Map lookup by reference
equality is reliable.

**Step B — Build list items and inject note-list:**

After all markers are spliced in, build `__note-list-item` nodes from the pending records.
The content for each list item is now taken directly from the **still-live** `<note>.content`
array (which at this point has resolved refs and cites in it). No shallow copy needed;
the content can be moved directly to the list item's `.content`.

**Step C — Inject into article-back:**

Same as `fillNotes` currently: `findOrCreateArticleBack(tree.children)`, then
`back.content.unshift(noteList)`. The `findOrCreateArticleBack` / `findDeep` helper
can be copied to `acadamarkNotePlacement` or extracted to a shared helper.

### 4.4 The two-surface question: marker position vs. note-list position

A `<note>` rendered as a footnote appears in two places: a marker (`<sup>`) at the
authored position, and the note body (`<li>`) in the note-list. In the current design:
- The marker is created and spliced at step 6 (mid-pipeline)
- The note body is injected at step 8 (also mid-pipeline)

In the new design:
- The marker is created and spliced at step 11 (late)
- The note body is built and injected at step 11 (same moment, same function)

Both placements happen atomically at step 11. The `<note>` node exists at the authored
position until step 11, at which point it is replaced by the marker and its content is
used to build the list item. The lifecycle:

```
Before step 6:  <note> in body.content[i]            (authored)
After step 6:   <note> still in body.content[i]       (registered, unchanged)
After step 8:   <note> still in body.content[i]       (entry.number now set)
After step 9:   <note>.content[j] may now have __ref-marker instead of <ref>
After step 10:  <note>.content[k] may now have __cite-marker instead of <cite>
Step 11:        <note> spliced out; __note-marker spliced in at body.content[i]
                __note-list-item built from <note>.content (resolved content)
                __note-list injected into article-back.content[0]
After step 11:  no <note> nodes remain in the tree
```

This is cleaner than the current design — the extraction at step 6 is gone.

### 4.5 Option B: Placement at toHast time

The alternative would handle notes entirely within the hast compiler step (step 12+). The
`acadamarkTag` handler for `note` would generate a marker, accumulate list items, and
inject a note-list after all notes are processed. This is how LaTeX handles footnotes
(deferred to page-break time).

**Not recommended for R3.** Implementation requires either a two-pass compilation (once
to collect, once to render the list) or a mutable accumulator passed through the handler
chain. The hast conversion is currently stateless per-node; adding note accumulation state
would increase coupling and complicate testing. Option A (late pipeline plugin) keeps the
hast conversion stateless.

---

## 5. Migrating the three walkers onto `discover()`

### 5.1 `notes.js` after re-architecture

The revised `acadamarkNotes` becomes a pure register visitor — its whole job is:

```js
export function acadamarkNotes() {
  return (tree, file) => {
    const registry = ensureRegistry(file);
    const pending = [];
    discover(tree, new Map([
      ['note', (node) => {
        const placement = notePlacement(node);
        const entry = registry.assign('note', node.id || null, { numbered: true, data: { placement } });
        pending.push({ node, entry });
      }],
    ]));
    if (file?.data) file.data.acadamarkNotesPending = pending;
  };
}
```

This is the model from R2's `acadamarkNumbering`. No `walkAndReplace`, no `pendingNotes`
with `content` or `markerNode`. The `walkAndReplace` function in notes.js is deleted.
`findDeep` and `findOrCreateArticleBack` move to `acadamarkNotePlacement`.

### 5.2 `ref-resolution.js` after R3a (notes re-architecture only)

With notes no longer extracted, `ref-resolution.js`'s existing `walkAndReplace` works
correctly for refs inside notes without any migration. It will find `<ref>` nodes inside
`<note>.content` because notes are in the tree when ref-resolution runs (step 9).

**This means R3a can land without migrating ref-resolution.js at all.** The migration
(R3b) is code quality — removing the duplicated `walkAndReplace` — not correctness.

For a future R3b migration: the challenge is that `walkAndReplace` does 1-to-1 or 1-to-N
splice replacement, and `discover()` is read-only (no parent-array reference). Two options
for R3b:

- **Option B1 (recommended): shared `walkAndReplace` helper in `src/lib/`.** Create
  `src/lib/walk-replace.js` exporting `walkAndReplace(nodes, tagname, process)`. It uses
  the correct `!node.isOpaqueContent` guard (fixing the gap in notes.js and ref-resolution.js).
  All three replacement plugins use this helper; the three hand-rolled copies are deleted.
  This does NOT require changing `discover()`'s interface.

- **Option B2: in-place node mutation.** Replace `node.tagname`, `node.kwargs`, etc.
  in the visitor callback, avoiding the need for a parent-array reference. Works for 1-to-1
  replacements. Does not work for cite-resolution's mixed-case (1-to-2: one marker + one
  error node). Partial migration only.

- **Option B3: extend `discover()` with a `replace` callback.** The visitor signature
  becomes `(node, replace) => void` where `replace(newNodes)` performs the splice. This
  changes `discover()`'s interface, which would require updating all existing callers.
  Higher coupling. Not recommended.

### 5.3 `cite-resolution.js` after R3a

Same situation as ref-resolution.js: the existing `walkAndReplace` works correctly after
notes are no longer extracted. Migration to `discover()` is R3b, not R3a. The mixed case
(some keys found, some missing → 1-to-2 replacement) rules out simple in-place mutation
(Option B2 above). Option B1 (shared `walkAndReplace` helper) handles it cleanly.

### 5.4 Can all three migrate in R3, or should R3 be split?

**Split is recommended.** R3 should be cut into two sub-slices:

- **R3a — Notes re-architecture (correctness fix):**
  - Revise `acadamarkNotes` to use `discover()` for registration only; delete its `walkAndReplace`
  - Add `acadamarkNotePlacement` plugin (new, after cite-resolution)
  - Remove `fillNotes` export from notes.js
  - Remove `fillNotes` call from `acadamarkApplyNumbers` in index.js
  - Add unit tests: (a) `<ref>` inside `<note>` content resolves, (b) `<cite>` inside `<note>` content resolves
  - Correctness proof: empty fixture diff

- **R3b — Shared walkAndReplace helper + walker cleanups (code quality):**
  - Create `src/lib/walk-replace.js` with a single correct walkAndReplace
  - Migrate `ref-resolution.js`, `cite-resolution.js`, and `acadamarkNotePlacement` to use it
  - Delete the three hand-rolled copies
  - No correctness change; proof is unchanged test suite + empty fixture diff

R3a is the necessary slice. R3b is a cleanup that can be done independently, and its
design (what exactly the shared helper's interface is) can be decided separately.

### 5.5 After full migration: what is deleted

- `notes.js`: `walkAndReplace` function (lines 56–78), `processNote` inner function,
  `pendingNotes` array with `content`/`markerNode` fields, `findDeep` function, `findOrCreateArticleBack` function (moved to `acadamarkNotePlacement`), `fillNotes` export.
- `ref-resolution.js` (R3b): `walkAndReplace` function (lines 79–100).
- `cite-resolution.js` (R3b): `walkAndReplace` function (lines 121–143).
- `index.js`: `fillNotes` import, `fillNotes(tree, file)` call in `acadamarkApplyNumbers`.

Nothing outside these files reads `pendingNotes`, `fillNotes`, or the three
`walkAndReplace` locals (they are not exported). Confirmed by grep:
`acadamarkNotesPending` appears only in `notes.js` (lines 25, 28, 179, 194).
`fillNotes` appears only in `notes.js` (exported) and `index.js` (imported and called,
lines 66 and 349).

---

## 6. The correctness proof for R3

### 6.1 Will R3a change the final rendered HTML?

For all existing fixtures: **no.** The final HTML should be identical, and the empty
fixture diff proof still works for R3a.

The argument: `acadamarkNotePlacement` produces exactly the same `__note-marker`,
`__note-list-item`, and `__note-list` nodes as `fillNotes` currently produces, in the same
tree positions (markers at authored positions, `__note-list` prepended to `article-back`).
The handlers in `src/handlers/notes.js` are unchanged — they render these internal nodes
to hast identically.

The one subtle difference: in the current design, `fillNotes` sets
`markerNode.kwargs.number` on a node that is **already in the tree**. In the new design,
the marker is created fresh at placement time with the number already known. The resulting
node is identical in structure; the order of operations (set now vs. set at placement)
produces the same final object.

**One potential output difference to watch for: citation ordering inside notes.**

Currently, citations are processed at step 10 (cite-resolution) in their positions
**after** `fillNotes` has reinstalled note content into `article-back`. The walk order is:
`article-front` → `article-body` (inline cites) → `article-back` (note-embedded cites).
Inline cites are always processed before note-embedded cites, regardless of authored order.

After R3a, `<cite>` nodes inside notes are in `article-body` (inside `<note>.content`)
when cite-resolution runs. If a note appears before an inline citation in the document,
the note's cite gets the first-cited slot. This is **a behavior change for documents that
cite inside notes** — but it is a correctness improvement (proper document order).

No existing fixture has `<cite>` inside `<note>` content. The empty fixture diff proof
holds. But R3a should explicitly add a test for cite-inside-note, both to verify the new
behavior and to prevent future regression.

### 6.2 New tests R3a requires

At minimum, these unit tests are needed before R3a lands:

1. **`<ref>` inside `<note>` content resolves.** Create a tree with a `<note>` whose
   content includes a `<ref #eqn:newton>`. Run the full pipeline through
   `acadamarkRefResolution`. Verify the ref is replaced with `__ref-marker`, not
   `__ref-error`. Currently untested by any unit test or fixture (confirmed: no fixture has
   a `<ref>` inside a `<note>` body; the fixture doc-6 has `<ref #note:galton>` which
   targets a note, not a ref inside one).

2. **`<cite>` inside `<note>` content resolves.** Similar to (1) but for cite-resolution.
   Currently also untested (confirmed: no fixture has `<cite>` inside a note body).

3. **Note placement in document order: deferred-placement produces same structure as
   current extraction.** Run the revised pipeline on a document with multiple notes
   (end, foot, side). Verify the `__note-list` in `article-back` has the same structure
   as the current pipeline produces. This is the integration correctness test for R3a.

4. **`<ref>` inside `<note>` targeting another note.** A note contains a cross-reference
   to a different note: `<note | See also note <ref #note:galton>. >`. Verify both
   registration and resolution work.

### 6.3 What the correctness proof looks like

**Primary:** Run the full integration suite (`node test/run.js`) — all 22/22 suites must
pass, including the new tests above.

**Secondary:** Render all fixtures (`node test/render-fixtures.js`) and check that
`git diff test/fixtures/` is empty. R3a should not change any rendered output for existing
documents.

**Tertiary (if in doubt):** Add a fixture document that has refs and cites inside notes
(doc-10 or an addition to doc-6). Render it before and after R3a. If the rendered HTML
is identical, the re-architecture is correct.

---

## 7. Migration risk

### 7.1 Riskiest part: the `walkAndSplice` in `acadamarkNotePlacement`

The new placement plugin needs to walk the tree and splice `<note>` nodes out, replacing
them with markers. This is structurally the same as the current `walkAndReplace` in
notes.js — the implementation is not new logic, just moved timing.

The risk: if `acadamarkNotePlacement`'s walk has different traversal behavior than the
current `walkAndReplace`, notes may be visited in a different order, producing different
numbering. Since `acadamarkNotes` (revised) now registers notes via `discover()` in
document order, the pending array is in document order. `acadamarkNotePlacement` iterates
`pending` in order to build list items. As long as list items are built in insertion order,
note numbering in the list matches the markers.

Mitigation: make `acadamarkNotePlacement` iterate `pending` (already in document order)
rather than re-walking the tree to collect notes in order. The walk is only needed for
splicing (finding each note node in the tree and replacing it); the order for list-building
comes from `pending`.

### 7.2 `acadamarkApplyNumbers` change

Removing the `fillNotes(tree, file)` call from `acadamarkApplyNumbers` (index.js line 349)
and the `fillNotes` import (line 66) is a mechanical change. The only risk is forgetting
it and leaving a stale call that tries to read `acadamarkNotesPending` with the new shape
(which no longer has `content` or `markerNode` fields). Tests will catch this if the
pending shape changes.

### 7.3 What reads `pendingNotes` / `file.data` keys

Full grep results for `acadamarkNotesPending`:
- `notes.js` lines 25, 28 (comments), 179 (write), 194 (read)
- No other file reads it

Full grep results for `fillNotes`:
- `notes.js` line 193 (definition)
- `index.js` line 66 (import), line 349 (call)

**Nothing outside `notes.js` and `index.js` uses these.** The removal is contained.

### 7.4 Ordering dependencies that change

**Numbering of elements inside note content.** Currently, `walkAndCollect` (before R2) /
`discover()` (after R2) runs at step 7, which is AFTER notes.js has extracted the notes
(step 6). After R3a, notes are in the tree when the discovery walk runs at step 7 — so
numbered elements inside note content are now registered in document order (interleaved
with elements outside notes). For existing fixtures this is not observable (no fixture has
equations/figures inside notes). But it is a behavior change in principle.

**Citation first-cited order.** As noted in §6.1: currently inline cites are processed
before note-embedded cites; after R3a, cites are processed in document order. For existing
fixtures, no change. For new documents, this is a correctness improvement.

### 7.5 Existing note-related tests

From `test/plugins/notes.test.js` — all 13 tests assert on **final output** (marker
structure, list structure, numbering, ids), not on mid-pipeline state (pendingNotes
contents, etc.). They use the pattern:

```js
acadamarkNotes()(tree, file);
ensureRegistry(file).numberRegistry();
fillNotes(tree, file);
// assert on tree structure
```

After R3a, the corresponding pattern becomes:
```js
acadamarkNotes()(tree, file);          // revised: register-only
ensureRegistry(file).numberRegistry();
acadamarkNotePlacement()(tree, file);  // new: splice + build note-list
// assert on same tree structure
```

The assertions themselves do not change. The test helper sequence changes. This is a
minor update to test/plugins/notes.test.js — all 13 tests remain valid, they just need
the `fillNotes` call replaced with `acadamarkNotePlacement()()`.

No test currently asserts on mid-pipeline state (no test checks `pendingNotes` fields
directly, or checks that the `<note>` is absent from the tree immediately after
`acadamarkNotes()()` runs). So there are no "mid-pipeline structure" tests that would
fail under the new design for the wrong reason.

---

## Notable findings

### F1 — No test for `<ref>` or `<cite>` inside `<note>` content

Confirmed across all sources:
- No unit test in `test/plugins/notes.test.js` or `test/plugins/ref-resolution.test.js`
- No fixture document has a `<ref>` inside a `<note>` body
- No fixture document has a `<cite>` inside a `<note>` body
- Document-6 has `<ref #note:galton>` (ref *targeting* a note) and `<note #note:galton | ...>` (a labeled note)

The current behavior (refs inside notes resolve correctly, after `fillNotes` reinstalls the content) is tested only implicitly by the integration suite — and only for refs targeting notes, not refs inside note bodies. R3a must explicitly add these tests before landing.

### F2 — `notePlacement` ignores `acadamarkConfig`

`notePlacement` (notes.js lines 44–47) reads only `node.kwargs?.placement ?? node.kwargs?.position ?? 'end'`. The `file.data.acadamarkConfig` map is never consulted. Authors cannot set a document-wide note placement default via `<config note-placement=foot>`. The vocabulary spec (note.md line 20) says "Document-wide default is 'end'" — which is true, but only because it is hardcoded. This implies config-based override is possible, but it is not implemented.

This is a pre-existing gap, not introduced by R3. Record it; do not fix it in R3 without a separate design pass.

### F3 — All three modes produce one list in article-back

The placement modes do not produce separate lists. A document with three endnotes and two footnotes produces ONE `__note-list` with class `notes` (the mixed fallback). If authors or themes want per-mode separate lists (footnotes at page-bottom, endnotes at document-end), the current design does not support this. Out of scope for R3 but worth flagging for the vocabulary layer.

### F4 — `__note-side` was removed (no inline side content)

The current notes.js explicitly comments: `__note-side is removed`. The sidenote mode used to produce an inline `__note-side` element at the authored position; this was removed, and now sidenotes work like endnotes but with a `sidenote-fallback` CSS marker. The R3 design does not re-introduce `__note-side`. R3 preserves current behavior.

### F5 — Shallow copy in `pendingNotes.content` is a potential stale-reference trap

The current `processNote` does `content: [...node.content]`. This creates a new array but the individual child nodes are the same objects. After `fillNotes`, these objects become `__note-list-item.content`. If ref-resolution (step 9) had modified these objects before `fillNotes` ran, the modifications would be visible. In the current pipeline, ref-resolution runs AFTER `fillNotes`, so it modifies the objects in their final positions in `article-back`. This is fine.

After R3a, no shallow copy is needed (content stays in the original `<note>` node). The stale-reference risk is eliminated.

### F6 — `findTag` in ast-helpers.js vs. `findDeep` in notes.js

notes.js has its own `findDeep` (lines 82–96). There is also `findTag` in `ast-helpers.js`. It is worth checking whether `findTag` covers the same ground as `findDeep` before deciding whether to keep `findDeep` in `acadamarkNotePlacement` or replace it with the shared helper. The R3a implementer should check this before copying `findDeep`.

### F7 — `walkAndReplace` in notes.js lacks `isOpaqueContent` guard

Like the old `walkAndCollect` in numbering.js (deleted in R2), `walkAndReplace` in notes.js recurses into acadamarkTag `.content` without checking `isOpaqueContent`. In the new design, `discover()` is used for registration (and has the guard), and `acadamarkNotePlacement`'s placement walk should add the guard. R3a is the opportunity to add it; R3b makes it consistent across the remaining walkers.

---

## Recommended R3 scope

**Split into R3a and R3b. R3a is the necessary slice.**

### R3a — Notes re-architecture (recommended next slice)

Scope:
1. Revise `acadamarkNotes` to use `discover()` for registration only; delete `walkAndReplace`,
   `processNote`, and the `content`/`markerNode` fields from `pendingNotes`.
2. Create `acadamarkNotePlacement` (new plugin, step 11). Handles splice + list build + article-back injection. Use the current `fillNotes` logic as the starting point, but replace the `pendingNotes.content` reference with a live read from the `<note>` node's `.content` (which now has resolved refs/cites).
3. Remove `fillNotes` export from notes.js.
4. Update `acadamarkApplyNumbers` in index.js: remove `fillNotes` import and call. Add
   `acadamarkNotePlacement` to the plugin chain after `acadamarkCiteResolution`.
5. Add tests: (a) `<ref>` inside `<note>` resolves, (b) `<cite>` inside `<note>` resolves, (c) deferred-placement produces correct structure for all three modes.
6. Update existing notes.test.js: replace `fillNotes(tree, file)` with `acadamarkNotePlacement()(tree, file)` in the test helper sequence (13 tests, mechanical change).
7. Check `findTag` in ast-helpers.js vs. `findDeep` in notes.js; decide whether to consolidate.

End state: notes discovered in place, placed at the end. `<ref>` and `<cite>` inside notes resolved naturally. fillNotes machinery gone. Correctness proof: empty fixture diff.

**Risk: low-to-medium.** The re-architecture is mechanical — the same logic runs later. The test suite covers all three placement modes and the note-list structure. The main new risk is the integration of deferred placement with the resolution of refs/cites inside notes, which is why the new tests are essential.

### R3b — Walker cleanup (optional follow-on)

Scope:
1. Create `src/lib/walk-replace.js` with a single `walkAndReplace(nodes, tagname, process)` that includes the `isOpaqueContent` guard.
2. Migrate `ref-resolution.js`, `cite-resolution.js`, and `acadamarkNotePlacement` to use it.
3. Delete the three hand-rolled copies.

End state: one `walkAndReplace` helper, correctly guarded. The three replacement plugins are simpler. No correctness change. Correctness proof: unchanged test suite + empty fixture diff.

**Risk: low.** The change is mechanical, well-tested, and produces no output change.

### Why not one slice

The amendment calls R3 "one slice." Based on the code analysis, the key reason to split is that the walker migrations (R3b) require a design decision — shared helper vs. discover() extension — that is independent of the notes re-architecture (R3a). Bundling them forces that decision to be made in the same pass as the correctness fix. The notes re-architecture is already the highest-risk part of R3; adding unresolved interface questions to the same slice raises the risk of an overlong slice that has to be cut or abandoned mid-way.

R3a and R3b have independent correctness proofs (empty fixture diff for each). They share no entangled code paths. The natural seam between them is: R3a removes `fillNotes`; R3b removes the three `walkAndReplace` copies. These are separate, non-overlapping changes.

The R1 lesson applies: the R1 mistake was attempting numbering + refs in one slice without a Phase 0 that found the ordering problem. Phase 0 for R3 finds exactly the same structural issue: the walker migrations (R3b) depend on a design decision not yet made, and that decision should be made after R3a lands cleanly.

If the team decides R3 should remain one slice, the R3b part is tractable as Option B1 (shared `walkAndReplace` helper) — it is the most conservative approach, requires no interface changes to `discover()`, and is fully independent of the notes re-architecture.
