// Tests for the bibliography plugin.
//
// Covers:
//   - Auto-placement: __bibliography appended to article-back when no author-placed tag
//   - Author-placed: <bibliography> in article-back replaced with __bibliography
//   - Empty order: no citations resolved → no bibliography generated
//   - Author-placed removed when order is empty
//   - id="ref-KEY" injected into bibliography entries (regex transform)
//   - article-back created if it doesn't exist (auto-placement)

import assert from 'node:assert/strict';
import Cite from 'citation-js';
import { enscribeBibliography } from '../../src/interpreter/plugins/bibliography.js';
import { makeTag } from '../../src/core/tag.js';
import { isEnscribeTag } from '../../src/interpreter/lib/ast-helpers.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFile(citeInstance, order = [], style = 'chicago-author-date') {
  const _messages = [];
  return {
    data: {
      enscribeCitations: { cite: citeInstance, order, style },
    },
    // #413 L7: capture the second channel (the CLI/console warning) so tests can assert it.
    message: (m) => _messages.push(String(m)),
    _messages,
  };
}

function makeFileNoCitations() {
  return { data: {} };
}

/** Build an article tree with optional article-back and optional back children. */
function makeArticleTree({ backChildren = null } = {}) {
  const body = makeTag('article-body', []);
  const front = makeTag('article-front', []);
  const articleContent = [front, body];
  if (backChildren !== null) {
    const back = makeTag('article-back', backChildren);
    articleContent.push(back);
  }
  const article = makeTag('article', articleContent);
  return { type: 'root', children: [article] };
}

function getArticleBack(tree) {
  const article = tree.children[0];
  return article.content.find(n => isEnscribeTag(n, 'article-back'));
}

const TEST_BIBTEX = `
@article{Smith2020,
  author  = {Smith, John},
  title   = {A Study},
  journal = {Journal},
  year    = {2020}
}
@article{Jones2019,
  author  = {Jones, Kate},
  title   = {Another Study},
  journal = {Science},
  year    = {2019}
}
`.trim();

// ─── Tests ────────────────────────────────────────────────────────────────────

