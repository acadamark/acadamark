# R4 Phase 0 findings — libraryLoad reclassification scope-check

**Date:** 2026-05-22  
**Preceding:** R3a and R3b committed (bcff550, f8743c5). Full suite green at 23/23 suites.  
**Purpose:** Scope-check only. Is R4 a clean mechanical reclassification, or does it have hidden entanglement?

---

## 1. What `libraryLoad` actually does

**Source:** `src/plugins/library-load.js`, the full plugin (≈130 lines).

`acadamarkLibraryLoad(options)` returns a `(tree, file)` closure that:

1. Finds all `<data>` nodes at `tree.children` level. These are placed at root level by `acadamarkArticleStructuring` — `libraryLoad` depends on that having run first.

2. Iterates `dataNode.content` for `<library>` nodes. For each:
   - If `kwargs.src` is set → reads an external file via `readFileSync(resolve(assetsDir, src))`.
   - Else if `node.content` is a non-whitespace string → uses it as inline BibTeX/CSL-JSON.
   - Else → emits a warning and skips.
   - Parses content via `new Cite(content)` (citation-js).
   - Pushes the Cite instance to a local array.

3. Merges all Cite instances into one: `new Cite(citeInstances.flatMap(c => c.data))`.

4. Reads `file?.data?.acadamarkConfig?.get('citation-style')` for the style (default: `'chicago-author-date'`). **Requires `acadamarkConfigDiscovery` to have run first.**

5. Writes one key: `file.data.acadamarkCitations = { cite: mergedCite, order: [], style }`.

**Does it mutate the tree?** No. The `<data>` and `<library>` nodes are read but not touched — not removed, not modified. After `libraryLoad` runs, `<data>` nodes are still in `tree.children`. This is the existing behavior; the compile step handles them (or ignores them — see §5 finding F1).

**`file.data.acadamarkCitations` shape:**
```js
{
  cite: Cite,    // citation-js instance; .data is array of CSL-JSON entries
  order: [],     // filled by cite-resolution (first-cited order)
  style: string, // from config or default
}
```

---

## 2. Who consumes the loaded library, and how?

**`cite-resolution.js`** (plugin, step 10):
```js
// line 116
const citations = file?.data?.acadamarkCitations;
if (!citations) return; // no library loaded → no-op

const { cite, order, style } = citations;
// ...
const entry = cite.data.find(e => e.id === key);  // per-key lookup
// ...
order.push(key);  // mutates order[] in place as keys are first-cited
```

**`bibliography.js`** (plugin, step 12):
```js
// line 136
const citations = file?.data?.acadamarkCitations;
// ...
if (!citations || !citations.cite || citations.order.length === 0) return;
const { cite, style } = citations;
// generates HTML via cite.format('bibliography', ...)
```

**Other consumers:** None. `grep -r 'acadamarkCitations' src/` returns only `library-load.js`, `cite-resolution.js`, and `bibliography.js` (plus comments in `index.js`).

**Dependency on plugin vs. direct-call:** Both consumers read from `file.data.acadamarkCitations`. They do not care whether the key was set by a unified plugin call or a direct function call. The only requirement is that the key be present before step 10 runs.

---

## 3. Is this a clean reclassification, or is there entanglement?

**Central answer: mostly clean, with one ordering constraint that shapes the scope.**

### 3.1 What is clean

`libraryLoad` is already structurally pure index-build:

- Zero tree mutation. The `<data>` and `<library>` nodes are read, not changed.
- Single output: `file.data.acadamarkCitations`.
- No back-coupling: nothing reads a result from `libraryLoad` and then feeds it back into the tree. The index is built once, consumed downstream.

This means there is no "separation of concerns" work to do at the node level — unlike R3 (where `<note>` nodes had to stay in the tree vs. being extracted mid-pipeline), `<library>` nodes have no downstream tree role. After `libraryLoad` reads them, they are inert.

The reclassification is therefore a **structural/calling-convention change**, not a behavioral surgery. The function's logic is unchanged.

### 3.2 The ordering constraint

`libraryLoad` has two sequential dependencies:

1. **`acadamarkArticleStructuring` must have run first** — `libraryLoad` finds `<data>` at `tree.children`; article-structuring is what moves `<data>` there. If `libraryLoad` runs before article-structuring, `dataNodes` is always empty and `file.data.acadamarkCitations` is never set.

