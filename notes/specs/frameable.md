# Frameable elements

A small, named set of Layer 1 elements share one capability: they sit
**out of the text flow as a self-contained block**, and may carry an
optional **title** (top), an optional **caption** (bottom), and an
optional **border**. This is the semantic role HTML gives `<figure>` —
generalized across several distinct elements. We call the capability
**frameable**.

This spec is the buildable definition of that capability: its members,
its shared surface, the per-member defaults, and the JATS mapping. The
*rationale* — why frameable is a shared capability rather than an
umbrella `<figure>` element, and what it supersedes — lives in
`DESIGN.md` §"Frameable elements: a shared capability" and is not
repeated here. Parts of this capability ship today; the redesign deltas
this spec introduces (notably promoting `<aside>` into the class and
folding callouts/admonitions into it) are tracked in
[GitHub issue #31](https://github.com/enscribejs/enscribe/issues/31).
Whether any given part is built is a STATUS / Issues question.

## The capability

Frameable is a capability **shared by several distinct elements**, not an
umbrella element that wraps them. A figure is a `<figure>`; a table is a
`<table>`; a callout is an `<aside>`. Each is a first-class element that
*also* possesses the frameable capability — the same attribute surface
and the same rendering behavior — because the capability is shared.
Authoring a frameable construct does not nest an inner content element
inside an outer wrapper; the frameable element *is* the construct.

The figure member's canonical Layer 1 element is the HTML-native
`<figure>` (figures are HTML-shaped, #147). The name `<fig>` still
appears below in two roles: the **JATS export target** (the JATS-mapping
table) and the interpreter's **tagname-keyed mechanisms** (the shared
`figure` counter membership and handler routing), where the internal
dispatch name remains `fig`; `<fig>` is also an accepted authoring alias
for `<figure>`.

Numbering ("Fig. 3", "Table 2") is **folded into the caption/title
rendering** — it is not a separate authored field. A numbered frameable
gets its label prepended to the caption ("Figure 1. …"); an unnumbered
one does not.

## The shared surface

Every frameable element carries the identical attribute set:

- **`id`** — cross-reference target. Optional; always carried through.
  A `<ref @id>` elsewhere resolves to the element's number (or, for an
  unnumbered target, its label tail).
- **`title`** — optional title rendered at the top of the element.
- **`caption`** — optional caption rendered at the foot of the element,
  with the number-and-label prefix folded in when numbered.
