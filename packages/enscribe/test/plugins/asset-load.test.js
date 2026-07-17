// Tests for the asset-load plugin (the embedded-asset twin of library-load) — the missing unit
// peer (#316/1-K), and the duplicate-asset-id last-wins proof (#316/1-I).
//
// Covers buildAssetIndex: harvesting embedded `<fig #id fmt>base64</fig>` and external
// `<fig #id src>` declarations from `<data>` into file.data.enscribeAssets (and stripping them);
// the no-#id warning; and the DUPLICATE-ID collision — last declaration wins + a visible
// `__asset-error` flag (matching the pinned-slug / duplicate-citation-key policy: keep one, warn,
// never a silent overwrite). Plus the makeAssetError / assetError node shapes.

import assert from 'node:assert/strict';
import { buildAssetIndex, makeAssetError, assetError, resolveAssetReference, enscribeAssetResolution } from '../../src/interpreter/plugins/asset-load.js';
import { ENSCRIBE_ASSETS } from '../../src/core/file-data-keys.js';
import { makeTag } from '../../src/core/tag.js';
import { buildEnscribePipeline } from '../../src/interpreter/index.js';

/** A minimal VFile mock: collects warnings, holds file.data. (Same shape as library-load.test.js.) */
function makeFile() {
  const warnings = [];
  return { data: {}, message: (msg) => warnings.push(String(msg)), _warnings: warnings };
}

const embeddedFig = (id, fmt, base64) => makeTag('fig', [{ type: 'text', value: base64 }], { id, positional: [fmt] });
const externalFig = (id, src) => makeTag('fig', [], { id, kwargs: { src } });
const dataTree = (...figs) => ({ type: 'root', children: [makeTag('data', figs)] });
// A <dataset> node — LONG-FORM (the required authoring form), opaque content a raw STRING.
// `makeTag` defaults to form:'short'; a real <dataset> is form:'long' (its payload is the
// <dataset>…</dataset> body), so set it here — buildAssetIndex rejects a non-long-form dataset
// as a visible authoring error (see test 27). `kw` carries { kwargs } / { positional } to
// exercise both format-hint forms.
const dataset = (id, content, kw = {}) => ({ ...makeTag('dataset', content, { id, ...kw }), form: 'long' });

