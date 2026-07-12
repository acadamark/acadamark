// #404 arc / #417 — transclusion: substitution-before-structure, the assembly half.
//
// The spec's worked examples (notes/specs/master-document.md §Transclusion) become tests here. Phase 0
// established that the assembler already FLAT-SPLICES sourced children (structure marker + child body as
// siblings), so the structuring layer already realizes substitution-before-structure for the one-level
// article/book cases — markers 1, 2, 4 below LOCK IN that already-working behavior. This slice adds the
// two content-placement fixes: pre-first-part content renders on the book cover (#404), and an inline
// website <item | Title> renders instead of crashing (#417). Recursion + cycle detection (the <include>
// "any depth" primitive) is a separate slice.

import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { VFile } from 'vfile';
import { buildEnscribePipeline, assembleMasterDocument, publishBookPages } from '@enscribejs/enscribe';
import { buildStaticWebsite } from '../src/static-website.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// In-memory assembly: children are supplied as a { 'src.emd': 'source' } map, resolved by identity.
function assembleRender(masterSource, children = {}) {
  const proc = buildEnscribePipeline({});
  const tree = assembleMasterDocument({
    source: masterSource,
    readFile: (p) => { if (!(p in children)) throw new Error(`no child "${p}"`); return children[p]; },
    resolve: (rel) => rel,
    parse: (s) => proc.parse(s),
  });
  return String(proc.stringify(proc.runSync(tree, new VFile())));
}

function assembleBookPages(masterSource, children = {}) {
  const proc = buildEnscribePipeline({});
  const file = new VFile({ path: 'master.emd' });
  const tree = assembleMasterDocument({
    source: masterSource, readFile: (p) => children[p], resolve: (r) => r, parse: (s) => proc.parse(s),
  });
  const numbered = proc.runSync(tree, file);
  return publishBookPages({ numbered, file, proc, defaultCss: '' });
}

// The index (in HTML source order) of the first occurrence of `needle`.
const at = (html, needle) => html.indexOf(needle);

