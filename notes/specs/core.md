# `@enscribejs/enscribe/core`: the inward-pointing shared foundation

This is the architecture-decision record (ADR) for **`@enscribejs/enscribe/core`** — the
inward-pointing foundation the rest of the `enscribe` package is built on.

> **History.** `core` began life as a *separate package* (`enscribe-core`),
> extracted in a five-slice arc (`0a4523a`, `2fabdf5`, `7cc6002`, `442202c`,
> and the arc-close slice) to be the shared dependency of the then-separate
> `remark-enscribe` (parser) and `enscribe-interpreter` packages. The later
> 7→3 package consolidation (`b0a9d71`) merged those packages into the single
> **`enscribe`** package, where the core, parser, and interpreter became
> **sibling folders** (`src/core/`, `src/parser/`, `src/interpreter/`). The
> inward-pointing discipline this ADR records did not change — it now operates
> **between folders inside one package** rather than between packages.
> Everything below is described in that consolidated, as-built form.

## The decision

The `enscribe` package is organized around a small **`src/core/`** folder that
every output-producing folder depends on. The dependency graph points
**inward**: `core/` depends on nothing else internal; the parser
(`src/parser/`) and the interpreter (`src/interpreter/`) depend on it. The
`@enscribejs/layer1-vocabulary` package is a separate leaf that depends on
nothing internal and is consumed (alongside `core`) by the interpreter; the
`@enscribejs/cli` package (JATS export/import, the pandoc bridge) consumes the
`enscribe` package through its public exports.

The extraction arc resolved DRY-audit Bin A.1 (the canonical `enscribeTag`
shape was restated with visible field-drift across 12 hand-construction sites)
and Bin A.2 (the HTML attribute-mapper was duplicated in two interpreter
sites) on the way; Bin A.2's deferred lift question is recorded below as
resolved.

## Dependency graph (as built)

```
   enscribe package
   ┌───────────────────────────────────────────────┐
   │                   src/core/                     │
   │   (no internal deps; browser-safe; fs-free;     │
   │    pure data + logic)                           │
   └───────────────────────────────────────────────┘
              ▲                        ▲
              │                        │
   ┌──────────────────┐     ┌────────────────────┐
   │   src/parser/    │ ◄───│  src/interpreter/  │
   │  (remark plugin) │     │   (HTML output)    │
   └──────────────────┘     └────────────────────┘
                                      ▲
                                      │
            @enscribejs/layer1-vocabulary  (separate package:
                                            generated data + build script)

            @enscribejs/cli  (separate package: JATS export/import +
                              pandoc bridge; consumes the enscribe
                              package's exports + layer1-vocabulary)
```

Edges (consumer → dependency):

- `src/parser/` → `src/core/` (uses `dsl-registry`, `tagname-sigil-map`, tag
  builders, error-node builders).
