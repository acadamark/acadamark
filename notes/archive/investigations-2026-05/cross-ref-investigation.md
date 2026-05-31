# Phase 0: Cross-reference investigation

Investigation prior to implementing Slice 4 (numbering + ref resolution).

---

## Q1: AST shape for `<ref #id>`

The `#id` notation on a named tag sets `node.id`. For `<ref #eqn:newton>`:

```json
{
  "type": "enscribeTag",
  "tagname": "ref",
  "id": "eqn:newton",
  "kwargs": {},
  "content": null,
  "positional": [],
  "booleans": {}
}
```

The legacy kwarg form `<ref target=eqn:newton>` produces `node.id = null,
node.kwargs.target = 'eqn:newton'`. The vocabulary's `ref.md` describes both
forms. For the implementation, the primary path is `node.id`; the ref handler
should also fall back to `node.kwargs.target` for compatibility with the vocab
spec.

A ref with custom display text `<ref #eqn:newton | Newton's law>` parses as:
`node.id = 'eqn:newton', node.content = " Newton's law"` (opaque string, not yet
parsed; recursive-content will parse it on the outer document pass). The
implementation spec defers author-provided display text — the ref handler should
use `node.id` only for this slice; `node.content` is ignored.

The target display math: `<$$ #eqn:newton | F = ma $$>` → `{ tagname: '$$',
id: 'eqn:newton', kwargs: {}, content: ' F = ma ' }`. The `numbered` kwarg
parses correctly: `<$$ #eqn:newton numbered=false | ... $$>` → `{ kwargs: {
numbered: 'false' }, id: 'eqn:newton' }`. Note: **all kwargs are strings** from
the parser, so `numbered: 'false'` not `numbered: false`.

---

## Q2: Notes plugin structure (pattern for numbering)

Notes plugin pattern (`src/plugins/notes.js`):
- `walkAndReplace(nodes, processNote)` — in-place walk, recurses into both
  `node.content` (for enscribeTag nodes) and `node.children` (for mdast nodes).
  Replaces the visited node with an array of replacement nodes.
- `processNote(node)` — called per `<note>` node, returns `[marker]`.
- Creates a LOCAL registry (`createRegistry()`) — not attached to `file.data`.
- Plugin signature: `(tree) =>` — does NOT receive `file`.

**Key finding:** The notes plugin currently has no access to `file.data`, so it
cannot write to a shared registry. For cross-reference to work with notes
(e.g., `<ref #note:galton>`), the notes plugin must be updated to use
`file.data.enscribeRegistry` — the same registry that the numbering plugin and
ref-resolution plugin read from.

The `walkAndReplace` function is NOT exported from `ast-helpers.js`; it is a
local copy in `notes.js`. The numbering plugin does not need to replace nodes
(only mutate them), so it can use a simpler `walkAndVisit` function.

**One bug found in notes.js (out of scope, surfacing as a finding):** The
`processNote` function ends with `return [marker]` written twice — a duplicate
`return` statement on line ~163. No functional effect (first return wins) but
a code quality issue.

---

## Q3: `file.data.enscribeConfig` API

Set by `enscribeConfigDiscovery()` plugin before any other structural plugin
runs. It is always a `Map` instance, even if empty. Access: `config.get(key)`,
`config.has(key)`. Keys come from `<config key=value>` kwargs.

For numbering config: `config.get('number-equations')` → `'false'` (string) or
undefined. Since all config values are strings, the check is:
`config.get('number-equations') === 'false'` to suppress numbering, with `true`
as the default if the key is absent.

For ref prefix override: `config.get('ref-prefix-eqn')` → `'Eq.'` or undefined.

---

## Q4: Handler locations

**Math:** `src/handlers/math.js` — `mathHandler(state, node)`. Called for both
`$` (inline) and `$$` (display) nodes. Display mode detected by
`node.tagname === '$$'`. Currently wraps KaTeX output in `<display-math>` or
`<inline-math>` element. Ignores `node.computedNumber` (field does not exist yet).
No id is put on the wrapper element — but `node.id` is already handled
(`if (node.id) properties.id = node.id`). The equation number `<span>` needs to
be appended as a sibling of the KaTeX children, inside `<display-math>`.

**Figure:** `src/handlers/figure.js` — `figureHandler(state, node, vocab)`. Takes
three args (state, node, vocab) unlike math which takes two (state, node). Builds
`<figure>` with optional `<img>` and `<figcaption>`. To add a figure label, we
prepend `<span class="figure-label">Figure N:</span>` and a space text node to
`captionHastNodes` before pushing to `<figcaption>`.

---

## Q5: Registry extensions approach

### Current entry shape
`{ id: string, number: number, data: object }`

### Required entry shape
`{ id: string, number: number | null, numbered: boolean, data: object }`

### API changes

**`assign(type, id, { numbered, data })`** (signature change):
- Third arg changes from `data = {}` to `{ numbered = true, data = {} } = {}`.
- If `numbered === true`, counter increments and `entry.number = t.counter`.
- If `numbered === false`, counter does NOT increment; `entry.number = null`.
- Ids with `:` (colon) are added to the label index automatically.
- Backward-compat note: existing `notes.js` calls `registry.assign('note',
  id, { placement })`. These need to become `registry.assign('note', id, {
  numbered: true, data: { placement } })`. All callers must be updated.

**`findByLabel(id)`** (new method):
- Returns entry from the label index, or null.
- `registry.findByLabel('eqn:newton')` → entry or null.

