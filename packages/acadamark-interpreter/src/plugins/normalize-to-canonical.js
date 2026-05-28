// The normalize-to-canonical gate.
//
// This module is the single early pipeline stage that coerces every
// authored form to its canonical Layer 1 shape. After this stage runs, no
// downstream structural, semantic, or interpreter plugin handles a
// non-canonical form — every node has its canonical tagname / type / shape.
//
// A NEW AUTHORED FORM IS A NEW RULE HERE — never a new sniff in a
// downstream plugin. See DESIGN.md §"Lift and lower" and §"The single
// gate" for the three-level / two-mechanism / single-gate architecture.
//
// Pipeline position: between remarkRecursiveContent (step 1) and
// acadamarkConfigDiscovery (step 2). Earliest position where both parsers
// (the acadamark Peggy parser AND the remark markdown lexer, including
// remark-math and remark-gfm) have produced nodes, and earliest position
// before any structural plugin runs.
//
// The rules below are organized into ordered groups, applied as a single
// dispatch by node type / tagname:
//
//   Existing — Delegated-parser nodes (the original "normalize-markdown"
//     job): inlineMath / math (remark-math) and table (remark-gfm).
//
//   Group A — Sigil tagname rewrite (the tagname↔sigil cipher, lift
//     direction): an acadamarkTag whose tagname is a sigil token
//     ('#'/'##'/'###'/'$'/'$$'/'`'/'```') has its tagname rewritten to the
//     canonical Layer 1 vocabulary name (section/sub-section/.../inline-math/
//     display-math/inline-code/code-block). Uniformly across section sigils
//     and math/code sigils. After group A, no downstream node carries a
//     sigil tagname.
//
//   Group B — Bare markdown heading → section. mdast `heading` of depth
//     1/2/3 becomes a canonical section / sub-section / sub-sub-section
//     acadamarkTag. Depths 4/5/6 pass through as literal HTML <hN> elements
//     (a named, narrow exception to Layer 1's otherwise-closed vocabulary;
//     see DESIGN.md §"The <h4>–<h6> exception") with an informative
//     diagnostic.
//
//   Group C — Recursive inline lift. mdast inline forms (emphasis, strong,
//     delete, inlineCode, link, image, break, raw html) are lifted to their
//     canonical Layer 1 elements. linkReference, imageReference, and
//     footnoteReference are unsupported authoring forms and pass through
//     unchanged (with a diagnostic where useful).
//
// The dispatch is mutually exclusive by node type and tagname so ordering
// is not behaviorally significant — but the order above is the deliberate
// reading order: delegated-parser nodes first (the historical job), then
// the lift-direction cipher (group A), then mdast lift rules (groups B/C).

import { getContentHandler } from 'acadamark-core/dsl-registry';
import { makeTag, makeOpaqueTag, isAcadamarkTag } from 'acadamark-core/tag';
import { walkNormalize } from 'acadamark-core/walkers/walk-normalize';
import { SIGIL_TO_TAGNAME, isSigilTagname } from 'acadamark-core/tagname-sigil-map';
import {
  STRUCTURED_ELEMENTS,
  isStructuredElement,
  getStructuredSpec,
} from 'acadamark-core/structured-elements';
import {
  isFrameableLiftable,
  getFrameableLiftSpec,
} from 'acadamark-core/frameable-elements';
import {
  CONFIG_KWARGS, isConfigKwarg,
} from '../lib/apparatus-allowlists.js';

// Phase 4 slice 4a (2026-05-29): book-part shorthand tagnames that
// expand at the gate to `<book-part book-part-type="...">`. The set
// matches `book-part.md`'s `shorthand_expansions` block; the
// build-time vocab generator skips these (they have spaces in their
// expands_to values) so the expansion has to happen at the gate.
const BOOK_PART_SHORTHANDS = new Set([
  'chapter', 'part', 'appendix', 'preface', 'foreword',
  'introduction', 'conclusion', 'glossary', 'dedication',
]);

// Per-document book-context flag. Set by the gate's transformer at the
// start of each invocation (single-threaded; unified pipeline is
// sequential). Read by the book-part shorthand expansion predicate
// (Group A1.7 in NORMALIZATIONS below). The flag exists so the
// expansion fires ONLY in book documents — `<glossary>` (which has
// both standalone-vocab and book-part-shorthand meanings) keeps its
// standalone meaning in articles.
const _bookContextFlag = { isBook: false };

function detectBookContext(treeChildren) {
  for (const child of treeChildren ?? []) {
    if (isAcadamarkTag(child) && child.tagname === 'meta') {
      const type = child.kwargs?.type;
      if (type === 'book' || type === 'book-part') return true;
    }
  }
  return false;
}