2. **`acadamarkConfigDiscovery` must have run first** — `libraryLoad` reads `file.data.acadamarkConfig` for the citation style. If config-discovery has not run, the style falls back to the default ('chicago-author-date'), which is correct behavior but means config-controlled citation styles won't take effect.

The plan's target structure (§3 of the plan) places `indexInputs(tree, file)` — combining config and library — **after** the full shape stage (recursive content + article wrap + section nesting). This is the right ordering for `libraryLoad`. But it implies that **`config-discovery` would also move to after article-structuring**, which is a reordering relative to the current pipeline (config-discovery is step 2, before article-structuring at step 3).

Currently:
```
1. remarkRecursiveContent
2. acadamarkConfigDiscovery   ← before article-structuring
3. acadamarkArticleStructuring
4. acadamarkSectionNesting
5. acadamarkLibraryLoad       ← after article-structuring
```

Target (per plan §3):
```
shape: steps 1, 3, 4
indexInputs: steps 2 + 5 (combined, both after shape)
```

Moving `config-discovery` to after `article-structuring` is a reordering that must be verified safe before R4 can create a combined `indexInputs` step. That verification requires reading `config-discovery.js` to confirm it does not depend on the pre-structuring tree shape (e.g., `<config>` nodes being at root-level before article wrapping). This has not been read for R4 Phase 0.

### 3.3 Scope implication

R4 has two possible shapes:

**Shape A (narrow, fully safe):** Reclassify `libraryLoad` alone. Move `this.use(acadamarkLibraryLoad, { assetsDir })` to an explicit index-build calling convention inside `index.js` — e.g., wrap it in a combined step with or without relabeling — without merging it with config-discovery. The pipeline step order in `index.js` does not change; only the conceptual labeling does. Empty fixture diff guaranteed.

**Shape B (full plan §3):** Create a combined `indexInputs` step that runs both config-discovery and library-load, both after article-structuring. This requires verifying that moving config-discovery to after article-structuring is safe (reading `config-discovery.js`, checking whether `<config>` nodes are still discoverable post-structuring, checking that nothing in the existing tests depends on config-discovery running pre-structuring). Higher confidence needed before implementing.

The ordering constraint is not a blocker, but it is the one thing R4 Phase 0 has not fully confirmed. It decides whether R4 is Shape A or Shape B.

---

## 4. What would R4 concretely change?

### Under Shape A (narrow, recommended — see §6)

**`src/plugins/library-load.js`:** Potentially none — or rename/export an inner function `buildCitationIndex(tree, file, options)` that is called directly rather than via the plugin wrapper. The calling convention changes; the logic does not.

**`src/index.js`:** The `this.use(acadamarkLibraryLoad, { assetsDir })` line becomes part of an explicit "index inputs" block. Concretely: either a comment reclassification, or wrapping the call inside a combined plugin:

```js
// ── Index inputs: build config + citation indexes. ──────────────────────────
this.use(function indexInputs() {
  return (tree, file) => {
    acadamarkConfigDiscovery()(tree, file);   // keeps config-discovery in place
    buildCitationIndex(tree, file, { assetsDir });
  };
});
```

But this is only viable if config-discovery can move to after article-structuring (Shape B concern). For Shape A, the simplest version is updating the comment and retaining the current call structure.

**`cite-resolution.js`, `bibliography.js`:** No change. They read `file.data.acadamarkCitations`; the key is unchanged.

**`test/plugins/library-load.test.js`:** No change. All 7 tests invoke `acadamarkLibraryLoad({ assetsDir })(tree, file)` — the plugin-calling convention. If the exported function is renamed or wrapped, the test import is updated, but the test logic is unchanged.

### What is NOT mechanical

Only one design question remains open: whether to attempt the full `indexInputs` consolidation (Shape B) as part of R4, or leave it as Shape A (libraryLoad reclassified, config-discovery stays in its current position). This decision determines the scope of R4 but not its correctness — both shapes produce identical rendered output.

---

## 5. Correctness proof and risk

### Always-renders property

The plan asks: "a failed `<library src=...>` produces a missing index entry, never a thrown exception." Confirmed:

