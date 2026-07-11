// #133 — <library src> external-source loading, both runtimes. Deterministic: no
// live network — the CLI/build path reads a local fixture file, and the browser
// path (renderAsync) runs against a stubbed global.fetch + document.
//
// Demonstrated via buildEnscribePipeline (the real assembly), not the doc39 hand-
// assembled pattern.

import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildEnscribePipeline, ENSCRIBE_LOADED_SOURCES } from '../src/interpreter/index.js';
import { renderAsync } from '../src/interpreter/browser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, 'fixtures', 'assets');

const html = (src, opts = {}) => String(buildEnscribePipeline(opts).processSync(src));
// Simulate the async pre-load (browser/CLI) by handing buildCitationIndex a
// loaded-sources map on file.data, exactly as renderAsync / the CLI command do.
const htmlWithLoaded = (src, loaded, opts = {}) =>
  String(buildEnscribePipeline(opts).processSync({ value: src, data: { [ENSCRIBE_LOADED_SOURCES]: loaded } }));

const BIB_A = '@article{KeyA, title={Title A}, author={Ann Author}, year={2020}, journal={J}}';
const BIB_B = '@article{KeyB, title={Title B}, author={Bob Writer}, year={2021}, journal={J}}';
const docWithSrc = (src, cite = '@KeyA') =>
  `<meta type=article>\n  <title | T>\n</meta>\n\nBody.<cite ${cite}>\n\n<bibliography></bibliography>\n\n<data>\n<library src="${src}" />\n</data>`;

