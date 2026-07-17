// HTML-validity gate — the general guard the blindness audit ranked #1
// (slice-report-audit-test-blindness.md §5 guard 2). #442 shipped structurally
// invalid HTML (a <p> inside a <p>, via the margin-note clone) and every string /
// snapshot test stayed green, because a real HTML parser RESTRUCTURES invalid
// nesting on the way in — so the tree you get back is already "fixed", and any
// check that reads the parsed DOM sees valid HTML (the audit's probe-0 fell into
// exactly this trap and undercounted). This gate detects the restructuring itself.
//
// METHOD (per the probe-0 method note: detect on the raw string, not the parsed DOM).
// For every rendered fixture we build TWO element trees and compare their nesting:
//   1. the AS-WRITTEN tree — a tokenizer stack that honors the literal start/end tags
//      enscribe emitted (no HTML implied-end-tag / ejection rules applied);
//   2. the PARSE5 tree — what a real browser builds (hast-util-from-html = parse5),
//      which DOES apply those rules.
// If the two disagree, a browser restructures enscribe's output → invalid HTML.
// This is the serialize→parse→serialize instability the audit asked for, computed
// structurally so rehype-format whitespace, entity form, attribute quoting, and
// void-element spelling never register as diffs (only ELEMENT NESTING is compared).
//
// GENERATE-AND-CHECK: the gate re-renders each fixture through the shared
// renderAllFixtures() core (render-fixtures.js) and validates the fresh bytes — no
// staleness gap against the committed .html, and it promotes the render path into
// `test` (render-fixtures.js itself runs only under `verify`).
//
// Proven on this corpus: 0 false-positives, 0 false-negatives (see the slice report's
// stress matrix — tables ±tbody, lists, nested frameables, svg/math foreign content,
// code/script/comments, entities all pass; every block-in-<p> shape incl. #442 is
// caught; phrasing voids (br/img) pass, block voids (hr) are flagged).

import assert from 'node:assert/strict';
import { renderAllFixtures } from './render-fixtures.js';
import { fromHtml } from 'hast-util-from-html';

// ── HTML tokenization facts (WHATWG) ──
// Void elements never have children or an end tag.
const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
// Raw-text / RCDATA elements: their content is text, not markup (a `<` inside is not a tag).
const RAWTEXT = new Set(['script','style']);
const RCDATA = new Set(['textarea','title']);
// Foreign content: SVG/MathML have their own parsing rules where a naive tokenizer and
// parse5 legitimately differ (self-close, case, integration points). The #442 class
// (block-in-<p>) never occurs INSIDE a foreign-content island, so we treat these as
// OPAQUE leaves in both trees — we compare the HTML skeleton around them, not their guts.
const OPAQUE = new Set(['svg','math']);
// parse5 auto-inserts these table sections when the source omits them (valid HTML
// shorthand, not invalidity); we splice them out of BOTH signatures so implicit == explicit.
const IMPLICIT_TABLE_SECTIONS = new Set(['tbody','thead','tfoot','colgroup']);

// OPTIONAL END TAGS (WHATWG §13.1.2.4): elements a browser auto-closes when the next
// sibling of a given kind opens — VALID HTML shorthand, not invalidity. The as-written
// tree must apply the SAME implied close so it matches parse5, or it would false-positive
// on `<li>a<li>b` etc. Deliberately EXCLUDES <p> (a <p> auto-closed by a block, or by
// another <p>, is exactly the #442-class invalidity this gate exists to catch — so <p>
// is never implicitly closed here, and the block-in-<p> divergence surfaces).
// Map: opening `key` implicitly closes any currently-open element in its value set.
const IMPLIED_CLOSE = new Map([
  ['li', new Set(['li'])],
  ['dt', new Set(['dt', 'dd'])],
  ['dd', new Set(['dt', 'dd'])],
  ['option', new Set(['option'])],
  ['optgroup', new Set(['option', 'optgroup'])],
  ['tr', new Set(['tr', 'td', 'th', 'caption', 'colgroup'])],
  ['td', new Set(['td', 'th'])],
  ['th', new Set(['td', 'th'])],
  ['thead', new Set(['td', 'th', 'tr', 'thead', 'tbody', 'tfoot', 'caption', 'colgroup'])],
  ['tbody', new Set(['td', 'th', 'tr', 'thead', 'tbody', 'tfoot', 'caption', 'colgroup'])],
  ['tfoot', new Set(['td', 'th', 'tr', 'thead', 'tbody', 'tfoot', 'caption', 'colgroup'])],
  ['caption', new Set(['td', 'th', 'tr', 'thead', 'tbody', 'tfoot', 'caption', 'colgroup'])],
  ['colgroup', new Set(['td', 'th', 'tr', 'thead', 'tbody', 'tfoot', 'caption', 'colgroup'])],
  ['rt', new Set(['rt', 'rp'])],
  ['rp', new Set(['rt', 'rp'])],
]);

