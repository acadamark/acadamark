# Code-health audit — enscribe interpreter trunk (READ-ONLY findings report)

**Scope:** the interpreter trunk under `packages/enscribe/src/interpreter` (the gate, config/allowlists, numbering+toc, article/book structuring, the compiler) plus its vocab inputs in `packages/layer1-vocabulary`. **Method:** six parallel read-only survey readers, one per subsystem, each scoring against the four lenses below, cross-checked against my own direct re-reading of the four load-bearing facts. **Constraint honored:** no code was changed, no fixtures regenerated, nothing committed or filed. This pass only maps.

**The four lenses.** (0) *Category honesty* — does processing branch on a thing's KIND, or collapse kinds via side-checks? (1) *Special-case sprawl → consolidation.* (2) *Repetition → unification (single source of truth).* (3) *Over-broad → split.*

**Class legend.** `tidiness` = readability/maintainability only, no behavior at stake. `latent-risk` = today's behavior is correct, but the structure invites a *silent* future regression (a drift that no test would catch until it ships wrong output).

---

## The reframe — read this before the catalog

Twenty-odd individual findings came back, but most of them are **one architectural gap wearing many costumes.** The gap:

> **The #166 vocabulary taxonomy was designed as a `category` field on every Layer 1 element (`configuration`, `structured-data-containers`, `storage-hosts`, `sections`, …) — and the interpreter never reads it.** (Verified: a grep for `.category` / `semantic_role` across `src/interpreter` returns only an unrelated frameable `kind` parameter and a comment. The field is inert.)

Because the one declared source of "what KIND is this tag?" is not wired in, **every place that needs to know a tag's kind re-encodes that knowledge locally** — as a hand-maintained constant, a parallel allowlist, or a `tagname === 'config'` side-check. That single gap is the root of:

- the config-vs-element side-checks (Lens 0: F1, F2),
- the section-tagname sets duplicated across six sites (Lens 2: F3),
- the book-part region sets duplicated across three sites (Lens 2: F4),
- the back-matter and apparatus tag sets duplicated (Lens 2: F5, F11),
- the structured-elements / frameable parallel registries (Lens 2: F12).

So the report is organized **not** as a flat list but as **five candidate slices in recommended execution order** (R1–R5), each grouping the findings that share a root and a fix. The two required summaries (refactor order + the book-navigation question; and the leave-alone list) follow the catalog.

A note on convergence: where five or six independent readers flagged the same construct, I treat that as signal, not noise, and say so per finding ("flagged by N/6"). The section-tagname duplication was flagged by **all six**.

---

## Prioritized catalog

### R1 — Section & book-part source-of-truth consolidation  *(do this FIRST; see the book-nav question below)*

These are the duplications that sit **exactly where book-navigation work will land** (numbering, `toc.js`, book-structuring), and two of them are `latent-risk`: a drift produces *silently wrong chapter numbers*, which no isolated ToC-or-numbering test would catch.

#### F3 — Section tagname set defined in six places  ·  Lens 2 · single-source-of-truth · **flagged by 6/6**
- **Where:** `plugins/numbering.js:139` (`SECTION_TAGNAMES` array) and `:483` (`SECTION_TAG_SET`, a Set wrapper of the same array); `lib/toc.js:31` (`NAV_SECTIONS` — the same three plus `book-part`); `plugins/normalize-to-canonical.js:340–343` (`HEADING_DEPTH_TO_TAGNAME`, depth→tagname); `lib/ast-helpers.js:15–20` (`sectionDepth`, the same three as an if-ladder); `master-document/book-scaffold.js:68` (the same three as a regex `/^(sub-section|sub-sub-section|section)$/`).
- **What:** `['section','sub-section','sub-sub-section']` is hand-written six ways in five files. The sets are aligned *today*; they share no common origin. `NAV_SECTIONS` deliberately adds `book-part` (a region, not a section depth) — a real distinction that is currently expressed by copy-and-edit rather than by derivation.
- **Recommendation:** one authority — e.g. `lib/section-kinds.js` exporting `SECTION_TAGNAMES` (frozen) plus a derived `SECTION_DEPTH_MAP` and `NAV_ITEM_TAGNAMES = [...SECTION_TAGNAMES, 'book-part']` with a comment justifying the `book-part` addition. `numbering.js`, `toc.js`, `normalize-to-canonical.js`, `ast-helpers.js`, and `book-scaffold.js` import from it.
- **Won't change:** which nodes each walker visits; ToC structure; numbering order. Output-neutral (empty fixture diff is the proof).
- **Effort S · Risk low** (read-only constant, never mutated). **Class: latent-risk** (the divergence window is invisible to single-subsystem tests).