// ─── Drift guards at module load ──────────────────────────────────────────────
// Confirm contentHandler values. These are authoritative in dsl-registry.js;
// if they change, these assertions catch the drift.
const _mathHandler = getContentHandler('$');
const _mathDisplayHandler = getContentHandler('$$');
const _tableHandler = getContentHandler('table');
if (_mathHandler !== 'math') {
  throw new Error(
    `normalize-to-canonical: expected getContentHandler('$') === 'math', got '${_mathHandler}'`,
  );
}
if (_mathDisplayHandler !== 'math-display') {
  throw new Error(
    `normalize-to-canonical: expected getContentHandler('$$') === 'math-display', got '${_mathDisplayHandler}'`,
  );
}
if (_tableHandler !== 'table') {
  throw new Error(
    `normalize-to-canonical: expected getContentHandler('table') === 'table', got '${_tableHandler}'`,
  );
}

// ─── GFM table → pipe-table string serializer ────────────────────────────────
//
// Option A: serialize the structured remark-gfm `table` node into a GFM
// pipe-table string so the table handler's `parseMd` path can re-parse it.
//
// Loss contract: inline markup (emphasis, links, etc.) in cells is flattened
// to plain text. When this happens, a file.message() warning is emitted.
// Plain-text-only cells are lossless. `|` in cell text is escaped as `\|`
// (parseMd has been updated to handle this escape).
//
// GFM alignment → delimiter string:
//   null     → ---
//   'left'   → :--
//   'right'  → --:
//   'center' → :-:

function alignToDelim(align) {
  if (align === 'center') return ':-:';
  if (align === 'right') return '--:';
  if (align === 'left') return ':--';
  return '---';
}

/**
 * Extract plain text from inline mdast children of a tableCell.
 * Returns { text: string, hasMarkup: boolean }.
 *
 * Handled inline types:
 *   text, inlineCode, inlineMath → .value (plain text)
 *   emphasis, strong, delete, link → recurse into .children
 *   image → .alt
 *   acadamarkTag ($ / $$, normalized before table? No — the walk visits
 *     table first in DFS; cell children may still be inlineMath here) → .value
 *     treated as markup; warn and use .value if available.
 *   Anything else → mark as markup, skip.
 *
 * Note: the normalization walk (walkNormalize) visits nodes in pre-order DFS.
 * A bare `table` at the top level is found before any `inlineMath` nodes that
 * may exist inside it. The entire `table` subtree is replaced at once, so the
 * cell children are raw remark-gfm nodes (inlineMath, not yet acadamarkTag).
 */
function extractCellText(nodes, result) {
  for (const node of nodes) {
    switch (node.type) {
      case 'text':
        result.text += node.value ?? '';
        break;
      case 'inlineCode':
        result.text += node.value ?? '';
        result.hasMarkup = true;   // code markup lost (backticks dropped)
        break;
      case 'inlineMath':
        result.text += node.value ?? '';
        result.hasMarkup = true;   // LaTeX markup lost
        break;
      case 'emphasis':
      case 'strong':
      case 'delete':
        result.hasMarkup = true;
        if (node.children) extractCellText(node.children, result);
        break;
      case 'link':
        result.hasMarkup = true;
        if (node.children) extractCellText(node.children, result);
        break;
      case 'image':
        result.text += node.alt ?? '';
        result.hasMarkup = true;
        break;
      default:
        // Unknown inline type — skip content, mark as markup lost.
        result.hasMarkup = true;
        break;
    }
  }
}

/**
 * Serialize a remark-gfm `table` mdast node to a GFM pipe-table string.
 * `file` is the unified VFile; used for warning emission when markup is lost.
 *
 * @param {object} node - remark-gfm table node
 * @param {object} file - unified VFile (may be a plain object with .message)
 * @returns {string} - GFM pipe-table string suitable for parseMd()
 */
export function gfmTableToPipeString(node, file) {
  const rows = node.children ?? [];
  if (rows.length === 0) {
    return '';
  }

  const align = node.align ?? [];
  let anyMarkup = false;

  // Build text rows from all tableRow children.
  const textRows = rows.map(row => {
    const cells = row.children ?? [];
    return cells.map(cell => {
      const result = { text: '', hasMarkup: false };
      extractCellText(cell.children ?? [], result);
      if (result.hasMarkup) anyMarkup = true;
      // Escape literal `|` so parseMd's \| handling round-trips correctly.
      return result.text.replace(/\|/g, '\\|');
    });
  });

  if (anyMarkup && file && typeof file.message === 'function') {
    file.message(
      'GFM table cell contains inline markup (emphasis, links, math, etc.) — ' +
      'markup is lost when normalizing to <table md>. ' +
      'Use an authored <table md | ...> tag to preserve markup.',
      node,
      'acadamark:normalize-markdown:table-markup-loss',
    );
  }

  // Determine column count from the header row.
  const colCount = textRows[0]?.length ?? 0;
  if (colCount === 0) return '';

  // Emit header row.
  const headerRow = '| ' + textRows[0].join(' | ') + ' |';

  // Emit delimiter row.
  const delimCells = [];
  for (let c = 0; c < colCount; c++) {
    delimCells.push(alignToDelim(align[c] ?? null));
  }
  const delimRow = '| ' + delimCells.join(' | ') + ' |';

  // Emit body rows.
  const bodyLines = textRows.slice(1).map(row => '| ' + row.join(' | ') + ' |');

  return [headerRow, delimRow, ...bodyLines].join('\n');
}

