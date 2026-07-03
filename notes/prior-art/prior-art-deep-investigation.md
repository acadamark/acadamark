# Deep investigation: RASH & Scholarly HTML vs Enscribe, apparatus by apparatus

A close reading of how the two prior HTML-native scholarly projects handle each piece of
scholarly apparatus — **capabilities and actual syntax** — with an honest assessment of what
they get right that Enscribe should consider. The bottom line up front, then the detail.

## Bottom line

Enscribe is **more capable and dramatically better at authoring** than either. The single
biggest thing both prior projects have that Enscribe should take seriously is **not a feature —
it's their theoretical and ecosystem grounding**:

1. **RASH's "structural patterns" theory** (the thing you flagged) — a small, closed set of
   *content-model patterns* every element conforms to. This is a real idea worth understanding;
   Enscribe has an *implicit* version (the flow/phrasing binary) but RASH made it explicit and
   total, and got concrete benefits from it.
2. **The SPAR/DoCO/FaBiO ontology hookup** — RASH can auto-emit RDFa typed by a real,
   published bibliographic ontology. Enscribe's JATS channel is arguably a better archival
   target, but RASH's *typed-semantics extraction* is a capability class Enscribe doesn't have.
3. **Scholarly HTML's schema.org grounding for people/orgs/funding/roles** — Enscribe has no
   rich model for authorship/affiliation/funding/contributor-roles, and Scholarly HTML's is
   genuinely thought-through (the role-indirection pattern especially).
4. **Conversion ecosystems** — both plug into existing scholarly pipelines (RASH→LaTeX/ODT/DOCX,
   submission to real conferences; Scholarly HTML← a DOCX authoring style). Enscribe has JATS
   but should think about the *inbound* conversion story.

Everything else, Enscribe wins — and the authoring gap is not close.

---

## The "structural patterns" idea (worth understanding first)

RASH is built on Di Iorio/Peroni/Vitali's *structural patterns for XML documents* — the claim
that essentially all document structures reduce to a **small closed set of content-model
patterns**. The practical patterns:

- **Marker** — empty, no content (e.g. a cross-reference pointer `<a href="#x"/>`).
- **Atom** — text only, no child elements (e.g. a metadata value).
- **Block** — contains text/inlines directly (e.g. `p`).
- **Inline** — text-level, nests in blocks (e.g. `em`, `sup`).
- **Record** — a fixed sequence of specific children, no text (e.g. a figure: image + caption).
- **Container** — a sequence of blocks, no text (e.g. a list item, a section body).
- **Table / Field / etc.** — the tabular and metadata variants.

**Why it matters:** because every element declares which pattern it is, you can process a RASH
document *without knowing its vocabulary* — automatic visualisation, structure inference,
conversion, validation all fall out of the pattern, not the tag. RASH's RelaxNG grammar is
organised exactly this way (elements / attributes / content-models / attribute-lists as four
separate blocks).

**What Enscribe has vs. this:** Enscribe has the **flow/phrasing binary** (the content-model
decision: flow elements wrap, phrasing elements don't), which is a *two-pattern* version of the
same idea. RASH's is richer (≈6–8 patterns) and **total** (every element is classified; the
grammar is generated from it).

**The lesson worth taking:** Enscribe's content model is currently an *implicit, two-valued*
property scattered in `shape-tokens.md` and the parser. RASH suggests making it an **explicit,
named, closed taxonomy** that (a) the spec states per-element, (b) the parser/validator derives
behavior from, and (c) a processor could traverse generically. You're already most of the way
there — the flow/phrasing decision *is* a content-model pattern system. Formalizing it into a
small named set (marker / atom / phrasing / flow / record / container) would: make strict-mode
rules fall out mechanically, make the JATS projection more systematic, and let you say "Enscribe
has a formal content-model theory" — which is a credibility marker in this exact community.
**This is the most valuable single takeaway in this document.**

---

## Apparatus-by-apparatus

For each: how RASH does it, how Scholarly HTML does it, and the honest Enscribe comparison.

### Sections & headings

