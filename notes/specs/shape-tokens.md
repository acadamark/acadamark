# Shape tokens

Vocabulary entries classify the content an element accepts using three abstract tokens in their `content.shape` / `contains` fields. This document defines those tokens and the classification convention.

> **Status.** These tokens were once expanded and enforced at runtime by a schema-validation subsystem (`interpreter/schema/validate.js` and a content-shape validator). **That subsystem was removed** — the interpreter no longer reads `content.shape`, and no code expands or checks these tokens today. They remain as the **content-model classification recorded in each vocabulary entry**: design metadata that documents the intended shape of an element's content for vocabulary authors and downstream readers, not a constraint the pipeline enforces. Dispatch keys on the tagname and the entry's `interpreter_strategy` / `enscribe_attributes`, not on `content.shape`.

## The three tokens

- **`inline`** — content that appears within a flow of prose without breaking the line (semantic emphasis, inline code, links, cross-references, inline note markers, and the like).
- **`block`** — content that produces a block-level visual unit, breaking the line and occupying its own vertical region (paragraphs, asides and blockquotes, figures, tables, lists, collected note lists and bibliographies).
- **`section`** — content that establishes or contains structural divisions: the `<section>` / `<sub-section>` / `<sub-sub-section>` depth ladder, and `<book-part>`.

These three categories are exhaustive for the eHTML vocabulary: every authored element belongs to one of them, determined by where it appears in source and how it renders. **The per-element classification lives in each element's vocabulary entry (`content.shape`), which is its source of truth** — this document defines what the tokens *mean*, not which elements carry which token.

## Using the tokens in vocabulary entries

Entries reference the tokens in their `content.shape` field's `contains` arrays. Illustrative shapes:

A paragraph contains inline content only:

```yaml
content:
  shape:
    contains: [inline]
```

A section contains block-level body content plus nested sub-sections:

```yaml
content:
  shape:
    - element: section-title
      required: false
    - element: body
      contains: [block, section]
```

A list item contains both inline content (most items) and block content (multi-paragraph items, nested lists):

```yaml
content:
  shape:
    contains: [inline, block]
```

Mixing categories within one content model is normal: section bodies mix `block` and `section`; list items, asides, and blockquotes mix `inline` and `block`.

## Classification is by source position, not content type

An element's token reflects **where it appears in source and what placement constraints apply**, not the nature of its eventual content. Two consequences worth recording:

- `<note>` is classified `inline` because its source position is inline (the marker sits in prose), even though the note's *displayed* body is block-level.
- Asides and blockquotes are always `block`, even when their content is short.

Some eHTML elements appear only as outputs of the structural pipeline (`<article-front>`, `<section-title>`, `<book-part-title>`, …) and carry no `inline`/`block`/`section` classification: they sit in fixed positions within their parent containers rather than as siblings in a flexible content model.

## Why three tokens

- **Two tokens (inline/block) is too coarse.** It cannot distinguish "block content within a section" from "section content within a section" — both are block-level in HTML, but their structural roles differ.
- **One token per element is too fine.** It produces unwieldy `contains` arrays and forces every container entry to enumerate its allowed elements; adding an element would touch every container.
- **Three tokens (inline / block / section)** match HTML's structural grammar (phrasing, flow, sectioning content), simplified to enscribe's authoring concerns. It is the natural granularity.

## Content model and single-paragraph wrapping (flow / phrasing / tight-loose)

The `contains` tokens, read as **what an element holds**, also answer a question the interpreter must
answer for every prose-bearing element: when an element's pipe body is a single paragraph of text,
should it render wrapped (`<el><p>…</p></el>`) or bare (`<el>…</el>`)? This is the `#326` question. The
answer is a property of the element's **content model**, *not* of the paragraph count — a single
paragraph inside `<abstract>` is still block (flow) content that happens to have one paragraph, and it
should wrap for consistency with the multi-paragraph case.

