# Slice report — `<minipage>`, a sealed frameable (#115)

**Branch:** `minipage` (off `main`). **Outbound landed**, so this closes #115 on merge.
**Not merged** — a concurrent `docs-intros` session is active, so per the build prompt this is committed to
the branch and `main` is untouched; Ariel serializes the merge.

## Commits landed

| | commit | what |
|---|---|---|
| 1 | `02254e2` | frameable surface + held body (the outward shell; body renders empty) |
| 2 | `efaff42` | seal + splice + no-external guard (the sealed sub-interpret) |
| 3 | `3d4c626` | fixture `document-69-minipage` (the sealed self-contained minipage) |
| 4 | `76c60d2` | outbound refs via one-way read-through registry; `document-70`; **Closes #115** |

The commit cut differs slightly from the prompt's suggested cut (which it invited): the prompt put the guard
in commit 2 and tests in commit 3; that is what landed. Outbound (commit 4) reached, so #115 is fully done,
not an outbound follow-up.

## Phase 0 — spec reuse points: confirmed vs. adapted

A read-only investigation confirmed every reuse point the spec named *against the current code* before wiring.
Findings:

- **Frameable shell (`lib/frameable.js` + `core/frameable-elements.js`)** — **confirmed, extended.** A new
  frameable is more touch-points than "one list": `FRAMEABLE_LIFTABLE` **and** `KIND_META` (a hard load-time
  guard binds them), the `HANDLER_REGISTRY`, `NUMBERED_TAGNAMES` + `CONFIG_KEY`, and `DEFAULT_PREFIXES`. All
  wired.
- **The held-body / "main pass skips it" mechanism** — **adapted; the spec's stated precedent was wrong.** The
  spec said "same precedent as `asset-load` stripping `<data>` … render-suppressed hosts walked past." In
  fact numbering does **not** walk past suppressed hosts (asset-load *strips* `<data>` precisely because
  numbering would otherwise walk it), and there is no skip-flag in the numbering walk. The correct, stronger
  mechanism — surfaced by the investigation and used here — is **opaque-at-parse**: register `minipage` in the
  parser `LANGUAGES` map so its body is held as the raw source string and every main-pass walk skips it via
  the existing `!isOpaqueContent` guard. Opacity must be set at parse (`recursive-content` hardcodes
  `isOpaqueContent:false` for default tags, so a later transform cannot un-leak an already-parsed body). Spec
  updated to record this.
- **Sealed sub-interpret** — **adapted; the spec's "the master already runs each child through
  `processSync(source,{ENSCRIBE_LOADED_SOURCES})` with its own registry/loop-guard" was inaccurate.** The
  master assembler stitches children into **one** tree with **one** shared registry (the opposite of a seal),
  and `ENSCRIBE_LOADED_SOURCES` is a pre-fetched-content map, not a loop guard. The real primitive is
  `buildEnscribePipeline().runSync(parse(source), freshFile)` — the **fresh VFile** is the seal (fresh
  registry via `ensureRegistry`). The fresh-VFile idiom is borrowed from `live-book.js`; subtree projection
  from `render-chapter.js`. Spec updated.
- **Local notes (`note-placement` inside the sub-tree)** — **confirmed (consequence).** Running the full
  pipeline on the body in isolation collects its notes at the box boundary, because the sub-run produces a
  real `<article>` whose `<article-back>` is the boundary host.
- **One-way registry seed + deferred phase + splice + no-external guard + nesting depth guard** — **new,
  bounded**, as the spec predicted.

## What changed (diffs are in the four commits above)

Code (net, 17 files, +645/−8):