- `src/interpreter/` → `src/core/` (uses everything in core);
  `src/interpreter/` → `src/parser/` (legitimate parser→interpreter stage
  edge: imports `recursive-content` and the parser's unified-plugin glue);
  `src/interpreter/` → `@enscribejs/layer1-vocabulary` (imports the generated
  `VOCABULARY` data module).
- `@enscribejs/cli` (JATS export/import + pandoc bridge) → the `enscribe`
  package's exports + `@enscribejs/layer1-vocabulary`. The JATS export consumes
  Layer 1 hast/mdast, not the interpreter's HTML.
- `@enscribejs/layer1-vocabulary` → nothing internal (leaf).
- `src/core/` → nothing else internal (leaf within the package).

No cycles. No sideways edges between the parser and interpreter folders except
the legitimate stage edge. Every shared global-design fact lives in `core/`
(the home for facts that belong to the package as a whole, not to a particular
producer or consumer).

## What `@enscribejs/enscribe/core` contains (as built)

Each module covers a global-design concept identified by the DRY audit. All
are filesystem-free, browser-safe, and depend on nothing else internal. Paths
are relative to the `enscribe` package root.

| Module | Concept | DRY-audit ID |
|---|---|---|
| `src/core/tag.js` | The canonical `enscribeTag` node shape; builders `makeTag`, `makeOpaqueTag`, `makeInternalMarker`; the `isEnscribeTag` predicate | G1 |
| `src/core/error-nodes.js` | The canonical `enscribeParseError` / `enscribeTagError` shapes; builders `makeParseError`, `makeTagError` | G7 |
| `src/core/dsl-registry.js` | The language/type axis: the `LANGUAGES` map (identifier → handler + opacity + `(purpose, host)` bindings), the derived flat `DSL_REGISTRY` (`tagname → contentHandler`), and the `getContentHandler` / `isOpaqueLanguage` / `getLanguageBindings` API | G3, G4 |
| `src/core/tagname-sigil-map.js` | The bidirectional tagname↔sigil cipher: the single source-of-truth pair list and the two derived lookup maps (`SIGIL_TO_TAGNAME` for the lift direction, `TAGNAME_TO_SIGIL` for the future lowering pass); `isSigilTagname` predicate. Both directions are derived from one literal so they cannot drift. Renamed and broadened from the original `sigil-mapping.js` (which was one-directional) when the normalize-to-canonical gate consolidated lift work; the gate consumes the lift direction. | G14 |
| `src/core/colon-id.js` | The cross-reference colon-id convention (`isColonId`, `parseColonId`) | G11 |
| `src/core/registry.js` | The cross-target numbering registry (`createRegistry`, `ensureRegistry`, `findByLabel`); registry-entry shape `{ type, id, number, numbered, data }` | G10 |
| `src/core/file-data-keys.js` | String constants for `file.data.*` plugin-bus keys (`ENSCRIBE_CONFIG`, `ENSCRIBE_REGISTRY`, `ENSCRIBE_CITATIONS`, `ENSCRIBE_NOTES_PENDING`, `ENSCRIBE_NUMBERING_PENDING`) | G12 |
| `src/core/paragraph-unwrap.js` | The single-paragraph unwrap convention helper (the *mechanic*; per-call gates stay with callers) | G13 |
| `src/core/walkers/discover.js`, `walk-replace.js`, `walk-normalize.js` | The shared single-pass tree walkers (per T2-2 — centralization spans the whole package) | G6 |

The folder also has a small dedicated unit-test suite
(`test/colon-id.test.js`) — added during the extraction because the colon-id
helper resolved a real inconsistency and a unit test pins the spec-correct
semantics.

## What `@enscribejs/enscribe/core` deliberately excludes — and why

The arc was disciplined about what does **not** go into core. The exclusion
list:

### Build-time-only code

The Peggy grammar compiler (`build/compile-grammar.js`) and the vocabulary
generator (`@enscribejs/layer1-vocabulary`'s `build/generate-data-module.js`)
both use `fs`/`path` and heavy build-time dependencies. They live on the build
side of the seam. Their outputs — the generated Peggy parser and the generated
vocabulary `data.js` — ship.

### Output-stage-specific code

The HTML attribute mapper emits HTML attributes specifically; the JATS export
has its own attribute mapper emitting JATS attributes. They are stage-specific.

**The deferred open question — RESOLVED 2026-05-29 in Phase 5 slice 5a.** The
iteration shape lifted to `core` as `mapAttributes(node, vocab, target, emit)`
(`src/core/map-attributes.js`). The lift waited for a second output-target
consumer; JATS export (Phase 5) is that consumer. The HTML side
(`src/interpreter/lib/html-emit.js`) and the JATS side
(`@enscribejs/cli`'s `src/jats-export/lib/jats-emit.js`) each pass
`target = 'html'` or `target = 'jats'` plus their target-specific emit
callback. The deferred `buildProperties` wrapper in the interpreter is gone;
the five interpreter consumer sites (schema dispatch + figure/svg/frame/theorem
handlers) call the lifted `mapAttributes` directly via the HTML emit. Vocab
`maps_to` migrated from string to target-keyed object form
(`{ html: "...", jats: "..." }`) at the same time — vocab YAMLs still author
`maps_to: id` (the build-time generator normalizes to `{ html: "id" }`).

### Heavy or environment-specific dependencies

KaTeX (math rendering), citation-js (citation formatting), tippy.js
(hover-preview UI), `@popperjs/core` (positioning), `js-yaml` (YAML parsing),
asset injection paths reading from `node_modules` — all stay with the
output-stage code that uses them. Core remains dependency-light.

### Logic specific to a single consumer

Code that one folder uses and no other ever will (the interpreter's
plugin-specific helpers in `src/interpreter/lib/ast-helpers.js`,
`lib/bool-kwarg.js`, `lib/errors.js`) stays with that folder.

## The build-time vs run-time seam (= the browser-safety boundary)

The boundary the architecture Phase 0 drew is now real (paths relative to the
`enscribe` package root unless noted):

```
═══════════════════════════════════════════════════════════════════════════
BUILD TIME (Node-only; runs during build; output ships)
═══════════════════════════════════════════════════════════════════════════
  • build/compile-grammar.js
       reads grammar/enscribe.peggy → writes src/parser/generated/parser.js
  • @enscribejs/layer1-vocabulary build/generate-data-module.js
       reads elements/*.md → writes src/data.js
  • @enscribejs/layer1-vocabulary build/check-data-fresh.js
       pretest staleness guard (regenerate-and-diff)

═══════════════════════════════════════════════════════════════════════════
RUN TIME, BROWSER-SAFE (ships in the client-side bundle)
═══════════════════════════════════════════════════════════════════════════
  ✓ src/core/*                                          (entire folder)
  ✓ src/parser/syntax.js, from-markdown.js,
    recursive-content.js, index.js, generated/parser.js
  ✓ src/interpreter/lib/*                               (all interpreter-internal helpers)
  ✓ src/interpreter/plugins/*                           (except library-load.js)
  ✓ src/interpreter/handlers/*                          (except table.js's src= branch)
  ✓ src/interpreter/schema/{shape-tokens,validate}.js
  ✓ src/interpreter/interpret-plugin.js
  ✓ src/interpreter/dsl/registry.js                     (DSL asset-emit registry; no Node built-ins after the node-assets split)
  ✓ src/interpreter/browser.js                          (the render/renderInto browser façade; Phase 14 Slice 1)
  ✓ @enscribejs/layer1-vocabulary src/data.js           (the generated data module)
  ✓ @enscribejs/layer1-vocabulary src/index.js          (re-exports)

═══════════════════════════════════════════════════════════════════════════
RUN TIME, SERVER-OR-BUILD-ONLY (server-side rendering today; replaced
                                 for the full client-side build)
═══════════════════════════════════════════════════════════════════════════
  ✗ src/interpreter/index.js's asset-injection paths (read fs)
  ✗ src/interpreter/assets/font-loader.js
  ✗ src/interpreter/handlers/table.js's <table src=…> branch
  ✗ src/interpreter/plugins/library-load.js
  ✗ src/interpreter/dsl/node-assets.js                  (DSL live bundle loaders + jsdom abc→SVG static renderer; split from registry.js)
```

This seam doubles as the **browser-safety boundary** — everything on the
"browser-safe" side imports no `fs`/`path`/`url`/Node-built-ins and so can be
bundled for a browser. The standing rule that protects this boundary lives in
the **client-side build constraints** section below.

## Walker centralization (T2-2)

The shared single-pass walker decision (recorded in `interpreter.md` §2, T2-2)
is preserved — and **broadened**. Walkers originally lived in the interpreter's
`lib/` and were treated as an interpreter-internal centralization. They now
live in `src/core/walkers/`, and the centralization spans every consumer: the
interpreter today; the JATS export in `@enscribejs/cli`; any future output
generator. Code that walks enscribe trees calls the shared helpers
(`discover`, `walkReplace`, `walkNormalize`) rather than reinventing the
descent rules for `.content` vs `.children` and opaque-content boundaries.

The single-pass-by-design caveat from T2-2 is preserved verbatim: the design
may be revisited if multithreading the interpreter for speed becomes
worthwhile. No such work is planned.

## Why this foundation exists

**Inward dependency.** When the parser and interpreter were separate packages,
two could share via sideways imports but a third (JATS export) could not
without picking an arbitrary owner of facts that belong to none of them —
which is why `core` was extracted as a shared dependency. Consolidation folded
the parser and interpreter into one package, so that specific multi-package
pressure is gone; but the *principle* it established is still load-bearing
**within** the package: `core/` is the single home for facts that belong to
the package as a whole, and the separate `@enscribejs/cli` (JATS) package
reaches those facts through `enscribe`'s public exports rather than reaching
into a sibling folder.

**Drift prevention.** The `enscribeTag` shape, the error-node contracts, the
DSL registry — these are global-design facts. Restated facts drift. The DRY
audit found 12 hand-construction sites of the `enscribeTag` shape with visible
field-set drift; the shared builders catch drift at the seam. The colon-id
helper resolved a separate spec-conformance disagreement between two ad-hoc
inline checks.

**Client-side build enablement.** Enscribe's client-side build — loading an
`.emd` file directly in a browser, parsing and rendering without a build step,
per DESIGN.md's *"standalone HTML is the build target; client-side rendering is
the future target"* direction — requires shareable runtime code to be free of
`fs` / `path` / Node built-ins. `core/` is defined to be filesystem-free and
browser-safe; the boundary is drawn so future bundle work does not have to
redraw it.

## Client-side build constraints (standing rule)

The build/run seam above doubles as a **standing rule**:

> **Runtime code that may ship to a browser stays free of `fs`, `path`,
> `url`, and other Node built-ins.** Build-time code (which may use them
> freely) lives behind the build/run seam.

The known server-only paths are the five `✗` items above (asset-injection's
`fs` reads, `font-loader.js`, `table.js`'s `<table src=…>` branch,
`library-load.js`, and `dsl/node-assets.js`'s DSL bundle loaders + jsdom static
renderer) — recorded so the client-side-build arc has a visible target list.
**Phase 14 Slice 1 began that arc.** The tsup browser bundle (entry
`src/interpreter/browser.js`) ships these modules but neutralizes their Node
calls two ways: (1) the build stubs `fs`/`path`/`url`/`module` so the imports
resolve, while the browser façade's external-by-default options
(`embedResources:false`, `hoverPreviewMode:'link'`, `dslMode:'live-link'`)
leave the `fs`-reading bodies as unreached dead code; and (2) where an asset
has no CDN to link to — enscribe's own `hover-preview.css/.js` — it is replaced
with a **bundled-asset alternative**, the bytes build-inlined as string
constants in `src/interpreter/assets/hover-preview-assets.browser.js` (swapped
in via the package's `browser` field) so hover-preview works fully
client-side. The standing rule still holds: *no new runtime code should add to
this list* without the same stub-and-dead-code-or-bundle treatment.

The full client-side build — loading an `.emd` file in-browser with no build
step — remains a future Architecture-tier arc; Phase 14 Slice 1 delivered the
library-packaging layer beneath it (a `render`/`renderInto` façade bundled by
tsup, exposed as the package's `./browser` export). This note exists so backlog
work doesn't smuggle `fs` into a runtime path.

## Implementation history

The five-slice extraction arc, in order (when `core` was its own package):

| Commit | Slice | Summary |
|---|---|---|
| `0a4523a` | 1 | Created the `enscribe-core` package; moved `dsl-registry` and `sigil-mapping` (pure data, zero logic). |
| `2fabdf5` | 2 | Added the `enscribeTag` builder family in `tag.js`; migrated 12 hand-construction sites + the partial `lib/ast-helpers.js#makeTag` (DRY audit Bin A.1). |
| `7cc6002` | 3 | Moved walkers, registry, error-node builders; added `colon-id.js` (with a flagged spec-conformance fix), `file-data-keys.js`, `paragraph-unwrap.js`. |
| `442202c` | 4 | Vocabulary build-time/run-time split — the arc's highest-risk slice, executed against its own Phase 0 with a gating equivalence check. |
| (arc close) | 5 | Consolidated `buildProperties` (DRY audit Bin A.2); `peggy` → devDep; cross-package imports standardized to bare names; this ADR; client-side constraints. |

Later, the **7→3 package consolidation** (`b0a9d71`) merged the `enscribe-core`,
`remark-enscribe`, and `enscribe-interpreter` packages into the single
`enscribe` package, turning the former packages into the `src/core/`,
`src/parser/`, and `src/interpreter/` folders described above. The extraction's
contracts and the inward-pointing discipline carried over unchanged; only the
package boundary became a folder boundary.
