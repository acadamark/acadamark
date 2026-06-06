# Phase 0 — Native Table Model + XHTML import (findings)

*Read-only investigation for the first table-grammar build slice. No production
code, fixtures, or commits. Throwaway probes under `/tmp/probe_*`. Ends in a
recommended-scope verdict (§6) and the decisions a human must make before slices
(§7). The slice as written is buildable, but the corpus reality shifts the scope
and surfaces one root-cause bug and one genuine gap the prompt does not address.*

## 1. Headline findings

1. **Root cause of "everything falls to literal": a `colspan="1"` bug in #106.**
   Every PLoS cell carries explicit `colspan="1" rowspan="1"`. #106's complexity
   gate is `c.attributes.colspan || c.attributes.rowspan` — **truthy for the
   string `"1"`** — so *every* table with explicit no-op spans is misclassified
   complex → literal floor. That is why all 28 pgen tables import as the literal
   floor today, not because they're complex. The new occupancy parser (which
   reads spans as integers) fixes this for the recovery path; the existing gate
   should be corrected too. **Byte-safe:** no committed fixture uses `="1"` spans
   (pnas has only real ≥2 spans), so the fix changes nothing already in-tree.

2. **The corpus is mostly *not* clean-relational; the prompt's "~23/28
   reachable" is optimistic.** Classifying all 28 tables (§3): ~6 are uniform
   clean-relational; **another ~8 are clean-relational with an *unlabeled stub***
   (header has N−1 cells, body N — the key column has no header cell); ~7 are
   genuinely *ragged/grouped* (mixed body column counts — grouping via dropped
   cells); ~5 are multi-level (spans/multi-row thead, deferred); ~2 have no
   thead. **Realistic recoverable this slice ≈ 14/28 — and only if the
   recognizer handles the unlabeled-stub case.** Without it, ~6/28.

