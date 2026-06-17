# Enscribe design decisions

The settled strategic and product-shape decisions: the target user-facing
experience and the cross-cutting choices that steer it. This is the tier above
`DESIGN.md` — `DESIGN.md` holds the engineering rationale (the layer model, the
pipeline, the JATS relationship); this file holds the product-shape decisions
those mechanics serve. Subsystem specs defer up to here for *what experience the
mechanics build toward*, and hold the mechanics themselves.

## Default views

Enscribe targets a suite of standard, ready-made views — the shapes a user gets
without designing their own. Each is modeled on a familiar exemplar so the
behavior is predictable. Print is out of scope for now; these are browser views.

**Article — optional table of contents, inline or floating.** A single-unit
document with no persistent navigation chrome, so its table of contents *is* its
navigation: `<config toc>` renders a contents listing inline at the top
(`toc-location=body`) or as a floating sticky sidebar (`toc-location=left|right`).
Modeled on a standard journal article or long-form web page.

**Book — persistent navigation, Bookdown / Quarto style.** A multi-chapter
document read in the browser, with navigation chrome always on: a persistent left
chapter rail (chapters, optionally nested to their sections), a right "on this
page" rail of the current chapter's sections, prev/next links, and a cover. The
**left chapter rail is the book's table of contents** — there is no separate
front-matter contents page (that is a print-book artifact). Modeled on the
Bookdown gitbook and Quarto book reading interfaces.

**Website — docs-site navigation, Quarto / Jekyll style.** A page tree read as a
site. It reuses the book's navigation components — a persistent left nav tree (the
page tree in place of the chapter rail) and a right on-this-page rail — and adds
site-level top navigation between sections. Forward work, tracked as the website
document type (#246). Modeled on a Quarto website / Jekyll docs theme.

These are *defaults*, not a ceiling — a user can always style or script their own.
The value is that the common cases need no design work.

## Table of contents by document class

`<config toc>`'s meaning is **per document class**, because the three views relate
to a contents listing differently:

- **Article** — `<config toc>` *is* the contents listing (inline or floating
  sidebar); an article has no other navigation.
- **Book** — the persistent chapter rail is the table of contents. `<config toc>`
  adds a contents **overview on the cover / landing page** (the Quarto book index
  pattern), not a separate contents page. `toc-location=left|right` is not a second
  book sidebar — the chapter rail already fills that role — so on a book those
  locations emit a located diagnostic rather than a competing sidebar.
- **Website** — the persistent page-tree nav is the table of contents;
  `<config toc>` is the landing / section index. (Forward, with #246.)

The mechanics live in `notes/specs/toc-and-numbering.md` (the listing) and
`notes/specs/book-navigation.md` (the rail); this entry is the cross-class shape
they implement.