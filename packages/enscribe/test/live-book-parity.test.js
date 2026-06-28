// Live app-shell book render — parity + chapter-as-page routing (live track, L2 — #208).
//
// The slice's load-bearing gate: the LIVE per-chapter render is the SAME renderChapter
// running over the SAME global pass as the static publisher (P1, #205), so its chapter
// CONTENT must match P1's published page content for the same chapter — the ONLY
// legitimate difference being the href scheme (P1 rewrites cross-chapter refs to
// `owner.html#anchor`; the live VIEW rewrites them to the `?chapter=<owner>#anchor` route;
// the bare renderLiveChapterCONTENT keeps `#anchor`, the parity target). Asserted by
// reverting P1's cross-page rewrite and matching the live CONTENT byte-for-byte, for
// every chapter. If it ever diverges, the live path drifted from the publish path and
// that is a bug to surface — both ride book-scaffold's shared id/slug stems precisely so
// this holds by construction (L1 render-chapter-parity, reused).
//
// Also pins the chapter-as-page ROUTER (the genuinely new surface): the chapter comes from
// the `?chapter=` QUERY and the hash is PURELY the section anchor — they no longer compete.
// resolveRoute(chapter, hash): a known stem → that chapter (the hash is its section anchor);
// no chapter → the cover (a stray section hash falls back to its OWNING chapter via idToStem);
// an unknown stem → a no-op. The live VIEW rewrites a cross-chapter ref to the owning chapter's
// `?chapter=<stem>#anchor` route (so it switches chapters), an in-chapter ref stays bare `#id`.

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { VFile } from 'vfile';
import {
  buildEnscribePipeline,
  assembleMasterDocument,
  publishBookPages,
  buildLiveBook,
  renderLiveChapterContent,
  renderLiveChapterView,
  renderLiveChapterPreviewBody,
  renderLiveChapterEditView,
  renderLiveCoverView,
  resolveRoute,
  extractBookPart,
} from '../src/interpreter/index.js';
import { coverBodyHtml } from '../src/master-document/book-scaffold.js';
import { SCROLL_SPY_JS } from '../src/interpreter/assets/scroll-spy-asset.js';
import { ON_THIS_PAGE_JS } from '../src/interpreter/assets/on-this-page-asset.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, 'fixtures');
const BOOK_DIR = join(FIXTURES_DIR, 'master-book');
// The SAME default.css render-fixtures.js / the P1 parity suite use, so the P1 pages
// built here match the published shape (the chrome is byte-stable; we compare CONTENT).
const DEFAULT_CSS = readFileSync(join(__dirname, '..', 'src', 'interpreter', 'assets', 'default.css'), 'utf8');