- **RASH:** `<section>` containing `<h1>` first child + block content; **subsections nest
  `<section>`** and *also* use `<h1>` (depth comes from nesting, not heading level). Pure
  structural container — no text directly.
- **Scholarly HTML:** `<section>` beginning with an `hx`; depth beyond `h6` via `aria-level`.
  Special sections typed by DPUB-ARIA `role` (`doc-abstract`, `doc-introduction`, etc.).
- **Enscribe:** native section nesting by level; sections are flow containers. Enscribe's
  authoring (markdown `##` or `<section>`) is far lighter than hand-writing `<section><h1>`.
- **Verdict: Enscribe wins on authoring.** *Consider borrowing:* Scholarly HTML's **typed
  special sections** (abstract/intro/conclusion/acknowledgements as first-class *roles*) is a
  clean idea — Enscribe has `abstract` but could systematize a `role=` on sections for the
  standard scholarly section types, which JATS also wants.

### Paragraphs & inline formatting

- **RASH:** `p`; inlines `em`, `strong`, `q` (inline quote), `sub`, `sup`, `code`, `span`, `a`.
  That's the whole inline set. Quotations use `<q>` (semantic, browser adds quotes).
- **Scholarly HTML:** "hunk elements" (their word for block content — `p`, `blockquote`, lists);
  standard HTML inlines.
- **Enscribe:** far richer inline set + the three-register shorthand (markdown idioms, sigils,
  canonical tags). Enscribe's `^{}`/`_{}` sigils vs RASH's hand-written `<sup>`/`<sub>`.
- **Verdict: Enscribe wins decisively.** *Note:* RASH's use of **`<q>` for inline quotes** (vs
  literal quote characters) is a small correctness win Enscribe should make sure it matches —
  semantic inline quotation that the browser renders with locale-correct quote marks.

### Frameables (figures / tables / formulas / listings) — numbering & captions

This is the richest comparison and where the "patterns" idea pays off.

- **RASH:** **everything boxed is one element — `<figure>`** — discriminated by content:
  - figure (image): `<figure id><p><img></p><figcaption>…</figcaption></figure>`
  - table: `<figure id><table>…</table><figcaption></figcaption></figure>`
  - formula: `<figure id><p><math|img|span role=math></p></figure>`
  - listing (code): `<figure id><pre><code>…</code></pre><figcaption></figcaption></figure>`
  All share **one `record` pattern** (content + caption). **Numbering & caption rendering are
  done by the RASH JS at view time** — the author writes no numbers; `figcaption` text is the
  caption, the "Figure N." label is generated. Cross-refs (below) are also auto-numbered by JS.
- **Scholarly HTML:** `<figure typeof="sa:image|sa:table|sa:formula|schema:SoftwareSourceCode">`
  — same "one figure element, typed by content" approach, but typed via RDFa `typeof` rather
  than inferred from content. Tables put their caption in `<caption>` (not `<figcaption>`).
  Formula requires MathML **with a mandatory TeX `annotation`** (smart accessibility call).
- **Enscribe:** the **"frameable" family** — figure/table/listing/theorem/etc. with `#id`,
  captions in three authoring forms (child `<caption>`, pipe, `caption=` kwarg, all converging),
  automatic numbering, typed cross-refs.
- **Verdict: Enscribe wins on authoring and on caption flexibility** (three convergent caption
  forms vs hand-written `figcaption`). **RASH gets two things right worth noting:**
  1. **The single-`<figure>`-typed-by-content collapse** is elegant and is *exactly* Enscribe's
     frameable family — independent convergence on the same design validates yours.
  2. **View-time numbering** (numbers are never in the source; generated on render) — Enscribe
     does this too, but confirm Enscribe's numbering is fully source-free and reference-stable.
  - *Consider:* Scholarly HTML's **mandatory TeX annotation inside MathML** for accessibility —
    Enscribe renders LaTeX→KaTeX; make sure the *source* LaTeX survives into the output (or a
    MathML+annotation) so the math is machine-recoverable, not just visually rendered.

### Math environments

