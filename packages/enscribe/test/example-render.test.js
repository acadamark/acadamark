// #304 — the engine's conformance check against the vocabulary: render each @enscribejs/ehtml
// example through this engine's pipeline and check it against its stored expected HTML.
//
// THE GAP this closes: each element's `shorthand_examples` stores a `source` + its expected
// `ehtml`, but nothing ever rendered the source to confirm they still match — so a drifted
// golden shipped green. That is exactly how #277 shipped a visible bug (a stale `ehtml` for a
// blockquote example, never caught). This check renders every example's source through the REAL
// pipeline and compares the result to its golden, so a future expected-HTML drift fails at CI.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE NORMALIZATION (the core decision — tight enough to catch #277, loose enough to be usable).
//
// A naive byte-compare fails on noise that doesn't matter (the document scaffold the full render
// adds, formatter indentation, attribute order, void-element serialization); an over-loose
// normalizer passes real drift (the #277 bug). The rule below canonicalizes ONLY genuinely-
// incidental form and NOTHING that carries meaning:
//
//   CANONICALIZED (incidental — normalized away):
//     1. Document scaffold — the full render wraps content in a `<link rel=stylesheet …>` asset
//        link + `<article>/<book>` + `<article-body>/<book-body>` (etc.) regions. A fragment golden
//        stores only the inner content, so the scaffold is stripped from the render before compare
//        (and NOT stripped when the golden itself is a full `<article>/<book>` document — symmetric).
//     2. Insignificant whitespace — the HTML whitespace model: runs of whitespace collapse to one
//        space; whitespace BETWEEN tags and immediately inside BLOCK elements is removed (a browser
//        ignores it). Whitespace inside `<pre>`/`<code>` is PRESERVED (significant), and whitespace
//        adjacent to inline flow ("See <a>…") is PRESERVED (significant).
//     3. Attribute order — sorted, since order carries no meaning in HTML.
//     4. Void-element self-closing — `<img …/>` ≡ `<img …>` in HTML5.
//
//   NOT TOUCHED (semantic — a difference here is a real failure):
//     tag names, element structure/nesting, text content, attribute NAMES and VALUES, hrefs,
//     classes, ids. The #277 drift was a STRUCTURAL+CONTENT mismatch (the source rendered a bare
//     `<quote>` as a real nested empty `<blockquote>` that truncated the sentence, while the golden
//     claimed the literal text `…<quote>…`). Under this normalization the render
//     `…Same as <blockquote></blockquote> but…` and the stale golden `…Same as <quote> but…` differ
//     on tag name (`<blockquote>` vs `<quote>`) AND structure (a nested element) AND text — none of
//     which is canonicalized — so #277 FAILS this check. That is the tightness proof.
//
// EXCLUSIONS (examples that cannot be standalone-rendered to their golden — listed with a reason,
// never a silent skip): a parenthetical/placeholder golden (`(KaTeX-rendered HTML…)`), a context-
// dependent example (a `<cite>` needs a `<library>`; a `<chapter>` needs a `<meta type=book>`; a
// `<data>` storage host renders empty by design), and a handful flagged for maintainer decision
// (genuine "which side is right" render-vs-golden questions — tracked as their own issues, see
// EXCLUDED below). Each carries a reason so the exclusion list shrinks honestly.

import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { VOCABULARY } from '@enscribejs/ehtml';
import { buildEnscribePipeline } from '../src/interpreter/index.js';

const proc = buildEnscribePipeline({});

