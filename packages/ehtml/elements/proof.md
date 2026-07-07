---
semantic_role: proof
category: theorem-family
semantic_family: formal-statements
html_output:
  element: proof
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
        Optional name suffix — e.g. "Proof (of Theorem 1.2)" or
        "Proof (sketch)". Honored by the Phase-2 handler.
  booleans:
    numbered:
      handled_by: handler
      default: false
      notes: |
        Whether this proof is numbered. Default false — proofs are
        conventionally not numbered (a proof's identity comes from the
        theorem it proves, not from a counter). An author who wants
        numbering can opt-in per instance with +numbered.
content:
  shape:
    contains: [block]
  becomes: children
  notes: |
    The proof body — paragraphs, math, lists, etc. The closing QED
    symbol is rendered by the Phase-2 handler at the end of the
    body, not authored explicitly.
jats_counterpart:
  element: statement
  attributes:
    content-type: proof
  notes: |
    JATS <statement content-type="proof">. <proof> is a peer-level
    element in both JATS and enscribe, not nested inside the
    theorem it proves.
shorthand_examples:
  - source: |
      <theorem | The sum of two even integers is even.>

      <proof>
      Let $a = 2m$ and $b = 2n$. Then $a + b = 2(m + n)$, which is
      even. $\square$
      </proof>
    ehtml: |
      <theorem>The sum of two even integers is even.</theorem>
      <proof>Let $a = 2m$ and $b = 2n$. Then $a + b = 2(m + n)$, which is even. $\square$</proof>
    notes: |
      The canonical pattern: <theorem> followed by sibling <proof>.
      The proof is NOT nested inside the theorem.
  - source: |
      <proof name="of Theorem 1.2">
      The argument follows from the preceding lemma.
      </proof>
    ehtml: '<proof data-name="of Theorem 1.2"><proof-label>Proof.</proof-label><p>The argument follows from the preceding lemma.</p></proof>'
    notes: |
      Optional `name` kwarg lets the proof identify what it proves
      (useful when the proof is separated from its theorem by
      intervening text).
interpreter_strategy: handler
handler_module: ./handlers/theorem.js
---

# `<proof>`

A proof — the argument establishing a theorem, lemma, or other propositional statement. A peer-level theorem-family element (not nested inside the statement it proves).

## Semantic intent

`<proof>` is the LaTeX/amsthm equivalent for the `proof` environment. In LaTeX amsthm, `\begin{proof}…\end{proof}` is independent of any theorem-like environment — it can follow any theorem-family element or stand alone. In JATS, `<statement content-type="proof">` is just another statement at the same level as the theorem. Enscribe follows this convention.

The element is block-level. Its content is the proof body — paragraphs, math, lists, intermediate justifications. The Phase-2 handler renders the leading "Proof." label and the trailing QED symbol; the body itself is not adorned in source.

## Peer, not child

`<proof>` is **not nested inside** `<theorem>`:

```
<theorem name="Pythagoras">…</theorem>

<proof>
By similar triangles…
</proof>
```

Not:

```
<theorem name="Pythagoras">
  …
  <proof>…</proof>           <-- WRONG
</theorem>
```

The peer pattern matches LaTeX and JATS; the parser does not enforce this convention (out-of-context placement renders the element correctly but is not the intended use).

## Numbering

`<proof>` is **not numbered by default**. A proof's identity comes from the theorem it proves, not from a counter; cross-references to a proof typically target the theorem, not the proof itself. An author who wants numbering can opt-in per instance with `+numbered`.

The optional `name` kwarg lets the proof identify what it proves (e.g. `<proof name="of Theorem 1.2">`), useful when the proof is separated from its theorem by intervening text. The Phase-2 handler renders the kwarg as "(of Theorem 1.2)" appended to the "Proof" label.

## JATS mapping

| enscribe | JATS |
|---|---|
| `<proof>` | `<statement content-type="proof">` |
| `name` kwarg | `<title>` inside `<statement>` |
| Body content | `<p>` paragraphs inside `<statement>` |
| Closing QED symbol | rendered by the export's stylesheet; not in source |

## See also

- [`<theorem>`](theorem.md) — anchor element; the typical predecessor.
- [`<lemma>`](lemma.md), [`<corollary>`](corollary.md), [`<proposition>`](proposition.md) — other theorem-family statements a proof may follow.
