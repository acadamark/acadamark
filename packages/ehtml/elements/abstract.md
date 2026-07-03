---
semantic_role: abstract
category: metadata
semantic_family: declarations-and-metadata
html_output:
  element: abstract
  is_html_native: false
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    type:
      maps_to: data-abstract-type
      values: [unstructured, structured, graphical, executive-summary, other]
      default: unstructured
      notes: |
        Distinguishes abstract types. Structured abstracts have explicit
        sub-section headings (Background, Methods, Results, Conclusion);
        unstructured abstracts are flowing prose.
    word-limit:
      maps_to: data-word-limit
      notes: |
        Optional documentation of the journal's word limit for this
        abstract. Informational only; does not enforce.
content:
  shape:
    contains: [block]
  becomes: children
  notes: |
    Abstract content. Single-paragraph or multi-paragraph. Structured
    abstracts may contain explicit sub-section elements.
jats_counterpart:
  element: abstract
  attributes:
    abstract-type: from type
shorthand_examples:
  - source: |
      <abstract |
      This paper presents new evidence that elephant populations
      significantly affect regional climate patterns through their
      role in shaping vegetation and carbon storage.
      >
    layer1_html: |
      <abstract>
        <p>This paper presents new evidence that elephant populations significantly affect regional climate patterns through their role in shaping vegetation and carbon storage.</p>
      </abstract>
    notes: |
      Unstructured abstract (the default). Single paragraph of summary prose.
  - source: |
      <abstract type=structured |
      **Background:** Elephant populations have declined significantly.

      **Methods:** We surveyed 50 forest sites over 10 years.

      **Results:** Decline correlates with vegetation loss.

      **Conclusion:** Conservation efforts are essential.
      >
    layer1_html: '<abstract data-abstract-type="structured"><p><b>Background:</b> Elephant populations have declined significantly.</p><p><b>Methods:</b> We surveyed 50 forest sites over 10 years.</p><p><b>Results:</b> Decline correlates with vegetation loss.</p><p><b>Conclusion:</b> Conservation efforts are essential.</p></abstract>'
    notes: |
      Structured abstract using markdown bold for section headings.
      Common in medical and scientific journals. The structure is
      visible in the rendered output via the bold prefixes.
  - source: |
      <abstract word-limit=250 |
      This paper presents...
      >
    layer1_html: |
      <abstract data-word-limit="250">
        <p>This paper presents…</p>
      </abstract>
interpreter_strategy: schema
---

# `<abstract>`

A summary of the document, typically appearing near the start of an article. Captures the main argument, methodology, findings, and significance in concise form.

## Semantic intent

`<abstract>` represents a document's abstract — the brief summary that helps readers decide whether to read the full work. The element appears inside `<meta>` (or directly in `<article-front>` for explicit authoring).

Abstracts vary in form across disciplines:

- **Unstructured abstracts** (default): flowing prose summarizing the work, common in humanities and many social sciences.
- **Structured abstracts**: explicit sub-sections (Background, Methods, Results, Conclusion), common in medical and biomedical literature.
- **Graphical abstracts**: visual summaries using figures and minimal text, common in some scientific journals.
- **Executive summaries**: longer abstracts for reports and policy documents.

The `type` kwarg distinguishes between these.

## Authoring

**Unstructured abstract (most common).**

```
<abstract |
This paper presents new evidence that elephant populations significantly
affect regional climate patterns through their role in shaping vegetation
and carbon storage. Using a 10-year field study in Tanzania, we document
that areas with declining elephant populations show measurable changes
in forest composition and reduced carbon sequestration.
>
```

Single paragraph or multi-paragraph prose. The default type.

**Structured abstract.**

```
<abstract type=structured |
**Background:** Elephant populations have declined significantly across Africa.

**Methods:** We surveyed 50 forest sites over 10 years using transect methods.

**Results:** Decline correlates with vegetation changes and reduced carbon storage.

**Conclusion:** Conservation efforts targeting elephant populations have climate co-benefits.
>
```

Section headings via markdown bold. The structure is visible in the rendered output. Common in medical journals and some scientific disciplines.

**Abstract with word limit annotation.**

```
<abstract word-limit=250 |
This paper presents...
>
```

The word limit is informational. Useful for authors writing toward a journal's specific limit; tooling could surface it for editorial workflow.

## Attributes

`type` indicates abstract style:

- `unstructured` — flowing prose (default).
- `structured` — explicit sub-section headings.
- `graphical` — visual summary; may contain figures.
- `executive-summary` — longer summary, common in reports.
- `other` — any other format.

`word-limit` is optional documentation of the target word count, typically set by journal style guides.

## JATS mapping

| enscribe | JATS |
|-----------|------|
| `<abstract>` | `<abstract>` |
| `type=structured` | `<abstract abstract-type="structured">` (with `<sec>` children for sub-sections) |
| `type=graphical` | `<abstract abstract-type="graphical">` |

For structured abstracts, the JATS exporter may convert markdown-bold sub-sections into explicit `<sec><title>...</title><p>...</p></sec>` structure if it can identify the pattern. Otherwise, the bold prefixes pass through as inline emphasis within paragraphs.

## Render-mode lowering

In render mode, `<abstract>` lowers to `<section class="abstract">` or remains as `<abstract>` (HTML5 doesn't have a native `<abstract>` element, but custom elements work in modern browsers).

## See also

- [`<meta>`](meta.md) — the metadata wrapper that typically contains the abstract.
- [`<article>`](article.md) — articles commonly include abstracts.
