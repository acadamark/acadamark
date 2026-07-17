# Book navigation

How a book's navigation chrome is configured — the chapter rail, prev/next links, cover, and the unit
the book paginates into. This is the sibling of `toc-and-numbering.md`: that one governs the contents
listing and numbering of any document; this one governs the cross-chapter chrome of a book.

All settings are `<config>` kwargs, and they apply only to a book (`<meta type=book>`). An article
ignores them.

## Default: a book is navigable

Unlike the table of contents — which is opt-in (off by default) — book navigation chrome is **on by
default for books**. Declaring `<meta type=book>` *is* the opt-in: a multi-chapter book is only usable
with a way to move between chapters, so the chapter rail, prev/next links, and cover appear
automatically. The settings below let an author turn pieces off or tune them; they do not need to be
switched on. (This also matches Quarto and bookdown, where a book's sidebar and page navigation are on
by default, and it preserves the existing book view, which already renders this chrome.)

## Settings

| kwarg | type | default | meaning | lineage |
|---|---|---|---|---|
| `chapter-nav` | boolean | on | The persistent chapter rail (the list of chapters, always visible). Its header is the return-to-cover / book-home link. | Quarto book `sidebar`, bookdown gitbook sidebar |
| `chapter-nav-depth` | integer | `1` | Rail depth: `1` = chapters only; `2` = chapters plus their sections. | Quarto sidebar `collapse-level` |
| `page-navigation` | boolean | on | Prev/next chapter navigation: the labelled links at the foot of each chapter **and** persistent `‹` / `›` chapter arrows (#293) — the Bookdown-style always-reachable affordance so a reader moves between chapters without scrolling. Both read one prev/next source (`prevNextParts`) so they cannot disagree. The arrows are ONE control with two responsive renderings: on the **desktop** reading layout, fixed chevrons tucked into the grid's side gutters (clear of the rail and content), alongside the foot links; on the **narrow / mobile** layout (no gutter), in-flow at the **foot** of the chapter as tappable buttons showing the chevron + destination chapter title (the FPP3 pattern), with the redundant text foot links hidden there — one coherent foot affordance, no overlap. | Quarto `page-navigation`, bookdown page arrows |
| `cover` | boolean | on | Show the cover / title page as the book's landing view. Off = land on the first chapter. | Enscribe cover route |
| `back-to-top` | boolean | off | An optional scroll-to-top control within a chapter (distinct from the rail's return-to-cover link). | Quarto `back-to-top-navigation` |
| `on-this-page` | boolean | on | The per-chapter "on this page" rail — the current chapter's section list, shown as the right column of the reading interface. Off drops the interface to two columns (chapter rail + body). Gated identically in all three shapes (single-scroll, separate-pages, live). | Quarto right-margin TOC |
| `split-by` | `chapter` \| `section` \| `none` | `chapter` | The pagination unit — how the book breaks into navigable pages/routes (see below). | bookdown `split_by` |

## Pagination (`split-by`)

`split-by` sets the granularity at which the book becomes navigable units:

- `chapter` (default) — each chapter is its own page/route; the rail and prev/next move between
  chapters. This is what the live render and the static separate-pages build do today. The chapter is an
  **addressable page**: static a per-chapter file (`<book-dir>/<stem>.html`), live a query route
  (`?chapter=<stem>`, or `?page=<slug>&chapter=<stem>` inside a website) — analogous forms of the same
  unit. A section WITHIN a chapter is the URL **hash** (`…#<id>`), so a section is independently
  deep-linkable; the chapter (the page) and the section (the hash) never compete for one slot.
- `section` — split one level deeper, so each top-level section is its own unit.
- `none` — the whole book is a single scroll, with the rail acting as in-page jump links.

`chapter` is the implemented paginated unit (the live render and the static separate-pages build).
`none` — the whole book on one scroll — is realized by the static `build --single-page` (its reading
interface honors the same book-nav config; see "The single-scroll surface" below), so it is **not**
deferred. Only `section` remains deferred.

## The single-scroll surface (`--single-page`)

`build --single-page` renders the whole book as one scrolling standalone document — it **is** the
`split-by=none` rendering. Since #454 its reading interface reads the book-nav config from the **one
shared reader** (`resolveBookNavConfig`) the separate-pages and live shapes use, so the config behaves
identically across all three shapes — no silently-dead keys. Per key on this surface:

- `chapter-nav`, `chapter-nav-depth`, `page-navigation`, `on-this-page` — **honored**, identically to
  the other two shapes: the persistent chapter rail (in-page jump links), its depth, the prev/next foot
  bar (in-page anchors), and the on-this-page rail. (Before #454 the single-scroll interface honored
  only `on-this-page` and silently ignored the other three.)
- `cover` — **N/A**: `cover` selects the landing view among a book's addressable pages/routes, which do
  not exist on one scroll (the whole book is a single document; its title page is the top of the scroll).
- `back-to-top` — **N/A**: the scroll-to-top control is separate-pages/live chrome, not part of the
  compiler's single-scroll reading interface. (Bringing it here is a nav-parity enhancement, tracked
  separately.)
- `split-by` — the surface **is** `split-by=none`, so a `split-by` value is moot here and fires no
  "not built" warning (the pagination-deferred warning applies only where the book actually paginates).

## eHTML form

Like the contents/numbering settings, these are `<config>` kwargs that map one-to-one onto canonical
HTML attributes on the `<config>` element — `<config chapter-nav page-navigation split-by="chapter">` —
with no structural expansion.

And the same Rule 2 discipline applies: eHTML stays **declarative**. The chapter rail, the prev/next
links, and the cover are all *computable* from the book's structure plus this config, so they are not
materialized in the source — the render generates the chrome. eHTML carries the book's `<book-part>`
structure and the `<config>` directives; the navigation is a render product, never a source node.

## Scope

Book-only, gated on `<meta type=book>`. Settings live in the book master's `<config>` and apply
book-wide. (Per-page override layering is deferred, as in the contents/numbering spec.)

## Deferred (named, not in this spec)

- `split-by: section` (only `chapter` — paginated — and `none` — the `--single-page` single scroll —
  are built).
- Per-page override layering of book-wide settings.
- Search, downloads, and other sidebar tools (bookdown/Quarto offer these; out of scope here).

---

*Spec note for whoever wires this:* fit the headings to the `notes/specs/` house style and attach
predicate IDs where behavior is gate-tested (the on-by-default-for-books behavior and the
`chapter-nav` / `page-navigation` / `cover` toggles are the candidates). The user-facing docs (authoring
guide + eHTML reference) describe these by role and link back here for the authoritative list rather
than duplicating the table (Rule 2).
