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
    assert.deepEqual(home, { kind: 'page', title: 'Home', slug: 'home', src: 'home.emd' },
      'external page records {title, slug, src}');
    assert.equal(group.kind, 'group', 'second entry is a group');
    assert.equal(group.title, 'Resources', 'group title comes from the title kwarg');
    assert.equal(group.children.length, 2, 'group nests its two items as children (not leaked as siblings)');
    assert.deepEqual(group.children.map((c) => c.slug), ['tutorials', 'documentation'],
      'grouped pages slug from their titles');
    assert.deepEqual(contact, { kind: 'page', title: 'Contact', slug: 'contact', src: 'contact.emd' },
      'a top-level page after the group is a sibling at the nav level, not swallowed');
  }
  console.log('PASS: website-structuring — external pages, a group, and a top-level page after the group');

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
}
