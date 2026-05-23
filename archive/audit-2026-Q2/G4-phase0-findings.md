# G4 Phase 0 Findings — Cross-Reference Registration: Code Blocks and Note Ids

**Date:** 2026-05-28  
**Branch:** `master`, HEAD `1597d46` (after NORM-tables)  
**Scope:** Read-only investigation. No code changes, no packages installed, no
files edited except this document.

---

## 0. Purpose

Investigate PG-6 (code-block ids not referenceable), PG-7 (auto-generated note
ids not referenceable), and the open AUD-09 code-block half. Produce a findings
document to inform the G4 implementation prompt. The investigation also reads the
baseline cross-reference registration machinery so the findings are grounded in
the actual code.

---

## Q1 — How cross-reference registration works today

### Files read

- `packages/acadamark-interpreter/src/lib/registry.js` (full)
- `packages/acadamark-interpreter/src/lib/discover.js` (full)
- `packages/acadamark-interpreter/src/plugins/numbering.js` (full)
- `packages/acadamark-interpreter/src/plugins/ref-resolution.js` (full)
- `packages/acadamark-interpreter/src/plugins/notes.js` (full)

### 1.1 Registry colon-id rule

`registry.assign(type, providedId, opts)` stores every entry in a per-type Map,
keyed by `id`. If the id contains `:`, it is also stored in a cross-type
`labelIndex` Map. The public lookup path used by ref-resolution is
`findByLabel(id)`, which queries the `labelIndex` exclusively.

Consequence: **only ids containing `:` are findable by `<ref>`**. An entry
registered with id `note-1` exists in the registry but is invisible to
`findByLabel`. The `findByLabel` contract is documented explicitly in the
registry header and its test file. This is intentional, not a bug.

### 1.2 What the numbering plugin registers

`acadamarkNumbering` uses `discover()` to walk the tree and calls
`registry.assign()` for each matched node. Registered types and how:

| Tagname | Registry type | `numbered` | Notes |
|---|---|---|---|
| `$$` | `equation` | `true` | Visible sequence: "equation 1" |
| `figure` | `figure` | `true` | Visible sequence: "figure 1" |
| `table` | `table` | `true` | Visible sequence: "table 1" |
| `section`, `sub-section`, `sub-sub-section` | `section` | `false` | Findable by label; no sequence |