```
core/dsl-registry.js        +9   LANGUAGES += ['minipage','minipage'] (opaque at parse)
core/frameable-elements.js  +5   FRAMEABLE_LIFTABLE += minipage
core/file-data-keys.js     +10   ENSCRIBE_MINIPAGE_SUBRUN / _DEPTH
core/registry.js           +33   makeReadThroughRegistry (one-way outbound seam)
interpreter/lib/frameable.js +6  KIND_META += minipage (prefix 'Minipage', inside-figure)
interpreter/lib/minipage.js +95  projectMinipageBody / walkMinipageNodes / depth bound
interpreter/handlers/minipage.js +72  the figure-shell handler (reads node.minipageResolved)
interpreter/interpret-plugin.js  +2  register the handler
interpreter/plugins/minipage-guard.js +74  the no-external @src/<data> guard pass
interpreter/plugins/numbering.js +11  NUMBERED_TAGNAMES + CONFIG_KEY (own 'minipage' counter)
interpreter/plugins/ref-resolution.js +1  DEFAULT_PREFIXES.mp = 'minipage'
interpreter/plugins/asset-load.js +8  export makeAssetError / assetError for the guard
interpreter/index.js       +67  insert enscribeMinipageGuard (4.9) + enscribeMinipageDeferred (8.5)
layer1-vocabulary/elements/minipage.md +159  the vocab entry (+ regenerated data.js)
+ test guards updated: dsl-registry.test.js, layer1-vocabulary/test/data.test.js
```

Tests: `test/integration.test.js` (+86 — doc69 & doc70 blocks), fixtures `document-69-minipage.{emd,html}` +
`document-69-expected.json`, `document-70-minipage-outbound.{emd,html}` + `document-70-expected.json`.

Docs (this slice, uncommitted at time of writing — committed with the report): `notes/specs/minipage.md`
(rewritten "as built"), `STATUS.md` (minipage capability).

### Architecture, in one paragraph
`<minipage>` is opaque at parse — its body is the raw source string, never parsed into the main tree, so every
main-pass walk (numbering, notes, citation/asset index, structuring, ref/cite resolution) skips it for free
and the minipage node itself is numbered (its own "Minipage N" label). A deferred pass between **apply-numbers
(8)** and **ref-resolution (9)** runs each body through `buildEnscribePipeline().runSync` on a **fresh VFile**
(fresh registry = the seal), seeded with a one-way **read-through** view of the parent registry (outbound refs
resolve; child labels never merge up; numbering stays private). The resolved Layer-1 mdast is stamped on a
side-channel field (`node.minipageResolved`) the mdast walks don't traverse, and the compile-time handler
splices it into the `<figure>` shell. Nested minipages recurse through the same pass, bounded by
`ENSCRIBE_MINIPAGE_DEPTH`. `@src`/`<data>` pulls are neutralized to a visible error by a guard pass that is a
no-op on every normal document.

## What was tested

```
packages/layer1-vocabulary $ npm test   →  49/49 data-module tests + cross-refs (108 element bodies)
packages/enscribe          $ npm test   →  OK: 75/75 suites passed   (pretest rebuilt the grammar)
packages/cli               $ npm test   →  OK: 233/233 checks passed  (incl. JATS DTD validation)
packages/enscribe          $ npm run verify  →  full suite + re-rendered fixture HTML, Done.
```

Fixture behaviors by name (HTML assertions + hast snapshot, all green):

- **doc69** — private numbering (doc `<fig>` and box `<fig>` both "Figure 1"; document counter untouched) ·
  internal ref resolves within the box · inbound document `<ref>` to a box label is `??ref:…??` · two
  minipages referenceable in the "Minipage N" series · box-local footnote collected at the box bottom ·
  nested minipage numbers privately · `@src` pull rejected with a visible asset-error (no resolved `<img>`).
- **doc70** — outbound body `<ref>` to a document figure and section resolve read-through · the box's own
  `<ref>` still resolves internally · the box is referenceable from the document · an inbound document `<ref>`
  to a box-private label is **still** a ref-error (the read-through is one-way).

**Output-neutral for everything else:** no existing fixture changed (the deferred phase and guard are no-ops
without a minipage). Book / article / website output byte-identical where minipage isn't used.

