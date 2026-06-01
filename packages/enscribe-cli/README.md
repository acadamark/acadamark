# @enscribejs/cli

The `enscribe` command-line tool — a thin layer over the Enscribe pipelines for
rendering documents to HTML and exporting them to JATS XML. It adds no capability
the library does not already have; it is a convenient command-line front end.

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

### Help and version

```bash
enscribe --help
enscribe render --help
enscribe --version
```

## Not yet included

- `enscribe import-jats` / `enscribe import` — arrive with JATS import and the
  pandoc bridge.

## Exit codes

`0` on success, `1` on error (missing input, unknown command, unreadable file).
