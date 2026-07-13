// #430 — the document tier's <config> source rewrite (editConfigKwarg). Span-bounded + parse-guided:
// it edits only the located <config> node's source span, never prose and never a <config> shown inside a
// code example. These pin set / replace / remove / insert and the code-fence-immunity that makes it safe.

import assert from 'node:assert/strict';
import { buildEnscribePipeline } from '../../src/interpreter/index.js';
import { editConfigKwarg } from '../../src/interpreter/lib/config-source-edit.js';

const proc = buildEnscribePipeline({});

export function run() {
  // set a kwarg the config does not yet carry → inserted INTO the existing <config> (not a new one).
  {
    const src = '<meta type=article>\n<title|T>\n</meta>\n\n<config ref-prefix-eqn="Eq." />\n\n# H\n';
    const out = editConfigKwarg(proc, src, 'theme-variant', 'dark');
    assert.ok(out.includes('<config ref-prefix-eqn="Eq." theme-variant=dark />'), 'inserts into the existing config');
    assert.equal(out.match(/<config/g).length, 1, 'does not add a second <config>');
  }
  // replace an existing value; the rest of the span is untouched.
  {
    const src = '<config theme=modern theme-variant="dark" />\n\n# H\n';
    assert.ok(editConfigKwarg(proc, src, 'theme', 'tufte').startsWith('<config theme=tufte theme-variant="dark" />'),
      'replaces theme in place, keeps the other kwarg');
  }
  // remove a kwarg (the "default" theme → no theme kwarg).
  {
    const src = '<config theme=modern theme-variant="dark" />\n\n# H\n';
    const out = editConfigKwarg(proc, src, 'theme', null);
    assert.ok(!/\btheme=/.test(out) && /theme-variant="dark"/.test(out), 'removes only the named kwarg');
  }
  // no <config> + a <meta> → a fresh <config> after </meta>.
  {
    const out = editConfigKwarg(proc, '<meta type=article>\n<title|T>\n</meta>\n\n# H\n', 'theme', 'tufte');
    assert.ok(out.includes('</meta>\n\n<config theme=tufte />'), 'inserts a fresh config after the meta region');
  }
  // no <config>, no <meta> → a fresh <config> at the top.
  {
    const out = editConfigKwarg(proc, '# H\n\nBody\n', 'theme-variant', 'light');
    assert.ok(out.startsWith('<config theme-variant=light />\n\n# H'), 'inserts a fresh config at the top');
  }
  // a <config> inside a ``` fence is NOT a parsed node → left untouched; the REAL config is edited.
  {
    const src = '# H\n\n```\n<config theme=modern />\n```\n\n<config toc=true />\n';
    const out = editConfigKwarg(proc, src, 'theme', 'tufte');
    assert.ok(out.includes('```\n<config theme=modern />\n```'), 'the fenced example config is untouched');
    assert.ok(out.includes('<config toc=true theme=tufte />'), 'the real config is edited');
  }
  // removing a kwarg no config carries → a no-op (returns the source unchanged).
  {
    const src = '<config toc=true />\n\n# H\n';
    assert.equal(editConfigKwarg(proc, src, 'theme', null), src, 'removing an absent kwarg is a no-op');
  }
  console.log('PASS: #430 config-source-edit — editConfigKwarg set/replace/remove/insert, code-fence-immune');
}

import { pathToFileURL } from 'node:url';
if (import.meta.url === pathToFileURL(process.argv[1]).href) run();
