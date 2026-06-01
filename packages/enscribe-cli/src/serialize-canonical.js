// Canonical-Enscribe serializer for `enscribe lift`.
//
// Walks the post-normalize mdast tree (from liftToCanonicalMdast) and emits
// equivalent Enscribe source in canonical named-tag form. The output, re-parsed
// and re-normalized, reproduces the same tree (round-trip fidelity) for common
// documents; pathological edge cases (see the LIMITATIONS notes below) may need
// manual cleanup.
//
// Three deviations from "pure named tags", all forced by round-trip fidelity —
// the named form of these would NOT re-parse to the same tree, so the canonical
// form that DOES round-trip is used instead:
//
//   1. inline / display math → the `<$ … $>` / `<$$ … $$>` sigils, and inline
//      code / code blocks → the `` <`…`> `` / `<``` … ```>` sigils. These tags'
//      content is OPAQUE, but their canonical *names* (`inline-math`, `code-block`,
//      …) are not registered as opaque content handlers (only the sigils are), so
//      `<inline-math>x^2</inline-math>` re-parses as prose and loses the math.
//      The sigils are the canonical Enscribe forms for these opaque elements.
//   2. Lists have no canonical Enscribe tag; they re-emit as markdown list syntax
//      (`- item` / `1. item`), which is the only Enscribe representation of a list.
//   3. Markdown links de-lift to `<span>` during normalization (Enscribe has no
//      markdown-link form); the span's literal text is preserved.

// Tags whose content is opaque and round-trips via their named long form
// (these names ARE registered opaque handlers). Emitted verbatim, no escaping.
const OPAQUE_NAMED = new Set(['table', 'library', 'mermaid', 'abc', 'math', 'csv', 'tsv', 'matrix', 'cases', 'align', 'eqnarray']);

// Structural section tags: title lives in `content`; body is a sibling.
const SECTION_TAGS = new Set(['section', 'sub-section', 'sub-sub-section']);
const SECTION_LEVEL = { section: 1, 'sub-section': 2, 'sub-sub-section': 3 };

// Apparatus containers serialized as multi-line long form holding block children.
const BLOCK_CONTAINER_TAGS = new Set(['data', 'config', 'meta', 'bibliography']);

// Output register, set per-call (synchronous; no concurrency). Drives the
// form-selection deviations of `enscribe lower`:
//   'canonical' — pure named tags (the `lift` default; round-trip-faithful).
//   'shorthand' — section sigils (`<# T #>`) where they exist; else canonical.
//   'markdown'  — markdown heading / bold / italic / strike where they exist;
//                 else shorthand/canonical (Enscribe-only elements stay).
let TARGET = 'canonical';

/**
 * Serialize a tree (Root) to Enscribe source.
 * @param {import('mdast').Root} tree
 * @param {{ target?: 'canonical'|'shorthand'|'markdown' }} [opts]
 */
export function serializeCanonical(tree, { target = 'canonical' } = {}) {
  TARGET = target;
  const body = serializeBlocks(tree.children ?? []);
  return body.replace(/\n+$/, '') + '\n';
}

/** Join block-level nodes with blank lines. */
function serializeBlocks(nodes) {
  const parts = [];
  for (const n of nodes) {
    const s = serializeBlock(n);
    if (s != null && s.length > 0) parts.push(s);
  }
  return parts.join('\n\n');
}

function serializeBlock(node) {
  switch (node.type) {
    case 'paragraph':     return serializeInline(node.children ?? []);
    case 'text':          return escapeText(node.value ?? '', false); // stray top-level text
    case 'thematicBreak': return '---';
    case 'html':          return node.value ?? '';                    // raw HTML verbatim
    case 'blockquote':    return serializeBlockquote(node);
    case 'list':          return serializeList(node);
    case 'code':          return fence(node.lang, node.value ?? '');  // native fenced code
    case 'enscribeTag':   return serializeTag(node, /* block */ true);
    default:
      if (Array.isArray(node.children)) return serializeBlocks(node.children);
      return '';
  }
}

/** Serialize an inline node sequence (paragraph children, pipe content). */
function serializeInline(nodes) {
  let out = '';
  for (const n of nodes ?? []) {
    if (n == null) continue;
    switch (n.type) {
      case 'text':       out += escapeText(n.value ?? '', true); break;
      case 'strong':     out += `<b>${serializeInline(n.children)}</b>`; break;
      case 'emphasis':   out += `<i>${serializeInline(n.children)}</i>`; break;
      case 'inlineCode': out += '`' + (n.value ?? '') + '`'; break;     // opaque verbatim
      case 'break':      out += '\n'; break;
      case 'enscribeTag': out += serializeTag(n, /* block */ false); break;
      default:
        if (Array.isArray(n.children)) out += serializeInline(n.children);
        else if (typeof n.value === 'string') out += escapeText(n.value, true);
    }
  }
  return out;
}

// ─── enscribeTag serialization ───────────────────────────────────────────────