## What was deferred (with reasons)

- **DOM id-namespacing (a real bug → recommend an Issue).** The seal is at the registry/cross-ref level, not
  the DOM-id level: a body's auto ids (`note-1`/`noteref-1`, auto figure ids) and author colon-ids render into
  the global HTML id namespace, so a document footnote and a box footnote can both be `id="note-1"` (invalid
  HTML; an anchor can jump to the wrong target — browsers degrade gracefully, first match wins). A full fix
  namespaces every body-local id and rewrites the body-internal hrefs/marker kwargs, and must distinguish
  body-local ids from the parent targets commit 4 resolves against — so it is separable new wiring that
  *entangles with outbound*, not a free consequence. Out of the prompt's scope/tests; fixtures avoid the
  collision so the snapshots are valid. **Recommend filing as an Issue.**
- **Book-typed minipage body** — out of scope (a `<meta type=book>` body); `projectMinipageBody` falls back to
  splicing the resolved root as-is. Deliberate non-goal, noted in the spec.
- **Strict-mode inside a minipage body** — the sub-run feeds a parsed tree, so `resolveStrictMode`'s
  source-reparse path isn't exercised; fine for the default (`off`) case, untested for sigil/canonical bodies.
  Edge case, not in scope.
- **Gallery/catalog demo migration to minipages** — explicitly a later slice (it retires the per-builder
  frame/aside skip-rules); not touched.

## Drift findings

- The spec's two factual errors (the asset-load "stripping/walked-past" precedent; the "master runs each child
  through `processSync(…{ENSCRIBE_LOADED_SOURCES})` with its own registry") were corrected in
  `notes/specs/minipage.md` as part of this slice (spec ⇄ code).
- No other spec/code drift surfaced.

## Coherence check

1. **Spec ⇄ code** — **reconciled.** `notes/specs/minipage.md` rewritten to the as-built design: opaque-at-parse
   held body, the fresh-VFile seal (correcting the master-sub-interpret error), the deferred-phase pipeline
   positions + side-channel splice, the own "Minipage N" identity, the read-through wrapper, the nesting depth
   guard, the no-external guard scope, and a Limitations section. With the code deleted, the spec still
   describes what this slice decided.
2. **Issues ⇄ code** — #115 is closed by commit 4's merge. **One finding to file:** the DOM id-namespacing bug
   (above). Not auto-filed — surfaced here for routing (milestones are mid-restructure per #223/#246, and the
   two-surface workflow routes findings through the chat); say the word and I'll open it.
3. **STATUS** — **flipped.** Added the `<minipage>` capability line under the frameable cluster.
4. **User docs** — **flagged, not silently skipped.** The vocab **source** (`minipage.md` with
   `shorthand_examples`) is in place — and that is exactly what the docs-site catalog / Layer-1 reference
   (`gen-catalogs.js` / `gen-reference.js`) and the coverage **gallery** (`gen-gallery.js`) *generate from*. I
   did **not** regenerate/commit those generated docs-site artifacts: docs-site is the concurrent
   `docs-intros` session's territory and is in heavy flux (the #223/#246 catalog rewrite just landed), so
   regenerating now would collide. The catalog/reference/gallery cells materialize from the vocab entry on the
   next docs build. **This is the one coherence point not fully closed in-slice; it is bounded (regenerate +
   commit the generated docs-site artifacts) and deferred to avoid the cross-session collision the prompt
   warned about.**
5. **Rule 2** — no computable fact written into any document (the spec/STATUS/vocab describe behavior and
   mechanism, not counts).
6. **Report** — this document.

## Next (not this slice)
- Outbound landed, so no outbound follow-up. The DOM id-namespacing fix and the gallery/catalog demo migration
  to minipages are the natural follow-ups. The `collectEntries` ToC-leak fork remains the docs/intros slice's
  call (out of scope for #115).
