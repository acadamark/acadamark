# Multi-file authoring

**Superseded by the master-document spec — see
[`notes/specs/master-document.md`](master-document.md).** (#72)

Multi-file authoring — splitting a work across `.emd` files (chapters, separate
appendices, shared bibliography/data) — is now specified there as the **master
document**: a single entry-point file that *is* the project. It replaces this
brief's older "project-config file + `<include src=…>` directive" mechanism with a
master file that declares metadata, lays out the structure (inline or by
`<section src="…">` reference to child files), holds shared `<data>`, and sets
`<config>` options — one source of truth, no separate project-config format. A
project-wide **assembler** (the #72 system) loads the `src` children, merges the
citation registry, resolves cross-references and numbering across files, and
places the `<toc>` / `<endnotes>` / `<bibliography>` markers.

The older open design questions this brief raised (MF-Q1–Q4) are superseded by
that design: the dual project-config / `<include>` mechanism they concerned no
longer exists. The remaining build-time decisions live in the master-document
spec's "Open — to decide during the build" section and in GitHub Issues. This file
is kept as a redirect so existing links resolve.
