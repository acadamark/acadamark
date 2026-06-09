// #36 strict mode — the markdown register switch.
//
// `<config markdown=…>` (or the `markdown` render option) has three states:
//   - 'on'      (default) — all three registers interpret. Today's behavior.
//   - 'literal' — canonical + sigil interpret; the markdown register is OFF and
//                 markdown characters pass through as themselves (no escaping).
//   - 'strict'  — literal, plus a visible lint flagging would-be-markdown text.
//
// Mechanism (ratified, #36 Phase 0): "parse on; re-parse with markdown disabled."
// The document is parsed normally first (so config-discovery can find
// `<config markdown>` anywhere). If the mode is literal/strict, the source is
// RE-PARSED with the CommonMark/gfm/math idiom constructs disabled (micromark
// `disable`) — so `*`, `#`, `-`, `>`, `` ` ``, `[..](..)`, `$…$`, pipe tables etc.
// are plain text EVERYWHERE, including inside tag pipe bodies (the recursive-
// content sub-parses run idioms-off too). No source-slicing / AST reconstruction.
// Canonical tags and sigils ride the separate enscribe micromark extension, so
// they interpret untouched in all three modes. Native inferences (blank-line →
// paragraph, section nesting) are parser-core / structural transforms, not
// disableable idioms, so they stay on in every mode.
//
// The 'on' path is the unchanged single parse → byte-identical default output.

import { isEnscribeTag } from '../../core/tag.js';
import { ENSCRIBE_MARKDOWN_MODE } from '../../core/file-data-keys.js';

// micromark CommonMark construct names for the markdown register (verified to
// disable cleanly while leaving the enscribe extension's tags/sigils intact).
// The gfm (tables / strikethrough / autolink) and math ($) idioms are turned off
// by NOT adding remark-gfm / remark-math to the idioms-off processor.
export const DISABLED_IDIOMS = [
  'attention',        // * _ emphasis / strong
  'headingAtx',       // # heading
  'setextUnderline',  // === / --- underline heading
  'list',             // - * + / 1. lists
  'blockQuote',       // > quote
  'codeFenced',       // ``` fenced code
  'codeIndented',     // 4-space indented code
  'codeText',         // `inline code`
  'labelStartLink',   // [ link
  'labelStartImage',  // ![ image
  'labelEnd',         // ](url) link/image tail
  'thematicBreak',    // --- *** ___ rule
  'autolink',         // <http://…> (enscribe owns `<`; this idiom goes literal)
];

const VALID_MODES = new Set(['on', 'literal', 'strict']);

/**
 * Remark plugin that disables the markdown-register idiom constructs while
 * leaving the enscribe tag/sigil extension active. Used to build the idioms-off
 * parser (no remark-gfm / remark-math added there → those idioms are off too).
 *
 * @this {import('unified').Processor}
 */
export function disableMarkdownIdioms() {
  const data = this.data();
  data.micromarkExtensions ??= [];
  data.micromarkExtensions.push({ disable: { null: DISABLED_IDIOMS } });
}

/**
 * Resolve the markdown mode for a document: the render option wins over an
 * in-document `<config markdown=…>` (scanned anywhere in the tree, last wins),
 * defaulting to 'on'. Mirrors note-position's option ?? config ?? default.
 *
 * @param {import('mdast').Root} tree - the (markdown-on) parsed tree
 * @param {string|undefined} option - the `markdown` render option, if any
 * @returns {'on'|'literal'|'strict'}
 */
export function detectMarkdownMode(tree, option) {
  if (VALID_MODES.has(option)) return option;
  let mode = 'on';
  (function scan(nodes) {
    for (const node of nodes ?? []) {
      if (isEnscribeTag(node, 'config') && VALID_MODES.has(node.kwargs?.markdown)) {
        mode = node.kwargs.markdown; // document order: later <config> wins
      }
      if (Array.isArray(node.children)) scan(node.children);
      if (isEnscribeTag(node) && Array.isArray(node.content) && !node.isOpaqueContent) scan(node.content);
    }
  })(tree.children ?? []);
  return mode;
}

/**
 * Transform (runs before recursive-content): resolve the markdown mode and, when
 * it is literal/strict, RE-PARSE the source with the idioms-off processor and
 * swap in that tree. Stores the mode on file.data so recursive-content selects
 * the idioms-off inner processor and the strict lint can fire. A strict no-op for
 * mode 'on' → the default single parse is used unchanged (byte-identical).
 *
 * @param {{ offProcessor: import('unified').Processor, option?: string }} opts
 * @returns {(tree: import('mdast').Root, file: import('vfile').VFile) => void}
 */
