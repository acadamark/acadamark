# Enscribe's document & composition taxonomy

How whole works are structured from large parts — the document- and collection-scale companion to the
**semantic taxonomy** (the authorial act of an *element*) and the **processing taxonomy** (how an
element's *content* is handled). This taxonomy answers: *what contains what, and how is a part addressed?*

The central discovery: the structure is **not** organized by document "types" (article, book, …). Types
are **coordinates** in a small axis-space. And the deepest axis — how a part is *addressed* — is
**scale-invariant**: the same three addressing primitives appear at element, document, and collection
scale. That is why the same words (table, list, section, store, reference) recur at every level.

This taxonomy also **owns the "addressing" property** for the whole system. The semantic taxonomy defers
to it: "numbered / referenceable / addressed" is not a semantic act — it is set/identity addressing,
defined here, cross-cutting every semantic family. That deferral is what keeps the two taxonomies
consistent.

## The three addressing primitives (the spine — scale-invariant)

A part is identified by one of exactly three things:

1. **Sequence** — position in *one* named, ordered dimension. You can say "next," "before," "the third."
   One ordering key. The order is *authored and meaningful even when items are independent* (a
   short-story collection and a novel are both sequences; whether items depend on neighbors is a content
   property, not a structural one — someone *chose* the order).
2. **Table** — position by *two* named coordinates (row-key × column-key). You need two keys to name a
   part (cell). A calendar (day × week), a spreadsheet, a data table. A **definition list is a degenerate
   table** (key → value: a one-column table addressed by the term-key — which is why `<dl>` reads as
   table-like, and why the semantic taxonomy places `<dl>`'s *structure* here while its *act* is a
   **formal statement**, family 6 — a definition list is a list of definitions).
3. **Set / graph** — *no* positional order; a part is addressed by **identity** and *navigated*, not
   sequenced. "The page about pricing," "the asset with this id," "the figure this reference points at."
   Addressed by name / link / id.

These are **scale-invariant** — the same primitive at every scale:

| addressing | element scale | document scale | collection scale |
|---|---|---|---|
| **sequence** (one order key) | ordered list items | **article** (sections) | **book** (chapters), **presentation** (slides) |
| **table** (two coord keys) | `<table>`, `<dl>` (degenerate) | spreadsheet / calendar doc | — |
| **set / graph** (identity, navigated) | the **data store** (held) *and* **references** (`cite`/`ref`/`a`, the pointer) | **dashboard** (tiles) | **website** (pages) |

Three unifications fall out of filling that grid honestly:
- **`<table>`, `<dl>`, calendars, spreadsheets are one primitive** (coordinate-addressed), at different
  scales and degeneracies.
- **The data store (`@id`) and the website are one primitive** (identity-addressed / navigated) — at
  element and collection scale respectively. The store is "set-addressed content"; the website is
  "set-addressed pages."
- **The store and the reference are two faces of the same element-scale set primitive.** A store *holds*
  content addressed by `@id`; a reference (`<cite>`/`<ref>`/`<a>`) *points at* an addressed target. Held
  side and pointer side of one primitive — which is why, in the semantic taxonomy, stores (family 7) and
  the reference sub-act (family 4) share this addressing property while remaining distinct *acts*.

So the element taxonomy and the document taxonomy are **not two taxonomies** — they are the **same three
addressing primitives viewed at different scales.**

### Element-scale addressing and the semantic taxonomy (the tie)
Because addressing is scale-invariant, its element-scale face lands *inside* the semantic families — but
as a **property those families carry, never as a family of its own**:
- **sequence** at element scale → `<list>` items (peer-enumerated; "enumeration" is a display convention,
  not a semantic act — the list element is real, the *family* is not).
- **table** at element scale → `<table>` and its degenerate `<dl>` (structure here; the *act* is a formal
  statement, semantic family 6).
- **set / identity** at element scale → the reference act (`cite`/`ref`/`a`, semantic family 4) and the
  store act (`data`/`library`/`dataset`, semantic family 7) — pointer and held sides.

The property that an element is *addressed* (has an `@id` others point at) — and therefore
*referenceable*, and often *numbered* — is recorded **once, here**, and is the reason the semantic
taxonomy no longer defines any family by "numbered / referenceable." A figure, a table, a section, a
theorem, and a numbered aside all carry it; none of them *is* it.

## The other axes (orthogonal to addressing)

### Composition level
**block content → document → collection.** A document is a single addressable unit of parts; a collection
is a set/sequence/graph *of* documents (or document-like parts). Addressing applies *independently at each
level* (a website is set-addressed at the collection level, but its pages may each be sequence-addressed
articles).

### Display dimension (a BRIDGE, not the essence)
How the parts are *laid out*: **1D** (scroll), **2D** (surface), **paged** (1D broken into bounded
frames — print/ebook; not built yet). This is a **rendering bridge**, *independent of addressing*.

> **Display dimension is NOT the addressing axis.** A multi-column article is *displayed* 2D but is
> *sequence-addressed* (one ordering key; the columns are a display decision). A dashboard is *displayed*
> 2D and is *set-addressed* (tiles placed, not ordered). A poster *mirroring an article* is
> sequence-addressed displayed 2D; a *freeform* poster is set-addressed. **The criterion is "what
> addresses a part," not "how many dimensions it's shown in."** Strip the display, find the addressing.

(Rendering signatures: sequence/1D ⟹ scroll-or-paged; set/2D ⟹ bounded surface; infographics sit on the
seam — a set-ish thing rendered as a tall 1D surface.)

### Processing-time
When a part's processor runs: **static** (build-time, baked in) / **live** (runs on load) / **interactive**
(re-runs on reader action). This is the *document-scale echo of element-level processor ownership*:
"which processor, invoked when." "Live" decodes precisely — a mermaid diagram and a pyodide plot are the
**same structural act** (opaque source → named processor → rendered result), differing only in
processing-time. So **"notebook = a live article," "dashboard = a live poster"** — `live` = the processor
runs in the browser, not at build.

### Collection-shape (a refinement of addressing at the collection level)
A collection is **ordered (sequence)** — book, presentation — or a **graph (set)** — website; and its
parts are **homogeneous** (book = all 1D chapters; presentation = all panels) or **heterogeneous**
(website = any page type). Ordered-heterogeneous is a fillable cell (e.g. scrollytelling: a sequence of
mixed prose and full-bleed panels), confirming order and homogeneity are independent.

## Document/collection types as coordinates (derive, don't enumerate)

A "type" is a point in (level × addressing × display × processing-time). It is *located*, not invented:

| type | level | addressing | display | processing | notes |
|---|---|---|---|---|---|
| **article** | document | sequence (sections) | 1D | static | the base 1D doc |
| **notebook** | document | sequence (sections/cells) | 1D | **live/interactive** | "a live article"; results in `<data>` |
| **poster** | document | sequence *or* set | 2D | static | *spans* the addressing axis (article-mirroring = sequence; freeform = set) — why posters feel slippery |
| **dashboard** | document | set (tiles) | 2D | **live/interactive** | "a live poster" |
| **spreadsheet / calendar** | document | **table** (row×col) | 2D | static or live | the table primitive *as* a whole document |
| **book** | collection | sequence (chapters) | (1D parts) | static | ordered set of 1D documents; chapters may be independent but the *order is authored* |
| **presentation** | collection | sequence (slides) | (2D panels) | any | ordered set of panels; named order *between* panels, set/placed *within* each |
| **website** | collection | **set / graph** (pages) | (mixed) | any | navigated, not sequenced; heterogeneous pages (each its own type) |

### Status (measured against the code, June 2026)
- **Real today** (recognized via `<meta type=>` + the assembler): **article**, **book** (+ `book-part`),
  **website**. Book parts (`BOOK_PART_SHORTHANDS`): chapter, part, appendix, preface, foreword,
  introduction, conclusion, glossary, dedication, afterword. Regions: front / body / back. `split-by`:
  chapter | section | none.
- **Aspirational / not built** (an explicit unknown type warns + falls back to article): **notebook,
  dashboard, poster, presentation, spreadsheet/calendar**. They are *locatable coordinates*, not
  arbitrary new categories.
- **Paged display** (print / ebook): not built; folds into the display-dimension axis as "1D, paged."

## Why this matters (the payoff)

- **Types are derived, not enumerated.** A proposed new type ("scrollytelling," "wiki") is *located* on
  the axes, not invented as a special case. A notebook is `(document, sequence, 1D, live)`.
- **Element and document taxonomies unify.** Three addressing primitives (sequence / table / set) are
  scale-invariant; the recurring vocabulary (table, list, section, store, reference, page) is the same
  primitives at different scales.
- **It owns the addressing property, so the semantic taxonomy stays act-only.** "Numbered /
  referenceable" is defined here as set-addressing and cross-cuts the semantic families, rather than
  leaking into a family definition. This is the fix that makes the two conceptual taxonomies consistent.
- **It explains prior intuitions.** Why `<dl>` reads as a table (degenerate table addressing); why the
  data store, references, and the website feel alike (all set addressing); why posters are slippery (they
  span the addressing axis); why "is a chapter just an article?" resolved as yes (sequence-addressed
  parts, scale-invariant).
- **It is the anti-drift frame at document scale.** A document/collection feature can be checked against
  its coordinates: does this book treat chapters as sequence-addressed? does this website treat pages as
  set-addressed? Divergence is a named bridge (display) or drift.

## Open / to explore
- **Poster spanning the addressing axis** — confirm whether "poster" should split into two coordinates
  (sequence-poster vs set-poster) or stay one slippery type.
- **Collection-level flow** — book = sequence-of-(1D); presentation = sequence-of-(2D); website =
  graph-of-(mixed). Confirm "collection carries its own addressing, independent of its parts' addressing"
  is the right framing (website is the proof).
- **Table-addressing at collection scale** — the grid cell is empty (no "collection that is a table of
  documents"). Does one exist (a matrix of linked docs?), or is table-addressing element/document-only?
- **`glossary` as element-scale set addressing** — a glossary is definitions *navigated by term*: a
  set/identity-addressed store of meanings (this taxonomy). Its **semantic act** is settled separately as a
  *collection of definitions* — **formal statements, family 6** (#335) — a clean act-vs-addressing split,
  not a contradiction. Open only: whether book-part `glossary` is *also* a structural region (family 10).
