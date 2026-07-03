# Enscribe's semantic taxonomy

The semantic taxonomy classifies every element by **what it is for** — the authorial act it performs,
its meaning in writing, reading, and conveying information — *independent of how it is processed or
displayed*. It is the companion to, and the design-driver of, the **processing taxonomy** (how each
element must be handled) and the **document taxonomy** (what contains what, and how a part is addressed).

## The generative principle: classify by act, not surface

Before placing any element, **strip its presentation and its processing and ask what the author is
DOING** — the act, not how it looks, how it is numbered, or how the current code happens to handle it.
This rule is what keeps the taxonomy honest, and every correction in this draft came from applying it to
a place an earlier draft had quietly stopped applying it:

- A **theorem** is not "an exhibit that happens to be numbered" — it is a *formal statement asserted in
  the argument*. Numbered/set-apart is its processing profile, not its act.
- A **link** is not "inline styling of the author's words" — it is *pointing at a target*, the same act
  as a citation or a cross-reference.
- A **section** is not prose — it is a *container* that holds prose (and everything else).
- A **margin note** is not a distinct element — it is a *note*, positioned in the margin.

When the classification is being driven by how a thing is rendered, numbered, or handled in code, that is
the signal to stop and re-derive from the act.

## The two-taxonomy principle

- **Semantic taxonomy (this document)** — classes by *authorial act / meaning*. Drives **design**,
  **documentation organization**, **naming**, and **drift detection**. Authority: the designer's judgment
  of meaning. Failure mode: over-elaboration; discipline: *"is this a class I'd actually reach for?"*
- **Processing taxonomy (companion)** — classes by *how the element is handled*: recognize/hold, handler,
  processor, formatter. Drives **code**, **specs**, the **drift audit**. Authority: the code. Failure
  mode: drift; check: mechanical conformance.

**Why they mostly coincide — and why divergence is diagnostic.** Enscribe is built on a *semantic*
substrate (semantic HTML + a shorthand for it), so the machinery already carves along semantic joints.
So **a semantic class is usually also a processing class** — and a place where they *diverge* is a loud
signal: either a benign **named bridge** (a presentation or processing convention) or **drift** (an
unprincipled special case off the semantic grain). The gap between the two taxonomies is the anti-drift
instrument. Crucially, a divergence is *allowed*: one processing class legitimately serves several
semantic families (the prose processor serves prose, asides, quotations, and metadata alike), and the
taxonomy's job is to **name which families a class serves**, so a tag bolted onto that class that fits
none of them shows up as drift. The converse is equally allowed and equally named: one **semantic**
family may span several **processing** classes — see family 6.

### Naming discipline (the "exhibit" standard)
A good semantic-class name (1) is a word you'd actually **reach for**; (2) names the **authorial act**,
not the structure or layout; (3) is **presentation-independent** (survives floating, inlining,
relocating); (4) lets properties be **derived** from it. "Exhibit" passes: you *exhibit* a thing set
apart. "Frameable"/"interruptor" failed: they named the default layout. "Formal statement" passes: you
*state* a theorem or an algorithm, and its properties (discrete, labeled, provable) derive from the act.

## Addressing is a property, not a family (the consistency rule)