Code blocks (`'```'`) and note nodes are **not** in this visitor map. See §1.3
for notes; §Q2 for code blocks.

### 1.3 How notes register themselves

Notes are registered by `acadamarkNotes` in `plugins/notes.js`, **not** by
`numbering.js`. This runs before numbering in the pipeline:

```js
discover(tree, new Map([
  ['note', (node) => {
    const entry = registry.assign('note', node.id || null, { numbered: true });
    pending.push({ node, entry });
  }],
]));
```

For a note with no authored id, `node.id` is `null` → auto-generated id
`note-1`, `note-2`, etc. These lack `:` → **not** in label index →
`<ref @note-1>` always fails.

For a note with explicit colon-id (`<note #note:fn1>`), `node.id` is
`'note:fn1'` → indexed → `<ref @note:fn1>` resolves. **This already works.**

### 1.4 How ref-resolution resolves targets

`acadamarkRefResolution` does one thing: `registry.findByLabel(targetId)`. If
`null`, emits `__ref-error`. No type-based fallback; no non-colon path.

```js
const entry = registry.findByLabel(targetId);
if (!entry) {
  file?.message?.(`Reference target not found: ${targetId}`, node);
  return [makeRefError(targetId)];
}
```

### 1.5 DEFAULT_PREFIXES in ref-resolution.js

```js
const DEFAULT_PREFIXES = {
  eqn:  'equation',
  fig:  'figure',
  note: 'note',
  tab:  'table',
  sec:  'section',
  thm:  'theorem',  lem:  'lemma',  def:  'definition',  ex:   'example',
};
```

`code` is absent. Without a `code` entry, a resolved `<ref @code:snippet>`
would display as just the number ("1"), with no prefix word. This is a second
defect independent of registration.

### 1.6 What `discover()` can and cannot see

`discover()` only visits `acadamarkTag` nodes (via `isAcadamarkTag` check). It
recurses into:

- `node.content` (for acadamarkTag nodes, guarded by `!node.isOpaqueContent`)
- `node.children` (for mdast block nodes — paragraphs, lists, etc.)

It does **not** visit native mdast nodes like `code` (fenced code block), `math`
(display math), or `table` (GFM table). Those only survive to this point as mdast
if the normalization pass has not converted them — and after the NORM-tables
slice, GFM tables are normalized to acadamarkTag nodes before discovery runs.
Display math and inline math are also normalized. Plain fenced code blocks are
**not** normalized; they remain native mdast `code` nodes.

---

## Q2 — Code-block representation and what discover() can reach

### Files read

- `packages/remark-acadamark/src/dsl-registry.js`
- `packages/remark-acadamark/src/sigil-mapping.js`
- `packages/acadamark-interpreter/src/handlers/code-block.js`
- `packages/layer1-vocabulary/elements/code-block.md`
- `packages/layer1-vocabulary/elements/code.md`
- `notes/shorthand-syntax.md` (code-related sections)

### 2.1 Three code authoring forms

**Form 1 — Plain fenced code block (markdown):**
```
```python
def hello(): print("hello")
```
```
Parser produces native mdast `code` node with `lang: 'python'`, `meta: null`,
`value: '...'`. No `id` field. `discover()` cannot see it. Not normalizable
without a new mechanism (no standard markdown syntax for attaching an id to a
fenced block).

**Form 2 — Code sigil:**
```
<``` python #code:snippet | def hello(): print("hello") ```>
```
Parser produces `acadamarkTag` with:
- `tagname: '```'`
- `id: 'code:snippet'` (from `#code:snippet` attribute)
- `positional: ['python']`
- `content: 'def hello(): ...'` (opaque string)
- `isOpaqueContent: true`

`discover()` **can** see this node. The sigil-mapping translates `'```'` to
vocab key `'code-block'`, which dispatches to `codeBlockHandler`. That handler
already emits the id on `<code id="code:snippet">`. Registration in numbering.js
is the only missing piece.

**Form 3 — Named `<code>` tag:**
```
<code #code:snippet language=python | def hello(): ...>
```
Parser produces `acadamarkTag` with `tagname: 'code'`. Dispatches via
`interpreter_strategy: schema` (not a custom handler). Vocabulary entry
`code.md` shows `id` maps to the HTML `id` attribute. `discover()` **can** see
this node; again, no registration visitor exists.

However, `<code>` is semantically inline code (single-line snippets), not a
block code listing. The cross-reference use case is specifically about block-
level code listings. This form is unlikely to need registration for PG-6; the
sigil form (Form 2) is the right target.

### 2.2 Current output: id without registration

The `codeBlockHandler` already emits the id attribute:
```js
if (id) codeProperties.id = id;
```
So `<``` python #code:snippet | ... ```>` already produces
`<pre><code id="code:snippet">...</code></pre>` in HTML output. The HTML anchor
is there. The broken piece is the registry: `findByLabel('code:snippet')` returns
`null`, so `<ref @code:snippet>` always fails.

### 2.3 Conclusion on representation

For PG-6, the right and only target is Form 2 (code sigil `` '```' ``). Form 3
(`code` named tag) is inline and out of scope for cross-referencing code listings.
Form 1 (plain fenced) cannot carry ids and is architecturally unreachable by
`discover()`. No normalization pass is needed.

---

## Q3 — Design sub-question: what to register and how to number

Two registrant options for the sigil code block:

**Option A (unnumbered, like sections):**
```js
visitors.set('```', (node) => {
  registry.assign('code', node.id || null, { numbered: false });
});
```
`<ref @code:snippet>` displays the label-tail: "snippet" (not "code block 1").
Numbered display for code blocks is not standard in most academic styles. The
section model is the right template — label makes the block findable; no
visible sequence number.

**Option B (numbered, like figures/tables):**
```js
visitors.set('```', (node) => {
  const numbered = readBoolKwarg(node, 'numbered', config, 'number-code', true);
  registry.assign('code', node.id || null, { numbered });
});
```
`<ref @code:snippet>` displays "listing 1" (or whatever word is added to
`DEFAULT_PREFIXES`). Enables document-level `number-code=false` toggle.

**Recommendation: Option A (unnumbered, like sections).**

The primary use case is reproducibility cross-references: "see the implementation
in Listing X" where the label is meaningful enough to stand alone (e.g.,
`code:gradient-descent`). Sequential numbering of code blocks is non-standard
in journal publishing; JATS has no equivalent mechanism. The label-tail display
("gradient-descent") conveys more information than "code block 3". Option A
keeps the code simpler and the display more useful.

If future authors want numbered listings, the visitor can be extended with
`readBoolKwarg` without changing the interface.

**Display word for DEFAULT_PREFIXES:**

Regardless of numbered/unnumbered, `DEFAULT_PREFIXES` needs a `code` entry so
that resolved refs have the correct aria label and display text:

```js
code: 'listing',
```

With Option A (unnumbered), the display text is the label-tail, so the prefix
word only appears in the fallback case where `entry.number !== null` — which
Option A never produces. But the entry should still be added for correctness and
future extensibility.

---

## Q4 — PG-7: Auto-generated note ids

### 4.1 Baseline

`notes.js` calls `registry.assign('note', node.id || null, ...)`. For notes with
no authored id, the registry auto-generates `note-1`, `note-2`, etc. These lack
`:` and are not indexed. `<ref @note-1>` always produces a ref-error.

For notes with an explicit colon-id (`<note #note:fn1>`), the id `note:fn1` is
indexed and `<ref @note:fn1>` resolves today. This already works.

