# Build-time data store — spec

The owned home for enscribe's **build-time** data-store design: how data declared in a document
(`<data>` embedded assets and datasets) is stored, resolved, and interpreted at build, before the page
reaches a browser. This is the design of record for [#313]; later slices build from it.

This note owns the build-time **principle and design**. Two sibling concerns stay deferred and are
cross-linked, not absorbed:

- `notes/specs/runtime-data-store.md` — the **deferred runtime store** (client-side re-reading +
  single-copy dedup, build-on-first-reader). Additive; never replaces build-time resolution.
- `notes/specs/shared-registry-store.md` — the **deferred persistence** of the merged registry (where
  the registry *lives* across parallel/incremental renders). A separate concern — persistence, not
  interpretation.

#313 is the **build-time** store: resolve `@id` into the page at build. The runtime store and the
shared-registry store remain future and additive; nothing here starts either.

## The governing principle

> **Storage is opaque; interpretation belongs to the consuming element; `@id` resolution is the
> neutral hand-off between them.**

Everything below is derived from this one sentence. State it once; resist per-consumer special-casing
in the store — that is the drift this spec exists to prevent.

**1. Storage is opaque.** Data stored in the document (`<data>` embedded assets and datasets) is held
as **opaque bytes**. The store does not interpret it — no markdown parsing, no format assumption. A
stray `*` / `_` / `#` in stored CSV or JSON is never mangled, and a mixed-content whitespace bug (the
class of [#330]) can never touch stored data: opaque content never enters the interpreted-content
mixer. This is not a new guarantee — it is how the existing non-`default` content handlers already
behave (see *Piece 1*).

**2. Interpretation belongs to the consuming element.** A **consuming element** decides what the bytes
*mean*. The same opaque CSV becomes a grid under `<table src="@id">`, a syntax-highlighted listing
under `<code src="@id">`, an image under `<fig src="@id">`, and a chart under a future plot element.
Storage is shared; interpretation is the consumer's. Consumers are genuinely different — handled
differently **by design**, not by a fork inside the store.

**3. `@id` resolution is consumer-agnostic.** Resolution fetches the opaque bytes for an id and hands
them to the use-site. It does **not** know or care whether the consumer is a fig / table / code / plot.
The interpretation — a `data:` URI for an image, a parsed grid for a table, verbatim text for code —
lives in **each consuming element**, not in the resolver. This is *less* code and *less* divergence,
not more: **one neutral hand-off + N consumers**, not one resolver carrying a branch per type.

> Resolution was originally **fig-shaped**: it baked the image consumer's `data:` URI into the
> resolver itself. #313 slice 2 made the principled generalization real — resolution is now **neutral**
> (`resolveAssetReference` returns the raw store entry) and interpretation lives in the consumer
> (`resolveFig` builds the `data:` URI; `resolveTableSrc` hands opaque bytes to the table). See §Piece 2.

---

## Derived design

### Piece 1 — `<dataset>` as an opaque store element

`<dataset>` holds CSV / JSON / TSV / other tabular or structured payloads inside `<data>` as **opaque
bytes**. Its content handler is a **non-`default`** (opaque) handler — explicitly *not* `default`,
because the `default` handler recursively re-parses string content as markdown
(`packages/enscribe/src/parser/recursive-content.js`), which would both mangle the data (a `#` becomes
a heading, a `*` becomes emphasis) and expose it to the [#330] mixed-content whitespace class.

**Rule — a `<dataset>` must be long-form `<dataset …>bytes</dataset>`.** The payload is the tag *body*.
The pipe form `<dataset … | bytes>` is delimited by the first unescaped `>`, so a payload that itself
contains `>` (Mermaid's `-->`, some JSON, `<code>`-shaped source) is truncated there — and datasets
routinely contain `>`. The long form scans to the explicit `</dataset>` and has no such ambiguity, so it
is the **required** authoring form: at harvest (`buildAssetIndex`, `asset-load.js`) a non-long-form
`<dataset>` — pipe, bare, or self-closing — is rejected as a visible `__asset-error` ("must use the long
form …") and is **not** registered, rather than silently storing a truncated payload. This is enforced at
harvest, *not* by changing the shared tag-boundary parser (the pipe truncation is a property of that
parser, predating and independent of #313; "fixing" the pipe form to admit `>` is a separate parser
question the rule deliberately sidesteps). A `<dataset>` is thus the one storage host restricted to the
long form — its sibling `<library>` still accepts the pipe form, because a bibliography payload does not
carry `>` the way tabular/diagram/code data does.

This is **routing the new element to the existing opaque lane, not new machinery.** The lane already
exists and is load-bearing today:

- `recursive-content.js` walks `enscribeTag` nodes and **skips any node whose `contentHandler !==
  'default'`** (the `return SKIP` guard) — so a non-`default` handler's content is never re-mixed.
- Several elements already ride this lane — their `getContentHandler` (in `dsl-registry`) is
  non-`default`, so `recursive-content` holds their body opaque: `code`, `diagram`, `library` (the
  BibTeX/CSL payload), `table` ("never recursively-parsed"), and `svg` / `minipage` (held opaque, then
  rendered by their own `handler_module`).

So `<dataset>`'s store behavior is specified by **choosing a non-`default` (opaque) handler** and
adding the element to the `<data>` content model — the opaque guarantee then falls out of the existing
lane. Whether `<dataset>` reuses the generic `opaque` handler or gets a thin `dataset` handler (e.g. to
carry a `format` hint as metadata, still without interpreting the bytes) is a slice-1 implementation
call; either way the bytes stay opaque.

`<dataset>` is a **storage host**, parallel to `<library>` (a foreign-format payload read by a
consumer, not an enscribe-native field record) — see `elements/data.md` §"storage host on the language axis".
It is already named as a future child of `<data>` (`elements/data.md`, content shape).

### Piece 2 — consumer-agnostic `@id` resolution

The neutral hand-off, in three steps that no consumer-type branch may contaminate:

1. **Resolve** `@id` → the opaque bytes (or external path) for that id, from the merged store.
2. **Hand off** those bytes to the use-site element.
3. **The consumer interprets** them: `<fig>` → an `<img>` (`data:` URI for embedded, path for external);
   `<table>` → a parsed grid; `<code>` → verbatim highlighted text; `<dataset>` placed-as-data → its
   consumer's reading; a future `<plot>` → a chart. Each consumer owns its interpretation.

**The split (#313 slice 2, built).** Resolution is neutral + per-consumer, in the one resolution pass
(`asset-load.js`, `enscribeAssetResolution`), before numbering:

- **`resolveAssetReference(src, assets)` — the neutral hand-off.** For a `src` starting with `@` it
  returns the raw store entry + status: `{ ref, id, found, entry }` (or `null` for a non-`@` src). It
  makes **no media assumption** — no `data:` URI, no `<img>`, no grid, no parse. `entry` is the raw,
  uninterpreted record: `{ format, base64 }` (embedded image asset) | `{ src }` (external asset) |
  `{ format, content }` (dataset). The reusable parts the audit named (F2.2) — the registry
  (`buildAssetIndex` → `file.data.enscribeAssets`) and the `@`-prefix lookup — ARE this function.
- **Each consumer interprets the entry.** `resolveFig` builds the fig's image (external → path; embedded
  → `data:<mime>;base64,…`), **byte-identical** to before — the image construction (the F2.3 fig-specific
  rewrite) MOVED out of the resolver into the fig consumer. `resolveTableSrc` hands a dataset's opaque
  bytes to the table node as inline content (supplying the dataset's format hint when the table named
  none), so the table handler parses them with its EXISTING CSV/TSV/JSON parser — the table owns its
  parse, unchanged. `resolveDiagramSrc` feeds a dataset's bytes as a diagram engine's source — and,
  because the engine renders that source verbatim client-side (enscribe cannot re-read it), a dataset
  format hint that disagrees with the named engine (a `csv` dataset into a `mermaid` diagram) is a
  visible error, the ONE place a consumer guards on the hint (a table, which re-parses per its own
  format word, does not). `resolveCodeSrc` renders a dataset's bytes as a verbatim `<code>` body (its
  format hint, when the `<code>` names no language, seeds the highlight class). The diagram/code pair
  share a small `readDatasetSource` helper for the resolve→bytes-or-error shape; `resolveTableSrc`
  predates it and keeps its own copy (it also reads an external asset as a file `src`, a branch the
  other two lack). A future `<plot>` is the next trivial branch: same `resolveAssetReference`, its own
  interpretation.

**All `@id` errors are visible, for every consumer (F2.1 — closed).** Before, an unresolved `@id` was a
visible `__asset-error` *only* for `<fig>`; `<table src="@id">` treated `src` as a file path, so an
`@id` neither resolved nor reported — a **silent** failure. Now every consumer routes its unresolved id,
*and* its own wrong-kind misuse (a `<fig>` pointed at a dataset; a `<table>` pointed at an image),
through the **same** `assetError` → `__asset-error` path (the inline block naming the reference, never a
broken `<img src="@…">` / a silent-empty table). The neutral resolver returns the not-found *signal*
uniformly; each consumer renders that — and its own kind mismatch — the same way, before numbering (so
an errored use-site is never counted).

### Piece 3 — the opacity ↔ round-trip invariant (a standing RULE)

This is a **constraint #313 must honor**, not a repair — the foundation is round-trip-safe today and
must stay so. Stated as a rule (the audit's F1.1):

> **`@id` resolution happens IN-TREE before serialization. Stored data is opaque bytes. The engine
> never serializes-then-reparses a stored fragment.**

The danger it forecloses is the serialize-then-reparse trap (e.g. the void-`<meta>` parse5 hazard):
re-parsing serialized HTML can silently drop or mangle content. Because resolution is an in-tree
transform (the `@`-src node is rewritten in the mdast/hast tree, not by round-tripping a string) and
stored bytes are opaque (never re-parsed as markdown), neither stored data nor resolved use-sites ever
make that round trip. Every #313 slice — `<dataset>`, the neutral resolver, per-consumer
interpretation — must preserve this: transform in-tree, keep stored bytes opaque, never
serialize→reparse a stored fragment.

### Piece 4 — JATS projection per consumer

Each consumer owns its **JATS projection** too, exactly as it owns its HTML interpretation:

- **`<fig>` → `<graphic>` (DONE).** A body figure resolved from an asset projects to
  `<graphic xlink:href="…">` — a `data:<mime>;base64,…` URI for an embedded asset, or the file path
  for an external one — DTD-valid for JATS Archiving 1.3 and BITS 2.0. This is **shipped and
  behaviorally confirmed** (`packages/cli/src/jats-export/index.js`, `emitFigureJats`; tests
  `packages/cli/test/jats-export.test.js` doc58 embedded-png/svg/external + `embedded-asset.test.js`, all
  DTD-validated). The earlier "remaining slice" claim in `elements/data.md` / `elements/fig.md` is
  stale and is corrected by this slice.

  **Asset PACKAGING for a portable JATS deliverable (DONE).** The `data:` URI already carries an
  embedded asset's bytes; an EXTERNAL `<graphic xlink:href="path">` is a *dangling reference* — the bytes
  are not carried. `enscribe export-jats --package -o <dir>` closes that: it emits a self-contained
  package — `<dir>/<name>.xml` plus `<dir>/assets/` holding every external file-backed asset copied in —
  and rewrites each external figure's `xlink:href` to the package-relative `assets/<name>` (matching JATS's
  article-package convention; binaries stay binaries). The mechanism is the natural hybrid: **inline what
  is inherently inline** (an inline `<svg>` → a base64 `data:` URI; an embedded `<data>` base64 asset →
  its `data:` URI; a DSL diagram → `<preformat>` source — none has an external file), **package what is an
  external reference** (an external `<fig src="path">`, and an external-asset `@id` resolved to a path). A
  `data:` URI and an `http(s)://` URL are left untouched (already self-contained / portable). The emit side
  is neutral — `emitFigureJats`'s `graphicHref` registers each external file src and rewrites its href when
  the caller (`enscribeToJats`'s `opts.assetPackage`) is in package mode; the CLI (`doExportJatsPackage`)
  resolves each registered src against the input dir and copies it, mirroring `buildLiveFolder`'s
  mkdir + copyFileSync. Lone-file / stdout export is unchanged (external hrefs emit as-authored — the
  pre-existing dangling reference — and the CLI warns). Content-hash dedup across distinct paths with
  identical bytes, and a JATS package *manifest*, are not done (a basename collision between two different
  srcs is disambiguated with a `-N` suffix; identical srcs dedupe to one copy) — noted as follow-ups, not
  needed for a valid, portable package. Tables/datasets need no packaging: their bytes are parsed and
  **inlined** into `<table-wrap>`/`<preformat>` before export, so nothing file-backed reaches emit.
- **`<dataset>` → ? (OPEN QUESTION).** What a stored dataset projects to in JATS is an open design
  question for the JATS slice — a candidate is `<supplementary-material>` (or, for a table consumer of
  the dataset, the existing `<table-wrap>` path). **Not decided here**; named so the JATS slice owns it
  rather than inventing a projection ad hoc.

---

## The #313 build sequence

Derived from the principle (the audit's recommended order, justified): one neutral hand-off, opacity
first, interpretation per consumer, packaging last.

0. **This spec** — the governing principle + the owned home (this note). *No code.* **(DONE.)**
1. **`<dataset>` opaque** — add the element to the `<data>` content model on a non-`default` (opaque)
   handler. Routes to the existing opaque lane; smallest first step. **(DONE — generic opaque marker +
   a `format` kwarg read at harvest; harvested beside the asset registry; renders nothing.)**
2. **Neutralize `@id` resolution + route all errors visible** — make resolution consumer-agnostic
   (id → opaque bytes), move the image-shaped rewrite out to the `<fig>` consumer, and make every
   consumer's unresolved `@id` a visible error (closes the `<table src="@id">` silent-fail, F2.1).
   **(DONE — `resolveAssetReference` neutral; `resolveFig` / `resolveTableSrc` per-consumer;
   `<table src="@id">` renders a dataset as a grid; F2.1 closed. See the split, above.)**
3. **Per-consumer interpretation, incl. JATS** — each consuming element interprets the handed-off bytes
   (HTML render + JATS projection). `<fig>`→`<graphic>` is done and `<table src="@id">` renders a grid
   (slice 2); **`<diagram src="@id">` feeds a dataset as engine source and `<code src="@id">` renders one
   as a verbatim body** (the consumer-wiring slice — HTML render, sharing `readDatasetSource`; a
   diagram's format-hint/engine mismatch is a visible error). Because resolution rewrites the node's
   content **in-tree before serialization**, a dataset-sourced diagram/code projects to JATS through each
   element's EXISTING projection (the resolved content, not the `@id`), so no consumer-specific JATS work
   was needed for them. The `<dataset>`-element's OWN `<dataset>`→JATS projection (Piece 4) is still open
   for the JATS slice; a `<plot src="@id">` consumer is the remaining trivial future caller of
   `resolveAssetReference`.
4. **Binary packaging** — a document's EXTERNAL referenced assets are carried into each self-contained
   deliverable so it renders its assets when opened from anywhere. Two deliverables, each packaging in the
   form its format wants:
   - **Single-file HTML (DONE)** — `buildSingleFile` `embedExternalAssets`: a parse-guided source edit
     rewrites each external `<fig src="local">` to a `data:` URI and each `<table … src="local"/>` to inline
     long-form `<table …>bytes</table>`, reading the bytes at build; embedded `<fig #id>base64</fig>` /
     `<dataset>` already travel in the source; an `@id`/`data:`/http(s) src is left untouched.
     Round-trip-safe: opaque bytes, the engine re-parses normal source at mount, no serialize-then-reparse.
   - **JATS package (DONE)** — `enscribe export-jats --package -o <dir>` emits a `<dir>/<name>.xml` +
     `<dir>/assets/` package (the JATS article-package convention: binaries stay binaries, not inlined),
     copying every external file-backed asset in and rewriting each external `<graphic xlink:href>` to
     `assets/<name>`; inline SVG / DSL `<preformat>` / embedded base64 stay inline; `data:`/`http(s)` are
     left untouched. See Piece 4. Lone-file / stdout export is unchanged (dangling ref + a warning).

   SCOPE: assets only — embedding external STRUCTURE children (book chapters / website pages =
   site-in-a-file) is a separate, still-deferred follow-on.

This completes the #313 build sequence (slices 0–4); the `<diagram src="@id">` / `<code src="@id">`
consumers (the consumer-wiring slice) fill out slice 3's per-consumer interpretation. The remaining
#313-adjacent open items are the `<dataset>`→JATS projection (Piece 4 / the JATS slice), the
`<plot src="@id">` consumer (a trivial future caller of `resolveAssetReference`), and site-in-a-file
(external structure children in one file).

**[#330] parallelizes.** #330 is an independent parser fix for mixed-content whitespace; it **cannot**
affect stored data, because opaque content never enters the interpreted-content mixer (Piece 1). The
two slices are disjoint and may run concurrently.

## Relationship to the deferred stores (reconciliation)

| Spec | Owns | Status |
|------|------|--------|
| `data-store.md` (this) | the **build-time** store: opacity, consumer-agnostic `@id` resolution, per-consumer interpretation incl. JATS, the round-trip invariant | the #313 design of record |
| `runtime-data-store.md` | the **runtime** store: client-side re-reading after load + single-copy dedup, hydrated from a build-emitted data island | deferred, build-on-first-reader, **additive** |
| `shared-registry-store.md` | **persistence** of the merged registry across parallel/incremental/live renders (IndexedDB/OPFS or a file) | deferred, gated on the reading-model decision |

No overlap by construction: this note is about *interpretation at build*; runtime-data-store is about
*re-reading at runtime*; shared-registry-store is about *where the registry persists*. The shared
authoring principle they all rest on — "storage commits to nothing; the reader/consumer types it" —
is stated here and echoed in runtime-data-store.md §"The model".

## See also

- `notes/specs/runtime-data-store.md`, `notes/specs/shared-registry-store.md` — the deferred siblings.
- `packages/ehtml/elements/data.md` — the `<data>` storage host (and `<dataset>` as a
  future child of its content model).
- `packages/enscribe/src/interpreter/plugins/asset-load.js` — the resolver (neutralized in slice 2:
  `resolveAssetReference` is the neutral hand-off; `resolveFig` / `resolveTableSrc` / `resolveDiagramSrc`
  / `resolveCodeSrc` interpret per consumer, the last two sharing `readDatasetSource`).
- `packages/enscribe/src/parser/recursive-content.js` — the `contentHandler !== 'default'` skip that
  makes the opaque lane opaque.
- `packages/cli/src/jats-export/index.js` (`emitFigureJats`) — the shipped `<fig>`→`<graphic>` projection.
