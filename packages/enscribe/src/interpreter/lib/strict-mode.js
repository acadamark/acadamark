// #36 strict mode — the strictness register switch.
//
// `<config strict-mode=…>` (or the `strictMode` render option) has three states,
// each naming the LOOSEST register still interpreted:
//   - 'off'       (default) — all three registers interpret. Today's behavior.
//   - 'sigil'     — canonical tags + sigils interpret; the MARKDOWN register is
//                   off (idioms pass through literal, no escaping) and would-be-
//                   markdown text is flagged with a visible lint.
//   - 'canonical' — only the canonical named-tag register interprets; BOTH the
//                   markdown AND sigil registers are off (idioms + `<# #>` / `<$ $>`
//                   / `<->` / `<*>` pass through literal) and would-be-markdown AND
//                   would-be-sigil text is flagged. The canonical `<li>` list item
//                   and the `^{}` / `_{}` shortcuts stay live (they are not sigils).
//
// Mechanism (ratified #36; revised for the canonical rung): "parse off; re-parse
// with the register(s) disabled."
//   off       → the unchanged single parse → byte-identical default output.
//   sigil     → re-parse with the markdown idiom constructs disabled (micromark
//               `disable`). The enscribe extension (tags + sigils) is intact.
//   canonical → re-parse with the markdown idioms disabled AND the sigil register
//               removed from the enscribe finder (`enscribeSyntax({ sigils:false })`
//               via `remarkEnscribe({ sigils:false })`). The sigil tokenizers are
//               not micromark-named constructs, so `disable` cannot target them —
//               a sigil-less variant extension is the mechanism.
// The recursive-content sub-parses run in the same mode, so the register(s) are
// off inside tag pipe bodies too. Native inferences (blank-line → paragraph,
// section nesting) are parser-core, not disableable idioms, so they stay on in
// every mode.
//
// The 'off' path is the unchanged single parse → byte-identical default output.

import { isEnscribeTag } from '../../core/tag.js';
import { ENSCRIBE_STRICT_MODE } from '../../core/file-data-keys.js';

// micromark CommonMark construct names for the markdown register (verified to
// disable cleanly while leaving the enscribe extension's tags/sigils intact).
// The gfm (tables / strikethrough / autolink) and math ($) idioms are turned off
// by NOT adding remark-gfm / remark-math to the disabled processors.
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

const VALID_MODES = new Set(['off', 'sigil', 'canonical']);

/**
 * Remark plugin that disables the markdown-register idiom constructs while
 * leaving the enscribe tag/sigil extension active. Used to build the markdown-off
 * processors (no remark-gfm / remark-math added there → those idioms are off too).
 *
 * @this {import('unified').Processor}
 */
export function disableMarkdownIdioms() {
  const data = this.data();
  data.micromarkExtensions ??= [];
  data.micromarkExtensions.push({ disable: { null: DISABLED_IDIOMS } });
}

/**
 * Resolve the strict mode for a document: the render option wins over an
 * in-document `<config strict-mode=…>` (scanned anywhere in the tree, last wins),
 * defaulting to 'off'. Mirrors note-position's option ?? config ?? default.
 *
 * @param {import('mdast').Root} tree - the (default, registers-on) parsed tree
 * @param {string|undefined} option - the `strictMode` render option, if any
 * @returns {'off'|'sigil'|'canonical'}
 */
export function detectStrictMode(tree, option) {
  if (VALID_MODES.has(option)) return option;
  let mode = 'off';
  (function scan(nodes) {
    for (const node of nodes ?? []) {
      if (isEnscribeTag(node, 'config') && VALID_MODES.has(node.kwargs?.['strict-mode'])) {
        mode = node.kwargs['strict-mode']; // document order: later <config> wins
      }
      if (Array.isArray(node.children)) scan(node.children);
      if (isEnscribeTag(node) && Array.isArray(node.content) && !node.isOpaqueContent) scan(node.content);
    }
  })(tree.children ?? []);
  return mode;
}

/**
 * The shared strict-mode reparse core (audit F9): detect the mode and, when it is
 * sigil/canonical, re-parse `source` with the matching registers-off processor. Pure —
 * no file.data stamping, no tree mutation. Each caller applies the result its own way:
 * resolveStrictMode (below) stamps file.data + swaps tree.children in place; the
 * `enscribe lift` path (liftToCanonicalMdast) uses the returned tree and builds its own
 * inner processor.
 *
 * @returns {{ mode: string, reparsedTree: (import('mdast').Root|null) }} reparsedTree is
 *   null for mode 'off' (no reparse — the default single parse stands).
 */
export function applyStrictModeReparse(tree, source, option, sigilProcessor, canonicalProcessor) {
  const mode = detectStrictMode(tree, option);
  if (mode === 'off') return { mode, reparsedTree: null };
  const offProcessor = mode === 'canonical' ? canonicalProcessor : sigilProcessor;
  return { mode, reparsedTree: offProcessor.parse(source) };
}

