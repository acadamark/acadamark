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

- `<section src="section_1.emd" />` — content comes from the child file.
- `<section src="section_1.emd" | Title Override>` — the pipe overrides the child file's title.
- `<section | Inline Title>` + following body — authored inline; an open marker, peer-closed by the next structural element (same model as lists and sections).

A kwarg-only entry with no pipe body self-closes — `<section src="section_1.emd" />`, and likewise `<meta … />` and `<library src="…" />` — so the parser does not read it as an unterminated long-form opener (the #190-skeleton self-close call, settled as decision (a); no parser change). The pipe forms terminate the tag, so they carry no slash.

The same `src` / pipe-title forms apply to every structural element the document's `type` allows — in a book, `<chapter src="chapter_1.emd" />`, `<preface src="preface.emd" />`, `<appendix src="appendix.emd" | Notation>`, … assemble exactly as `<section src>` does in an article. The assembler is document-class-agnostic: it stitches the resolved children into one flat tree and the pipeline structures that tree as an `<article>` or a `<book>` (front/body/back) according to `<meta type>`. (A child file's own `<meta>` supplies only its fallback title; per-child author/date in that `<meta>` is not assembled — author a book-part's author as a loose `<author>` in the child body.)

Title precedence: an inline pipe title wins over the child file's title. If neither is present, the title renders as "Title Missing" (always-render).

`src` paths are relative to the master file. `src="chapter_1/chapter_1.emd"` means the directory `chapter_1/` sits beside the master document.

### Placement markers

`<toc>`, `<endnotes>`, and `<bibliography>` are placement markers: they render their (generated) content where you put them. `<toc auto floating depth="2" />` builds the table of contents from the structure at that position — `auto` derives entries from the structure; `floating`/`depth` are display flags.

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
article uses.

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

One project-wide pass resolves everything that spans files: it loads `src` children, merges libraries into the single registry, resolves citations and cross-references, computes numbering (chapters, figures, notes), places the toc/endnotes/bibliography markers, applies theme/layout, and — for websites — assembles the nav into pages. Citations, cross-references, and numbering are one problem: a single global registry resolved at assembly time.

The assembler is the multi-file/project system (#72) plus a build model. Its design is led by Claude Code and Claude-Chat with you in the loop on the calls, and it builds in slices, not one pass. The docs site is the worked example for the website assembler (a sidebar-style site).

## Open — to decide during the build

- Per-type assembler contracts (the bulk of the work; slice by slice).
- Website: a distinct home/landing body (a hero/feature layout beyond a plain page) and blog-style auto-listings — content beyond the nav-declared pages. (The core page model — nav items as inline/external pages — is settled.)
- Embedded-asset format coverage in `<data>` (png shown; others to follow).

### Website assembly

A website's pages live inside `<nav>` (`<item src>`), not at the master's top level, and `<nav>` content is
unstructured until the pipeline runs — so the book's top-level child discovery and `loadAndAssembleMaster`
do **not** apply. The website assembler instead:

1. **reads the nav model** (the structurer's `ENSCRIBE_NAV_MODEL`) for the page list — slug, title, `src`,
   and group nesting;
2. **fetches the external `<item src>` pages** and assembles them into one tree, building a **cross-page
   registry** (which page owns each anchor);
3. **resolves cross-page references** to `?page=owner-slug#anchor` via that registry (intra-page refs stay a
   bare `#anchor`);
4. renders each page from the assembled tree.

**Per-page numbering** (each page numbered independently, article-style — not continuous across pages) is the
intended scope; the first cut may inherit book-style numbering from the assembly and refine to per-page when
a site actually numbers sections/figures.

**Inline pages** (`<item | Title>` + body) are a fast-follow: the first cut renders external `<item src>`
pages (the docs-site dogfood is entirely external). Inline rendering needs a single global pass that gets
fresh page content in without double-processing — specified when it lands.