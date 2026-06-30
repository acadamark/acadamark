# Enscribe's semantic taxonomy

The semantic taxonomy classifies every element by **what it is for** — the authorial act it performs,
its meaning in writing, reading, and conveying information — *independent of how it is processed or
displayed*. It is the companion to, and the design-driver of, the **processing taxonomy** (how each
element must be handled), which is largely already specified — implicitly and per-element — across the
element vocabulary docs, the Peggy grammar, and `dsl-registry.js`.

## The two-taxonomy principle

- **Semantic taxonomy (this document)** — classes by *authorial act / meaning*. Drives **design**,
  **documentation organization**, **naming**, and **drift detection**. Authority: the designer's judgment
  of meaning. Failure mode: over-elaboration; discipline: *"is this a class I'd actually reach for?"*.
- **Processing taxonomy (companion, in the vocab specs)** — classes by *how the element is handled*:
  processor ownership (default text processor vs a named DSL), containment/content shape, in-flow vs
  out-of-flow, store/consumer role, numbered/referenceable. Drives **code**, **specs**, the **drift audit**.
  Authority: the code. Failure mode: drift; check: mechanical conformance.

**Why they mostly coincide — and why divergence is diagnostic.** Enscribe is built on a *semantic*
substrate (semantic HTML + a shorthand for it), so the machinery already carves along semantic joints. A
quote is processed the same way inline or block *because* the substrate treats "quotation" as a thing.
So **semantic classes usually ARE processing classes** — and a place where they *diverge* is a loud
signal: either a benign **named bridge** (a presentation convention) or **drift** (an unprincipled special
case off the semantic grain). On a semantic substrate, drift shows up as taxonomy-misalignment. The gap
between the two taxonomies is the anti-drift instrument.

### Naming discipline (the "exhibit" standard)
A good semantic-class name (1) is a word you'd actually **reach for**; (2) names the **authorial act**, not
the structure or layout; (3) is **presentation-independent** (survives floating, inlining, relocating);
(4) lets properties be **derived** from it. ("Exhibit" passes: you *exhibit* a thing in isolation →
therefore addressed, numbered, captioned. "Frameable"/"interruptor" failed: they named the default layout.)

### Scope: authored content, not generated apparatus
The semantic taxonomy classifies *content the author writes*. **Generated navigation/UI apparatus** — a
rendered table of contents, a nav bar, next/prev controls — is **not** in it: it is derived *over* the
document, not an authorial act *in* it. (The *authored* `<nav>`/`<nav-group>`/`<item>` tree, by contrast, IS
content — structural scaffolding, family 9; only the chrome generated from it is apparatus.) UI/apparatus is a
separate concern.

### Known bridges (where semantic != processing — named, not hidden)
- **In-flow vs out-of-flow is a PROCESSING axis, not a semantic class.** "Inline" felt semantic but was
  smuggling the flow dimension into meaning. A quote is a quote in-flow or out-of-flow; emphasis is
  emphasis wherever it sits. Flow belongs to processing; meaning is flow-independent.
- **Length/readability drives the inline-vs-block/display choice — for BOTH quotation AND notation — not
  the class.** A short quote inlines (`q`), a long one blocks (`blockquote`): one semantic thing. A small
  formula inlines (`<$...$>`), a large one is displayed and numbered (`<$$...$$>`): one semantic thing.
  Same bridge, two families.
- **Presentation convention can override semantic shape for display.** (A set of peer items is
  *conventionally* shown as a vertical stack, though one may also enumerate them in prose — so the "list"
  is processed as a block while its content is just grouped items. Enumeration is a display convention, not
  an authorial act, so it is **not** a semantic family.)
- **Display math/large code is out-of-flow (numbered/set apart) for readability**; the number is a
  *consequence* of exhibited display, not a separate semantic property.

---

## The semantic families

For each element the **(category - processor)** processing signals are shown alongside as the first
bridges to the existing vocab specs (processor = `default` text processor unless a named DSL owns it per
`dsl-registry.js`; the DSL set: math, code, diagram/mermaid/abc, table/csv/tsv, library, dataset, svg).

### 1. Primary prose — the running text
The author's main thread of discourse (the in-flow default).
- `p`, section bodies as discourse (`article-body`, `book-body`, `book-part`) (block-prose / regions - default)
- `section` / `sub-section` / `sub-sub-section` (sections - default)

