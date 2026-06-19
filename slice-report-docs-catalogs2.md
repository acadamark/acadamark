# Slice report — Docs site: the catalog rewrite (#223 / #246)

Branch `docs-catalogs2` off main `10d12c7` (solo). Four commits; **report written before the merge** per
the prompt. The Documentation catalogs stop being injected HTML and become **`.emd` the website type
renders**, generated from the vocab source so they still can't drift.

## What changed (4 commits)
1. **`4ece570` — re-apply `buildOnThisPage` fix + test.** A heading inside a `<frame>` (→
   `<figure class="frameable-border">`) or `<aside>` is excluded from the on-this-page rail
   (`!el.closest('figure, aside')`), so a catalog's demo box doesn't pollute the rail. Ships with a
   focused unit test.
2. **`732d765` — `gen-reference.js` emits `.emd`.** `buildLayer1Catalog` / `buildShorthandCatalog` now
   return an `.emd` page (`<meta type=article>` + content). Per element:
   - a `<section #l1-NAME | \`<tag>\`>` heading — the tag is backticked so it renders as code, never
     parsed as a live tag;
   - the spec as a facts line + a markdown **pipe table** of attributes (replacing `<table class=ref-attrs>`);
   - the vocab prose as enscribe (`prepareBody` rewrites `name.md` links → catalog `#l1-…` anchors; the
     cross-catalog links use `?page=…`);
   - each example as a `<code>` fence (verbatim source) + a `<frame>` (live render; `#id`s stripped in the
     live copy so repeated demos don't collide).
   - **Structural / root-only entries** show source + a static note instead of a live box, via an explicit
     allowlist `ROOT_ONLY = { book, article, book-part, book-body, book-front, book-back, article-body,
     article-front, article-back }`.
   `buildConfigGrid` (the #239 grid) stays HTML — it is injected into the Rendering guide, not a catalog.
   **build.js (option i):** the catalogs are ordinary `.emd` pages now (`kind: 'page'`); the special
   catalog `kind`s are gone — build.js renders them like `design.emd`. `docs:gen` (`gen-catalogs.js`)
   writes `sources/{layer1,shorthand}-catalog.emd` (build product, gitignored) before `docs:build` /
   `docs:build-live`, so static and live read one generated source. A catalog integration test (mounts the
   Shorthand catalog through the type: code+frame, no errors, no rail leak, no duplicate ids; data-checks
   the Layer 1 catalog's frame copies).
3. **`ef328ab` — master.** The site nav's Documentation group gains `<item src="sources/shorthand-catalog.emd">`
   + `<item src="sources/layer1-catalog.emd">`.
4. **`e69c167` — dogfood fixes.** The cross-page slug (`?page=layer-1-catalog`, matching
   `slugify("Layer 1 catalog")`) and demo-box float-number suppression (below).

## What was tested
```
enscribe 75/75 (incl. 3 new catalog tests) · cli 233/233 · layer1 49/49
docs:build (static) builds · docs:build-live builds (site.emd + 8 children)
```

## Dogfood (by jsdom mount of the real `site.emd`)
- Both catalogs are reachable from the Documentation dropdown (`?page=shorthand-catalog`,
  `?page=layer-1-catalog`) and render through the type — chrome, single-column, 128 sections, **0 render
  errors**, cross-catalog links resolve.
- Each example shows a verbatim `<code>` source block + a live `<frame>` render box.
- No demoed section leaks into the on-this-page rail (the Commit-1 fix).
- **"Figure N" on the boxes:** the many `<frame>` wrappers were numbering in a multi-frame document (199
  labels). Suppressed at SOURCE (`<frame -numbered>` + `-numbered` on float tags in the frame copy and the
  live prose, outside code fences) — this works in **every** render path, where a page-scoped `<config>`
  did not (the static article render ignores it for frames; the live website applies only one page's
  config). Down to **15**, which are the intentional `+numbered` demos (they demonstrate numbering).

## What was deferred / known issues
- **The `FEATUREDEXAMPLES` intros** (`sources/{enscribe-shorthand,layer1}.emd`) — the separate small
  follow-up the prompt scoped out; not touched.
- **Residual demo "Figure N" (15):** the explicit `+numbered` examples still number (correctly — they
  demonstrate numbering) and accumulate (Figure 1…15). Acceptable; a per-demo reset would need
  isolated-render support.
- **Duplicate footnote ids in the live Layer 1 catalog:** a few `note-N` ids repeat because the article
  `note-scope` default restarts footnotes per entry-section, so each entry's `<note>` demos collide. A
  doc-wide `<config note-scope=document>` fixes the *static* build but not the multi-page *live* site (the
  website per-page-`<config>` gap, tracked from the website-numbering slice). Minor (browsers resolve to
  the first id); flagged for the config-threading follow-on.
- The **website per-page-`<config>` gap** is the root of both the float-numbering and footnote-id wrinkles
  on the live multi-page site — the proper fix is to thread each page's `<config>` in the website assembly
  (a tracked numbering follow-on); the source-level `-numbered` suppression is the catalog-local mitigation.

## Coherence check
- **Spec ⇄ code:** none touched (a docs-site generator + a website-asset fix). **Issues:** #223/#246 (a
  dogfood slice; closes neither). **STATUS:** unchanged (no type capability changed). **User docs:** the
  catalogs ARE user docs — regenerated, can't-drift preserved. **Gallery:** n/a (the gallery is separate;
  unchanged). **Rule 2:** the catalogs are generated from the single vocab source.

## What remains (Slice 3 — consolidation, not this slice)
README homepage; retire `index.emd` / `authoring-guide` / `layer1-reference` / `book-build` → a User guide;
the JATS imported-articles listing (`jats.emd`); Try It; Live/Static.

## Merge / housekeeping
```
branch: docs-catalogs2 (4ece570 · 732d765 · ef328ab · e69c167) → main (--no-ff)
main:   10d12c7 (solo) — push left for Ariel
generated .emd: gitignored (sources/{layer1,shorthand}-catalog.emd) — regenerated by docs:gen
```