**`ensureRegistry(file)`** (new exported helper):
- `if (file?.data?.enscribeRegistry) return file.data.enscribeRegistry`.
- Otherwise creates a new registry, attaches to `file.data.enscribeRegistry`,
  and returns it.
- If `file` is null/undefined (e.g., in direct test calls), returns a new
  transient registry without attaching.

### Label index rules
- Only ids containing `:` are indexed (colon-prefixed referenceable labels).
- Auto-generated ids (`note-1`, `figure-2`, etc.) do NOT contain `:` and are
  NOT indexed.
- Author-provided ids without `:` (e.g., `my-equation`) are NOT indexed for
  cross-references (they are still stored in the type map for `lookup()`).

---

## Q6: Pipeline interaction

### Current pipeline order
```
enscribeConfigDiscovery()(mdast, { data: {} })
enscribeArticleStructuring()(mdast)
enscribeSectionNesting()(mdast)
enscribeNotes()(mdast)
```

### Required additions
```
enscribeConfigDiscovery()(mdast, { data: {} })
enscribeArticleStructuring()(mdast)
enscribeSectionNesting()(mdast)
enscribeNotes()(mdast, file)     ← needs file now (for shared registry)
enscribeNumbering()(mdast, file)  ← new
enscribeRefResolution()(mdast, file) ← new
```

Notes must run before numbering: notes claims its numbers first. Numbering
then processes display-math and figures. Ref-resolution runs last and can look
up all registered entries.

### Integration test impact

The integration test's manual pipeline path (`runPipeline()` in
`integration.test.js`) currently calls `enscribeNotes()(mdast)` without a file.
This needs to become `enscribeNotes()(mdast, file)` where `file = { data: {} }`.
The new numbering and ref-resolution plugins also need to be added to the manual
path. The `runPipeline` function needs a file object created once and threaded
through all plugin calls.

---

## Q7: Vocabulary updates

**`ref.md`:** Already exists with `interpreter_strategy: handler` and
`handler_module: ./handlers/ref.js`. No changes needed to the YAML frontmatter
for this slice. The examples in the file use `target=` kwarg form; the primary
authoring form (`#id`) is already supported by the parser.

**`display-math.md`:** The vocab YAML frontmatter currently has no `kwargs`
section. The `numbered` kwarg needs to be added:
```yaml
enscribe_attributes:
  kwargs:
    numbered:
      handled_by: handler
      values: ['true', 'false']
      default: 'true'
```
(Currently the file says "Equation numbering maps to JATS <label>" in notes, 
acknowledging it's future work.)

**`figure.md`:** Similarly needs `numbered` kwarg in the YAML kwargs section.
Currently `src`, `alt`, `align`, `width`, `type` are declared; `numbered` must
be added as `handled_by: handler`.

---

## Outstanding design question: ref target lookup

The ref node uses `node.id` as the target. The label index is keyed by id.
But the vocabulary `ref.md` also describes `node.kwargs.target`. The ref handler
must check both:

```javascript
const targetId = node.id ?? node.kwargs?.target ?? null;
```

This is scope-within-slice and not a blocker, just needs to be implemented in
the ref handler.

---

## Notes plugin change summary

The notes plugin needs to change from:
```javascript
export function enscribeNotes() {
  return (tree) => {
    const registry = createRegistry();
    ...
  };
}
```
to:
```javascript
export function enscribeNotes() {
  return (tree, file) => {
    const registry = ensureRegistry(file);
    ...
    // And in assign calls: { numbered: true, data: { placement } }
  };
}
```

This change is necessary for `<ref #note:galton>` to work — labeled notes must
appear in the shared label index so ref-resolution can find them. Without this
change, refs to notes would always produce error nodes.

The notes test file calls `enscribeNotes()(tree)` directly (no file). These
calls will continue to work if `ensureRegistry(null)` returns a transient local
registry (which doesn't write to file.data). The test assertions don't currently
test the registry's externally-visible state; they test the resulting tree shape.
So the tests should pass without changes, but the notes test should ideally be
extended to verify registry state after the notes plugin runs.

---

## Summary: files to create or modify

| File | Action |
|------|--------|
| `src/lib/registry.js` | Modify: new entry shape, label index, `findByLabel`, `ensureRegistry` export |
| `src/plugins/notes.js` | Modify: accept `(tree, file)`, use shared registry, updated assign calls |
| `src/plugins/numbering.js` | Create: new plugin |
| `src/plugins/ref-resolution.js` | Create: new plugin |
| `src/handlers/math.js` | Modify: render equation number span |
| `src/handlers/figure.js` | Modify: render figure label in caption |
| `src/handlers/ref.js` | Create: two handler functions |
| `src/interpret-plugin.js` | Modify: add ref, __ref-marker, __ref-error to registries |
| `src/index.js` | Modify: add numbering and ref-resolution to pipeline |
| `test/lib/registry.test.js` | Modify: extend with label index tests, updated API |
| `test/plugins/numbering.test.js` | Create |
| `test/plugins/ref-resolution.test.js` | Create |
| `test/handlers/ref.test.js` | Create |
| `test/run.js` | Modify: add new test suites |
| `test/integration.test.js` | Modify: add file object, add numbering + ref-resolution |
| `test/fixtures/document-5-linear-regression.emd` | Modify: add cross-references |
| `packages/layer1-vocabulary/elements/display-math.md` | Modify: add numbered kwarg |
| `packages/layer1-vocabulary/elements/figure.md` | Modify: add numbered kwarg |
| `notes/known-limitations.md` | Modify: add deferred items |