The single change that makes this taxonomy self-consistent, and consistent with the document taxonomy:
**"numbered / referenceable / addressed" is not a semantic act and never defines a family.** It is an
**addressing property** — set/identity addressing at element scale — owned by the **document taxonomy**.
It cross-cuts the semantic families: sections, figures, tables, equations, theorems, and asides can all
carry it. An earlier draft let it leak into two family definitions (Exhibit derived itself from "numbered,
captioned, referenceable"; the theorem family was glued together by "often numbered and referenced"). If
"referenceable" defined a family it would swallow half the vocabulary. It is stripped out here: each
family is defined by its **act**, and where an element is *addressed* (pointed at by an `@id`), that is
recorded once, in the document taxonomy's set-addressing primitive, and referenced from here — not
re-invented as meaning.

Two faces of that one addressing primitive appear in this taxonomy as *distinct acts* that merely share
the property:
- **the pointer side** — pointing *at* an addressed target: `<cite>`, `<ref>`, `<a>` (family 4).
- **the held side** — holding addressed content *for* a consumer: `<data>`, `<library>`, `<dataset>`
  (family 7).
They are the same document-taxonomy primitive (set/identity), split by act. That they are the same
primitive is a document-taxonomy fact; that they are different *acts* is why they are two families here.

### Scope: authored content, not generated apparatus
The semantic taxonomy classifies *content the author writes*. **Generated navigation/UI apparatus** — a
rendered table of contents, a nav bar, next/prev controls, callout icons, task-list checkboxes rendered
from state — is **not** in it: it is derived *over* the document, not an authorial act *in* it. The
*authored* `<nav>`/`<nav-group>`/`<item>` tree, by contrast, IS content (structural scaffolding, family
10); only the chrome generated from it is apparatus.

### Known bridges (where semantic ≠ processing — named, not hidden)
- **In-flow vs out-of-flow is a PROCESSING axis, not a semantic class.** A quote is a quote in-flow or
  out-of-flow; emphasis is emphasis wherever it sits. Flow belongs to processing; meaning is
  flow-independent.
- **Length/readability drives the inline-vs-block/display choice — not the class.** A short quote inlines
  (`q`), a long one blocks (`blockquote`): one semantic thing. A small formula inlines (`<$…$>`), a large
  one is displayed (`<$$…$$>`): one semantic thing. Same bridge, two families.
- **Position drives where a note renders — not what a note is.** Footnote, endnote, and margin note are
  one act (an aside in the author's voice) at three positions. See family 3.
- **Presentation convention can override semantic shape for display** — a set of peer items is
  *conventionally* shown as a vertical stack, though one may also enumerate them in prose. Enumeration is
  a display convention, not an authorial act, so the list is **not** a semantic family.

---

## The semantic families

The formality of the *discourse unit* runs as a spine through the first families: **prose →
formal statement → notation** — from the author's ordinary running words, through a labeled formal unit
that packages prose and notation together, to pure foreign formal language. The other families sit around
that spine: the author's own marks and asides, engagement with others' material and sources, exhibited
supporting material, stored data, declarations about the work, and the skeleton that holds it all.

### 1. Primary prose — the running text
The author's main thread of discourse: the paragraph.
- `p` — the paragraph, the running-text unit.

Prose is not privileged in the architecture — it is *content in a language* (the language being prose),
one entry among peers in the processing taxonomy's content-language lookup. Everything that *holds* prose
(sections, regions) is scaffolding (family 10), not prose itself.

### 2. Emphasis & marking — the author marking their own words
In-flow marks the author places on their *own* text. Still language, default-processed. Two sub-acts:

- **Emphasis proper** — rhetorical weight, tone, or register on the author's words: `em`, `strong`, `b`,
  `i`, `u`, `s`, `sub`, `sup`. **Emoji / pictographs** belong here — an expressive/memetic mode of the
  author's own voice (tone, register), not a separate family and not notation (no formal language).
- **Technical-register marks** — marking that a span is in a *technical/computational register*: `kbd`,
  `samp`, `var`, `output`, `abbr`. These are **notation-adjacent** — a bridge toward family 6 — but they
  are still text tagged with a register, not foreign formal-language content, so they stay
  default-processed and here.

`term` sits at the boundary with family 4: it *marks* a word as a defined term and may *point at* its
definition (glossary-linkable). Recorded here as marking, with a reference role noted as a bridge.

### 3. Aside — the author's side quests
The author steps aside in their *own* secondary voice: a tangent, a digression, an illustration, a
comment. Out-of-flow; degree varies, but the act is one.
- `note` — a logical aside in the author's voice, associated with a point in the text. **Position is
  presentation**: `note-position=footnote` (bottom of page), `endnote` (end of section/chapter), or
  `margin` (beside the text). The *marker* (a number, a symbol, or — in the margin — spatial adjacency)
  is one way to make the association; the margin's unnumbered look is *derived from position* (adjacency
  substitutes for the marker), not an independent element. There is no distinct `<marginnote>` element —
  it is `<note position=margin>` (collapsed in #333; one note type, three positions).
- `aside`, `note-list`, `endnotes` — the boxed aside and the collected-note containers.
- `details` / `summary` — an aside the reader can expand.

### 4. Quotation & sourcing — others' words, and pointing at sources
The author engages material and targets beyond their own assertions. Two sub-acts:

- **Quotation** — bring external *words* in and attribute them (a content act, near prose): `q` (inline)
  / `blockquote` (block). One act, length picks the form. (`blockquote` is *frameable* in processing — a
  named bridge.)
- **Reference / link** — point *at* an addressed target: `cite`, `ref`, `doi`, `a` (the link). This is
  the **pointer side of set/identity addressing at element scale** (document taxonomy): a citation points
  at a bibliography key, a cross-reference at an `@id`, a link at a URL — one act, one primitive, three
  targets. Its held counterpart is family 7 (stores).

### 5. Exhibit — supporting material showcased in isolation
"A picture says 1000 words": the author *exhibits* something better shown than said, set apart, usually
without running text. This is now the family's whole job — **show a thing** — with the "addressed /
numbered / captioned" property pulled out to the addressing axis (it is derived where the exhibit is
set-addressed, not part of the definition).
- visual / tabular / data exhibits: `fig`, `table`, `diagram`, `svg`, `frame`, `caption` (the exhibit's
  label).
- `minipage` — an exhibit by use ("an elaborate aside"), processed as a **sealed sub-document**: held
  opaque at parse, then re-run through the default/Enscribe pipeline in a deferred phase — **neither
  plain-default nor DSL-owned** (the processing taxonomy's "the processor the lookup returns is Enscribe;
  the sealing is the consequence"). A **named bridge** (exhibit semantics, Enscribe-as-sealed-processor),
  not an open question.

The **theorem family has left this family** (→ family 6). So do the **definitional structures**: `dl` /
`dt` / `dd` and `glossary` / `glossary-entry` (→ family 6). A definition list is a list of definitions and
a glossary is a collection of them, and a definition is a formal statement — so they group with the formal
statements, not with exhibited artifacts.

### 6. Formal statements — labeled formal units asserted in the argument
The author states a **discrete, labeled formal unit that is part of the argument itself** — you read a
theorem or an algorithm as load-bearing discourse, not as external material you point *at*. This is the
new family that the old "theorem family" was hiding by grouping tags on their shared handler. Defined by
act, **not** by being numbered. The unifying idea: **you define things in order to make formal
statements** — a definition, an example, and a counterexample are formal-reasoning objects, so they
belong here with the theorems they serve, not filed as asides or exhibits.
- assertions of a labeled formal claim: `theorem`, `lemma`, `corollary`, `proposition`, `definition`.
- justification: `proof` (discharges an assertion's obligation).
- specification of a formal procedure: `algorithm`.
- illustration of a formal claim: `example`, `remark` — an example (or counterexample) is core to logical
  reasoning; it exhibits or tests a formal statement rather than digressing from it, so it is a member
  here, not a family-3 aside.
- **definitional structures**: `dl` / `dt` / `dd` (a **definition list** — Enscribe's `<dl>` is a list of
  *definitions*, not a general key–value list) and `glossary` / `glossary-entry` (a **collection of
  definitions**). A definition is a formal statement, so a list or collection of definitions lives here;
  that `<dl>` is *definitional* (not an arbitrary mapping) is the premise that places it in this family.

On the formality spine, a formal statement sits **between prose and notation**: its content *composes*
prose and notation, packaged as a labeled unit — which is exactly why it feels like it lives on the
gradient prose → formal statement → notation. It is in-flow discourse (unlike an exhibit, which is
pointed at); the display-math / large-code case crosses the out-of-flow line by the length bridge, not by
changing act.

*(Processing note — one **semantic** family, several **processing** classes. The formal-statement handler
serves `theorem`/`lemma`/…/`proof`/`algorithm` **and** `example`/`remark`; the definitional structures
(`dl`/`dt`/`dd`, `glossary`/`glossary-entry`) are default-processed **block-prose**. A single semantic
family legitimately spanning several processing classes is the two-taxonomy principle working — the
inverse of one class serving several families — not drift. Placement here is by **act**; how each member
is processed is recorded separately in the processing taxonomy and is deliberately unchanged by this
classification.)*

### 7. Notation — foreign formal-language content (open-ended)
*Not prose.* Content in a different formal/special language — mathematical notation, a programming
language / verbatim text, chemical notation (`H_{2}O`), other writing systems/scripts — read as *what it
literally is*, so the default text processor must **not** touch it; a DSL owns it. **The family is
open-ended**: it is *any* foreign formal-language content. Each kind is **one semantic thing across its
forms**: *embedded* when small (in-flow), *exhibited* when large (out-of-flow) — the inline/display split
is the **length** bridge, identical to quotation's.
- math: `inline-math` (embedded) / `display-math`, `math`, `align`, `eqnarray`, `matrix`, `cases`
  (exhibited).
- code: `inline-code` (embedded) / `code`, `code-block` (exhibited/verbatim).
- chemical, scripts, and other foreign notations — the *family* admits them whether or not each has a
  dedicated element yet (a place the vocabulary may grow).

*(This is where semantics and processing coincide perfectly — foreign formal language ⟺ DSL-owned. The
technical-register marks in family 2 are notation-*adjacent* but stay default-processed: they tag a
register, they do not carry a foreign language.)*

### 8. Stores — opaque data held for a consumer to interpret
Storage commits to nothing; a consumer types it.
- `data` (the container), `library` (bibliography source), `dataset` (opaque payload).

This is the **held side of set/identity addressing at element scale** (document taxonomy): a store holds
content addressed by `@id`; the family-4 reference sub-act is the pointer that pulls it. Same primitive,
two acts.

### 9. Declarations & metadata — about the document, not its body
Statements *about* the work (title, authorship, provenance, configuration), not part of the discourse.
- titles/subtitles: `title`, `subtitle`, and the per-level `*-title`/`*-subtitle` set.
- contributors & provenance: `author`, `editor`, `name`, `affiliation`, `email`, `orcid`, `date`,
  `publication-date`, `license`, `version`, `keywords`, `subject`, `lang`, `abstract`.
- `config` (options), `meta` (the metadata container).

`abstract` **stays here** and is the one member carrying **full running prose** (paragraphs), not a short
scalar value — but it is metadata by act: a summary *about* the work, not part of its discourse. Being
prose-carrying, it may be **serialized differently for citation** (e.g. lifted into citation metadata)
than the scalar fields around it — a processing/serialization detail, not a reason to reclassify the act.

### 10. Structural scaffolding — the document's skeleton
Containers and regions that organize the work but carry no discourse of their own.
- containers: `article`, `book`, `book-part`.
- regions: `article-front/body/back`, `book-front/body/back`.
- **sections**: `section`, `sub-section`, `sub-sub-section` — moved here from prose. A section is **not
  prose**; it is a semantic container that can hold anything — prose, formal statements, exhibits,
  notation, asides. (Its content model was mis-specified as inline in the code; the semantic ambiguity
  predicted the processing ambiguity — the two-taxonomy principle working.)
- website collection: `nav`, `nav-group`, `item` — the authored page set + grouping + order, the skeleton
  at the *collection (website)* scale.
- `hr` — a **lightweight section break**: it marks a *semantic shift* in the flow, "a very light
  section." It belongs with sectioning, not as a presentational leftover.

---

## Not in the semantic taxonomy
- **`<span>` is not a vocabulary element.** It is not an Enscribe tag and has no authorial act; whether
  *any* non-Enscribe HTML survives is a **processing policy** (a future `<html-passthrough>` switch —
  pass through, or strip of meaning), not a semantic-taxonomy question. (Distinct from DESIGN's
  semantic-gap rule, which uses `<span>`/`<div>` + class + `data-*` as *generated output* for scholarly
  semantics HTML cannot name — that is output, not an authored vocabulary `<span>`.)
- **Rendered navigation, callout icons, task-list checkboxes → generated apparatus**, derived over the
  document, not authored acts. The authored `<nav>` tree IS content (family 10).
- **Enumeration → not a family.** A presentation convention (vertical stack); peers can be enumerated in
  prose. The `<list>` *element* is real and processed as a block, and its parts are **sequence-addressed**
  (document taxonomy), but "enumeration" is not an authorial act.

## Bridge points for the processing pass (examine first)
- **`minipage`** — exhibit by use; processed as a **sealed sub-document** (opaque at parse → deferred
  default/Enscribe sub-run), neither plain-default nor DSL-owned. A **resolved named bridge** (exhibit
  semantics + Enscribe-as-sealed-processor), consistent with the processing taxonomy — not an open "drift?"
  question. (The earlier "default-processed" wording was factually wrong at parse time; corrected here.)
- **technical-register marks (`kbd`/`samp`/`var`/`output`)** — emphasis-and-marking by act, but
  notation-adjacent; confirm they stay default-processed and are not quietly routed to a DSL.

## Open questions
- **`term`** — marking (family 2) with a reference role (family 4). Confirm whether the reference role is
  strong enough to move it, or whether it stays a marking element that *may* link.
