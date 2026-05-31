# Enscribe development process

## Slice verification

Every slice that produces visible output requires browser verification before
completion. Tests passing is necessary but not sufficient.

For visible-output slices:

1. After implementation, run `npm run verify` from the interpreter package:
   ```
   cd packages/enscribe-interpreter
   npm run verify
   ```
   This runs tests AND regenerates fixture HTML files. If tests fail, the
   fixture rendering step does not run.
2. Open `test/fixtures/document-N-*.html` for any document affected by the slice.
3. Visually confirm the change is correct.
4. Confirm no regressions in unrelated visual aspects.
5. Only then mark the slice complete.

## Why this matters

Tests catch behavioral regressions. They do not catch visual regressions: a
note appearing in the wrong place, a code block losing newlines, math
rendering as block when it should be inline. These require human eyes on
rendered HTML.

Three slices in the notes and parser work surfaced bugs that tests did not
catch but browser verification did or would have:
- Interpreter slice 3: hover previews not working at all (CSS bundling missing,
  Quirks Mode breaking Popper).
- Interpreter slice 3 fix: CSS bundling missing, Quirks Mode breaking Popper.
- Parser slice: markdown fenced code blocks losing newlines (pre-existing bug,
  visible only in browser).

Build verification into the slice cadence; do not leave it to the last step.

## The verify script

`npm run verify` in `packages/enscribe-interpreter` runs:

1. `node test/run.js` — the full interpreter test suite (22 suites as of 2026-Q2 audit)
2. `node test/render-fixtures.js` — re-renders all `.emd` fixture documents
   to `.html`

Running verify produces a clean, verified state: tests pass and the rendered
HTML is fresh.

## Snapshot updates

If a parser or interpreter change intentionally changes the output:

```
ENSCRIBE_UPDATE_SNAPSHOTS=1 node test/run.js
```

Then re-run `npm run verify` to confirm the updated snapshots match and the
HTML is regenerated.