**The discriminator is `<p>`-validity: is a `<p>` valid inside this element?** It is read directly off
the `contains` array (a `<p>` is `block`, so a `<p>` is valid exactly when `block ∈ contains`), giving
three content-model states:

| State | `contains` reading | `<p>` valid inside? | Single-paragraph pipe body | Why |
|---|---|---|---|---|
| **phrasing** | `[inline]` (inline only) | no | **unwrap** to inline children | a `<p>` is *invalid* inside (e.g. `<em><p>x</p></em>` is invalid HTML); unwrapping is a **correctness** requirement, not a choice |
| **flow** | includes `block`, not `inline` (e.g. `[block]`, `[block, section]`) | yes | **wrap** in `<p>` | consistency (single ≡ multi), uniform CSS targeting (`abstract p {…}`), structural uniformity for consumers (JATS and TEI model this as `<p>`), least-surprise; matches Pandoc / CommonMark / HTML / JATS |
| **tight/loose** | `[inline, block]` (both) | yes | **stay bare (tight)**; multiple paragraphs **wrap (loose)** | the Markdown/Pandoc list-item (tight-vs-loose) convention — the one case where a single-paragraph stays bare for a non-phrasing element |

The rule is therefore **derivable, not arbitrary**: classify any element by whether a `<p>` is valid in
it (does `contains` include `block`?) and, when it is, whether a bare inline phrase is *also* valid
(does `contains` *also* include `inline`?) — and its wrapping behavior follows. `inline` only →
phrasing → unwrap; `block` without `inline` → flow → wrap; both → tight/loose → tight single, loose
multi.

This keeps the content model **unified**: the same `shape.contains` array that classifies the ~27+8
structural elements expresses the prose elements' content model too — there is no second, parallel
axis. The list-item case is already encoded this way: `<item>` carries `contains: [inline, block]`
(tight/loose) today. The prose-bearing elements that once carried only a prose content-type label with no
`contains` (the `abstract`/`date` gap: their `content` blocks were byte-identical, differing only in
human `notes:` text, so the model could not answer "is a `<p>` valid here") now **carry the
`shape.contains` token that states their content model** — `[inline]` for phrasing, `[block]` for
flow, `[inline, block]` for tight/loose — so the wrapping decision reads one field. *(Landed in #326:
every prose-bearing element now carries `content.shape.contains`; the parse-time gate
`recursive-content.js#extractFromRoot` consumes it — flow keeps the single `<p>`, phrasing unwraps;
the flow goldens were re-baselined to the wrapped render.)*

> **Reading note — content model vs. source position (RESOLVED).** This section reads `contains` as
> *what the element holds* (its content model — the axis the `#326` wrapping decision needs). The
> section *"Classification is by source position…"* above reads it as *where the element sits*. For
> most elements the two agree; `<note>` is the documented divergence (it *sits* inline as a marker but
> *holds* block content). **Maintainer decision:** for the wrapping decision the **content-model
> ("holds") reading governs** — `content.shape.contains` means "what the element holds," and that is
> the field the `#326` gate consults, so a `<note>` (holds block) is **flow** and wraps. Source
> position, where it diverges, is a separate concern recorded elsewhere (the placement taxonomy); it
> does not feed the wrapping gate.

### Finalized classification (maintainer-ratified, implemented in #326)

Every prose-bearing element, classified by `<p>`-validity and encoded as
`content.shape.contains`. **The prose content model is a binary: flow or phrasing — there are NO prose
tight/loose members** (the only tight/loose element is the structural `<item>`). The interpreter gate
consumes this directly; the goldens are re-baselined to match.

