---
semantic_role: name
html_output:
  element: name
  is_html_native: false
  default_attributes: {}
acadamark_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
content:
  type: prose
  becomes: children
  notes: |
    The author's name as a single string (e.g. "Jane Goodall"). No
    surname/given-name decomposition at Layer 1 — the value passes
    through verbatim. The JATS exporter is the boundary that splits
    a Western-style name into <surname>/<given-names> if required by
    the target JATS schema; cultures with non-Western name ordering
    (surname-first, mononym) are preserved as-is at Layer 1 and
    treated specially at export.
content_handler: default
jats_counterpart:
  element: string-name
  notes: |
    JATS uses <string-name> inside <name> as the "unparsed name"
    form — the full name string when the document does not commit to
    a surname/given-names split. JATS's structured <name> wraps
    <surname>/<given-names>; <string-name> is the unparsed sibling.
    Acadamark's <name> matches <string-name> directly because Layer 1
    preserves the author-written form without imposing a name-model.
    The exporter chooses between emitting <string-name> verbatim or
    parsing it into <surname>/<given-names> per the target schema's
    requirements.
shorthand_examples:
  - source: |
      <author>
        <name | Jane Goodall>
      </author>
    layer1_html: |
      <author>
        <name>Jane Goodall</name>
      </author>
    notes: |
      The common case. Pipe content becomes the name string.
  - source: '<author name="Jane Goodall" orcid="0000-0001-2345-6789" +corresponding>'
    layer1_html: |
      <author corresponding>
        <name>Jane Goodall</name>
        <orcid>0000-0001-2345-6789</orcid>
      </author>
    notes: |
      Kwarg form of <author>. The `name` kwarg lifts to a <name> child
      tag at the normalize-to-canonical gate, parallel to <meta>'s
      kwarg-to-child-tag lift. The `+corresponding` boolean stays as
      a kwarg/attribute on the canonical Layer 1 <author> (it is a
      scalar marker, not a structured field).
interpreter_strategy: schema
---

# `<name>`

The author's name. A sub-element of `<author>` carrying the name as a scalar value.

## Semantic intent

`<name>` records an author's name as a single string. Layer 1 does not impose a name model — surname-first, given-name-first, mononyms, and culturally-specific orderings all pass through verbatim. Whether to decompose a name into structured surname/given-names parts is a JATS-export decision, not an authoring-time one.

The element sits inside `<author>` as one of the rich-author-metadata sub-elements (parallel to `<affiliation>`, `<orcid>`, `<email>`).

## Authoring

**Inside `<author>`'s child-tag form.**

```
<author>
  <name | Jane Goodall>
  <affiliation | Cambridge University>
  <orcid | 0000-0001-2345-6789>
</author>
```

**Via the `name` kwarg on `<author>`.**

```
<author name="Jane Goodall" orcid="0000-0001-2345-6789">
```

The `name` kwarg lifts to a `<name>` child tag at the normalize-to-canonical gate. The two forms produce the same Layer 1 shape. See [`<author>`](author.md) for the full kwarg/child-tag duality.

## Why not split surname/given-names at Layer 1

JATS's structured `<name>` wraps `<surname>` and `<given-names>`. Acadamark deliberately keeps the name string undivided at Layer 1 because:

- Many name traditions do not fit a Western surname/given-name split.
- Authors typing `<name | Jane Goodall>` are providing a name, not committing to a name-model.
- The JATS exporter is the right place to apply schema-specific decomposition — it knows the target schema, and the cost of an export-time heuristic is bounded.

JATS's `<string-name>` element exists for exactly this case (the unparsed name string) and is the direct counterpart at export.

## JATS mapping

| acadamark | JATS |
|---|---|
| `<name>Jane Goodall</name>` | `<string-name>Jane Goodall</string-name>` inside `<contrib>` |

If the export pipeline elects to decompose, the JATS output uses `<name><surname>…</surname><given-names>…</given-names></name>` instead. The choice is per-pipeline configuration; the Layer 1 input is the same in either case.

## Render-mode lowering

In render mode, `<name>` typically displays inline within the author block.

## See also

- [`<author>`](author.md) — the parent element.
- [`<affiliation>`](affiliation.md), [`<orcid>`](orcid.md), [`<email>`](email.md) — sibling rich-author-metadata elements.
