---
semantic_role: glossary-entry
category: block-prose
html_output:
  element: glossary-entry
  is_html_native: false
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
content:
  type: structured
  shape:
    - element: dt
      required: false
      contains: [inline]
    - element: dd
      required: false
      multiple: true
      contains: [inline, block]
  notes: |
    A single glossary entry holds one term and its definition, reusing
    the <dt>/<dd> child shapes of <dl>. Multiple <dd> children are
    permitted for one term (HTML5 pattern); a missing <dt> or <dd> is
    not enforced at parser time (always-renders posture).
content_handler: default
jats_counterpart:
  element: def-item
  notes: |
    JATS uses <def-item> inside <glossary> (or inside <def-list>) to
    wrap a term/definition pair. Enscribe's <glossary-entry> maps
    directly to JATS <def-item> — the envelope around the <term>/<def>
    pair. (JATS does not have a separate "glossary-entry" name; the
    pairing structure is provided by <def-item>.)
shorthand_examples:
  - source: |
      <glossary-entry #term:enscribe>
        <dt | enscribe>
        <dd | An academic publishing system built on HTML+CSS+JS.>
      </glossary-entry>
    layer1_html: |
      <glossary-entry id="term:enscribe">
        <dt>enscribe</dt>
        <dd>An academic publishing system built on HTML+CSS+JS.</dd>
      </glossary-entry>
    notes: |
      A single glossary entry. The id uses the "term:" colon-prefix
      convention so cross-references like <ref @term:enscribe> can
      resolve into the entry.
interpreter_strategy: schema
---

# `<glossary-entry>`

A single entry within a `<glossary>`. Holds one term (`<dt>`) and one or more definitions (`<dd>`).

## Semantic intent

`<glossary-entry>` is the envelope around a glossary term and its definition. Each entry is individually identifiable (typically via an `id` using the `term:` colon-prefix convention) so cross-references can resolve directly into a glossary entry.

The element is a structural-context child element: it only makes sense inside `<glossary>`. The vocabulary does not enforce this — out-of-context placement renders the element correctly but is not the intended use.

## Authoring

```
<glossary>
  <glossary-entry #term:enscribe>
    <dt | enscribe>
    <dd | An academic publishing system.>
  </glossary-entry>
</glossary>
```

The `<dt>` carries the term; the `<dd>` carries the definition. Multiple `<dd>` children are valid for one term.

## Cross-referencing

The `term:` id-prefix convention (consistent with `fig:` / `eqn:` / `sec:` elsewhere in enscribe) makes glossary entries cross-referenceable from prose:

```
A <ref @term:enscribe> document is HTML directly.
```

resolves the reference into the glossary entry with `id="term:enscribe"`.

## JATS mapping

| enscribe | JATS |
|---|---|
| `<glossary-entry>` | `<def-item>` (inside `<glossary>`) |
| Its `<dt>` child | `<term>` (inside `<def-item>`) |
| Its `<dd>` child | `<def>` (inside `<def-item>`) |

JATS does not have a separate `glossary-entry` element name — the pairing structure is provided by `<def-item>`. Enscribe's named envelope is a convenience for authoring and for cross-reference resolution.

## Render-mode lowering

`<glossary-entry>` is custom; CSS targets it directly. In render mode the element may lower to a `<div class="glossary-entry">` for broader compatibility.

## See also

- [`<glossary>`](glossary.md) — the parent container.
- [`<dt>`](dt.md), [`<dd>`](dd.md) — the term and description children.
- [`<dl>`](dl.md) — for definition-list pairings without the glossary envelope.
