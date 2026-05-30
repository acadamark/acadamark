# acadamark-core: the inward-pointing shared package

This is the architecture-decision record (ADR) for the `acadamark-core`
package, written to the as-built reality after the five-slice extraction arc
(`0a4523a`, `2fabdf5`, `7cc6002`, `442202c`, and the arc-close slice).

## The decision

Acadamark's package set is organized around a small `acadamark-core` package
that all output-producing packages depend on. The dependency graph points
**inward**: `acadamark-core` depends on nothing internal; `remark-acadamark`,
`acadamark-interpreter`, the forthcoming JATS-export package, and any future
output generator all depend on it. `layer1-vocabulary` is a separate leaf
that depends on nothing internal and is consumed (alongside `acadamark-core`)
by the output-producing packages.

The arc resolved DRY-audit Bin A.1 (the canonical `acadamarkTag` shape was
restated with visible field-drift across 12 hand-construction sites) and
Bin A.2 (the HTML attribute-mapper was duplicated in two interpreter sites)
on the way; Bin A.2's deferred lift-to-core question is recorded below as the
one outstanding open question.

## Dependency graph (as built)

```
                ┌──────────────────────────────────────┐
                │            acadamark-core             │
                │  (no internal deps; browser-safe;     │
                │   filesystem-free; pure data + logic) │
                └──────────────────────────────────────┘
                  ▲              ▲              ▲
                  │              │              │
       ┌─────────────────┐   ┌──────────────────┐   ┌──────────────────────────┐
       │ remark-acadamark│   │ acadamark-       │   │ acadamark-jats-export    │
       │ (parser)        │ ◄─┤ interpreter      │   │ (FUTURE)                  │
       │                 │   │ (HTML output)    │   │ (JATS output)             │
       └─────────────────┘   └──────────────────┘   └──────────────────────────┘
                                  ▲                              ▲
                                  │                              │
                                  └───── layer1-vocabulary ──────┘
                                          (data + build script;
                                           depends on nothing internal)
```

Edges (consumer → dependency):

- `remark-acadamark` → `acadamark-core` (uses `dsl-registry`,
  `tagname-sigil-map`, tag builders, error-node builders).
- `acadamark-interpreter` → `acadamark-core` (uses everything in core);
  `acadamark-interpreter` → `remark-acadamark` (legitimate parser→interpreter
  stage edge: imports `recursive-content` and the parser's unified-plugin
  glue);
  `acadamark-interpreter` → `layer1-vocabulary` (imports the generated
  `VOCABULARY` data module).
- `acadamark-jats-export` (future) → `acadamark-core` + `layer1-vocabulary`.
  It will NOT depend on `acadamark-interpreter` — JATS export consumes Layer 1
  hast/mdast, not the interpreter's HTML.
- `layer1-vocabulary` → nothing internal (leaf).
- `acadamark-core` → nothing internal (leaf).

No cycles. No sideways edges between consumers. Every shared global-design
fact lives in `acadamark-core` (the home for facts that belong to the project,
not to a particular producer or consumer).

## What `acadamark-core` contains (as built)

Each module covers a global-design concept identified by the DRY audit. All
are filesystem-free, browser-safe, and depend on nothing internal.

