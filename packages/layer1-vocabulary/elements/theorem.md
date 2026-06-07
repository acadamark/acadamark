---
semantic_role: theorem
category: theorem-family
html_output:
  element: theorem
  is_html_native: false
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    name:
      maps_to: data-name
      notes: |
        Optional name suffix for the theorem's label (the
        "(Pythagoras)" half of "Theorem 1.2 (Pythagoras)"). Honored
        by the Phase-2 theorem handler at label-rendering time;
        until that handler lands, the kwarg flows through to the
        rendered HTML as `data-name="..."` via schema dispatch.
        LaTeX amsthm precedent: `\begin{theorem}[Pythagoras]`.
  booleans:
    numbered:
      handled_by: handler
      default: true
      notes: |
        Whether this theorem participates in the theorem-family
        shared counter (see "Numbering" below). Use +numbered
        (default) to number; -numbered to suppress. Can also be
        written as numbered=true / numbered=false.
content:
  type: prose
  becomes: children
  notes: |
    The theorem's body is paragraphs and inline content directly —
    no internal element parts (no <theorem-statement> wrapper). The
    LaTeX amsthm and JATS prior-art both place body content directly
    inside the theorem container.
content_handler: default
jats_counterpart:
  element: statement
  attributes:
    content-type: theorem
  notes: |
    JATS does not have a dedicated <theorem> element; all theorem-
    family elements (theorem, lemma, corollary, proposition,
    definition, example, remark, proof) map to <statement> with a
    content-type attribute identifying the rhetorical role. JATS
    <statement> contains <label> (the prefix string like
    "Theorem 1.2:"), optional <title> (the optional name from the
    `name` kwarg), then <p> paragraphs. The Phase-2 handler
    constructs the <label> and <title> at export time; this slice
    just records the mapping.
shorthand_examples:
  - source: |
      <theorem | If $a^2 + b^2 = c^2$ then the triangle is right-angled.>
    layer1_html: |
      <theorem>If $a^2 + b^2 = c^2$ then the triangle is right-angled.</theorem>
    notes: |
      Short-form with pipe content. The body is parsed normally.
  - source: |
      <theorem name="Pythagoras" #thm:pyth>
      If $a^2 + b^2 = c^2$, the triangle with sides $a$, $b$, $c$
      is right-angled.
      </theorem>
    layer1_html: |
      <theorem id="thm:pyth" data-name="Pythagoras">If $a^2 + b^2 = c^2$, the triangle with sides $a$, $b$, $c$ is right-angled.</theorem>
    notes: |
      Long-form with the optional name kwarg. Cross-referenceable
      via id (the "thm:" colon-prefix convention is consistent with
      "fig:", "eqn:", "sec:" elsewhere in enscribe). The name
      kwarg lifts to `data-name`; the Phase-2 handler will render
      it as the "(Pythagoras)" suffix to the label "Theorem N".
interpreter_strategy: handler
handler_module: ./handlers/theorem.js
---

# `<theorem>`

A theorem — a formally-stated mathematical assertion meant to be proved. The first and most common element of the theorem family.

## Semantic intent

`<theorem>` is the LaTeX/amsthm equivalent for the canonical theorem-style environment. The enscribe theorem family includes `<theorem>`, `<lemma>`, `<corollary>`, `<proposition>`, `<definition>`, `<example>`, `<remark>`, and `<proof>` — the standard amsthm vocabulary; all map to JATS's `<statement>` with a `content-type` attribute identifying the role.

The element is block-level. Its content is body content (paragraphs, math, lists, etc.) — there are no internal element parts (no `<theorem-statement>` or `<theorem-body>` wrapper). LaTeX amsthm and JATS prior art both place body content directly; enscribe follows.

## Authoring

```
<theorem name="Pythagoras" #thm:pyth>
If $a^2 + b^2 = c^2$, the triangle with sides $a$, $b$, $c$ is
right-angled.
</theorem>
```

The optional `name` kwarg becomes the "(Pythagoras)" suffix to the rendered label. The `id` is the cross-reference target.

## Numbering

`<theorem>` shares a counter with `<lemma>`, `<corollary>`, and `<proposition>` — the four propositional theorem-family elements run on one document-wide sequence. So a document reads "Theorem 1, Lemma 2, Corollary 3, Theorem 4, …" rather than each type starting from 1 independently. This matches the most common amsthm configuration (one shared counter for the propositional family); the rhetorically-distinct families (`<definition>`, `<example>`) get their own counters, and `<remark>`/`<proof>` are unnumbered.

The shared-counter wiring is a Phase-2 handler concern (the vocab schema has no mechanism for declaring "shares a counter with these other elements" today; the convention is recorded in prose and the handler implements it). Per-instance suppression via `-numbered` is honored.

## Proof is a peer, not a child

`<proof>` is a peer block element, not a child of `<theorem>`. In LaTeX amsthm `\begin{proof}…\end{proof}` is independent of any theorem-like environment; in JATS `<statement content-type="proof">` is just another statement. Enscribe follows:

```
<theorem name="Pythagoras">…</theorem>

<proof>
By similar triangles…
</proof>
```

The proof sits at sibling level and may follow any theorem-family element or stand alone.

## JATS mapping

| enscribe | JATS |
|---|---|
| `<theorem>` | `<statement content-type="theorem">` |
| `name` kwarg | `<title>` inside `<statement>` |
| Body content | `<p>` paragraphs inside `<statement>` |
| Rendered label "Theorem N" | `<label>` inside `<statement>` (constructed at export) |

## Render-mode lowering

`<theorem>` is a custom element; CSS targets it directly. In render mode, the Phase-2 handler renders the "Theorem N (Name):" label and the body in the conventional theorem-style block format.

## See also

- [`<lemma>`](lemma.md), [`<corollary>`](corollary.md), [`<proposition>`](proposition.md) — siblings sharing the propositional counter.
- [`<definition>`](definition.md), [`<example>`](example.md) — theorem-family elements with their own counters.
- [`<remark>`](remark.md), [`<proof>`](proof.md) — unnumbered theorem-family elements.
