# Slice report — docs-site intros + report-first governance (#223 / #246 / #241)

Two unrelated-but-small pieces, committed separately, off a freshly-verified main.

---

## Commit 1 — report-first governance

**What changed.**
- `notes/session-start.md`: replaced the line `**Slice reports** go to `~/<filename>` (your choice of name).`
  with the report-first convention. This **reconciled a contradiction** rather than bolting a parallel rule
  onto a contradictory one: the old line said reports go to `~/`, but the previous slice's report was
  **committed in the repo** (`docs(slice): catalog rewrite slice report`), and this slice's prompt says "to
  the worktree." Keeping both would have left the bootstrap doc self-contradictory.
- `notes/coding-conventions.md`: added `## 6 · Report-first finish protocol` (the implementer reads this at
  the start of every build/fix session, so the rule holds even when a prompt is terse or a session compacts).

The convention, stated plainly in both:
> Every slice ends by writing `slice-report-<task>.md` to the worktree as the **first** finish step — before
> the merge. A slice is not complete until that file exists. A resumed/post-compact session rewrites it;
> never leave a stale in-progress report as the final artifact.

**Practiced here:** this report was written **before** the merge, as the first finish step.

---

## Commit 2 — the `FEATUREDEXAMPLES` intros

### The bug (confirmed, not assumed)
`docs:build-live` renders `site.emd` through the CLI **website type**, which does **no** marker
substitution. The intros' `FEATUREDEXAMPLES` placeholder was only substituted by `build.js` (the *static*
build), so the live dogfood showed the literal word. Verified in the pre-existing `dist-live/sources/*.emd`.

### The path taken: **generate**, not hand-author (your call)
The simplest path would have been to hand-author the handful of examples. You chose to **generate** them as
`.emd` instead — the better call: it keeps `featured-elements.js` (the curated `FEATURED_*` lists), the
`layer1_html` field, and the **#241 guard** alive *by using them*, keeps the examples vocab-generated and
can't-drift, and preserves the Layer 1 intro's three-part teaching point. Nothing was orphaned.

