# R2 Phase 0 findings — discovery walk investigation

**Date:** 2026-05-22  
**Purpose:** Design input for the R2 implementation prompt. Read-only investigation of the
five walker files and supporting context. No code, tests, or documents were modified.

**Files read at code level:**
- `packages/acadamark-interpreter/src/plugins/numbering.js`
- `packages/acadamark-interpreter/src/plugins/notes.js`
- `packages/acadamark-interpreter/src/plugins/ref-resolution.js`
- `packages/acadamark-interpreter/src/plugins/cite-resolution.js` (R3, but read for pattern completeness)
- `packages/remark-acadamark/src/recursive-content.js`
- `packages/acadamark-interpreter/src/plugins/section-nesting.js`
- `packages/acadamark-interpreter/src/lib/registry.js`
- `packages/acadamark-interpreter/src/lib/ast-helpers.js`
- `packages/acadamark-interpreter/src/index.js` (pipeline assembly)
- `notes/pipeline-refactor-plan.md`

---

## 1. How does each walker traverse?

### 1.1 `numbering.js` — `walkAndCollect` (lines 64–88)

**Pattern:** Recursive helper function with `for...of` loop. Calls itself on child arrays.

```js
function walkAndCollect(nodes, registry, config, pending) {
  if (!Array.isArray(nodes)) return;
  for (const node of nodes) {
    if (isAcadamarkTag(node)) {
      const registryType = NUMBERED_TAGNAMES.get(node.tagname);
      if (registryType) { /* register + push to pending */ }
      if (Array.isArray(node.content)) {
        walkAndCollect(node.content, registry, config, pending);   // .content descent
      }
    }
    if (node.children && Array.isArray(node.children)) {
      walkAndCollect(node.children, registry, config, pending);    // .children descent
    }
  }
}
```

Entry point: `walkAndCollect(tree.children, ...)`.

- **Walks:** `.content` (if `isAcadamarkTag`) AND `.children` (always if present, even on non-tag nodes).
- **Target types:** `$$`, `figure`, `table` — matched via `NUMBERED_TAGNAMES` Map.
- **Mutation:** None during walk. Pushes `{ node, entry }` to `pending` array. Calls `registry.assign()` to record each match.
- **`isOpaqueContent` check:** Absent. Recurses into `.content` of any acadamarkTag regardless of handler type.
- **Traversal order:** Pre-order DFS (process node, then recurse) = document order. ✓

### 1.2 `notes.js` — `walkAndReplace` (lines 56–78)

**Pattern:** Iterative `while` loop with in-place splice.

```js
function walkAndReplace(nodes, processNote) {
  let i = 0;
  while (i < nodes.length) {
    const node = nodes[i];
    if (isAcadamarkTag(node, 'note')) {
      const replacements = processNote(node);
      nodes.splice(i, 1, ...replacements);    // mutates in-place
      i += replacements.length;
    } else {
      if (isAcadamarkTag(node) && Array.isArray(node.content)) {
        walkAndReplace(node.content, processNote);
      }
      if (node.children && Array.isArray(node.children)) {
        walkAndReplace(node.children, processNote);
      }
      i++;
    }
  }
}
```

Entry point: `walkAndReplace(tree.children, processNote)`.

- **Walks:** `.content` (if `isAcadamarkTag`) AND `.children` (always if present).
- **Target type:** `note`. Each `<note>` is replaced 1:1 with `[markerNode]`.
- **Mutation:** Splices `[markerNode]` over the `<note>` node in-place. Tree is modified.
- **`isOpaqueContent` check:** Absent. Same gap as numbering.js.

Secondary helpers: `findDeep(nodes, tagname)` (lines 82–96) for article-back discovery — also walks both `.content` and `.children` recursively.

### 1.3 `ref-resolution.js` — `walkAndReplace` (lines 79–100)

**Pattern:** Iterative `while` loop with in-place splice. Structurally identical to notes.js.