export async function run() {
  // ── <library src="local"> via the CLI/build path (assetsDir read) ───────────
  {
    const out = html(docWithSrc('references.bib', '@Loomes2017'), { assetsDir: ASSETS });
    assert.ok(!out.includes('??cite'), 'CLI local file: citation resolves');
    assert.ok(/<(section|div)[^>]*bibliograph|class="csl-/.test(out) || out.includes('Loomes'), 'CLI local file: bibliography renders the loaded entry');
    assert.ok(!out.includes('enscribe-library-error'), 'CLI local file: no error');
    assert.ok(!out.includes('<library') && !out.includes('references.bib'), '<library src> renders nothing visible');
    console.log('PASS: #133 — <library src="local"> (CLI/build) populates the registry; citation resolves');
  }

  // ── <library src="https://…"> via a pre-loaded map (the renderAsync/CLI path) ─
  {
    const out = htmlWithLoaded(docWithSrc('https://example.com/refs.bib'), {
      'https://example.com/refs.bib': { content: BIB_A },
    });
    assert.ok(!out.includes('??cite') && out.includes('Title A'), 'preloaded URL: citation resolves, entry in bibliography');
    console.log('PASS: #133 — <library src="https://…"> (pre-loaded) populates the registry');
  }

  // ── browser renderAsync against a stubbed fetch + document ───────────────────
  {
    const origFetch = global.fetch;
    const origDoc = global.document;
    global.document = { baseURI: 'https://example.com/article/' };
    global.fetch = async (url) => {
      assert.ok(String(url).includes('refs.bib'), 'fetch called with the resolved URL');
      return { ok: true, status: 200, statusText: 'OK', text: async () => BIB_A };
    };
    try {
      const out = await renderAsync(docWithSrc('refs.bib'));
      assert.ok(!out.includes('??cite') && out.includes('Title A'), 'renderAsync: fetched source resolves the citation');
      assert.ok(!out.includes('enscribe-library-error'), 'renderAsync: no error on success');
    } finally {
      global.fetch = origFetch;
      global.document = origDoc;
    }
    console.log('PASS: #133 — browser renderAsync fetches the source (mocked) and resolves');
  }

  // ── one inline + one src <library> merge ────────────────────────────────────
  {
    const src =
      `<meta type=article>\n  <title | T>\n</meta>\n\nA<cite @KeyA> and B<cite @KeyB>.\n\n<bibliography></bibliography>\n\n` +
      `<data>\n<library | ${BIB_A}>\n<library src="https://x/b.bib" />\n</data>`;
    const out = htmlWithLoaded(src, { 'https://x/b.bib': { content: BIB_B } });
    assert.ok(out.includes('Title A') && out.includes('Title B'), 'inline + src libraries merge (both entries present)');
    console.log('PASS: #133 — inline <library> + <library src> merge into one registry');
  }

  // ── key collision → deterministic last-wins + visible flag ──────────────────
  {
    const dupA2 = '@article{KeyA, title={Title A SECOND}, author={Zed}, year={2099}, journal={J}}';
    const src =
      `<meta type=article>\n  <title | T>\n</meta>\n\nA<cite @KeyA>.\n\n<bibliography></bibliography>\n\n` +
      `<data>\n<library | ${BIB_A}>\n<library src="https://x/dup.bib" />\n</data>`;
    const out = htmlWithLoaded(src, { 'https://x/dup.bib': { content: dupA2 } });
    assert.ok(out.includes('enscribe-library-error') && out.includes('duplicate citation key'), 'collision shows a visible flag');
    assert.ok(out.includes('Title A SECOND'), 'collision is deterministic last-wins');
    console.log('PASS: #133 — duplicate key across sources → last-wins + visible flag');
  }

  // ── unreachable / load error → visible inline error; document still renders ──
  {
    const out = htmlWithLoaded(docWithSrc('https://example.com/missing.bib'), {
      'https://example.com/missing.bib': { error: 'HTTP 404 Not Found' },
    });
    assert.ok(out.includes('enscribe-library-error') && out.includes('404'), 'load failure renders a visible error naming the source');
    assert.ok(out.includes('<p>Body.'), 'the document still renders around the error');
    console.log('PASS: #133 — unreachable source → visible inline error; document still renders');
  }

  // ── <library> inside <config> → visible flag ────────────────────────────────
  {
    const out = html(`<config>\n<library | ${BIB_A}>\n</config>\n\nBody.`);
    assert.ok(out.includes('enscribe-library-error') && out.includes('not allowed inside'), '<library> inside <config> is flagged visibly');
    assert.ok(out.includes('inside a &#x3C;data> block'), 'the flag says where a library belongs');
    console.log('PASS: #133 — <library> inside <config> → visible flag');
  }

  // ── #410: a bare body <library> is NOT loaded → visible flag + cite-count hint ──
  {
    const src = `Supported by <cite a1> and <cite a2>.\n\n<library | ${BIB_A}>`;
    const out = html(src);
    assert.ok(out.includes('enscribe-library-error') && out.includes('loads only from inside a &#x3C;data> block'),
      'bare body <library> renders the misplacement flag naming where a library belongs');
    assert.ok(out.includes('2 citations in this document cannot resolve against it'),
      'the flag carries the hint — the document’s cite count, at the true cause');
    assert.ok(out.includes('??cite: a1??') && out.includes('??cite: a2??'),
      'the cites still render their own markers (the #395 behavior, now attributable)');
    console.log('PASS: #410 — bare body <library> → misplacement flag + cite-count hint');
  }

  // ── #410: singular hint; no hint when the document has no cites ─────────────
  {
    const one = html(`One <cite a1>.\n\n<library | ${BIB_A}>`);
    assert.ok(one.includes('1 citation in this document cannot resolve'), 'singular cite count');
    const none = html(`No cites here.\n\n<library | ${BIB_A}>`);
    assert.ok(none.includes('loads only from inside a &#x3C;data> block') && !none.includes('cannot resolve against it'),
      'no cites → flag without the count clause');
    console.log('PASS: #410 — hint pluralization; count omitted with no cites');
  }

  // ── #410: a data-placed <library> loads with NO flag (the sanctioned shape) ──
  {
    const out = html(`Supported by <cite KeyA>.\n\n<data>\n<library | ${BIB_A}>\n</data>`);
    assert.ok(!out.includes('enscribe-library-error'), 'no misplacement flag for the canonical <data><library> shape');
    assert.ok(!out.includes('??cite: KeyA??'), 'the cite resolves');
    console.log('PASS: #410 — <data>-placed library loads flag-free');
  }
}
