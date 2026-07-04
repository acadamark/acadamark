---
semantic_role: diagram
category: frameables
semantic_family: exhibit
html_output:
  element: diagram
  is_html_native: false
  default_attributes: {}
  notes: |
    `html_output.element` here is the vocabulary lookup key (must match
    the tagname). Under `interpreter_strategy: handler` the schema field
    is not consulted — the handler emits the wrapper element shape
    directly (a `<pre class="<engine>" data-enscribe-dsl="<engine>">…</pre>`).
interpreter_strategy: handler
handler_module: ./handlers/diagram.js
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  positional:
    - name: engine
      values: [mermaid, abc]
      notes: |
        The diagram engine — the language that renders the body. The
        leading format word selects which external renderer interprets the
        source (`<diagram mermaid | …>`, `<diagram abc | …>`). A new engine
        (D2, Graphviz, PlantUML, …) is a new format word admitted by the
        diagram host's accept-set, not a new vocabulary element. See
        `format-words.md` and `DESIGN.md` §"The two axes: host and language".
  kwargs:
    caption:
      handled_by: handler
      notes: |
        Optional caption text. When present the handler emits a
        `<figcaption>` sibling after the rendered diagram (the external-DSL
        sibling-caption layout). When the diagram participates in figure
        numbering the caption carries a "Figure N." label prefix.
    src:
      notes: |
        An @id reference (#313 consumer wiring) that pulls a stored <dataset>
        declared in <data> and feeds its opaque bytes as the diagram's engine
        source — e.g. <diagram mermaid src="@flow"> renders the
        <dataset #flow mermaid>…</dataset> as a Mermaid diagram. The bytes travel
        straight from the store into the wrapper, verbatim (the engine renders
        them at view time; enscribe never re-interprets them). Because enscribe
        cannot re-read the source, the dataset's format hint is the only guard: a
        hint that disagrees with the named engine (e.g. a csv dataset fed into a
        mermaid diagram) is a visible asset-error, not a silently-broken render.
        An unresolved id — or a wrong-kind id (an image or external asset, not a
        <dataset>) — is a visible asset-error too (never a silently-empty diagram).
        Inline source (<diagram engine | …> / <diagram engine>…</diagram>) is
        unaffected. A file-path src is not read here (the diagram handler reads no
        files); source a <dataset> instead. Note: because the engine source is
        opaque bytes with no </dataset> terminator in pipe form, a dataset whose
        source contains `>` (Mermaid's `-->`) must be authored in the long form
        <dataset mermaid>…</dataset> — see notes/specs/data-store.md.
content:
  notes: |
    Author writes the engine's diagram source verbatim. Enscribe preserves
    the content unmodified inside the wrapper element; the engine's library
    (loaded from CDN at view time, or run at build time) parses the source.
jats_counterpart:
  element: '(no direct JATS counterpart; exported as <fig specific-use="enscribe-dsl-<engine>"> with the verbatim source in <preformat preformat-type="<engine>-source">)'
  notes: |
    JATS has no diagram-source counterpart. The JATS exporter emits a
    `<fig>` carrying an `<alt-text>` and the verbatim source in a
    `<preformat>` element; a downstream pre-render pass may replace it with
    the rendered `<graphic>`. The engine is read from the format-word
    positional.
shorthand_examples:
  - source: |
      <diagram mermaid>
      graph LR
        A[Start] --> B{Decision}
        B -->|yes| C[OK]
        B -->|no| D[Stop]
      </diagram>
    ehtml: |
      <pre class="mermaid" data-enscribe-dsl="mermaid">graph LR
        A[Start] --> B{Decision}
        B -->|yes| C[OK]
        B -->|no| D[Stop]</pre>
    notes: |
      The `mermaid` format word selects the Mermaid engine. The handler
      emits the same `<pre class="mermaid" data-enscribe-dsl="mermaid">`
      contract as the legacy `<mermaid>` shorthand expands to.
  - source: |
      <diagram abc>
      X:1
      T:Scale
      K:C
      CDEFGABc
      </diagram>
    ehtml: |
      <pre class="abc" data-enscribe-dsl="abc">X:1
      T:Scale
      K:C
      CDEFGABc</pre>
    notes: |
      The `abc` format word selects the abcjs engine.
handler_responsibilities:
  - Read the format-word positional as the engine (`mermaid`, `abc`).
  - Read the opaque content as the engine's diagram source.
  - Emit a `<pre class="<engine>" data-enscribe-dsl="<engine>">…</pre>`
    wrapper preserving the source verbatim (delegating to the per-engine
    render path).
  - Apply id / classes from the node; honor the optional `caption` kwarg.
---

# `<diagram>`

A diagram block. The leading format word names the **engine** (the language) that renders the body: `<diagram mermaid | … >`, `<diagram abc | … >`. External DSL — the source is preserved as marked markup; rendering happens external to enscribe.

## Semantic intent

`<diagram>` is the single host for external diagram engines. The engine is the format word (the language axis); the host carries the figure role — counter, caption, frameable membership, cross-reference type. Adding an engine (D2, Graphviz, PlantUML, …) is a new format word admitted by the host's accept-set, not a new vocabulary element. See `DESIGN.md` §"The two axes: host and language" for the architecture and `notes/specs/format-words.md` for the subsystem mechanics.

The legacy `<mermaid>` / `<abc>` tags are kept as **loadable shorthands** that expand at the gate to `<diagram mermaid>` / `<diagram abc>`, so existing documents render unchanged.

## Authoring

```
<diagram mermaid>
graph LR
  A[Start] --> B{Decision}
  B -->|yes| C[OK]
  B -->|no| D[Stop]
</diagram>
```

The content is the engine's source, preserved verbatim — enscribe doesn't parse it.

## Attributes

`engine` (positional) — the diagram engine: `mermaid`, `abc`.
`id` — cross-reference target; preserved on the rendered wrapper.
`class` — author-supplied classes; added to the wrapper alongside the engine class.
`caption` — optional caption text; rendered as a sibling `<figcaption>`.

## See also

- `DESIGN.md` §"The two axes: host and language" — the architecture.
- `notes/specs/format-words.md` — the format-word subsystem.
- [`<fig>`](fig.md) — the figure frameable.
