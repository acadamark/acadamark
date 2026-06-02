# Format words — the leading-positional "kind" convention

## What this document is

The subsystem mechanics of **format words**: the leading positional that names
*which language interprets a host tag's content*. The architecture this sits
inside — the two axes (a **host** element and a **language**), the DSL registry
understood as a type system, the format word as the binding between the axes, and
the **display / storage / evaluation** purpose trichotomy — lives in `DESIGN.md`
§"The two axes: host and language" and is not restated here. This document owns
the per-host mechanics: how a language's `(purpose, host)` bindings are declared,
how a host consults its accept-set, the member dispositions, the shorthand and
clobber rules, the reserved scoping syntax, and the implementation order.

This is the design spec for **issue #22** (generalize the qualifying-tag pattern
beyond `<table>`). It is deliberately **separate** from the structured-data-
container work (issue #24); those are two different "unifications" that are easy
to confuse:

- **Structured-data containers** — tags holding a record of *named fields*
  (`<meta>`, `<author>`, and the `<config>` / `<data>` question). Their
  convention is the keyword ⇄ child-tag duality, handled by the
  structured-element registry. *Not this document.*
- **Format words** — a leading positional that selects a *language* (a parser or
  engine) for otherwise same-shaped content. *This document.*

## The prototype

The convention already exists in one place — `<table>`:

```
<table csv | a,b,c >
<table json | { ... } >
```

The first positional names the language to run on the body. The set of accepted
formats lives in the table handler, which is its source of truth; this document
does not restate it.

## The rule

> A tag uses a **leading format word** when its content has the **same shape**
> but could be interpreted by **one of several languages**. When there is only
> one language, or the distinction is not about which language reads the content,
> the tag stays a **dedicated tag** or a **sigil**.

The format word is the binding between the host and language axes: `<table csv>`
is "the table host, parsed by the csv language"; `<diagram mermaid>` is "the
diagram host, rendered by the mermaid language." Two corollaries:

- **Multi-way kind → positional format word.** Several alternatives (table
  formats, diagram engines) belong in the leading positional.
- **Binary kind → boolean flag.** An on/off distinction (ordered list or not) is
  a flag (`+enum`), never a format word.

Why:

- **One way to say "which language."** Enscribe otherwise expresses "what kind is
  this?" three ways — a format word (`<table csv>`), a dedicated tag
  (`<mermaid>`, `<abc>`), and a sigil (`<$ $>` vs `<$$ $$>`). The rule chooses
  deliberately instead of by accident.
- **Growth without vocabulary bloat.** A new language is a new *word* on the
  language axis, not a new vocabulary element; the registry grows, the host axis
  does not.
- **Sigils keep their niche.** Inline/display math and code are single-language
  and read best as terse sigils; the rule leaves them be.

## Registration: a language declares its `(purpose, host)` bindings

A language is legal in a host only if it has **registered a binding** for that
host. A binding pairs the language with a host and a purpose, and the purpose is
**derived from the host**, never authored — the table host's languages are
display, the `data`/`library` host's are storage, a code-output host's are
evaluation (the trichotomy is defined in `DESIGN.md`). The author writes only the
host and the language word; the purpose comes along through the registration.

Two consequences of "purpose is derived from the host":

- A language can register against **more than one** `(purpose, host)` binding —
  the same source format can be a storage language under `<data>` and a display
  language under a rendering host — without the author ever disambiguating
  purpose by hand.
- A host's accept-set (next section) is exactly "the languages that registered a
  binding naming this host." Admission is a registry lookup, not a special case
  in the host's handler.

## The accept-set lives in the host

Each host **owns the set of languages it admits**. This is existing structure,
not a new mechanism: `<table>`'s accepted formats already live in the table
handler (`handlers/table.js`), which is their source of truth — the handler reads
the leading positional, looks the format up in its own parser table, and renders
the no-format case as a raw-HTML escape hatch. Every other host follows the same
shape: the host's handler is where its accept-set is defined and consulted, and
this document does not enumerate any host's languages.

## Members and dispositions

Reframed into the host/language vocabulary; the dispositions themselves are
unchanged.

- **`<table>` — already a format word.** The prototype host. Its display
  languages live in the table handler.
- **`<diagram …>` — adopt.** A single host for the external diagram engines
  (initially Mermaid and ABC). A new engine (D2, Graphviz, PlantUML, …) is a new
  display **language** admitted by the diagram host, not a new vocabulary
  element. The strongest case.
- **`<library …>` — adopt.** A host whose languages are the bibliography parsers
  (initially BibTeX, with RIS and others to follow). Same shape — citation data —
  different parser; these are **storage** languages.
- **`<fig …>` — format word for inline content only.** External images already
  carry their format in `src=` (`src=cat.png`), so a word there would only repeat
  it. The format word earns its place only for *inline* content with no filename
  to read — the inline-SVG case below.
- **`<code>` — reject.** Code's "language" selects a *highlighter grammar*, drawn
  from the syntax highlighter's own vocabulary, not from the render registry. The
  code host *shows* its source rather than rendering or parsing it into another
  form, so it sits outside the host/language binding; the highlighter language is
  chosen by `lang=` or the fenced ` ```js ` idiom, on a separate type system. A
  format word would be pure sugar over an axis that already has a home.
- **`<list>` — reject.** Ordered/unordered is binary → a flag (`+enum`), not a
  format word; and `<ul>` / `<ol>` / `<dl>` plus the markdown idioms already
  exist.

## svg: a passthrough display language

SVG is a **display language** whose display handler is *passthrough* — the source
bytes are already the rendered form and the browser draws SVG natively, where
Mermaid's display handler invokes a JavaScript library (the architectural point
is in `DESIGN.md`: "render natively" vs "invoke a library" is a per-language
handler property, not a special case). The mechanics that follow from that:

- **Bare `<svg>` is the loadable shorthand** for the svg display language (a gate
  expansion, like the other standalone tags below).
- **SVG is framed only when captioned or numbered**, by the ordinary frameable
  rule — there is no defer-to-HTML carve-out and no second inline-SVG path.
- The qualified form on the figure host is `<fig svg | <svg>…</svg> >`: the `fig`
  host carries the caption/number/cross-reference apparatus, the `svg` language
  supplies the inline content.

> **Build note (#81).** The `<fig svg>` framed form is the design above, but it
> is not yet built: it needs content opacity selected by the format-word
> positional (a parser mechanism that does not exist today — `fig`'s content is
> non-opaque for captions), and it overlaps the `<svg>`-as-frameable member
> settled in `frameable.md` (#31). The reconciliation is tracked in #81. Bare
> standalone `<svg>` is unaffected.

## Standalone tags are loadable shorthands

`<csv>` / `<tsv>` say the same thing as `<table csv>` / `<table tsv>`, and
`<mermaid>` / `<abc>` the same as `<diagram mermaid>` / `<diagram abc>` — one
`(host, language)` binding expressed two ways. The standalone tags become
**loadable shorthands**: gate expansions that inject the host and the language
positional, registered the same way `<chapter>` expands to
`<book-part book-part-type="chapter">` at the normalize-to-canonical gate (a
positional-carrying expansion, which is why it lives at the gate and not in the
build-time vocab generator's bare-key alias pass). After the gate, every
downstream consumer sees only the canonical bound node.

Three rules govern the shorthands:

- **They are kept permanently**, the way the markdown idioms are kept — a
  shorthand is an authoring convenience, not a deprecation stage. Removing a
  shorthand is a separate, optional decision once nothing depends on it.
- **Retiring a tag retires only the tag, never the language.** The language stays
  first-class in the registry and remains hostable elsewhere; only the
  bare-tagname spelling goes away.
- **Clobber policy: later-wins + warn**, matching the vocab generator's existing
  duplicate-key behavior. **Host names and core-vocabulary names are reserved** —
  a shorthand may not shadow them, so a loadable shorthand can never capture a
  name the vocabulary already owns.

## Authored forms

- **Positional — `<diagram mermaid>`** — the canonical, unambiguous qualified
  form. The host is the tagname, the language is the leading positional.
- **Bare — `<mermaid>`** — the loadable shorthand, expanded at the gate.
- **Scoping `:` — `<diagram:mermaid>` — reserved.** This is the disambiguator of
  last resort, held in reserve so the design is explicit about it. The
  reservation would lift only if (a) the shorthand namespace becomes genuinely
  crowded — enough languages register bare shorthands that collisions are common
  — or (b) a deliberate decision that the single-token `host:language` read is
  worth a grammar change for its own sake. Until one of those holds, the
  positional form is canonical and the colon form stays reserved.

  *Why a colon.* Enscribe already uses `:` for qualified colon-ids
  (`#fig:elephant`), so `host:language` extends one established meaning of the
  colon rather than overloading the period — which is already the class sigil
  (`<diagram .mermaid>` adds a class). `<diagram.mermaid>` would sit one space
  away from `<diagram .mermaid>` and invite exactly the confusion the reserved
  colon avoids.

## Implementation order

The rule is the durable part; the members land independently, each as its own
slice:

1. `<diagram>` — clearest payoff; folds in `<mermaid>` / `<abc>` as shorthands.
2. `<library bibtex>` (then RIS, …).
3. Retire `<csv>` / `<tsv>` into `<table …>` (as shorthands).
4. `<fig svg>` for inline content (smallest).

`<code>` and `<list>` are explicitly out of scope, for the reasons in the member
dispositions.

## The `<data>` connection and the #24 boundary

The host/language model cleanly **subsumes the storage-purpose case**: a
`<library bibtex>` (or `<data bibtex>`) block is a `(host, language)` binding like
any other — the format-word positional names which storage language reads the
payload, the host owns its accept-set (the bibliography parsers), and the body is
the foreign payload. `<library bibtex | …>` is the canonical form; a bare
`<library | …>` (or the `format=` kwarg) falls back to citation-js auto-detect.

This places `<library>` / `<data>` on the **language axis**, registered as a
storage host — **not** as `STRUCTURED_ELEMENTS` members. `STRUCTURED_ELEMENTS` is
for enscribe-native named-field tags (`<meta>`, `<author>`); a foreign-format
library is a payload, which is the DSL/language axis (per `DESIGN.md`'s
structured-data-vs-DSL distinction). The two registries stay cleanly separated.

What stays the **#24** question is the *container shape* of `<data>` — whether it
should additionally expose a structured-field interface — which is the
structured-element problem, not the format-word one. This document settles the
language axis for `<data>`'s payloads; #24 settles the container.

## Open sub-decision: the math environments

`<matrix>` / `<cases>` / `<align>` / `<eqnarray>` are standalone tags today, each
a LaTeX-math environment. The symmetric move would collapse them into the `<math>`
host as languages (`<matrix>` → `<math matrix>`), exactly as `<mermaid>` folds
into `<diagram>`. The competing reading keeps them as standalone sugar because
their names are LaTeX-source-compatible and authors type them directly. This is an
**open sub-decision**, tracked as a discussion issue (#79); it is recorded here,
not resolved.