function serializeTag(node, block) {
  const tag = node.tagname;

  // `lower --markdown`: the inline elements that have a markdown idiom. Only the
  // plain (attribute-free) cases reduce; an id/class/kwarg has no markdown home,
  // so those fall through to the canonical/shorthand named form.
  if (TARGET === 'markdown' && !hasAttrs(node)) {
    const inner = () => serializeInline(unwrapParagraph(node.content));
    if (tag === 'b' || tag === 'strong') return `**${inner()}**`;
    if (tag === 'i' || tag === 'em')     return `*${inner()}*`;
    if (tag === 's' || tag === 'del')    return `~~${inner()}~~`;
  }

  // Opaque math / code → canonical sigil forms (see deviation 1 above).
  if (tag === 'inline-math')  return wrapSigil('$',   node);
  if (tag === 'display-math') return wrapSigil('$$',  node);
  if (tag === 'inline-code')  return wrapBacktickSigil(node, false);
  if (tag === 'code-block')   return wrapBacktickSigil(node, true);

  // Apparatus / structural containers → multi-line long form holding blocks.
  if (BLOCK_CONTAINER_TAGS.has(tag) && Array.isArray(node.content)) {
    return `${opener(node)}>\n${serializeBlocks(node.content)}\n</${tag}>`;
  }

  // Opaque named DSL/data tags (content is a verbatim string). Pipe-form content
  // is escape-processed by the grammar even for opaque tags, so content with
  // backslashes / angle brackets / pipes (LaTeX math envs, Mermaid `-->`, …) must
  // use the truly-opaque LONG form; simple content (CSV, BibTeX) stays pipe-form.
  if (OPAQUE_NAMED.has(tag) && typeof node.content === 'string') {
    if (/[\\<>|]/.test(node.content)) {
      let c = node.content;
      if (!c.startsWith('\n')) c = '\n' + c; // opener `>` must be followed by a line ending
      if (!c.endsWith('\n')) c = c + '\n';
      return `${opener(node)}>${c}</${tag}>`;
    }
    return `${opener(node)} |${node.content}>`;
  }

  // Section tags: the title is in `content` (a paragraph).
  if (SECTION_TAGS.has(tag)) {
    const title = serializeInline(unwrapParagraph(node.content));
    if (TARGET !== 'canonical') {
      const h = '#'.repeat(SECTION_LEVEL[tag]);
      const attrs = openerAttrs(node); // id/classes/kwargs, no tagname
      // markdown heading only when there are no attributes to carry; otherwise
      // the section sigil (which can hold an id) is the closest reduction.
      if (TARGET === 'markdown' && !attrs) return `${h} ${title}`;
      return attrs ? `<${h}${attrs} | ${title} ${h}>` : `<${h} ${title} ${h}>`;
    }
    return `${opener(node)} | ${title}>`;
  }

  // Self-closing / attribute-only tags (no content): cite/ref (via @refs), hr, etc.
  if (node.selfClosing) return `${opener(node)} />`;
  if (node.content == null) return `${opener(node)}>`;

  // Content-bearing tag. Pipe form for inline-ish content, long form for blocks.
  const content = node.content;
  if (typeof content === 'string') {
    return `${opener(node)} |${content}>`;
  }
  if (isInlineContent(content)) {
    return `${opener(node)} | ${serializeInline(unwrapParagraph(content))}>`;
  }
  // Block content → long form.
  return `${opener(node)}>\n${serializeBlocks(content)}\n</${tag}>`;
}

/** Reconstruct the opening `<tagname …attrs` (no closing `>`), all attributes. */
function opener(node) {
  let s = '<' + node.tagname;
  if (node.id) s += ' #' + node.id;
  for (const c of node.classes ?? []) s += ' .' + c;
  for (const r of node.atRefs ?? []) s += ' @' + r;
  for (const p of node.positional ?? []) s += ' ' + p;
  for (const [k, v] of Object.entries(node.kwargs ?? {})) s += ` ${k}=${quoteKwarg(v)}`;
  for (const [k, v] of Object.entries(node.booleans ?? {})) s += ` ${v === false ? '-' : '+'}${k}`;
  return s;
}

/** Wrap opaque math content in its sigil; carry id/attrs via a pipe when present. */
function wrapSigil(sig, node) {
  const c = typeof node.content === 'string' ? node.content : '';
  const attrs = openerAttrs(node);
  // With attrs, the `|` is the intended attrs/content separator and a `|` inside
  // the content is safe (only the first `|` separates).
  if (attrs) return `<${sig}${attrs} |${c}${sig}>`;
  // Without attrs, a `|` in the content would be mis-read as that separator, so
  // fall back to the opaque markdown delimiter form, which has no separator.
  if (c.includes('|')) return sig === '$' ? `$${c}$` : `$$\n${c.trim()}\n$$`;
  return `<${sig}${c}${sig}>`;
}