- `readFileSync` failure is caught (lines 66–74 in `library-load.js`); warning emitted, node skipped.
- `new Cite(content)` failure is caught (lines 91–96); warning emitted, node skipped.
- `new Cite(allEntries)` merge failure is caught (lines 101–107); warning emitted, function returns early.
- All three failure paths leave `file.data.acadamarkCitations` unset, which both `cite-resolution` and `bibliography` handle as a no-op (`if (!citations) return`).

The always-renders property already holds. R4 does not need to add error handling.

### Fixture diff

Since `libraryLoad` does not mutate the tree, a reclassification that changes only calling convention (Shape A) will produce an empty fixture diff. The library content is loaded, citations are resolved, bibliography is rendered — all using the same logic. No rendered output changes.

Shape B (moving config-discovery's position) would need a separate verification pass to confirm empty diff. That is the incremental risk.

### Test coverage

`test/plugins/library-load.test.js` — 7 tests covering inline BibTeX, CSL-JSON, external src=, missing src, no-data no-op, no-library no-op, multiple library merge, and style-from-config.

`test/integration.test.js` — the manual pipeline mirror (line 67) calls `acadamarkLibraryLoad({ assetsDir })(mdast, file)` directly. If Shape A keeps the same export name and signature, this test requires no update. If the function is renamed, the import on line 32 needs updating.

No test asserts on `libraryLoad` *as a plugin* (e.g., that it is registered via `this.use()` or is in position 5 of the chain). All tests call the returned `(tree, file)` closure directly. No test-structural changes are needed for Shape A.

### Risk profile

**Low.** `libraryLoad` is the clearest case in the whole refactor: it already does what the plan says it should do. The reclassification is a naming and calling-convention change. The one incremental risk (the config-discovery reordering, Shape B) is surfaced and isolated; it is not inherited by Shape A.

---

## 6. Findings summary

| Finding | Type | Details |
|---------|------|---------|
| F1 | Observation (not a bug) | `<data>` nodes remain in `tree.children` after `libraryLoad` runs. They are not removed. The compile step handles (or silently ignores) them. Current behavior; not introduced by R4. Not investigated further. |
| F2 | Ordering dependency | `libraryLoad` depends on `acadamarkArticleStructuring` having run (to find `<data>` at root) and on `acadamarkConfigDiscovery` having run (to read `citation-style`). The full `indexInputs` consolidation cannot happen without verifying that moving config-discovery to after article-structuring is safe. |
| F3 | Scope split | R4 splits into Shape A (narrow reclassification — safe, confirmed) and Shape B (full `indexInputs` consolidation with config-discovery reordering — unconfirmed but probably safe). |
| F4 | Always-renders | Confirmed: all failure paths produce warnings, never exceptions; consumers handle missing index as no-op. |
| F5 | No tree mutation | Confirmed: `libraryLoad` reads `<data>` and `<library>` nodes but does not modify them. Nothing to separate at the node level. |

---

## Recommended R4 scope — verdict

**R4 is a clean mechanical reclassification, with one scope decision to make up-front.**

`libraryLoad` is already purely "read input → populate `file.data`" with zero tree mutation. There is no entanglement analogous to R2's walker consolidation or R3's note-extraction surgery. The logic is not changing; only the calling convention and conceptual labeling are.

**Recommended shape: Shape A (narrow),** deferring the config-discovery reordering to a follow-on.

Shape A scope:

1. **`library-load.js`**: Extract the index-build logic into an explicit function — `buildCitationIndex(tree, file, options)` or similar — exported alongside (or replacing) the plugin wrapper. The logic is identical; only the calling convention changes.

2. **`index.js`**: The `this.use(acadamarkLibraryLoad, { assetsDir })` call becomes an explicit index-build call inside a clearly labeled block. Config-discovery stays where it is (step 2, before article-structuring) — its reordering is a follow-on, not required for R4.

3. **No changes** to `cite-resolution.js`, `bibliography.js`, or any test logic (only the import in `library-load.test.js` if the function is renamed).

4. **Correctness proof**: empty fixture diff (no tree mutation → rendered output unchanged). Suite stays at 23/23 suites / 440 tests.

Shape B (full consolidation) is the logical R5 or post-R4 step once config-discovery is confirmed safe to move. It is not required to complete the four-stage architecture for `libraryLoad`; Shape A lands the reclassification. Shape B is the polish.

**The implementation prompt for R4 can be written from this findings document.** There are no open design decisions — only the Shape A vs. Shape B choice, which is made above.