/**
 * Transform (runs before recursive-content): resolve the strict mode and, when it
 * is sigil/canonical, RE-PARSE the source with the matching registers-off processor
 * and swap in that tree. Stores the mode on file.data so recursive-content selects
 * the matching inner processor and the strict lint can fire. A strict no-op for
 * mode 'off' → the default single parse is used unchanged (byte-identical).
 *
 * @param {{ sigilProcessor: import('unified').Processor,
 *           canonicalProcessor: import('unified').Processor,
 *           option?: string }} opts
 * @returns {(tree: import('mdast').Root, file: import('vfile').VFile) => void}
 */
export function resolveStrictMode({ sigilProcessor, canonicalProcessor, option } = {}) {
  return (tree, file) => {
    const source = typeof file?.value === 'string' ? file.value : String(file?.value ?? '');
    const { mode, reparsedTree } = applyStrictModeReparse(tree, source, option, sigilProcessor, canonicalProcessor);
    if (file) {
      file.data ??= {};
      file.data[ENSCRIBE_STRICT_MODE] = mode;
    }
    // Swap the registers-off tree in place so every downstream transform sees it.
    if (reparsedTree) tree.children = reparsedTree.children;
  };
}

// ─── the lint flag (hast pass) ─────────────────────────────────────────────────
//
// In sigil/canonical mode, wrap would-be-markdown (and, in canonical, would-be-
// sigil) substrings of text nodes in <span class="enscribe-md-flag"> so CSS can
// mark them. The text still renders — the flag is a nudge toward the canonical
// form, never a failure. Heuristic and over-flagging-tolerant (a false positive
// is harmless). Inline patterns match anywhere; block markers match only at the
// start of a line (a block start, since the registers-off parse left `# `, `> `,
// `- ` and `<# … #>` etc. as literal leading text).

// emphasis `*…*`, inline code `` `…` ``, link `[…](…)`.
const INLINE_MD_SRC = '\\*[^*\\n]+\\*|`[^`\\n]+`|\\[[^\\]\\n]+\\]\\([^)\\n]+\\)';
// sigil tags `<# … #>` / `<$ … $>` / `` <` … `> `` and the `<->` / `<*>` item
// markers — flagged only in canonical mode (where the sigil register is off too).
// `<li>` is canonical and never matched here.
const SIGIL_SRC = '<#+[^\\n]*?#+>|<\\$+[^\\n]*?\\$+>|<`+[^\\n]*?`+>|<->|<\\*>';
const INLINE_MD = new RegExp(`(${INLINE_MD_SRC})`, 'g');
const INLINE_MD_SIGIL = new RegExp(`(${INLINE_MD_SRC}|${SIGIL_SRC})`, 'g');
// leading heading / quote / bullet / ordered-list markers (anchored per line).
const LEADING_MD = /^(\s*(?:#{1,6}|>|[-+*]|\d+\.)\s)/;

function flagSpan(text) {
  return {
    type: 'element',
    tagName: 'span',
    properties: { className: ['enscribe-md-flag'], title: 'looks like markdown or a sigil — use a canonical tag' },
    children: [{ type: 'text', value: text }],
  };
}

/**
 * Split a text value into text + flag-span nodes; null if nothing flagged.
 *
 * Block markers (`#`, `>`, `-`, `1.`) are line-anchored, so the value is scanned
 * line by line: the registers-off parse collapses a multi-line literal block — a
 * bullet list, a quote — into a single text node with embedded newlines, and
 * every line of it is a would-be block start, not just the first. Newlines are
 * preserved as their own text segments so the rendered text is unchanged.
 *
 * @param {string} value
 * @param {RegExp} inlineRe - the inline pattern set (markdown, or markdown+sigil)
 */
function flagText(value, inlineRe) {
  const out = [];
  let flagged = false;
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
    inlineRe.lastIndex = 0;
    while ((m = inlineRe.exec(rest)) !== null) {
      if (m.index > last) out.push({ type: 'text', value: rest.slice(last, m.index) });
      out.push(flagSpan(m[0]));
      last = m.index + m[0].length;
      flagged = true;
    }
    if (last < rest.length) out.push({ type: 'text', value: rest.slice(last) });
  }
  return flagged ? out : null;
}

function walkFlag(node, inVerbatim, inlineRe) {
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
      walkFlag(c, inVerbatim || skip, inlineRe);
      continue;
    }
    if (c.type !== 'text' || inVerbatim) continue;
    const replaced = flagText(c.value, inlineRe);
    if (replaced) {
      kids.splice(i, 1, ...replaced);
      i += replaced.length - 1;
    }
  }
}

/**
 * strict lint: wrap would-be-markdown text (and, in canonical, would-be-sigil
 * text) in flag spans, in place. Called only when the mode is sigil/canonical
 * (a no-op otherwise — never invoked).
 *
 * @param {import('hast').Root} hast
 * @param {'sigil'|'canonical'} mode - canonical adds the sigil patterns
 */
export function flagStrictText(hast, mode) {
  walkFlag(hast, false, mode === 'canonical' ? INLINE_MD_SIGIL : INLINE_MD);
}
