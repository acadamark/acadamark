# Format words — the leading-positional "kind" convention

## What this document is

The subsystem mechanics of **format words**: the leading positional that names
*which language interprets a host tag's content*. The architecture this sits
inside — the two axes (a **host** element and a **language**), the DSL registry
understood as a type system, the format word as the binding between the axes, and
the **display / storage / evaluation** purpose trichotomy — lives in `DESIGN.md`
§"The two axes: host and language" and is not restated here. This document owns
the per-host mechanics: how a host owns and is validated against its accept-set,
the member dispositions, the shorthand and clobber rules, the reserved scoping
syntax, and the implementation order.

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

## Admission: a host owns the set of languages it admits

A language is legal in a host only if it is in that **host's accept-set**. The
purpose (`display` / `storage` / `evaluation`, the trichotomy in `DESIGN.md`) is
**derived from the host**, never authored — the table host's languages are
display, the `data` / `library` host's are storage, a code-output host's would be
evaluation. The author writes only the host and the language word; the purpose
comes along with the host.

The accept-set is keyed by host (host → the languages it admits) because that is
the direction admission actually needs. An early design (#22) additionally
recorded the inverse — a per-language `(purpose, host)` *binding* list on the DSL
registry, read by a `getLanguageBindings` accessor — as a declarative substrate a
later member migration was expected to consume. That migration shipped via
explicit gate registrations instead, so the bindings were never consulted;
**#85 removed them** as inert data. The host accept-set is the single authority
for admission, and the inverse projection is reconstructible from it if ever
needed.

## The accept-set lives in the host

Each host **owns the set of languages it admits**. This is existing structure,
not a new mechanism: `<table>`'s accepted formats already live in the table
handler (`handlers/table.js`), which is their source of truth — the handler reads
the leading positional, looks the format up in its own parser table, and renders
the no-format case as a raw-HTML escape hatch. Every other host follows the same
shape: the host's handler is where its accept-set is defined and consulted, and
this document does not enumerate any host's languages.

These per-host accept-sets are mirrored in one lookup (`HOST_ACCEPT_SETS` in
`interpreter/lib/host-accept-sets.js`) so the system can ask "does host H admit
language L?" without reaching into each handler — the table host's entry is
literally the handler's format table, so the two cannot drift. **#85 wired this
as validation** at the normalize-to-canonical gate: after canonicalization, a
host carrying a format word outside its accept-set gets a located, non-fatal
diagnostic (a `file.message` on the offending node) and **still renders** — the
handler's own fallback produces visible output. Validation observes; it never
aborts and never mutates the tree. `<data>` is not validated this way: it carries
no format word of its own, and the payload languages of the `<library>` blocks it
holds are validated when each inner `<library>` is visited.

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
handler property, not a special case). Two facts follow:

- **`<svg>` is a first-class frameable element, not a host format word.** Unlike
  `<csv>` / `<mermaid>` (whose tags retired into the `<table>` / `<diagram>`
  hosts as loadable shorthands), the `<svg>` tag stays first-class: it has its own
  vocabulary entry and handler and *is* a member of the frameable class
  (`frameable.md`). The svg language sits in the registry only so the tag's
  content is opaque (the SVG XML passes through verbatim); there is **no `<svg>`
  gate shorthand**, and svg is registered as its own host on the language axis — a
bare handler entry (`{ handler: 'svg', opaque: true }`), not a format word on
another host. (The per-language `(purpose, host)` bindings this once referred to
were removed by #85 as inert data; see the registry note above.)
- **`<svg>` framing is the ordinary frameable rule.** A captioned or numbered
  `<svg>` is wrapped in a `<figure>` with its `<figcaption>` inside; a bare
  `<svg -numbered>` with no caption is a lone inline `<svg>`. (`<svg>` is numbered
  by default, sharing the figure counter — `-numbered` is the opt-out.)

> **`<fig svg>` is retired (#81).** An earlier design sketched a qualified
> `<fig svg | …>` form — the `fig` host carrying the apparatus, the `svg`
> language supplying the inline content. It is **not built and will not be**: it
> would be a redundant *second* route to framed inline SVG, which
> `<svg>`-as-frameable already owns, and it would require content opacity selected
> by the format-word positional (positional-conditional opacity) — a parser
> mechanism that was never built and, with this disposition, is not needed.
> `<svg>`-as-frameable is the sole home for framed inline SVG.

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
4. `<svg>` — dispositioned as a first-class frameable member, **not** a
   `<fig svg>` format word; the `<fig svg>` route was retired (#81). No migration
   slice; the disposition is the "svg: a passthrough display language" section above.

`<code>` and `<list>` are explicitly out of scope, for the reasons in the member
dispositions.

Admission **validation** — the `HOST_ACCEPT_SETS` lookup wired as a gate
diagnostic (see "The accept-set lives in the host") — landed separately in **#85**,
after the members, once there were several hosts to validate.

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

## The math environments stay standalone

`<matrix>` / `<cases>` / `<align>` / `<eqnarray>` are standalone LaTeX-math
environment tags, and they **stay standalone** — they are deliberately *not*
collapsed into `<math>` as languages the way `<mermaid>` folds into `<diagram>` or
`<csv>` into `<table>`. Their names are LaTeX-source-compatible (`\begin{matrix}`
and the rest), so authoring them directly is a familiarity win, not vocabulary
bloat. They are the documented exception to the format-word collapse: a
single-engine, source-compatible family that reads best as dedicated tags. (This
resolves the former open sub-decision in favor of keeping the tags — issue #79.)
