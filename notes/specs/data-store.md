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

> The current resolution is **fig-shaped**: it bakes the image consumer's `data:` URI into the
> resolver itself (`packages/enscribe/src/interpreter/plugins/asset-load.js`, `enscribeAssetResolution`
> rewrites a body `<fig>`'s `@`-src to `data:<mime>;base64,…`). The principled generalization is to make
> resolution **neutral** and move interpretation to the consumer. Named here as the known gap to close
> in #313 (slice 2), not as already-done.

---

## Derived design

### Piece 1 — `<dataset>` as an opaque store element

`<dataset>` holds CSV / JSON / TSV / other tabular or structured payloads inside `<data>` as **opaque
bytes**. Its content handler is a **non-`default`** (opaque) handler — explicitly *not* `default`,
because the `default` handler recursively re-parses string content as markdown
(`packages/enscribe/src/parser/recursive-content.js`), which would both mangle the data (a `#` becomes
a heading, a `*` becomes emphasis) and expose it to the [#330] mixed-content whitespace class.

This is **routing the new element to the existing opaque lane, not new machinery.** The lane already
exists and is load-bearing today:

- `recursive-content.js` walks `enscribeTag` nodes and **skips any node whose `contentHandler !==
  'default'`** (the `return SKIP` guard) — so a non-`default` handler's content is never re-mixed.
- Several elements already ride this lane: `code` (`content_handler: code`), `diagram`
  (`content_handler: diagram`), `library` (the BibTeX/CSL payload, `content_handler: library`), `table`
  (`content_handler: table` — "never recursively-parsed"), and the literal `opaque` handler used by
  `svg` and `minipage`.

So `<dataset>`'s store behavior is specified by **choosing a non-`default` (opaque) handler** and
adding the element to the `<data>` content model — the opaque guarantee then falls out of the existing
lane. Whether `<dataset>` reuses the generic `opaque` handler or gets a thin `dataset` handler (e.g. to
carry a `format` hint as metadata, still without interpreting the bytes) is a slice-1 implementation
call; either way the bytes stay opaque.

`<dataset>` is a **storage host**, parallel to `<library>` (a foreign-format payload read by a
consumer, not an enscribe-native field record) — see `data.md` §"storage host on the language axis".
It is already named as a future child of `<data>` (`elements/data.md`, content shape).

### Piece 2 — consumer-agnostic `@id` resolution

The neutral hand-off, in three steps that no consumer-type branch may contaminate:

1. **Resolve** `@id` → the opaque bytes (or external path) for that id, from the merged store.
2. **Hand off** those bytes to the use-site element.
3. **The consumer interprets** them: `<fig>` → an `<img>` (`data:` URI for embedded, path for external);
   `<table>` → a parsed grid; `<code>` → verbatim highlighted text; `<dataset>` placed-as-data → its
   consumer's reading; a future `<plot>` → a chart. Each consumer owns its interpretation.

**Reusable vs fig-only today** (the audit's F2.2 / F2.3, confirmed against code):

- *Reusable / already general:* the asset registry (`buildAssetIndex` → `file.data.enscribeAssets`) and
  the `@`-prefix lookup. These are consumer-agnostic in shape and are the parts to keep.
- *Fig-only, to neutralize:* the declaration **harvest** only collects `<fig>` declarations inside
  `<data>` (`asset-load.js`: `if (!isEnscribeTag(child, 'fig')) return true`), and the **resolution**
  runs only for `<fig>` nodes (`if (isEnscribeTag(node, 'fig')) resolveFig(...)`) and bakes the image
  `data:` URI in. Under this principle the **rewrite becomes per-consumer** (each consuming element
  interprets) and the **resolver becomes neutral** (id → bytes, no media assumption).

**All `@id` errors are visible, for every consumer.** Today an unresolved `@id` is a visible
`__asset-error` *only* for `<fig>`; `<table src="@id">` resolves nothing — the `@id` is never routed
through the error path and the failure is **silent** (the audit's F2.1: the table handler treats `src`
as a file path, so `src="@id"` neither resolves nor reports). The spec rule: **an unresolved `@id` is
always a visible error, for every consumer** — the neutral resolver owns the not-found/`unsupported`
diagnostic uniformly, so no consumer can fail silently. (The visible-error shape itself — inline block
naming the reference, never a broken `<img src="@…">` — is the existing `__asset-error` model
generalized.)

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
  `<graphic xlink:href="…">` — a `data:<mime>;base64,…` URI for an embedded asset, or the rebased path
  for an external one — DTD-valid for JATS Archiving 1.3 and BITS 2.0. This is **shipped and
  behaviorally confirmed** (`packages/cli/src/jats-export/index.js`, `emitFigureJats`; tests
  `cli/test/jats-export.test.js` doc58 embedded-png/svg/external + `embedded-asset.test.js`, all
  DTD-validated). The earlier "remaining slice" claim in `elements/data.md` / `elements/fig.md` is
  stale and is corrected by this slice.
- **`<dataset>` → ? (OPEN QUESTION).** What a stored dataset projects to in JATS is an open design
  question for the JATS slice — a candidate is `<supplementary-material>` (or, for a table consumer of
  the dataset, the existing `<table-wrap>` path). **Not decided here**; named so the JATS slice owns it
  rather than inventing a projection ad hoc.

---

## The #313 build sequence

Derived from the principle (the audit's recommended order, justified): one neutral hand-off, opacity
first, interpretation per consumer, packaging last.

0. **This spec** — the governing principle + the owned home (this note). *No code.*
1. **`<dataset>` opaque** — add the element to the `<data>` content model on a non-`default` (opaque)
   handler. Routes to the existing opaque lane; smallest first step.
2. **Neutralize `@id` resolution + route all errors visible** — make resolution consumer-agnostic
   (id → opaque bytes), move the image-shaped rewrite out to the `<fig>` consumer, and make every
   consumer's unresolved `@id` a visible error (closes the `<table src="@id">` silent-fail, F2.1).
3. **Per-consumer interpretation, incl. JATS** — each consuming element interprets the handed-off bytes
   (HTML render + JATS projection). `<fig>`→`<graphic>` is already done; `<table>` / `<code>` /
   `<dataset>` consumers gain theirs; the `<dataset>`→JATS projection question (Piece 4) is answered here.
4. **Binary packaging** — greenfield, last (out of scope for the early slices).

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
- `packages/layer1-vocabulary/elements/data.md` — the `<data>` storage host (and `<dataset>` as a
  future child of its content model).
- `packages/enscribe/src/interpreter/plugins/asset-load.js` — the current fig-shaped resolver (the
  thing slice 2 neutralizes). NOTE: its header comment still reads "Only JATS `<graphic>` export remains
  (slice 4)" — stale (the export is done); a code-touching slice should correct it.
- `packages/enscribe/src/parser/recursive-content.js` — the `contentHandler !== 'default'` skip that
  makes the opaque lane opaque.
- `packages/cli/src/jats-export/index.js` (`emitFigureJats`) — the shipped `<fig>`→`<graphic>` projection.