/**
 * Build the AS-WRITTEN element tree from the raw HTML string: a tag-stack that respects
 * the literal open/close tags, with no HTML implied-end-tag / foster-parenting recovery.
 * Returns a tree of `{ tag, children, pos }` (pos = source offset of the start tag).
 */
function asWrittenTree(html) {
  const root = { tag: '#root', children: [], pos: 0 };
  const stack = [root];
  let i = 0;
  const n = html.length;
  while (i < n) {
    if (html[i] !== '<') { i++; continue; }
    if (html.startsWith('<!--', i)) { const e = html.indexOf('-->', i + 4); i = e < 0 ? n : e + 3; continue; }
    if (html[i + 1] === '!') { const e = html.indexOf('>', i); i = e < 0 ? n : e + 1; continue; }  // doctype / decl
    if (html[i + 1] === '/') {  // end tag: pop to the nearest matching open (a stray close is ignored)
      const e = html.indexOf('>', i);
      const name = html.slice(i + 2, e < 0 ? n : e).trim().toLowerCase();
      i = e < 0 ? n : e + 1;
      for (let k = stack.length - 1; k >= 1; k--) if (stack[k].tag === name) { stack.length = k; break; }
      continue;
    }
    let j = i + 1;
    while (j < n && /[A-Za-z0-9:-]/.test(html[j])) j++;
    const name = html.slice(i + 1, j).toLowerCase();
    if (!name) { i++; continue; }
    // scan to the end of the start tag, honoring quoted attribute values (which may hold `>`).
    let k = j, quote = null;
    while (k < n) {
      const c = html[k];
      if (quote) { if (c === quote) quote = null; k++; continue; }
      if (c === '"' || c === "'") { quote = c; k++; continue; }
      if (c === '>') break;
      k++;
    }
    const selfClose = html[k - 1] === '/';
    const tagEnd = k + 1;
    // Optional-end-tag implied close: pop any open element this start tag auto-closes
    // (valid HTML shorthand — see IMPLIED_CLOSE; <p> is deliberately never popped here).
    const closes = IMPLIED_CLOSE.get(name);
    if (closes) {
      while (stack.length > 1 && closes.has(stack[stack.length - 1].tag)) stack.pop();
    }
    const node = { tag: name, children: [], pos: i };
    stack[stack.length - 1].children.push(node);
    if (!VOID.has(name) && !selfClose) {
      stack.push(node);
      if (RAWTEXT.has(name) || RCDATA.has(name) || OPAQUE.has(name)) {  // skip content to the matching close
        const rest = html.slice(tagEnd);
        // Require a tag-name terminator after `</name` (space / `/` / `>`), so `</scriptx>` inside a
        // <script> body is not mistaken for the close (parse5 requires the same terminator).
        const m = rest.search(new RegExp(`</${name}[\\s/>]`, 'i'));
        if (m >= 0) { const e = html.indexOf('>', tagEnd + m); i = e < 0 ? n : e + 1; stack.pop(); continue; }
      }
    }
    i = tagEnd;
  }
  return root;
}

