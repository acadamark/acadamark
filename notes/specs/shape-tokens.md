# Shape tokens

Vocabulary entries classify the content an element accepts using three abstract tokens in their `content.shape` / `contains` fields. This document defines those tokens and the classification convention.

> **Status.** These tokens were once expanded and enforced at runtime by a schema-validation subsystem (`interpreter/schema/validate.js` and a content-shape validator). **That subsystem was removed** — the interpreter no longer reads `content.shape`, and no code expands or checks these tokens today. They remain as the **content-model classification recorded in each vocabulary entry**: design metadata that documents the intended shape of an element's content for vocabulary authors and downstream readers, not a constraint the pipeline enforces. Dispatch keys on the tagname and the entry's `interpreter_strategy` / `enscribe_attributes`, not on `content.shape`.

## The three tokens

- **`inline`** — content that appears within a flow of prose without breaking the line (semantic emphasis, inline code, links, cross-references, inline note markers, and the like).
- **`block`** — content that produces a block-level visual unit, breaking the line and occupying its own vertical region (paragraphs, asides and blockquotes, figures, tables, lists, collected note lists and bibliographies).
- **`section`** — content that establishes or contains structural divisions: the `<section>` / `<sub-section>` / `<sub-sub-section>` depth ladder, and `<book-part>`.

These three categories are exhaustive for the Layer 1 vocabulary: every authored element belongs to one of them, determined by where it appears in source and how it renders. **The per-element classification lives in each element's vocabulary entry (`content.shape`), which is its source of truth** — this document defines what the tokens *mean*, not which elements carry which token.

## Using the tokens in vocabulary entries

Entries reference the tokens in their `content.shape` field's `contains` arrays. Illustrative shapes:

A paragraph contains inline content only:

```yaml
content:
  type: prose
  shape:
    contains: [inline]
```

A section contains block-level body content plus nested sub-sections:

```yaml
content:
  type: structured
  shape:
    - element: section-title
      required: false
    - element: body
      contains: [block, section]
```

A list item contains both inline content (most items) and block content (multi-paragraph items, nested lists):

```yaml
content:
  type: prose
  shape:
    contains: [inline, block]
```

Mixing categories within one content model is normal: section bodies mix `block` and `section`; list items, asides, and blockquotes mix `inline` and `block`.

## Classification is by source position, not content type

An element's token reflects **where it appears in source and what placement constraints apply**, not the nature of its eventual content. Two consequences worth recording:

- `<note>` is classified `inline` because its source position is inline (the marker sits in prose), even though the note's *displayed* body is block-level.
- Asides and blockquotes are always `block`, even when their content is short.

Some Layer 1 elements appear only as outputs of the structural pipeline (`<article-front>`, `<section-title>`, `<book-part-title>`, …) and carry no `inline`/`block`/`section` classification: they sit in fixed positions within their parent containers rather than as siblings in a flexible content model.

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
| **flow** | includes `block`, not `inline` (e.g. `[block]`, `[block, section]`) | yes | **wrap** in `<p>` | consistency (single ≡ multi), uniform CSS targeting (`abstract p {…}`), structural uniformity for consumers (JATS models this as `<p>`), least-surprise; matches Pandoc / CommonMark / HTML / JATS |
| **tight/loose** | `[inline, block]` (both) | yes | **stay bare (tight)**; multiple paragraphs **wrap (loose)** | the Markdown/Pandoc list-item (tight-vs-loose) convention — the one case where a single-paragraph stays bare for a non-phrasing element |

The rule is therefore **derivable, not arbitrary**: classify any element by whether a `<p>` is valid in
it (does `contains` include `block`?) and, when it is, whether a bare inline phrase is *also* valid
(does `contains` *also* include `inline`?) — and its wrapping behavior follows. `inline` only →
phrasing → unwrap; `block` without `inline` → flow → wrap; both → tight/loose → tight single, loose
multi.