- **RASH:** three ways — full MathML; `<img role=math>`; or `<span role=math>` with **LaTeX or
  AsciiMath** rendered by MathJax. Flexible but the author chooses the mechanism each time.
- **Scholarly HTML:** MathML 3 required, **plus a mandatory TeX `annotation` child** (because
  browser MathML support was poor) — so every formula carries its LaTeX source.
- **Enscribe:** LaTeX math → KaTeX/MathJax. Single clean authoring path.
- **Verdict: Enscribe wins on authoring simplicity** (one LaTeX path vs three mechanisms). The
  **AsciiMath** option in RASH is mildly interesting (lighter than LaTeX for simple formulas)
  but not worth the complexity. **Take the accessibility lesson:** keep the LaTeX source
  recoverable in the output, per Scholarly HTML's annotation requirement.

### Asides / boxed standalone content

- **RASH:** no dedicated aside — would be a `section` or `figure`.
- **Scholarly HTML:** `<aside>` is a first-class "hunk" — standalone content separable without
  loss; if it has a heading, depth rules apply (heading level reflects nesting). Explicitly
  modeled as "text boxes in print."
- **Enscribe:** `aside` as a flow element (multi-paragraph), part of the frameable/note family.
- **Verdict: roughly even; Enscribe's authoring is lighter.** Scholarly HTML's **explicit
  "separable without impact on understanding" semantics** for aside is a nice precise definition
  worth stating in Enscribe's spec for `aside`.

### Code listings