| Module | Concept | DRY-audit ID |
|---|---|---|
| `src/tag.js` | The canonical `acadamarkTag` node shape; builders `makeTag`, `makeOpaqueTag`, `makeInternalMarker`; the `isAcadamarkTag` predicate | G1 |
| `src/error-nodes.js` | The canonical `acadamarkParseError` / `acadamarkTagError` shapes; builders `makeParseError`, `makeTagError` | G7 |
| `src/dsl-registry.js` | The canonical `tagname → contentHandler` map and `getContentHandler` API | G3, G4 |
| `src/tagname-sigil-map.js` | The bidirectional tagname↔sigil cipher: the single source-of-truth pair list and the two derived lookup maps (`SIGIL_TO_TAGNAME` for the lift direction, `TAGNAME_TO_SIGIL` for the future lowering pass); `isSigilTagname` predicate. Both directions are derived from one literal so they cannot drift. Renamed and broadened from the original `sigil-mapping.js` (which was one-directional) when the normalize-to-canonical gate consolidated lift work; the gate consumes the lift direction. | G14 |
| `src/colon-id.js` | The cross-reference colon-id convention (`isColonId`, `parseColonId`) | G11 |
| `src/registry.js` | The cross-target numbering registry (`createRegistry`, `ensureRegistry`, `findByLabel`); registry-entry shape `{ type, id, number, numbered, data }` | G10 |
| `src/file-data-keys.js` | String constants for `file.data.*` plugin-bus keys (`ACADAMARK_CONFIG`, `ACADAMARK_REGISTRY`, `ACADAMARK_CITATIONS`, `ACADAMARK_NOTES_PENDING`, `ACADAMARK_NUMBERING_PENDING`) | G12 |
| `src/paragraph-unwrap.js` | The single-paragraph unwrap convention helper (the *mechanic*; per-call gates stay with callers) | G13 |
| `src/walkers/discover.js`, `walk-replace.js`, `walk-normalize.js` | The shared single-pass tree walkers (per T2-2 — centralization broadened from interpreter-internal to package-spanning) | G6 |

The package also has a small dedicated unit-test suite (`test/colon-id.test.js`,
17 cases) — added in Slice 3 because the colon-id helper resolved a real
inconsistency and a unit test pins the spec-correct semantics.

## What `acadamark-core` deliberately excludes — and why

The arc was disciplined about what does **not** go into core. The exclusion
list:

### Build-time-only code

The Peggy grammar compiler (`remark-acadamark/build/compile-grammar.js`) and
the vocabulary generator
(`layer1-vocabulary/build/generate-data-module.js`) both use `fs`/`path` and
heavy build-time dependencies. They live with their owning package, on the
build side of the seam. Their outputs — the generated Peggy parser and the
generated vocabulary `data.js` — ship.

### Output-stage-specific code

The HTML attribute mapper (`acadamark-interpreter/src/lib/build-properties.js`)
emits HTML attributes specifically. The forthcoming JATS export will have its
own attribute mapper emitting JATS attributes. They are stage-specific.

**The deferred open question — RESOLVED 2026-05-29 in Phase 5 slice 5a.**
The iteration shape lifted to `acadamark-core` as
`mapAttributes(node, vocab, target, emit)`
(`packages/acadamark-core/src/map-attributes.js`). The lift waited for a
second output-target consumer; JATS export (Phase 5) is that second
consumer. The HTML side (`acadamark-interpreter/src/lib/html-emit.js`)
and the JATS side (`acadamark-jats-export/src/lib/jats-emit.js`) each
pass `target = 'html'` or `target = 'jats'` plus their target-specific
emit callback. The deferred `buildProperties` wrapper in the
interpreter is gone; the five interpreter consumer sites (schema
dispatch + figure/svg/frame/theorem handlers) call the lifted
`mapAttributes` directly via the HTML emit. Vocab `maps_to` migrated
from string to target-keyed object form (`{ html: "...", jats: "..." }`)
at the same time — vocab YAMLs still author `maps_to: id` (the
build-time generator normalizes to `{ html: "id" }`).

### Heavy or environment-specific dependencies

KaTeX (math rendering), citation-js (citation formatting), tippy.js
(hover-preview UI), `@popperjs/core` (positioning), `js-yaml` (YAML parsing),
asset injection paths reading from `node_modules` — all stay with the
output-stage package that uses them. Core remains dependency-light.

### Logic specific to a single consumer

Code that one package uses and no other ever will (the interpreter's
plugin-specific helpers in `lib/ast-helpers.js`, `lib/bool-kwarg.js`,
`lib/errors.js`, `lib/build-properties.js`) stays with that package.

## The build-time vs run-time seam (= the browser-safety boundary)

The boundary the architecture Phase 0 drew is now real:

```
═══════════════════════════════════════════════════════════════════════════
BUILD TIME (Node-only; runs during build; output ships)
═══════════════════════════════════════════════════════════════════════════
  • remark-acadamark/build/compile-grammar.js
       reads grammar/acadamark.peggy → writes src/generated/parser.js
  • layer1-vocabulary/build/generate-data-module.js
       reads elements/*.md → writes src/data.js
  • layer1-vocabulary/build/check-data-fresh.js
       pretest staleness guard (regenerate-and-diff)

═══════════════════════════════════════════════════════════════════════════
RUN TIME, BROWSER-SAFE (ships in any future client-side bundle)
═══════════════════════════════════════════════════════════════════════════
  ✓ acadamark-core/*                                     (entire package)
  ✓ remark-acadamark/src/syntax.js, from-markdown.js,
    recursive-content.js, index.js, generated/parser.js
  ✓ acadamark-interpreter/src/lib/*                      (all interpreter-internal helpers)
  ✓ acadamark-interpreter/src/plugins/*                  (except library-load.js)
  ✓ acadamark-interpreter/src/handlers/*                 (except table.js's src= branch)
  ✓ acadamark-interpreter/src/schema/{shape-tokens,validate}.js
  ✓ acadamark-interpreter/src/interpret-plugin.js
  ✓ acadamark-interpreter/src/dsl/registry.js             (DSL asset-emit registry; no Node built-ins after the node-assets split)
  ✓ acadamark-interpreter/src/browser.js                  (the render/renderInto browser façade; Phase 14 Slice 1)
  ✓ layer1-vocabulary/src/data.js                         (the generated data module)
  ✓ layer1-vocabulary/src/index.js                        (re-exports)

═══════════════════════════════════════════════════════════════════════════
RUN TIME, SERVER-OR-BUILD-ONLY (server-side rendering today; replaced
                                 for a future client-side build)
═══════════════════════════════════════════════════════════════════════════
  ✗ acadamark-interpreter/src/index.js's asset-injection paths (read fs)
  ✗ acadamark-interpreter/src/assets/font-loader.js
  ✗ acadamark-interpreter/src/handlers/table.js's <table src=…> branch
  ✗ acadamark-interpreter/src/plugins/library-load.js
  ✗ acadamark-interpreter/src/dsl/node-assets.js          (DSL live bundle loaders + jsdom abc→SVG static renderer; split from registry.js)
```

This seam doubles as the **browser-safety boundary** — everything on the
"browser-safe" side imports no `fs`/`path`/`url`/Node-built-ins and so can be
bundled for a browser. The standing rule that protects this boundary lives in
the **client-side build constraints** section below.

## Walker centralization (T2-2)

The shared single-pass walker decision (recorded in `interpreter.md` §2,
T2-2) is preserved by this arc — and **broadened**. Walkers originally lived
in `acadamark-interpreter/src/lib/` and were treated as an
interpreter-internal centralization. In Slice 3 they moved to
`acadamark-core/src/walkers/`, and the centralization scope broadens to span
all consumers: the interpreter today; the JATS export when it arrives; any
future output generator. Plugins and output generators that walk acadamark
trees call the shared helpers (`discover`, `walkReplace`, `walkNormalize`)
rather than reinventing the descent rules for `.content` vs `.children` and
opaque-content boundaries.

The single-pass-by-design caveat from T2-2 is preserved verbatim: the design
may be revisited if multithreading the interpreter for speed becomes
worthwhile (multiple passes over disjoint subtrees parallelize more cleanly).
No such work is planned.

## Why this package exists

**Inward dependency.** Two packages can share via sideways imports
(`acadamark-interpreter` used to import `dsl-registry` and the sigil
mapping — now `tagname-sigil-map` — from `remark-acadamark` directly). Three packages cannot — JATS-export would
have to pick which sibling to import from, and either choice picks an
arbitrary owner of facts that belong to none of them. `acadamark-core` is
the home for facts that belong to the project, not to a particular producer
or consumer.