// ─── Per-construct mapping ────────────────────────────────────────────────────
//
// Each entry is { predicate, normalize }.
// predicate(node) — true if this entry handles the node.
// normalize(node, file) — returns the canonical acadamarkTag replacement.
//   The `file` argument is optional; math normalizers ignore it.
//
// Future entries for headings will use `depth`-conditional logic inside
// normalize(). Neither requires structural change here.

// ─── Group B helper: heading → section ───────────────────────────────────────
//
// mdast heading shape: { type: 'heading', depth: 1-6, children: <inline[]> }.
//
// Canonical section shape (matches what a named <section | Title> produces
// post-remarkRecursiveContent): an acadamarkTag with tagname 'section' /
// 'sub-section' / 'sub-sub-section', content === [ paragraph wrapping the
// title inlines ]. The downstream section-nesting.js plugin reads this shape
// via its extractTitleContent helper (which unwraps the single paragraph).
//
// Depths 4-6 are passed through as a literal HTML <hN> element with an
// informative diagnostic (a named, narrow exception to Layer 1's
// otherwise-closed vocabulary — see DESIGN.md §"The <h4>–<h6> exception").

const HEADING_DEPTH_TO_TAGNAME = {
  1: 'section',
  2: 'sub-section',
  3: 'sub-sub-section',
};

function headingToSection(node) {
  const tagname = HEADING_DEPTH_TO_TAGNAME[node.depth];
  // Wrap the heading's inline children in a paragraph so the resulting
  // content matches the canonical shape (`content: [paragraph]`) the
  // section-nesting plugin's extractTitleContent expects.
  const paragraph = {
    type: 'paragraph',
    children: node.children ?? [],
  };
  return makeTag(tagname, [paragraph]);
}

function headingToPassThroughHN(node, file) {
  // Build a raw mdast `html` node containing the literal <hN>…</hN> tags
  // with the inline children preserved between them. Using an `html`
  // wrapper is the established pattern for "literal HTML pass-through";
  // mdast-util-to-hast carries `html` nodes verbatim through to hast.
  //
  // A simpler alternative — emit a hast `element` directly — would not
  // work because this stage produces mdast (the unified processor runs
  // mdast transforms before mdast→hast). We must stay in mdast.
  //
  // The children array on the resulting wrapper carries the heading's
  // inline children, sandwiched between `html` open/close tags. This
  // lets emphasis / strong / inlineCode inside an <h4> still be lifted
  // by group C (the walker recurses into children).
  if (file && typeof file.message === 'function') {
    file.message(
      `heading depth ${node.depth} exceeds Layer 1's three section levels; ` +
      `passed through as <h${node.depth}>`,
      node,
      'normalize-to-canonical:heading-depth-out-of-range',
    );
  }
  return {
    type: 'paragraph',  // benign wrapper; the raw html tags around its children
                        // produce the actual <hN>…</hN> in the rendered output
    data: { hName: `h${node.depth}` },  // hast hint: render this mdast node as <hN>
    children: node.children ?? [],
  };
}

// ─── Group C helper: inline lift table ───────────────────────────────────────
//
// Each entry: { predicate, normalize }. The predicate identifies an mdast
// inline node type; the normalize function returns the canonical acadamarkTag.
// Recursion is the walker's responsibility — these rules are 1-to-1 on a
// single node.
//
// Decided mappings (the stylistic side, not the semantic side — see
// vocabulary entries i.md / b.md):
//   emphasis → <i>          (stylistic italics; the semantic <em> exists but
//                            markdown stars are treated as stylistic)
//   strong   → <b>          (stylistic bold; same reasoning vs <strong>)
//   delete   → <s>          (GFM strikethrough)
//   inlineCode → <inline-code> with opaque content (the value is the code text)
//   link     → <a> with href / title kwargs
//   image    → <img> with src / alt / title kwargs
//   break    → pass through as a literal <br> (no diagnostic — line breaks
//              are common; per-occurrence notices would be noise)
//   html     → pass through with a diagnostic about round-trip non-guarantee
//
// linkReference / imageReference / footnoteReference are unsupported authoring
// forms — they pass through unchanged, no lift.