**phrasing → unwrap** (`content.shape.contains: [inline]`):
- *inline-formatting:* `a`, `abbr`, `b`, `em`, `i`, `kbd`, `output`, `q`, `s`, `samp`, `strong`, `sub`, `sup`, `term`, `u`, `var`
- *citations (render inline):* `cite`, `ref`
- *metadata leaf values:* `date`, `name`, `affiliation`, `email`, `orcid`, `doi`, `lang`, `license`, `keywords`, `editor`, `subject`, `title`, `subtitle`, `version`, `publication-date`
- *titles/subtitles (already carried `[inline]`):* `article-title`, `article-subtitle`, `section-title`, `section-subtitle`, `sub-section-title`, `sub-section-subtitle`, `sub-sub-section-title`, `sub-sub-section-subtitle`, `book-title`, `book-subtitle`, `book-part-title`, `book-part-subtitle`
- `p` — a `<p>` cannot contain a `<p>` (phrasing content); `<p | x>` renders `<p>x</p>`.
- `summary` — HTML `<summary>` is phrasing content (`<summary><p>` is invalid).
- **`dt`** — HTML allows flow in `<dt>`, but a term reads as a short label; **maintainer chose phrasing** (`<dt | term>` → `<dt>term</dt>`, no `<p>`).

**flow → wrap** (`content.shape.contains: [block]`):
- `abstract` — the headline against-`category` case (`category: metadata`, but flow).
- *theorem-family:* `corollary`, `definition`, `example`, `lemma`, `proof`, `proposition`, `remark`, `theorem`
- *block-prose:* `aside`, `blockquote`, **`note`** (maintainer: definitely flow — must support multi-paragraph; the "holds block" reading governs over its inline source position).
- *frameables:* `fig`, `frame`
- **`dd`** — a `<p>` is valid in `<dd>`; **maintainer chose flow** (wrap for consistency), not the list-item tight/loose convention.
- *(`aside`/`blockquote`/etc. unwrapped a single paragraph before #326; under this model they wrap — that behavior change is what #326 landed.)*

**No prose tight/loose.** `<item>` keeps `content.shape.contains: [inline, block]` (the encoded
exemplar of tight/loose) but it is structural navigation (`category: navigation`), not a
prose-bearing element.

**Out of scope of this prose table (not prose-bearing elements):**
- `dl`, `glossary`, `glossary-entry` — containers whose `content.shape` is a nested sub-element list (no top-level `contains`); their single-paragraph `<dd>` children wrap because `dd` is flow, but the containers themselves carry no prose content model.
- `item` — `category: navigation`; `content.shape.contains: [inline, block]` tight/loose, encoded already.
- `caption` — the frameable caption surface; **`caption.md` classifies it `[block]` (flow)** (#326). A
  single-paragraph caption WRAPS in `<p>`, identical across all three authoring forms — the `<caption | …>`
  child tag, the legacy `<fig … | caption>` pipe-content, and the `caption="…"` kwarg — because all three
  resolve to a flow `<caption>` whose single paragraph is kept by the one parse-time content-model gate. (The
  paired `title` surface is `[inline]` / phrasing — a frameable title stays bare inline.)
- `figcaption`, `figure` — no vocabulary element files under these names (the rendered output of `caption`
  inside a figure is `<figcaption>`; the authored frameable is `fig` / `frame`).

**Category does not map to content model.** `theorem-family` ≈ flow and `inline-formatting` ≈ phrasing
map cleanly, but `metadata` mixes flow (`abstract`) with phrasing (everything else), and `block-prose`
mixes flow (`aside`/`blockquote`/`note`/`dd`) with phrasing (`p`/`summary`/`dt`). That is precisely why
the content model is its own property (`content.shape.contains`), not derived from `category`.

## Related references

- `packages/ehtml/SPEC.md` — the vocabulary specification.
- `packages/ehtml/elements/` — the individual entries, each declaring its own `content.shape`.
- `DESIGN.md` — the layer model and the vocabulary's place in it.
- `notes/specs/interpreter.md` §6.2 — `convertContent`, the interpreter consumer of this content-model
  (the single-paragraph wrapping decision).
- `notes/specs/lists.md` — list `<item>` content (the tight/loose list-item convention this model names).
- `notes/specs/frameable.md` — frameable `title` (phrasing) vs `caption` and the frameable body (both flow).