```js
function walkAndReplace(nodes, processRef) {
  let i = 0;
  while (i < nodes.length) {
    const node = nodes[i];
    if (isAcadamarkTag(node, 'ref')) {
      const replacements = processRef(node);
      nodes.splice(i, 1, ...replacements);
      i += replacements.length;
    } else {
      if (isAcadamarkTag(node) && Array.isArray(node.content)) {
        walkAndReplace(node.content, processRef);
      }
      if (node.children && Array.isArray(node.children)) {
        walkAndReplace(node.children, processRef);
      }
      i++;
    }
  }
}
```

Entry point: `walkAndReplace(tree.children, processRef)`.

- **Walks:** `.content` (if `isAcadamarkTag`) AND `.children` (always if present).
- **Target type:** `ref`. Each `<ref>` is replaced 1:1 with either `__ref-marker` or `__ref-error`.
- **Mutation:** Splices in-place.
- **`isOpaqueContent` check:** Absent. Same gap as notes.js.

### 1.4 `cite-resolution.js` — `walkAndReplace` (lines 121–143)

Structurally identical to notes.js and ref-resolution.js, with one exception:

```js
    // Recurse into non-opaque acadamarkTag content.
    if (isAcadamarkTag(node) && Array.isArray(node.content) && !node.isOpaqueContent) {
      walkAndReplace(node.content, processCite);
    }
```

- **Only cite-resolution checks `!node.isOpaqueContent`** before recursing into `.content`.
- All other walkers omit this check.

### 1.5 `section-nesting.js` — `walkAndNest` (lines 111–127)

**Pattern:** Iterative `for...of` loop. Structurally different from the others.

```js
function walkAndNest(nodes) {
  for (const node of nodes) {
    if (!isAcadamarkTag(node)) continue;
    const content = node.content;
    if (!content || !Array.isArray(content)) continue;

    const hasSections = content.some(n => sectionDepth(n) > 0);
    if (hasSections) {
      node.content = nestSectionArray(content);   // mutates .content
      // Does NOT recurse into the nested result
    } else {
      walkAndNest(content);                        // recurse only if no sections here
    }
  }
}
```

Entry point: `walkAndNest(tree.children ?? [])`.

- **Walks:** `.content` ONLY. Does NOT walk `.children`. Explicitly iterates only `isAcadamarkTag` nodes.
- **Target:** Content arrays that contain section-family nodes (`sectionDepth > 0`).
- **Mutation:** Replaces `node.content` with the output of `nestSectionArray`. Structural transformation.
- **Does NOT recurse into the nested sections** after nesting an array — `nestSectionArray` handles all depths in a single pass via its stack algorithm.
- **Rationale for `.children`-only skip:** By the time this runs, sections live inside `.content` arrays of acadamarkTag nodes (article-body, article-front, etc.), not in mdast `.children`. This is intentional and correct.

### 1.6 `recursive-content.js` — `processNodes` (uses `unist-util-visit`)

**Pattern:** Uses the standard `visit(subtree, 'acadamarkTag', visitor)` from `unist-util-visit`, not a hand-rolled content descent.

```js
function processNodes(subtree, processor, depth) {
  visit(subtree, 'acadamarkTag', (node) => {
    if (node.contentHandler !== 'default') return SKIP
    if (node.content === null) return SKIP
    // ...
    node.content = parseContent(node.content, processor)
    processNodes(
      { type: 'root', children: toChildren(node.content) },  // wrapper node
      processor,
      depth + 1,
    )
    return SKIP
  })
}
```

Entry point: `processNodes(tree, processor, 0)`.

- **Walk mechanism:** `visit()` finds `acadamarkTag` nodes via standard `.children` descent. For the newly-parsed `.content` arrays, recursion is triggered manually by creating a wrapper `{ type: 'root', children: toChildren(content) }` and calling `processNodes` on it.
- **Why the wrapper:** `visit()` follows `.children`, not `.content`. The wrapper lets the standard visitor find tags inside content arrays.
- **Target:** `acadamarkTag` nodes with `contentHandler === 'default'`. Skips math, opaque, null content.
- **Mutation:** Replaces `node.content` string with a parsed `Node[]` array.
- **Architecturally separate:** This is the "shape" step, not a discovery or resolution step. It runs before the discovery walkers and transforms the tree so that `.content` arrays exist for the other walkers to traverse.

