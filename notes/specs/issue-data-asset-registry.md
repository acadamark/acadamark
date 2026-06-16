**Suggested title:** `<data>` asset registry: embedded `<fig>` + `src="@id"` resolution is specced but unimplemented

**Suggested labels:** enhancement, infrastructure · part of #190 (the assembler's "embedded-asset coverage in `<data>`" item)

---

## Summary

The `<data>` registry is specified (`notes/specs/master-document.md` §`<data>`) as a keyed store of **both** libraries *and* assets — anything in it has an id, and the body references it by id, never by path. The **library half** is implemented (`<library>` → the citation registry, merged project-wide in #190). The **asset half** is not: a `<data>`-declared `<fig>` asset and the `src="@id"` reference that pulls it in do not resolve.

## What the spec describes

```
<data>
   <library src="references.bib" />
   <fig #fig:scatter png>{base64}</fig>
</data>
```

An asset is **declared** in `<data>` with the `#` id sigil, embedded (`<fig #fig:scatter png>{base64}</fig>`) or external (`<fig #fig:scatter src="data/scatter.png" />`). The body **pulls it in** by setting `src` to the asset id with the `@` sigil: `<fig src="@fig:scatter" />`. Embedded-vs-external is only about where the bytes live; the body always references the same way.

`@` is the one universal "the thing with this id" sigil — `@key` in citations, `@fig:x` in cross-refs (`<ref @fig:x>`), `@fig:x` in a `src`. What happens depends on position: a `<ref>`/`<cite>` links to it; a `src` loads its bytes. A `src` value beginning with `@` resolves from the local `<data>` store rather than a path/URL — the single parser branch — and is rewritten to a real `data:` URI (embedded) or path (external) before the HTML projection. Like the library half, the registry is project-wide: an asset declared in any file is referenceable from any file.

## What works today

- **Inline external figures**: `<fig #fig:scatter src="elephant.jpg" | caption>` generates an `<img src>` in place (handler `handlers/figure.js`, documented in `elements/fig.md`).
- The `<data>` **library** half: `<library>` → the citation registry, and (per #190) merged across the master + every child, with child-relative `src` rebasing.

## The gap

A read of the figure handler and the interpreter index turns up **no `src="@id"` resolution, no `<data>` asset registry, and no embedded-`<fig>`-base64 → `data:`-URI path**. So a `<fig src="@fig:scatter" />` does not resolve, and an embedded `<fig #fig:scatter png>{base64}</fig>` is not turned into a usable `<img>`. (#190's body: "embedded-asset coverage in `<data>` — png shown in the spec; others to follow." The png is the spec *example*, not a working path.) Confirm the exact current state in Phase 0 — this is from a code read, not an exhaustive trace.

## Scope (the asset twin of the citation registry — wants a design pass before slicing)

- **The registry.** Collect `<data>`-declared assets (`<fig #id …>`, and decide whether `<table>`/`<csv>`/… participate) into a keyed, id-addressed store.
- **`src="@id"` resolution.** A leading `@` in `src` → look up the asset and emit an `<img>` from a `data:` URI (embedded) or from the external `src` — inheriting `<fig>`'s caption, numbering, and cross-reference behavior. (Does the figure render at the reference position, with `<data>` holding bytes only? What if the same id is pulled in twice?)
- **Embedded → `data:` URI.** `<fig #id png>{base64}</fig>` → `<img src="data:image/png;base64,…">`. Media-type coverage: png first, then jpg/jpeg/svg/gif/webp/… — and how the type is determined (the `png`-style flag vs sniffing the bytes).
- **Cross-file merge.** Assets declared in any file referenceable from any file, parallel to the #190 citation-registry merge — reusing the same child-relative `src` rebasing for external assets.
- **JATS/BITS export.** Embedded `<fig>` → `<graphic>` (embedded vs external `xlink:href`).
- **Vocab + gallery.** `fig.md` documents `src` + body forms but not the `<data>`-registry embedded / `src="@id"` forms.

## References

- Design of record: `notes/specs/master-document.md` §`<data>`.
- Sibling (built): the citation registry + its project-wide merge (#190).
- Parent: #190 (assembler epic) — its "embedded-asset coverage in `<data>`" item.
- Possible follow-on (reading-model arc, not this issue): persist the merged registry (`<data>`/`<meta>`/`<config>`) into a local store (IndexedDB/OPFS in the browser engine) so parallel/incremental/live renderers share one source of truth instead of each re-parsing.
