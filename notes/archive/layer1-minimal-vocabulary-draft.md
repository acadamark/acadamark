# Layer 1 Minimal Vocabulary (Draft)

This is a draft proposal for the minimal set of semantic elements acadamark Layer 1 needs to support the most common rich-document types. It is meant for editing, not as a final spec. The goal is to identify the smallest vocabulary that is genuinely sufficient — what 80% of articles, books, and reports actually use — leaving the rest for later additions.

The four governing rules from `notes/layer1-naming.md` apply: container-role naming, defer to HTML where HTML suffices, named depth ladder for sections, consult JATS first.

## Scope: which document types

The minimal set targets four document types as the initial coverage:

- **Article** — research papers, essays, blog posts, magazine articles.
- **Book** — long-form documents with chapters.
- **Report** — technical reports, white papers, theses (a kind of book in practice).
- **Letter** — short communications.

Poems, scripts, plays, and scores are deferred. They have specialized vocabulary (verse, stanza, character, stage direction, measure, etc.) that doesn't share much with prose documents and would distort the minimal set if forced in.

The target is "what an academic article needs and what a book needs," with the recognition that a report is a kind of article and a letter is a stripped-down article.

## The minimal set (~30 elements)

Organized by role, not alphabetically. Each element notes whether it's a custom element or standard HTML, and the JATS counterpart where one exists.

### Document container

| Element | Type | JATS counterpart | Purpose |
|---------|------|------------------|---------|
| `<article>` | HTML | `<article>` | The root of any document. |
| `<article-front>` | Custom | `<front>` | Metadata block — title, authors, affiliations, abstract, keywords. |
| `<article-body>` | Custom | `<body>` | The document's main content. |
| `<article-back>` | Custom | `<back>` | Apparatus — references, appendices, glossary, notes. |

Three-part split mirrors JATS. The custom elements are needed because HTML has no semantic equivalent for "the metadata block at the front" or "the apparatus at the back."

### Document metadata (lives in `<article-front>`)

| Element | Type | JATS counterpart | Purpose |
|---------|------|------------------|---------|
| `<article-title>` | Custom | `<article-title>` | Document title. |
| `<article-subtitle>` | Custom | `<subtitle>` | Document subtitle. |
| `<author-list>` | Custom | `<contrib-group>` | Container for authors. |
| `<author>` | Custom | `<contrib>` | Single author. Children: name parts, affiliation refs, ORCID, etc. |
| `<affiliation-list>` | Custom | `<aff-group>` | Container for affiliations. |
| `<affiliation>` | Custom | `<aff>` | Single affiliation. |
| `<abstract>` | Custom | `<abstract>` | Document abstract. |
| `<keywords>` | Custom | `<kwd-group>` | List of keywords/subject terms. |
| `<publication-date>` | Custom | `<pub-date>` | Date of publication. |

Author/affiliation modeling could go simpler (one custom element with attributes for everything), but JATS's split between `<author>` and `<affiliation>` with cross-references is the established convention and worth carrying.

### Section vocabulary (named depth ladder, per Rule 3)

| Element | Type | JATS counterpart | Purpose |
|---------|------|------------------|---------|
| `<section>` | HTML | `<sec>` (depth 1) | Top-level section. |
| `<sub-section>` | Custom | `<sec>` nested | Depth 2. |
| `<sub-sub-section>` | Custom | `<sec>` nested | Depth 3. |
| `<section-title>` | Custom | `<title>` (in `<sec>`) | Section title. |
| `<sub-section-title>` | Custom | `<title>` (in nested `<sec>`) | Sub-section title. |
| `<sub-sub-section-title>` | Custom | `<title>` (nested deeper) | Sub-sub-section title. |

Already settled in `notes/layer1-naming.md`. Listed here for completeness.

### Special section types

These get *attributes* on `<section>` rather than their own elements, following JATS's `<sec sec-type="...">` pattern:

| Section type | Attribute value | Purpose |
|--------------|-----------------|---------|
| Standard section | (no attribute) | Default. |
| Introduction | `sec-type="intro"` | Conventional intro. |
| Methods | `sec-type="methods"` | Methods section. |
| Results | `sec-type="results"` | Results section. |
| Discussion | `sec-type="discussion"` | Discussion section. |
| Conclusion | `sec-type="conclusion"` | Conclusion. |
| Appendix | `sec-type="appendix"` | Appendix (typically in `<article-back>`). |
| Acknowledgments | `sec-type="acknowledgments"` | Acknowledgments. |

Using attributes instead of new elements keeps the section vocabulary small and matches JATS exactly. Authors who don't care about the distinction just write `<section>`. Authors who want the semantic information add the attribute. Render mode can use this attribute to apply different styles or numbering.

Things like prologue, epilogue, foreword, dedication go in this same pattern with their own `sec-type` values, but they're book-specific and deferred until the book document type is filled out.

### Block-level content (lives in `<article-body>` or sections)