### 2. Emphasis & marking — the author styling their own words
In-flow marks on the author's *own* text. (Default-processed: still language.)
- `em`, `strong`, `b`, `i`, `u`, `s`, `sub`, `sup`, `abbr`, `kbd`, `samp`, `var`, `output`, `term`,
  `a` (the link, wrapping the author's own inline content) (inline-formatting - default)
- **emoji / pictographs** — an expressive/memetic *mode* of the author's own voice (tone, register), not
  a separate family: a pictographic member of emphasis & marking. (Distinct from notation: no formal
  language. Distinct from generated glyphs — callout icons, rendered checkboxes — which are *apparatus*,
  not authored content; see "Not in the semantic taxonomy".)

### 3. Aside — the author's side quests (tangential, "literally asides")
The author steps aside with their *own* secondary voice. Out-of-flow; degree varies (a footnote interrupts
mildly, an aside more fully) but the act is one: a tangent in the author's voice.
- `note`, `aside`, `note-list`, `endnotes` (block-prose - default)
- `details` / `summary` (an aside the reader can expand — block-prose - default)
- `marginnote` — a **distinct element**: an *unnumbered* margin aside, authored in place, never collected/numbered/relocated (the Tufte "margin note"). Distinct from a *numbered* `<note position=margin>` (which is a collected, numbered, back-referenced note rendered in the margin). Peer to `note`, not sugar for it.

### 4. Quotation & sourcing — external material, and pointing at sources
Words/works *not* the author's own, brought in and attributed. Quotation is the *prose* member (still
language -> default-processed); citation/reference is the act of pointing at a source.
- quotation: `q` (inline) / `blockquote` (block) — one act, length picks the form (inline-formatting /
  block-prose - default)
- sourcing/reference: `cite`, `ref`, `bibliography`, `bib-entry`, `doi` (citations-and-references /
  metadata - default)

