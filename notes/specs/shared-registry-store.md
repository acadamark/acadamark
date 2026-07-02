# Shared registry store

**Status: deferred / future.** Nothing should be built from this yet. The current in-memory registry
merge is correct and sufficient for the synchronous compile path. This note records the idea and its
shape so it isn't lost — it belongs to the reading-model arc, and should be picked up there.

## The idea

Persist the project's *merged registry* — the data harvested from `<data>` (citations and embedded
assets), `<meta>`, and `<config>` — into a local persistent store, so every renderer reads one shared
source of truth instead of each re-parsing those blocks from the tree.

## Today

The registry is built in memory, per compile. The #190 assembler already *merges* it across files —
one citation index (`buildCitationIndex` → `file.data.enscribeCitations`), one asset index
(`buildAssetIndex` → `file.data.enscribeAssets`), project-wide — but that merged state is rebuilt on
every run and lives only for the duration of one synchronous compile, on `file.data`. The data is
already centralized; what's missing is *persistence* of it.

## Why persist it

The in-memory merge is enough while a document is one synchronous pass. The value of a store appears
the moment rendering stops being that:

- **Parallel paged-static build (the P1 publishing track).** Each chapter page is rendered
  independently — every worker needs the same shared registry (cross-reference ownership, citations,
  assets, meta, config). Re-deriving it per worker is redundant and risks divergence. A single pre-pass
  writes the store once; the workers read it. One source of truth, parsed once.
- **Incremental re-render.** Re-render one chapter without re-parsing the whole book — the store holds
  everything the chapter depends on but does not itself contain.
- **Live app-shell / multiple instances (the L2 editing-surface track).** Parallel renders, tabs, or
  agents share the store rather than each carrying a private copy that can drift.

## Coupling to the reading model

This is the *storage layer* for the cross-reference registry already posited in
`master-document.md` (§ cross-references): the registry records which chapter owns each anchor, realized
at publish time (P1) or navigate time (L2), with the static and live paths sharing one ownership model.
A shared registry store is simply *where that registry lives* so both paths read the same thing. Which
is why this is gated on the reading-model decision — it is premature until the parallel / paged / live
rendering model is actually chosen. Build it then, not before.

## The browser-as-engine constraint

Enscribe's render engine is the browser, so the in-engine store is **IndexedDB or OPFS** (Origin
Private File System) — not a server database or SQLite. A build / CLI path could back the same registry
with a file (a JSON manifest, or SQLite) for speed, but the two backends should sit behind one
interface so the registry shape is identical whether it is read from web storage or from a file.

## Open questions (for when it is built)

- **Shape.** One manifest blob vs per-namespace keys (`cite:*`, `asset:*`, `meta:*`, `config:*`,
  `xref:*`). Per-key suits incremental invalidation; a blob is simpler.
- **Lifecycle.** A build-time pre-pass writes the store; render-time workers read it. Where that
  pre-pass sits relative to assembly and numbering.
- **Invalidation.** When a source file changes, who rebuilds which slice of the store, and how staleness
  is detected (a content hash per source?).
- **Boundary.** What is persisted (the merged registry — *facts about the project*) vs what stays
  per-render (the document tree and its rendered output).

## See also

- `notes/specs/master-document.md`, § cross-references — the cross-reference ownership registry this
  would persist.
- `packages/enscribe/src/interpreter/plugins/library-load.js` (`buildCitationIndex`) and
  `packages/enscribe/src/interpreter/plugins/asset-load.js` (`buildAssetIndex`) — the in-memory
  registries this store would back.
- #190 — the assembler merge that centralized the registry data in the first place.
