---
semantic_role: dl
category: block-prose
semantic_family: formal-statements
html_output:
  element: dl
  is_html_native: true
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
content:
  shape:
    - element: dt
      required: false
      multiple: true
      contains: [inline]
    - element: dd
      required: false
      multiple: true
      contains: [inline, block]
  notes: |
    A definition list alternates <dt> (term) and <dd> (description)
    children. The spec declares both as multiple+optional because a
    well-formed <dl> may pair one term with several descriptions, or
    several terms with one shared description (HTML5 permits both
    patterns). Parser-level validation of the alternation / pairing
    is not performed (always-renders posture); the intended structure
    is documented here and demonstrated by fixtures.
jats_counterpart:
  element: def-list
  notes: |
    JATS uses <def-list> for definition lists, with <def-item> wrapping
    each term/definition pair: <def-list><def-item><term/><def/>
    </def-item>...</def-list>. Enscribe's <dl> follows HTML's flatter
    pattern (alternating <dt>/<dd> siblings); the JATS exporter groups
    adjacent <dt>/<dd> pairs into <def-item> wrappers at export.
shorthand_examples:
  - source: |
      <dl>
        <dt | enscribe>
        <dd | An academic publishing system built on HTML+CSS+JS.>
        <dt | Layer 1>
        <dd | The canonical semantic HTML vocabulary.>
        <dt | Layer 2>
        <dd | The shorthand authoring syntax that compiles to Layer 1.>
      </dl>
    ehtml: |
      <dl>
        <dt>enscribe</dt>
        <dd><p>An academic publishing system built on HTML+CSS+JS.</p></dd>
        <dt>Layer 1</dt>
        <dd><p>The canonical semantic HTML vocabulary.</p></dd>
        <dt>Layer 2</dt>
        <dd><p>The shorthand authoring syntax that compiles to Layer 1.</p></dd>
      </dl>
    notes: |
      Long-form <dl> with short-form <dt>/<dd> children. The natural
      authoring pattern.
  - source: |
      <dl .compact>
        <dt | term-1>
        <dd | First definition of term-1.>
        <dd | Second definition of term-1.>
      </dl>
    ehtml: |
      <dl class="compact">
        <dt>term-1</dt>
        <dd><p>First definition of term-1.</p></dd>
        <dd><p>Second definition of term-1.</p></dd>
      </dl>
    notes: |
      One term with multiple definitions — a valid HTML pattern.
interpreter_strategy: schema
---

# `<dl>`

A definition list. Pairs terms (`<dt>`) with their descriptions or definitions (`<dd>`). Used for glossary-like content, term-definition lists, key-value displays, dialogue-style attributions.

## Semantic intent

`<dl>` is HTML5's element for definition lists — a sequence of term/description pairs. The list is structured by alternating `<dt>` (term) and `<dd>` (definition) children. HTML5 also permits one term with several definitions, or several terms with one shared definition; the structure is more flexible than a strict 1:1 pairing.

For glossary-specific content with a heading and multiple cross-referenceable entries, prefer `<glossary>` (which uses `<glossary-entry>` children). Use `<dl>` for inline term/definition pairings that do not need glossary-level structure.

## Authoring

```
<dl>
  <dt | enscribe>
  <dd | An academic publishing system.>
  <dt | Layer 1>
  <dd | The canonical semantic HTML vocabulary.>
</dl>
```

The natural shape is alternating `<dt>` (term) and `<dd>` (definition) children inside a long-form `<dl>`.

## JATS mapping

| enscribe | JATS |
|---|---|
| `<dl>` | `<def-list>` |
| `<dt>` (within `<dl>`) | `<term>` (inside `<def-item>`) |
| `<dd>` (within `<dl>`) | `<def>` (inside `<def-item>`) |

JATS pairs each term with its definition in a `<def-item>` wrapper:

```xml
<def-list>
  <def-item>
    <term>enscribe</term>
    <def>An academic publishing system.</def>
  </def-item>
  ...
</def-list>
```

The JATS exporter groups adjacent `<dt>`/`<dd>` pairs from the enscribe source into `<def-item>` wrappers at export. Patterns with multiple `<dd>` for one `<dt>` (or vice versa) require a per-pattern export choice — recorded here as a JATS-export concern, not an authoring one.

## Render-mode lowering

`<dl>` is HTML-native; no lowering needed. The browser renders alternating term/definition pairs with standard description-list styling.

## See also

- [`<dt>`](dt.md) — term within a definition list.
- [`<dd>`](dd.md) — description within a definition list.
- [`<glossary>`](glossary.md) — for glossary-specific content with cross-referenceable entries.
- `<ul>` / `<ol>` — unordered / ordered lists, authored via the `<list>` shorthand (a Layer-2 construct with no element page of its own).
