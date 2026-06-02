# Format words — the leading-positional "kind" convention

## What this document is

The design rule for **format words**: a tag whose **first positional argument**
names *how to interpret its content*. It defines when a tag should use a format
word (rather than a dedicated tag or a sigil), which tags use the convention,
and what becomes of tags that currently say the same thing two ways.

It is deliberately **separate** from the structured-data-container work
(issue #24). Those are two different "unifications" that are easy to confuse:

- **Structured-data containers** — tags holding a record of *named fields*
  (`<meta>`, `<author>`, and the `<config>` / `<data>` question). Their
  convention is the keyword ⇄ child-tag duality, handled by the
  structured-element registry. *Not this document.*
- **Format words** — a leading positional that selects a *parser or engine* for
  otherwise same-shaped content. *This document.*

## The prototype

The convention already exists in one place — `<table>`:

```
<table csv | a,b,c >
<table json | { ... } >
```

The first positional names the parser to run on the body. The set of accepted
formats lives in the table handler, which is its source of truth; this document
does not restate it.

## The rule

> A tag uses a **leading format word** when its content has the **same shape**
> but could be interpreted by **one of several engines or parsers**. When there
> is only one engine, or the distinction is not about parsing, the tag stays a
> **dedicated tag** or a **sigil**.

Two corollaries:

- **Multi-way kind → positional format word.** Several alternatives (table
  formats, diagram engines) belong in the leading positional.
- **Binary kind → boolean flag.** An on/off distinction (ordered list or not) is
  a flag (`+enum`), never a format word.

Why:

- **One way to say "which parser."** Enscribe currently expresses "what kind is
  this?" three ways — a format word (`<table csv>`), a dedicated tag
  (`<mermaid>`, `<abc>`), and a sigil (`<$ $>` vs `<$$ $$>`). The rule chooses
  deliberately instead of by accident.
- **Growth without vocabulary bloat.** A new engine is a new *word*, not a new
  tag; the parser table grows, the vocabulary does not.
- **Sigils keep their niche.** Inline/display math and code are single-engine and
  read best as terse sigils; the rule leaves them be.

## Members and dispositions

- **`<table>` — already a format word.** The prototype. (Its format list lives
  in the table handler.)
- **`<diagram …>` — adopt.** A single tag for the external diagram engines
  (initially Mermaid and ABC), replacing the one-off `<mermaid>` / `<abc>` tags.
  A new engine (D2, Graphviz, PlantUML, …) becomes a new format word, not a new
  vocabulary entry. The strongest case.
- **`<library …>` — adopt.** A format word for the bibliography parsers
  (initially BibTeX, with RIS and others to follow). Same shape — citation
  data — different parser.
- **`<fig …>` — limited to inline content.** External images already carry their
  format in `src=` (`src=cat.png`), so a word would only repeat it. A format word
  earns its place only for *inline* content (an inline `<svg>` with no filename
  to read).
- **`<code>` — reject.** A language is *highlighting*, not parsing; `lang=` and
  fenced ` ```js ` already cover it. A format word would be pure sugar.
- **`<list>` — reject.** Ordered/unordered is binary → a flag (`+enum`), not a
  format word; and `<ul>` / `<ol>` / `<dl>` plus the markdown idioms already
  exist.

## Redundant standalone tags

`<csv>` and `<tsv>` say the same thing as `<table csv>` / `<table tsv>` — one
kind expressed two ways. They **retire** in favour of the `<table …>` form.
During the transition they may remain as thin aliases so existing documents keep
rendering, then be removed once nothing depends on them. The same fate awaits
`<mermaid>` / `<abc>` once `<diagram …>` lands.

## The `<data>` connection (for clarity, not part of this rule)

Writing several `<data bibtex>` / `<data image>` blocks — the positional naming
which kind of payload — is *this* pattern aimed at `<data>`'s children, and it
falls out of the format-word rule once settled. How `<data>` is structured as a
container is the separate structured-element question (issue #24).

## Implementation order

The rule is the durable part; the members land independently, each as its own
slice:

1. `<diagram>` — clearest payoff; folds in `<mermaid>` / `<abc>`.
2. `<library bibtex>` (then RIS, …).
3. Retire `<csv>` / `<tsv>` into `<table …>`.
4. `<fig svg>` for inline content (smallest).

`<code>` and `<list>` are explicitly out of scope.