export function run() {

  // --- Auto-placement: __bibliography appended to article-back ---
  {
    const cite = new Cite(TEST_BIBTEX);
    const file = makeFile(cite, ['Smith2020']);
    const tree = makeArticleTree({ backChildren: [] });
    enscribeBibliography()(tree, file);

    const back = getArticleBack(tree);
    assert.ok(back, 'article-back present');
    assert.equal(back.content.length, 1, 'one node in article-back');
    assert.equal(back.content[0].tagname, '__bibliography', '__bibliography appended');
    assert.ok(back.content[0].kwargs.headingHtml.includes('References'), 'heading HTML present');
    assert.ok(back.content[0].kwargs.bibBodyHtml.includes('Smith'), 'bibliography body HTML present');
    console.log('PASS: bibliography: auto-placement in article-back');
  }

  // --- #23: bibliography-heading config override (default + override + escaping) ---
  {
    // Default (no config) → "References".
    const file = makeFile(new Cite(TEST_BIBTEX), ['Smith2020']);
    const tree = makeArticleTree({ backChildren: [] });
    enscribeBibliography()(tree, file);
    assert.equal(getArticleBack(tree).content[0].kwargs.headingHtml,
      '<h2>References</h2>', 'default heading is References');

    // <config bibliography-heading="Works Cited"> → that text.
    const file2 = makeFile(new Cite(TEST_BIBTEX), ['Smith2020']);
    file2.data.enscribeConfig = new Map([['bibliography-heading', 'Works Cited']]);
    const tree2 = makeArticleTree({ backChildren: [] });
    enscribeBibliography()(tree2, file2);
    assert.equal(getArticleBack(tree2).content[0].kwargs.headingHtml,
      '<h2>Works Cited</h2>', 'config overrides the heading text');

    // HTML in the override is escaped (the heading is emitted raw).
    const file3 = makeFile(new Cite(TEST_BIBTEX), ['Smith2020']);
    file3.data.enscribeConfig = new Map([['bibliography-heading', 'Refs <b>&</b>']]);
    const tree3 = makeArticleTree({ backChildren: [] });
    enscribeBibliography()(tree3, file3);
    assert.equal(getArticleBack(tree3).content[0].kwargs.headingHtml,
      '<h2>Refs &lt;b&gt;&amp;&lt;/b&gt;</h2>', 'override text is HTML-escaped');

    console.log('PASS: bibliography: bibliography-heading config override (default / override / escaped)');
  }

  // --- article-back created if absent ---
  {
    const cite = new Cite(TEST_BIBTEX);
    const file = makeFile(cite, ['Jones2019']);
    const tree = makeArticleTree({ backChildren: null }); // no article-back
    enscribeBibliography()(tree, file);

    const back = getArticleBack(tree);
    assert.ok(back, 'article-back created');
    assert.equal(back.content[0].tagname, '__bibliography', '__bibliography created and placed');
    console.log('PASS: bibliography: article-back created when absent');
  }

  // --- Author-placed <bibliography> in article-back is replaced ---
  {
    const cite = new Cite(TEST_BIBTEX);
    const file = makeFile(cite, ['Smith2020']);
    // Author placed an explicit <bibliography> in article-back.
    const explicitBibTag = makeTag('bibliography');
    const tree = makeArticleTree({ backChildren: [explicitBibTag] });
    enscribeBibliography()(tree, file);

    const back = getArticleBack(tree);
    assert.equal(back.content.length, 1, 'still one node after replacement');
    assert.equal(back.content[0].tagname, '__bibliography', 'author-placed tag replaced');
    // Original makeTag object should be gone.
    assert.notEqual(back.content[0], explicitBibTag, 'original placeholder node replaced');
    console.log('PASS: bibliography: author-placed <bibliography> replaced');
  }

  // --- Author-placed preserved at same index (not moved to end) ---
  {
    const cite = new Cite(TEST_BIBTEX);
    const file = makeFile(cite, ['Smith2020']);
    // note-list before bibliography.
    const noteList = makeTag('note-list');
    const explicitBibTag = makeTag('bibliography');
    const tree = makeArticleTree({ backChildren: [noteList, explicitBibTag] });
    enscribeBibliography()(tree, file);

    const back = getArticleBack(tree);
    assert.equal(back.content.length, 2, 'two nodes in back');
    assert.equal(back.content[0].tagname, 'note-list', 'note-list still at index 0');
    assert.equal(back.content[1].tagname, '__bibliography', '__bibliography at index 1 (author position)');
    console.log('PASS: bibliography: author-placed position preserved');
  }

  // --- Empty order: no bibliography generated, no-op ---
  {
    const cite = new Cite(TEST_BIBTEX);
    const file = makeFile(cite, []); // empty order
    const tree = makeArticleTree({ backChildren: [] });
    enscribeBibliography()(tree, file);

    const back = getArticleBack(tree);
    assert.equal(back.content.length, 0, 'no bibliography when order empty');
    console.log('PASS: bibliography: no-op when order is empty');
  }

  // --- #413 L7: author-placed <bibliography> with no citations → empty-References PLACEHOLDER + warn ---
  // (was: silently removed — assert content.length === 0. The doctrine: a produces-nothing AUTHORED
  //  placement element leaves a visible placeholder + a warning, never a silent splice-out.)
  {
    const cite = new Cite(TEST_BIBTEX);
    const file = makeFile(cite, []); // no citations resolved
    const explicitBibTag = makeTag('bibliography');
    const tree = makeArticleTree({ backChildren: [explicitBibTag] });
    enscribeBibliography()(tree, file);

    const back = getArticleBack(tree);
    // Channel 1: the placeholder is present (not removed) — a __bibliography node keeping the heading.
    assert.equal(back.content.length, 1, 'L7: an authored empty <bibliography> leaves a visible placeholder (not removed)');
    assert.equal(back.content[0].tagname, '__bibliography', 'L7: the placeholder is a __bibliography node (keeps the References heading)');
    assert.match(back.content[0].kwargs.bibBodyHtml, /No citations resolved/, 'L7: the placeholder body names the empty state');
    // Channel 2: the CLI/console warning fired.
    assert.ok(file._messages.some((m) => /authored <bibliography> resolved no citations/.test(m)),
      'L7: a warning names the empty authored bibliography (second channel)');
    console.log('PASS: #413 L7 — an authored empty <bibliography> renders an empty-References placeholder + warns (both channels)');
  }

  // --- #413 L7: the DEFAULT no-cites path (no <bibliography> authored) still renders NOTHING ---
  {
    const cite = new Cite(TEST_BIBTEX);
    const file = makeFile(cite, []); // no citations resolved
    const tree = makeArticleTree({ backChildren: [] }); // author wrote NO bibliography
    enscribeBibliography()(tree, file);
    const back = getArticleBack(tree);
    assert.equal(back.content.length, 0, 'L7: no placeholder when the author wrote no <bibliography> (gated on authored)');
    assert.equal(file._messages.length, 0, 'L7: no warning when nothing was authored');
    console.log('PASS: #413 L7 — the default (unauthored) no-cites path stays silent');
  }

  // --- No citations: no-op ---
  {
    const file = makeFileNoCitations();
    const tree = makeArticleTree({ backChildren: [] });
    enscribeBibliography()(tree, file);

    const back = getArticleBack(tree);
    assert.equal(back.content.length, 0, 'no bibliography when no citations loaded');
    console.log('PASS: bibliography: no-op when no citations loaded at all');
  }

  // --- id="ref-KEY" injected into bibliography entries ---
  {
    const cite = new Cite(TEST_BIBTEX);
    const file = makeFile(cite, ['Smith2020', 'Jones2019']);
    const tree = makeArticleTree({ backChildren: [] });
    enscribeBibliography()(tree, file);

    const back = getArticleBack(tree);
    const bibNode = back.content[0];
    const html = bibNode.kwargs.bibBodyHtml;

    // Each entry should have id="ref-KEY" injected.
    assert.ok(html.includes('id="ref-Smith2020"'), 'id="ref-Smith2020" injected');
    assert.ok(html.includes('id="ref-Jones2019"'), 'id="ref-Jones2019" injected');
    // data-csl-entry-id should still be present alongside.
    assert.ok(html.includes('data-csl-entry-id="Smith2020"'), 'data-csl-entry-id preserved');
    console.log('PASS: bibliography: id="ref-KEY" injected into entries');
  }
}
