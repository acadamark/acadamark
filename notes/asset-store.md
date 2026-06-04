# Asset store (design brief)

**Status:** designed, not built. A future-feature blueprint — not yet a buildable slice plan; the
lowering and packaging algorithms below still need their own design pass before implementation.
Earliest target: v0.5.0, likely later.

## Motivation: bridge the notebook / markdown gap

Two familiar formats sit at opposite corners:

- **Notebooks (`.ipynb`)** are *self-contained* — they store their own state: inputs, outputs,
  embedded data and images all travel inside the one file. But they are not human-readable and
  version-control badly — the file is JSON with embedded blobs, so diffs are huge and merges
  hurt.
- **Markdown** is *readable and version-controls cleanly* — but it is not self-contained: assets
  live in external files the document only points at.

The asset store aims to take both corners at once: a readable, diff-friendly source that can
embed its own assets, projecting (as everything in enscribe does) to interactive HTML and
archival JATS.

## Core model: one umbrella, three layers

An **`<asset>`** is an embedded, keyed, referenceable resource. The system separates three things
that are easy to conflate:

- **Format** — how the bytes are serialized and parsed (`csv`, `tsv`, `json`, `png:base64`,
  `library:CSL`).
- **Identity** — what the asset *is*: a table, an image, a bibliography. Intrinsic and stable.
  CSV data *is* tabular; that fact doesn't change with how it's shown. Identity is named by the
  asset's key prefix (`#tbl:…`, `#png:…`, `#lib:…`).
- **Display** — how a given reference site presents it: a `<table>`, a chart, a code block, a
  `<fig>`, a citation list. One asset, many displays.

So `<asset csv #tbl:all_crimes>` is *a table, stored as CSV*, and `<table @tbl:all_crimes>` /
`<chart @tbl:all_crimes>` / `<code @tbl:all_crimes>` are three displays of that one tabular
asset. The prefix names identity, not use.

## Typed members

`<asset>` is the mechanism; typed members ride it: `<data>` (tabular / structured),
`<library>` (bibliographic references), `<image>` (binary images), extensible.

Open surface choice (not structural): these can be named elements that share the asset
machinery, or a single `<asset type:format #key>` element read by its type qualifier. Both fit
enscribe's existing dispatch-by-format-word habit; settle it when this is built.

## The store as the bridge

The store is what reconciles "self-contained" with "readable." Assets are **embedded** (the
notebook win) but **quarantined** in a keyed store that clean prose references by id (the
markdown win). The manuscript prose stays readable and diffs cleanly because payloads live in the
store, not in the sentences.

- **Text-serializable assets** (CSV, bibliography, SVG-as-text, code) get the full win: inline,
  readable, *and* diffable — a CSV diff is meaningful.
- **Binary assets** (e.g. a base64 image) are the hard case: embedding inline reintroduces the
  notebook wart — an unreadable lump that wrecks diffs. Quarantining the blob in the store keeps
  it out of the prose, but the blob's own diff is still noisy. The cleanly self-contained answer
  for binaries is a **package on export** (the EPUB / JATS-archive model: readable source plus
  bundled binary assets), so the source stays text and the binaries ride alongside.

## Organization is authoring-side, not semantic

Grouping ("Ch1 assets here, images there") is *organizational* — author convenience, like
folders — and should resolve away on export; it must not leak into the semantic model or JATS.
Two rules guard this:

- A single element must not be both leaf and folder. If an `<asset>` with a format and payload is
  a leaf, grouping needs its own rule (e.g. a format-less `<asset>` is a group) or a distinct
  element — filesystems keep files and directories separate for a reason.
- Resist building a filesystem inside the document. A shallow keyed store (optionally grouped) is
  the target; deep path semantics are more than the model needs.

## Projection

- **HTML** — the store resolves to point-of-use: the image into a `<fig>`'s graphic, the table
  into its rendered table or chart, the library into citations. Browser display may be
  interactive; the store is just the source of the content.
- **JATS** — JATS has no generic asset store, so the store lowers to use-sites:
  graphic-in-`<fig>`, `<table-wrap>`, `<ref-list>`. Binary payloads become a JATS archive (the
  source XML plus bundled asset files) — the same packaging move as the readable-source export.

## Forward link: computed outputs

The same store is the natural home for *computed* outputs, not just source assets — caching the
result of an executable block (the rendered chart, the evaluated table) the way a notebook stores
its outputs. That is the notebook-"stores-results" parallel; it rides on this store and depends
on executable code blocks (#39).

## How to build it (sketch)

A design pass is still owed on the lowering and packaging algorithms. At the blueprint level the
pieces are:

- The asset element + type dispatch (reusing the format-word dispatch pattern).
- A keyed asset registry (extending the existing id/reference registry, so assets are
  first-class referenceable entities alongside sections and appendices).
- Embed-vs-reference handling per asset (inline payload or external pointer), and the quarantine
  that keeps payloads out of the prose stream.
- Export resolution: store → use-sites, for both HTML and JATS.
- The packaging path for binary assets (readable source + bundled binaries → archive).
- The three-layer separation (format / identity / display) made explicit in the pipeline, so one
  stored asset can drive multiple displays.

## Relationships

- Reframes **#24** — `<data>` and `<library>` become typed members of the asset store rather than
  standalone storage hosts.
- Reintroduces the host→format accept-set entry dropped in **#85** — under this model
  `<asset>` / `<data>` is a typed format-word host, so the entry returns, this time with a real
  consumer.
- Builds toward the computed-output / notebook parallel via **#39** (executable code blocks).
- Interacts with multi-file authoring (**#38**) if assets are shared across files.