export function resolveMarkdownMode({ offProcessor, option } = {}) {
  return (tree, file) => {
    const mode = detectMarkdownMode(tree, option);
    if (file) {
      file.data ??= {};
      file.data[ENSCRIBE_MARKDOWN_MODE] = mode;
    }
    if (mode === 'on') return; // unchanged default parse
    // Re-parse the original source with the markdown register off, then swap the
    // tree in place so every downstream transform sees the idioms-off tree.
    const source = typeof file?.value === 'string' ? file.value : String(file?.value ?? '');
    const offTree = offProcessor.parse(source);
    tree.children = offTree.children;
  };
}

// ─── strict: the lint flag (hast pass) ────────────────────────────────────────
//
// In strict mode, wrap would-be-markdown substrings of text nodes in
// <span class="enscribe-md-flag"> so CSS can mark them. The text still renders —
// the flag is a nudge toward the tag/sigil form, never a failure. Heuristic and
// over-flagging-tolerant (a false positive is harmless). Inline patterns match
// anywhere; block markers match only at the start of a text node (a block start,
// since the idioms-off parse left `# `, `> `, `- ` as literal leading text).

// emphasis `*…*`, inline code `` `…` ``, link `[…](…)`.
const INLINE_MD = /(\*[^*\n]+\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\n]+\))/g;
// leading heading / quote / bullet / ordered-list markers (anchored per line).
const LEADING_MD = /^(\s*(?:#{1,6}|>|[-+*]|\d+\.)\s)/;

function flagSpan(text) {
  return {
    type: 'element',
    tagName: 'span',
    properties: { className: ['enscribe-md-flag'], title: 'looks like markdown — use a tag or sigil' },
    children: [{ type: 'text', value: text }],
  };
}

/**
 * Split a text value into text + flag-span nodes; null if nothing flagged.
 *
 * Block markers (`#`, `>`, `-`, `1.`) are line-anchored, so the value is scanned
 * line by line: the idioms-off parse collapses a multi-line literal block — a
 * bullet list, a quote — into a single text node with embedded newlines, and
 * every line of it is a would-be block start, not just the first. Newlines are
 * preserved as their own text segments so the rendered text is unchanged.
 */
function flagText(value) {
  const out = [];
  let flagged = false;
  // split on newlines, keeping them as tokens, so a multi-line node is flagged
  // per logical line while its exact text (newlines included) round-trips.
  for (const segment of value.split(/(\n)/)) {
    if (segment === '') continue;
    if (segment === '\n') { out.push({ type: 'text', value: '\n' }); continue; }
    let rest = segment;
    const lead = rest.match(LEADING_MD);
    if (lead) {
      out.push(flagSpan(lead[1]));
      rest = rest.slice(lead[1].length);
      flagged = true;
    }
    let last = 0;
    let m;
    INLINE_MD.lastIndex = 0;
    while ((m = INLINE_MD.exec(rest)) !== null) {
      if (m.index > last) out.push({ type: 'text', value: rest.slice(last, m.index) });
      out.push(flagSpan(m[0]));
      last = m.index + m[0].length;
      flagged = true;
    }
    if (last < rest.length) out.push({ type: 'text', value: rest.slice(last) });
  }
  return flagged ? out : null;
}

function walkFlag(node, inVerbatim) {
  const kids = node.children;
  if (!Array.isArray(kids)) return;
  for (let i = 0; i < kids.length; i++) {
    const c = kids[i];
    if (c.type === 'element') {
      // Don't flag inside verbatim / already-flagged subtrees.
      const skip =
        c.tagName === 'code' || c.tagName === 'pre' || c.tagName === 'script' ||
        c.tagName === 'style' || c.tagName === 'inline-math' || c.tagName === 'display-math' ||
        (Array.isArray(c.properties?.className) && c.properties.className.includes('enscribe-md-flag'));
      walkFlag(c, inVerbatim || skip);
      continue;
    }
    if (c.type !== 'text' || inVerbatim) continue;
    const replaced = flagText(c.value);
    if (replaced) {
      kids.splice(i, 1, ...replaced);
      i += replaced.length - 1;
    }
  }
}

/**
 * strict-mode lint: wrap would-be-markdown text in flag spans, in place. Called
 * only when the mode is 'strict' (a no-op otherwise — never invoked).
 *
 * @param {import('hast').Root} hast
 */
export function flagMarkdownText(hast) {
  walkFlag(hast, false);
}
