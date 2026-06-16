// #54: smart typography — a DISPLAY-PROJECTION transform on the HTML (hast) tree.
//
// Converts typewriter punctuation to typographic forms in PROSE display output
// only: straight quotes → curly (context-aware open/close), `--`/`---` → en/em
// dash, `...` → ellipsis, and the arrow shorthands `-->`/`<--`/`<-->` → →/←/↔
// (#139). It runs at the HTML render stage, on the hast tree, and
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
//
// Quote context across an opaque inline span (<code>, inline-math, or a
// data.verbatim literal) behaves as after a WORD char: an apostrophe immediately
// after the span closes (`parseCsv`'s → ’s), not opens — regardless of the span's
// literal last char (option (b): an inline span is a token). A trailing space in
// the FOLLOWING text still resets context to whitespace. Diagnostic error spans
// (parse-error / tag-error) are emitted data.verbatim at the interpreter so their
// literal grammar/regex tokens (Expected "$", ="'[\],]) are displayed unaltered.

// Verbatim subtrees: their text is left exactly as authored.
const SKIP = new Set(['code', 'pre', 'inline-math', 'display-math', 'script', 'style', 'svg']);

// Elements that do NOT reset quote context (a quote may span them). Every other
// element is a block boundary that resets context — so a quote opening a new
// block reads as an OPENING quote even if the previous block ended in a letter.
const INLINE = new Set([
  'a', 'em', 'strong', 'b', 'i', 'u', 's', 'span', 'sup', 'sub', 'cite', 'abbr',
  'mark', 'small', 'q', 'time', 'ins', 'del', 'var', 'wbr', 'br', 'code',
]);

// Opaque inline spans: their text is verbatim (SKIP) AND, on exit, quote context
// behaves as after a WORD char — an apostrophe right after `code`/inline-math
// closes (`parseCsv`'s → ’s), not opens, regardless of the span's literal last
// char (option (b): an inline span is a token). A trailing space in the FOLLOWING
// text still resets context to whitespace, so a span + space + quote opens
// normally. Block-level verbatim (pre, display-math, script, …) are NOT here —
// they reset context like any block boundary.
const VERBATIM_INLINE = new Set(['code', 'inline-math']);

// The quote context left after an opaque inline span or inline literal: a word
// char, so a following apostrophe/quote closes (option (b)).
const WORD = 'x';

// A quote is OPENING when preceded by start-of-block, whitespace, an opening
// bracket, a dash, or an already-opened curly quote (nested quotes).
const OPENS = /[\s –—([{“‘]/;
const isWord = (c) => /[A-Za-z0-9]/.test(c);

/** Educate one prose text run. `prev` is the last emitted char before it. */
function educate(text, prev) {
  // Dashes + ellipsis + arrows first (no quote-direction dependency).
  // ORDER MATTERS (#139): the arrow shorthands all contain `--`, so they MUST run
  // before the `---`/`--` dash rules — otherwise `-->` would become `–>` (en-dash)
  // rather than `→`. And `<-->` (which contains both `<--` and `-->`) must run
  // before `-->`/`<--`, or it would be eaten as `<` + `→` / `←` + `>`. Among the
  // dash rules, `---` still runs before `--`.
  const s = text
    .replace(/<-->/g, '↔') // U+2194 LEFT RIGHT ARROW
    .replace(/-->/g, '→')  // U+2192 RIGHTWARDS ARROW
    .replace(/<--/g, '←')  // U+2190 LEFTWARDS ARROW
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
      // Inside a verbatim subtree (SKIP / opaque inline span): byte-identical.
      // The enclosing element's exit rule owns the quote context, so leave prev.
      if (skip) return;
      // Inline literal text (escaped raw HTML / echoed unknown-tag syntax /
      // diagnostic error token, flagged data.verbatim): byte-identical, and
      // behaves as a WORD for the quote context that follows (option (b)).
      if (node.data?.verbatim) { prev = WORD; return; }
      node.value = educate(node.value, prev);
      if (node.value) prev = node.value[node.value.length - 1];
      return;
    }
    if (node.type === 'raw') { prev = ''; return; } // opaque raw HTML island
    if (node.type !== 'element' && node.type !== 'root') return;
    const tag = node.tagName;
    const here = skip || (tag != null && SKIP.has(tag));
    // A block boundary resets quote context. Inline elements (INLINE) and opaque
    // inline spans (VERBATIM_INLINE) do not — a quote may span them.
    if (node.type === 'element' && tag != null && !INLINE.has(tag) && !VERBATIM_INLINE.has(tag)) {
      prev = '';
    }
    for (const child of node.children ?? []) walk(child, here);
    // Exiting an opaque inline span: quote context behaves as after a word, so a
    // following apostrophe closes. (The curl bug was prev staying at the pre-span
    // space because the span's skipped text never advanced it.)
    if (node.type === 'element' && tag != null && VERBATIM_INLINE.has(tag)) prev = WORD;
  };
  walk(tree, false);
  return tree;
}
