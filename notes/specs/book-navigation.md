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
| `chapter-nav-side` | `left` \| `right` | `left` | Which side the chapter rail floats on. A non-default side (or margin notes) switches the book to the floating-nav layout (see "Floating placement" below). Inert when `chapter-nav` is off. | gitbook / Quarto sidebar side |
| `page-navigation` | boolean | on | Prev/next chapter navigation: the labelled links at the foot of each chapter **and** persistent `‹` / `›` chapter arrows (#293) — the Bookdown-style always-reachable affordance so a reader moves between chapters without scrolling. Both read one prev/next source (`prevNextParts`) so they cannot disagree. The arrows are ONE control with two responsive renderings: on the **desktop** reading layout, fixed chevrons tucked into the grid's side gutters (clear of the rail and content), alongside the foot links; on the **narrow / mobile** layout (no gutter), in-flow at the **foot** of the chapter as tappable buttons showing the chevron + destination chapter title (the FPP3 pattern), with the redundant text foot links hidden there — one coherent foot affordance, no overlap. | Quarto `page-navigation`, bookdown page arrows |
| `cover` | boolean | on | Show the cover / title page as the book's landing view. Off = land on the first chapter. | Enscribe cover route |
| `back-to-top` | boolean | off | An optional scroll-to-top control within a chapter (distinct from the rail's return-to-cover link). | Quarto `back-to-top-navigation` |
| `on-this-page` | boolean | on | The per-chapter "on this page" rail — the current chapter's section list, shown as the right column of the reading interface. Off drops the interface to two columns (chapter rail + body). Gated identically in all three shapes (single-scroll, separate-pages, live). | Quarto right-margin TOC |
| `on-this-page-side` | `left` \| `right` | `right` | Which side the on-this-page rail floats on. A non-default side (or margin notes) switches the book to the floating-nav layout (see "Floating placement" below). Inert when `on-this-page` is off. | Quarto right-margin TOC side |
| `combined-nav` | boolean | off | The **scrollable expanding combined nav** — ONE panel that absorbs the chapter rail *and* the on-this-page rail, the current chapter expanded to its sections (see "The combined expanding nav" below). Off = the two separate navs. | bookdown / Quarto gitbook sidebar |
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

## Floating placement (#459 part 1)

A book has two navigation elements: the **whole-book chapter rail** (the ToC) and the **in-page
section nav** (the "on this page" rail). By default the chapter rail sits on the left and the
on-this-page rail on the right, as a sticky three-column grid — the layout the book has always had.

`chapter-nav-side` and `on-this-page-side` let an author place **each nav on the left or the right,
independently**. Setting either to a non-default side (or turning on margin notes — see below)
switches the book from the sticky-grid to the **floating regime**: the reading column centers as a
single column, and each nav becomes a **fixed overlay** ("floats") anchored to its chosen side,
above the scrolling content. Two navs placed on the **same** side stack in one dock (the chapter rail
above the in-page rail). This holds on **every** book surface — single-scroll (`--single-page`),
separate-pages, live, and website book pages — because all four share one placement reader
(`resolveBookNavConfig`), one layout composer, and one stylesheet (`BOOK_FLOAT_CSS`).

**Default placement (rail left, on-this-page right) is byte-identical to before #459** — the floating
rules are class-scoped and only ship when a book opts in, so an unconfigured book renders the exact
sticky-grid it always did. A side value is **inert when its nav is off** (`chapter-nav=false` +
`chapter-nav-side=right` shows no rail at all — there is nothing to place).

The **scrollable expanding combined nav** (bookdown/Quarto style, where the current chapter's rail
entry expands to its sections) is #459 **part 2** — see "The combined expanding nav" below.

*(Website tuck — #459.)* On a website book page the floating docks anchor `top:` to
`--enscribe-site-nav-height`, which the website shell now **declares** (`3.25rem`, on `.enscribe-site`)
so the docks tuck **under** the sticky top bar. A standalone book has no `.enscribe-site`, so the
value stays `0` and the docks anchor to the viewport top. (Part 1 referenced the variable but never
declared it, so the docks fell back to `0` and rendered *behind* the website bar; part 2 declares it.)

## The stacking rule (margin notes + floating navs) — required behavior, NOT a bug

When a book uses margin notes (`note-position=margin`, see `notes/specs/settings.md` and the notes
family) **and** a floating nav, the two compose by an explicit layering model that a future session
**must not mistake for a defect**:

- **Notes are tied to the page text and scroll with it.** A margin note floats into the reading
  column's margin gutter beside its marker; as the reader scrolls, the note moves with its paragraph.
- **Floating navs are fixed and stack _above_ the notes.** A floating nav is a fixed overlay with a
  higher stacking order (an opaque, page-coloured panel), so it does not scroll.
- **Therefore a right-side floating nav over right-margin notes makes the notes pass _behind_ the nav
  while scrolling.** This is the author's chosen composition — Enscribe does **not** block or "fix"
  it. The nav's opaque panel cleanly occludes the notes as they pass under it; nothing is lost (the
  note is still in the gutter, just momentarily behind the nav). Placing the navs and the notes on
  **opposite** sides (e.g. both navs left, notes right) leaves the notes fully unobstructed.
- **Recommended pairing for margin-note authors:** the expanding combined nav (`combined-nav`, below),
  which puts a single nav on one side (the left by default) and leaves the other margin free for notes.

*Delivery note (scope of #459 part 1):* the margin-note **layering** above is authored once and
applies wherever book margin notes are rendered. Today only the single-scroll (`--single-page`) book
actually **projects** margin notes; the separate-pages / live / website book surfaces render each
chapter in isolation (`renderChapter`), so the note bodies are not yet reachable to project — a
note-engine change tracked as its own follow-on (#467). The layering CSS is in place so those
surfaces compose correctly the moment projection reaches them.

## The combined expanding nav (#459 part 2)

`combined-nav` turns the book's two navs into **one** scrollable panel — the bookdown/Quarto gitbook
sidebar. Instead of a whole-book chapter rail on one side and an in-page section rail on the other,
a single panel lists **every** chapter and **expands the current chapter to its sections**; the other
chapters are collapsed. It **absorbs** the on-this-page rail (the current chapter's sections appear
inline under its entry), so only one nav occupies the margin — and it takes **one** side, leaving the
other margin free. That is why it is the recommended pairing for margin-note authors.

**Static-correct, no JS required.** Each rendered page knows its own chapter, so the current chapter is
expanded in the **static markup** (its rail entry carries `--open`, and CSS shows its section list) with
no script. Click-to-expand of *other* chapters is a **progressive enhancement**: where scripts run, a
caret on each chapter (hidden until then, so a no-JS reader sees no dead control) toggles that chapter's
sections open/closed. The enhancement script is idempotent and re-runs after every live content swap
(`executeAssets`), so the expansion survives live chapter navigation.

**It rides the floating regime.** A combined book is always in the floating layout (above): the single
panel is a fixed, scrollable dock on its side, and the reading column centers. So it works identically on
all four surfaces — single-scroll (`--single-page`), separate-pages, live, and website book pages — from
the one placement reader, one layout composer, and one stylesheet, exactly like part 1.

**What the other keys mean while combined** (they keep their names; the combined mode reinterprets a
few, stated here so nothing is silently dead):

- `chapter-nav` — the combined panel **is** the chapter nav. `chapter-nav=false` therefore shows **no
  nav at all** (there is nothing to combine).
- `on-this-page` — toggles whether the current chapter **expands to its sections**. On (default): the
  current chapter is expanded (`--open`) and every chapter carries its collapsible section list. Off:
  the panel lists **chapters only**, no expansion (and no carets).
- `chapter-nav-side` — chooses the **single panel's side** (default `left`, which leaves the right
  margin — the default note gutter — clear).
- `on-this-page-side` — **inert**: there is no separate on-this-page rail to place.
- `chapter-nav-depth` — the depth of the expanded chapter's section list (`1` = its top-level sections;
  `≥2` nests deeper), reusing the same rail-depth machinery.
- `page-navigation`, `cover`, `back-to-top` — **unchanged** (they are separate chrome, not part of the
  nav panel).

**On the single scroll (`--single-page`)** there is no per-page "current" chapter, so the panel expands
the **first** chapter (the top of the scroll, where the reader lands); click-to-expand opens the rest.
As with all book-nav config on that surface, the reading interface (hence the combined panel) is enabled
by the `--toc` render option — see "The single-scroll surface" above.

**Default byte-stability.** `combined-nav` off is byte-identical to before #459 part 2: the combined
markup, CSS, and script ship only when the mode is on, so an unconfigured book renders the exact
separate-nav layout it always did.

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