// The page body past the inlined default.css (which mentions `<book-part>` in a comment),
// so extractBookPart matches the real chapter, not the stylesheet. (From P1's suite.)
const bodyOf = (html) => { const i = html.indexOf('</style>'); return i === -1 ? html : html.slice(i + '</style>'.length); };
// Revert a P1 cross-page ref href (`owner-slug.html#anchor`) back to its in-page form
// (`#anchor`) — the chapter content's only `.html#` hrefs are the cross-page rewrites.
const revertCrossPage = (s) => s.replace(/href="[a-z0-9-]+\.html#/g, 'href="#');

function buildNumbered(proc, file) {
  const tree = assembleMasterDocument({
    source: readFileSync(join(BOOK_DIR, 'master-book.emd'), 'utf8'),
    readFile: (p) => readFileSync(p, 'utf8'),
    resolve: (rel) => join(BOOK_DIR, rel),
    parse: (s) => proc.parse(s),
  });
  return proc.runSync(tree, file);
}

export async function run() {
  // The cheap global pass (assemble + runSync; numbers + resolves refs, no render). An
  // explicit VFile so file.data.enscribeRegistry is reachable for the harvest.
  const proc = buildEnscribePipeline({ assetsDir: join(FIXTURES_DIR, 'assets') });
  const file = new VFile({ path: 'master-book.emd' });
  const numbered = buildNumbered(proc, file);

  // P1's static pages (publishBookPages mutates the mdast: book-part + sub-section ids).
  const pages = publishBookPages({ numbered, file, proc, defaultCss: DEFAULT_CSS });
  // The live model over the SAME numbered tree: id assignment is idempotent (ids already
  // set by P1) and the slug stems re-derive identically, so the live path sees exactly
  // the ids P1 rendered from — the precondition for content parity.
  const model = buildLiveBook({ numbered, file });
  const ctx = { proc, file };

  assert.ok(model.parts.length >= 4, 'master-book has preface + 2 chapters + appendix');

  // ── PARITY: live chapter CONTENT == P1 page content (only diff is the href scheme) ──
  {
    for (const part of model.parts) {
      const pageName = `${part.stem}.html`;
      const page = pages.get(pageName);
      assert.ok(page, `a P1 page exists for chapter stem "${part.stem}"`);
      const p1Content = extractBookPart(bodyOf(page));
      const liveContent = renderLiveChapterContent(part, model, ctx);
      assert.strictEqual(revertCrossPage(p1Content), liveContent,
        `${part.stem}: live chapter content is byte-identical to P1's page content with the cross-page href rewrite reverted`);
    }
    console.log(`PASS: L2 — all ${model.parts.length} live chapter renders == P1 page content (only the href scheme differs)`);
  }

  // ── the live VIEW carries C's chrome with ?chapter= route hrefs + routes cross-chapter refs ──
  {
    const ch2Idx = model.stemToIndex.get('estimating-browse-pressure');
    const view = renderLiveChapterView(model, ch2Idx, ctx);
    assert.ok(/<nav class="enscribe-toc enscribe-chapter-rail"/.test(view),
      'the live view carries the left chapter rail');
    assert.ok(view.includes('<a href="?chapter=counting-elephants"'),
      'the rail links chapters by the ?chapter= route (standalone: no ?page=), not a hash');
    assert.ok(/class="enscribe-chapter-(prev|next)"/.test(view),
      'the live view carries a prev/next chapter bar');
    // fig:transect is owned by chapter 1 (counting-elephants); a cross-chapter ref in chapter 2 is
    // rewritten to the owning chapter's ROUTE + the section anchor, so clicking it switches chapters.
    assert.ok(view.includes('<a href="?chapter=counting-elephants#fig:transect" class="ref">figure 1.1</a>'),
      'a cross-chapter ref becomes the owning chapter route + section anchor (?chapter=<owner>#<id>)');
    assert.ok(!view.includes('.html#fig:transect'),
      'the live view does NOT cross-page-rewrite refs to a .html file (that is P1\'s separate-files concern)');
    console.log('PASS: L2 — live view = renderChapter + C\'s chrome with ?chapter= routes; cross-chapter refs route to the owning chapter + section');
  }

  // ── EDIT-PREVIEW RAIL PARITY: the edit preview ships read mode's live-rail scripts ──────
  // The book edit preview's on-this-page / scroll-spy rail must spy EXACTLY like read mode.
  // That holds only if the preview pane carries the SAME rail scripts read mode ships AND they
  // ride INSIDE the preview body — because the browser edit loop runs executeAssets on the
  // PREVIEW PANE only (on first mount AND each debounced re-render), never on the whole edit
  // view. A script appended to the edit view OUTSIDE the pane is never executed (the dead-script
  // bug this guards: scrollspy worked in read mode but the edit preview rail stayed un-spied).
  {
    const idx = model.stemToIndex.get('counting-elephants');
    const readView = renderLiveChapterView(model, idx, ctx);
    const previewBody = renderLiveChapterPreviewBody(model, idx, ctx);
    const editView = renderLiveChapterEditView(model, idx, ctx);
    const occurrences = (s, sub) => s.split(sub).length - 1;

    // read mode is the authority: it ships both rail scripts.
    assert.ok(readView.includes(SCROLL_SPY_JS) && readView.includes(ON_THIS_PAGE_JS),
      'read mode chapter view ships the scroll-spy + on-this-page scripts (the authority)');

    // the edit PREVIEW BODY — the unit re-rendered on each edit — ships the SAME scripts, so the
    // rail re-arms after every edit and spies like read mode.
    assert.ok(previewBody.includes(SCROLL_SPY_JS) && previewBody.includes(ON_THIS_PAGE_JS),
      'the edit preview body ships the SAME scroll-spy + on-this-page scripts as read mode');

    // the edit VIEW carries them via the preview body, exactly ONCE each — not also appended
    // outside the preview pane (where executeAssets would never reach them, and a double-append
    // would double-run the scripts on first mount).
    assert.strictEqual(occurrences(editView, SCROLL_SPY_JS), 1,
      'the edit view carries the scroll-spy script exactly once (inside the preview pane, no dead external copy)');
    assert.strictEqual(occurrences(editView, ON_THIS_PAGE_JS), 1,
      'the edit view carries the on-this-page script exactly once (inside the preview pane)');

    // and that single copy lives within the preview-pane region (so executeAssets(pane) runs it).
    const paneAt = editView.indexOf('data-edit-pane="preview"');
    assert.ok(paneAt !== -1 && editView.indexOf(SCROLL_SPY_JS) > paneAt,
      'the rail scripts sit inside the preview pane region of the edit view');

    console.log('PASS: L2 — edit preview ships read mode\'s rail scripts inside the preview pane (spies like read mode; re-arms on each edit)');
  }

  // ── the chapter-as-page ROUTER: chapter from ?chapter=, section from #hash (no competition) ──
  {
    assert.deepStrictEqual(resolveRoute('', '', model), { cover: true },
      'no chapter routes to the COVER (#209), not a chapter');
    assert.deepStrictEqual(resolveRoute('about-this-book', '', model),
      { cover: false, index: model.stemToIndex.get('about-this-book'), anchor: null },
      'a chapter stem routes to that chapter, no section anchor');
    assert.deepStrictEqual(resolveRoute('counting-elephants', '', model),
      { cover: false, index: model.stemToIndex.get('counting-elephants'), anchor: null },
      'the body chapter stem routes to chapter 1');

    // THE UNBLOCKED CAPABILITY: a section deep-link `?chapter=<stem>#<id>` resolves to the chapter
    // AND carries the section anchor to scroll to — the chapter (query) and the section (hash) no
    // longer compete for the one slot.
    assert.deepStrictEqual(resolveRoute('counting-elephants', '#fig:transect', model),
      { cover: false, index: model.stemToIndex.get('counting-elephants'), anchor: 'fig:transect' },
      'a section deep-link resolves to its chapter AND carries the section scroll anchor');

    // fig:transect is OWNED by chapter 1; a stray bare `#fig:transect` (no chapter) falls back to its
    // owning chapter via idToStem (graceful: an old `#id` deep-link or an in-content click without a chapter).
    assert.strictEqual(model.idToStem.get('fig:transect'), 'counting-elephants',
      'fig:transect is owned by the Counting Elephants chapter');
    assert.deepStrictEqual(resolveRoute('', '#fig:transect', model),
      { cover: false, index: model.stemToIndex.get('counting-elephants'), anchor: 'fig:transect' },
      'a chapterless section anchor falls back to its OWNING chapter and carries the scroll anchor');

    assert.strictEqual(resolveRoute('no-such-chapter', '', model), null,
      'an unknown chapter stem resolves to null (the router no-ops)');
    console.log('PASS: L2 — chapter-as-page router: ?chapter=→chapter, #id→section, deep-link→chapter+section, unknown→null');
  }

  // ── the COVER (#209): live cover body == P1 index.html cover body; masthead round-trips ──
  {
    const cover = renderLiveCoverView(model);
    const sharedBody = coverBodyHtml(model.bookTitle);   // book-title hero + lede

    // Preview fidelity: the live cover and P1's published cover render the SAME body.
    assert.ok(cover.includes(sharedBody),
      'the live cover renders the shared cover body (book-title hero + lede)');
    assert.ok(pages.get('index.html').includes(sharedBody),
      'P1 index.html renders the SAME cover body — the previewed cover IS the published cover');

    // The masthead self-links to the cover route on the cover view (marked current), and points AT
    // the cover route (not current) on a chapter view — every view round-trips. The cover route is the
    // page WITHOUT a chapter (standalone: `?`; website: `?page=<slug>`).
    assert.ok(/<a class="enscribe-book-home" href="\?"/.test(cover) &&
      /enscribe-book-home"[^>]*aria-current="page"/.test(cover),
      'the cover masthead self-links to the cover route (?), marked aria-current="page"');
    const chView = renderLiveChapterView(model, model.stemToIndex.get('counting-elephants'), ctx);
    assert.ok(/<a class="enscribe-book-home" href="\?"/.test(chView),
      'a chapter view carries the return-to-cover masthead → the cover route (?)');
    assert.ok(!/enscribe-book-home"[^>]*aria-current/.test(chView),
      'the chapter masthead is NOT marked current (the cover is a different route)');
    console.log('PASS: L2/#209 — live cover body == P1 index.html cover body; masthead round-trips to the cover');
  }

  console.log('All live app-shell book render (L2) parity + routing checks passed.');
}
