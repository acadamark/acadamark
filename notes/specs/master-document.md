# Master document

## Purpose

A single enscribe-syntax file that defines an entire work — article, book, or website — and replaces a separate config file. It is the project's entry point: it declares metadata, lays out the structure (inline or by reference to child `.emd` files), holds shared data (libraries and embedded assets), and sets processing options. There is no separate project-config format. The master document *is* the project.

## Shape and block order

Every master document has the same four-part shape, in a fixed order:

```
<meta …>            # required, top — rendered identity
… structure …       # the spine of the work
<data> … </data>    # shared registry: libraries + assets
<config …>          # processing options, never rendered
```

`<meta>` carries identity that renders; `<config>` carries options that never render (the existing meta/config boundary). `<data>` and `<config>` are forced to the bottom so the structural spine stays readable at the top.

## `<meta>`

Whitespace-separated keyword arguments (no commas):

```
<meta
   type="book"
   author="Ariel Balter"
   date="2026-09-06"
/>
```

`type` is load-bearing: it selects the assembler, the allowed structural vocabulary, and the valid output targets.

## Structure

The structural vocabulary is type-specific and does **not** mix — matching LaTeX (article class = sections, no chapters; book/report = chapters + parts), Quarto, and JATS/BITS (`<article>`+`<sec>` vs `<book>`+book-parts):

| type | structural vocabulary |
|---|---|
| article | `<toc>`, `<section>` (+ subsections), `<appendix>` |
| book | `<dedication>`, `<preface>`, `<toc>`, `<chapter>`, book parts, `<appendix>`, `<endnotes>`; front/main/back matter |
| website | `<nav>` → `<item>` (page) + `<nav-group>` (group), `<footer>`; brand + icon from `<meta>` |

### Structure entries

A structural element either references a child file or is authored inline:

- `<section src="section_1.emd" />` — the child file supplies the section's **initial content** (see
  §Transclusion below: `src` splices, it does not close).
- `<section src="section_1.emd" | Title Override>` — the pipe overrides the child file's title.
- `<section | Inline Title>` + following body — authored inline; an open marker, peer-closed by the next structural element (same model as lists and sections).

**All three forms are open markers with identical closing semantics**: the element stays open after
its entry — after the spliced child content in the `src` forms, after the marker in the inline form —
and is peer-closed by the next structural element, per the normal no-explicit-close rule. `src` only
determines where the element's initial content comes from; it says nothing about where the element
ends (§Transclusion, below, is normative).