### 4.2 Fix options

**Option A — Change auto-id format to colon form (`note:1`, `note:2`, ...).**

The auto-id template in `registry.assign()` is `${type}-${sequence}`. Changing
the registry-level template to `${type}:${sequence}` for all types (or only for
`note`) would add these ids to the label index automatically.

Downstream surface hit:
- `note-placement.js`: `const { id: noteId } = entry;` — `noteId` used as
  `data-note-id` attr, `href="#note-1"` in `<a>` link, and `id="note-1"` on
  `<li>`. All would become `note:1`, `note:2`.
- `handlers/notes.js`: `noteMarkerHandler` and `noteListItemHandler` — both use
  `noteId` directly in HTML output. `:` is valid in HTML `id` attributes but
  looks unusual.
- `hover-preview.js`: `document.getElementById(noteId)` — `getElementById('note:1')`
  is valid (colons are legal in HTML ids), but unconventional.
- Test fixtures: 4 HTML fixture files (`document-5-linear-regression.html`,
  `document-6-cross-references.html`, `document-9-demo.html`,
  `document-12-bare-table.html`) and 2 JSON fixture files assert
  `id="note-1"`, `href="#note-1"`, `data-note-id="note-1"`.
- `test/lib/registry.test.js`: 3 assertions on `note-1`, `note-2`, `note-3`
  format as auto-ids; 1 assertion that `note-1` is NOT in the label index (this
  test would need to be inverted).
- `test/plugins/notes.test.js`: 1 assertion `assert.equal(marker.kwargs.noteId, 'note-1', ...)`.

Total: large fixture update, multiple behavioral changes, at least 7 assertions
to revise.

**Option B — Index all note-type ids regardless of colon.**

Change `assign()` to accept a `{ indexAll: true }` option, or add a parallel
index. This widens the registry contract and introduces a two-tier indexing model
that complicates the invariant "colon-ids are referenceable."

**Option C — Design position: only explicitly-labeled notes are referenceable.**

Auto-generated note ids (`note-1`) are placement mechanics, not author-facing
cross-reference handles. A note without an explicit label has no stable identity
across edits: inserting a new note before it changes its number, breaking any
`<ref @note-1>` the author wrote. The correct authoring pattern is:

```
<note #note:galton | Galton (1886) introduced the regression concept.>
...
See <ref @note:galton>.
```

This already works. No code changes are needed. PG-7 is not a gap in the
implementation; it is a gap in documentation.

**Recommendation: Option C.**

