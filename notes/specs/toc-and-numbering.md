# Table of contents and section numbering

How the table of contents is generated and how section numbering is controlled. This is one job — the
generated contents listing and the numbering of headings. Book navigation (chapter rail, prev/next,
cover) is a sibling concern with its own spec.

All settings are `<config>` kwargs.

## Defaults: contents opt-in; heading numbering off for every document type

A document gets **no** table of contents unless it asks for one — `toc` defaults off, for articles and
books alike. Nothing is auto-inserted, so authoring stays clean and a document carries only the
structure its author opted into. For a **book**, `<config toc>`'s meaning is per document class (see
`notes/decisions.md`, "Table of contents by document class"): the persistent **chapter rail is the
book's table of contents**, and `<config toc>` adds a contents **overview on the cover / landing page**.
In the **single-page** build that overview is the inline `enscribe-contents` listing reflecting the
whole-book structure; in the **default separate-pages build and the live render** the same whole-book
overview is built at assembly time from the chapter/section tree and rendered on the **cover** (the
`body` location) — uniformly honored across all three book shapes. `toc-location=left|right` is **not**
supported on a book — the chapter rail already fills the sidebar role — so those locations emit a located
diagnostic and the overview renders on the cover regardless. (The rail itself is configured by the
chapter-nav family; see `notes/specs/book-navigation.md`.)

`number-sections` is likewise **off by default — for every document type, including books** (#246/core).
Heading numbering is opt-in: a document (article, book, or website) that wants numbered headings sets
`<config number-sections>`. The previous split-by-class default (on for books) was dropped because the
unnumbered reading is the cleaner baseline — auto-numbering every heading is a strong choice to impose by
default, and the chapter rail already orders a book without numbers. (Quarto agrees — numbering off by
default; LaTeX numbers automatically. Enscribe sides with the opt-in baseline.) When a heading is
unnumbered, a cross-reference to it shows the heading's **title** ("see *Methods*") rather than a number,
and a book's separate-pages chapter URLs are number-free regardless (so they are stable across the
toggle). Float numbering (figures, tables, equations) is independent and stays on.

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
| `number-sections` | boolean | off (all types) | Number the headings. A `<ref>` to an unnumbered heading shows its title. |
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

Two per-heading booleans override the global depths for that heading only. Both are **named in the
positive and default on**; the opt-out is the `-` sign (see the boolean-naming rule in
`shorthand-syntax.md`):

| flag | effect |
|---|---|
| `-listed` | Keep this heading out of the contents, regardless of `toc-depth`. |
| `-numbered` | Skip this heading's number, regardless of `number-depth`. |

These let prefatory or appendix material (a preface, an unnumbered index chapter) opt out without
moving the document-wide depths. `-listed` drops the heading **and its subtree** from the listing —
a prefatory part opts out wholesale, not leaving orphaned subsections behind.

The overrides are boolean attributes on the heading. `listed` and `numbered` default **on**, so the
meaningful authored form is the opt-out — `<section -listed | …>`,
`<book-part type="appendix" -numbered | …>`. The `+flag` / bare forms set the default (on) explicitly
and are therefore redundant: a bare *known* boolean parses as `true`
([#219](https://github.com/enscribejs/enscribe/issues/219)), and a bare unknown name stays
unrecognized, so a typo never becomes a phantom boolean.

## eHTML form

`<config>` is itself an eHTML vocabulary element (the configuration container, kwargs-only), so these
settings do not expand into other elements the way the sectioning shorthands do — the Enscribe shorthand kwargs
map one-to-one onto canonical HTML attributes on the same `<config>` element:

```
Enscribe shorthand:  <config toc number-sections toc-depth=2 number-depth=3>
eHTML:  <config toc number-sections toc-depth="2" number-depth="3">
```

Two consequences for the eHTML reference:

- The per-heading overrides are **not** config — `listed`/`numbered` are boolean attributes on the
  sectioning elements themselves. Both default **on**, so a normal heading carries no attribute; an
  opted-out heading records the deviation in the transparent valued form (`<section listed="false">`,
  `<book-part type="appendix" numbered="false">`). So this touches two vocabulary entries: `<config>`
  gains the contents/numbering attributes, and the sectioning elements gain the two override booleans.
- eHTML stays **declarative** — it never holds the materialized contents listing or the stamped
  section numbers. Those are computable from the config plus the heading tree, so by Rule 2 they stay
  out of the source; the render generates the listing and stamps the numbers (the same destructive pass
  that resolves refs). With auto-top placement there is no contents node in eHTML at all; the renderer
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
Authoring: valued kwargs take a value (`toc-depth=2 toc-location=right`); a boolean `<config>` kwarg
takes the **bare** canonical form (`<config toc>`) or, equivalently, `=true` / `+flag` — the bare
known-boolean form now parses ([#219](https://github.com/enscribejs/enscribe/issues/219)). The
per-heading `listed` override defaults on, so its authored form is the opt-out `<section -listed | …>`.
The gate-tested behaviors — off-by-default,
`toc-depth`, `toc-location` body/left/right, `toc-expand` initial expansion, `-listed`, and the
static≡live parity — are checked in `packages/enscribe/test/config-toc.test.js` (and the new
`document-62`/`document-63`/`document-64` fixtures ride the standing render-parity guard).

The **section-numbering** half is also wired (#218) — the destructive number stamp in the shared
`runSync` (`numberSections`), so static and live number identically. `number-sections` (default off
for ALL types — #246/core) stamps hierarchical 1 / 1.1 / 1.1.1; `number-depth` bounds the numbered levels,
**independent of `toc-depth`**; `<section -numbered>` puts a heading outside the sequence (no number,
the counter does not advance, the subtree is unnumbered). Numbered headings show their numbers in the
contents listing (the un-glue path). Gate-tested in `packages/enscribe/test/config-numbering.test.js`
(+ `document-65`). Authoring: `<config number-sections number-depth=2>` (the boolean `<config>` kwarg
bare, the valued one `=`); the per-heading `numbered` override defaults on, so its authored form is the
opt-out `<section -numbered | …>`.

*Spec note for whoever wires this:* the user-facing docs (the authoring guide and the eHTML
reference) should describe these settings by role and link back here for the authoritative list,
rather than duplicating the tables (Rule 2) — deferred to the docs-adoption slice.