This keeps the content model **unified**: the same `shape.contains` array that classifies the ~27+8
structural elements expresses the prose elements' content model too — there is no second, parallel
axis. The list-item case is already encoded this way: `<item>` carries `contains: [inline, block]`
(tight/loose) today. The prescription for the prose-bearing elements that currently carry only
`content.type: prose` with no `contains` (the `abstract`/`date` gap: their `content` blocks are
byte-identical, differing only in human `notes:` text, so the model cannot today answer "is a `<p>`
valid here") is to **add the `shape.contains` token that states their content model** —
`[inline]` for phrasing, `[block]` for flow, `[inline, block]` for tight/loose — so the wrapping
decision reads one field. *(The per-element encoding, the interpreter gate that consumes it, and the
golden re-baseline are the follow-up implementation slice; this section defines the model.)*

> **Reading note — content model vs. source position.** This section reads `contains` as *what the
> element holds* (its content model — the axis the `#326` wrapping decision needs). The section
> *"Classification is by source position…"* above reads it as *where the element sits*. For most
> elements the two agree; `<note>` is the documented divergence (it *sits* inline as a marker but
> *holds* block content). For the wrapping decision, the **content-model** reading governs (a `<note>`
> holds block → flow → wraps). This terminological overload of one field is **flagged for the
> maintainer**: the two readings may warrant separate fields, or an explicit note that `contains`
> means "holds" and placement is recorded elsewhere.

### Proposed classification (for maintainer review — not finalized)

Every `content.type: prose` element, classified by `<p>`-validity. **Marked `⚑` are calls made against
the element's `category`** (proving `category` is *not* the signal) **or otherwise flagged for a
decision.** This table is a **proposal pending maintainer review**; the interpreter behavior is
unchanged until the follow-up slice encodes it.

**phrasing → unwrap** (`contains: [inline]`):
- *inline-formatting (clean):* `a`, `abbr`, `b`, `em`, `i`, `kbd`, `marginnote`, `output`, `q`, `s`, `samp`, `span`, `strong`, `sub`, `sup`, `term`, `u`, `var`
- *citations (render inline):* `cite`, `ref`
- *metadata leaf values:* `date`, `name`, `affiliation`, `email`, `orcid`, `doi`, `lang`, `license`, `keywords`, `editor`, `subject`, `title`, `subtitle`, `version`, `publication-date`
- *titles/subtitles (already carry `contains: [inline]`):* `article-title`, `article-subtitle`, `section-title`, `section-subtitle`, `sub-section-title`, `sub-section-subtitle`, `sub-sub-section-title`, `sub-sub-section-subtitle`, `book-title`, `book-subtitle`, `book-part-title`, `book-part-subtitle`
- ⚑ `p` — *category `block-prose`*, but a `<p>` cannot contain a `<p>` (phrasing content); `<p | x>` must render `<p>x</p>`. **Against the prompt's lead (it listed `p` under flow).**
- ⚑ `summary` — *category `block-prose`*, but HTML `<summary>` is phrasing content (`<summary><p>` is invalid). **Not in the prompt's lists; classified phrasing.**

**flow → wrap** (`contains: [block]`):
- `abstract` — ⚑ *category `metadata`* (its phrasing siblings notwithstanding); the headline against-category case.
- *theorem-family (clean):* `corollary`, `definition`, `example`, `lemma`, `proof`, `proposition`, `remark`, `theorem`
- *block-prose:* `aside`, `blockquote`, `note`
- *frameables:* `fig`, `frame`
- Note: `aside` **currently unwraps** (the `#326`-class behavior the interpreter does today); under this model it is flow and should **wrap** — the behavior change deferred to the follow-up.

**tight/loose → tight single, loose multi** (`contains: [inline, block]`):
- ⚑ `dd` — *category `block-prose`*; a definition description follows the list-item (tight/loose) convention. **Against the prompt's lead (it listed `dd` under flow).** A defensible alternative is flow (a `<p>` is valid in `<dd>`); flagged for the call.

**⚑ Flagged for an explicit decision:**
- `dt` (definition **term**) — *category `block-prose`*. HTML allows flow in `<dt>` (so `<p>` is technically valid → flow), but a term reads as a short label (phrasing). **Recommend phrasing** (`<dt | term>` → `<dt>term</dt>`, no `<p>`); maintainer to confirm phrasing vs flow.
- `note` — classified flow here, but see the *content-model vs source-position* note above (`<note>` is recorded `inline` by source position); also a footnote often holds a single phrase, so tight/loose is conceivable. Flagged.

**Out of scope of this prose table (the prompt's leads that are not `content.type: prose`):**
- `dl`, `glossary`, `glossary-entry` — `content.type: structured` (containers), not prose-bearing; their density is a property of their *item* children, governed by `notes/specs/lists.md`.
- `item` — `content.type` absent (navigation); it already carries `contains: [inline, block]` — the **encoded exemplar** of tight/loose, via the `contains` mechanism rather than `content.type: prose`.
- `figcaption`, `figure`, `caption` — no vocabulary element files exist under these names (the frameable caption/title surface is `fig` / `frame` + the `title` / `subtitle` elements).

**Category does not map to content model.** `theorem-family` ≈ flow and `inline-formatting` ≈ phrasing
map cleanly, but `metadata` mixes flow (`abstract`) with phrasing (everything else), and `block-prose`
mixes **all three** (flow `aside`/`blockquote`/`note`; phrasing `p`/`summary`; tight/loose `dd`;
flagged `dt`). That is precisely why the content model must be its own property (the `contains` token),
not derived from `category`.

## Related references

- `packages/layer1-vocabulary/SPEC.md` — the vocabulary specification.
- `packages/layer1-vocabulary/elements/` — the individual entries, each declaring its own `content.shape`.
- `DESIGN.md` — the layer model and the vocabulary's place in it.
- `notes/specs/interpreter.md` §6.2 — `convertContent`, the interpreter consumer of this content-model
  (the single-paragraph wrapping decision).
- `notes/specs/lists.md` — list `<item>` content (the tight/loose list-item convention this model names).
- `notes/specs/frameable.md` — frameable `title` / `caption` (phrasing) vs the frameable body (flow).
