// #54: smart typography — a DISPLAY-PROJECTION transform on the HTML (hast) tree.
//
// Converts typewriter punctuation to typographic forms in PROSE display output
// only: straight quotes → curly (context-aware open/close), `--`/`---` → en/em
// dash, `...` → ellipsis. It runs at the HTML render stage, on the hast tree, and
// is NEVER stored in the canonical AST — so it never reaches `.emd` source,
// lift/lower, or the JATS export (the JATS channel carries only JATS-semantic
// content, never a display transform). Keeping it out of the AST is exactly what
// keeps the lift/lower round trip byte-clean on quotes (no source normalization,
// no "don't re-curl" parser special case).
//
// Verbatim-exempt — left byte-identical (the round-trip spec's exempt class):
// text inside inline code (<code>), code blocks (<pre>), math
// (<inline-math>/<display-math>, including the KaTeX MathML LaTeX annotation), and
// raw <script>/<style>/<svg>. Attribute values (e.g. link/URL targets in an href)
// are never touched — only text nodes are visited.

// Verbatim subtrees: their text is left exactly as authored.
const SKIP = new Set(['code', 'pre', 'inline-math', 'display-math', 'script', 'style', 'svg']);

// Elements that do NOT reset quote context (a quote may span them). Every other
// element is a block boundary that resets context — so a quote opening a new
// block reads as an OPENING quote even if the previous block ended in a letter.
const INLINE = new Set([
  'a', 'em', 'strong', 'b', 'i', 'u', 's', 'span', 'sup', 'sub', 'cite', 'abbr',
  'mark', 'small', 'q', 'time', 'ins', 'del', 'var', 'wbr', 'br', 'code',
]);

// A quote is OPENING when preceded by start-of-block, whitespace, an opening
// bracket, a dash, or an already-opened curly quote (nested quotes).
const OPENS = /[\s –—([{“‘]/;
const isWord = (c) => /[A-Za-z0-9]/.test(c);

/** Educate one prose text run. `prev` is the last emitted char before it. */
function educate(text, prev) {
  // Dashes + ellipsis first (no quote-direction dependency); `---` before `--`.
  const s = text
    .replace(/---/g, '—')
    .replace(/--/g, '–')
    .replace(/\.\.\./g, '…');
  let out = '';
  let p = prev;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') {
      out += (p === '' || OPENS.test(p)) ? '“' : '”';
    } else if (ch === "'") {
      const a = s[i + 1] ?? '';
      const b = s[i + 2] ?? '';
      const c = s[i + 3] ?? '';
      if (/\d/.test(a) && /\d/.test(b) && (c === 's' || c === 'S')) {
        out += '’'; // decade abbreviation: '90s
      } else if (isWord(p)) {
        out += '’'; // apostrophe / closing single after a word char
      } else {
        out += (p === '' || OPENS.test(p)) ? '‘' : '’';
      }
    } else {
      out += ch;
    }
    p = out[out.length - 1];
  }
  return out;
}

/**
 * Apply smart typography to a hast tree IN PLACE, returning it. Skips verbatim
 * subtrees (byte-identical) and tracks quote context across inline boundaries,
 * resetting it at block boundaries and opaque raw-HTML islands.
 *
 * @param {import('hast').Node} tree
 * @returns {import('hast').Node}
 */
export function smartTypography(tree) {
  let prev = '';
  const walk = (node, skip) => {
    if (node.type === 'text') {
      // Verbatim subtree, or a literal-source text node (escaped raw HTML /
      // echoed unknown-tag syntax, flagged data.verbatim) → leave byte-identical.
      if (skip || node.data?.verbatim) return;
      node.value = educate(node.value, prev);
      if (node.value) prev = node.value[node.value.length - 1];
      return;
    }
    if (node.type === 'raw') { prev = ''; return; } // opaque raw HTML island
    if (node.type !== 'element' && node.type !== 'root') return;
    const here = skip || (node.tagName != null && SKIP.has(node.tagName));
    if (node.type === 'element' && node.tagName != null && !INLINE.has(node.tagName)) prev = '';
    for (const child of node.children ?? []) walk(child, here);
  };
  walk(tree, false);
  return tree;
}