/** The PARSE5 element tree (via hast-util-from-html), svg/math collapsed to opaque leaves. */
function parse5Tree(html) {
  const hast = fromHtml(html, { fragment: false });
  const conv = (node) => ({
    tag: (node.tagName ?? '#root').toLowerCase(),
    children: OPAQUE.has((node.tagName || '').toLowerCase())
      ? []
      : (node.children ?? []).filter((c) => c.type === 'element').map(conv),
  });
  return conv(hast);
}

/** Nesting signature: pre-order `depth:tag`. Auto-inserted table sections are spliced out —
 * but ONLY when they sit directly under a <table> (parse5 inserts them there; the source may
 * omit them — benign). A STRAY <tbody>/<thead>/… outside a table is NOT spliced: a browser
 * DROPS it entirely (a real restructuring), and scoping the splice to table-parents keeps that
 * drop visible (an unconditional by-name splice would hide it — the adversarial audit's finding). */
function signature(tree) {
  const out = [];
  (function walk(node, depth, parentTag) {
    const skip = IMPLICIT_TABLE_SECTIONS.has(node.tag) && parentTag === 'table';
    if (node.tag !== '#root' && !skip) out.push(`${depth}:${node.tag}`);
    for (const c of node.children) walk(c, skip ? depth : depth + 1, node.tag);
  })(tree, 0, null);
  return out.join('\n');
}

// KNOWN LIMITATIONS of this detector as a GENERAL HTML oracle (an adversarial 4-way audit
// mapped them; none occur in enscribe's rendered output, so the gate is exact on the real
// corpus — but recorded so a future reader does not over-trust validateHtml on arbitrary HTML):
//   - A self-closing slash on a non-void, non-foreign element is honored here, but a browser's
//     handling is context-dependent (`<div/>` stays open; `<a href=x/>` treats `x/` as an unquoted
//     attribute so the slash never marks a self-close). Enscribe emits self-closing customs only in
//     the space-separated ` … />` form (e.g. `<fig src=x />`), which parse5 AND this detector both
//     self-close — so this never fires on real output.
//   - The opaque svg/math skip scans for the matching `</svg>`/`</math>` by regex; a literal
//     `</svg>` inside an SVG comment or attribute value would end the skip early. Enscribe's
//     KaTeX/mermaid SVG contains no such literal, so it never fires.
//   - The #442 class INSIDE a foreign-content HTML integration point (`<foreignObject>` /
//     `<annotation-xml encoding="text/html">`) is not detected — svg/math are opaque leaves.
//     Astronomically unreachable in academic-document output.
//   - Comparison is ELEMENT-only, so text-node foster-parenting (loose text in a <table>) is out
//     of scope (no element moves).

// The HTML elements whose start tag closes an open <p> (WHATWG §13.2.6.4.7). A p-closer
// inside a <p> is the concrete, human-readable form of the invalidity — used for messages.
const P_CLOSERS = new Set(['address','article','aside','blockquote','details','div','dl','fieldset','figcaption','figure','footer','form','h1','h2','h3','h4','h5','h6','header','hgroup','hr','main','menu','nav','ol','p','pre','section','summary','table','ul']);

/** Human-readable offending regions: every p-closer nested inside a <p> in the as-written tree. */
function blockInParagraphRegions(html, tree) {
  const regions = [];
  (function walk(node) {
    if (node.tag === 'p') {
      (function descend(x) {
        for (const c of x.children) {
          if (P_CLOSERS.has(c.tag)) regions.push({ block: c.tag, snippet: html.slice(node.pos, Math.min(node.pos + 100, html.length)).replace(/\s+/g, ' ') });
          else descend(c);
        }
      })(node);
    }
    for (const c of node.children) walk(c);
  })(tree);
  return regions;
}

/**
 * Validate one rendered document. Returns { valid, regions, message } where a non-valid
 * result carries the offending block-in-<p> regions (or a generic structural-divergence
 * note for the rarer non-p-closer case, e.g. display-math relocated by parse5).
 */