function liftEmphasis(node) {
  return makeTag('i', node.children ?? []);
}

function liftStrong(node) {
  return makeTag('b', node.children ?? []);
}

function liftDelete(node) {
  return makeTag('s', node.children ?? []);
}

function liftInlineCode(node) {
  // inline-code is opaque (the code text is the verbatim content); the
  // vocabulary entry says contentHandler 'code'.
  return makeOpaqueTag('inline-code', node.value ?? '', {
    contentHandler: getContentHandler('inline-code'),
  });
}

function liftLink(node) {
  const kwargs = {};
  if (node.url) kwargs.href = node.url;
  if (node.title) kwargs.title = node.title;
  return makeTag('a', node.children ?? [], { kwargs });
}

function liftImage(node) {
  const kwargs = {};
  if (node.url) kwargs.src = node.url;
  if (node.alt != null) kwargs.alt = node.alt;
  if (node.title) kwargs.title = node.title;
  // <img> is void in HTML; canonical shape has empty content array.
  return makeTag('img', [], { kwargs });
}

function liftHardBreak(_node) {
  // Pass through as a literal <br> via the mdast→hast hName hint.
  return {
    type: 'break',           // mdast type
    data: { hName: 'br' },   // hast hint
  };
}

function liftRawHtml(node, file) {
  if (file && typeof file.message === 'function') {
    file.message(
      'raw HTML passed through; Layer 1 round-trip not guaranteed for this fragment',
      node,
      'normalize-to-canonical:raw-html-passthrough',
    );
  }
  return node;
}

// ─── Group D helper: structured-element kwarg → child-tag lift ───────────────
//
// Per DESIGN.md §"Structured-data-container tags", a structured-element tag
// (registered in acadamark-core/structured-elements.js — today: <meta>,
// <author>) accepts two authoring forms: kwargs and child tags. Both produce
// the same Layer 1 child-tag canonical shape. The lift here converts the
// kwarg form to the child-tag form per the per-tag spec, so downstream
// consumers see one shape.
//
// Per-spec field meanings (see structured-elements.js for the schema):
//   acceptedKwargs    — accepted kwargs at all; rest are warned + dropped.
//   liftedKwargs      — subset that lifts from kwarg form to child-tag form.
//                       Accepted-but-not-lifted kwargs stay as kwargs (e.g.
//                       <meta>'s `type`, which controls structural routing).
//   booleanKwargs     — boolean markers always stay as kwargs (e.g.
//                       <author>'s `+corresponding`).
//   misusePartnerTag  — if set, an unknown kwarg accepted by the partner
//                       triggers a "did you mean <partner>?" hint. Today
//                       only <meta> pairs with <config>; the <config>
//                       partner consults are done via the apparatus-allowlists
//                       isConfigKwarg predicate (since <config> is not itself
//                       a structured element).
//
// <config> remains kwarg-driven and handled by the legacy liftConfigKwargs
// below — its content is processing options, not a record of named
// document-descriptive fields, and the authoring surface today is kwargs-only.

