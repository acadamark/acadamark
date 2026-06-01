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
`--dsl-mode <skip|live-link|live-inline|static>`, `--quiet`.

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
`<bibliography>`), and math (`<inline-formula>`/`<disp-formula>` from `<tex-math>`
or MathML). Constructs without a Layer 1 counterpart — figures, tables, and the
rest — are dropped with a one-time warning per kind; later releases map more of
them. See
[`@enscribejs/jats-import`](../enscribe-jats-import/README.md) for the current
mapping.

### Help and version

```bash
enscribe --help
enscribe render --help
enscribe --version
```

## Not yet included

- `enscribe import` — the general document-conversion bridge (pandoc) arrives
  post-v0.1.0.

## Exit codes

`0` on success, `1` on error (missing input, unknown command, unreadable file).