- **RASH:** inline `<code>`; block `<pre><code>`; listing box `<figure><pre><code></figcaption>`.
  No language tagging, no highlighting in the spec (it's a research-paper format).
- **Scholarly HTML:** `<figure typeof="schema:SoftwareSourceCode"><pre><code>`.
- **Enscribe:** `<code language=python>`, triple-backtick sigil, markdown fences, inline-code —
  with `language-X` class for highlighter discovery, captioned/numbered listing variant.
- **Verdict: Enscribe wins clearly** — language tagging, multiple authoring registers,
  highlighting hooks, and listing-as-frameable numbering. Neither prior project tags languages.

### Tables

- **RASH:** `<figure id><table><thead?><tr><th|td>…<figcaption>`. Cells (`td`) **cannot contain
  text directly — must contain blocks** (`<td><p>…</p></td>`) — a consequence of the strict
  pattern system (a cell is a container, not a block). Caption in `figcaption`.
- **Scholarly HTML:** `<figure typeof="sa:table"><table>` with the caption in the table's own
  `<caption>` (deliberately *not* `figcaption`), table-note `<ol>`/`doc-footnote`.
- **Enscribe:** table as a frameable, with caption convergence and CSV/data-driven options in
  the roadmap (`<dataset>`/`@id` pull, #313).
- **Verdict: Enscribe wins, and the roadmap (#313 data-driven tables) extends the lead.** *Note
  the RASH cell rule:* "a cell contains blocks, not text" is the patterns theory being strict —
  it's pedantically clean but verbose to author. Enscribe's lighter cell authoring is better;
  just be aware of the content-model question (does an Enscribe table cell hold phrasing or
  flow? RASH says flow/container. Worth an explicit decision if not already made).

### Citations & a reference library

- **RASH:** references are a **`<section role="doc-bibliography">`** containing **one list**;
  each `<li id role="doc-biblioentry">` is a hand-written, human-readable citation with an `<a>`
  to the source. **`<ul>` → JS reorders alphabetically; `<ol>` → preserves source order.** No
  separate "library" — the bibliography *is* the list, hand-authored. RDFa/CiTO can type the
  *reason* for a citation (the SPAR "CiTO" ontology: "cites as evidence", "extends", etc.).
- **Scholarly HTML:** references are a `section` with one `ol`/`dl`; each entry is a
  `doc-biblioentry` with **schema.org structured metadata** (author, date via `<time>`, title in
  `<cite>`, access-date as a `schema:ReadAction`). Deliberately rich + human-readable
  simultaneously; explicitly rejects supporting 8000 citation styles, recommends CSL mapping.
- **Enscribe:** first-class `<cite key>` + an **external `<library src>`** reference store
  (a real bibliography database separate from the prose) + CSL-oriented rendering.
- **Verdict: Enscribe wins on the *library* model** (a separable reference store with keyed
  citation, vs both projects' inline hand-authored bibliography). **But both prior projects have
  something Enscribe should consider:**
  1. **CiTO citation *reasons*** (RASH) — typing *why* you cite (supports/refutes/extends/uses
     method-of). This is a genuinely useful scholarly semantic Enscribe's `<cite>` doesn't
     capture. Cheap to add as an optional attribute (`<cite key reason=extends>`), high value to
     the semantic-publishing crowd, and maps to a real published ontology.
  2. **The CSL mapping target** (Scholarly HTML) — both projects point at Citation Style
     Language as the interop standard. If Enscribe's library→rendered-citation path can *emit
     and consume CSL-JSON*, you inherit the entire CSL ecosystem (Zotero, Mendeley, 8000+
     styles) for free. This is probably the highest-leverage interop hook in this whole
     document — confirm Enscribe's citation model is CSL-compatible.

### Notes (foot/endnotes) & note pointers

- **RASH:** footnotes are a **`<section role="doc-endnotes">`** of `<section role="doc-endnote"
  id>` blocks; **multiple note pointers auto-separated by a comma** by the JS. Pointer is an
  empty `<a href="#fn3"/>` (the number is generated).
- **Scholarly HTML:** notes are `doc-footnote` hunks or a `doc-endnotes` section of
  `doc-endnote` items.
- **Enscribe:** `note` as a flow element (multi-paragraph), footnote/margin-note distinction,
  typed pointers.
- **Verdict: Enscribe wins** (margin notes, multi-para notes, lighter authoring). *Borrow:*
  RASH's **automatic comma-separation of adjacent note pointers** is a nice rendering detail —
  `<ref>` x, y, z collapsing cleanly. Confirm Enscribe does adjacent-reference grouping.

### Cross-references (in-text pointers)

- **RASH:** **one mechanism for everything** — empty `<a href="#id"/>`. The JS looks at the
  *target's* type and generates the right label+number ("Figure 3", "Section 2", "[5]"). Author
  writes only the link; **all numbering and label text generated at view time.** Multiple
  adjacent refs auto-separated.
- **Scholarly HTML:** `rel`-flavored links + `href`; less automatic.
- **Enscribe:** **typed colon-ids** (`#fig:elephant`, `#sec:intro`) so a `<ref>` names *both the
  kind and the target*; cross-chapter references; auto-numbered.
- **Verdict: Enscribe wins — and the typed-id design is better than RASH's.** RASH infers the
  target type from the target element; Enscribe encodes it in the id (`fig:`, `sec:`, `thm:`).
  Enscribe's is more robust (the reference is self-describing; you know what `#fig:x` is without
  resolving it) and supports cross-chapter. **RASH's view-time-only numbering is the right model
  and Enscribe matches it.** One RASH detail to confirm Enscribe has: **a bare `<ref #id>` with
  no link text auto-generates the full "Figure 3" label** (RASH's empty-`<a>` → generated label).

### Numbering generally

Both prior projects and Enscribe agree on the key principle: **numbers live in the rendered
output, never in the source.** RASH does it in browser JS; Enscribe does it in the
render/assembler. This is the correct, hard-won design — worth stating explicitly in Enscribe's
docs as a *principle* (source has no numbers; numbering is a render concern; references resolve
to generated numbers), because it's a thing LaTeX/Word users find surprising and reassuring.

---

## Things the prior projects have that Enscribe lacks (the real to-think-about list)

Ordered by how much Enscribe should care:

1. **CSL (Citation Style Language) interop** — *highest leverage.* Both projects target it.
   Emitting/consuming CSL-JSON connects Enscribe to Zotero/Mendeley/Pandoc and 8000+ styles.
   Likely Enscribe's `<library>` is close; make it explicit and bidirectional.
2. **A formal, named content-model pattern taxonomy** (RASH's structural patterns) — Enscribe
   has the substance (flow/phrasing) but not the formalization. Naming it as a closed set
   unlocks generic processing, cleaner strict-mode, systematic JATS projection, and credibility.
3. **CiTO citation reasons** — typed *why-cited* semantics. Cheap optional attribute, real
   ontology, valued by the semantic-publishing community.
4. **Rich authorship / affiliation / funding / contributor-role model** (Scholarly HTML) —
   Enscribe's front-matter is thin here. SH's **role-indirection pattern** (a contributor *role*
   carries author + affiliation + action, distinct from the person's intrinsic identity) is a
   genuinely good model, and JATS wants this structure too. Worth adopting for the front matter.
5. **Typed special sections** (abstract/intro/methods/conclusion/acknowledgements/funding as
   first-class roles) — both projects have these; Enscribe partially. Systematize for JATS.
6. **Inbound conversion ecosystem** — RASH converts *from* LaTeX/DOCX/ODT and *to* them (ROCS
   service); Scholarly HTML has a DOCX authoring style that targets it. Enscribe has JATS
   (excellent for archival) but the *author-migration* story (I have a LaTeX/Word doc — get me
   into Enscribe) is worth a roadmap thought. Pandoc-from-X → Enscribe could be cheap.
7. **The accessibility annotation discipline** — Scholarly HTML's mandatory TeX-in-MathML and
   its `schema:accessibilityFeature` declarations. Enscribe should ensure math source is
   recoverable and could declare accessibility features.
8. **DPUB-ARIA roles throughout** — both lean on DPUB-ARIA (`doc-*` roles) for structural
   semantics that assistive tech understands. Enscribe emits semantic HTML; confirm it emits the
   `doc-*` ARIA roles where applicable (doc-abstract, doc-biblioentry, doc-footnote, etc.) — this
   is low-effort, high-accessibility-value, and aligns with both prior projects + JATS.

## Things Enscribe has that *neither* prior project has (your moat)

For completeness / the docs:

- **A real authoring language** (the Enscribe shorthand) — both make you write HTML. This is the
  whole game and Enscribe owns it.
- **Books / multi-chapter** with chapter rails, cross-chapter references, per-chapter sources.
- **A separable reference library** (`<library src>`) vs inline hand-authored bibliographies.
- **Three-register authoring** (markdown idioms / sigils / canonical tags) with strict mode.
- **A live, editable, round-tripping browser engine** (vs batch validators/converters).
- **Bidirectional JATS** — arguably a *better* archival target than the RDF/schema.org stack for
  the academic-publishing mainstream (JATS is what PubMed Central et al. actually use).
- **Delivery modes / single-file self-contained documents** via CDN.

## Suggested next moves (not slices yet — research/decisions)

1. **Read the structural-patterns paper** (Di Iorio, Peroni, Poggi, Vitali 2014, JASIST) and
   decide whether to formalize Enscribe's content model as a named closed taxonomy. (Highest
   conceptual value.)
2. **Audit Enscribe's citation model against CSL-JSON** — can `<library>` round-trip CSL? (Highest
   interop value.)
3. **Decide on CiTO-style citation reasons** as an optional `<cite>` attribute.
4. **Design a richer contributor/affiliation/funding front-matter model**, borrowing Scholarly
   HTML's role-indirection; align to JATS.
5. **Confirm DPUB-ARIA `doc-*` role emission** in the rendered HTML (cheap accessibility win).
6. **Sketch an inbound-conversion story** (Pandoc/LaTeX/DOCX → Enscribe) for author migration.

## Sources

- RASH documentation (element-level grammar) — https://rawgit.com/rash-framework/rash/master/documentation/index.html
- RASH Framework — https://rash-framework.github.io/rash.html
- RASH paper — Peroni et al., PeerJ CS 3:e132 (2017) — https://peerj.com/articles/cs-132/
- Scholarly HTML — https://w3c.github.io/scholarly-html/
- Structural patterns — Di Iorio, Peroni, Poggi, Vitali, JASIST 65(9):1884–1900 (2014)
- SPAR ontologies (CiTO, FaBiO, DoCO) — http://www.sparontologies.net/