function liftStructuredKwargs(node, file) {
  const tagname = node.tagname;
  const spec = getStructuredSpec(tagname);
  if (!spec) return node; // defensive; gate's predicate should filter

  const kwargs = node.kwargs ?? {};
  const newKwargs = {};
  const liftedChildren = [];

  // Boolean-kwarg surface unification: +key / -key forms arrive in
  // node.booleans; key=true / key=false kwarg forms arrive in node.kwargs.
  // For any key declared in spec.booleanKwargs, promote node.booleans[key]
  // into node.kwargs so the canonical Layer 1 home is uniformly node.kwargs
  // (which is what the schema's buildProperties iterates). Without this,
  // the +form would not render to an HTML attribute through the schema
  // dispatcher (booleans are read only by per-tag handlers, not the schema
  // dispatch). Performed before the kwarg loop so the boolean-promoted key
  // lands in newKwargs via the boolean-kwarg branch below.
  if (node.booleans) {
    for (const key of spec.booleanKwargs) {
      if (node.booleans[key] !== undefined) {
        kwargs[key] = node.booleans[key];
        delete node.booleans[key];
      }
    }
  }

  const partner = spec.misusePartnerTag;
  const partnerSpec = partner ? getStructuredSpec(partner) : null;

  for (const [key, value] of Object.entries(kwargs)) {
    if (spec.booleanKwargs.has(key)) {
      // Boolean marker — keep as kwarg. (Booleans authored via `+key` arrive
      // in node.booleans, not node.kwargs, so this branch is reached only when
      // the author wrote `key=true`-style. Either way the canonical home is
      // the kwarg surface.)
      newKwargs[key] = value;
    } else if (spec.liftedKwargs.has(key)) {
      // Lift to a child tag. The child holds a single text node with the
      // kwarg's value. Downstream structural plugins consume the canonical
      // child-tag form (e.g. article-structuring promotes <title> to
      // <article-title> inside <meta>).
      liftedChildren.push(makeTag(key, [{ type: 'text', value: String(value) }]));
    } else if (spec.acceptedKwargs.has(key)) {
      // Allowlisted but not lifted. Stays as a kwarg.
      newKwargs[key] = value;
    } else if (partner === 'config' && isConfigKwarg(key)) {
      // Misuse: a <config>-shaped key on <meta>. The partner-pair message
      // is hard-coded for the <meta> ↔ <config> pairing because <config>
      // doesn't have a STRUCTURED_ELEMENTS entry to consult.
      file?.message?.(
        `<${tagname}> does not accept '${key}' — this is a <config> setting. ` +
        `<${tagname}> holds descriptive document metadata; ` +
        `<config> holds processing options. ` +
        `See DESIGN.md "<meta> is for metadata; <config> is for options".`,
        node,
        `normalize-to-canonical:config-kwarg-in-${tagname}`,
      );
      // Dropped.
    } else if (partnerSpec?.acceptedKwargs.has(key)) {
      // Generic partner-misuse for structured-element pairs (when the
      // partner is itself a structured element). Today no pair uses this
      // path (the only pair is <meta>↔<config>, handled above), but the
      // mechanism is here for future structured-element pairings.
      file?.message?.(
        `<${tagname}> does not accept '${key}' — this is a <${partner}> kwarg. ` +
        `Did you mean to author <${partner}>?`,
        node,
        `normalize-to-canonical:${partner}-kwarg-in-${tagname}`,
      );
      // Dropped.
    } else {
      // Unknown.
      file?.message?.(
        `<${tagname}> received unknown kwarg '${key}'. Accepted <${tagname}> kwargs: ` +
        `${[...spec.acceptedKwargs].join(', ')}.`,
        node,
        `normalize-to-canonical:unknown-${tagname}-kwarg`,
      );
      // Dropped.
    }
  }

  node.kwargs = newKwargs;
  // Prepend lifted children so they appear before any author-supplied child
  // tags (preserving the author's child-tag ordering for those they wrote
  // directly).
  if (liftedChildren.length > 0) {
    const existingContent = Array.isArray(node.content) ? node.content : [];
    node.content = [...liftedChildren, ...existingContent];
  }

  // Optional child-tag validation. Opt-in per spec.validateChildren — off for
  // <meta> (behavior-preserving with the pre-migration code, which never
  // validated children); on for <author> (new interface, fresh expectations).
  if (spec.validateChildren) {
    const content = Array.isArray(node.content) ? node.content : [];
    for (const child of content) {
      if (
        isAcadamarkTag(child) &&
        typeof child.tagname === 'string' &&
        !spec.childAllowlist.has(child.tagname)
      ) {
        file?.message?.(
          `<${tagname}> does not accept <${child.tagname}> as a child tag. ` +
          `Accepted children: ${[...spec.childAllowlist].join(', ')}.`,
          child,
          `normalize-to-canonical:unknown-${tagname}-child`,
        );
        // Leave the child in place (always-renders pattern; the child still
        // renders, the author sees the diagnostic).
      }
    }
  }

  return node;
}