### 5. Exhibit — supporting material showcased in isolation
"A picture says 1000 words": the author *exhibits* something better expressed set apart, usually without
running text. **Addressed, not positioned** (you point *at* it; its location is a layout choice — could
float to the end). Therefore numbered, captioned, referenceable — properties *derived* from exhibiting.
Sub-shapes differ by *what kind* of thing is exhibited (image / tabular / mapping / formal statement), not
by being different families.
- visual / tabular / data exhibits: `fig` (default — generates `<img>`), `table` (**DSL: table/csv/tsv**),
  `diagram` (**DSL: mermaid/abc**), `svg` (**DSL: svg**), `frame`, `caption` (the exhibit's label)
  (frameables - default)
- `minipage` — an exhibit by use ("an elaborate aside") but **default-processed** (NOT DSL-owned) — a
  **bridge point** (exhibit semantics, default processor) to examine in the processing pass
- **mapping exhibits** (key->value supporting info, often literally a table): `dl`, `dt`, `dd`, `glossary`,
  `glossary-entry` (block-prose - default) — folded into exhibit (a definition list is a *kind* of exhibit,
  not a separate "mapping" family)
- **formal-statement exhibits** (the theorem family): `theorem`, `lemma`, `corollary`, `proposition`,
  `definition`, `proof`, `example`, `remark` (theorem-family - default)

### 6. Notation — foreign formal-language content (open-ended: math, code, chemical, scripts, ...)
*Not prose.* Content in a different formal/special language — mathematical notation, a programming language /
verbatim text, chemical notation (`H_{2}O -> 2H + O`), other writing systems/scripts (e.g. a string of
hieroglyphs) — read as *what it literally is*, not as flowing words, so the default text processor must
**not** touch it; a DSL owns it (opaque). **The family is open-ended**: it is not "math + code," it is *any
foreign formal-language content*. Each notation kind is **one semantic thing across its forms**: *embedded*
when small (in-flow — a single glyph up to a short expression like `H_{2}O`), *exhibited* when large
(out-of-flow, numbered) — the inline/display split is the **length** bridge, identical to quotation's
inline/block (and NOT about being a single symbol — a short multi-unit expression is still embedded notation).
- math: `inline-math` (embedded) / `display-math`, `math`, `align`, `eqnarray`, `matrix`, `cases`
  (exhibited) (math - **DSL: math**)
- code: `inline-code` (embedded) / `code`, `code-block` (exhibited/verbatim) (code - **DSL: code**)
- chemical, scripts, and other foreign notations — currently rendered via existing DSLs or inline math/marks;
  the *family* admits them whether or not each has a dedicated element yet (a place the vocabulary may grow)

*(This family is where semantics and processing coincide perfectly — foreign formal language <-> DSL-owned.
On a semantic substrate that coincidence is the expected case, and naming it lets the processing taxonomy
confirm the class mechanically.)*

### 7. Stores — opaque data held for a consumer to interpret
Standalone (#313): storage commits to nothing; a consumer types it.
- `data` (the container - default), `library` (**DSL: library**), `dataset` (**DSL: dataset**)
  (storage-hosts)

### 8. Declarations & metadata — about the document, not its body
Statements *about* the work (title, authorship, provenance, configuration), not part of the discourse.
- titles/subtitles: `title`, `subtitle`, and the per-level `*-title`/`*-subtitle` set (metadata - default)
- contributors & provenance: `author`, `editor`, `name`, `affiliation`, `email`, `orcid`, `date`,
  `publication-date`, `license`, `version`, `keywords`, `subject`, `lang`, `abstract` (metadata /
  structured-data-containers - default)
- `config` (configuration - default), `meta` (the metadata container — structured-data-containers - default)

### 9. Structural scaffolding — the document's skeleton
Containers and regions that organize the work but carry no discourse of their own.
- containers: `article`, `book`, `book-part` (document-containers - default)
- regions: `article-front/body/back`, `book-front/body/back` (structural-regions - default)
- website collection: `nav`, `nav-group`, `item` — the authored page set + grouping + order, the skeleton at the *collection (website)* scale (peer to the document-scale containers/regions; navigation - default). The navbar/sidebar/ToC rendered *from* this tree is apparatus, not this.
- `hr` (a structural divider - default)

---

## Not in the semantic taxonomy (resolved this pass)
- **Rendered navigation -> UI apparatus** (the generated navbar/sidebar/ToC, derived over the document).
  But the **authored `<nav>`/`<nav-group>`/`<item>` tree IS content** — structural scaffolding (family 9) at
  the website/collection scale: the authored declaration of the page set, grouping, and order (a website's
  skeleton, peer to article/book/regions). The chrome generated FROM it is the apparatus.
- **Generated glyphs -> apparatus**, not authored content: a callout's type-icon (the warn/info glyph a
  callout *type* renders) and a task-list checkbox rendered from item state are *derived*, not placed by the
  author. (An author-placed deliberate glyph — an emoji, a checkmark typed as content — IS authored: emoji
  go with emphasis & marking; a foreign-script/chemical glyph is notation.)
- **Enumeration -> not a family.** A presentation convention (vertical stack); peers can be enumerated in
  prose. The list *element* is still processed (as a block); its content is grouped items, but "enumeration"
  is not an authorial act.
- **Mapping -> folded into exhibit.** Definition lists/glossaries are a *kind* of exhibit (supporting info,
  often a table), not a separate family.
- **`span` -> a deliberate html-native passthrough** (`is_html_native: true`), not an accidental sneak-in. Whether an explicit HTML escape-hatch element *should* exist in the vocabulary is a **design question** (keep as an escape hatch, or decide its fate deliberately) — not drift to delete.

## Bridge points for the processing pass (where the two taxonomies diverge — examine first)
- **`inline-code`** in family 6: in-flow *and* DSL-owned — but this is now *expected* (notation is DSL-owned
  by nature), so it is a confirmed coincidence, not a divergence. (Resolved: the inline-trio splits by
  processor — quote = default prose; math/code = DSL notation.)
- **`minipage`**: exhibit by use, **default-processed** (not DSL) — a real divergence within the exhibit
  family (its siblings table/diagram/svg are DSL-owned). Named bridge or drift? — resolve in the processing pass.

## The processing taxonomy (to build next)
Scaffolded FROM the semantic families above: for each family, ask what processing it implies — processor
ownership (default vs DSL), containment shape, in-flow/out-of-flow, store/consumer role, numbered/
referenceable. Align with the existing per-element specs => a processing class is confirmed; diverge =>
name the bridge (a presentation convention) or flag the drift. The two first processing axes:
**in-flow/out-of-flow** (the spine) and **processor ownership** (default text processor vs the DSL set).
The per-element semantic assignments here will become tightly cross-referenced with each element's
processing spec (handler, containment, projection) as that taxonomy is lifted from the per-element docs.