---

## 2. Where is the traversal logic duplicated?

**Real duplication confirmed.** Three files contain nearly identical `walkAndReplace` functions:

| Feature | `notes.js` | `ref-resolution.js` | `cite-resolution.js` |
|---------|-----------|--------------------|--------------------|
| Pattern | `while` + splice | `while` + splice | `while` + splice |
| `.content` descent | `isAcadamarkTag(node)` | `isAcadamarkTag(node)` | `isAcadamarkTag(node) && !node.isOpaqueContent` |
| `.children` descent | `node.children && Array.isArray` | `node.children && Array.isArray` | `node.children && Array.isArray` |
| Target | `isAcadamarkTag(node, 'note')` | `isAcadamarkTag(node, 'ref')` | `isAcadamarkTag(node, 'cite')` |
| Replace with | `[markerNode]` (1:1) | `[markerNode]` or `[errorNode]` (1:1) | `[markerNode]` or `[errorNode]` (1:1) |

The bodies are copy-paste-identical except for the `isOpaqueContent` check in cite-resolution and the target tag name. Same algorithm, written three times.

`numbering.js`'s `walkAndCollect` is also duplicating the `.content`/`.children` descent logic, but in a different structural pattern (recursive, read-only, for-loop) rather than the iterative `walkAndReplace` pattern. It is a fourth variant, not a copy of the above three.

**No shared traversal helper exists.** The `lib/` directory contains `ast-helpers.js`, `bool-kwarg.js`, `errors.js`, and `registry.js`. None provides a general-purpose tree traversal. `ast-helpers.js` has `extractPlainText` (lines 71–82) which traverses both `.content` and `.children`, but it is narrowly scoped to text extraction and is not used by the walker plugins.

**Subtle differences between the three `walkAndReplace` copies:**

1. **`isOpaqueContent` guard:** Only `cite-resolution.js` checks `!node.isOpaqueContent` before recursing into `.content`. The others will recurse into DSL/opaque tag content (e.g., the body of a `<$$>` math block). In practice this is harmless post-`remarkRecursiveContent` — the plugin sets `isOpaqueContent = false` on all default-handler nodes — but for DSL-handler nodes (`contentHandler !== 'default'`), the notes/ref walkers will recurse into content that cite-resolution skips. This is a latent inconsistency, not a current bug.

2. **Guard ordering:** All three check the target-type branch before the descent branch, so the logic is equivalent for non-target nodes.

The shared discovery walk should follow the `cite-resolution.js` pattern and check `!node.isOpaqueContent`.

---

## 3. What does each walker collect or need?

### Cross-reference strand (R2's scope)

**`numbering.js` — what it registers:**
- Node types: `$$` (mapped to type `'equation'`), `figure` (mapped to `'figure'`), `table` (mapped to `'table'`).
- Identification: `NUMBERED_TAGNAMES.get(node.tagname)` — exact tagname match.
- For each match: calls `registry.assign(registryType, node.id || null, { numbered, data: {} })`.
- Stores `{ node, entry }` in `file.data.acadamarkNumberingPending`.
- Does NOT need parent position — just the node reference.
- **Document order is essential**: numbers are assigned by `numberRegistry()` in insertion order. `walkAndCollect`'s pre-order DFS guarantees document order. The discovery walk must preserve this.

**`ref-resolution.js` — what it finds:**
- Node type: `ref` (exact tagname match, `isAcadamarkTag(node, 'ref')`).
- Resolution uses `node.id ?? node.kwargs?.target` to look up the registry label index.
- Currently replaces in-place via splice. To eliminate the tree walk, resolution needs to iterate collected ref nodes. For in-place splice, it needs `(node, parentArray, index)` — or else use a different replacement strategy (see §5).