// Block-level elements: whitespace immediately inside them is insignificant (HTML model). Covers the
// eHTML block vocabulary + the HTML block elements the renderer emits.
const BLOCK = new Set([
  'article', 'article-front', 'article-body', 'article-back', 'book', 'book-front', 'book-body',
  'book-back', 'book-part', 'section', 'sub-section', 'sub-sub-section', 'p', 'div', 'figure',
  'figcaption', 'aside', 'frame', 'blockquote', 'details', 'summary', 'abstract', 'meta', 'data',
  'library', 'bibliography', 'list', 'li', 'ul', 'ol', 'table', 'tr', 'td', 'th', 'thead', 'tbody',
  'pre', 'theorem', 'lemma', 'corollary', 'definition', 'proof', 'proposition', 'axiom', 'remark',
  'example', 'conjecture', 'note-list', 'minipage', 'nav', 'nav-group', 'footer', 'header',
]);

/** Collapse insignificant whitespace per the HTML model: protect <pre>/<code>; collapse runs to one
 *  space; drop whitespace between tags; drop whitespace immediately inside BLOCK elements. */
function collapseWhitespace(html) {
  const stash = [];
  let s = String(html).replace(/<(pre|code)\b[^>]*>[\s\S]*?<\/\1>/g, (m) => `\u0000${stash.push(m) - 1}\u0000`);
  s = s.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
  // trim whitespace just inside a block element's open / before its close
  s = s.replace(/(<([a-zA-Z][\w-]*)\b[^>]*>) (?=\S)/g, (m, open, tag) => (BLOCK.has(tag) ? open : m));
  s = s.replace(/ (<\/([a-zA-Z][\w-]*)>)/g, (m, close, tag) => (BLOCK.has(tag) ? close : m));
  return s.replace(/\u0000(\d+)\u0000/g, (m, i) => stash[+i]);
}
const dropVoidSlash = (h) => h.replace(/\s*\/>/g, '>');
function sortAttributes(html) {
  return html.replace(/<([a-zA-Z][\w-]*)((?:\s+[\w:-]+(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>/g,
    (m, tag, attrs) => {
      const list = (attrs.match(/[\w:-]+(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/g) || []).sort();
      return `<${tag}${list.length ? ' ' + list.join(' ') : ''}>`;
    });
}
export const canon = (h) => sortAttributes(dropVoidSlash(collapseWhitespace(h)));

const isDocument = (golden) => /^<(article|book)\b/.test(canon(golden));
function stripScaffold(rendered) {
  let s = canon(rendered).replace(/^<link\b[^>]*>/, '');
  s = s.replace(/^<(article|book)\b[^>]*>/, '').replace(/<\/(article|book)>$/, '');
  for (const region of ['front', 'body', 'back']) {
    s = s.replace(new RegExp(`^<(article|book)-${region}\\b[^>]*>`), '')
         .replace(new RegExp(`<\\/(article|book)-${region}>$`), '');
  }
  return s;
}
/** The render reduced to the same frame the golden is in (full document, or inner fragment). */
export function normalizeRender(rendered, golden) {
  const linkless = canon(rendered).replace(/^<link\b[^>]*>/, '');
  return isDocument(golden) ? linkless : stripScaffold(rendered);
}

// A placeholder golden — a human-readable parenthetical, not real HTML to byte-compare (e.g. KaTeX /
// DSL output described as `(KaTeX-rendered HTML of …)`, or a span whose only content is a `…`).
export const isPlaceholder = (h) => {
  const t = String(h).trim();
  return !/</.test(t) || /^\([^<]*\)$/.test(t) || /rendered HTML|\(KaTeX/.test(t) || /<[^>]*>…<\//.test(t);
};

export const renderSource = (source) => String(proc.processSync(source));

// Examples FLAGGED for maintainer decision — a genuine render-vs-golden "which side is right"
// question (a latent #277 that needs a call, not a silent re-baseline), each tracked as its own
// issue. Keyed by `${element}::${source}`. These are excluded from the green check until resolved.
//
// RESOLVED + un-flagged (the check now GUARDS these decisions): #325 (a bare <date> stays UNTYPED —
// goldens re-baselined to the typeless render), #327 (pipe-form code KEEPS all whitespace — goldens
// re-baselined to the whitespace-preserving render), and #326 (single-paragraph wrapping is gated by
// the element's content model: flow elements WRAP in <p>, phrasing elements UNWRAP — the parse-time
// gate in recursive-content.js#extractFromRoot, fed by content.shape.contains; flow goldens
// re-baselined to the wrapped render). No render-correctness questions remain flagged.
export const FLAGGED = {};

/** Why an example is excluded from the byte-comparison (a reason string), or null to check it.
 *  Pattern-based where possible (so the list shrinks honestly as the vocabulary grows), plus the
 *  named FLAGGED ad-hoc cases. NEVER a silent skip — every exclusion carries a reason. */
export function excludeReason(element, ex, rendered, got) {
  if (isPlaceholder(ex.ehtml)) return 'placeholder golden (human-readable, not byte-comparable HTML)';
  if (/class="katex/.test(rendered)) return 'KaTeX-rendered math — large + version-dependent output, not a byte-stable golden (math handler is tested separately)';
  if (/<diagram\b/.test(ex.source)) return 'DSL (mermaid/abc) source — rendered by a runtime/version-dependent engine, not a byte-stable golden';
  if (/<cite class="cite-error"/.test(got)) return 'a <cite> resolves against a <library>; standalone it renders the visible ??cite:…?? marker (#395) — cite-resolution is tested separately';
  if (got === '' && /<(data|library)\b/.test(ex.source)) return 'a <data>/<library> storage host is harvested into the registry and stripped from the body — renders empty by design';
  if (/src=["']?@/.test(ex.source)) return 'a store consumer (@id src) resolves against a <data>/<dataset> store — the consumer render is exercised by the data-store suite; this example demonstrates the store→consumer pattern, not a byte-stable golden';
  if (/&#x3C;(chapter|part|preface|afterword|appendix)\b/.test(got)) return 'a book-part tag renders only inside a <meta type=book> context; standalone it is an unknown-tag marker';
  if (FLAGGED[`${element}::${ex.source}`]) return `FLAGGED (render-correctness uncertain) — ${FLAGGED[`${element}::${ex.source}`]}`;
  return null;
}

export function run() {
  let checked = 0, excluded = 0;
  const failures = [];
  for (const [element, entry] of Object.entries(VOCABULARY)) {
    for (const ex of entry.shorthand_examples ?? []) {
      if (!ex.ehtml) continue;
      let rendered;
      try { rendered = String(proc.processSync(ex.source)); }
      catch (e) { rendered = `THREW: ${e.message}`; }
      const got = rendered.startsWith('THREW:') ? rendered : normalizeRender(rendered, ex.ehtml);
      const reason = excludeReason(element, ex, rendered, got);
      if (reason) { excluded++; continue; }
      const want = canon(ex.ehtml);
      checked++;
      if (got !== want) failures.push({ element, source: ex.source, want, got });
    }
  }
  if (failures.length) {
    const lines = failures.slice(0, 40).map((f) =>
      f.reason ? `  <${f.element}> ${JSON.stringify(f.source)} — ${f.reason}`
        : `  <${f.element}> ${JSON.stringify(f.source)}\n    want: ${JSON.stringify(f.want)}\n    got : ${JSON.stringify(f.got)}`);
    assert.fail(`example-render: ${failures.length} example(s) render differently from their stored ehtml ` +
      `(a #277-shape drift — re-baseline the golden if the render is correct, or fix the render):\n${lines.join('\n')}`);
  }
  console.log(`PASS: #304 example-render — ${checked} vocabulary examples render byte-identical to their stored ehtml under the documented normalization (${excluded} excluded: placeholders + context-dependent + flagged)`);
}

// Self-run only when invoked directly (`node test/example-render.test.js`). The guard keeps the
// module importable without side effects; nothing imports it today (#385), but the normalizer
// exports stay available so any future re-baseline tooling can reuse them rather than fork a copy.
if (import.meta.url === pathToFileURL(process.argv[1]).href) run();
