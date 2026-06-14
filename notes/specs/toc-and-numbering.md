# Table of contents and section numbering

How the table of contents is generated and how section numbering is controlled. This is one job — the
generated contents listing and the numbering of headings. Book navigation (chapter rail, prev/next,
cover) is a sibling concern with its own spec.

All settings are `<config>` kwargs.

## Defaults: contents opt-in; numbering off for articles, on for books

A document gets **no** table of contents unless it asks for one — `toc` defaults off, for articles and
books alike. Nothing is auto-inserted, so authoring stays clean and a document carries only the
structure its author opted into. Books are **not** special-cased for the contents listing: a book that
wants one sets `<config toc>` in its master (as the example documents and the docs site do).

`number-sections`, by contrast, splits by document class — **off for articles, on for books**.
Declaring `<meta type=book>` opts into book conventions, where numbered chapters and sections
("2.1 Methods") are standard; a book that does *not* want them sets `number-sections=false`, and an
article that does want them sets `number-sections`. This mirrors the book-navigation default
(declaring a book opts into book chrome) and the LaTeX model (auto-numbered sections + an opt-in
`\tableofcontents`). (Quarto and LaTeX disagree on numbering — Quarto off, LaTeX on — so Enscribe
splits by class rather than picking one.) A `<config>` setting in the master overrides the default
either way.

## Table of contents

| kwarg | type | default | meaning |
|---|---|---|---|
| `toc` | boolean | off | Generate a table of contents. |
| `toc-depth` | integer | `3` | Deepest heading level included in the listing (`3` = levels 1–3). |
| `toc-title` | string | `"Contents"` | Heading shown above the listing. |
| `toc-location` | `body` \| `left` \| `right` | `body` | Where the contents render. `body` = inline near the top; `left`/`right` = a sticky margin sidebar — a "floating" contents that follows the reader as they scroll. |
| `toc-expand` | integer \| `all` \| `none` | `1` | Levels expanded initially in a collapsible sidebar listing; deeper levels auto-expand as the reader scrolls. No effect on a `body` listing, which is shown in full. |

A **floating** contents — the on-this-page sidebar used by the docs site and the example documents — is
simply `toc-location: right` (or `left`): a sidebar location is sticky and scroll-aware by nature, so
"floating" is a property of the location, not a separate setting.

## Section numbering

| kwarg | type | default | meaning |
|---|---|---|---|
| `number-sections` | boolean | off (article) · on (book) | Number the headings. |
| `number-depth` | integer | all levels | Deepest heading level that receives a number. |

## Listing depth and numbering depth are independent

`toc-depth` controls what the contents **list**; `number-depth` controls what gets **numbered**. They
need not agree. A heading may be numbered but not listed (deep subsections numbered for cross-reference
but kept out of a shallow ToC), or listed but not numbered. Collapsing the two into a single "depth"
knob is the mistake this separation exists to avoid.

## Placement

When `toc` is on, the contents are placed **automatically at the top** of the document, after the title
block — no marker required, so authoring stays clean. For `toc-location: left | right` the contents
render as a sticky sidebar instead, and the top placement does not apply.

(Explicit in-body placement via a `<toc>` marker — for an author who wants the contents somewhere other
than the top — is deferred, not part of this spec.)

## Per-heading overrides

Two kwargs on an individual heading override the global depths for that heading only:

| kwarg | effect |
|---|---|
| `unlisted` | Keep this heading out of the contents, regardless of `toc-depth`. |
| `unnumbered` | Skip this heading's number, regardless of `number-depth`. |

These let prefatory or appendix material (a preface, an unnumbered index chapter) opt out without
moving the document-wide depths. `unlisted` drops the heading **and its subtree** from the listing —
a prefatory part opts out wholesale, not leaving orphaned subsections behind.