export function validateHtml(html) {
  const aw = asWrittenTree(html);
  if (signature(aw) === signature(parse5Tree(html))) return { valid: true, regions: [] };
  const regions = blockInParagraphRegions(html, aw);
  const message = regions.length
    ? regions.map((r) => `<${r.block}> inside <p>  («${r.snippet.slice(0, 80)}»)`).join('; ')
    : 'a real HTML parser restructures this output (structural divergence — e.g. block content in <p>) with no plain p-closer match';
  return { valid: false, regions, message };
}

// ── Known-invalid fixtures: documented, issue-linked exclusions with anti-rot (a fixed
// fixture that stays excluded fails the gate; a new invalidity in an excluded fixture fails
// too, via the region count). #464 (block content wrapped in <p>) was FIXED by fix-p-wrapping
// — its five fixtures are gone from this list. The remaining entry is a DIFFERENT invalidity
// the gate exposed once its paragraph-wrapping was fixed: the `<math>` display element renders
// as a `<math>` HTML element, colliding with MathML so browsers eject its KaTeX HTML (#466).
// That is a vocab/rendering rename decision, out of fix-p-wrapping's scope, so it stays
// excluded and re-annotated to #466. Change this table only alongside a render change + issue.
const KNOWN_INVALID = new Map([
  ['sweep/swp-math.html',              { regions: 0, note: '<math> display element collides with MathML → KaTeX HTML ejected (#466); NOT the #464 p-wrap class (that part is fixed — <align>/<cases>/… now split out cleanly)' }],
]);

export async function run() {
  const docs = renderAllFixtures();
  const newlyInvalid = [];    // a fixture NOT in KNOWN_INVALID that is invalid → a regression
  const changedKnown = [];    // a KNOWN_INVALID fixture whose invalidity count changed → update needed
  const fixedKnown = [];      // a KNOWN_INVALID fixture that is now VALID → remove the exclusion (anti-rot)

  for (const { relPath, html } of docs) {
    const rel = relPath; // already relative to FIXTURES_DIR (POSIX-style, matching KNOWN_INVALID keys)
    const res = validateHtml(html);
    const known = KNOWN_INVALID.get(rel);
    if (known) {
      if (res.valid) fixedKnown.push(rel);
      else if (res.regions.length !== known.regions) changedKnown.push({ rel, was: known.regions, now: res.regions.length, message: res.message });
    } else if (!res.valid) {
      newlyInvalid.push({ rel, message: res.message });
    }
  }

  // Anti-rot: a known-invalid fixture that got fixed must be un-excluded.
  assert.equal(fixedKnown.length, 0,
    `HTML-validity: ${fixedKnown.length} fixture(s) in KNOWN_INVALID now render VALID — remove them from KNOWN_INVALID ` +
    `(and close/annotate #464):\n  ${fixedKnown.join('\n  ')}`);
  // A known-invalid fixture whose invalidity changed shape/count needs a fresh look.
  assert.equal(changedKnown.length, 0,
    `HTML-validity: ${changedKnown.length} known-invalid fixture(s) changed their invalidity — re-verify against #464:\n  ` +
    changedKnown.map((c) => `${c.rel}: was ${c.was} region(s), now ${c.now} — ${c.message}`).join('\n  '));
  // The load-bearing assertion: NO new invalidity anywhere.
  assert.equal(newlyInvalid.length, 0,
    `HTML-validity: ${newlyInvalid.length} fixture(s) render invalid HTML a browser restructures (the #442 class):\n  ` +
    newlyInvalid.map((f) => `${f.rel}: ${f.message}`).join('\n  ') +
    `\nIf this is intended-and-tracked, add it to KNOWN_INVALID with an issue link; otherwise fix the render.`);

  console.log(`PASS: HTML-validity — ${docs.length} rendered documents checked (as-written vs parse5 nesting); ` +
    `${KNOWN_INVALID.size} known-invalid tracked (see KNOWN_INVALID), 0 new invalidities`);
}
