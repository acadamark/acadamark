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

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkEnscribe from '../../parser/index.js';
import { isEnscribeTag } from '../../core/tag.js';
import { ENSCRIBE_STRICT_MODE, ENSCRIBE_STRICT_ASSEMBLED } from '../../core/file-data-keys.js';
import { hasMasterSrcEntries } from '../../master-document/assemble.js';

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
 * Build the registers-off PARSE processor for a strict mode — the single source for the off-parse
 * used in three places: the in-pipeline reparse (resolveStrictMode), the recursive-content sub-parses,
 * and (#460) registers-off ASSEMBLY, where each multi-file child is parsed with the matching off
 * processor so the master's document-wide strict-mode reaches the children.
 *   'sigil'     — markdown idioms disabled; the enscribe tag + sigil register intact.
 *   'canonical' — markdown idioms disabled AND the sigil register removed from the finder
 *                 (remarkEnscribe({ sigils:false })), so only the canonical named-tag register reads.
 * Parse-only (no render options): the mode changes how shorthand is read, nothing downstream.
 *
 * @param {'sigil'|'canonical'} mode
 * @returns {import('unified').Processor}
 */
export function buildStrictOffProcessor(mode) {
  const sigils = mode !== 'canonical'; // canonical also removes the sigil register
  return unified().use(remarkParse).use(remarkEnscribe, { sigils }).use(disableMarkdownIdioms);
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
    // #460: an ASSEMBLED multi-file document (book / website / multi-file article) applies the strict
    // register at ASSEMBLY — each child is parsed with the matching registers-off processor
    // (render-document.js resolveAssemblyStrict), driven by the MASTER's document-wide strict-mode. When that
    // happened the assembled tree is already strict-parsed; just record the master's mode so the lint
    // flag and the recursive-content sub-parses stay consistent. No reparse of file.value (which is the
    // MASTER only, not the assembled children), and no diagnostic — the register genuinely applied. The
    // master's mode governs every child; a child that declared its own is flagged at assembly (assemble.js).
    const assembled = file?.data?.[ENSCRIBE_STRICT_ASSEMBLED];
    if (assembled) {
      file.data[ENSCRIBE_STRICT_MODE] = assembled;
      return;
    }
    const source = typeof file?.value === 'string' ? file.value : String(file?.value ?? '');
    const { mode, reparsedTree } = applyStrictModeReparse(tree, source, option, sigilProcessor, canonicalProcessor);
    // A SINGLE-SOURCE document (a plain render, or a single-file book/website whose chapters/pages are
    // authored inline) reparses faithfully — `file.value` is the whole document — and the swap proceeds.
    // A multi-file document never reaches here with a strict mode (it set STRICT_ASSEMBLED above); the
    // faithfulness guard (#451) remains the backstop against a master-only reparse dropping children.
    if (reparsedTree && isFaithfulReparse(reparsedTree, source)) {
      tree.children = reparsedTree.children;
    }
    if (file) {
      file.data ??= {};
      file.data[ENSCRIBE_STRICT_MODE] = mode;
    }
  };
}

/**
 * A reparse faithfully reproduces the tree it would replace only when `source` is the WHOLE
 * document's source. It is NOT faithful when the source is empty/blank (an assembled VFile with
 * no source — the reparse would wipe the tree) or when the reparse still carries top-level
 * `<… src>` / `<include>` transclusion entries (the source is a multi-file MASTER whose children
 * live in other files — the in-hand tree is already assembled, so swapping in the master-only
 * reparse would drop them). See resolveStrictMode's swap guard (#451).
 */
function isFaithfulReparse(reparsedTree, source) {
  if (!source || source.trim() === '') return false;
  return !hasMasterSrcEntries(reparsedTree);
}

// ─── the lint flag (hast pass) ─────────────────────────────────────────────────
//
// In sigil/canonical mode, wrap would-be-markdown (and, in canonical, would-be-
// sigil) substrings of text nodes in <md-flag> so CSS can
// mark them. The text still renders — the flag is a nudge toward the canonical
// form, never a failure. Heuristic and over-flagging-tolerant (a false positive
// is harmless). Inline patterns match anywhere; block markers match only at the
// start of a line (a block start, since the registers-off parse left `# `, `> `,
// `- ` and `<# … #>` etc. as literal leading text).

// emphasis `*…*`, inline code `` `…` ``, link `[…](…)` and image `![…](…)`. The optional leading
// `!` flags the image form too (#317/2-F): it is markdown sugar with a canonical equivalent
// (`<fig>` / `<img>`), so it belongs in the would-be-markdown flag set exactly like a link. The `!`
// is only consumed when immediately followed by a `[…](…)`, so a bare `!` in prose is never flagged.
// A GFM footnote REFERENCE `[^1]` (#407): not an enscribe idiom, always literal,
// canonical replacement `<note>` / `<^ …>`. Flagged inline like a markdown link.
// Distinct from the link pattern (which requires a trailing `(…)`) and from a
// `[label]` link-reference (which has no leading `^`).
const INLINE_MD_SRC = '\\*[^*\\n]+\\*|`[^`\\n]+`|!?\\[[^\\]\\n]+\\]\\([^)\\n]+\\)|\\[\\^[^\\]\\n]+\\]';
// sigil tags `<# … #>` / `<$ … $>` / `` <` … `> `` and the `<->` / `<*>` item
// markers — flagged only in canonical mode (where the sigil register is off too).
// `<li>` is canonical and never matched here.
const SIGIL_SRC = '<#+[^\\n]*?#+>|<\\$+[^\\n]*?\\$+>|<`+[^\\n]*?`+>|<->|<\\*>|<\\^[^\\n]*?>';
const INLINE_MD = new RegExp(`(${INLINE_MD_SRC})`, 'g');
const INLINE_MD_SIGIL = new RegExp(`(${INLINE_MD_SRC}|${SIGIL_SRC})`, 'g');
// leading heading / quote / bullet / ordered-list markers, plus a line-start
// definition marker `[label]: ` — a GFM footnote definition `[^1]: …` or a
// reference-link definition `[label]: url` (#407): both are always-literal
// non-idioms whose canonical form is `<note>` / `<^ …>` / `<a>`. Anchored per line.
const LEADING_MD = /^(\s*(?:#{1,6}|>|[-+*]|\d+\.|\[[^\]\n]+\]:)\s)/;

function flagSpan(text) {
  return {
    type: 'element',
    tagName: 'md-flag',
    properties: { title: 'looks like markdown or a sigil — use a canonical tag' },
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
        c.tagName === 'md-flag';
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