// ─── Group D2 helper: frameable kwarg → child-tag lift ──────────────────────
//
// Phase 3 slice 3c (2026-05-28). Companion to liftStructuredKwargs — same
// mechanism, different conceptual home (see
// acadamark-core/frameable-elements.js for the why-a-separate-registry note).
//
// For each frameable tag (fig / table / csv / tsv / mermaid / abc / svg /
// frame), any kwarg in the spec's liftedKwargs (today: `caption`, `title`)
// converts to a child tag of the same name carrying the kwarg's value as a
// single text node. Other kwargs pass through unchanged — frameables don't
// have a strict kwarg allowlist (per-element vocab schemas govern those via
// schema dispatch's buildProperties); this lift only touches the lifted
// subset.
//
// Author-written child-tag form (e.g. <fig><caption>...</caption></fig>)
// passes through this function unchanged: the kwarg loop finds nothing to
// lift, and the existing children stay intact.
//
// Lifted-children ordering: prepend to existing content so a kwarg-form
// caption lands ahead of any pre-existing children. For frameables this
// matters less than for structured-elements (the renderFrameable helper
// extracts the caption/title child from anywhere in content), but the
// prepend keeps ordering consistent across both lift flows.
function liftFrameableKwargs(node, _file) {
  const spec = getFrameableLiftSpec(node.tagname);
  if (!spec) return node; // defensive; gate's predicate should filter

  // OPAQUE-CONTENT GUARD (Phase 3 slice 3c finding).
  // Some frameables hold opaque string content as node.content — the
  // data string for tables (`<table csv | data>`), the diagram source
  // for mermaid / abc / svg, the CSV / TSV bodies. Lifting caption / title
  // kwargs INTO node.content would either replace or spread the opaque
  // string, destroying the body. For those nodes, the kwarg form remains
  // canonical and stays as kwargs; the handler reads them directly.
  // `extractFrameableChildren` (lib/frameable.js) has a parallel fallback
  // that synthesizes hast from kwargs when no child <caption> / <title>
  // tag exists, so the handler-side code path is uniform regardless of
  // whether the lift fired.
  if (typeof node.content === 'string') {
    return node;
  }

  const kwargs = node.kwargs ?? {};
  const newKwargs = {};
  const liftedChildren = [];

  for (const [key, value] of Object.entries(kwargs)) {
    if (spec.liftedKwargs.has(key)) {
      liftedChildren.push(makeTag(key, [{ type: 'text', value: String(value) }]));
    } else {
      newKwargs[key] = value;
    }
  }

  node.kwargs = newKwargs;
  if (liftedChildren.length > 0) {
    const existingContent = Array.isArray(node.content) ? node.content : [];
    node.content = [...liftedChildren, ...existingContent];
  }
  return node;
}

function liftConfigKwargs(node, file) {
  const kwargs = node.kwargs ?? {};
  const newKwargs = {};

  // <meta>'s accepted kwargs come from the structured-element spec — that's
  // where <meta>'s allowlist lives post-migration. The misuse hint fires when
  // a <meta>-shaped kwarg appears on <config>.
  const metaSpec = getStructuredSpec('meta');
  const isMetaShapedKey = (key) => metaSpec?.acceptedKwargs.has(key) ?? false;

  for (const [key, value] of Object.entries(kwargs)) {
    if (isConfigKwarg(key)) {
      newKwargs[key] = value;
    } else if (isMetaShapedKey(key)) {
      // Misuse: a <meta>-shaped key on <config>.
      file?.message?.(
        `<config> does not accept '${key}' — this is a <meta> kwarg. ` +
        `<meta> holds descriptive document metadata (title, author, date, etc.); ` +
        `<config> holds processing options (citation-style, numbering, etc.). ` +
        `See DESIGN.md "<meta> is for metadata; <config> is for options".`,
        node,
        'normalize-to-canonical:meta-kwarg-in-config',
      );
      // Dropped.
    } else {
      const liveKeys = [...CONFIG_KWARGS.keys()];
      file?.message?.(
        `<config> received unknown kwarg '${key}'. Accepted <config> kwargs: ` +
        `${liveKeys.join(', ')}, or any starting with ref-prefix-.`,
        node,
        'normalize-to-canonical:unknown-config-kwarg',
      );
      // Dropped.
    }
  }

  node.kwargs = newKwargs;
  return node;
}

// ─── Per-construct mapping ────────────────────────────────────────────────────
//
// Each entry: { predicate, normalize }.
//   predicate(node) — true if this entry handles the node.
//   normalize(node, file) — returns the canonical replacement (acadamarkTag or
//     a benign mdast wrapper, depending on the form).
//
// The rules are mutually exclusive by node type / tagname; ordering is not
// behaviorally significant but follows the reading order in the file header.

