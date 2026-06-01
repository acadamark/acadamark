# @enscribejs/jats-import

Import JATS XML articles into Enscribe — the reverse direction of
[`@enscribejs/jats-export`](../enscribe-jats-export). `importJats(xml)` parses a
JATS article and returns an Enscribe **mdast tree**, ready to render to HTML or
serialize to `.emd` source.

```js
import { importJats } from '@enscribejs/jats-import';

const tree = importJats(jatsXmlString);

// → HTML, via the interpreter pipeline:
import { buildEnscribePipeline } from '@enscribejs/interpreter';
const proc = buildEnscribePipeline({ embedResources: true });
const html = proc.stringify(proc.runSync(tree));

// → canonical .emd source, via the lift serializer:
import { serializeCanonical } from '@enscribejs/cli/serialize-canonical';
const emd = serializeCanonical(tree);
```

On the command line, `enscribe import-jats article.xml` produces HTML (or
`--emd` for canonical source).

## Scope

Import is **deliberately lossy** and built incrementally. This release maps:

- **Structure:** `<article>` → `<meta type=article>` + body; `<front>` →
  title / authors / date / abstract; `<sec>` → `<section>` (nested → sub- /
  sub-sub-section); `<p>` → paragraphs; `<list>` → lists.
- **Inline:** `<bold>`/`<italic>`/`<underline>`/`<strike>` → `<b>`/`<i>`/`<u>`/`<s>`;
  `<monospace>` → inline code; `<sup>`/`<sub>`; `<ext-link>`/`<uri>`/`<email>` →
  `<a>`.
- **Citations & bibliography:** `<xref ref-type="bibr">` → `<cite @key>` (a
  space-separated `rid` list becomes one multi-key cite); `<back><ref-list>`
  `<ref><element-citation>` → BibTeX entries in a `<library>` (inside `<data>`),
  with a `<bibliography>` placement. The `<ref>` id is the citation key, verbatim.
  Publication types map (`journal`→`@article`, `book`→`@book`,
  `confproc`→`@inproceedings`, `thesis`→`@phdthesis`, …; anything else →
  `@misc`); author names become `Surname, Given` joined with ` and `. A free-text
  `<mixed-citation>` with no structured fields is preserved as an `@misc` `note`.
- **Math:** `<inline-formula>` → `<inline-math>` and `<disp-formula>` →
  `<display-math>` (id preserved). The LaTeX comes from `<tex-math>` (verbatim,
  preferred) or, failing that, from presentation MathML converted with
  [`mathml-to-latex`](https://www.npmjs.com/package/mathml-to-latex) (handles
  namespaced `mml:` MathML). A formula carrying neither degrades to a code span
  with a warning.
- **Figures, tables, cross-references, footnotes:** `<fig>` → `<fig src=… |
  caption>` (src from `<graphic xlink:href>`); `<table-wrap>` → `<table>` with the
  rows as CSV (colspan/rowspan tables fall back to raw HTML with a warning);
  `<xref ref-type="fig|table|disp-formula|sec">` → `<ref @prefix:id>`; and
  footnotes are inlined — each `<xref ref-type="fn">` becomes a `<note>` carrying
  the matching `<fn>` body. Referenceable ids are normalized to the Enscribe
  colon-prefix (`fig:`/`tab:`/`eqn:`/`sec:`) so cross-references resolve and
  elements are numbered.
- **Theorem family, DSL blocks, code:** `<statement content-type="X">` → the
  matching `<theorem>`/`<lemma>`/`<definition>`/`<proof>`/… (`<title>` → `name=`;
  unknown type → `<theorem>`); `<xref ref-type="statement">` → `<ref>`. A DSL
  figure (`<fig specific-use="enscribe-dsl-TYPE">` with a `<preformat
  …-source>`) → `<mermaid>`/`<abc>` with the source preserved verbatim. A bare
  `<preformat>` → a code block (`lang` from `xml:lang`).

## Reduction policy

Every element the importer meets is accounted for. **Reader-facing apparatus is
preserved** as readable content: keywords → a "Keywords: …" paragraph;
acknowledgments, funding, author notes / conflicts, appendices, and glossaries →
sections (`<def-list>` → `<dl>`); the abstract is kept in `<meta>` (structured
abstracts keep their internal sections). **Pure publishing metadata is dropped**
*silently* — journal-meta, article-ids, volume/issue/page positioning,
permissions/license, history, counts, affiliations, self-uri,
supplementary-material, custom-meta — because warning about an ISSN the reader
can't act on is just noise. **Anything in neither set still warns once**, so an
unfamiliar element surfaces rather than vanishing.

Not yet imported: `<book>` (BITS), which raises a clear error rather than
producing a mangled article.