A kwarg-only entry with no pipe body self-closes — `<section src="section_1.emd" />`, and likewise `<meta … />` and `<library src="…" />` — so the parser does not read it as an unterminated long-form opener (the #190-skeleton self-close call, settled as decision (a); no parser change). The pipe forms terminate the tag, so they carry no slash. Self-closing is a **parser-level** fact (the tag token needs no explicit close and opens no long-form container); it does not contradict the open-marker **structural** semantics above — exactly as the inline pipe form is parser-terminated yet structurally open until a peer.

The same `src` / pipe-title forms apply to every structural element the document's `type` allows — in a book, `<chapter src="chapter_1.emd" />`, `<preface src="preface.emd" />`, `<appendix src="appendix.emd" | Notation>`, … assemble exactly as `<section src>` does in an article. The assembler is document-class-agnostic: it stitches the resolved children into one flat tree and the pipeline structures that tree as an `<article>` or a `<book>` (front/body/back) according to `<meta type>`. (A child file's own `<meta>` supplies only its fallback title; per-child author/date in that `<meta>` is not assembled — author a book-part's author as a loose `<author>` in the child body.)

Title precedence: an inline pipe title wins over the child file's title. If neither is present, the title renders as "Title Missing" (always-render).

`src` paths are relative to the **including file** — each file resolves the paths it writes against
its own directory, recursively (a child that includes further files resolves those against the
child's directory). For the common one-level case this is the familiar "relative to the master"
behavior: `src="chapter_1/chapter_1.emd"` means the directory `chapter_1/` sits beside the master
document. The including-file rule is the same one per-chapter `<library src>` (§Citations) and
asset paths already follow — one resolution rule everywhere, matching the LaTeX `\input` intuition.

### Placement markers

`<toc>`, `<endnotes>`, and `<bibliography>` are placement markers: they render their (generated) content where you put them. `<toc auto floating depth="2" />` builds the table of contents from the structure at that position — `auto` derives entries from the structure; `floating`/`depth` are display flags.

## Transclusion — substitution before structure

*(Decided 2026-07-11 — see `notes/decisions.md` §"Transclusion — substitution before structure".
This section is normative for every sourced form. The structural forms (`<chapter/part/section
src>`) realize it today — the assembler flat-splices each child at its call site, so interstitial
master content joins the preceding element, structure crosses the seam in both directions, and a
separate-pages build renders pre-first-part content on the cover instead of dropping it, the
website `<item src>` interstitial joins its page on both surfaces, and the routing invariant is
implemented and gated (#404, closed — `scripts/check-routing-invariant.mjs`). The `<include>`
primitive with recursion + cycle detection is implemented too (#424), so this section carries no
spec-ahead-of-code markers: every clause below is realized behavior.)*

### The model

1. **Substitution before structure.** Document assembly is a *textual* layer: externally sourced
   content is spliced in at its call site, as if typed there. The document's structure — element
   opening, peer-closing, nesting, numbering — is then computed over the **assembled text**, exactly
   as if the author had written one file. Assembly answers "what is the text?"; structuring answers
   "what does the text mean?"; assembly always runs first and structuring never knows the seams.

   Assembly triggers on parsed structure, never on raw text: a document enters the assembly path
   only when its parse carries an actual src-bearing entry — a structural `<… src>` or an
   `<include src>` — so a src-form inside a code fence or inline-code span is verbatim content and
   never triggers it. This is what lets a page *document* the transclusion syntax (a fenced
   `<include src=…>` example) without the page itself being assembled.

2. **`src=` supplies an element's initial content; it does not close the element.**
   `<section src=f.emd | Title>` means: open the section with that title, splice `f.emd`'s content
   as the section's initial body, and continue reading — everything after it in the calling file
   belongs to that section until a peer opens, per the normal no-explicit-close rule. Worked
   example (the deciding one):

   ```
   <section src=section1.emd | Section 1>

   Random text

   <section src=section2.emd | Section 2>
   ```

   The effective content of *Section 1* is `section1.emd`'s text **followed by** `Random text`;
   *Section 2* peer-closes it. This applies uniformly to every sourced structural form —
   `<chapter src>`, `<part src>`, `<preface src>`, `<appendix src>` — with no per-form variation, and
   is realized in the assembler today: the child splices in as initial content, and interstitial
   master content joins the preceding element rather than becoming a loose sibling. The website
   `<item src>` follows the same rule: interstitial master content joins the item's page on both
   surfaces (#404).

3. **`<include src=…>` is the general primitive.** An `<include>` splices a file's content at its
   own position and is otherwise inert — it opens nothing, closes nothing, and adds no structure.
   The forward case it exists for: prose, include, more prose, include, more prose — each file
   splices at its spot, and everything typed between reads normally, as one continuous document.
   Every sourced structural form is sugar over it:

   > `<section src=f.emd | Title>` ≡ `<section | Title>` immediately followed by `<include src=f.emd>`

   and likewise for every element that accepts `src` content sourcing. `<include>` is implemented
   (#424): the assembler splices it on every surface (CLI render + builds, the live paths — the
   browser prefetch closes over nested includes), and a minipage's sealed body rejects it visibly
   (no outward pulls).

### Path resolution

`src`/`include` paths resolve **relative to the including file**, recursively — each file resolves
the paths it writes against its own directory (§Structure entries states the same rule for the
one-level case). This is the rule assets and per-chapter libraries already follow, and the LaTeX
`\input` intuition.

### Recursion and cycles

Includes may include, to any depth — there is **no fixed depth limit**; the only prohibited topology
is a **cycle**. A cycle is detected at assembly time (the chain of including files is tracked) and
degrades visibly per always-renders: the offending include renders as a flagged marker naming the
cycle (`??include cycle: a.emd → b.emd → a.emd??`), that splice is skipped, and assembly continues.
The same file included at **two different sites** is *not* a cycle and is legal — pure substitution
means it reads exactly as if its text were typed at both places (each splice is independent; ids
duplicated by double inclusion are handled by the ordinary duplicate-id diagnostics, not by the
assembler).

### Structure crosses file boundaries — in both directions

Pure substitution implies both directions, and the spec says so out loud:

- **An element opened inside an included file remains open after the splice.** Following text in the
  calling file falls into the **deepest container still open** at the end of the spliced content —
  not automatically into the element the `src=` opened. This is the one surprising consequence;
  example:

  ```
  # chapter1.emd ends with:
  <sub-section | Fine print>
  Some fine print.

  # master continues after <chapter src=chapter1.emd | One>:
  More master text.
  ```

  `More master text` lands inside *Fine print* (the deepest open container), not at the chapter
  level. An author who wants it at chapter level closes the sub-section in the child, or opens a
  peer. This is exactly what the same text would mean typed as one file.

- **A peer tag inside an included file closes an element opened in the caller.** If the spliced
  content opens a `<section>`, that section peer-closes whatever section was open at the call site —
  the file boundary is invisible to peer-closing.

### Block position (v1 restriction)

Splices occur at **block level**: an `<include>`/`src=` entry stands as its own block, and the
spliced content begins as block content. Mid-paragraph inclusion (splicing into the middle of a
sentence) is **out of scope for v1** — a deliberate restriction, not an oversight; it can be lifted
later without changing the model.

### Projection equivalence

Single-page and multi-page renders are **projections of the same assembled structure** — a node's
position and ancestry are identical in every projection; projections differ only in how the one
tree is cut into pages. This is the sentence that kills #404's class: under point 2, interstitial
master content is *inside the preceding part*, so in a separate-pages build it renders on that
part's page — **no "loose content" exists to assign**, and no anchor can be resolved-but-unplaced.
This is realized today: an interlude between chapters renders on the preceding chapter's page (it is
inside that chapter), and content before the first part renders on the book's front region (below).

### Content before the first part

Content that precedes the first structural part has no preceding part to join: it belongs to the
**parent element** — the article lead, or the book's front region. Book structuring routes such
content into `book-front`, and the separate-pages build renders it on the cover page (the front
region's projection) rather than dropping it.

### Numbering and float consequences

Because interstitial content is inside the preceding part, it **numbers within that part**: a figure
in an interlude between chapters 3 and 4 is chapter 3's figure (`figure 3.N`), its notes are chapter
3's notes, and cross-references to it carry chapter 3's prefix. This is the LaTeX-consistent
behavior (`\input` between `\chapter` commands contributes to the preceding chapter) — named here
explicitly so nobody later reads it as a numbering bug.

### Provenance

Implementations **should retain per-node origin (source file and line) through assembly**, so
diagnostics, cycle reports, and future tooling can name where content came from after the seams have
dissolved — the #412 principle ("as much provenance as possible should be kept, recorded, and
carried forward") applied to transclusion.

### Scope note: websites

For a website, substitution operates **within each nav entry**: an `<item src>`'s page content is
the spliced child followed by any interstitial master content up to the next entry, and an inline
`<item | Title>` is simply the zero-length-splice case of the same rule. Inline items build and
render today (the earlier builder crash on them is fixed — #417); the **interstitial** master
content after an `<item src>` joins the item's page on both surfaces (the website structurer
captures it as the entry's body; each surface splices it as the page's trailing content — #404).
For an **article** page the interstitial is trailing content of the one page tree; for a **book**
page it splices into the book's **last chapter** — the deepest-open-container, as if typed at the
end of that chapter (#433), so an interstitial figure numbers in that chapter's scope and its ids
are owned by that chapter's page (a cross-page `<ref>` into it resolves and routes there; the
routing invariant holds). Both surfaces — static and live — apply the identical splice. The *site*
remains a composition of native page-documents — pages are not spliced into one another, and
`notes/specs/website.md`'s composition model (number natively, merge registries, never flatten) is
unchanged by this section. Substitution defines what content a page *contains*; composition defines
how pages *relate*.

## Notes and endnotes

Notes auto-collect; the collection is generated, not authored (#129). `<endnotes>` is the author's *placement* marker for the collected block, exactly parallel to `<bibliography>` — put it where the notes should render. Absent the marker, the collection lands at its default position: in a **book**, at the end of each chapter (per-chapter); in an **article**, in back-matter. An `<endnotes>` authored **inside a chapter** renders **that chapter's** collected notes there (the notes twin of per-chapter `split_bib`); a document-level `<endnotes>` relocates the collected block to the marker. The two may coexist, and note numbering stays project-wide regardless of placement. `<endnotes>` moves only the *end* collection's rendered block — the per-note mode (`end` / `foot` / `side`) and the `note-position` config (footnote-vs-endnote and location, following Quarto's `reference-location`) are separate and unchanged.

### Website structure

A website's structure is a single navigation tree. The master declares a `<nav>` containing `<item>`
elements; that one tree is both the site's **page set** and its **menu structure** (as in Quarto, where one
declaration drives the navbar and the sidebar). There is no separate `<page>` element — a nav entry *is* a
page.

The two structural tags are `<item>` (a page) and `<nav-group>` (a grouping):

- **An external page** — `<item src="about.emd" | About>`. `src` names the page's child `.emd`; the pipe
  gives the menu label and overrides the child's own title, exactly as `<section src | Title>` does in an
  article.
- **An inline page** — `<item | Welcome>` followed by body content, authored in the master instead of a
  child file. Same inline form as `<section | Title>` + body: an open marker, peer-closed by the next entry.
  (So a website, like an article, mixes inline and referenced content freely.)
- **A group** — `<nav-group title="Resources"> … </nav-group>` containing `<item>`s (and, later, nested
  `<nav-group>`s), with no `src` or body of its own. A group is a **long-form container** — no pipe: by the
  three-form grammar (DESIGN.md §"Tag forms"), a tag with neither `|` nor `/` is a long-form opener that
  pairs with its close tag. Its `title` is the display label — the same attribute a page's title is sourced
  into when no pipe override is given. A group is a dropdown in the top bar and an expandable node in the
  sidebar. Keeping the group its own tag — rather than an `<item>` with children — means `<item>` is
  unambiguously a page and `<nav-group>` unambiguously a grouping.

```
<nav>
<item src="home.emd" | Home>
<item src="about.emd" | About>
<nav-group title="Resources">
<item src="resources/tutorials.emd" | Tutorials>
<item src="resources/documentation.emd" | Documentation>
</nav-group>
<item src="contact.emd" | Contact>
</nav>
```

Entries sit **flush-left** — indentation is not used for structure, and content indented four-plus spaces
parses as a markdown code block (the same constraint `<list>` has). The `<nav-group>` close tag, not
indentation, bounds the group.

The nav tree feeds **both** navigation surfaces: its top level becomes the top bar (a website's primary
nav), and the tree as a whole feeds the left **sidebar**. The sidebar is an opt-in second surface — **off by
default** (the top bar suffices for a small site); a master turns it on with `<config sidebar>`, and the
layout reflows to give the content the freed column when it is off. The first cut is shallow — one level of
grouping; deeper nesting is later work.

Structuring and rendering reuse existing machinery **at the right layers** — this is **not** parser-level
list reuse. The **parser** handles the forms directly: a `<nav-group>` (no pipe) is a long-form container
whose children nest by the ordinary close-tag grammar, and a pipe-form `<item | Title>` is a peer-closed
leaf (its inline body, if any, runs to the next entry — the `<section | Title>` model). The **website
structurer** walks the nav tree and gathers each group's members (peer-close for the leaf items, the close
tag for the group), building a nav model on `file.data` — analogous to section-nesting, not list parsing.
The **renderer** reuses the document-class-agnostic #226 list builder (`buildList` / `buildContentsListing`)
to emit the sidebar and top bar from that model. The `src` / pipe-title affordance is the same one every
structural element carries (`<section src>`, `<chapter src>`).

Site chrome is minimal and mostly metadata:

- The top-bar **brand name** is `<meta>`'s `title`; the **icon** is `<meta>`'s `icon`. There are no
  in-header `<title>`/`<icon>` tags — the redundant chrome of the original sketch is dropped.
- `<footer src="footer.emd">` is the **site-wide** footer, declared once in the master (like the nav, it is
  not per-page).

A page's content — inline body or referenced `.emd` — is an ordinary document body, the same vocabulary an
article uses, and it **numbers as one**: each page numbers as a standalone article — top-level sections
restart at 1 per page (no chapter prefix), float counters reset per page, and the page itself carries no
number (its title is a title, not a numbered chapter). Cross-page `<ref>`s still resolve globally with the
target's per-page label — numbering is per page, but the cross-reference registry spans the whole site.

**Composition is independent of rendering.** The master *assembles* the pages (inline or external) into the
site; *how* the site is then rendered — static, the live shell, or (future) `enscribe serve` — is the
render/serve matrix, not the structure. The first build targets the existing live render (already
type-agnostic over article/book); the static per-page projection and `enscribe serve` follow later.

## `<data>` — the shared registry

`<data>` is a keyed registry of libraries and assets. Everything in it has an id; the body references by id, never by path.

```
<data>
   <library src="references.bib" />
   <fig #fig:scatter png>{base64}</fig>
</data>
```

An asset may be embedded or external — `<fig #fig:scatter png>{base64}</fig>` or `<fig #fig:scatter src="data/scatter.png" />` — and the body pulls it in the same way either way: `<fig src="@fig:scatter" />`. Embedded-vs-external is only about where the bytes live. Assets are **declared** with the `#` id sigil (as everywhere in shorthand) and **referenced** by setting `src` to that id behind the `@` sigil: a `src` whose value begins with `@` resolves from the local `<data>` store — rewritten to a `data:` URI for an embedded asset, or to the asset's external path, before the HTML projection. `@` is the one universal id-reference sigil: the same form names a source in a citation (`@key`) and a target in a cross-reference (`<ref @id>`). `<library>` is the citation half of the same idea: load sources into a registry, reference by `@key`.

## Citations and bibliographies

All `<library>` sources — the master's and any per-chapter ones — merge into a **single citation registry**, so any chapter can cite any reference and cross-references resolve project-wide.

Bibliography *display* can be per-chapter: a `<bibliography>` at a chapter's end lists the references that chapter cites (bookdown's `split_bib` behavior), drawn from the merged registry; a `<bibliography>` at book level lists everything. A chapter's own `<library>` is colocation of its sources, not an isolated registry — so a chapter citing a master-library reference still renders.

A reference cited in more than one chapter appears in **each** of those chapters' bibliographies — listed wherever it is cited, from the one registry (not duplicated as a registry entry). "At a chapter's end" means authored **inside that chapter's own content**: a `<bibliography>` at the document's top level (a master-level marker, after the chapters) is the book-level bibliography and renders in back-matter; placing per-chapter and book-level markers together is allowed (the per-chapter ones list their own cited refs, the book-level one lists everything). Per-chapter bibliographies are an HTML *display* concern — the JATS/BITS export carries a single document-wide `<ref-list>` (per-chapter export is a later refinement).

When the same `@key` is defined in more than one merged source, the last definition wins and a visible diagnostic flags the collision — the same policy as a within-file duplicate, now spanning files. The citation style is the master's: a child's `<config>` is document-wide apparatus that only the master declares, so one `citation-style` governs the whole registry. A per-chapter `<library src>` is resolved relative to the chapter file that declares it (not the master), so a chapter in a subdirectory loads its own `.bib` correctly.

## Cross-references and links

Two deliberately distinct mechanisms:

- **Cross-references are page-implicit.** `<ref @fig:elephant>` resolves to wherever the target lives across the project, with project numbering ("Figure 3.2") — matching enscribe's existing colon-id resolution and Quarto's `@`-reference behavior. The author never names the page, so references survive a page being renamed or moved. This requires ids to be unique project-wide. *(Realized by the static separate-pages book build (publishing, P1): the cross-reference registry records which chapter owns each anchor, and a cross-chapter ref is emitted as `owner-chapter-page#anchor` at publish time — the author still names only the target, never the page. The live app-shell book render (the editing-surface track's read-only foundation, L2) realizes the same resolution at **navigate** time rather than publish time: under one mount a bare `#anchor` routes to its owning chapter via the same registry, so no per-file href rewrite is needed — the static and live paths share one ownership model, projected to a page URL or a hash route respectively.)*
- **Raw links are page-explicit.** The `#/page-title/anchor` form is the escape hatch for arbitrary links, parallel to Quarto's `[text](page#anchor)`. *(Not yet implemented.)*

## `<config>`

Whitespace-separated keyword arguments; never renders. Holds theme, layout, toc-position, chapter-numbering, reference-location, and similar processing options.

## Outputs

Output targets are type-dependent:

- article, book → HTML render + JATS (article) / BITS (book) export.
- website → HTML render only; no JATS/BITS (a site isn't a scholarly document).

## The assembler

One project-wide pass resolves everything that spans files: it loads `src` children, merges libraries into the single registry, resolves citations and cross-references, computes numbering (chapters, figures, notes), places the toc/endnotes/bibliography markers, applies theme/layout, and — for websites — assembles the nav into pages. Citations, cross-references, and numbering are one problem: a single global registry resolved at assembly time. The splice semantics the loading step obeys are §Transclusion's (substitution before structure): children are spliced as text at their call sites, and every later stage operates on the assembled text with no knowledge of the seams.

The assembler is the multi-file/project system (#72) plus a build model. Its design is led by Claude Code and Claude-Chat with you in the loop on the calls, and it builds in slices, not one pass. The docs site is the worked example for the website assembler (a sidebar-style site).

## Open — to decide during the build

- Per-type assembler contracts (the bulk of the work; slice by slice).
- Website: a distinct home/landing body (a hero/feature layout beyond a plain page) and blog-style auto-listings — content beyond the nav-declared pages. (The core page model — nav items as inline/external pages — is settled.)
- Embedded-asset format coverage in `<data>` (png shown; others to follow).

### Website assembly

A website is assembled by **composition over one merged site cross-reference registry** — *not* by
flattening its pages into a single page-scope tree. Each page (an external `<item src>`, read from the nav
model) is numbered and rendered in its **own native scope** — an article as an article, a book as a book —
and every page's anchors merge into one site registry that each page renders over via a read-through, so
books keep book numbering and a cross-page `<ref>` resolves to its target's **native** number (a book figure
stays `2.1`, not a flattened `figure 1`) and links to the page that owns it, in every direction. The first
cut renders external `<item src>` pages (the docs-site dogfood is entirely external); inline-page rendering
(`<item | Title>` + body) is a fast-follow.

The full website model — the two-phase number-then-render, the merged registry and read-through, page
identity (slugs), the static/live URL schemes and the parity contract, and the always-render invariants — is
specified in **`notes/specs/website.md`**, its home; it is not duplicated here.