# @enscribejs/cli

The `enscribe` command-line tool — a thin layer over the Enscribe pipelines for
rendering documents to HTML, exchanging JATS XML, and rewriting source between
authoring registers. It adds no capability the library does not already have; it
is a convenient command-line front end.

## Install

```bash
npm install -g @enscribejs/cli
```

This puts an `enscribe` command on your PATH. (Without a global install, run it
via `npx @enscribejs/cli …`.)

## Commands

### `enscribe render`

Render an `.emd` file to HTML.

```bash
enscribe render paper.emd                 # HTML to stdout
enscribe render paper.emd -o paper.html   # HTML to a file
enscribe render paper.emd --embed         # self-contained (default)
enscribe render paper.emd --no-embed      # link fonts / KaTeX CSS from CDNs
enscribe render paper.emd --dsl-mode live-link
```

Options: `-o, --output <file>`, `--embed` (default) / `--no-embed`,
`--dsl-mode <skip|live-link|live-inline|static>`, `--toc` (a table-of-contents
sidebar; `--toc=auto` shows it only past three sections), `--theme
<default|modern|compact>` (inject a theme's token overrides), `--chapter-nav`
(default on) / `--no-chapter-nav` (for books with `--toc`: read one chapter at a
time, or render the whole book as one page), `--quiet`.

### `enscribe export-jats`

Export an `.emd` file to JATS 1.3 Archiving and Interchange XML (BITS 2.0 for
books).

```bash
enscribe export-jats paper.emd                # XML to stdout
enscribe export-jats paper.emd -o paper.xml   # XML to a file
```

### `enscribe lift`

Rewrite a document that mixes markdown idioms (`## Title`, `**bold**`), sigil
shorthands (`<# Title #>`), and canonical tags into equivalent source in pure
canonical named-tag form (`<section | Title>`, `<b>bold</b>`).

```bash
enscribe lift paper.emd                  # canonical source to stdout
enscribe lift paper.emd -o canonical.emd # to a file
```

The output re-parses to the same document (round-trip fidelity) for common
documents. A few honest caveats: opaque math and code use their canonical sigil
forms (`<$ … $>`, `<$$ … $$>`, `` <` … `> ``, `<``` … ```>`) — the only forms
that preserve verbatim content; lists re-emit as markdown list syntax (Enscribe
has no list tag); markdown links become `<span>`; and rare escaping edge cases
may need manual cleanup.

### `enscribe lower`

The reverse of `lift`: rewrite canonical (or mixed) source toward the shorter
authoring registers. By default it lowers sections to sigil shorthands
(`<section | Title>` → `<# Title #>`); with `--markdown` it additionally emits
markdown idioms (`## Title`, `**bold**`, `*italic*`, `~~strike~~`) wherever they
are lossless.

```bash
enscribe lower paper.emd              # toward sigil shorthands
enscribe lower paper.emd --markdown   # toward markdown idioms where lossless
```

A construct that carries attributes a register can't express stays in the fuller
form — e.g. an id-bearing section keeps a sigil (`<# #sec:intro | Title #>`) even
under `--markdown`, because a markdown heading cannot carry the id.

Like `lift`, `lower` parses through the same `strict-mode`-aware path, so a
`sigil`/`canonical` document's literal markdown and sigils stay literal across the
round-trip.

### `enscribe import-jats`

Import a JATS XML article into Enscribe — rendered HTML by default, or canonical
`.emd` source with `--emd`.

```bash
enscribe import-jats paper.xml                 # → HTML on stdout
enscribe import-jats paper.xml -o paper.html   # → HTML to a file
enscribe import-jats paper.xml --emd           # → canonical .emd source
```

Import is **incremental and deliberately lossy** (JATS's vocabulary is far larger
than Layer 1's). Today it maps document structure (article/front/body/sections,
paragraphs, lists, block quotes), inline formatting (bold, italic, underline,
strike, monospace, super/subscript, links), citations & bibliography
(`<xref ref-type="bibr">` → `<cite>`, `<ref-list>` → a BibTeX `<library>` plus a
`<bibliography>`), math (`<inline-formula>`/`<disp-formula>` from `<tex-math>`
or MathML), figures, tables, cross-references, and footnotes (`<fig>`,
`<table-wrap>` → CSV, `<xref>` → `<ref>`, inlined `<fn>` → `<note>`), and the
theorem family, DSL blocks, and code listings (`<statement>` → theorem/lemma/…,
a DSL `<fig><preformat>` → `<mermaid>`/`<abc>`, `<preformat>` → code). Reader-facing
apparatus (keywords, acknowledgments, funding, appendices, glossary) is preserved
as readable content; pure publishing metadata (journal-meta, article-ids,
permissions, page positioning) is dropped silently; anything unfamiliar warns
once. See the `jats-import` module
([`@enscribejs/cli/jats-import`](./src/jats-import/index.js)) for the current
mapping.

### `enscribe import`

Import LaTeX, Quarto, DOCX — anything [pandoc](https://pandoc.org) reads — into
Enscribe: rendered HTML by default, or canonical `.emd` source with `--emd`.

```bash
enscribe import paper.tex -o paper.html     # LaTeX → HTML
enscribe import paper.tex --emd -o paper.emd
enscribe import slides.qmd -o slides.html   # Quarto
enscribe import report.docx -o report.html  # DOCX
enscribe import notes.rst --from rst        # override format detection
```

Enscribe shells out to pandoc (`pandoc <in> -t json`) and converts pandoc's AST
to Enscribe — sections, inline formatting, math, figures, tables (CSV for simple,
raw HTML for spanning), lists, and footnotes. **Requires pandoc on `PATH`**; if
it's missing you get a pointer to <https://pandoc.org/installing.html>. The
format is detected from the extension (`.tex .qmd .md .docx .rst .adoc .org …`),
overridable with `--from`. Citations resolve when a `.bib` file is found (the
document's `bibliography` field, or a single `.bib` beside the input), included
as a `<library>`. Honest limitation: pandoc does not preserve LaTeX
`\label`/`\ref` cross-references structurally, so those arrive as plain
links/text rather than Enscribe `<ref>`s.

### Help and version

```bash
enscribe --help
enscribe render --help
enscribe --version
```

## Exit codes

`0` on success, `1` on error (missing input, unknown command, unreadable file).
