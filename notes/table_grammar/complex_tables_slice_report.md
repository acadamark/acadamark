Decisions locked: **Design A now** (defer B, document the gap), **include in-cell notes** (`table-wrap-foot` → hoisting `<note>`s). Let me file the issue to get the number for code references, then build.

Issue **#106** filed. Let me build. Starting with the walkers (no-op until the stamp exists → byte-identical).

Now the HTML handler — add the grid builder and the render branch. First the builder, after `buildTableBodyFromParsedCells`:

Now the render branch — before the `!format` raw branch:

Now the JATS emitter — let me see `emitParsedCellsTable` to mirror its style:

Now add the `_htmlTable` branch and the grid emitter to the JATS export:

Now the importer. Let me check `collectEls` and whether `serializeHtml`/`JATS_TO_HTML_TAG` are used elsewhere (so I can remove them if the complex path was their only caller):

`childrenEls` gets direct children — perfect for sections. `serializeHtml`/`JATS_TO_HTML_TAG` are only used by the complex path, so I'll replace them. First the complex branch:

Now replace `JATS_TO_HTML_TAG` + `serializeHtml` with the grid builders:

Let me verify `escapeXmlText` exists and test the importer on pnas — render direct, grep for raw JATS:

Rendered. Now the critical check — **zero raw JATS** in the output, and complex-table cells resolved:

The heredoc got mangled by the shell. Let me write the check to a file:

Working beautifully — **zero raw JATS**, cell formulas render (KaTeX), and the in-cell cross-ref now **resolves**: `(see Table <a href="#tab:T2" class="ref">table 2</a>)`, with `<th colspan="4">` preserved. Now verify the `.emd` output and JATS re-export:

`.emd` is clean (zero raw JATS, escaped grid), and the re-export now carries `<table-wrap>`/`<inline-formula>`/`<xref>`. Let me DTD-validate the re-export:

A malformed tag `<pub-date or date (in history)>` at line 23 — that's in the front-matter date, unrelated to tables. Let me check if it's pre-existing (not from my change):

The malformed tag isn't in jats-export source — let me find where `pub-date or date (in history)` comes from (it's unrelated to my table change):

Found it — pre-existing: the `<date>` element's `jats_counterpart.element` in `data.js` is literally the prose `"pub-date or date (in history)"`, which the exporter uses verbatim as a tag name. Unrelated to tables. Let me check whether existing exported fixtures already contain this (to gauge whether it's "expected" output):

No existing fixture has it — so imported dates re-export through a buggy generic path (orthogonal to tables, its own design question: which JATS date element). I'll file it separately. Let me confirm my **tables** are DTD-clean within the real paper by patching just that one pre-existing date tag and re-validating:

The only re-export errors in pnas are the **pre-existing date bug** (pub-date as CDATA, ordering) — my **table** re-export is DTD-clean. I'll file the date bug separately and prove DTD-validity via a focused fixture. Let me create document-57:

DTD-valid (exit 0)! But there's a `xref-fn(unresolved)` warning: `tableToCsv` converts cells (line 807) to *detect* complexity, calling `convertInline` → footnote lookup **before** my `collectFootnotes(tw)` runs. It's wasted work on a table it discards. Let me make `tableToCsv` detect complexity *before* converting any cells:

Now re-test doc-57 — the footnote should resolve and the warning should be gone:

Complete success for doc-57: zero raw JATS, all three resolve in cells (formula/cite/cross-ref), **table footnote hoists**, spans + align preserved, **DTD-valid re-export**. Now the full suite + byte-identity:

Full suite green (CLI 172/172, enscribe 38/38, data-module 52/52), **all existing fixtures byte-identical**. Now let me add explicit tests. Let me read the current pnas import-test block to extend it:

Let me extend the pnas block with explicit no-raw-JATS assertions:

Now the doc-57 block, after the #105 block:

Now the doc-57 re-export DTD block in jats-export.test.js, next to doc-56's:

CLI 178/178, all #106 + PNAS + doc-57 checks pass. Now the **secondary finding** — the two error equations. Let me find the KaTeX errors in the rendered pnas and trace their LaTeX source:

Two KaTeX errors — both the classic `mathml-to-latex` signature: `\left \left(` (a `\left` with no delimiter) and a trailing `\right` with no delimiter. Let me determine source vs converter — do the erroring equations have `<tex-math>` (source) or only MathML (converter)?

All 7 display equations are **tex-math (source)**, no MathML. Let me confirm the bad delimiters are literally in the source tex-math (not converter-produced):

Let me extract each formula's tex-math and count `\left` vs `\right` to find the imbalanced ones:

Source tex-math is **balanced** (`\left`==`\right` in all 11 blocks) — yet KaTeX sees imbalance. So the corruption is introduced by the importer's tex-math **cleaning**, not the source and not mathml-to-latex. Let me find `cleanTexMath`/`extractFormulaLatex` and the corrupted output:

`cleanTexMath` doesn't touch `\left`/`\right`. Let me compare the **post-import** LaTeX (in the `.emd`) against the balanced source to locate the corruption:

Now I can see the actual malformed LaTeX. Let me confirm whether `\left \left(` and the dangling `\right` are in the **source** tex-math or introduced by import:

Confirmed: the source tex-math literally contains `p_{v} \left \left( ...` — the malformation is in the **publisher's source LaTeX**, not introduced by import or a converter. So:

**Secondary finding (resolved):** Both erroring equations are `<tex-math>`-sourced (no MathML involved), and the source LaTeX is itself malformed — `\left \left(` (a `\left` with no delimiter argument) and a dangling `\right`, classic artifacts of the *publisher's* MathML→LaTeX tooling baked into the JATS. It is **not** a mathml-to-latex converter bug, and not an enscribe bug — the importer faithfully passes the source through (rewriting it silently would be wrong). The demo note's *attribution* to "source LaTeX" is correct; only the word "unbalanced" is imprecise (the counts balance; the delimiters lack arguments).

Let me find the demo-note source text to correct it:

Let me correct the import-note with the accurate facts:

Now rebuild the docs-site so `dist/demo-paper.html` reflects the new note and the now-resolving tables:

Demo paper rebuilt: new note present, old gone, **zero raw `<xref>`/`<inline-formula>`** in the dist. Let me file the orthogonal date-export bug, then run the full suite and review the footprint:

Heredoc broke on special chars (the documented WSL pitfall). Let me write the body via file:

Date bug filed as **#107**. Now spec/STATUS. Let me check what table.md says about the no-format escape hatch / complex tables:

table.md's stance (line 206) is that enscribe authoring stays minimal — #106 is an *import* behavior, so the importer header is its spec home. Let me add Slice 8 (#106) there:

Now a short note in table.md at the escape-hatch description, and the STATUS update:

table.md changed — regenerate data.js, run the full suite, and review the complete footprint:

Let me confirm whether `docs-site/dist` is tracked (my rebuild isn't in the footprint) and sanity-check the data.js diff:

`dist/` is gitignored (source `.emd` note is the right deliverable), and the data.js diff is exactly my note. One cleanup: the complex-table `noteDropped(... is not yet imported (dropped))` warning is now **false** — the table is fully converted, not dropped. Let me remove it:

Let me run the full suite once more to confirm everything's green after the cleanup:

All green (CLI 178/178, enscribe 38/38, data-module 52/52). Let me file the deferred Design B follow-up (per the agreed scope), then commit and close #106:

#108 filed. Let me reference it in the code comments that said "tracked separately/apart":

Now the commit. Let me write the message to a file (bridge-safe) and commit with `Closes #106`:

Committed `1e3e3a3` with `Closes #106`. Here's the slice report.

## 1. What changed

**The bug:** complex tables (colspan/rowspan/multi-row header) fell back to `serializeHtml`, which copied the JATS cell subtree **verbatim** → raw `<inline-formula>`/`<tex-math>`/`<xref>`/`<fn>` in cells, never rendered/resolved. The no-format escape hatch is emitted `{type:'raw'}` (never parsed), and JATS re-export emitted a content-dropping placeholder.

**The fix (Design A — cell conversion independent of layout):**
- **`jats-import/index.js`** — complex tables build a tree-resident grid stamp `node._htmlTable` (rows → cells with converted mdast via the same `convertInline` as the body), set `node.content` to the grid as escape-hatch HTML with *escaped enscribe inline source* (clean `.emd`), and collect `<table-wrap-foot>` `<fn>`s so in-cell footnotes hoist. `tableToCsv` now detects complexity *before* converting cells. Removed `serializeHtml`/`JATS_TO_HTML_TAG` (verbatim copier) and the now-false "dropped" warning.
- **`walkers/discover.js` + `walk-replace.js`** — descend `_htmlTable` cells' inline (same mechanism as `_parsedCells`), so cell refs/cites/notes/math resolve in place.
- **`handlers/table.js`** — render `_htmlTable` as a grid (thead/tbody, th/td, colspan/rowspan/align), before the raw branch.
- **`jats-export/index.js`** — emit a real `<table-wrap>`/`<table>` grid (spans preserved, `emitInlines` per cell), replacing the placeholder.
- **`demo-paper.emd`** — corrected the import-note (tables now convert; equation note refined). Docs-site rebuilt (`dist/` is gitignored).
- **table.md / STATUS / importer header** — documented; data.js regenerated.

12 files, +414/−33, plus new fixture `document-57-jats-complex-table.xml`.

## 2. What was tested

- **enscribe 38/38, CLI 178/178 (incl. xmllint DTD), data-module 52/52.**
- **Real paper (pnas):** rendered output has **zero** `<inline-formula>`/`<tex-math>`/`<xref>`/`table-wrap`; in-cell cross-ref resolves to `(see Table <a href="#tab:T2">…</a>)`; `<th colspan>`/`<th rowspan>` preserved.
- **doc-57:** grid stamp present; 2 header rows + rowspan/colspan preserved; `.emd` content has no raw JATS; render resolves formula/cite/cross-ref, **table footnote hoists**, spans kept; **JATS re-export DTD-valid**.
- **Existing fixtures byte-identical** (only span-bearing tables change).

## 3. What was deferred

- **`.emd` re-render of complex tables (Design B, #108)** — per your decision. Re-rendering the imported `.emd` doesn't re-resolve cells (escape-hatch content isn't parsed); needs a pipeline-side inline-in-raw-HTML-cell parser. The `.emd` itself is clean.

## 4. Drift findings (filed, not silently fixed)

- **#107 — date round-trip:** imported `<pub-date>` re-exports as an invalid `<pub-date or date (in history)>` element (the `<date>` vocab's `jats_counterpart.element` is prose used as a tag name). Pre-existing, orthogonal to tables; it's the *only* thing blocking full-pnas re-export DTD-validity (my table grid is DTD-clean, proven by patching just that tag). It's a design question (which JATS date element), so filed, not fixed.
- **Equation finding (resolved, no code change):** the two KaTeX-error equations are `<tex-math>`-sourced (no MathML), and the source LaTeX is itself malformed — `\left \left(` and a dangling `\right`, artifacts of the *publisher's* tooling. **Not** a mathml-to-latex converter bug and **not** an enscribe bug; passing malformed source through faithfully is correct. The demo note's "source LaTeX" attribution was right; I only fixed "unbalanced" → "malformed (missing delimiter argument)" and the false "cross-references still resolve" claim.

`Closes #106` takes effect when you push. Recommend a browser glance at `docs-site/dist/demo-paper.html` (Tables 1–4) to confirm the grids look right — I verified structure (spans, resolved links, KaTeX) but can't open a browser.