export function run() {
  // 1. embedded <fig #id fmt>base64</fig> → indexed (format + base64); the decl is stripped from <data>.
  {
    const tree = dataTree(embeddedFig('fig:x', 'png', 'PNGDATA'));
    const file = makeFile();
    buildAssetIndex(tree, file);
    const assets = file.data[ENSCRIBE_ASSETS];
    assert.ok(assets instanceof Map && assets.has('fig:x'), 'the embedded asset is indexed');
    assert.deepEqual(assets.get('fig:x'), { format: 'png', base64: 'PNGDATA' }, 'format + base64 captured');
    assert.equal(tree.children[0].content.length, 0, 'the harvested <fig> is stripped from its <data> block');
    console.log('PASS: asset-load — embedded <fig #id fmt>base64</fig> indexed (format+base64) and stripped');
  }

  // 2. external <fig #id src> → stored as { src } (the rebased path resolves at the use-site).
  {
    const tree = dataTree(externalFig('fig:ext', 'images/p.png'));
    const file = makeFile();
    buildAssetIndex(tree, file);
    assert.deepEqual(file.data[ENSCRIBE_ASSETS].get('fig:ext'), { src: 'images/p.png' }, 'external src stored');
    console.log('PASS: asset-load — external <fig #id src> indexed as { src }');
  }

  // 3. a <fig> in <data> with no #id → a VISIBLE __asset-error flag (#395 always-renders),
  //    left in place (not registered as an asset).
  {
    const tree = dataTree(makeTag('fig', [{ type: 'text', value: 'X' }], { positional: ['png'] }));
    const file = makeFile();
    buildAssetIndex(tree, file);
    assert.equal(file.data[ENSCRIBE_ASSETS], undefined, 'no id → nothing registered');
    const flags = tree.children.filter((n) => n?.tagname === '__asset-error');
    assert.equal(flags.length, 1, 'a visible no-#id flag is injected (#395, never warning-only)');
    assert.match(flags[0].kwargs.message, /<fig> in <data> has no #id/, 'the flag names the tag and the problem');
    const dataNode = tree.children.find((n) => n?.tagname === 'data');
    assert.equal(dataNode.content.length, 1, "the un-id'd <fig> is left in <data>");
    console.log('PASS: asset-load (#395) — a <fig> with no #id renders a visible flag and is left in place');
  }

  // 4. DUPLICATE id across two <data> blocks → LAST declaration wins + a visible __asset-error (#316/1-I).
  {
    const tree = {
      type: 'root',
      children: [
        makeTag('data', [embeddedFig('fig:dup', 'png', 'FIRST')]),
        makeTag('data', [embeddedFig('fig:dup', 'png', 'SECOND')]),
      ],
    };
    const file = makeFile();
    buildAssetIndex(tree, file);
    assert.equal(file.data[ENSCRIBE_ASSETS].get('fig:dup').base64, 'SECOND',
      'last-wins: the LAST declaration is the one kept in the index');
    const flags = tree.children.filter((n) => n?.tagname === '__asset-error');
    assert.equal(flags.length, 1, 'exactly one collision flag is injected (always-renders, never a silent overwrite)');
    assert.match(flags[0].kwargs.message, /duplicate embedded-asset id "fig:dup".*last declaration wins/,
      'the collision flag names the id and states last-wins');
    console.log('PASS: asset-load (#316/1-I) — duplicate embedded-asset id: last-wins + a visible collision flag');
  }

  // 5. no <data> → no-op (the index key is never set).
  {
    const tree = { type: 'root', children: [makeTag('article', [])] };
    const file = makeFile();
    buildAssetIndex(tree, file);
    assert.equal(file.data[ENSCRIBE_ASSETS], undefined, 'no <data> → enscribeAssets not set');
    console.log('PASS: asset-load — no <data> block is a no-op');
  }

  // 6. makeAssetError / assetError produce the __asset-error node shape.
  {
    assert.deepEqual(makeAssetError('@fig:x', 'boom'),
      { type: 'enscribeTag', tagname: '__asset-error', kwargs: { ref: '@fig:x', message: 'boom' }, content: null },
      'makeAssetError shape');
    const node = makeTag('fig', [], { id: 'fig:y', positional: ['png'] });
    assetError(node, '@fig:y', 'forbidden');
    assert.equal(node.tagname, '__asset-error', 'assetError mutates the node in place to __asset-error');
    assert.equal(node.id, null, 'assetError clears the id so it is not counted as a figure');
    console.log('PASS: asset-load — makeAssetError / assetError produce the __asset-error node shape');
  }

  // ── #313 slice 1: <dataset> opaque storage host (rides the same harvest into the same store) ──────

  // 7. <dataset #id format=csv>bytes</dataset> → indexed as { format, content }; the decl is stripped from <data>.
  {
    const tree = dataTree(dataset('d1', 'name,note\nalpha,2', { kwargs: { format: 'csv' } }));
    const file = makeFile();
    buildAssetIndex(tree, file);
    const store = file.data[ENSCRIBE_ASSETS];
    assert.ok(store instanceof Map && store.has('d1'), 'the dataset is indexed in the (shared) data store');
    assert.deepEqual(store.get('d1'), { format: 'csv', content: 'name,note\nalpha,2' }, 'format + opaque content captured');
    assert.equal(tree.children[0].content.length, 0, 'the harvested <dataset> is stripped from its <data> block');
    console.log('PASS: dataset (#313) — <dataset #id format=csv>…</dataset> indexed as { format, content } and stripped');
  }

  // 8. the content is OPAQUE: a #/*/_ passes through untouched, a JSON {…} keeps its braces, and ONLY the
  //    outer whitespace (the newline/indent around the long-form body) is trimmed — internal indentation survives.
  {
    const payload = '  {\n  "a": "*bold* _em_ #h1",\n  "b": 2\n}  ';
    const tree = dataTree(dataset('d:json', payload, { kwargs: { format: 'json' } }));
    const file = makeFile();
    buildAssetIndex(tree, file);
    const stored = file.data[ENSCRIBE_ASSETS].get('d:json').content;
    assert.equal(stored, '{\n  "a": "*bold* _em_ #h1",\n  "b": 2\n}', 'outer ws trimmed; braces, markdown chars, and internal indent all preserved verbatim');
    assert.ok(stored.startsWith('{') && stored.endsWith('}'), 'a JSON payload is NOT brace-stripped (unlike an asset base64 payload)');
    console.log('PASS: dataset (#313) — payload is opaque: #/*/_ and JSON braces preserved; only outer ws trimmed');
  }

  // 9. the leading-positional format form (<dataset #id tsv>…</dataset>) — the format-word positional.
  {
    const tree = dataTree(dataset('d:t', 'a\tb', { positional: ['tsv'] }));
    const file = makeFile();
    buildAssetIndex(tree, file);
    assert.deepEqual(file.data[ENSCRIBE_ASSETS].get('d:t'), { format: 'tsv', content: 'a\tb' }, 'positional format hint captured');
    console.log('PASS: dataset (#313) — leading-positional format (<dataset #id tsv>…</dataset>) captured');
  }

  // 10. a <dataset> with no #id → a VISIBLE __asset-error flag (#395), left in place
  //     (not registered), like a no-#id <fig>.
  {
    const tree = dataTree(dataset(null, 'x,y', { kwargs: { format: 'csv' } }));
    const file = makeFile();
    buildAssetIndex(tree, file);
    assert.equal(file.data[ENSCRIBE_ASSETS], undefined, 'no id → nothing registered');
    const flags = tree.children.filter((n) => n?.tagname === '__asset-error');
    assert.equal(flags.length, 1, 'a visible no-#id flag is injected (#395)');
    assert.match(flags[0].kwargs.message, /<dataset> in <data> has no #id/, 'the flag names <dataset>');
    const dataNode = tree.children.find((n) => n?.tagname === 'data');
    assert.equal(dataNode.content.length, 1, "the un-id'd <dataset> is left in <data>");
    console.log('PASS: dataset (#395) — a <dataset> with no #id renders a visible flag and is left in place');
  }

  // 11. DUPLICATE id (shared namespace) → LAST wins + a visible "data-store id" collision flag.
  {
    const tree = {
      type: 'root',
      children: [
        makeTag('data', [dataset('dup', 'FIRST', { kwargs: { format: 'csv' } })]),
        makeTag('data', [dataset('dup', 'SECOND', { kwargs: { format: 'csv' } })]),
      ],
    };
    const file = makeFile();
    buildAssetIndex(tree, file);
    assert.equal(file.data[ENSCRIBE_ASSETS].get('dup').content, 'SECOND', 'last-wins across <data> blocks');
    const flags = tree.children.filter((n) => n?.tagname === '__asset-error');
    assert.equal(flags.length, 1, 'exactly one collision flag (always-renders)');
    assert.match(flags[0].kwargs.message, /duplicate data-store id "dup".*last declaration wins/, 'the flag names the id + last-wins (dataset wording)');
    console.log('PASS: dataset (#313) — duplicate data-store id: last-wins + a visible collision flag');
  }

  // 12. END-TO-END through the FULL pipeline: the parser keeps the payload opaque (recursive-content skips a
  //     non-default handler), it is harvested under its id, and NOTHING renders (invisible, like <library>).
  {
    const src = [
      '<section | Body>', '', 'Hello world.', '',
      '<data>',
      '<dataset #d:e2e csv>',
      'name,note',
      'alpha,*bold* _em_ #h1',
      'beta,2',
      '</dataset>',
      '</data>',
    ].join('\n');
    const proc = buildEnscribePipeline({});
    const file = { data: {} };
    const numbered = proc.runSync(proc.parse(src), file);
    const store = file.data[ENSCRIBE_ASSETS];
    assert.ok(store?.has('d:e2e'), 'end-to-end: the dataset is harvested under its id');
    assert.equal(store.get('d:e2e').format, 'csv', 'end-to-end: the format hint survives');
    assert.ok(store.get('d:e2e').content.includes('*bold* _em_ #h1'), 'end-to-end: the markdown-special payload is held VERBATIM (opaque)');
    const html = String(proc.stringify(numbered, file));
    assert.ok(!/<em>|<strong>|<h1/.test(html), 'end-to-end: the payload was NOT markdown-parsed (no <em>/<strong>/<h1> leaked from it)');
    assert.ok(!html.includes('name,note'), 'end-to-end: the dataset renders NOTHING (invisible, like <library>)');
    assert.ok(html.includes('Hello world'), 'end-to-end: the surrounding body still renders normally');
    console.log('PASS: dataset (#313) — END-TO-END: opaque payload harvested by id, never markdown-parsed, renders nothing');
  }

  // ══ #313 slice 2: neutralize the resolver; <table src="@id"> works; all @id errors visible ══════════

  // Render a full document and return its HTML. (data declared after the use-site — collectDataNodes is
  // position-independent, like a <library>.)
  const renderDoc = (body, data) => {
    const proc = buildEnscribePipeline({});
    const file = { data: {} };
    return String(proc.stringify(proc.runSync(proc.parse(`${body}\n${data}`), file), file));
  };
  const DATASET = '\n<data>\n<dataset #d1 csv>\nname,note\nalpha,*bold* #h1\nbeta,2\n</dataset>\n</data>';

  // 13. resolveAssetReference is CONSUMER-AGNOSTIC: bytes + status, no data:/img/grid/parse inside it.
  {
    const assets = new Map([
      ['img', { format: 'png', base64: 'PNGDATA' }],
      ['ext', { src: 'p/q.png' }],
      ['ds', { format: 'csv', content: 'a,b' }],
    ]);
    assert.equal(resolveAssetReference('notaref', assets), null, 'a non-@ src is not an asset reference (null)');
    assert.equal(resolveAssetReference('plain.csv', assets), null, 'a file path is not an asset reference (null)');
    assert.deepEqual(resolveAssetReference('@img', assets), { ref: '@img', id: 'img', found: true, entry: { format: 'png', base64: 'PNGDATA' } }, 'embedded asset → raw entry, uninterpreted');
    assert.deepEqual(resolveAssetReference('@ds', assets), { ref: '@ds', id: 'ds', found: true, entry: { format: 'csv', content: 'a,b' } }, 'dataset → raw entry, uninterpreted');
    assert.deepEqual(resolveAssetReference('@nope', assets), { ref: '@nope', id: 'nope', found: false, entry: null }, 'unknown id → a uniform not-found signal');
    // No media assumption: the returned shape carries bytes/path + status only — never a data: URI, <img>, or grid.
    const dump = JSON.stringify(['@img', '@ds', '@ext', '@nope'].map((s) => resolveAssetReference(s, assets)));
    assert.ok(!/data:|<img|<table|<td/.test(dump), 'resolveAssetReference makes NO media assumption (no data:/<img>/grid in its output)');
    console.log('PASS: #313/2 — resolveAssetReference is consumer-agnostic (bytes + status, no interpretation)');
  }

  // 14. <table src="@d1" /> reading a <dataset> → a REAL grid (the first cross-consumer pull from the store).
  {
    const html = renderDoc('<section | S>\n\n<table src="@d1" />', DATASET);
    assert.match(html, /<th>name<\/th>/, 'table-from-dataset: header cell from the dataset');
    assert.match(html, /<th>note<\/th>/, 'table-from-dataset: second header');
    assert.match(html, /<td>beta<\/td>/, 'table-from-dataset: a body cell from the dataset');
    assert.match(html, /<td>2<\/td>/, 'table-from-dataset: the grid row 1,2 rendered');
    console.log('PASS: #313/2 — <table src="@d1"> renders the dataset as a grid (format from the dataset hint)');
  }

  // 15. OPAQUE to the consumer: a #/* in the dataset is parsed as a CSV CELL, NOT markdown.
  {
    const html = renderDoc('<section | S>\n\n<table src="@d1" />', DATASET);
    assert.ok(html.includes('*bold* #h1'), 'the #/* cell text appears LITERALLY in the grid');
    assert.ok(!/<em>|<strong>|<h1/.test(html), 'the #/* cell text is NOT markdown-parsed (opaque-to-consumer end to end)');
    console.log('PASS: #313/2 — dataset bytes reach the table parser as CSV cells, never markdown (opaque end to end)');
  }

  // 16. an explicit format on the table also works (<table csv src="@d1" />).
  {
    const html = renderDoc('<section | S>\n\n<table csv src="@d1" />', DATASET);
    assert.match(html, /<th>name<\/th>/, 'explicit-format table-from-dataset renders the grid too');
    console.log('PASS: #313/2 — <table csv src="@d1"> (explicit format) renders the grid');
  }

  // 17. F2.1 CLOSED — a bad @id is a VISIBLE error for BOTH consumers (the table no longer fails silently).
  {
    const t = renderDoc('<section | S>\n\n<table src="@nope" />', '');
    assert.match(t, /__asset-error|asset-error/, 'table @nope → a visible __asset-error (not silent-empty)');
    assert.ok(t.includes('nope'), 'the table error names the bad ref');
    const f = renderDoc('<section | S>\n\n<fig src="@nope" | cap>', '');
    assert.match(f, /__asset-error|asset-error/, 'fig @nope → a visible __asset-error (unchanged)');
    console.log('PASS: #313/2 — F2.1 closed: an unresolved @id is a visible __asset-error for BOTH <table> and <fig>');
  }

  // 18. cross-kind misuse is a visible error too: a <fig> referencing a dataset, and a <table> referencing
  //     an embedded image — each through the SAME __asset-error path.
  {
    const f = renderDoc('<section | S>\n\n<fig src="@d1" />', DATASET);
    assert.match(f, /asset-error/, 'a <fig> referencing a <dataset> → visible error (data is not an image)');
    const t = renderDoc('<section | S>\n\n<table src="@img" />', '\n<data>\n<fig #img png>PNGB64</fig>\n</data>');
    assert.match(t, /asset-error/, 'a <table> referencing an embedded image → visible error (image is not tabular)');
    console.log('PASS: #313/2 — cross-kind misuse (fig→dataset, table→image) → visible __asset-error');
  }

  // 19. REGRESSION — a non-@ table is untouched: an inline <table csv | …> renders identically.
  {
    const html = renderDoc('<section | S>\n\n<table csv |\nx,y\n3,4>', '');
    assert.match(html, /<th>x<\/th>/, 'inline <table csv | …> still renders its grid (the non-@ path is untouched)');
    assert.match(html, /<td>4<\/td>/, 'inline table body unchanged');
    console.log('PASS: #313/2 — inline <table csv | …> (non-@) is untouched');
  }

  // ══ #313 consumer wiring: <diagram src="@id"> + <code src="@id"> read a stored <dataset> ══════════
  //
  // A `>`-bearing payload (Mermaid's `-->`) is authored in the LONG form <dataset …>…</dataset>, which
  // scans to the explicit close (the pipe form truncates at the first `>`); see data-store.md §Piece 1.
  const MERMAID_DS = '\n<data>\n<dataset #flow mermaid>\ngraph LR\n  A[Start] --> B[End]\n</dataset>\n</data>';
  const CODE_DS = '\n<data>\n<dataset #snip python>\ndef scale(n):\n    return n * 2\n</dataset>\n</data>';

  // 20. <diagram mermaid src="@flow"> reading a <dataset> → the engine source in the <pre> wrapper.
  {
    const html = renderDoc('<section | S>\n\n<diagram mermaid src="@flow" />', MERMAID_DS);
    assert.match(html, /<pre class="mermaid" data-enscribe-dsl="mermaid">/, 'diagram-from-dataset: the mermaid wrapper renders');
    assert.match(html, /graph LR/, 'diagram-from-dataset: the engine source reached the wrapper');
    assert.match(html, /A\[Start\] --&#x3E;|A\[Start\] --> B\[End\]/, 'diagram-from-dataset: the `-->` arrow survived (long-form dataset kept the `>`)');
    console.log('PASS: #313 consumer — <diagram mermaid src="@flow"> feeds a <dataset> as engine source');
  }

  // 21. <code src="@snip"> reading a <dataset> → the verbatim code body; OPAQUE end to end.
  {
    const html = renderDoc('<section | S>\n\n<code src="@snip" />', CODE_DS);
    assert.match(html, /<code class="language-python">/, 'code-from-dataset: format hint seeds the language-python class');
    assert.ok(html.includes('def scale(n):'), 'code-from-dataset: the verbatim body rendered');
    // Opacity: a stored code payload with a #/* is NOT markdown-parsed.
    const litHtml = renderDoc('<section | S>\n\n<code src="@lit" />', '\n<data>\n<dataset #lit>\n# not a heading *not em*\n</dataset>\n</data>');
    assert.ok(litHtml.includes('# not a heading *not em*'), 'code-from-dataset: #/* render literally in the code body');
    assert.ok(!/<em>|<strong>|<h1/.test(litHtml.replace(/language-[a-z]+/g, '')), 'code-from-dataset: no markdown elements (opaque end to end)');
    console.log('PASS: #313 consumer — <code src="@snip"> renders a <dataset> as a verbatim, opaque code body');
  }

  // 22. diagram FORMAT-HINT / ENGINE mismatch → a visible asset-error (a diagram reads engine source, not
  //     tabular data; enscribe cannot re-read the client-rendered source, so the hint is the only guard).
  {
    const html = renderDoc('<section | S>\n\n<diagram mermaid src="@cv" />', '\n<data>\n<dataset #cv csv>\na,b\n1,2\n</dataset>\n</data>');
    assert.match(html, /asset-error/, 'a csv <dataset> fed into a <diagram mermaid> → visible asset-error');
    assert.ok(html.includes('csv') && html.includes('mermaid'), 'the mismatch error names both the dataset format and the engine');
    console.log('PASS: #313 consumer — diagram format-hint/engine mismatch (csv → mermaid) is a visible error');
  }

  // 23. F2.1 for the new consumers — a bad @id is a VISIBLE error for BOTH <diagram> and <code>.
  {
    const d = renderDoc('<section | S>\n\n<diagram mermaid src="@nope" />', '');
    assert.match(d, /asset-error/, 'diagram @nope → a visible __asset-error');
    assert.ok(d.includes('nope'), 'the diagram error names the bad ref');
    const c = renderDoc('<section | S>\n\n<code src="@nope" />', '');
    assert.match(c, /asset-error/, 'code @nope → a visible __asset-error');
    console.log('PASS: #313 consumer — an unresolved @id is a visible __asset-error for BOTH <diagram> and <code>');
  }

  // 24. cross-kind misuse: <diagram>/<code> referencing an embedded IMAGE (not a dataset) → visible error.
  {
    const IMG = '\n<data>\n<fig #img png>PNGB64</fig>\n</data>';
    const d = renderDoc('<section | S>\n\n<diagram mermaid src="@img" />', IMG);
    assert.match(d, /asset-error/, 'a <diagram> referencing an embedded image → visible error (image is not a dataset)');
    const c = renderDoc('<section | S>\n\n<code src="@img" />', IMG);
    assert.match(c, /asset-error/, 'a <code> referencing an embedded image → visible error (image is not a dataset)');
    console.log('PASS: #313 consumer — cross-kind misuse (diagram/code → image) → visible __asset-error');
  }

  // 25. code language precedence: an explicit `language=` on the <code> WINS over the dataset format hint
  //     (the hint only fills a MISSING language). The bytes render verbatim either way.
  {
    const html = renderDoc('<section | S>\n\n<code language=ruby src="@snip" />', CODE_DS);
    assert.match(html, /<code class="language-ruby">/, 'an explicit language= wins over the dataset format hint');
    assert.ok(!html.includes('language-python'), 'the dataset format hint does not override the explicit language');
    console.log('PASS: #313 consumer — explicit <code language=…> wins; the dataset format hint only fills a missing language');
  }

  // 26. REGRESSION — non-@ diagram/code are untouched: an inline <diagram>/<code> renders identically.
  {
    const d = renderDoc('<section | S>\n\n<diagram mermaid>\ngraph TD\n  X --> Y\n</diagram>', '');
    assert.match(d, /<pre class="mermaid"[^>]*>graph TD/, 'inline <diagram mermaid>…</diagram> still renders (non-@ path untouched)');
    // Non-@ inline code is untouched: verbatim body + language class, exactly as before this slice
    // (resolveCodeSrc fires only on an @-src, so the parser's pipe-capture behavior is unchanged —
    // including its verbatim leading space, which is not this slice's concern).
    const c = renderDoc('<section | S>\n\n<code language=python | print("hi")>', '');
    assert.match(c, /<code class="language-python">\s*print\("hi"\)<\/code>/, 'inline <code | …> still renders with its language class + verbatim body (non-@ path untouched)');
    console.log('PASS: #313 consumer — inline <diagram>/<code> (non-@) are untouched');
  }

  // ══ long-form required: a pipe/bare/slash-form <dataset> is a visible authoring error ══════════════
  //
  // A <dataset>'s payload is its <dataset>…</dataset> BODY. The pipe form <dataset … | bytes> is
  // delimited by the first unescaped `>`, so a payload containing `>` (Mermaid `-->`, JSON, code) is
  // truncated — datasets routinely contain `>`. buildAssetIndex rejects a non-long-form <dataset> as a
  // visible __asset-error and does NOT register it (never a silently-truncated store entry).

  // 27. a short-form (pipe) <dataset> → NOT registered + a visible long-form authoring error, stripped.
  {
    // makeTag defaults to form:'short' — the pipe/bare/slash form the guard rejects (the `dataset()`
    // helper above sets form:'long', the required form; here we exercise the rejected form directly).
    const pipeDs = makeTag('dataset', 'a,b\n1,2', { id: 'd:pipe', positional: ['csv'] });
    assert.equal(pipeDs.form, 'short', 'guard precondition: a makeTag dataset is short-form (pipe/bare/slash)');
    const tree = dataTree(pipeDs);
    const file = makeFile();
    buildAssetIndex(tree, file);
    assert.equal(file.data[ENSCRIBE_ASSETS], undefined, 'a pipe-form <dataset> is NOT registered (never a truncated store entry)');
    const flags = tree.children.filter((n) => n?.tagname === '__asset-error');
    assert.equal(flags.length, 1, 'exactly one visible authoring error is injected');
    assert.match(flags[0].kwargs.message, /must use the long form <dataset>…<\/dataset>/, 'the error tells the author to use the long form');
    assert.match(flags[0].kwargs.message, /#d:pipe/, 'the error names the offending dataset id');
    const dataNode = tree.children.find((n) => n?.tagname === 'data');
    assert.equal(dataNode.content.length, 0, 'the rejected <dataset> is stripped from its <data> block');
    console.log('PASS: dataset — long-form required: a pipe-form <dataset> is a visible error, not a store entry');
  }

  // 28. END-TO-END through the real parser: it marks a pipe-form <dataset> as form:'short', so the guard
  //     fires in the full pipeline; a <table src="@id"> consumer then finds no such data (decl rejected).
  {
    const html = renderDoc('<section | S>\n\n<table src="@pf" />', '\n<data>\n<dataset #pf csv | a,b\n1,2>\n</data>');
    assert.match(html, /must use the long form/, 'end-to-end: a pipe-form <dataset> renders the visible long-form authoring error');
    assert.ok(!/<th>a<\/th>/.test(html), 'end-to-end: the rejected pipe-form dataset was not stored, so the table has no grid');
    console.log('PASS: dataset — long-form required (end-to-end): the real parser + guard reject a pipe-form <dataset>');
  }

  // ══ Option A (code-indentation): <code-block src="@id"> is the whitespace-safe multi-line consumer ══
  //
  // A multi-line dataset rendered through <code-block src="@id"> lands in <pre><code>, where the
  // pretty-printer (formatHtml) preserves the author's indentation byte-for-byte — unlike <code src="@id">
  // (bare <code>), whose multi-line content is reflowed. The dataset is authored long-form (the store rule).
  const CODEBLOCK_DS = '\n<data>\n<dataset #ind python>\ndef f(n):\n    if n:\n        return n * 2\n</dataset>\n</data>';

  // 29. <code-block src="@ind"> → <pre><code> with the 4- and 8-space indentation INTACT in the HTML bytes.
  {
    const html = renderDoc('<section | S>\n\n<code-block src="@ind" />', CODEBLOCK_DS);
    assert.match(html, /<pre><code class="language-python">/, 'code-block-from-dataset: <pre><code> + python class (format hint → language positional)');
    assert.match(html, /\n {4}if n:/, 'code-block-from-dataset: the 4-space indent survives to the HTML bytes (the <pre> path is whitespace-safe)');
    assert.match(html, /\n {8}return n \* 2/, 'code-block-from-dataset: the 8-space indent survives too');
    assert.ok(html.includes('def f(n):'), 'code-block-from-dataset: the body is verbatim');
    console.log('PASS: Option A — <code-block src="@id"> renders a multi-line dataset as <pre><code> with indentation INTACT');
  }

  // 30. <code-block src> wrong-kind (image) and unresolved @id → the SAME visible __asset-error path.
  {
    const e = renderDoc('<section | S>\n\n<code-block src="@img" />', '\n<data>\n<fig #img png>PNGB64</fig>\n</data>');
    assert.match(e, /asset-error/, 'a <code-block> referencing an embedded image → visible error (image is not a <dataset>)');
    const b = renderDoc('<section | S>\n\n<code-block src="@nope" />', '');
    assert.match(b, /asset-error/, 'a <code-block src="@nope"> → visible error');
    console.log('PASS: Option A — <code-block src> wrong-kind / unresolved @id → visible __asset-error');
  }

  // 31. the multi-line-<code> authoring lint (a located build warning; the code still renders).
  //     processSync gives a real VFile whose .messages carry file.message() diagnostics (renderDoc's
  //     stub file has no .message(), so it cannot capture them).
  {
    const fires = (src) => buildEnscribePipeline({}).processSync(src).messages
      .some((m) => /multi-line code in <code>/.test(String(m.reason)));
    assert.ok(fires('<section | S>\n\n<code | a\n    b>'), 'multi-line bare <code | …> warns');
    assert.ok(fires('<section | S>\n\n<code language=py>\ndef f():\n    pass\n</code>'), 'multi-line long-form <code> warns');
    assert.ok(!fires('<section | S>\n\n<code | x = 1>'), 'single-line inline <code> is quiet');
    assert.ok(!fires('<section | S>\n\n<code language=py>\nx = 1\n</code>'), 'single-line long-form <code> is quiet (outer newlines trimmed before the check)');
    assert.ok(!fires('<section | S>\n\n<```py\ndef f():\n    pass\n```>'), 'a code block (```) does NOT warn — it preserves whitespace');
    assert.ok(fires('<section | S>\n\n<code src="@ind" />' + CODEBLOCK_DS), 'a <code src="@id"> that pulled a MULTI-LINE dataset warns (nudge to <code-block>)');
    assert.ok(!fires('<section | S>\n\n<code-block src="@ind" />' + CODEBLOCK_DS), 'a <code-block src="@id"> does NOT warn (the whitespace-safe form)');
    console.log('PASS: Option A — multi-line <code> lint fires (bare / long-form / @id), quiet for single-line + code block');
  }

  // ── #421: a file-path src on <code-block> flags visibly (never a silent empty <pre>) ──
  {
    const mkFile = () => { const w = []; return { data: {}, message: (m) => w.push(String(m)), _warnings: w }; };

    // Empty case: the node converts to the visible asset-error flag + a located warning.
    const empty = makeTag('code-block', null, { kwargs: { src: 'file.js' } });
    empty.content = null;
    const t1 = { type: 'root', children: [empty] };
    const f1 = mkFile();
    enscribeAssetResolution()(t1, f1);
    assert.equal(t1.children[0].tagname, '__asset-error', 'empty file-path src → visible flag');
    assert.match(t1.children[0].kwargs.message, /file-path src is not loaded.*<dataset> via src="@id"/,
      'the flag names the form and points at the mechanism');
    assert.ok(f1._warnings.some((w) => /file-path src is not loaded/.test(w)), 'a located seam warning too');

    // Body case: the body keeps rendering; the ignored src warns only.
    const withBody = makeTag('code-block', null, { kwargs: { src: 'body.js' } });
    withBody.content = 'const x = 1;';
    const t2 = { type: 'root', children: [withBody] };
    const f2 = mkFile();
    enscribeAssetResolution()(t2, f2);
    assert.equal(t2.children[0].tagname, 'code-block', 'a body-bearing node is NOT converted');
    assert.equal(t2.children[0].content, 'const x = 1;', 'the body survives');
    assert.ok(f2._warnings.some((w) => /file-path src is not loaded/.test(w)), 'the ignored src warns');

    // @id srcs are untouched by the new branch (the existing dataset path owns them).
    console.log('PASS: asset-load (#421) — code-block file-path src: visible flag (empty) / warn-only (body)');
  }

  // ── #423: the two sibling consumers flag identically — <diagram src=…> and <code src=…> ──
  {
    const mkFile = () => { const w = []; return { data: {}, message: (m) => w.push(String(m)), _warnings: w }; };

    // <diagram mermaid src="x.mmd" /> with no body → the visible flag + a located warning.
    const dEmpty = makeTag('diagram', null, { kwargs: { src: 'x.mmd' }, positional: ['mermaid'] });
    dEmpty.content = null;
    const td = { type: 'root', children: [dEmpty] };
    const fd = mkFile();
    enscribeAssetResolution()(td, fd);
    assert.equal(td.children[0].tagname, '__asset-error', 'diagram: empty file-path src → visible flag');
    assert.match(td.children[0].kwargs.message, /file-path src is not loaded.*<dataset> via src="@id"/,
      'diagram: the flag names the form and points at the mechanism');
    assert.ok(fd._warnings.some((w) => /file-path src is not loaded/.test(w)), 'diagram: a located seam warning too');

    // <diagram mermaid | graph TD; A-->B> (a body) → keeps rendering; the ignored src warns only.
    const dBody = makeTag('diagram', 'graph TD; A-->B', { kwargs: { src: 'x.mmd' }, positional: ['mermaid'] });
    const td2 = { type: 'root', children: [dBody] };
    const fd2 = mkFile();
    enscribeAssetResolution()(td2, fd2);
    assert.equal(td2.children[0].tagname, 'diagram', 'diagram: a body-bearing node is NOT converted');
    assert.equal(td2.children[0].content, 'graph TD; A-->B', 'diagram: the body survives');
    assert.ok(fd2._warnings.some((w) => /file-path src is not loaded/.test(w)), 'diagram: the ignored src warns');

    // <code src="x.js" /> with no body → the visible flag + a located warning.
    const cEmpty = makeTag('code', null, { kwargs: { src: 'x.js' } });
    cEmpty.content = null;
    const tc = { type: 'root', children: [cEmpty] };
    const fc = mkFile();
    enscribeAssetResolution()(tc, fc);
    assert.equal(tc.children[0].tagname, '__asset-error', 'code: empty file-path src → visible flag');
    assert.match(tc.children[0].kwargs.message, /file-path src is not loaded.*<dataset> via src="@id"/,
      'code: the flag names the form and points at the mechanism');
    assert.ok(fc._warnings.some((w) => /file-path src is not loaded/.test(w)), 'code: a located seam warning too');

    // <code src="x.js" | inline body> → keeps rendering; the ignored src warns only.
    const cBody = makeTag('code', 'inline body', { kwargs: { src: 'x.js' } });
    const tc2 = { type: 'root', children: [cBody] };
    const fc2 = mkFile();
    enscribeAssetResolution()(tc2, fc2);
    assert.equal(tc2.children[0].tagname, 'code', 'code: a body-bearing node is NOT converted');
    assert.equal(tc2.children[0].content, 'inline body', 'code: the body survives');
    assert.ok(fc2._warnings.some((w) => /file-path src is not loaded/.test(w)), 'code: the ignored src warns');
    console.log('PASS: asset-load (#423) — diagram + inline code file-path src: visible flag (empty) / warn-only (body)');

    // Three-way UNIFORMITY: code-block (#421), diagram (#423), code (#423) produce the SAME family
    // behavior on an empty file-path src — same __asset-error tagname, same message shape, same
    // located `asset:unsupported-src` seam warning. One class, one voice.
    const flagOf = (tagname) => {
      const n = makeTag(tagname, null, { kwargs: { src: 'x' }, positional: tagname === 'diagram' ? ['mermaid'] : [] });
      n.content = null;
      const t = { type: 'root', children: [n] };
      const f = mkFile();
      enscribeAssetResolution()(t, f);
      return { tag: t.children[0].tagname, msg: t.children[0].kwargs?.message, warned: f._warnings.some((w) => /asset-load: <.* src=/.test(w)) };
    };
    const family = ['code-block', 'diagram', 'code'].map(flagOf);
    assert.ok(family.every((r) => r.tag === '__asset-error'), 'uniformity: all three convert to __asset-error');
    assert.ok(family.every((r) => /^<[a-z-]+ src="x">: file-path src is not loaded \(by design\) — source a <dataset> via src="@id" \([a-z-]+\.md\)$/.test(r.msg)),
      'uniformity: all three markers share the identical voice (form named + @id mechanism + doc pointer)');
    assert.ok(family.every((r) => r.warned), 'uniformity: all three emit the located asset:unsupported-src seam warning');
    console.log('PASS: asset-load (#421/#423) — the three sibling consumers flag with ONE uniform family voice');
  }

  // 28. #413 L2 — a <fig> with BOTH src= and an inline base64 body: FIRST-WINS (src kept) + both channels.
  {
    const file = makeFile();
    const tree = dataTree(makeTag('fig', [{ type: 'text', value: 'INLINEBASE64' }], { id: 'fig:both', kwargs: { src: 'a.png' } }));
    buildAssetIndex(tree, file);
    // First-wins: the external src is stored; the inline body is ignored (not { base64: 'INLINEBASE64' }).
    assert.deepEqual(file.data[ENSCRIBE_ASSETS].get('fig:both'), { src: 'a.png' }, 'L2: first-wins — src= kept, inline body dropped');
    // Channel 1: a visible duplicate flag naming the conflict.
    const flags = tree.children.filter((n) => n?.tagname === '__asset-error');
    assert.equal(flags.length, 1, 'L2: exactly one duplicate flag');
    assert.match(flags[0].kwargs.message, /both a src= and an inline base64 body.*external src wins/, 'L2: the flag names src-wins over the body');
    // Channel 2: the CLI/console warning.
    assert.ok(file._warnings.some((w) => /<fig #fig:both> declares both src= and a base64 body/.test(w)),
      'L2: a warning names the src+body conflict (second channel)');
    console.log('PASS: #413 L2 — a <fig> with both src= and a body keeps the src (first-wins) and flags the ignored body (both channels)');
  }

  // 29. #413 L3 — a <dataset> with NO format handed to <table src="@id"> naming no format word:
  //     the bytes cannot be parsed as a table → visible flag + warn (both channels), not silent raw-HTML.
  {
    const file = makeFile();
    const tableNode = makeTag('table', null, { kwargs: { src: '@d' }, positional: [] });
    const tree = { type: 'root', children: [makeTag('data', [dataset('d', [{ type: 'text', value: 'a,b\n1,2' }])]), tableNode] };
    buildAssetIndex(tree, file);            // register the dataset (no format hint)
    enscribeAssetResolution()(tree, file);  // resolve the table src → should flag the missing format
    // Channel 1: the table node became a visible __asset-error naming the miss.
    assert.equal(tableNode.tagname, '__asset-error', 'L3: the no-format table becomes a visible __asset-error (not raw HTML)');
    assert.match(tableNode.kwargs.message, /neither names a format \(csv\/tsv\/json\/yaml\/md\)/, 'L3: the flag names the missing format');
    // Channel 2: the CLI/console warning.
    assert.ok(file._warnings.some((w) => /neither the table nor the <dataset> names a format/.test(w)),
      'L3: a warning names the missing format (second channel)');
    console.log('PASS: #413 L3 — a dataset→table with no format on either side flags the miss (both channels), never silent raw-HTML');
  }
}
