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

Not yet imported (dropped, with a one-line warning naming each kind — never
silently): citations and bibliography, math, figures, tables, cross-references,
the theorem family, DSL blocks, `<book>` (BITS), and the non-representable-element
reduction policy. These arrive in later Phase 13 slices.