const NORMALIZATIONS = [
  // ─── Delegated-parser nodes (the historical "normalize-markdown" job) ───
  //
  // remark-math: inline math
  // remark-math produces: { type: 'inlineMath', value: '<LaTeX string>' }
  // Canonical target: acadamarkTag with the canonical Layer 1 tagname
  //   'inline-math' (NOT the sigil token '$' — produce the canonical name
  //   directly so the walker does not need a separate sigil-rewrite pass).
  {
    predicate: (node) => node.type === 'inlineMath',
    normalize: (node) =>
      makeOpaqueTag('inline-math', node.value, { contentHandler: _mathHandler }),
  },

  // remark-math: display math
  // remark-math produces: { type: 'math', meta: null|string, value: '<LaTeX>' }
  // Canonical target: acadamarkTag with tagname 'display-math'.
  // Note: math.meta has no canonical analog and is discarded — correct.
  {
    predicate: (node) => node.type === 'math',
    normalize: (node) =>
      makeOpaqueTag('display-math', node.value, { contentHandler: _mathDisplayHandler }),
  },

  // remark-gfm: pipe table
  // remark-gfm produces: { type: 'table', align: [...], children: [tableRow...] }
  // Canonical target: acadamarkTag with tagname 'table', format 'md',
  //   content = GFM pipe-table string re-parseable by parseMd().
  //
  // Option A (decided in AUD-20): serialize structured table node to pipe-table
  // string → opaque string content in the canonical node. Lossy for cells
  // containing inline markup (emphasis, links, inline math); lossless for
  // plain-text cells. Loss is visible via file.message() warning.
  {
    predicate: (node) => node.type === 'table',
    normalize: (node, file) =>
      makeOpaqueTag('table', gfmTableToPipeString(node, file), {
        contentHandler: _tableHandler,
        positional: ['md'],
      }),
  },

  // ─── Group A: sigil tagname rewrite (the tagname↔sigil cipher, lift) ───
  //
  // An authored sigil-form tag (e.g. <# heading #>, <$ x $>) reaches this
  // stage as an acadamarkTag whose tagname is the literal sigil token.
  // Rewrite to the canonical Layer 1 vocabulary name so no downstream stage
  // sees a sigil tagname. Uniform across section sigils and math/code
  // sigils.
  {
    predicate: (node) => isAcadamarkTag(node) && isSigilTagname(node.tagname),
    normalize: (node) => {
      node.tagname = SIGIL_TO_TAGNAME[node.tagname];
      return node;
    },
  },

  // ─── Group A1.5: authoring-alias tagname rewrite ──────────────────────
  //
  // Phase 3 slice 3b (2026-05-28): `<figure>` is an accepted authoring
  // alias for the canonical `<fig>` (per `DESIGN.md` §"Frameable
  // elements: a shared capability"). Rewrite at the gate so all
  // downstream tagname-keyed lookups (NUMBERED_TAGNAMES, the handler
  // dispatch, ref-resolution prefixes) see the canonical name.
  //
  // The vocab also declares a `shorthand_expansions` alias for
  // `figure → fig` (defensive: the alias key in VOCABULARY would catch
  // a `figure`-named node that somehow bypassed this gate). Both the
  // gate rewrite and the vocab alias coexist intentionally.
  //
  // This is a small alias table rather than a generic mechanism. The
  // pattern of "specific tag-to-canonical-name rewrites at the gate"
  // can lift to a shared map (TAGNAME_ALIASES) when a second alias
  // family lands.
  {
    predicate: (node) => isAcadamarkTag(node) && node.tagname === 'figure',
    normalize: (node) => {
      node.tagname = 'fig';
      return node;
    },
  },

  // ─── Group A1.7: book-part shorthand expansion ────────────────────────
  //
  // Phase 4 slice 4a (2026-05-29): `<chapter>`, `<part>`, `<appendix>`,
  // `<preface>`, `<foreword>`, `<introduction>`, `<conclusion>`,
  // `<glossary>`, `<dedication>` are authoring shorthands for
  // `<book-part book-part-type="...">`. The build-time vocab generator
  // skips these because their `shorthand_expansions.expands_to` value
  // contains a space (`'book-part book-part-type="chapter"'`) — it only
  // creates aliases for bare-key expansions. So the expansion has to
  // happen at the gate.
  //
  // CONFLICT DISAMBIGUATION: `<glossary>` has two semantic meanings —
  // a standalone vocab-glossary container (glossary.md, contains
  // <glossary-entry> children) AND a book-part shorthand (book-part.md
  // L68, an appendix-shaped book division). To resolve, only expand
  // book-part shorthands when the document is a book context (signaled
  // by `<meta type=book>` at root level). Article documents keep their
  // standalone `<glossary>` and any other shorthand-named tag with its
  // non-book-part meaning.
  //
  // The closure over `_isBookContext` is computed once per document at
  // the normalize-to-canonical entry point — see acadamarkNormalizeToCanonical
  // below where the predicate consults it.
  {
    predicate: (node) =>
      isAcadamarkTag(node) &&
      BOOK_PART_SHORTHANDS.has(node.tagname) &&
      _bookContextFlag.isBook === true,
    normalize: (node) => {
      const shorthand = node.tagname;
      node.tagname = 'book-part';
      node.kwargs = { ...node.kwargs, 'book-part-type': shorthand };
      return node;
    },
  },

  // ─── Group A2: structured-element + <config> kwarg lift ───────────────
  //
  // For any structured-element tag (today: <meta>, <author>; registered in
  // acadamark-core/structured-elements.js): allowlisted kwargs lift to
  // child tags per the per-tag spec, with the lift-time misuse-feedback
  // hints. Layer 1 carries the child-tag form.
  // For <config>: allowlisted kwargs stay as kwargs (the existing
  // config-discovery shape), with the misuse-feedback hint when a
  // <meta>-shaped kwarg appears on <config>. <config> is not a structured
  // element — its content is processing options, not a record of named
  // document-descriptive fields.
  //
  // Per DESIGN.md §"Structured-data-container tags" + §"Apparatus-tag
  // positioning" + the single-gate principle: each lift is one rule here,
  // not a sniff in a downstream plugin.
  {
    predicate: (node) => isAcadamarkTag(node) && isStructuredElement(node.tagname),
    normalize: (node, file) => liftStructuredKwargs(node, file),
  },
  {
    predicate: (node) => isAcadamarkTag(node) && node.tagname === 'config',
    normalize: (node, file) => liftConfigKwargs(node, file),
  },

  // ─── Group A2.5: frameable element kwarg → child-tag lift ─────────────
  //
  // Phase 3 slice 3c (2026-05-28). Implements caption-as-content
  // (DD-1 / DD-2; formerly AUD-14). For each frameable element with
  // a lift spec, `caption=` and `title=` kwargs lift to <caption> /
  // <title> child tags. The rest of the kwargs pass through unchanged.
  //
  // The figure handler is upstream of this for one specific case:
  // figure's "pipe content IS the caption" legacy convention. The
  // gate-lift runs AFTER the parser produces the AST, so a
  // `<fig caption="text" | other body>` would now get BOTH a lifted
  // <caption>text</caption> child AND the pipe content. Per the slice
  // 3c design, frameable handlers consume the child-tag <caption> as
  // canonical; the pipe-as-caption fallback applies only when no
  // <caption> child exists. See lib/frameable.js for the precedence.
  {
    predicate: (node) => isAcadamarkTag(node) && isFrameableLiftable(node.tagname),
    normalize: (node, file) => liftFrameableKwargs(node, file),
  },

  // ─── Group B: bare markdown heading → section ─────────────────────────
  //
  // Depths 1-3 lift to canonical section / sub-section / sub-sub-section.
  // Depths 4-6 pass through as literal <hN> (the named exception).
  {
    predicate: (node) => node.type === 'heading' && node.depth >= 1 && node.depth <= 3,
    normalize: (node) => headingToSection(node),
  },
  {
    predicate: (node) => node.type === 'heading' && node.depth >= 4 && node.depth <= 6,
    normalize: (node, file) => headingToPassThroughHN(node, file),
  },

  // ─── Group C: recursive inline lift ───────────────────────────────────
  //
  // mdast inline forms → canonical Layer 1 inline elements. The walker
  // recurses into mdast children so these fire wherever the inline appears
  // (inside a heading, inside an aside's content, inside a paragraph).
  { predicate: (node) => node.type === 'emphasis',    normalize: liftEmphasis    },
  { predicate: (node) => node.type === 'strong',      normalize: liftStrong      },
  { predicate: (node) => node.type === 'delete',      normalize: liftDelete      },
  { predicate: (node) => node.type === 'inlineCode',  normalize: liftInlineCode  },
  { predicate: (node) => node.type === 'link',        normalize: liftLink        },
  { predicate: (node) => node.type === 'image',       normalize: liftImage       },
  { predicate: (node) => node.type === 'break',       normalize: liftHardBreak   },
  { predicate: (node) => node.type === 'html',        normalize: (n, f) => liftRawHtml(n, f) },
];