#### F4 — Book-part region sets duplicated, with `numbering` holding an implicit complement  ·  Lens 2 · single-source-of-truth · **flagged by 3/6**
- **Where:** `plugins/book-structuring.js:47–57` (`BOOK_PART_FRONT_TYPES` = preface/foreword/dedication; `BOOK_PART_BACK_TYPES` = appendix/glossary/colophon/afterword; body = the rest); `plugins/numbering.js:163–165` (`BODY_BOOK_PART_TYPES` = chapter/part/introduction/conclusion/other, defined independently, used at `:355` and `:636` to gate chapter-counter resets).
- **What:** `numbering` re-derives "which book-parts are body chapters" as its own literal set. The dependency on book-structuring's routing is **a comment only** (`numbering.js:159` says it "mirrors book-structuring.js's region-routing"). If a future reorg moves a type between regions (book-nav is exactly the kind of work that might), the chapter counter resets at the wrong boundaries and cross-refs silently read "Figure 2.1" where they should read "1.1".
- **Recommendation:** export the front/back sets from book-structuring (or a shared `lib/book-regions.js`); in numbering, compute `BODY_BOOK_PART_TYPES` as the complement, so the two can never disagree. Optionally annotate the vocab `meta.md` `book-part-type` values with their region.
- **Won't change:** counter-reset logic, region routing, chapter semantics.
- **Effort S · Risk low.** **Class: latent-risk** (silent miscount on drift).

#### F5 — Back-matter tag set duplicated  ·  Lens 2 · single-source-of-truth · **flagged by 2/6**
- **Where:** `plugins/article-structuring.js:45` (`BACK_MATTER_TAGS`) and `plugins/book-structuring.js:61` (`BOOK_BACK_TAGS`) — both `['config','bibliography','note-list']`, verbatim. `bibliography.js:11` even comments that the two "should be" shared.
- **What:** add a back-matter element to one and articles vs books route it differently.
- **Recommendation:** one shared constant; keep each plugin's trivial `isBackMatter` predicate local.
- **Effort S · Risk low.** **Class: tidiness.**

**R1 rollup:** F3 + F4 + F5, one or two tiny shared-constant modules. Output-neutral correctness model. This is the cheapest high-value slice in the report and the only one I argue should *precede* a feature.

---

### R2 — Compiler DRY tidy  *(independent; schedule when convenient)*

Pure mechanical de-duplication inside `index.js` and the asset loaders. All behavior-neutral, all low risk, none coupled to book-nav.

#### F6 — `options.X ?? configMap.get('X') ?? default` repeated per setting  ·  Lens 0/2 · **flagged by 2/6**
- **Where:** `index.js` ~`:743–745` (show-source), `:820` (note-position), `:883` (theme) — the same three-tier fallthrough hand-written each time.
- **Recommendation:** `resolveOption(options, optKey, configMap, cfgKey, default)`. Apply at all sites.
- **Won't change:** the priority order (option > config > default). **Effort S · Risk low. tidiness.**

#### F7 — Lazy-asset cache pattern duplicated 6×; element factories duplicated 4×  ·  Lens 1/2 · **flagged by 1/6**
- **Where:** `index.js:236–320` (`getKatexCss`, `getTippyCss`, `getTippyLightBorderCss`, `getPopperJs`, `getTippyJs`), `assets/font-loader.js`, `assets/hover-preview-assets.js` — each `let _x=null; function getX(){ if(!_x) _x=read(); return _x; }`. Separately, `index.js:375–411` has `makeStyleElement` / `makeScriptElement` / `makeLinkElement` / `makeScriptSrcElement`, four ~7-line hast factories.
- **Recommendation:** a `createLazyAsset(loader)` factory and a single `makeAssetElement(kind, content, meta)` builder; keep thin named wrappers for readability.
- **Effort S · Risk very low. tidiness.**

