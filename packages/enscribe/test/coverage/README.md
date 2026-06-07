# Fixture-coverage system (#5)

A registry-derived, **systematically-complete** test-fixture set whose coverage is
visible at a glance in one generated file — so judging "how well is feature X
covered?" never again means opening and cross-scanning dozens of fixtures.

## The idea

> comprehensive coverage = every coverage-map element × its configuration space ×
> the registers it supports (canonical / sigil / markdown)

Because the matrix is **derived from the vocabulary registry and the render-quality
spec**, it cannot silently miss a feature: adding a vocabulary entry creates new
uncovered cells that appear in the manifest automatically.

A **fixture is a believable authored document**, never an isolated element. One
fixture exercises a *cluster* of contextually-related elements and many behavior
cells at once (few fixtures, many behaviors). Generated elements (`article-front`,
`section-title`, `note-list`, …) get no standalone fixture — they are exercised
through the parent document that produces them, and listed in the manifest annex.

## Files

| File | Role |
|---|---|
| `spec-data.mjs` | Transcribed source-of-truth: per-element disposition + area + tag-forms (from `render-quality.md` §2 / `tag-forms-reference.md`), the render-quality predicate registry, the `idioms.md` normalization table. Provenance noted inline. |
| `build-coverage.mjs` | The generator. Derives cells from the live `VOCABULARY` + sigil map + `spec-data.mjs`, scans fixtures for `<!-- cell: … -->` markers, reads `results.json`, emits `../fixtures/coverage.json` + `../fixtures/COVERAGE.md`. |
| `results.json` | (optional) predicate-check verdicts written by the predicate harness: `{ "RQ-DOC-M1": { "pass": true }, "RQ-FRM-S4": { "pass": false, "bug": "#NN" } }`. |
| `../fixtures/COVERAGE.md` | **The instrument.** Generated; never hand-edited. |
| `../fixtures/coverage.json` | Machine form of the manifest. |

## Why transcribe instead of reading `notes/specs/` live

The generator runs in the test/build step, and the `notes/` leak guard forbids
referencing `notes/` at runtime. `spec-data.mjs` mirrors the spec facts once so the
generator stays decoupled from notes/ markdown (which mixes tables with prose and
would be fragile to parse) and deterministic. The *element list, kwargs, content
type, and strategy are NOT transcribed* — they are read live from `VOCABULARY`; the
sigil register is read live from `core/tagname-sigil-map.js`. When a `notes/spec`
changes, `spec-data.mjs` is the one place to reconcile.

## Cell identity

`element/behavior-key`, where behavior-key ∈
`base | id | class | kwarg:NAME | form:NAME | register:NAME | blanket | no-output | deferred`.

- **specified** elements expand to the full set (base, id, class, each kwarg, each
  supported form, each non-canonical register).
- **generic-implicit** elements get one `blanket` cell (the §6.2/§7.2 pass-through predicate).
- **no-output** elements get one `no-output` cell ("emits nothing into the body").
- **deferred-presentation** elements get one `deferred` cell — a marked boundary, not a gap.

## Authoring workflow

1. Write a believable document under `../fixtures/<family>/<name>.emd`.
2. Mark each behavior cell it exercises with an HTML comment immediately before the
   construct: `<!-- cell: element/behavior-key -->` (e.g. `<!-- cell: section/form:pipe -->`).
   The comment is stripped by the pipeline; if it would perturb output, move it
   adjacent.
3. Regenerate: `node test/coverage/build-coverage.mjs`. The cell's `covered-by`
   fills in; once the predicate harness verifies the cell's predicates, status flips
   to `pass` (or `divergent:#NN` if current output fails the predicate — that is a
   filed render-quality bug, never a softened assertion).

## Status legend

`pass` predicate verified · `covered` fixture exists, predicate not yet wired ·
`divergent:#NN` predicate fails on current output (bug filed) · `deferred` marked
boundary · `gap` no fixture (a visible hole) · `needs-review` autonomous default applied.
