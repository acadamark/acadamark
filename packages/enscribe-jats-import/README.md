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

Not yet imported (dropped, with a one-line warning naming each kind — never
silently): figures, tables, non-bibliographic cross-references, the theorem
family, DSL blocks, `<book>` (BITS), and the long tail of non-representable
elements. These arrive in later Phase 13 slices.