**Drift prevention.** The `acadamarkTag` shape, the error-node contracts,
the DSL registry — these are global-design facts. Restated facts drift. The
DRY audit found 12 hand-construction sites of the `acadamarkTag` shape with
visible field-set drift between them; Slice 2's builders catch drift at the
seam. Slice 3's colon-id helper resolved a separate spec-conformance
disagreement between two ad-hoc inline checks.

**Client-side build enablement.** Acadamark's eventual client-side build —
loading an `.acm` file directly in a browser, parsing and rendering without
a build step, per DESIGN.md's *"standalone HTML is the build target;
client-side rendering is the future target"* direction — requires shareable
runtime code to be free of `fs` / `path` / Node built-ins. `acadamark-core`
is defined to be filesystem-free and browser-safe; the boundary is drawn so
that future bundle work does not have to redraw it. See the constraints
section below.

## Client-side build constraints (standing rule)

The build/run seam above doubles as a **standing rule** that protects future
work from quietly making the eventual client-side-build arc harder:

> **Runtime code that may ship to a browser stays free of `fs`, `path`,
> `url`, and other Node built-ins.** Build-time code (which may use them
> freely) lives behind the build/run seam.

The known server-only paths are the five `✗` items above
(asset-injection's `fs` reads in `interpret-plugin`'s top-of-file
asset-handling, `font-loader.js`, `table.js`'s `<table src=…>` branch,
`library-load.js`, and `dsl/node-assets.js`'s DSL bundle loaders + jsdom
static renderer) — recorded so the client-side-build arc has a visible
target list. **Phase 14 Slice 1 began that arc.** The tsup browser bundle
(entry `src/browser.js`) ships these modules but neutralizes their Node calls
two ways: (1) the build stubs `fs`/`path`/`url`/`module` so the imports
resolve, while the browser façade's external-by-default options
(`embedResources:false`, `hoverPreviewMode:'link'`, `dslMode:'live-link'`)
leave the `fs`-reading bodies as unreached dead code; and (2) where an asset
has no CDN to link to — acadamark's own `hover-preview.css/.js` — it is
replaced with a **bundled-asset alternative**, the bytes build-inlined as
string constants in `src/assets/hover-preview-assets.browser.js` (swapped in
via the package's `browser` field) so hover-preview works fully client-side.
The standing rule still holds: *no new runtime code should add to this list*
without the same stub-and-dead-code-or-bundle treatment. Cross-check new
slices against the rule.

The full client-side build — loading an `.acm` file in-browser with no build
step — remains a future Architecture-tier arc; Phase 14 Slice 1 delivered the
library-packaging layer beneath it (a `render`/`renderInto` façade bundled by
tsup, exposed as the package's `./browser` export). This note exists so that
backlog work doesn't smuggle `fs` into a runtime path. The rule is short by
design — checking against it is cheap.

## Implementation history

Five slices, in order:

| Commit | Slice | Summary |
|---|---|---|
| `0a4523a` | 1 | Created the `acadamark-core` package; moved `dsl-registry` and `sigil-mapping` (pure data, zero logic). |
| `2fabdf5` | 2 | Added the `acadamarkTag` builder family in `src/tag.js`; migrated 12 hand-construction sites + the partial `lib/ast-helpers.js#makeTag` (DRY audit Bin A.1). |
| `7cc6002` | 3 | Moved walkers, registry, error-node builders; added `colon-id.js` (with a flagged spec-conformance fix), `file-data-keys.js`, `paragraph-unwrap.js`. |
| `442202c` | 4 | Vocabulary build-time/run-time split — the arc's highest-risk slice, executed against its own Phase 0 with a gating equivalence check. |
| (this slice) | 5 | Consolidated `buildProperties` (DRY audit Bin A.2 — local interpreter consolidation only); `peggy` → devDep; cross-package imports standardized to bare names; this ADR; client-side constraints; backlog items; STATUS milestone. |

Total: ~5 KB of new code in core (small for what it carries), no behavioral
change to rendering or parsing (verified by snapshot tests holding stable
across every slice).