- **`border`** — optional outline box. `+border` / `-border` (or
  `border=true|false`) toggle it; the render convention is the
  `frameable-border` class, which theme stylesheets draw.
  `border=<name>` additionally selects a **named look** (and implies the border
  on): the look is emitted as a `frameable-border-<name>` modifier class
  alongside the base class — the document names the look, the theme defines how
  it renders (#58). The default theme ships a starter menu — `accent`, `thick`,
  `dashed`, `subtle` — and the mechanism is open: any token name passes through
  as a class a theme can target (the same way `type` values pass through to
  `data-*`). A non-token value (e.g. an attempted raw-CSS string,
  `border="2px dashed red"`) is ignored — the raw-CSS escape hatch is out of
  scope. (See per-member defaults below for which way `border` defaults; on the
  float members a named look applies to the framed form, as `+border` does.)
- **`numbered`** — opt-in/opt-out boolean. `+numbered` / `-numbered`
  (or `numbered=true|false`). Per-member default below.

### Caption and title are content, not strings

A caption may contain rich content — a citation, math, emphasis — so it
is **content, not an attribute value** (per `DESIGN.md`'s "content gets
parsed; arguments don't" direction). The authoring surface offers two
equivalent forms that produce identical output:

- the explicit child tag: `<caption | adapted from <cite Mantzalas2022>>`
- the compact kwarg: `caption="…"`, which is **lifted** to the
  `<caption>` child at the normalize-to-canonical gate (the same
  kwarg-to-child-tag lift `<meta>` / `<author>` use).

Both forms are accepted permanently; neither is deprecated. `title`
follows the same two-form pattern.

## Members

The class has two natures.

**Content floats** — a captioned, numbered object set apart from the main
argument (the traditional "figure", "table", "listing"):

| Element | Body content | JATS counterpart |
|---|---|---|
| `<fig>` | image (from `src`) or arbitrary captioned content | `<fig>` |
| `<table>` | tabular data (csv/tsv/json/yaml/md) | `<table-wrap>` |
| `<code>` / `<code-block>` (future member — see note below) | code source | `<monospace>` (inline) / `<preformat><code>` (block) |
| `<svg>` | inline SVG | `<graphic>` |
| `<mermaid>`, `<abc>`, and other DSL-registry block elements | DSL source | `<fig>` / `<graphic>` |
| `<csv>`, `<tsv>` (standalone) | delimited data → table | `<table-wrap>` |

**`<code>` / `<code-block>` is a future frameable member, not a built one.**
Today it renders as a plain code element — `<code>` (inline) or `<pre><code>`
(block), carrying only `id`, language, and classes — via `codeHandler` /
`codeBlockHandler`, which do **not** call `renderFrameable` and accept no
`title` / `caption` / `border`. The full frameable surface for code (a title, a
caption, a border) *and* its numbered "Listing N." (a `listing` counter,
cross-referenceable) are **future work** — the runnable-/numbered-listing design
that also resolves #158's numbering question. The code handler registers code
`numbered: false`, so `<ref @code:...>` resolves by label, not a number;
`interpreter.md` §3.7 records the exact change that would turn numbering on. Code
is listed here because it is the frameable family's natural next member, not
because the surface ships today.

**Boxed prose** — set-apart block content that is *not* a numbered float
by nature (the "callout", "sidebar", "methodology box"):

| Element | Body content | JATS counterpart |
|---|---|---|
| `<aside>` | prose; tangential content (notes, sidebars, callouts, warnings, tips) | `<boxed-text content-type="…">` |
| `<frame>` | **anything** — prose, a list, a wrapped element; the author decides | `<boxed-text>` |

`<aside>` carries a semantic claim ("this content is tangential to the
main argument" — it is HTML-native and matches HTML5's `<aside>`).
`<frame>` carries **no** semantic claim — it is the generic "draw a box
around this" container, and its content is deliberately unrestricted (a
framed list, a framed pair of paragraphs, a framed anything). When a
non-frameable element needs a box or a caption, wrap it in a `<frame>`
(see "What is not frameable" below).

## Per-member defaults

`border` and `numbered` default differently by nature. Both are always
overridable.

| Nature | Members | `border` default | `numbered` default |
|---|---|---|---|
| Content float | `<fig>`, `<svg>`, `<mermaid>`, `<abc>`, DSL blocks | **off** | **on** |
| Content float | `<table>`, `<csv>`, `<tsv>` | off | on |
| Future member (surface unbuilt) | `<code>` / `<code-block>` | — | — *(no frameable surface or numbering today; both are future work)* |
| Boxed float | `<frame>`, `<minipage>` | **on** | **on** |
| Boxed prose | `<aside>` | **on** | **off** |

The rule (#272): **numbered by default is now universal across the
frameables** — a content float wants a number, and a boxed float (`<frame>`,
`<minipage>`) is numbered too so authors don't have to remember a per-member
exception. The lone hold-out is `<aside>`: boxed prose is, by convention, a
one-off callout that needs no cross-reference number, so it stays
unnumbered-by-default. Any member's number is switchable: `-numbered` on a
float/box that should not count, `+numbered` on an `<aside>` that should.
Border defaults split the other way: floats start unframed and switch a
border *on* when wanted; boxes are framed by default.

Numbered frameables share the **`figure`** counter by default
(`<fig>`/`<svg>`/`<mermaid>`/`<abc>`/`<frame>`), except `<table>`/`<csv>`/`<tsv>`
(the `table` counter) and `<minipage>` (its own `minipage` counter, so a sealed
sub-document never consumes document figure numbers — see `minipage.md`).

`<code>` / `<code-block>` is **not numbered today** (registered
`numbered: false`), so it has no counter — the `listing` counter that would
number code alongside figures and tables is anticipated but unbuilt.
`interpreter.md` §3.7 records the exact change that would turn it on (add `code`
to `NUMBERED_TAGNAMES`, flip `numbered: false`, add a config key). Until then,
`<code>` renders as a plain code element with **no** frameable surface — the
title / caption / border surface is future work too, not only the number.

## What is not frameable (and the escape hatch)

These block elements are deliberately **outside** the frameable class:

- **`<blockquote>`** — quoted content. It is semantically distinct
  (attributed speech, not a set-apart object), and maps to JATS
  `<disp-quote>`, not `<boxed-text>`. It is not frameable.
- **Numbered math** — `<display-math>` and the math environments
  (`<matrix>`, `<cases>`, `<align>`, `<eqnarray>`, long-form `<math>`).
  These are their own numbered family (`equation` counter,
  `<disp-formula>`); their "caption" is the equation number rendered
  beside the formula, which is not the frameable title/caption surface.
- **The theorem family** — `<theorem>`, `<lemma>`, `<definition>`,
  `<proof>`, and siblings. These are their own numbered family
  (`<statement>`); the whole element *is* its label ("Theorem 3.2
  (Pythagoras)"), a different convention from a title-plus-caption float.

**The escape hatch:** any of these can be *placed inside a `<frame>`*
when an author wants a border, a title, or a caption around it. The
frame supplies the frameable surface; the inner element keeps its own
semantics and numbering. This is exactly what the generic `<frame>` is
for, and it keeps the frameable class small and principled instead of
absorbing every block element that might occasionally want a box.

## Callouts and admonitions

There is **no separate callout or admonition element**. A callout is an
`<aside>` with a `type`:

```
<aside type=warning | Don't run this on production data.>
<aside type=tip | Use a fixed random seed for reproducibility.>
```

The `type` taxonomy (`note`, `sidebar`, `callout`, `warning`, `tip`,
`info`, `caution`) drives both the visual treatment (theme stylesheets
target `aside[data-aside-type="warning"]`) and the JATS
`content-type`. Promoting `<aside>` into the frameable class is what
gives these callouts an optional title and border; the admonition
"vocabulary" is therefore styling and the `type` enumeration, not a new
element. (This subsumes [issue #30](https://github.com/enscribejs/enscribe/issues/30).)

The styling carries one accessibility contract that is *what*, not *how*:
a callout type is signalled by **three independent cues — an accent
color, a type icon, and the title text — so color is never the only
distinguisher** (the variants stay legible for color-blind readers and
in monochrome print). The type icon is delivered through CSS
(`::before`), not markup, so the rendered HTML stays a clean semantic
tree and the icon does not enter the accessibility tree or the JATS
export. *Which* colors and glyphs a theme uses is the theme's business;
the default theme defines them as `--enscribe-callout-*` custom
properties an alternate theme can override.

`<frame type=…>` exists alongside as the *non-semantic* box — same
visual outcome, but making no claim that the content is tangential.

## JATS mapping

| enscribe | JATS |
|---|---|
| `<fig>` | `<fig>` (with `<graphic>` when `src` is present) |
| `<table>` / `<csv>` / `<tsv>` | `<table-wrap>` |
| `<code>` / `<code-block>` | `<monospace>` (inline) / `<preformat><code>` (block) |
| `<svg>`, `<mermaid>`, `<abc>` | `<fig>` / `<graphic>` |
| `<aside type=X>` | `<boxed-text content-type="X">` (default `content-type="aside"`) |
| `<frame>` | `<boxed-text>` (numbered `<frame>` wraps in `<fig>` at export) |
| a frameable `caption` | `<caption>` |

`<boxed-text>` is the round-trip counterpart for the boxed-prose
members: JATS import maps `<boxed-text>` back to `<aside>` (carrying
`content-type` onto the `type` kwarg).

## Authoring examples

**Figure (float; numbered by default, unframed by default).**

```
<fig #fig:elephant src=elephant.jpg | An adult African elephant.>
```

**Callout (boxed prose; framed by default, unnumbered by default).**

```
<aside type=warning | Calibrate before every run.>
```

**Titled methodology box.**

```
<frame type=methodology title="Procedure" |
1. Collect data.
2. Clean.
3. Fit the model.
>
```

**Framing something that is not itself frameable** (a blockquote here):

```
<frame title="Epigraph" |
<blockquote | "All models are wrong, but some are useful." — Box>
>
```

**Numbered, cross-referenced frame** (numbered by default since #272, shares
the figure counter):

```
<frame #fig:setup | <caption | Experimental setup.>>
… see <ref @fig:setup> …
```

## Rendering and the build

All *built* frameable members render through the shared `renderFrameable` helper
with the surface, caption-and-title-as-content, and per-member defaults above —
`<code>` / `<code-block>` excepted, since their frameable surface is future (per
the members note above); today they render as plain code elements. `<aside>` is
a built frameable member: it carries `title` / `caption` / `border` (default on) /
`numbered` (default off, the `box` series) alongside its `type` taxonomy and
`<boxed-text>` export. Callouts/admonitions are `<aside type=…>` (no separate
element), per "Callouts and admonitions" above.

The helper emits each member through **its own wrapper element** — the wrapper is
the construct, never an inner element nested in an outer one:

- **Figure-wrapped members** (`<fig>`, `<svg>`, and `<frame>`) use `<figure>`,
  with the title as `<figcaption class="title">` (top) and the caption as
  `<figcaption>` (bottom, with the number-label folded in). Table-family members
  (`<table>` / `<csv>` / `<tsv>`) use `<table>` with `<caption>`; external DSLs
  (`<diagram>`) place a sibling `<figcaption>`.
- **`<aside>`** keeps the semantic `<aside>` element. Its title and caption are
  `<p class="title">` (top) and `<p class="caption">` (bottom) — the same
  `.title` / `.caption` styling hooks the figure family uses, because
  `<figcaption>` is invalid outside `<figure>`. The `frameable-border` class
  (default on for boxed prose) draws the box.

## Resolved sub-questions

These were the genuinely-undecided points; the #31 build resolved them:

- **Title is content**, not a plain attribute. Like the caption, the title is
  rich, two-form content: a `<title>` child tag, or a `title=` kwarg lifted to
  that child at the normalize-to-canonical gate. Same treatment the caption gets.
- **A numbered `<aside>` gets its OWN counter** — the **`box`** series
  ("Box N"), with config key `number-boxes` and ref-prefix `box`. It does *not*
  share the `figure` counter. `<aside>` is **unnumbered by default**;
  `+numbered` opts it into the box series. (Per-type callout numbering —
  "Note 1" / "Tip 1" — is deferred; a numbered aside counts in the single `box`
  series regardless of `type`.)
- **`<aside>` is handler-strategy.** Gaining the frameable surface moved
  `<aside>` from `schema` to `handler`: `asideHandler` (mirroring
  `frameHandler`) calls the shared `renderFrameable` helper. The wrapper stays
  the semantic `<aside>` element (not `<figure>`); its title and caption render
  as `<p class="title">` (top) and `<p class="caption">` (bottom) — the same
  `.title` / `.caption` styling hooks the figure family uses, since
  `<figcaption>` is invalid outside `<figure>`.
- **`<svg>`-as-frameable owns framed inline SVG; `<fig svg>` is retired.**
  `<svg>` is a figure-wrapped content-float member (above): a captioned or
  numbered `<svg>` wraps in `<figure>` with its `<figcaption>`; a bare
  `<svg -numbered>` with no caption is a lone inline `<svg>` (`<svg>` is numbered
  by default). The earlier `<fig svg | …>` sketch — inline SVG as a format word
  on the `fig` host — was a redundant *second* route to the same framed inline
  SVG, so it was retired (#81): no `<svg>` gate shorthand exists, and svg's
  registry binding names svg as its own host, not `fig`. See `format-words.md`
  §"svg: a passthrough display language".

## Related references

- `DESIGN.md` §"Frameable elements: a shared capability" — the rationale
  and what the shared-capability model supersedes (the umbrella `<figure>`).
- `packages/layer1-vocabulary/elements/` — `fig.md`, `frame.md`,
  `aside.md`, `table.md`, `code.md`, `svg.md` (the member vocab entries).
- `notes/specs/recursive-content-spec.md` — how caption/`<frame>` content
  is recursively parsed.
- GitHub issues [#31](https://github.com/enscribejs/enscribe/issues/31)
  (frameable redesign — the tracking item),
  [#30](https://github.com/enscribejs/enscribe/issues/30) (callouts —
  folded in), [#9](https://github.com/enscribejs/enscribe/issues/9)
  (downstream: Authoring-Guide blockquotes → asides/callouts).