**Does either need position beyond document order?**
- `numbering.js`: No. It records `(node, entry)` and later reads `entry.number`. No need to know where in the tree the node lives.
- `ref-resolution.js` (current): No position is tracked — it walks and replaces. If moved to "collect then iterate," it would need `(parentArray, index)` for each collected ref — but see the ordering complication in §4.

### Notes strand (R3's scope, but relevant to interface design)

`notes.js`'s `walkAndReplace` does two things simultaneously:
1. Calls `processNote(node)` which registers the note, creates the marker, stores it in `pendingNotes`.
2. Splices the `[markerNode]` over the `<note>` in the tree.

For R3 migration onto the discovery walk, registration (#1) would move to the discovery walk. But splicing (#2) is a tree mutation during the walk — it cannot cleanly be deferred. This means `notes.js`'s migration to the shared discovery walk is architecturally more involved than numbering.js's migration. Notes.js needs to mutate the tree (splice markers) as part of its "collection" step, not as a deferred "resolve" step. The discovery walk, if it is read-only, cannot do this.

Two approaches for R3:
- **A.** The discovery walk emits `note` nodes as collected items; a second pass does the splicing. This changes the timing of marker insertion, which could affect subsequent walkers.
- **B.** The discovery walk accepts mutation callbacks (not just collection callbacks), so splice-replacement remains possible. This makes the walk a general "visit + optionally replace" mechanism.

This is a finding for R3's design, not R2's.

### `section-nesting.js` (not migrating, but its relationship to discovery matters)

`section-nesting.js` is a structural transform. It restructures `.content` arrays in-place. It is part of the "shape" stage and runs before the discovery walk. After it runs, sections are nested in their final tree positions. The discovery walk sees the already-nested structure.

`section-nesting.js` does NOT register anything in the registry. No `registry.assign('section', ...)` is ever called. This is AUD-09.

---

## 4. AUD-09 — sections and code blocks

### Current state

No code path calls `registry.assign('section', ...)`. Section nodes exist in the tree after `section-nesting.js` runs (inside `article-body.content[...]`), but nothing records them into the registry. Therefore `registry.findByLabel('sec:...')` always returns `null`, and `<ref #sec:intro>` always produces `__ref-error`.

Confirmed by:
- `section-nesting.js`: no import of `registry.js`, no `assign()` call.
- `numbering.js`: `NUMBERED_TAGNAMES` has only `$$`, `figure`, `table` — no `section`.
- `test/plugins/ref-resolution.test.js` line 148 tests "ref inside a section is found and replaced" — but this tests a `<ref>` node placed inside section *content*, not a ref targeting the section *itself*.

### What the discovery walk would need to do

When the discovery walk encounters a `section`, `sub-section`, or `sub-sub-section` node, it calls:

```js
registry.assign('section', node.id || null, { numbered: ???, data: {} });
```

The `numbered` question is a design decision:
- `numbered: false` → `entry.number = null` after `numberRegistry()`. `<ref #sec:intro>` resolves to display text `"intro"` (the label-tail).
- `numbered: true` → sections get sequential numbers. `<ref #sec:intro>` resolves to `"section 1"`. But sections are not currently numbered visually in any output; the theme uses CSS counters. Adding registry numbers to sections could interfere or just be unused.

**Recommended:** `numbered: false`. Sections should be findable by label, not numbered through the registry. The label-tail display text (`"intro"`, `"background"`) is more useful for authors than a numeric counter that doesn't correspond to visible numbering. If visible cross-reference text like "Section 2.3" is wanted, it needs a separate design pass.

For code blocks, the same situation applies: no `registry.assign('code-block', ...)` call exists. Code block nodes in mdast have `id` only if the author uses the shorthand form `<code #code:snippet | ...>`. The discovery walk would need to identify code blocks with author-provided colon-ids and register them. The node type in mdast for a code block is `code` (not `acadamarkTag`) unless wrapped in the shorthand form. Only the shorthand-wrapped form would be reachable via `.content` descent. The scope of code-block registration is ambiguous and should be explicitly deferred; see §5.

---

## 5. Proposed discovery-walk interface

### Context: the ordering complication

Before proposing an interface, there is a constraint that the plan does not explicitly address: **refs inside note content are not in the main tree when the walk would naturally run.**

The post-R1 pipeline is:

```
1. remarkRecursiveContent
2. acadamarkConfigDiscovery
3. acadamarkArticleStructuring
4. acadamarkSectionNesting
5. acadamarkLibraryLoad
6. acadamarkNotes          ← walkAndReplace: extracts <note> nodes from the tree,
                              stores their content in pendingNotes
7. acadamarkNumbering      ← walkAndCollect: registers $$, figure, table
8. acadamarkApplyNumbers   ← calls numberRegistry(); then fillNotes() which INJECTS
                              note content into article-back.content
9. acadamarkRefResolution  ← walkAndReplace: walks complete tree including note content
10. acadamarkCiteResolution
11. acadamarkBibliography
```

If a `<ref>` node lives inside a `<note>` (e.g. `<note | See <ref #eqn:newton>>`), it is accessible in the tree at steps 1–6 (before notes.js runs). After step 6, that `<ref>` node is in `pendingNotes[i].content[j]`, not in the main tree. After step 8 (fillNotes), it is back in the tree, inside `article-back > __note-list > __note-list-item.content`. Step 9 currently finds it there.

**The complication for "collect refs during discovery, iterate during resolution":**

Any single-pass discovery walk must run at a point where it can see both numbered elements (to feed `numberRegistry()`) AND refs (to collect them for later resolution). No such point exists cleanly:

- **Before step 6 (before notes.js):** The walk can see refs inside note content. But after notes.js runs, those refs move out of the tree. If discovery stores `(node, parentArray, index)` for these refs, the `parentArray` references become stale (notes.js spreads the content into a new array; fillNotes uses the spread copy as `__note-list-item.content`). **The node objects are shared** — the spread is shallow — but the array indices are not.
- **After step 8 (after fillNotes):** The walk can see refs in their final positions. But `numberRegistry()` has already run, so the walk can no longer feed registration data.
- **Between steps 7 and 8:** Notes have been extracted, so refs-inside-notes are not in the tree.

This is a genuine ordering problem for R2 if it tries to simultaneously migrate both numbering.js and ref-resolution.js. It does not affect R2 if ref-resolution migration is deferred.

### Proposed R2 interface — Option A (recommended): read-only visitor map

A `discover(tree, file, visitors)` function accepting a `Map<tagname, (node) => void>` of visitor callbacks:

```js
// In new file: src/lib/discover.js

/**
 * Walk the full mdast/acadamarkTag tree in document order.
 * For each node, if its tagname is in `visitors`, call the registered callback.
 *
 * Recurses into:
 *   - acadamarkTag .content arrays (skips opaque: !node.isOpaqueContent)
 *   - mdast .children arrays
 *
 * Read-only. Does not mutate the tree.
 *
 * @param {Array} nodes
 * @param {Map<string, (node: object) => void>} visitors
 */
function walkDiscover(nodes, visitors) {
  for (const node of nodes) {
    if (isAcadamarkTag(node)) {
      const visitor = visitors.get(node.tagname);
      if (visitor) visitor(node);
      if (Array.isArray(node.content) && !node.isOpaqueContent) {
        walkDiscover(node.content, visitors);
      }
    }
    if (node.children && Array.isArray(node.children)) {
      walkDiscover(node.children, visitors);
    }
  }
}

export function discover(tree, visitors) {
  walkDiscover(tree.children ?? [], visitors);
}
```

**For R2, the callers would be:**

```js
// In acadamarkNumbering (rewritten):
export function acadamarkNumbering() {
  return (tree, file) => {
    const registry = ensureRegistry(file);
    const config = file?.data?.acadamarkConfig ?? null;
    const pending = [];

    const visitors = new Map([
      ['$$',     (node) => { /* register equation */ pending.push(...) }],
      ['figure', (node) => { /* register figure */ pending.push(...) }],
      ['table',  (node) => { /* register table */ pending.push(...) }],
      ['section',         (node) => { /* register section (AUD-09) */ }],
      ['sub-section',     (node) => { /* register section */ }],
      ['sub-sub-section', (node) => { /* register section */ }],
    ]);

    discover(tree, visitors);
    file.data.acadamarkNumberingPending = pending;
  };
}
```

**What the walk hands back:** Nothing directly. Each visitor is called with the node reference; the visitor is responsible for recording into the registry or pending arrays. The walk is a pure traversal mechanism, not a collector.

**Does the walk write to the registry?** No. The walk calls visitor callbacks; the visitors call `registry.assign()`. This keeps the discovery walk generic and registry-agnostic. A visitor for ref collection wouldn't write to the registry at all.

**Does the walk handle `.content`-vs-`.children`?** Yes: the `walkDiscover` function handles both, with the `!node.isOpaqueContent` guard on `.content`. This is the core consolidation.

### Option B: walk returns a collected map

Instead of visitor callbacks, the walk accepts a list of tag names to collect and returns `Map<tagname, node[]>`:

```js
const collected = discover(tree, ['$$', 'figure', 'table', 'section']);
const equations = collected.get('$$') ?? [];
```

Simpler API, but loses the ability to do per-node processing (e.g., the numbering decision requires reading both the node's kwargs and the config Map, so the caller needs to inspect each node). The visitor-map form handles this more naturally.

**Recommendation: Option A (visitor map).** More flexible, handles per-node decisions inline, matches how the existing walkers work.

### The ref-collection sub-question

For `ref-resolution.js`, the plan says "resolution iterates collected `<ref>` nodes instead of walking." There are two sub-options:

**Sub-option R2a:** Include ref collection in the R2 discovery walk. Refs are collected along with equations/figures/tables in the same pass. But the ordering complication (§4 context above) means refs-inside-notes won't be collected if the discovery walk runs in the natural position (between notes.js and applyNumbers).

Mitigation: The discovery walk could run before `acadamarkNotes` (at step 5.5, after library-load but before notes). It would collect refs inside `<note>` content. After notes.js splices out the notes and fillNotes reinstalls the content, those ref node *objects* are the same references (the spread is shallow). If resolution replaces them via `Object.assign(refNode, markerNode)` (in-place mutation of the node object) rather than splice, position information isn't needed.

This is technically workable but introduces in-place mutation of nodes, which is architecturally unusual and potentially surprising. It would also require moving the discovery walk to before `acadamarkNotes`, which changes the observable pipeline structure.

**Sub-option R2b (recommended):** Defer ref collection to R3. In R2, `ref-resolution.js` keeps its `walkAndReplace`. The discovery walk is established and used for numbering + AUD-09. R3 migrates both `notes.js` AND `ref-resolution.js` simultaneously. At that point, the ordering can be addressed holistically: the notes collection step and ref collection step can be designed together, so that refs inside note content are correctly handled in whatever final structure R3 produces.

The rationale: the "collect refs during discovery, iterate during resolution" change to ref-resolution.js is a small mechanical change that doesn't break anything but also doesn't create new capability. Deferring it to R3 avoids the ordering problem and keeps R2 clean. The plan's description of R2 ("migrate the cross-reference strand") is achievable without migrating ref-resolution's walk — the meaningful migration is numbering.js's walker and AUD-09, which are clean.

### One walk or more than one pass?

The plan states one walk. For the R2 scope (numbering + AUD-09), one walk is correct and straightforward. For the full refactor end-state (R2 + R3), one walk can serve all strands IF the ordering complication is resolved at the R3 design stage.

The discovery walk should be written as a generic traversal that can accept any mix of visitor types — so that R3 can add note collection and ref collection without changing the walk itself.

---

## 6. Migration risk

### If `numbering.js`'s `walkAndCollect` is replaced by the shared walk

**Low risk.** `walkAndCollect` is self-contained. Its behavior is: for-loop DFS over `.content` and `.children`, register `$$`/`figure`/`table`, push to pending. A shared walk with visitors for the same three types produces identical results in identical document order.

**Risk: `isOpaqueContent` difference.** `walkAndCollect` does NOT check `isOpaqueContent` when recursing into `.content`. The proposed shared walk checks `!node.isOpaqueContent`. After `remarkRecursiveContent`, default-handler nodes have `isOpaqueContent = false`. DSL-handler nodes (math, table data) have `isOpaqueContent = true`. But `$$` and `figure` and `table` are the *target* nodes, not the container nodes for the descent check. The descent check is applied to the *parent* node to decide whether to recurse into its content. In practice: could a `$$` node be nested inside an opaque-content node? Only if an opaque tag wraps a numbered element. This seems unlikely in valid documents, but the difference between the old and new behaviors should be noted and a test added.

**Risk: section registration.** Adding section registration (AUD-09) is new behavior. Tests for `ref-resolution.js` will now succeed for `<ref #sec:intro>` (previously always `__ref-error`). This is desired behavior, but existing tests that assert `__ref-error` for section refs must be checked — they should not exist, but confirm before landing.

**Risk: document order for sections.** After `section-nesting.js`, sections are nested (`article-body.content[0] = outerSection; outerSection.content[1] = innerSection`). A DFS of the nested structure visits the outer section before inner sections, which IS document order. Confirm by adding a test: document with two outer sections and a sub-section; verify registration order.

### If `ref-resolution.js`'s walk is replaced (R3, not R2)

**Deferred. The ordering complication is the main risk** — refs inside notes must still be resolved. Any replacement of `ref-resolution.js`'s `walkAndReplace` must preserve this behavior. It is tested implicitly by the integration fixtures but not by a dedicated unit test for "ref inside note content."

**Action for R3:** Add a unit test specifically for `<ref>` inside `<note>` content before R3 lands, to protect against regressions.

### `isOpaqueContent` latent inconsistency

The three `walkAndReplace` copies (notes.js, ref-resolution.js, cite-resolution.js) differ in whether they check `isOpaqueContent`. In the current pipeline this is not a bug because `remarkRecursiveContent` sets `isOpaqueContent = false` on all default-handler nodes before any of these walkers run. But it is a latent inconsistency that the shared walk should resolve by consistently checking `!node.isOpaqueContent`.

### Order dependencies between current walkers

The relevant ordering constraint (post-R1):
- `acadamarkNotes` (step 6) must run before `acadamarkApplyNumbers` (step 8).
- `acadamarkNumbering` (step 7) must run before `acadamarkApplyNumbers`.
- `acadamarkApplyNumbers` must run before `acadamarkRefResolution` (step 9).

After R2, if the discovery walk replaces step 7 (numbering registration), it takes step 7's position. Steps 6 and 8 are unchanged. Step 9 is unchanged for R2. No ordering changes are required.

### Tests that assert on traversal behavior

The unit tests for `numbering.js` (`test/plugins/numbering.test.js`) and `ref-resolution.js` (`test/plugins/ref-resolution.test.js`) test on output (registered entry shapes, replaced node types), not on traversal mechanics. They would NOT need updating when the traversal mechanism changes — the tests exercise observable behavior, not implementation details.

Exception: `ref-resolution.test.js` line 148 tests "ref inside a section content is found and replaced." This tests that the traversal descends into `.content` arrays. It will continue to pass because the shared walk also descends into `.content`. ✓

The integration fixtures (`test/fixtures/`) will catch any regression in output. These are the primary safety net.

---

## Recommended R2 scope

**R2 as described in the plan is mostly right, with one rescoping recommendation.**

### What looks correct

- **Introducing the shared discovery walk module** (`src/lib/discover.js` or similar): clean, no risk, no ordering complications.
- **Migrating `numbering.js`'s `walkAndCollect` onto the shared walk**: clean migration. The walk produces identical results, the pending-array fill pattern is unchanged, tests pass without modification.
- **Adding section registration (AUD-09)**: falls naturally out of adding `section`/`sub-section`/`sub-sub-section` as visitor types. Low risk, no ordering complication. `numbered: false` is the right choice.
- **R2 end state**: `numbering.js` no longer walks the tree itself — it registers visitors with the shared walk. `section-nesting.js` is unchanged (it is shape, not discovery). `recursive-content.js` is unchanged. `ref-resolution.js` is tentatively kept as-is (see below).

### The rescoping recommendation

**Do not attempt to replace `ref-resolution.js`'s `walkAndReplace` in R2.**

The plan says: "`ref-resolution.js`: resolution iterates collected `<ref>` nodes instead of walking." This is technically achievable in R2 but requires either:
1. Running the discovery walk before `acadamarkNotes`, with careful handling of the ref-node-inside-note ordering problem; or
2. In-place mutation of node objects (instead of splice), which is an architectural change.

Neither of these complications is worth taking on in R2. The `walkAndReplace` in `ref-resolution.js` is 20 lines and works correctly. Moving it to R3 alongside `notes.js`'s migration means the ordering problem can be addressed once, with full context.

**Revised R2 scope:**
- Write `src/lib/discover.js`: the shared traversal function, visitor-map interface, handles `.content`/`.children`/`isOpaqueContent`.
- Rewrite `acadamarkNumbering` in `numbering.js` to use `discover()` instead of `walkAndCollect`. Delete `walkAndCollect`. Register visitors for `$$`, `figure`, `table`, and (new) `section`/`sub-section`/`sub-sub-section`.
- `ref-resolution.js`: unchanged. Its `walkAndReplace` is not migrated in R2.
- All tests green. No rendered output changes. AUD-09 fixed for section refs.

**Is this a significant departure from the plan?** Small. The plan's stated end-state for R2 includes ref-resolution migration, which this defers by one slice. The benefit is that R2 has zero ordering complications and can be implemented straightforwardly. R3's scope expands slightly (it now owns ref-resolution migration alongside notes.js), but R3 was already the slice that eliminates "old walkers" — this fits.

### Anything surprising

1. **`recursive-content.js` is architecturally separate.** It uses `visit()` via a wrapper-node trick, not a hand-rolled `.content`/`.children` loop. It is not contributing to the duplication problem. R2 does not touch it.

2. **`section-nesting.js` does not walk `.children`.** The other walkers all walk both `.content` and `.children`. Section-nesting walks only `.content`. This is correct for its purpose (sections are in acadamarkTag content, not mdast children) but means section-nesting cannot be "unified" into the same walker pattern as the others even if one wanted to.

3. **The `isOpaqueContent` inconsistency between notes/ref and cite.** Three walkers that are otherwise identical differ on this one guard. The shared walk should standardize on checking `!node.isOpaqueContent`, matching cite-resolution. The notes and ref walkers will behave identically in practice (since `remarkRecursiveContent` has already set `isOpaqueContent = false` on all default-handler nodes), but correctness argues for the guard.

4. **Refs inside notes are currently resolved.** This is untested explicitly (no unit test for it) but works because ref-resolution runs after fillNotes. Any migration that changes the timing of ref collection relative to fillNotes must explicitly verify this continues to work. Flag for R3.

5. **The `discover.js` module, once written, is immediately useful for R3.** Notes.js and cite-resolution.js have the same `walkAndReplace` structure as ref-resolution.js. R3 will replace all three with discovery + deferred resolution. Having the walk module available from R2 means R3 can focus on the resolution redesign.

---

*End of findings.*