| Element | Type | JATS counterpart | Purpose |
|---------|------|------------------|---------|
| `<p>` | HTML | `<p>` | Paragraph. |
| `<figure>` | HTML | `<fig>` | Figure with caption. |
| `<figcaption>` | HTML | `<caption>` (in fig) | Figure caption. |
| `<table>` | HTML | `<table>` | Table. (Use HTML's full `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` directly.) |
| `<caption>` | HTML | `<caption>` | Table caption. |
| `<ul>`, `<ol>`, `<li>` | HTML | `<list>` | Lists. |
| `<blockquote>` | HTML | `<disp-quote>` | Long quotation. |
| `<pre><code>` | HTML | `<code>` | Display code. |
| `<aside>` | HTML | `<boxed-text>` | Sidebar / pull-out box. |

Almost everything block-level is standard HTML. The only thing JATS has that HTML doesn't is the sidebar/box construct, and HTML's `<aside>` is the right counterpart.

### Inline content

| Element | Type | JATS counterpart | Purpose |
|---------|------|------------------|---------|
| `<em>` | HTML | `<italic>` | Emphasis. |
| `<strong>` | HTML | `<bold>` | Strong emphasis. |
| `<code>` | HTML | `<monospace>` | Inline code. |
| `<a>` | HTML | `<ext-link>` | Hyperlink. |
| `<cite>` | HTML | `<xref ref-type="bibr">` | Citation reference. |
| `<ref>` | Custom | `<xref>` (other ref-types) | Cross-reference to figure/section/equation/table. |
| `<note>` | Custom | `<fn>` | Footnote or sidenote. |
| `<abbr>` | HTML | `<abbrev>` | Abbreviation with expansion. |
| `<term>` | Custom | `<named-content>` | A term being defined or introduced (often italicized in render). |

The `<cite>` vs `<ref>` split: JATS uses `<xref>` for both citations and figure/section refs, distinguished by `ref-type` attribute. Acadamark splits them because citations carry citation-specific semantics (bibliography lookup, formatting per CSL style) while cross-refs are simpler (number lookup, anchor link). They have different behavior and authoring intent; the split clarifies that. JATS export converts both to `<xref>` with appropriate `ref-type`.

### Math and code (delegated; see `notes/idioms.md`)

| Element | Type | Purpose |
|---------|------|---------|
| Inline math | mdast `inlineMath` (from `remark-math`) | Rendered by `rehype-katex`. |
| Display math | mdast `math` (from `remark-math`) | Rendered by `rehype-katex`. |
| Inline code | mdast `inlineCode` | Native HTML rendering. |
| Code block | mdast `code` | Rendered by `rehype-shiki` or similar. |

These don't need new Layer 1 elements. The acadamark sigils convert to existing mdast/hast node types per the delegation principle.

### Theorem-family (deferred but reserved)

| Element | Type | JATS counterpart | Purpose |
|---------|------|------------------|---------|
| `<theorem>` | Custom | `<statement>` with `content-type="theorem"` | Theorem statement. |
| `<proof>` | Custom | `<statement>` with `content-type="proof"` | Proof. |
| `<lemma>`, `<corollary>`, `<definition>`, `<example>` | Custom | Same pattern | Mathematical apparatus. |

Not in the minimal set today, but listed so the slot is reserved. Specifying these is its own design pass and should follow Rule 4 (consult JATS) carefully.

### Apparatus (lives in `<article-back>`)

| Element | Type | JATS counterpart | Purpose |
|---------|------|------------------|---------|
| `<bibliography>` | Custom | `<ref-list>` | Bibliography / reference list. |
| `<bibliography-entry>` | Custom | `<ref>` | Single entry. (Note name collision with cross-ref `<ref>`; see open question below.) |
| `<note-list>` | Custom | `<fn-group>` | Footnotes/endnotes block. |
| `<glossary>` | Custom | `<glossary>` | Glossary. |

## What's deliberately not in the minimal set

These appear in your `semantic_elements.md` but are deferred:

- **Document types beyond the four targeted.** Poetry, drama, music, scripts each have their own vocabulary that would distort the minimal set.
- **Author affiliations as nested complex objects.** JATS supports `<contrib-group>` nesting, role attribution, ORCID, email, etc. Minimal set keeps `<author>` simple — name and affiliation reference. Authors who need more drop into `data-*` attributes or extend later.
- **Funding sources, peer review metadata, related-article links, copyright statements, version history.** All real JATS elements, all skippable for the 80% case.
- **Embedded DSL elements.** Mermaid, ABC notation, etc. These are handled by long-form DSL tags (Slice 4) at the parser layer; their Layer 1 representation is `<figure>` with appropriate child content (`<svg>`, etc.).
- **Variable definitions, anchors, numbering indicators** (from `semantic_elements.md`'s "Functional Elements"). These are handled at the attribute level (`id`, `data-*`) rather than as elements.

## Open questions for you to decide

These are real design questions where I have an opinion but the call is yours.

**1. Splitting `<cite>` (HTML) and `<ref>` (custom) for citations vs. cross-refs.**

I propose this above because the two have different semantics and authoring intent. JATS unifies them under `<xref ref-type="...">`. The unified approach would be: `<xref ref-type="bibr">` for citations and `<xref ref-type="fig">` for figure refs. Acadamark's authoring shorthand could still distinguish them (`<cite>` vs `<ref>`) at the source level even if Layer 1 unifies them.

The trade-off: split = clearer at Layer 1, more JATS divergence to document. Unified = exactly JATS but the element name doesn't tell you what kind of reference it is.

AB> Settled, right? These are first class elements.

**2. Bibliography entry naming.**

`<bibliography-entry>` (per the container-role rule) is verbose but consistent. JATS uses `<ref>` for bibliography entries, which collides with our cross-ref element name. Options: rename cross-refs (worse, since `<ref>` reads naturally), accept the verbose `<bibliography-entry>`, or use `<bib-entry>` as a shorter compromise. I lean toward `<bibliography-entry>` for clarity but it's clunky.

AB><bib-entry>. If we get into inheritance, we could have it inherit from list and maybe <ref> to get some shared behavior, but that's a future consideration.

**3. Note-list vs. footnote / endnote distinction.**

Footnotes and endnotes are *positionally* different in print but *structurally* the same: a note that appears somewhere other than the inline reference. HTML and JATS both treat them as one thing (footnotes), with positioning being a render concern. I propose `<note>` for the inline marker and `<note-list>` for the apparatus block, treating endnote-vs-footnote as a render-mode decision (or a `data-position` attribute). This collapses two things people often think of as separate. Fine with you?

AB> Settled, right? Where the notes are displayed is a presentation decision. 


**4. How much to model `<author>` internals.**

Minimal: `<author>` is opaque, content is the author's name as a single string. Maximum: `<author>` contains `<given-names>`, `<surname>`, `<email>`, `<orcid>`, `<aff-ref>`, etc. (JATS does the maximum.)

The minimal version is much simpler to author (`<author John Smith>`) but loses the structured-name information needed for citation generation. The maximum version is the JATS standard but requires the author to type more.

A reasonable middle: `<author>` can be either a string (just a name) or a structured form (`<author given=John surname=Smith email=... orcid=... aff=#mit>`). The interpreter handles both.

AB> Keep author as simple as possible for now. This is more for making nice publications. Think LaTeX.

**5. Tables.**

Should acadamark add a custom `<table-caption>` for consistency with the container-role rule, or keep HTML's standard `<caption>` inside `<table>`? Rule 2 (defer to HTML) says keep HTML's `<caption>`. But the container-role rule (Rule 1) would suggest `<table-caption>`. The tension is real. I lean toward HTML's `<caption>` since it works fine and doesn't introduce churn, but flag this as a place where the rules pull in different directions.

AB> Maybe all elements of a certain type can have a caption? Tables, display code blocks, images, figures, diagrams, etc.? Where does that take things?

**6. How to handle the document-type variance (article vs. book vs. report).**

A book has chapters, not sections-at-the-top-level. Options:

- a. Use `<section>` for both, with `sec-type="chapter"` for books.
- b. Add `<chapter>` as a separate top-level element for books, `<section>` only for articles.
- c. Use `<section>` everywhere; a book is just an article whose top-level sections happen to be chapters.

I lean (c) for minimalism. Books often have `<part>` containing `<chapter>` containing `<section>`, which is the named depth ladder applied at a different scale. Render mode and JATS export can recognize the scale from `sec-type` or from a document-level attribute.

This is the question that most directly tests whether the minimal set actually scales to books, and it might be worth revisiting once the article model is settled.

AB> What does LaTeX do? How does it compare to JATS? JATS is trying to be completely sematic. LaTeX operates somewhere between semantics and presentation. Suggestions?

## Suggested next steps

Once you've reviewed and edited this draft:

1. Mark each open question with your decision.
2. Settle on the final element list (probably 25–35 elements).
3. For each custom element, specify its allowed attributes following JATS's attribute conventions where they exist. This becomes the second draft.
4. Once attributes are settled, the elements can be implemented as W3C custom elements with their JS behavior (mostly nothing — they're semantic markers, not interactive components).
5. Then the acadamark shorthand vocabulary can target this Layer 1 specification directly. Slice 4 onward of the parser can reference these elements by name in test fixtures and interpreter rules.

The ordering matters: settle the elements before the attributes; settle the attributes before the implementation; settle the implementation before the shorthand interpreter targets them.

## Notes for further work

This draft says nothing about:

- **Validation rules.** What's allowed inside what. JATS DTDs encode hundreds of these. The minimal set should specify only the most important containment rules (e.g., `<article-title>` only inside `<article-front>`).
- **Processing model.** How custom elements behave when JS is loaded, how they interact with screen readers, how they fall back when CSS is missing. All deferrable.
- **Serialization details.** Whether acadamark Layer 1 HTML uses self-closing custom elements, how attribute escaping works for content with quotes, etc. Implementation-level.
- **Render-mode lowerings.** The mapping from each Layer 1 custom element to standard HTML for browser-default rendering. Deferred to the render-mode plugin design.
- **JATS export mappings.** The exact transform from each Layer 1 element to its JATS counterpart. Deferred to the JATS export plugin (`rehypeAcadamarkToJats`).
