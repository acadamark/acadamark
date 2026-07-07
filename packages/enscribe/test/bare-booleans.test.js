// Bare boolean authoring forms (#219).
//
// A BARE attribute name (no `=value`, no `+`/`-`) means boolean `true` — but only for a name that is
// a KNOWN boolean: a vocab `booleans:` name on an element (`listed`, `numbered`, `open`), or a boolean
// `<config>` kwarg (`toc`, `number-sections`). Bare is the canonical HTML / eHTML spelling, so it
// renders byte-identically to the `+name` / `name=true` forms. A bare name that is NOT a known boolean
// stays unrecognized (so a typo never becomes a phantom boolean; a bare valued kwarg is inert). It is a
// PARSE-level promotion (in the shared gate), so static and live see the same booleans.

import assert from 'node:assert';
import { buildEnscribePipeline } from '../src/interpreter/index.js';
import { render } from '../src/interpreter/browser.js';

const BROWSER_DEFAULTS = { embedResources: false, hoverPreviewMode: 'link', dslMode: 'live-link' };
const staticRender = (src) => String(buildEnscribePipeline(BROWSER_DEFAULTS).processSync(src));
const liveRender = (src) => render(src);
const R = (src) => String(buildEnscribePipeline({}).processSync(src));

const META = '<meta type=article>\n<title | T>\n</meta>\n\n';
const eq = (a, b, msg) => assert.strictEqual(R(a), R(b), msg);

export async function run() {
  // ── Gate: bare ≡ the canonical (+ / =true) form — config booleans ─────────────────────────────
  {
    const SX = '\n\n<section | A>\n\nx.\n\n<sub-section | B>\n\ny.';
    eq(META + '<config toc />' + SX, META + '<config toc=true />' + SX, '<config toc> ≡ <config toc=true>');
    eq(META + '<config number-sections />' + SX, META + '<config number-sections=true />' + SX,
      '<config number-sections> ≡ <config number-sections=true>');
    eq(META + '<config toc number-sections />' + SX, META + '<config toc=true number-sections=true />' + SX,
      'multiple bare booleans ≡ both =true');
    console.log('PASS: #219 — a bare boolean <config> kwarg ≡ its =true form');
  }

  // ── Gate: bare ≡ the +flag form — element booleans ────────────────────────────────────────────
  {
    // #230: listed / numbered default ON, so bare ≡ +form is a redundant explicit-on (both the
    // default) — which still exercises the element-boolean promotion branch. A MEANINGFUL bare
    // element boolean (default-off) is covered by the <details open> block below.
    eq('<section listed | A>', '<section +listed | A>', '<section listed> ≡ <section +listed>');
    const N = META + '<config number-sections=true />\n\n';
    eq(N + '<section numbered | A>\n\nx.\n\n<section | B>\n\ny.',
       N + '<section +numbered | A>\n\nx.\n\n<section | B>\n\ny.',
       '<section numbered> ≡ <section +numbered>');
    console.log('PASS: #219 — a bare element boolean ≡ its +flag form');
  }

  // ── Opt-out behavior: -listed keeps a section out of the listing ──────────────────────────────
  {
    // #230: listed defaults ON; the opt-out is the -flag (a signed form, not bare). -listed keeps a
    // section out of the contents listing; a default (listed) section stays in.
    const base = META + '<config toc=true toc-location=body />\n\n';
    const h = R(base + `<section -listed | Secret>\n\nx.\n\n<section | Public>\n\ny.`);
    const nav = (h.match(/<nav class="enscribe-contents"[\s\S]*?<\/nav>/) || [''])[0];
    assert.ok(!nav.includes('Secret') && nav.includes('Public'),
      '-listed keeps the section out of the listing; a default (listed) section stays in');
    // For a CONFIG boolean kwarg, `=true` IS a working form (kwargs) and keeps working alongside bare.
    eq(META + '<config toc=true />\n\n<section | A>\n\nx.', META + '<config toc />\n\n<section | A>\n\nx.',
      'the config =true form still works (and equals bare)');
    console.log('PASS: #230 — -listed opts out of the listing; the config +/= forms still work');
  }

  // ── Negative: a bare UNKNOWN name is not turned true (no phantom boolean) ──────────────────────
  {
    const SX = '\n\n<section | A>\n\nx.';
    // a stray unknown bare word on <config> is inert (== an empty <config>, not a boolean).
    eq(META + '<config flooble />' + SX, META + '<config />' + SX, 'bare unknown <config flooble> is inert (not a boolean)');
    // and it specifically does NOT enable toc (no listing appears).
    assert.ok(!/enscribe-contents|enscribe-layout--toc/.test(R(META + '<config flooble />' + SX)),
      'a bare unknown does not turn on a feature');
    // a bare unknown on an element drops exactly as before (== the element without it).
    eq('<section flooble | A>', '<section | A>', 'bare unknown <section flooble> ≡ <section> (dropped, not a boolean)');
    console.log('PASS: #219 — a bare unknown name stays unrecognized (no phantom boolean)');
  }

  // ── Negative: a bare VALUED kwarg does not become a spurious boolean ──────────────────────────
  {
    const SX = '\n\n<section | A>\n\nx.';
    eq(META + '<config toc=true toc-depth />' + SX, META + '<config toc=true />' + SX,
      'a bare valued kwarg <config toc-depth> is inert (valued kwargs need =value)');
    console.log('PASS: #219 — a bare VALUED kwarg is not promoted to a boolean');
  }

  // ── static ≡ live: a parse-level promotion → both paths see the same booleans ─────────────────
  {
    const src = META + '<config toc number-sections />\n\n<section -listed | Colophon>\n\nx.\n\n' +
      '<section -numbered | Note>\n\ny.\n\n<section | Methods>\n\nz.';
    assert.ok(staticRender(src).includes('enscribe-contents'), 'the bare-form document renders the listing');
    assert.strictEqual(staticRender(src), liveRender(src),
      'static ≡ live for the bare boolean forms (parse-level promotion in the shared gate)');
    console.log('PASS: #219 — bare boolean forms parse identically under static AND live render');
  }

  // ── #270: a boolean-VALUED kwarg (<details>'s `open`) maps for +open / bare / =true ───────────
  {
    const D = '\n<summary | More>\nBody.\n</details>';
    const hasOpen = (form) => /<details[^>]*\bopen/.test(R(`<details ${form}>${D}`));
    assert.ok(hasOpen('+open'), '<details +open> renders the open attribute');
    assert.ok(hasOpen('open'), 'bare <details open> renders open (a boolean-valued kwarg promotes like a vocab boolean)');
    assert.ok(hasOpen('open=true'), '<details open=true> renders the open attribute (kwarg form still works)');
    assert.ok(!/<details[^>]*\bopen/.test(R(`<details -open>${D}`)), '<details -open> is collapsed (open absent)');
    assert.ok(!/<details[^>]*\bopen/.test(R(`<details>${D}`)), 'plain <details> is collapsed (open absent)');
    // bare ≡ +open at the parse level (#219 promotion now recognizes boolean-valued kwargs).
    eq(`<details open>${D}`, `<details +open>${D}`, 'bare <details open> ≡ <details +open>');
    console.log('PASS: #270 — <details> open (a boolean-valued kwarg) maps for +open / bare / =true');
  }

  console.log('All bare-boolean authoring-form (#219) checks passed.');
}
