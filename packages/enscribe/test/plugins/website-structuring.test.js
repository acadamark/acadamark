// #246 S1 — enscribeWebsiteStructuring: build the website nav model on file.data from
// the master's <nav>. Asserts the model SHAPE (external page, inline page, group,
// top-level item after a group), the ?page= slugs + the collision diagnostic, and that
// the plugin is a strict no-op for non-website documents (the byte-identity guard).

import assert from 'node:assert/strict';
import { VFile } from 'vfile';
import { buildEnscribePipeline } from '../../src/interpreter/index.js';
import { ENSCRIBE_NAV_MODEL } from '../../src/core/file-data-keys.js';

function buildModel(src) {
  const proc = buildEnscribePipeline({});
  const file = new VFile({ path: 'site.emd', value: src });
  proc.runSync(proc.parse(src), file);
  return { model: file.data[ENSCRIBE_NAV_MODEL], messages: file.messages };
}

export function run() {
  // A canonical site: an external page, a group with two pages, and a top-level page
  // AFTER the group (the "Contact is a sibling, not swallowed" case).
  {
    const src = [
      '<meta type=website>',
      '</meta>',
      '',
      '<nav>',
      '<item src="home.emd" | Home>',
      '<nav-group title="Resources">',
      '<item src="tut.emd" | Tutorials>',
      '<item src="doc.emd" | Documentation>',
      '</nav-group>',
      '<item src="contact.emd" | Contact>',
      '</nav>',
    ].join('\n');
    const { model } = buildModel(src);
    assert.ok(model, 'nav model is set on file.data for a website');
    assert.equal(model.entries.length, 3, 'three top-level entries: Home, Resources group, Contact');

    const [home, group, contact] = model.entries;
    // #404 marker 7: an external page carries a `body` for interstitial content after it; with no
    // interstitial content here it is an empty array (byte-identical rendering).
    assert.deepEqual(home, { kind: 'page', title: 'Home', slug: 'home', src: 'home.emd', body: [] },
      'external page records {title, slug, src, body}');
    assert.equal(group.kind, 'group', 'second entry is a group');
    assert.equal(group.title, 'Resources', 'group title comes from the title kwarg');
    assert.equal(group.children.length, 2, 'group nests its two items as children (not leaked as siblings)');
    assert.deepEqual(group.children.map((c) => c.slug), ['tutorials', 'documentation'],
      'grouped pages slug from their titles');
    assert.deepEqual(contact, { kind: 'page', title: 'Contact', slug: 'contact', src: 'contact.emd', body: [] },
      'a top-level page after the group is a sibling at the nav level, not swallowed');
  }
  console.log('PASS: website-structuring — external pages, a group, and a top-level page after the group');

  // #404 marker 7: interstitial master content authored AFTER an <item src> and BEFORE the next nav
  // entry joins THAT page's `body` (previously dropped), peer-closed by the next entry — exactly the
  // inline-page rule extended to the external form.
  {
    const src = [
      '<meta type=website>',
      '</meta>',
      '<nav>',
      '<item src="a.emd" | Page A>',
      'Interstitial INTERMARK after A.',
      '<item src="b.emd" | Page B>',
      '</nav>',
    ].join('\n');
    const { model } = buildModel(src);
    assert.equal(model.entries.length, 2, 'two external pages');
    const [a, b] = model.entries;
    assert.equal(a.src, 'a.emd', 'first entry is external (src kept)');
    assert.ok(Array.isArray(a.body) && a.body.length >= 1,
      'marker 7: the interstitial content after <item src> is captured on that page (not dropped)');
    const flat = JSON.stringify(a.body);
    assert.ok(flat.includes('INTERMARK'), 'marker 7: the captured body holds the interstitial content');
    assert.deepEqual(b.body, [], 'the next entry peer-closed A; B has no interstitial content');
  }
  console.log('PASS: website-structuring — marker 7: interstitial after <item src> joins that page');

  // An inline page: <item | Title> + body, peer-closed by the next entry.
  {
    const src = [
      '<meta type=website>',
      '</meta>',
      '<nav>',
      '<item | Welcome>',
      'Welcome to the site.',
      '<item src="about.emd" | About>',
      '</nav>',
    ].join('\n');
    const { model } = buildModel(src);
    assert.equal(model.entries.length, 2, 'inline page + external page');
    const [welcome, about] = model.entries;
    assert.equal(welcome.kind, 'page', 'inline entry is a page');
    assert.equal(welcome.title, 'Welcome', 'inline page title from the pipe');
    assert.equal(welcome.slug, 'welcome', 'inline page slug from the title');
    assert.equal(welcome.src, undefined, 'inline page has no src');
    assert.ok(Array.isArray(welcome.body) && welcome.body.length >= 1,
      'inline page captured its peer-closed body');
    assert.equal(about.src, 'about.emd', 'the next entry closed the inline body and is external');
  }
  console.log('PASS: website-structuring — inline page captures its peer-closed body');

  // Slug collision: two pages with the same title → disambiguated AND surfaced.
  {
    const src = [
      '<meta type=website>',
      '</meta>',
      '<nav>',
      '<item src="a/home.emd" | Home>',
      '<item src="b/home.emd" | Home>',
      '</nav>',
    ].join('\n');
    const { model, messages } = buildModel(src);
    assert.deepEqual(model.entries.map((e) => e.slug), ['home', 'home-2'],
      'colliding slugs are disambiguated, not silently merged');
    assert.ok(
      messages.some((m) => m.source === 'website-structuring' && m.ruleId === 'slug-collision'),
      'the collision is surfaced with a visible diagnostic, never a silent suffix',
    );
  }
  console.log('PASS: website-structuring — slug collisions are disambiguated and surfaced');

  // No-op for non-website documents (the byte-identity guard): no model is written.
  {
    const article = buildModel('<meta type=article>\n</meta>\n\n# Hello\n\nBody text.');
    assert.equal(article.model, undefined, 'an article gets no nav model (strict no-op)');
    const bare = buildModel('# Just a heading\n\nSome text.');
    assert.equal(bare.model, undefined, 'a typeless document gets no nav model (strict no-op)');
  }
  console.log('PASS: website-structuring — strict no-op for non-website documents');

  // #279: a tab-indented <nav> body still parses every entry (the recursive-content dedent),
  // and an indented nav-group's indented closer is recognized so its children nest.
  {
    const src = [
      '<meta type=website>', '</meta>', '',
      '<nav>',
      '\t<item src="a.emd" | A>',
      '\t<nav-group title="G">',
      '\t\t<item src="b.emd" | B>',
      '\t\t</nav-group>',
      '\t<item src="c.emd" | C>',
      '</nav>',
    ].join('\n');
    const { model } = buildModel(src);
    assert.equal(model.entries.length, 3, '#279: tab-indented nav parses all 3 top-level entries');
    const group = model.entries.find((e) => e.kind === 'group');
    assert.equal(group && group.children.length, 1,
      '#279: indented nav-group nests its child (its indented closer is recognized)');
  }
  console.log('PASS: website-structuring — indented nav body parses all entries (#279)');

  // #279 safety net: a <nav> with content but zero recognized entries warns (never silent-empty).
  {
    const { messages } = buildModel('<meta type=website>\n</meta>\n\n<nav>\njust prose, no items\n</nav>');
    assert.ok(
      messages.some((m) => m.source === 'website-structuring' && m.ruleId === 'nav-no-entries'),
      '#279: a non-empty <nav> that yields no entries is surfaced, not silently empty',
    );
  }
  console.log('PASS: website-structuring — zero-entry nav warns (#279)');

  // nav-group pipe label: a pipe-form <nav-group> drops its label and orphans its children.
  // Warn (directing the author to title=); a correct title= form does not warn.
  {
    const pipe = buildModel([
      '<meta type=website>', '</meta>', '',
      '<nav>', '<nav-group | Reference>', '<item src="a.emd" | A>', '</nav-group>', '</nav>',
    ].join('\n'));
    assert.ok(
      pipe.messages.some((m) => m.source === 'website-structuring' && m.ruleId === 'nav-group-pipe-label'),
      'a pipe-form <nav-group> warns to move its label into title=',
    );
    const titled = buildModel([
      '<meta type=website>', '</meta>', '',
      '<nav>', '<nav-group title="Reference">', '<item src="a.emd" | A>', '</nav-group>', '</nav>',
    ].join('\n'));
    assert.ok(
      !titled.messages.some((m) => m.ruleId === 'nav-group-pipe-label'),
      'the correct title= form does NOT warn',
    );
    // False-positive guard: a long-form nav-group with NO title= (and stray prose) must not warn —
    // keying on node.form==='short' (not on titleText) avoids that. False-negative guard: an
    // empty-pipe nav-group still orphans its children, so it must warn.
    const longNoTitle = buildModel([
      '<meta type=website>', '</meta>', '',
      '<nav>', '<nav-group>', '<item src="a.emd" | A>', 'stray prose', '</nav-group>', '</nav>',
    ].join('\n'));
    assert.ok(
      !longNoTitle.messages.some((m) => m.ruleId === 'nav-group-pipe-label'),
      'a long-form nav-group with no title= does NOT warn (no false positive)',
    );
    const emptyPipe = buildModel([
      '<meta type=website>', '</meta>', '',
      '<nav>', '<nav-group |>', '<item src="a.emd" | A>', '</nav-group>', '</nav>',
    ].join('\n'));
    assert.ok(
      emptyPipe.messages.some((m) => m.ruleId === 'nav-group-pipe-label'),
      'an empty-pipe nav-group still warns (no false negative)',
    );
  }
  console.log('PASS: website-structuring — nav-group form diagnostic (pipe/empty-pipe warn; title=/long-form do not)');
}
