// Tests for the asset-load plugin (the embedded-asset twin of library-load) — the missing unit
// peer (#316/1-K), and the duplicate-asset-id last-wins proof (#316/1-I).
//
// Covers buildAssetIndex: harvesting embedded `<fig #id fmt>base64</fig>` and external
// `<fig #id src>` declarations from `<data>` into file.data.enscribeAssets (and stripping them);
// the no-#id warning; and the DUPLICATE-ID collision — last declaration wins + a visible
// `__asset-error` flag (matching the pinned-slug / duplicate-citation-key policy: keep one, warn,
// never a silent overwrite). Plus the makeAssetError / assetError node shapes.

import assert from 'node:assert/strict';
import { buildAssetIndex, makeAssetError, assetError, resolveAssetReference } from '../../src/interpreter/plugins/asset-load.js';
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
// #313 slice 1: a <dataset> node — opaque content is a raw STRING (contentHandler 'dataset').
// `kw` carries { kwargs } / { positional } to exercise both format forms.
const dataset = (id, content, kw = {}) => makeTag('dataset', content, { id, ...kw });

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

  // 3. a <fig> in <data> with no #id → warns and is LEFT in place (not registered as an asset).
  {
    const tree = dataTree(makeTag('fig', [{ type: 'text', value: 'X' }], { positional: ['png'] }));
    const file = makeFile();
    buildAssetIndex(tree, file);
    assert.equal(file.data[ENSCRIBE_ASSETS], undefined, 'no id → nothing registered');
    assert.ok(file._warnings.some((w) => /no #id/.test(w)), 'a no-#id warning is emitted');
    assert.equal(tree.children[0].content.length, 1, "the un-id'd <fig> is left in <data>");
    console.log('PASS: asset-load — a <fig> with no #id warns and is left in place');
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

  // 7. <dataset #id format=csv | bytes> → indexed as { format, content }; the decl is stripped from <data>.
  {
    const tree = dataTree(dataset('d1', 'name,note\nalpha,2', { kwargs: { format: 'csv' } }));
    const file = makeFile();
    buildAssetIndex(tree, file);
    const store = file.data[ENSCRIBE_ASSETS];
    assert.ok(store instanceof Map && store.has('d1'), 'the dataset is indexed in the (shared) data store');
    assert.deepEqual(store.get('d1'), { format: 'csv', content: 'name,note\nalpha,2' }, 'format + opaque content captured');
    assert.equal(tree.children[0].content.length, 0, 'the harvested <dataset> is stripped from its <data> block');
    console.log('PASS: dataset (#313) — <dataset #id format=csv | …> indexed as { format, content } and stripped');
  }

  // 8. the content is OPAQUE: a #/*/_ passes through untouched, a JSON {…} keeps its braces, and ONLY the
  //    outer (pipe-delimiter) whitespace is trimmed — internal indentation survives.
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

  // 9. the leading-positional format form (<dataset #id tsv | …>) — mirrors <library bibtex | …>.
  {
    const tree = dataTree(dataset('d:t', 'a\tb', { positional: ['tsv'] }));
    const file = makeFile();
    buildAssetIndex(tree, file);
    assert.deepEqual(file.data[ENSCRIBE_ASSETS].get('d:t'), { format: 'tsv', content: 'a\tb' }, 'positional format hint captured');
    console.log('PASS: dataset (#313) — leading-positional format (<dataset #id tsv | …>) captured');
  }

  // 10. a <dataset> with no #id → warns and is LEFT in place (not registered), like a no-#id <fig>.
  {
    const tree = dataTree(dataset(null, 'x,y', { kwargs: { format: 'csv' } }));
    const file = makeFile();
    buildAssetIndex(tree, file);
    assert.equal(file.data[ENSCRIBE_ASSETS], undefined, 'no id → nothing registered');
    assert.ok(file._warnings.some((w) => /<dataset> in <data> has no #id/.test(w)), 'a no-#id warning names <dataset>');
    assert.equal(tree.children[0].content.length, 1, "the un-id'd <dataset> is left in <data>");
    console.log('PASS: dataset (#313) — a <dataset> with no #id warns and is left in place');
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
      '<dataset #d:e2e csv | name,note',
      'alpha,*bold* _em_ #h1',
      'beta,2>',
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
  const DATASET = '\n<data>\n<dataset #d1 csv | name,note\nalpha,*bold* #h1\nbeta,2>\n</data>';

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
  const CODE_DS = '\n<data>\n<dataset #snip python | def scale(n):\n    return n * 2>\n</data>';

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
    const litHtml = renderDoc('<section | S>\n\n<code src="@lit" />', '\n<data>\n<dataset #lit | # not a heading *not em*>\n</data>');
    assert.ok(litHtml.includes('# not a heading *not em*'), 'code-from-dataset: #/* render literally in the code body');
    assert.ok(!/<em>|<strong>|<h1/.test(litHtml.replace(/language-[a-z]+/g, '')), 'code-from-dataset: no markdown elements (opaque end to end)');
    console.log('PASS: #313 consumer — <code src="@snip"> renders a <dataset> as a verbatim, opaque code body');
  }

  // 22. diagram FORMAT-HINT / ENGINE mismatch → a visible asset-error (a diagram reads engine source, not
  //     tabular data; enscribe cannot re-read the client-rendered source, so the hint is the only guard).
  {
    const html = renderDoc('<section | S>\n\n<diagram mermaid src="@cv" />', '\n<data>\n<dataset #cv csv | a,b\n1,2>\n</data>');
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
}