This is the correct design. Cross-referencing a note by sequential number is
fragile and is not a standard academic publishing idiom. The colon-id model is
consistent with all other reference types. The fix is:

1. Update `notes/known-limitations.md` (where PG-7 is currently documented) to
   state that this is intentional design, not a missing feature.
2. Update `packages/layer1-vocabulary/SPEC.md` (or the `note.md` vocab entry)
   to state that notes are only cross-referenceable when given an explicit
   colon-id.

No interpreter code changes are needed.

### 4.3 Registry test note

`test/lib/registry.test.js` line 182 explicitly asserts:
```js
assert.equal(r.findByLabel('note-1'), null, 'auto-id without colon not indexed');
```
This is a correct assertion of intended behavior. If Option A were adopted, this
test would need to be inverted, which is a signal that Option A is changing an
explicit contract.

---

## Q5 — Scope: PG-6 + PG-7 as one slice or two?

Given the findings:

**PG-6 (code-block registration):** Small, clean implementation slice.
- Add `'```'` visitor to `numbering.js` (3–4 lines, same shape as section visitor)
- Add `code: 'listing'` to `DEFAULT_PREFIXES` in `ref-resolution.js` (1 line)
- Add 1–2 tests for the new visitor in `test/plugins/numbering.test.js`
- No fixture changes; the HTML output already has the `id` attribute

**PG-7 (note auto-ids):** Not an implementation slice. Recommendation is a
documentation-only action:
- Update `notes/known-limitations.md`
- Optionally update `note.md` vocabulary entry

**Recommendation:** G4 = PG-6 implementation + PG-7 documentation close. One
prompt, one commit.

---

## Summary of findings

| Question | Finding |
|---|---|
| How does ref-resolution work? | `findByLabel()` only; colon-id rule is the gate |
| Why does `<ref @code:snippet>` fail? | No visitor in `numbering.js` for `'```'` tagname; `code` absent from DEFAULT_PREFIXES |
| Which code form is the right target? | Sigil form (`'```'` tagname); plain fenced blocks unreachable, named `<code>` is inline |
| Should code blocks be numbered? | No (Option A: unnumbered, like sections) |
| Why does `<ref @note-1>` fail? | Auto-id `note-1` lacks `:`, not indexed — intentional by design |
| Should auto-ids be changed to colon form? | No (Option C: only explicit labels are referenceable) |
| One slice or two? | One: PG-6 implementation + PG-7 documentation close |

---

## Implementation sketch for G4

```js
// numbering.js — add to visitors map
visitors.set('```', (node) => {
  registry.assign('code', node.id || null, { numbered: false, data: {} });
});
```

```js
// ref-resolution.js — add to DEFAULT_PREFIXES
const DEFAULT_PREFIXES = {
  eqn:  'equation',
  fig:  'figure',
  note: 'note',
  tab:  'table',
  sec:  'section',
  code: 'listing',   // ← add this
  // ... rest unchanged
};
```

With `numbered: false`, `<ref @code:snippet>` displays the label-tail
("snippet"). The id is indexed, so `findByLabel('code:snippet')` returns the
entry.

Test case to add (in `test/plugins/numbering.test.js`):
```js
// <``` python #code:snippet | ... ```> node registers in label index
const node = makeCodeSigilNode('code:snippet', 'python', 'def f(): ...');
// run numbering plugin
// assert registry.findByLabel('code:snippet') !== null
// assert ref-resolution resolves <ref @code:snippet> to display text 'snippet'
```

---

## Drift findings

No spec-vs-code drift discovered that wasn't already tracked. One observation:

- `packages/layer1-vocabulary/elements/code-block.md` already states that `id`
  is "Used as cross-reference target." The vocabulary entry specifies the intent
  but the implementation does not yet fulfill it. PG-6 exists precisely because
  this spec promise has no corresponding registration in `numbering.js`. The
  `code-block.md` entry does not need to change; the code does.

- `DEFAULT_PREFIXES` in `ref-resolution.js` has no entry for `code`. The
  `code-block.md` vocabulary entry does not specify a reference prefix word.
  After the G4 slice, "listing" should be added to `code-block.md`'s `id` notes
  section as the conventional reference word.