Architecture (mirrors the catalog convention established last slice — *one generated source, both targets*):
- **`gen-reference.js` — `buildFeaturedIntro(set)`** (new): emits the example blocks as `.emd`, reusing the
  catalog's `exampleEmd` (the `<code>` + `<frame -numbered>` emitter), `stripIds`, `suppressFloats`,
  `emdTag`, `readElements`. Shorthand = two-part (`<code>` source + `<frame>` render). Layer 1 = **three-part**
  (`**Shorthand**` `<code>` + `**Layer 1**` `<code>` off `layer1_html`, elided for math, + `**Rendered**`
  `<frame>`), per your "keep three-part" decision.

  ```js
  export function buildFeaturedIntro(set) {
    const list = set === 'layer1' ? FEATURED_LAYER1 : FEATURED_SHORTHAND;
    const byName = new Map(readElements().map((e) => [e.name, e]));
    const lines = [];
    for (const tag of list) {
      const ex = byName.get(tag)?.spec?.shorthand_examples?.[0];
      if (!ex || !ex.source) { lines.push(`<sub-section | ${emdTag(tag)}>`, '', `*⚠ no example for ${emdTag(tag)}*`, ''); continue; }
      lines.push(`<sub-section #featured-${tag} | ${emdTag(tag)}>`, '');
      if (set === 'layer1') lines.push(...featuredLayer1Example(ex));
      else lines.push(...exampleEmd(ex.source, null));
    }
    return lines.join('\n');
  }
  ```
- **`gen-catalogs.js`** (run by `docs:gen`): reads each authored `.template.emd`, injects `buildFeaturedIntro`
  at the `FEATUREDEXAMPLES` marker, writes the served `.emd`. **FUNCTION** replacement (not a string) so `$`
  in math sources (`<$ … $>`) isn't read as a replacement pattern. **Fails loud** if the marker is missing.
- **Template/generated split** (mirrors the catalogs, gitignored generated `.emd`):
  - `git mv` the authored intros → `enscribe-shorthand.template.emd` / `layer1.template.emd` (**committed**).
  - `docs:gen` writes the served `enscribe-shorthand.emd` / `layer1.emd` (**gitignored** build product).
  - `site.emd` needed **no edit** (it already references the served clean names — which are now generated).
- **`build.js`**: intros become `kind:'page'` (dropped the `featured-intro` kind, its render branch, and
  `featuredSet`); `sourceUrl` points "view source" at the committed `.template.emd` (the served `.emd` is
  gitignored — not on GitHub); removed from the `livePages` exclusion (they render live like the catalogs now).
- **Dead-code removed** (genuinely dead once examples are `.emd`, not HTML): `gen-gallery.js`'s
  `buildFeaturedExamples` + its private helpers + the `FEATURED_*` import (−84); `site.css`'s `.featured-*`
  block (−132).
- **Prose fixed** for the stacked (not side-by-side) layout: shorthand intro "on the left… on the right" →
  "then its rendered result"; layer1 intro "The Layer 1 **column**" → "The Layer 1 **block**".
- **Comments reconciled** (drift I introduced): `featured-elements.js` header + `featured-elements.test.js:28`
  described the old "renders live HTML via VOCABULARY" mechanism; updated to the `.emd`-generation mechanism.

Diff stat (tracked files): **10 files, +114 / −252** (net removal — the dead HTML path + CSS).

### Visible-output verification (this is a visible-output slice)
- `docs:build` (static) and `docs:build-live` (dogfood): **both build clean**; **no literal `FEATUREDEXAMPLES`**
  in either render path (static HTML, generated served `.emd`, live-copied `.emd`, dist-live output).
- Eyeballed the rendered static HTML (== live, by render parity): 8 example boxes per intro; the Layer 1
  three-part renders correctly (`<fig>` heading as code, **Shorthand**/**Layer 1** `<code>` blocks with the
  verbatim canonical markup, **Rendered** `<figure class="frameable-border">` with the fig and `-numbered`
  suppressing "Figure N"); elided-math `layer1_html` shows verbatim in `<code>`, math renders in the frame.

### Review-driven fix (caught by an adversarial multi-agent review of the diff)
The review surfaced **one real, in-scope regression this slice introduced**: the intros carry
`<config toc toc-location=right>`, and moving the examples to in-source `.emd` put the live `<section>` /
`<sub-section>` **demo** sections (inside the example `<frame>`s) into the tree the ToC walker (`collectEntries`)
traverses — so they leaked into the right-rail as spurious **"Untitled"** entries (2 in shorthand, 1 in layer1).
The old path spliced pre-rendered HTML in *after* the ToC was built, so the demos were never walked.

**Fix (docs-only):** bound the rail with `toc-depth=2`. The demo sections sit at entry-tree-depth 3 (inside a
`<frame>` under a featured `<sub-section>` heading); `pruneForToc` is depth-based, so `toc-depth=2` keeps the
top sections + the 8 featured-construct sub-sections (a genuinely useful per-construct rail) and prunes the
depth-3 demos. Verified: **0 "Untitled"** entries in both intros, rail lists the 8 constructs cleanly. This
respects the intros' *authored* `<config toc>` intent and touches no interpreter code.

---

## What was tested
```
npm test                  → enscribe OK: 75/75 · cli OK: 233/233 · layer1 49/49 data-module
                            PASS: featured-elements — 8 shorthand + 8 Layer 1 featured tags resolve (#241 guard)
                            exit 0
cd packages/enscribe && npm run verify
                          → OK: 75/75 suites passed; Rendering 66 fixture(s)
git diff test/fixtures/   → EMPTY (output-neutral proof: no parser/interpreter change)
npm run docs:build        → builds; intros kind:'page'; 0 literal FEATUREDEXAMPLES
npm run docs:build-live   → exit 0; live sources carry toc-depth=2 + 8 featured + 0 marker
```
Correctness model: **output-adding** for the docs-site (new intro example boxes — reviewed, intended) and
**output-neutral** for the test fixtures (empty diff). The #218 render-parity test ("the same `<config toc>`
produces the listing identically under static AND live") passing means the live ToC == the static one (0
"Untitled").

## What was deferred (deliberately not done)
- **The robust `collectEntries` frame-skip.** `toc-depth=2` fixes the leak *for this content* (demos are
  depth-3). The general fix is to extend commit **4ece570**'s principle — "skip headings inside `<frame>`/
  `<aside>` demo boxes" — to the `<config toc>` collector (`collectEntries` in `toc.js`), which 4ece570 never
  reached (it covered only the book on-this-page rail). That's a cross-cutting interpreter change touching all
  three `collectEntries` callers + a test, which doesn't belong rushed into a docs slice. **Follow-up.**
- I did **not** add the featured constructs to the rail as an "enhancement" beyond what `toc-depth=2` yields,
  and did **not** change book/article behavior (untouched, fixtures byte-identical).

## Drift findings (adjacent / pre-existing — flagged, not fixed; all verified real by the review)
1. **Catalog "view source" 404 (pre-existing, #223/#246).** The two catalog pages have no `sourceUrl`, so
   their footer links at their *gitignored* generated `.emd` (404 on GitHub). This slice fixes exactly that
   class for the intros (via `sourceUrl` → committed `.template.emd`), but the catalogs have **no committed
   template to point at** — the fix is a design choice (point at the vocab `elements/*.md`, or suppress the
   footer for fully-generated pages). Surface to the chat.
2. **`rendering-guide`'s `CONFIGOPTIONSGRID` leaks the same way (pre-existing).** Identical bug, one marker
   over: substituted only at build time, but `site.emd:13` includes the page so the live type render shows the
   bare word. The natural follow-on is to move the `<config>` grid into a generated `.emd` the same way the
   featured examples were moved here. Not touched by this slice.
3. **Intro prose `.html` cross-links break in the live SPA (pre-existing, newly *reachable*).** The intro
   prose uses `.html` links; the live website router only handles `?page=` links (and `rewriteCrossPageHrefs`
   only rewrites `#anchor` cross-page refs, not authored `.html` hrefs). This slice makes the discrepancy
   reachable by putting the intros into the live path. The intros should adopt the catalog's `?page=slug`
   convention — and note the **live-vs-static slug split**: the catalog links use `?page=layer-1-catalog`
   (dash) while `build.js`'s static slug is `layer1-catalog` (no dash); that naming needs reconciling.

## Coherence check (spec ⇄ code · Issues ⇄ code · STATUS · Rule 2)
- **spec/comments ⇄ code:** the only spec-side drift was `featured-elements.js`'s comment + the test comment
  (mechanism description), fixed in this slice. `STATUS.md:117` reads accurately at altitude (examples
  rendered live from the vocab source, can't-drift, Layer 1 three-part) — no edit needed.
- **Issues ⇄ code:** #241's guard stays green and now guards the `.emd` generator (the lists are *used*, not
  orphaned). The CLAUDE.md generated-artifacts table needs no entry — the intro `.emd`, like the catalog
  `.emd`, are gitignored build product (not committed-and-guarded artifacts).
- **Rule 2:** the ToC stays a computed product (`<config toc>` → `applyConfigToc`); the featured examples are
  vocab-generated source rendered through the type. Coherent.

## Merge
Solo session: merged `--no-ff` to `main`, left the push for you.