#### F8 — `resolveCounterResetScope` ≈ `resolveNoteScope` (config-enum-with-book-default)  ·  Lens 1 · **flagged by 1/6**
- **Where:** `plugins/numbering.js:182–192` and `plugins/note-placement.js:189–196` — same shape: read a config enum, validate against an allowed set, pick a book-vs-article default.
- **Recommendation:** `resolveConfigEnum(config, key, allowed, bookDefault, articleDefault)` in a shared `lib/config-helpers.js`.
- **Effort S · Risk low. tidiness.**

#### F9 — Strict-mode detect+reparse implemented twice  ·  Lens 0/2 · **flagged by 1/6**
- **Where:** the `resolveStrictMode` plugin (`index.js:~622`) and `liftToCanonicalMdast` (`index.js:~1020–1050`) both run `detectStrictMode` then conditionally re-parse with the registers-off processor. `liftToCanonicalMdast` is a genuine standalone entry point (the `enscribe lift` CLI) so it can't call the plugin — but the *logic* can be a shared pure `applyStrictModeReparse(tree, option, processors)` that both call; only the plugin stamps `file.data`.
- **Effort M · Risk medium** (two call contexts; test both `enscribe lift` and main render). **Class: tidiness.**

---

### R3 — Split `compileToHtml`  *(independent; moderate; do on its own with snapshot proof)*

#### F10 — `compileToHtml` does 8–14 jobs in ~250 lines  ·  Lens 3 · one-job-per-construct · **flagged by 4/6**
- **Where:** `index.js` ~`:736–973`.
- **What:** mdast→hast + smart typography + asset detection + two ToC paths + margin/sidenotes + strict flag + three script injections (chapter-nav, on-this-page, scroll-spy) + fonts + theme + KaTeX + hover-preview + DSL asset resolution + formatting + static DSL replacement — all in one body with independent `if` guards and an order that matters (CSS before JS, scripts prepended, static DSL post-format). Not a bug; the comments are good. But adding any one feature requires reading all of it, and the order constraints are implicit.
- **Recommendation:** extract the post-compile injection phase into a sequence of named, individually-testable `inject*(hast, …)` helpers (`injectToc`, `injectMarginLayout`, `injectStrictFlag`, `injectScripts`, `injectFonts`, `injectTheme`, `injectKaTeX`, `injectHoverPreview`, `injectDslAssets`). The body becomes a readable call sequence whose order is the documented constraint.
- **Won't change:** mutation order, injected-node order, byte-identical output. **Effort M · Risk moderate** (mechanical but large; snapshot tests on a multi-feature fixture — margin + toc + theme + dsl — catch any order slip). **Class: tidiness.**
- **Sequencing note:** book-nav adds *another* script-injection pass (chapter-nav across pages). If R3 hasn't happened by then, that's mild pressure to do it around the same time — but it is **not** a blocker for book-nav.

---

### R4 — Config allowlist & coercion unification  *(independent; latent-risk DRY)*