/** Wrap opaque code content in the backtick sigil (` for inline, ``` for block). */
function wrapBacktickSigil(node, block) {
  const c = typeof node.content === 'string' ? node.content : '';
  const fenceStr = block ? '```' : '`';
  // language (block) is the first positional; id/classes carried via a pipe.
  const lang = block ? (node.positional?.[0] ? ' ' + node.positional[0] : '') : '';
  const attrs = openerAttrsNoPositional(node);
  if (attrs) return `<${fenceStr}${lang}${attrs} |${c}${fenceStr}>`;
  return `<${fenceStr}${lang}${c}${fenceStr}>`;
}

/** Attribute string (no leading tagname, no positional) for sigil openers. */
function openerAttrs(node) {
  let s = '';
  if (node.id) s += ' #' + node.id;
  for (const c of node.classes ?? []) s += ' .' + c;
  for (const [k, v] of Object.entries(node.kwargs ?? {})) s += ` ${k}=${quoteKwarg(v)}`;
  return s;
}
const openerAttrsNoPositional = openerAttrs;

/** True when the node carries any attribute (id/class/atRef/positional/kwarg/bool). */
function hasAttrs(node) {
  return Boolean(
    node.id ||
    node.classes?.length ||
    node.atRefs?.length ||
    node.positional?.length ||
    (node.kwargs && Object.keys(node.kwargs).length) ||
    (node.booleans && Object.keys(node.booleans).length),
  );
}

// ─── native mdast block helpers ──────────────────────────────────────────────

function serializeBlockquote(node) {
  // Serialize a native mdast blockquote exactly as a `<blockquote>` enscribeTag
  // would (so lift is idempotent: the re-parsed long/pipe form lifts the same):
  // single-paragraph content → pipe form; multi-block content → long form.
  const children = node.children ?? [];
  if (isInlineContent(children)) {
    return `<blockquote | ${serializeInline(unwrapParagraph(children))}>`;
  }
  return `<blockquote>\n${serializeBlocks(children)}\n</blockquote>`;
}

function serializeList(node) {
  const ordered = node.ordered === true;
  let start = ordered ? (node.start ?? 1) : 0;
  const items = (node.children ?? []).map((item) => {
    const marker = ordered ? `${start++}. ` : '- ';
    // A list item's children are blocks (usually one paragraph); flatten the
    // common single-paragraph case onto the marker line.
    const body = serializeBlocks(item.children ?? []);
    const lines = body.split('\n');
    return marker + lines.map((l, i) => (i === 0 ? l : '  ' + l)).join('\n');
  });
  return items.join('\n');
}

function fence(lang, value) {
  return '```' + (lang ?? '') + '\n' + value + '\n```';
}

// ─── helpers ─────────────────────────────────────────────────────────────────

/** A section/fig/etc. title arrives wrapped in a paragraph; unwrap to inline. */
function unwrapParagraph(content) {
  if (Array.isArray(content) && content.length === 1 && content[0].type === 'paragraph') {
    return content[0].children ?? [];
  }
  return content ?? [];
}

/** True when every node is inline-shaped (text/inline-tag/emphasis/…) or a
 *  single wrapping paragraph — i.e. it can be the pipe content of one tag. */
function isInlineContent(content) {
  if (!Array.isArray(content)) return false;
  if (content.length === 1 && content[0].type === 'paragraph') return true;
  return content.every(isInlineNode);
}

const INLINE_TYPES = new Set(['text', 'strong', 'emphasis', 'inlineCode', 'break']);
const INLINE_TAGS = new Set([
  'b', 'i', 'u', 's', 'q', 'em', 'strong', 'a', 'span', 'code', 'inline-code',
  'inline-math', 'sup', 'sub', 'cite', 'ref', 'note',
]);
function isInlineNode(n) {
  if (n == null) return false;
  if (INLINE_TYPES.has(n.type)) return true;
  if (n.type === 'enscribeTag') return INLINE_TAGS.has(n.tagname);
  return false;
}

/** Quote a kwarg value when it would not survive as a bare token. */
function quoteKwarg(v) {
  const s = String(v ?? '');
  if (s === '' || /[\s"|<>=]/.test(s)) {
    return s.includes('"') ? `'${s}'` : `"${s}"`;
  }
  return s;
}

/**
 * Escape literal text so it re-parses verbatim. `\` and `<` always escape; in
 * named-tag content `|` and `>` also need handling (`>` is not backslash-
 * escapable inside a tag — the finder closes on it — so use the `&gt;` entity,
 * per notes/specs/escape-rules-spec.md). Markdown idiom characters
 * (`*`, `_`, `` ` ``, `$`, `[`, `#`) are left as-is: a text node that contains
 * them did NOT form a construct on the way in, so it usually re-parses
 * unchanged. (LIMITATION: a pathological case where re-emission re-forms a
 * construct may need manual cleanup — the documented best-effort boundary.)
 */
function escapeText(text, inNamedContent) {
  let s = String(text).replace(/\\/g, '\\\\').replace(/</g, '\\<');
  if (inNamedContent) s = s.replace(/\|/g, '\\|').replace(/>/g, '&gt;');
  return s;
}
