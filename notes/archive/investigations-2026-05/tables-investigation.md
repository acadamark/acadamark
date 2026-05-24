# Tables slice: Phase 0 investigation

Date: 2026-05-13.

---

## Q1: Existing table state

### `packages/layer1-vocabulary/elements/table.md`

Exists. Has `interpreter_strategy: schema` and `html_output.element: table`. Current design describes three paths:
- Plain markdown pipe syntax (via remark-gfm) → out of scope, see Q6
- DSL engine shortcut tags (`<csv>`, `<tsv>`, `<json>`) → deferred shortcut form
- Explicit `<table>` long-form with `<tr>/<td>` cells → structural form

The existing frontmatter does NOT include `interpreter_strategy: handler`, nor positional format argument, nor caption/numbered kwargs. **Table.md must be updated for this slice.**

### Handler files

No `table.js` handler exists in `packages/acadamark-interpreter/src/handlers/`. Start from scratch.

---

## Q2: Positional argument shape

**Confirmed by parser test.** `<table csv | name,age\nalice,30\nbob,25\n>` parses to:

```json
{
  "tagname": "table",
  "positional": ["csv"],
  "kwargs": {},
  "id": null,
  "content": " name,age\nalice,30\nbob,25\n"
}
```

With id and kwargs: `<table csv #tab:revenue caption="Test cap." |\nq1,100\nq2,120\n>` parses to:

```json
{
  "tagname": "table",
  "positional": ["csv"],
  "id": "tab:revenue",
  "kwargs": {"caption": "Test cap."},
  "content": "\nq1,100\nq2,120\n"
}
```

**Format word is in `node.positional[0]`.** No auto-promotion to kwargs.

---

## Q3: Multi-line pipe content

**Confirmed.** Content includes leading and trailing newlines from the pipe format: `"\nq1,100\nq2,120\n"`. The table handler must `trim()` the content string before parsing. This is consistent with how CSV/YAML/JSON tools expect clean input.

---

## Q4: `src=` file references

No existing infrastructure for loading files during interpretation. The figure handler uses `node.kwargs.src` only as an image `src` attribute — it doesn't read the file.

**For this slice**: `src=` is implemented in the table handler using `readFileSync` at handler time, relative to a base directory. The base directory can be passed as an option to the interpreter, defaulting to `process.cwd()` or the file's directory. For Document 7 fixture tests, the handler will use the fixture directory.

Specifically: `acadamarkInterpreter` will accept an option `{ assetsDir }`. When `assetsDir` is set, `src=` paths resolve relative to it. When not set, `src=` produces an error. Tests that use `src=` must pass `assetsDir`.

**Design note**: File reading at handler time is unusual for unified pipelines but works for synchronous processing (which is the current pattern — `processSync`). This is noted as a known limitation.

---

## Q5: unified-latex investigation

@unified-latex packages are **not installed** in any project node_modules. Criteria evaluation:

| Criterion | Assessment |
|-----------|-----------|
| Maintained | ✓ — active GitHub project, recent releases |
| Tractable API | ✓ — has dedicated tabularx package |
| Bundle size | ? — large transitive footprint (full LaTeX tokenizer + parser); not measured |
| License | ✓ — MIT |
| Documented | ~ — adequate for basic use cases |

Only 3 of 5 criteria clearly hold; bundle size is an unknown risk. More importantly, the package is not installed and would add substantial new code for a use case (LaTeX tabular input) that is much rarer than CSV/JSON/YAML for academic data. **Decision: defer LaTeX tabular support.** Document in known-limitations.md.

---

## Q6: Plain markdown tables (remark-gfm)

**Finding: plain markdown table syntax does NOT currently produce HTML tables.**

`remark-parse` alone does not handle GFM table syntax. `remark-gfm` is not installed in any package. When an author writes:

```
| name | age |
|------|-----|
| alice | 30 |
```

`remark-parse` treats the first row as a paragraph and the separator row as a paragraph. The output is NOT a table.

**Implication**: The slice spec's claim "Plain markdown tables continue to work" is aspirational, not current. This is a pre-existing gap, not introduced by this slice. Filed as AUD-06.

**For `<table md | ...>` format**: Implement a small pipe-table parser that handles standard `| h1 | h2 |\n|---|---|\n| c1 | c2 |` syntax. This does NOT depend on remark-gfm.

---

## isOpaqueContent / contentHandler concern

**Finding**: DSL_REGISTRY currently maps `'table'` → `'default'`. This means:
- `<table csv | name,age\nalice,30>` gets `contentHandler = 'default'`
- The `remarkRecursiveContent` plugin then re-parses the CSV string as markdown
- By the time the table handler runs, `node.content` would be an mdast array, not a raw string

**Fix required**: Change DSL_REGISTRY `['table', 'default']` → `['table', 'table']`. With a non-default contentHandler, the recursive-content plugin skips the node, leaving `node.content` as a raw string. The table handler then reads the raw string.

This change also correctly handles the long-form `<table>...</table>` case: with contentHandler 'table', the long-form content is preserved as a raw string for HTML pass-through.

---

## Available dependencies

- `js-yaml` ✓ — already in acadamark-interpreter package.json
- `remark-gfm` ✗ — not installed
- CSV parser ✗ — no existing CSV parser; will write a minimal RFC 4180 parser

No new dependencies needed for the implemented formats (CSV, TSV, JSON, YAML, MD).

---

## Pre-existing vocabulary conflict

The current `table.md` describes the `<table>` element as a structural element with `<tr>/<td>` cell children (long-form path). The slice 5 spec uses `<table csv | data>` short-form with a format positional.

These are complementary, not conflicting: the same `<table>` tag handles both. The handler dispatches on `node.positional[0]`:
- Format present (csv/tsv/json/yaml/md) → parse data, render from parsed structure
- No format → treat `node.content` as raw HTML (if content present) or as long-form structural table

The vocabulary entry will be updated to document both paths. The long-form structural path (`<table>...</table>` with `<tr>` cells) is handled by the recursive table handler dispatching to schema render for children.