The overrides are boolean attributes on the heading, authored either as the bare canonical form the
tables above show — `<section unlisted | …>`, `<book-part type="appendix" unnumbered | …>` — or with
the `+flag` boolean shorthand (`<section +unlisted | …>`); the two are equivalent. A bare *known*
boolean parses as `true` ([#219](https://github.com/enscribejs/enscribe/issues/219)); a bare unknown
name stays unrecognized, so a typo never becomes a phantom boolean.

## Layer 1 form

`<config>` is itself a Layer 1 vocabulary element (the configuration container, kwargs-only), so these
settings do not expand into other elements the way the sectioning shorthands do — the Layer 2 kwargs
map one-to-one onto canonical HTML attributes on the same `<config>` element:

```
Layer 2:  <config toc number-sections toc-depth=2 number-depth=3>
Layer 1:  <config toc number-sections toc-depth="2" number-depth="3">
```

Two consequences for the Layer 1 reference:

- The per-heading overrides are **not** config — `unlisted`/`unnumbered` are boolean attributes on the
  sectioning elements themselves (`<section unnumbered>`, `<book-part type="appendix" unlisted>`). So
  this touches two vocabulary entries: `<config>` gains the contents/numbering attributes, and the
  sectioning elements gain the two override booleans.
- Layer 1 stays **declarative** — it never holds the materialized contents listing or the stamped
  section numbers. Those are computable from the config plus the heading tree, so by Rule 2 they stay
  out of the source; the render generates the listing and stamps the numbers (the same destructive pass
  that resolves refs). With auto-top placement there is no contents node in Layer 1 at all; the renderer
  inserts the listing.

## Scope and links

- ToC entries link to their headings.
- For a book, the contents reflect the assembled whole-book structure; for a single page, that page's
  headings. Settings declared in a book master apply book-wide. A numbered entry (number-sections is
  on by default for books) lists its number and title in separate spans — "1 Counting Elephants",
  not "1Counting Elephants".
- `<config toc>` produces the **contents listing** only — for an article or a book. The book
  **reading-interface chrome** (the chapter rail, prev/next, cover) is the separate, deferred
  book-navigation concern (its own spec); a book that sets `<config toc>` gets the listing, and the
  navigation chrome composes with it when book-navigation lands. The config listing is the source of
  truth: when present it supersedes the legacy build-passed `toc` render option (so there is never a
  double table of contents).

## Deferred (named, not in this spec)

- Per-page override layering of book-wide settings.
- The explicit `<toc>` placement marker.
- Book navigation (chapter rail, prev/next, cover, back-to-top) — its own spec.

---

*Implementation status:* the **table-of-contents** half is wired (#218) — the config-driven contents
listing, read in the shared compiler so the static build and the live render honor it identically.
Authoring: valued kwargs take a value (`toc-depth=2 toc-location=right`); boolean kwargs and the
heading overrides take the **bare** canonical form (`<config toc>`, `<section unlisted>`) or,
equivalently, `=true` / `+flag` — the bare known-boolean form now parses
([#219](https://github.com/enscribejs/enscribe/issues/219)). The gate-tested behaviors — off-by-default,
`toc-depth`, `toc-location` body/left/right, `toc-expand` initial expansion, `+unlisted`, and the
static≡live parity — are checked in `packages/enscribe/test/config-toc.test.js` (and the new
`document-62`/`document-63`/`document-64` fixtures ride the standing render-parity guard).

The **section-numbering** half is also wired (#218) — the destructive number stamp in the shared
`runSync` (`numberSections`), so static and live number identically. `number-sections` (default off
articles / on books) stamps hierarchical 1 / 1.1 / 1.1.1; `number-depth` bounds the numbered levels,
**independent of `toc-depth`**; `<section +unnumbered>` puts a heading outside the sequence (no number,
the counter does not advance, the subtree is unnumbered). Numbered headings show their numbers in the
contents listing (the un-glue path). Gate-tested in `packages/enscribe/test/config-numbering.test.js`
(+ `document-65`). Authoring: `<config number-sections number-depth=2>` (the boolean kwarg bare, the
valued one `=`) and `<section unnumbered>` / `+unnumbered` — bare known booleans parse since #219.

*Spec note for whoever wires this:* the user-facing docs (the authoring guide and the Layer 1
reference) should describe these settings by role and link back here for the authoritative list,
rather than duplicating the tables (Rule 2) — deferred to the docs-adoption slice.