// Combined predicate: true if any entry handles this node.
function isNormalizable(node) {
  return NORMALIZATIONS.some((entry) => entry.predicate(node));
}

// Dispatch to the matching entry's normalize function.
// `file` is threaded through from the plugin transformer for warning emission.
function normalizeNode(node, file) {
  const entry = NORMALIZATIONS.find((e) => e.predicate(node));
  return entry.normalize(node, file);
}

/**
 * Unified mdast-transform plugin — the normalize-to-canonical gate.
 *
 * Runs once over the tree, coercing every authored form to its canonical
 * Layer 1 shape. After this stage no downstream stage handles a non-
 * canonical form.
 *
 * Exported under two names: `acadamarkNormalizeToCanonical` is the new
 * canonical name; `acadamarkNormalizeMarkdown` is retained as a backward-
 * compat alias for any external consumer that imported the previous name.
 *
 * @returns {(tree: object, file: object) => void}
 */
export function acadamarkNormalizeToCanonical() {
  return function normalizeToCanonical(tree, file) {
    // Phase 4 slice 4a (2026-05-29): set per-document book-context flag
    // before the walk so the book-part shorthand expansion predicate
    // (Group A1.7) fires only in book documents. Cleared in a finally
    // so a thrown error doesn't leak the flag across documents.
    _bookContextFlag.isBook = detectBookContext(tree.children);
    try {
      walkNormalize(tree.children ?? [], isNormalizable, (node) => normalizeNode(node, file));
    } finally {
      _bookContextFlag.isBook = false;
    }
  };
}

// Backward-compat alias for the previous export name.
export const acadamarkNormalizeMarkdown = acadamarkNormalizeToCanonical;
