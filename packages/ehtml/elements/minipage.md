---
semantic_role: minipage
category: frameables
semantic_family: exhibit
html_output:
  element: minipage
  is_html_native: false
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    title:
      handled_by: handler
      notes: |
        Optional title rendered at the top of the minipage (the frameable
        title-top convention). Authored as a title= kwarg. Because the body
        is opaque (a sealed sub-document), the kwarg stays a kwarg — it is not
        lifted to a <title> child tag the way it is for prose frameables; a
        <title> written inside the pipe would be part of the sealed body, not
        the box's outward title. Same opaque-frameable convention as
        <svg>/<table>/<csv>.
    caption:
      handled_by: handler
      notes: |
        Optional caption rendered at the bottom of the minipage (the frameable
        caption-bottom convention), with the "Minipage N." label folded in when
        numbered. Authored as a caption= kwarg (kwarg-only, for the same
        opaque-body reason as title).
  booleans:
    numbered:
      handled_by: handler
      default: true
      notes: |
        Whether this minipage is numbered. **On by default** (#272: floats are
        numbered by default; use -numbered for a layout-only box). A numbered
        minipage counts in its OWN "Minipage N" series (the `minipage` counter,
        config key number-minipages, ref-prefix `mp`) — NOT the figure counter.
        A sealed sub-document is distinct from a figure, and its private body
        numbering must not touch the document's figure sequence (#115).
    border:
      handled_by: handler
      default: true
      notes: |
        The frameable surface. **On by default for minipage** — the visual box
        is the point (a minipage sets its sealed content apart, like <frame>).
        Use -border to suppress the outline and keep only the seal. border=<name>
        selects a named look (accent / thick / dashed / subtle) and implies the
        border on (#58; see frameable.md).
content:
  becomes: sealed-subdocument
  notes: |
    The pipe content is the minipage's body — a SEALED sub-document. It is held
    opaque (the raw source string) at parse time, so the main pipeline never
    descends into it: the body's floats do not consume document counters, its
    labels never enter the document registry, and its footnotes do not bubble to
    the document. The body is processed in its OWN pipeline run with its OWN
    registry (the deferred phase), producing resolved Layer 1 that is spliced
    into the <figure> shell. Recursive content parsing applies INSIDE that
    sealed run, so the full enscribe vocabulary works in the body — including a
    nested <minipage>. External pulls (@src / <data>) are disallowed inside a
    minipage (a visible error, not a silent drop).
jats_counterpart:
  element: boxed-text
  attributes: {}
  notes: |
    JATS <boxed-text> is the closest counterpart — a generic boxed, set-apart
    content block — matching <frame>. A numbered minipage wraps in <fig> at
    export. The sealed body's resolved Layer 1 is the boxed-text content.
shorthand_examples:
  - source: '<minipage | Two panels side by side.>'
    ehtml: '<figure class="frameable-border"><p>Two panels side by side.</p><figcaption><span class="minipage-label">Minipage 1.</span></figcaption></figure>'
    notes: |
      The simplest case. The handler emits a <figure> wrapper (the vocab
      html_output.element `minipage` is only the lookup key for handler-strategy
      entries — the handler controls the actual element). +border is default on
      for <minipage>, so the class appears automatically. The body renders as
      sealed Layer 1.
  - source: |
      <minipage #mp:compare caption="Side-by-side comparison" |
      A figure here counts privately.

      <fig #fig:left src="left.png" | Left panel.>
      <fig #fig:right src="right.png" | Right panel.>
      >
    ehtml: '<figure class="frameable-border" id="mp:compare"><p>A figure here counts privately.</p><figure id="mp-compare-fig:left"><img alt="Left panel." src="left.png"><figcaption><span class="figure-label">Figure 1.</span><p>Left panel.</p></figcaption></figure><figure id="mp-compare-fig:right"><img alt="Right panel." src="right.png"><figcaption><span class="figure-label">Figure 2.</span><p>Right panel.</p></figcaption></figure><figcaption><span class="minipage-label">Minipage 1.</span> Side-by-side comparison</figcaption></figure>'
    notes: |
      Numbered by default (#272). It counts in its own
      "Minipage N" series — `<ref @mp:compare>` resolves to "minipage 1". The two
      inner figures number 1 and 2 in the minipage's PRIVATE figure counter, NOT
      the document's: a document <fig> elsewhere is unaffected, and an outside
      `<ref @fig:left>` is a normal not-found ref-error (the seal forbids inbound
      references to the body).
interpreter_strategy: handler
handler_module: ./handlers/minipage.js
handler_responsibilities:
  - Emit the <minipage> wrapper element (a custom element rendered as <figure>; not HTML-native).
  - Apply `frameable-border` class by default (border flag default true).
  - Render optional title at the top and optional caption (with "Minipage N." label prefix if numbered) at the bottom.
  - Splice the sealed body's resolved Layer 1 (produced by the deferred phase) as the figure body.
---

# `<minipage>`

A sealed, self-contained box holding recursively-processed content — enscribe's analogue of LaTeX's `minipage`. Outwardly it is an ordinary **frameable** (id, title, caption, numbering, optional border, the `<figure>` wrapper), so it is itself cross-referenceable like any float. Inwardly its content is a **sealed sub-document**: processed in its own pipeline run with its own registry.

## Semantic intent

`<minipage>` exists for content that should be set apart AND processed in isolation — side-by-side panels, a worked example with its own figures and footnotes, a self-contained callout whose internal numbering and references must not entangle with the surrounding document. The box is the outward face; the seal is the design.

## The seal

Everything a minipage does follows from "process the body as its own sealed sub-interpret" rather than inline:

- **Inbound references are forbidden.** The body's labels stay in the child registry and never enter the document registry, so an outside `<ref>` to a body label is a normal not-found ref-error.
- **Private internal numbering.** The body numbers in its own context — a `<fig>` inside a minipage does not advance the document figure counter; it counts in the minipage's private figure sequence.
- **Box-local footnotes.** A `<note>` inside the body is collected at the minipage's own boundary (the LaTeX bottom-of-minipage behavior), not hoisted to the document's notes.
- **Nesting.** A `<minipage>` inside a minipage just recurses within the deferred phase (bounded by a nesting-depth guard).

## Frameable membership

`<minipage>` is a frameable member. Like `<fig>`/`<svg>` it is **numbered by default** (#272), and like `<frame>`/`<aside>` it is **bordered by default**: **border default-true** (the box is the point) and **numbered default-true** (a layout-only box opts out with `-numbered`).

A numbered minipage counts in its OWN "Minipage N" series — the `minipage` counter and the `mp` ref-prefix — not the figure counter (a sealed sub-document is distinct from a figure, and must not consume document figure numbers). `<minipage #mp:setup>` makes `<ref @mp:setup>` resolve to "minipage N"; add `-numbered` for an unnumbered layout box.

## No external files

The body is sealed inline content with no outward pulls. `@src` / `<data>` (the embedded-asset mechanism — base64 stores or external image paths pulled via the asset store) is disallowed inside a minipage: it would be the one recursion vector through which a body could pull more source, and a minipage is meant to be self-contained. An `@src`/`<data>` inside a minipage renders a visible error, not a silent drop. (A plain `<fig src="path.png">` image is not an asset-store pull and is allowed.)

## Attributes

- `title` — optional title at the top of the box.
- `caption` — optional caption at the bottom (with "Minipage N." prefix when numbered).
- `+border` / `-border` — the frameable surface. **Default: on.**
- `border=<name>` — a named border look (`accent` / `thick` / `dashed` / `subtle`); implies the border on (#58).
- `+numbered` / `-numbered` — the frameable surface. **Default: on** (#272). Use `-numbered` for a layout-only box.

## JATS mapping

| enscribe | JATS |
|-----------|------|
| `<minipage>` | `<boxed-text>` |
| Numbered `<minipage>` | `<fig><boxed-text/><caption/></fig>` |

## See also

- [`<frame>`](frame.md) — a generic frameable box whose body renders **inline** (not sealed); use `<frame>` when the content should share the document's numbering and references, `<minipage>` when it must be isolated.
- [`<aside>`](aside.md) — tangential boxed prose (its own "Box N" series).
- [`<fig>`](fig.md) — image figures.