export function run_tests() {
  // ── Marker 1: `src=` supplies initial content; it does NOT close the element ──
  // Spec: "The effective content of Section 1 is section1.emd's text FOLLOWED BY `Random text`;
  //        Section 2 peer-closes it." (the deciding worked example)
  {
    const html = assembleRender(
      '<meta type=article title=A />\n\n<section src=s1.emd | Section 1>\n\nRandom text INTER.\n\n<section src=s2.emd | Section 2>\n',
      { 's1.emd': 'Body ALPHA.', 's2.emd': 'Body GAMMA.' },
    );
    assert.ok(html.includes('ALPHA') && html.includes('INTER') && html.includes('GAMMA'), 'marker1: all content present');
    // The child body (ALPHA) and the interstitial (INTER) both precede Section 2's title → both are in Section 1.
    assert.ok(at(html, 'ALPHA') < at(html, 'Section 2') && at(html, 'INTER') < at(html, 'Section 2'),
      'marker1: the interstitial "Random text" joins Section 1 (before Section 2 peer-closes)');
    assert.ok(at(html, 'ALPHA') < at(html, 'INTER'), 'marker1: the child body precedes the interstitial (spliced initial content)');
    console.log('PASS: #404 marker1 — src= splices without closing (section1 + Random text both in Section 1)');
  }

  // ── Marker 2: structure crosses file boundaries — the deepest-open-container ──
  // Spec: a child ending in an OPEN <sub-section> absorbs following master text into that sub-section.
  {
    const html = assembleRender(
      '<meta type=book title=B />\n\n<chapter src=c1.emd | One>\n\nMore master MOREMASTER.\n\n<chapter src=c2.emd | Two>\n',
      { 'c1.emd': 'Intro.\n\n<sub-section | Fine print>\n\nSome fine print.', 'c2.emd': 'Chapter two.' },
    );
    const subs = html.match(/<sub-section\b[\s\S]*?<\/sub-section>/g) || [];
    assert.ok(subs.some((s) => s.includes('MOREMASTER')),
      'marker2: master text after the chapter lands inside the child\'s still-open <sub-section> (deepest open container)');
    console.log('PASS: #404 marker2 — structure crosses the file boundary (deepest-open-container)');
  }

  // ── Marker 2 (other direction): a peer tag inside the child closes a caller-opened element ──
  {
    const html = assembleRender(
      '<meta type=article title=A />\n\n<section | Caller section>\n\nCaller body CALLERBODY.\n\n<section src=s.emd | From child>\n',
      { 's.emd': 'Child section body CHILDBODY.' },
    );
    // The child's <section> peer-closes the caller's section: CALLERBODY is in section 1, CHILDBODY in section 2.
    assert.ok(at(html, 'CALLERBODY') < at(html, 'From child') && at(html, 'From child') < at(html, 'CHILDBODY'),
      'marker2: the spliced <section> peer-closes the caller-opened section (file boundary invisible to peer-close)');
    console.log('PASS: #404 marker2 — a peer tag inside the child closes a caller-opened element');
  }

  // ── Marker 4: numbering follows the assembled ancestry (an interlude figure numbers within its chapter) ──
  // Spec: "a figure in an interlude between chapters 3 and 4 is chapter 3's figure (figure 3.N)".
  {
    const html = assembleRender(
      '<meta type=book title=B />\n<config number-figures=true counter-reset-scope=chapter />\n\n' +
      '<chapter src=c1.emd | One>\n\n<figure #fig:i src=x.png | Interlude figure.>\n\n<chapter src=c2.emd | Two>\n',
      { 'c1.emd': 'Chapter one.', 'c2.emd': 'Chapter two.' },
    );
    assert.ok(/Figure 1\.1\./.test(html),
      'marker4: the interlude figure numbers within the PRECEDING chapter (figure 1.1, LaTeX-consistent)');
    console.log('PASS: #404 marker4 — interstitial numbering follows assembled ancestry (figure 1.1)');
  }

  // ── #404 marker 3: content BEFORE the first part renders on the book cover (separate-pages) ──
  // Spec: "content before the first part belongs to the book's front region"; projection equivalence
  // means it renders on the front region's page (the cover) in a separate-pages build — not dropped.
  {
    const pages = assembleBookPages(
      '<meta type=book title=B />\n\nFront matter PREFIRST before any chapter.\n\n<chapter src=c1.emd | One>\n\n<chapter src=c2.emd | Two>\n',
      { 'c1.emd': 'Chapter one.', 'c2.emd': 'Chapter two.' },
    );
    const cover = pages.get('index.html');
    assert.ok(cover && cover.includes('PREFIRST'),
      '#404: pre-first-part content renders on the cover page in a separate-pages build (was dropped)');
    console.log('PASS: #404 marker3 — pre-first-part content renders on the book cover (separate-pages)');
  }

  // ── #404 arc's first proof: a separate-pages book with an interlude renders the interlude on the
  //    PRECEDING chapter's page, WITH its anchor present (content-dropped → content-placed) ──
  {
    const pages = assembleBookPages(
      '<meta type=book title=B />\n\n<chapter src=c1.emd | One>\n\nInterlude INTERLUDEMARK.\n\n' +
      '<figure #fig:il src=x.png | An interlude figure.>\n\n<chapter src=c2.emd | Two>\n',
      { 'c1.emd': 'Chapter one.', 'c2.emd': 'Chapter two.' },
    );
    // publishBookPages keys chapter pages by slug; find the page carrying the interlude.
    const owner = [...pages.entries()].find(([k, v]) => k !== 'index.html' && v.includes('INTERLUDEMARK'));
    assert.ok(owner, '#404: the interlude renders on a chapter page (not dropped)');
    assert.ok(owner[1].includes('fig:il'), '#404: the interlude figure\'s anchor (#fig:il) is present on that page');
    assert.ok(/1-one|one/.test(owner[0]), '#404: the interlude renders on the PRECEDING chapter\'s page (chapter one)');
    console.log('PASS: #404 arc — a separate-pages interlude renders on the preceding chapter page WITH its anchor');
  }

  // ── #417: an inline website `<item | Title>` builds (no TypeError) and its body is the page ──
  {
    const master =
      '<meta type=website title="My Site" />\n\n<nav>\n<item | Home>\n\nWelcome text WELCOMEBODY.\n\n<item src=about.emd | About>\n</nav>\n';
    // masterDir must exist for the resolver; the inline page reads no child (zero-length splice).
    const { pages, warnings } = buildStaticWebsite({
      masterSource: master, masterDir: join(__dirname, 'fixtures'), defaultCss: '/* css */',
    });
    const home = pages.get('index.html');
    assert.ok(home, '#417: the inline-item website builds (no TypeError in resolvePageSource)');
    assert.ok(home.includes('WELCOMEBODY'), '#417: the inline item\'s body renders as its page content (zero-length-splice)');
    assert.ok(!warnings.some((w) => /TypeError|undefined/.test(w)), '#417: no TypeError-shaped warning');
    console.log('PASS: #417 — an inline <item | Title> website page builds and carries its body (no crash)');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) run_tests();
