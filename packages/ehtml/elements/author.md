---
semantic_role: author
category: structured-data-containers
semantic_family: declarations-and-metadata
html_output:
  element: author
  is_html_native: false
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    name:
      lifts_to_child: name
      notes: |
        The author's name. Authored as a kwarg, lifted at the
        normalize-to-canonical gate to a <name> child tag. Equivalent
        to authoring <name | ...> inside the <author>'s child-tag form.
    affiliation:
      lifts_to_child: affiliation
      notes: |
        Author's institutional affiliation. Lifts to <affiliation>.
    orcid:
      lifts_to_child: orcid
      notes: |
        Author's ORCID identifier (e.g., 0000-0000-0000-0000). Lifts
        to <orcid>.
    email:
      lifts_to_child: email
      notes: |
        Author's contact email address. Lifts to <email>.
    corresponding:
      maps_to: corresponding
      values: ['true', 'false']
      notes: |
        Marks this author as the corresponding author (JATS
        contrib corresp="yes"). A scalar marker — stays as a kwarg/
        attribute on the canonical Layer 1 <author>; never lifted to
        a child tag. Both surface forms are accepted: +corresponding
        (boolean shorthand) and corresponding=true (explicit kwarg)
        both normalize to a `corresponding="true"` attribute on the
        canonical Layer 1 node. The structured-element gate promotes
        the +form into the kwarg surface so the schema renderer's
        attribute mapping fires uniformly.
content:
  shape:
    - element: name
      required: false
      contains: [inline]
    - element: affiliation
      required: false
      multiple: true
    - element: orcid
      required: false
    - element: email
      required: false
      multiple: true
  notes: |
    <author> is a structured-data-container tag (parallel to <meta>;
    see DESIGN.md §"Structured-data-container tags"). It accepts two
    equivalent authoring forms: kwargs (scalar fields) and child tags
    (structured fields). The normalize-to-canonical gate lifts the
    kwarg form to the canonical child-tag form per the spec in
    @enscribejs/enscribe/core/structured-elements.js. The Layer 1 canonical
    shape carries child tags plus the +corresponding boolean kwarg.

    An unrecognized child tag inside <author> produces an informative
    diagnostic (warn, not error — the always-renders pattern).
jats_counterpart:
  element: 'contrib contrib-type="author"'
  notes: |
    JATS uses <contrib contrib-type="author"> for authors. The structural
    JATS form uses <name><given-names>...</given-names><surname>...</surname></name>
    inside <contrib>. Enscribe's <name> is a single unparsed string
    matching JATS's <string-name>; the exporter elects to emit
    <string-name> verbatim or decompose it into <surname>/<given-names>
    per the target schema's requirements. <affiliation>, <orcid>,
    <email> map to JATS <aff>, <contrib-id contrib-id-type="orcid">,
    and <email> respectively. +corresponding becomes corresp="yes" on
    the <contrib> element.
shorthand_examples:
  - source: '<author | Jane Goodall>'
    ehtml: |
      <author>Jane Goodall</author>
    notes: |
      Backward-compatible casual form (carried forward from before the
      structured-interface reconciliation). The pipe content sits as
      text content of <author>; it is NOT lifted to a <name> child —
      authors who want the structured shape use the kwarg form below
      or the child-tag form. JATS export reads the name string either
      way.
  - source: '<author name="Jane Goodall" orcid="0000-0001-2345-6789" affiliation="Cambridge University" +corresponding />'
    ehtml: '<author corresponding><name>Jane Goodall</name><orcid>0000-0001-2345-6789</orcid><affiliation>Cambridge University</affiliation></author>'
    notes: |
      Kwarg form. Each lifted kwarg becomes a child tag at the gate;
      +corresponding stays as a boolean kwarg on the canonical
      Layer 1 <author>.
  - source: |
      <author +corresponding>
        <name | Jane Goodall>
        <affiliation | Cambridge University>
        <orcid | 0000-0001-2345-6789>
        <email | jane@example.com>
      </author>
    ehtml: '<author corresponding><name>Jane Goodall</name><affiliation>Cambridge University</affiliation><orcid>0000-0001-2345-6789</orcid><email><a href="mailto:jane@example.com">jane@example.com</a></email></author>'
    notes: |
      Child-tag form. The canonical Layer 1 shape. Both this form and
      the equivalent kwarg form above produce the same Layer 1 output.
  - source: |
      <meta>
        <author | Jane Goodall>
        <author | David Attenborough>
        <author +corresponding | Charles Darwin>
      </meta>
    ehtml: '<meta><author>Jane Goodall</author><author>David Attenborough</author><author corresponding>Charles Darwin</author></meta>'
    notes: |
      Multiple authors are sibling <author> elements inside <meta>.
      The third is the corresponding author. JATS export groups them
      as <contrib-group>.
interpreter_strategy: schema
---

# `<author>`

A document author. `<author>` is a structured-data-container tag — it accepts both a kwarg form and a child-tag form, both reducing to the same Layer 1 child-tag shape.

## Semantic intent

`<author>` represents one author of a document. Multiple authors are sibling elements; their order reflects authorship order (first author first, etc.).

The element is the canonical home for structured author metadata: the author's name, institutional affiliation, ORCID identifier, contact email, and the corresponding-author marker. Both casual and rigorous authoring are supported:

- **Casual:** a single pipe content (`<author | Jane Goodall>`) is the author's name.
- **Rigorous:** explicit child tags (`<name>`, `<affiliation>`, `<orcid>`, `<email>`) for scholarly-publishing metadata.
- **Kwarg shorthand:** the same structured fields authored as kwargs (`<author name="…" orcid="…">`) — the gate lifts these to child tags.

## Why structured

`<author>` was previously documented as a flat element (the author's name as the only content, with scholarly metadata deferred to the JATS export boundary). That stance was superseded — structured author data is a Layer 1 obligation the alpha release ships, not a JATS-export concession. The shared structured-element infrastructure (see `DESIGN.md` §"Structured-data-container tags" and the `@enscribejs/enscribe/core/structured-elements.js` registry) gives `<author>` the same kwarg/child-tag duality `<meta>` has.

## Authoring patterns

**Simplest form (backward-compatible).**

```
<author | Jane Goodall>
```

The pipe content sits as text content of `<author>`. This is the casual form carried forward from before the structured-interface reconciliation; the value is NOT lifted to a `<name>` child. Authors who want the structured shape use the kwarg form or the child-tag form below. JATS export reads the name string either way.

**Kwarg form (self-closing).**

```
<author name="Jane Goodall" orcid="0000-0001-2345-6789" affiliation="Cambridge University" +corresponding />
```

Each lifted kwarg becomes a child tag at the gate. `+corresponding` is a boolean kwarg — a scalar marker — and stays as a kwarg on the canonical Layer 1 `<author>` (it is not lifted to a child tag).

**The self-closing `/>` is required for the kwarg form.** `<author>` is long-form-eligible (so the child-tag form below parses), which means the parser otherwise treats `<author …>` (no pipe, no `/`) as a long-form opener and scans forward for `</author>`. `/>` disambiguates — same constraint `<table />` follows for the same reason. Authors who prefer to be explicit can use `<author kwargs></author>` (long-form with empty body) as an alternative.

**Child-tag form (the canonical Layer 1 shape).**

```
<author +corresponding>
  <name | Jane Goodall>
  <affiliation | Cambridge University>
  <orcid | 0000-0001-2345-6789>
  <email | jane@example.com>
</author>
```

The most explicit form. Useful when:

- A name is non-Western (the structured child carries the unparsed name string regardless of conventions).
- An author has multiple affiliations (`<affiliation>` accepts multiple siblings).
- An author has multiple email addresses (same).
- The structured form is preferred for downstream tooling (JATS export benefits from explicit structure).

## Multiple authors

Multiple authors are sibling `<author>` elements inside `<meta>`. No explicit grouping required:

```
<meta>
  <author | Jane Goodall>
  <author | David Attenborough>
  <author +corresponding | Charles Darwin>
</meta>
```

The JATS exporter wraps siblings in `<contrib-group>` automatically.

## Corresponding author

Mark the corresponding author with the `+corresponding` boolean kwarg:

```
<author +corresponding | Jane Goodall>
```

Or, equivalently in any other form (kwarg form, child-tag form). JATS export uses `corresp="yes"` on the contrib element. Tooling that needs to identify the corresponding author finds this attribute.

## The kwarg → child-tag lift

The normalize-to-canonical gate lifts the kwarg form to the child-tag form per the per-tag spec recorded in `@enscribejs/enscribe/core/structured-elements.js`. The lift fires whenever an `<author>` has a kwarg whose key is in the lifted set (`name`, `affiliation`, `orcid`, `email`). The kwarg value becomes the lifted child tag's text content.

`+corresponding` is in the boolean-kwargs set — it always stays as a kwarg on the canonical node, never as a child tag.

An unrecognized `<author>` kwarg produces an informative diagnostic and is dropped.

## Unknown children

`<author>` validates its children against the allowlist (`name`, `affiliation`, `orcid`, `email`). An unrecognized child tag produces an informative diagnostic (warn, not error — the always-renders pattern). The unrecognized child still renders, the author sees the diagnostic in the build output.

## Child elements

The accepted children of `<author>`:

- [`<name>`](name.md) — the author's name (typically a single string).
- [`<affiliation>`](affiliation.md) — institutional affiliation.
- [`<orcid>`](orcid.md) — ORCID identifier.
- [`<email>`](email.md) — contact email address.

## JATS mapping

| enscribe | JATS |
|---|---|
| `<author>` | `<contrib contrib-type="author">` |
| `<name>` child | `<string-name>` (or decomposed `<name><given-names>…</given-names><surname>…</surname></name>` per target schema) |
| `<affiliation>` child | `<aff>` |
| `<orcid>` child | `<contrib-id contrib-id-type="orcid">` |
| `<email>` child | `<email>` |
| `+corresponding` kwarg | `corresp="yes"` attribute on `<contrib>` |

## Render-mode lowering

In render mode, `<author>` lowers to a `<span class="author">` or similar. The visible rendering shows the author name with affiliation and contact info as appropriate for the document type.

## See also

- [`<editor>`](editor.md) — for book editors (different role).
- [`<meta>`](meta.md) — the metadata wrapper that holds authors.
- [`<name>`](name.md), [`<affiliation>`](affiliation.md), [`<orcid>`](orcid.md), [`<email>`](email.md) — `<author>`'s child elements.
- `DESIGN.md` §"Structured-data-container tags" — the design baseline.