3. **`<thead>`-not-`<th>` is confirmed and essential.** pgen 741 & 993 are 100%
   `<thead>`-with-`<td>` (zero `<th>`); the spike recognizers (and the existing
   importer's instincts) keyed on `<th>` would miss all of them. pgen 858 uses
   `<th>`. The detector must key on `<thead>` membership.

4. **The genuinely-ragged tables correctly fall to literal under draw-and-check
   — that is the right outcome,** matching the north star. No mis-modeling risk;
   the gate protects.

## 2. Artifact inventory (`notes/table_grammar/`)

| Artifact | State | Use in slice |
|---|---|---|
| `grammar_core.mjs` | Works. `render(desc) → {thead,body}` of `{tag,text,colspan,rowspan}`; handles multi-measure, outline dims, span/repeat, **stub-head** (unlabeled-stub!), absent. | **Port as the forward engine.** One real adaptation: cells must carry **inline mdast**, not `text` strings (§4). |
| `importer.mjs` | Spike. Parses with **cheerio over rendered `demo-paper.html`** at a hardcoded `/mnt` path; recognizers keyed on `<th>`; draw-and-check is data-level (triples), not render-normalize. | **Reuse the occupancy logic only.** The parse front-end must be re-fronted onto the existing saxes JATS tree (§4). **Replace** `recoverRelational`/`recoverCube` (prompt already says so). |
| `battery.mjs` | Works. `expand→matrix→eqMatrix` is exactly the agreed draw-and-check normalization (resolve spans, drop dividers, text+position equality). | **Reuse the normalization/compare** directly. Its `recover*` are th-keyed scaffolding — discard. |
| `pgen.100074{1,3}` , `pgen.1007858` | Present, large, real. | Acceptance fixtures. |
| design docs (whitepaper, survey, chat, complex_tables_slice_report) | Present. | Model spec reference. |
| `corpus.mjs` | **Absent** (prompt references it). `table_interp_prototype.mjs` is the nearest. | Note the discrepancy; not blocking. |

## 3. Per-table classification (all 28)

```
pgen.1000741 (7): clean-rel ×3, ragged ×3, multi-level ×1
pgen.1000993 (11): clean-rel(unlabeled-stub) ×6, clean-rel ×1, ragged ×4
pgen.1007858 (10): clean-rel ×2, multi-level ×4, no-thead ×2, ragged ×2
```

- **clean-relational** (uniform body = ncols, 1 thead row, no spans) → RECOVER, draw-and-check passes trivially.
- **clean-relational, unlabeled stub** (uniform body = ncols, thead = ncols−1) → RECOVER **iff** the recognizer treats the unlabelled first column as the key dimension (the forward engine's `stubHead` already renders this). This is the ~8 tables that decide whether the slice is worth it.
- **ragged/grouped** (e.g. pgen.993 phenotype rows n=11 interleaved with SNP rows n=10; pgen.741 `{8:3,7:9}`) → the relational recognizer drops non-conforming rows → draw-and-check FAILS → literal. Correct.
- **multi-level / no-thead** → literal (deferred / floor). Correct.

`pgen.1007858` is the cleanest acceptance proof for the **negative** assertions (its 4 multi-level + 2 no-thead must fall to literal) and has 2 clean-relational `<th>` tables for the positive `<th>`-path assertion.

## 4. Integration map (the real work, mostly unstated in the prompt)

**Forward engine → enscribe handler.** `grammar_core.render` returns a grid
model `{thead, body}` of text cells. The enscribe table handler
(`handlers/table.js`) builds hast. Port `render` into the repo and have the
handler convert `{thead,body}` → hast (it already does this shape for `_htmlTable`
in #106 — reuse `buildHtmlTableBodyHast`). **Cells must carry inline mdast**
(formula/xref/cite/note nodes from `convertInline`), not strings, so #21/#105
resolution and the walker descent reach them. So a fact `value` of type `inline`
is `{ inline: mdast[], text: string }` — `inline` for render, `text` for the
draw-and-check comparison.

**Node representation.** A recovered native table needs a tree-resident stamp
(call it `node._tableDesc`) that the walkers descend (like `_parsedCells` /
`_htmlTable`) and the handler renders. This is additive to the three existing
table render paths (csv / `_parsedCells` / `_htmlTable`).

**Backward parse.** Re-front the occupancy logic onto the **existing saxes JATS
parse** (`buildHtmlGrid` in `jats-import` already walks `<table-wrap><table>`
into a grid with correct integer spans — reuse/extend it as the normalized-grid
producer). Do **not** bring in cheerio or parse rendered HTML.

**Draw-and-check.** Source side = the normalized grid from the parser; candidate
side = `render(desc)` normalized by `battery`'s `expand`. Compare with
`eqMatrix`. Wire it as the accept/fallback gate in `convertTableWrap`, in front
of the literal floor.

## 5. Two gaps the prompt does not address

**A. `.emd` serialization of a native table — no authoring syntax exists (it's
explicitly out of scope, design §8.1).** The demo and default `import-jats`
render import→tree→HTML directly, so a `_tableDesc` stamp + handler render works
with no `.emd`. But `import-jats --emd` has nothing to serialize. **Recommended
resolution:** a recovered native table serializes to `.emd` as its **literal-
floor projection** (run the recovered grid through #106's `htmlGridToSource`), so
`--emd` keeps working and round-trips as literal until the authoring-syntax slice
lands. Native structure is thus **render-only** this slice — it improves the HTML
and JATS-export channels (proper `<thead>`/`<th>` relational markup) but is not
yet a canonical `.emd` surface. This needs sign-off; it is the one place the
slice's "end-to-end" claim is really "end-to-end for the direct-render channel."

**B. Overlap with the existing CSV path (#105).** A flat-relational *native*
table and an authored `<table csv>` render almost identically. This slice adds a
*second* representation of flat tables (native, import-only) alongside CSV
(authored). That is acceptable for now (CSV is a legacy/authoring front-end; the
native model is the future target the authoring slice will lower CSV into), but
it should be a conscious decision, not a silent divergence. Recommend: native
recovery is **import-only**; the CSV path is untouched; do not try to unify them
this slice.

## 6. Recommended scope verdict

**Build it, with three adjustments to the prompt:**

1. **Add unlabeled-stub handling to the flat-relational recognizer** (header =
   ncols−1, first body column is the key dimension). Without it, recoverable
   drops from ~14/28 to ~6/28 — half the slice's value is in this one case, and
   the forward engine already supports it.
2. **Fix the `colspan="1"`/`rowspan="1"` complexity bug** (parse spans as
   integers; `="1"` is not a span). Byte-safe; necessary for any real corpus.
   Without it the recovery layer never even sees a candidate — everything is
   pre-routed to literal.
3. **Resolve the `.emd` gap (§5A) by literal-floor projection**, and keep native
   recovery **render-only / import-only** this slice. State this in the slice so
   "end-to-end" is not over-claimed.

**Re-baseline the acceptance numbers:** ~14/28 recover (clean + unlabeled-stub),
the rest fall to literal — *correctly*. The gate should assert the **actual**
recovered set (the specific clean tables in each file), the ragged/multi-level/
no-thead tables falling to literal, and the `colspan="1"` fix not moving any
committed fixture. Do **not** assert "23/28."

**Reuse, don't rebuild:** `grammar_core.render` (port, mdast-ify cells),
`battery`'s normalization/compare (lift verbatim), `jats-import`'s `buildHtmlGrid`
(extend into the normalized-grid producer). Discard: `importer.mjs`'s cheerio
parse + both recognizers; the th-keyed logic everywhere.

## 7. Decisions needed before slices are cut

1. **`.emd` for native tables (§5A):** confirm "literal-floor projection, render-
   only this slice" — or do you want native tables excluded from `--emd`
   entirely until authoring syntax exists?
2. **CSV overlap (§5B):** confirm native recovery is import-only and leaves the
   `<table csv>` path untouched this slice.
3. **Unlabeled-stub:** confirm it's in scope (recommended — it's half the value).
4. **`colspan="1"` fix:** confirm fixing #106's gate here (vs. filing separately)
   — it's in this slice's path and byte-safe, so folding it in is cleanest.
5. **Acceptance re-baseline:** confirm the gate asserts the real ~14/28 recovered
   set rather than the prompt's 23/28.