#### F11 — `CONFIG_KWARGS` (Map) and `CONFIG_BOOLEAN_KWARGS` (Set) are parallel lists  ·  Lens 2 · **flagged by 2/6**
- **Where:** `lib/apparatus-allowlists.js:40` (the allowlist Map, with live/reserved status) and `:134` (the boolean-subset Set, added in #219).
- **What:** boolean-ness is stored *beside* the allowlist instead of *in* it. Add a boolean config key to the Map without adding it to the Set and it is accepted but never bare-promoted — a `<config newflag>` that silently does nothing. This is the single-source-of-truth smell I flagged when #219 landed.
- **Recommendation:** one Map whose values are `{status, type}` (`type: 'boolean' | 'valued'`); derive both predicates from it.
- **Effort M · Risk none behavioral** (touches all call sites). **Class: latent-risk.**

#### F12 — Ad-hoc boolean coercion scattered across consumers  ·  Lens 1 · **flagged by 1/6**
- **Where:** `lib/bool-kwarg.js:33` (`readBoolKwarg`, `!== 'false'`), but pure config consumers re-coerce differently: `lib/toc.js:417–419` (`=== true || 'true' || ''`), `index.js:745` (`=== true || 'true'`), `plugins/note-placement.js:190` (direct string equality).
- **What:** "is this config value true?" is answered four inconsistent ways. A bare `<config toc>` stores `'true'`; `<config toc=''>` would store `''` — and only some readers treat `''` as true.
- **Recommendation:** a single `readConfigBool(configMap, key, default)` parallel to `readBoolKwarg`; audit what bare `<config X>` actually stores and standardize on it.
- **Effort M · Risk medium** (coercion semantics must match what discovery stores). **Class: latent-risk.**

#### F13 — `APPARATUS_TAGS` / `SUPPRESSED_APPARATUS` hand-coded parallel lists  ·  Lens 2 · **flagged by 1/6**
- **Where:** `plugins/article-structuring.js:62` (`['meta','config','data','library']`) and `interpret-plugin.js:68` (`['data','library']`).
- **Recommendation:** derive the suppressed subset from the apparatus set (or, if F14/R5 wires the category field, derive both from a category scan).
- **Effort S · Risk low. tidiness.**

---

### R5 — Make the vocab `category` field load-bearing  *(the deep one — its own dedicated slice; do NOT gate book-nav on it)*

This is the root from the reframe. It is the most consequential item and the **only** one that touches the spec's *meaning*, so per the project's two-surface discipline it should be a **chat-surface design decision first**, then an implementation slice — not decided unilaterally in code.

#### F14 — The #166 `category` taxonomy is declared but consumed nowhere  ·  Lens 0 · category-honesty · **flagged by 1/6 (root of ~5 others)**
- **Where:** `packages/layer1-vocabulary/elements/*.md` (every element carries `category:`); **no** read of `VOCABULARY[tag].category` anywhere in `src/interpreter` (verified). Instead the interpreter maintains parallel hand-coded lists — `STRUCTURED_ELEMENTS` (`core/structured-elements.js`), `APPARATUS_TAGS`, `BACK_MATTER_TAGS`, `BODY_BOOK_PART_TYPES`, `FORMAT_WORD_HOSTS`, the section sets — each re-encoding a kind the vocab already declares.
- **What:** the field looks like decided-and-abandoned design. Either it should be the source of truth those lists derive from, or it should be explicitly documented as human-only organization. Right now it reads as drift.
- **Recommendation (the decision):** **(a)** wire it — derive `STRUCTURED_ELEMENTS`, apparatus/back-matter/section sets from a one-time `category` scan at module load; **or (b)** document in `DESIGN.md` that `category` is an organizing annotation the interpreter intentionally does not consume, and that the hand-coded lists are authoritative. `doc-type.js` (which single-sources the document class from `<meta type>` and has every downstream plugin read `file.data`) is the **model to copy** if (a) is chosen.
- **Won't change (if left as-is):** nothing. **If wired:** behavior changes only when a vocab `category` is edited — which becomes a backward-compat surface.
- **Effort M–L · Risk:** wiring makes the field load-bearing (a new compat burden); leaving it deepens the appearance of debt. **Class: latent-risk.**

#### F1 — Config-vs-element collapsed into an `isConfig` side-check  ·  Lens 0 · category-honesty · **flagged by 5/6**  *(the "finding zero" you flagged, plus its sibling)*
- **Where:** `plugins/normalize-to-canonical.js:1055–1074` (`promoteNodeBareBooleans`): `const isConfig = node.tagname === 'config'` then `if (isConfig) node.kwargs[p]='true'; else node.booleans[p]=true`. Its sibling: `:1049–1052` (`isKnownBoolean`) **also** side-checks `tagname === 'config'` to choose between `CONFIG_BOOLEAN_KWARGS` and `VOCABULARY[...].booleans`.
- **What:** `<config>` (a configuration kind — sets document settings) and `<section>` (a content element — sets its own attributes) ride the **same** bare-positional-promotion path, distinguished only by a tagname side-check. Behavior is correct; the kind boundary is invisible. This is the same shape as the **honest** split elsewhere (`liftConfigKwargs` vs `liftStructuredKwargs`) — so the gate is internally inconsistent about when it branches on kind.
- **Recommendation:** split into `promoteConfigBareBooleans` / `promoteElementBareBooleans` (and `isKnownConfigBoolean` / `isKnownElementBoolean`), dispatched on kind at the call site. Confirmed there are no *other* siblings: bare positionals only promote for config-kwargs and element-booleans; no third tag participates.
- **Won't change:** the promoted result (both `<config toc>` and `<config toc=true>` still land identically). **Effort S · Risk none** (byte-identical fixtures). **Class: tidiness** (it is honesty/readability, not a bug).

#### F2 — `<config>` is read through `node.kwargs` like an element attribute bag  ·  Lens 0 · category-honesty · **flagged by 2/6**
- **Where:** `plugins/config-discovery.js:56` (reads `node.kwargs` as if config were an element) and `normalize-to-canonical.js:702–740` (`liftConfigKwargs` validates against `CONFIG_KWARGS`).
- **What:** the *entire* config path is element machinery with a config allowlist bolted on. This is correct and arguably fine — but it is the structural reason F1 exists, and the place an honest kind-dispatch would intervene.
- **Recommendation:** fold into the F14 decision. One reader proposed an earlier, cleaner gate: split the tree into config-nodes (extract to the settings Map, drop from the content tree) vs content-nodes (normalize as today) **before** the main walk — which would make config genuinely a different processing path rather than an element with side-checks. That is an `M`, `latent-risk` change (must preserve document-order config merging) and belongs to R5, not earlier.
- **Effort M · Risk medium** (order-of-merge must be preserved). **Class: latent-risk.**

**R5 rollup:** F14 (the decision) + F1 + F2 (the config-path honesty that follows from it). This is the architectural capstone. It is `latent-risk`, not an active bug, and it is spec-touching — so it earns a chat-surface design pass and its own slice, and it must not block the feature work.

---

### Findings deliberately left as low-priority / borderline (catalogued, not slated)

These came back from the readers but I am **not** recommending action, with reasons — recording them so a future pass doesn't re-litigate:

- **Two ToC *functions* (`applyToc` vs `applyConfigToc`)** — `lib/toc.js:373` / `:530`, dispatched at `index.js:793–800`. Flagged by 5/6, but the readers' own verdict (and mine) is **by-design**: legacy `applyToc` is the *live* path for the book reading interface (chapter rail, prev/next, on-this-page) and is still exercised by `FIXTURE_OPTIONS` (`document-54-toc-scrollspy`, `master-book` render with `{toc:true}`) — it is **not** vestigial, despite the #207 docs migration moving docs off the build option. `applyConfigToc` is the article/docs contents-listing path. Merging them into one `applyTocInternal(cfg)` is an `L`-effort refactor that would *obscure* the two distinct surfaces. **Leave the two functions split.** The only worthwhile touch is folding `NAV_SECTIONS` into the shared section constant (already covered by R1) and, *if* book-nav forces it, sharing the `buildList`/`buildCollapsibleList` recursion (F-shared below).
- **Legacy `toc` build-OPTION vs `<config toc>` precedence** — `index.js:793–806`. Config silently wins if both are present, with no warning. `latent-risk`, but dormant (production relies on `<config toc>`). If acted on, it's a one-line `console.warn`. Worth a comment now; not worth a slice.
- **`buildList` vs `buildCollapsibleList` share identical recursion** (`toc.js:158` / `:483`); **`titleParts` (hast) vs `titleTextOf` (mdast)** duplicate title extraction (`toc.js:71` / `book-scaffold.js:49`); **`collectEntries` vs `collectSections`** duplicate the section walk (`toc.js:92` / `book-scaffold.js:65`). All real Lens-2 repetition, all `M` effort, all crossing the hast/mdast boundary (the reason they're separate). **Defer:** these become worth unifying *only when* book-nav touches them; doing them speculatively now risks a behavior-change at the hast/mdast seam for no present benefit.
- **`liftStructuredKwargs` vs `liftFrameableKwargs` vs `liftConfigKwargs`** — three kwarg-lift functions (`normalize-to-canonical.js:522` / `:663` / `:702`). Readers split on merging; the majority verdict (and mine) is that the registries are *intentionally* distinct (data-container vs body-content vs option-container) and the separation is **honest**. At most, extract a shared `iterateAndClassifyKwargs` helper for the loop body — `S`, optional. **Leave the functions separate.**
- **`STRUCTURED_ELEMENTS` registry vs vocab** — two parallel registries with no cross-check (`core/structured-elements.js` vs `meta.md`/`author.md`). `L` effort, `latent-risk`, almost certainly intentional (schema vs documentation). Only revisit under R5 if the category field becomes load-bearing.
- **`promoteTitles` duplicated article vs book** (`article-structuring.js:104` / `book-structuring.js:132`); **`BOOK_PART_SHORTHANDS` vs `book-part.md`** (gate owns the expansion, vocab documents it); **host-accept-set asymmetry** (`TABLE_FORMATS` imported but diagram/library hardcoded). All `S`, `tidiness`, low-value. Sweep opportunistically if already editing the file; not worth their own slices.
- **Article appendix special case imports book-side helpers** (`article-structuring.js:34–36, 226–250` pulls `assembleBookPartContents` / `restructureBookPart` from book-structuring). A genuine cross-plugin coupling (Lens 1), but the one reader's fix is **behavior-changing** (it would make a raw `<book-part>` in an article warn instead of silently restructure). That is a design call, not a tidy. **Surface as a finding only; do not fold into any mechanical slice.**

---

## Summary 1 — Recommended refactor order, and the book-navigation question

**Recommended order:**

1. **R1 — section & book-part source-of-truth (F3, F4, F5).** First. `S`, output-neutral, and it removes the two `latent-risk` drifts (F3, F4) from precisely the files book-nav will edit.
2. **R2 — compiler DRY tidy (F6–F9).** Any time. `S`–`M`, behavior-neutral, no dependencies.
3. **R3 — split `compileToHtml` (F10).** On its own, with snapshot proof. Mild pull to do it near book-nav (which adds an injection pass), but not a blocker.
4. **R4 — config allowlist & coercion (F11–F13).** Independent; clears two `latent-risk` smells (F11, F12).
5. **R5 — make `category` load-bearing (F14 + F1 + F2).** The capstone. Chat-surface design decision first (it changes what the vocab field *means*), then a dedicated slice. Decoupled from all feature work.

**Should the config/section category fix land before book-navigation work?** **Split answer — this is the crux, so I'm being precise:**

- **YES for the narrow part (R1: the section + book-part *constants*).** Book-nav extends the legacy book ToC path (`applyBookToc`, chapter rail, prev/next in `toc.js`) and the book numbering path (`numbering.js`) — the two subsystems holding `NAV_SECTIONS`, `SECTION_TAGNAMES`, and the `BODY_BOOK_PART_TYPES` implicit complement. If book-nav lands first, it will add a *seventh* copy of the section set and lean harder on the un-derived body/region split — the exact `latent-risk` (F4) that produces silent miscounts. Landing R1 first (it's `S` and behavior-neutral) means book-nav reads one constant instead of forking another. **Do R1 before book-nav.**

- **NO for the deep part (R5: wiring the `category` field, and the config-path honesty F1/F2).** Book-nav does not touch config bare-boolean promotion or the config discovery path. F1/F2 are behavior-correct readability smells; F14 is an `M`–`L`, spec-touching, backward-compat-bearing decision. Gating a feature on a large architectural rewrite inverts the project's slow-additive-one-slice discipline. **Do R5 as its own slice, after the design discussion, independent of book-nav.**

In one line: **consolidate the section/book-part *constants* before book-nav (cheap, removes a latent miscount); defer the *category-honesty rewrite* to its own slice (deep, spec-touching, not on the feature's critical path).**

---

## Summary 2 — What's already clean (leave alone)

Drawn from the readers' `wellFactored` lists, de-duplicated. These are load-bearing and well-built; refactoring them would burn risk for no gain:

- **`buildEnscribePipeline`** (`index.js:~994`) — the three-line single shared pipeline assembly. This is *why* static ≡ live holds by construction. The model for the whole architecture; do not touch.
- **`doc-type.js` (`enscribeDocTypeResolve`)** — single-sources the document class once, stamps `file.data`, every downstream plugin reads it. **This is exactly the pattern the `category` field should follow (R5/F14).** Leave it; copy it.
- **The normalize-gate machinery** — `walkNormalize` (the reusable pre-order DFS with the 1-to-1 replacement contract) and the declarative `NORMALIZATIONS` rule list. Adding a rule is one array entry, not a new code path. Sound layering.
- **`shorthand-expansions.js` (`createShorthandRegistry`)** — clean reusable factory; new shorthand family is a 3-line registration.
- **`core/tagname-sigil-map.js`** — the sigil↔tagname cipher with a load-time bijection assertion. Exemplary single-source-of-truth (the *opposite* of the section-set problem).
- **The data-driven registries** — `structured-elements.js` and `frameable-elements.js`. The *design* (spec drives behavior) is right; the only issue (F14) is that the vocab's `category` doesn't feed them — not the registries themselves.
- **`config-discovery.js`** — simple, side-effect-free, recursive `<config>` collection into the merge Map. One job, done cleanly.
- **`sidenotes.js` (`applySidenotes` / `markMarginLayout`)** — the conditional-CSS-injection pattern (`MARGIN_CSS` only when used) that keeps non-feature documents byte-identical. The template the report's `inject*` recommendation (R3) should imitate.
- **`strict-mode.js`** — `detectStrictMode` (pure) / `resolveStrictMode` (plugin) / `disableMarkdownIdioms` (parser modifier) cleanly separated and well-commented (the only DRY nit is F9's shared reparse helper, not the design).
- **`numbering.js` two-phase design** — register-then-fill (`enscribeNumbering` → `fillNumbering`), the scoped walker (`walkWithScope`), and `numberSectionLevel` (correct `+unnumbered` "skip and don't advance" semantics). Complex but cohesive; leave the algorithm alone.
- **`section-nesting.js` (`nestSectionArray`)** — the single-pass stack that nests arbitrary section depth. Correct and minimal.
- **`toc.js` utilities** — `titleParts`, `slugify`, `uniqueId`, `findTitleEl`, `buildChapterRail`, `insertBodyListing`. Compact, well-named, correctly reused. (The *systems* question F-shared is about the builders, not these.)
- **`interpret-plugin.js` (`createEnscribeTagHandler` / `schemaDispatch`)** — the per-tag handler registry; extensible and focused.
- **`bool-kwarg.js` (`readBoolKwarg`)** — the element-boolean > element-kwarg > config > default priority chain. Sound (F12 is about the *config-only* readers that don't use it, not this function).
- **`host-accept-sets.js`** — importing `TABLE_FORMATS` from the table handler is the *right* dependency direction (the host owns the languages it admits). Keep.
- **`generate-data-module.js`** — clean build-time/runtime split, frozen output. The guard (`check-data-fresh`) keeps it honest.
- **`article-structuring.js` (`warnMisplacedApparatus`, `applyTitleAfterPipe`)** — a pure diagnostic and the title-after-pipe shorthand, both well-scoped (the appendix coupling above is a separate, narrower concern).

---

## Method & confidence

Six read-only `Explore` readers (one per subsystem: gate, config-allowlists, numbering-toc, structuring, compiler, vocab-constants), ~423k tokens, 188 tool reads, scored against the four lenses. I independently re-verified the four load-bearing facts before synthesizing: (1) the section set is hand-written in six sites — confirmed by grep; (2) `category` is consumed nowhere in `src/interpreter` — confirmed by grep; (3) config rides element machinery via tagname side-checks — confirmed at `config-discovery.js:56` and `normalize-to-canonical.js:1058`; (4) legacy `applyToc` is **not** vestigial — confirmed it backs the book reading interface and two render-parity fixtures. Convergence counts ("flagged by N/6") are noted per finding; the highest-confidence items (F3, F1) were flagged by 6 and 5 readers respectively and verified directly. No code was changed, no fixtures regenerated, nothing committed or filed — per the prompt, this pass only maps.
