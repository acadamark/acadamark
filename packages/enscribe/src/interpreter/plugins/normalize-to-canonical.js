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
// enscribeConfigDiscovery (step 2). Earliest position where both parsers
// (the enscribe Peggy parser AND the remark markdown lexer, including
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
//     direction): an enscribeTag whose tagname is a sigil token
//     ('#'/'##'/'###'/'$'/'$$'/'`'/'```') has its tagname rewritten to the
//     canonical Layer 1 vocabulary name (section/sub-section/.../inline-math/
//     display-math/inline-code/code-block). Uniformly across section sigils
//     and math/code sigils. After group A, no downstream node carries a
//     sigil tagname.
//
//   Group B — Bare markdown heading → section. mdast `heading` of depth
//     1/2/3 becomes a canonical section / sub-section / sub-sub-section
//     enscribeTag. Depths 4/5/6 pass through as literal HTML <hN> elements
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

import { getContentHandler } from '../../core/dsl-registry.js';
import { makeTag, makeOpaqueTag, isEnscribeTag } from '../../core/tag.js';
import { ENSCRIBE_DOC_TYPE } from '../../core/file-data-keys.js';
import { walkNormalize } from '../../core/walkers/walk-normalize.js';
import { discover } from '../../core/walkers/discover.js';
import { SIGIL_TO_TAGNAME, isSigilTagname } from '../../core/tagname-sigil-map.js';
import {
  STRUCTURED_ELEMENTS,
  isStructuredElement,
  getStructuredSpec,
} from '../../core/structured-elements.js';
import {
  isFrameableLiftable,
  getFrameableLiftSpec,
} from '../../core/frameable-elements.js';
import {
  CONFIG_KWARGS, isConfigKwarg, isBooleanConfigKwarg,
} from '../lib/apparatus-allowlists.js';
import { createShorthandRegistry } from '../lib/shorthand-expansions.js';
import { FLOW_TAGNAMES } from '../lib/content-model.js';
import { hostAcceptsLanguage, HOST_ACCEPT_SETS } from '../lib/host-accept-sets.js';
import { SECTION_TAGNAMES } from '../lib/section-kinds.js';
import { tagnamesInCategory } from '../lib/vocab-categories.js';
import { VOCABULARY } from '@enscribejs/layer1-vocabulary';

// F1/F14: "is this node a <config>?" derives from the vocab `category`, not a hand-coded
// tagname check — the one place category is read is lib/vocab-categories.js. Parity today:
// the `configuration` category is exactly {config}, so this is byte-identical to the former
// `tagname === 'config'` side-checks (the audit's "finding zero").
const CONFIGURATION_TAGS = tagnamesInCategory('configuration');

// Phase 4 slice 4a (2026-05-29): book-part shorthand tagnames that
// expand at the gate to `<book-part book-part-type="...">`. The set
// matches `book-part.md`'s `shorthand_expansions` block; the
// build-time vocab generator skips these (they have spaces in their
// expands_to values) so the expansion has to happen at the gate.
//
// Exported (Slice B / #190): the multi-file assembler resolves a `src` on any
// of these tags (a book master's `<chapter src>`, `<preface src>`, …) exactly as
// it resolves `<section src>`, so it keys off THIS list — one authority, no drift.
export const BOOK_PART_SHORTHANDS = new Set([
  'chapter', 'part', 'appendix', 'preface', 'foreword',
  'introduction', 'conclusion', 'glossary', 'dedication', 'afterword',
]);

// Per-document book-context flag. Set by the gate's transformer at the
// start of each invocation (single-threaded; unified pipeline is
// sequential). Read by the book-part shorthand expansion predicate
// (Group A1.7 in NORMALIZATIONS below). The flag exists so the
// expansion fires ONLY in book documents — `<glossary>` (which has
// both standalone-vocab and book-part-shorthand meanings) keeps its
// standalone meaning in articles.
const _bookContextFlag = { isBook: false };

// Book context covers both book and book-part documents. The document class is
// resolved once upstream (enscribeDocTypeResolve → file.data[ENSCRIBE_DOC_TYPE]), so
// this no longer re-reads <meta type> from the tree.
function isBookDocType(docType) {
  return docType === 'book' || docType === 'book-part';
}

// ─── Shared shorthand-expansion registry (#22 slices 2–3) ───────────────────
//
// The gate's tagname rewrites lift into one shared map (the comment on the
// figure→fig group foresaw this when "a second alias family lands").
//
// Reserved names (#22 slice 3): a shorthand may not shadow a host name or a
// core-vocabulary name — host and core-vocabulary names stay first-class. The
// reservation is enforced only for UNCONDITIONAL shorthands; conditional ones
// are exempt (their condition is the deliberate disambiguation — the book-part
// `<glossary>` case). HOST_NAMES are the extra names reserved against shorthand
// shadowing beyond the vocab keys — the format-word hosts (diagram/table/library/data)
// plus core names (fig/math/code) a shorthand must not shadow; the rest of the
// reserved set is the generated vocabulary.
const HOST_NAMES = new Set(['diagram', 'table', 'library', 'data', 'fig', 'math', 'code']);
const RESERVED_NAMES = new Set([...Object.keys(VOCABULARY), ...HOST_NAMES]);
const shorthandRegistry = createShorthandRegistry({ reservedNames: RESERVED_NAMES });

// Book-part family (slice 2): each book-part shorthand rewrites to
// `<book-part type="<name>">`, gated on book context so `<glossary>`
// keeps its standalone vocab meaning in articles (conditional → exempt from the
// reservation policy).
//
// #100 exception: `appendix` is valid in BOTH book and article context. It has
// no standalone vocab meaning (no `appendix` element), so it is never ambiguous
// and expands unconditionally. The placement diverges downstream — book-
// structuring routes it to <book-back>, article-structuring to <article-back> —
// and the JATS exporter projects it to <book-part> (book) or <app> (article).
// `appendix` is not a reserved name, so unconditional registration is permitted.
shorthandRegistry.register('appendix', {
  tagname: 'book-part',
  kwargs: { type: 'appendix' },
});
for (const shorthand of BOOK_PART_SHORTHANDS) {
  if (shorthand === 'appendix') continue; // registered above (article-valid, #100)
  shorthandRegistry.register(shorthand, {
    tagname: 'book-part',
    kwargs: { type: shorthand },
    condition: (ctx) => ctx.isBook === true,
  });
}

// DSL diagram family (slice 3): the retired `<mermaid>` / `<abc>` tags are
// loadable shorthands of the `<diagram>` host — positional-injecting,
// unconditional expansions (`<mermaid>` → `<diagram mermaid>`). Their vocab
// entries were removed, so the shorthand names are no longer core-vocabulary
// names and the reservation policy admits them. Adding a diagram engine here is
// a one-line shorthand, not a vocabulary entry.
shorthandRegistry.register('mermaid', { tagname: 'diagram', positional: ['mermaid'] });
shorthandRegistry.register('abc', { tagname: 'diagram', positional: ['abc'] });

// DSL table family (slice 3): the retired `<csv>` / `<tsv>` tags are loadable
// shorthands of the `<table>` host (`<csv>` → `<table csv>`). The table host
// already accepts the csv/tsv formats (slice 2 accept-set) and both ride the one
// RFC-4180 parse path (#44). Their vocab entries were removed, so the names are
// no longer core-vocabulary names and the reservation policy admits them.
shorthandRegistry.register('csv', { tagname: 'table', positional: ['csv'] });
shorthandRegistry.register('tsv', { tagname: 'table', positional: ['tsv'] });

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

// ─── GFM table → canonical <table md> carrying parsed cells (#280) ────────────
//
// A remark-gfm pipe table is normalized to a canonical <table md> that CARRIES its
// already-parsed cells as `_parsedCells` (the same model data-format tables use), instead
// of serializing the cells back to a pipe-string and re-parsing them (the old "Option A"
// round-trip, which flattened inline markup — #280). Body-cell inline markup (emphasis,
// inline code, math, refs/cites) is preserved; plain-text cells stay byte-identical.
//
// Residual limitations (named, not silent):
//   - Header cells render as plain text in both render channels (the `_parsedCells.headers`
//     model is text-only), so header markup is still flattened — and warned about.
//   - Column alignment (`node.align`) is not carried; the old `parseMd` path already dropped
//     it, so this is output-neutral, not a regression. Carrying it is a separate, output-adding
//     follow-up.
//
// `extractCellText` (below) is kept: it flattens a cell's inline mdast to plain text, reused
// for header cells and to classify a body cell as plain (`{ text }`) vs markup-bearing (`{ inline }`).

/**
 * Extract plain text from inline mdast children of a tableCell.
 * Returns { text: string, hasMarkup: boolean }.
 *
 * Handled inline types:
 *   text, inlineCode, inlineMath → .value (plain text)
 *   emphasis, strong, delete, link → recurse into .children
 *   image → .alt
 *   enscribeTag ($ / $$, normalized before table? No — the walk visits
 *     table first in DFS; cell children may still be inlineMath here) → .value
 *     treated as markup; warn and use .value if available.
 *   Anything else → mark as markup, skip.
 *
 * Note: the normalization walk (walkNormalize) visits nodes in pre-order DFS.
 * A bare `table` at the top level is found before any `inlineMath` nodes that
 * may exist inside it. The entire `table` subtree is replaced at once, so the
 * cell children are raw remark-gfm nodes (inlineMath, not yet enscribeTag).
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
 * Normalize a remark-gfm `table` mdast node to a canonical `<table md>` enscribeTag that
 * CARRIES its already-parsed cells as `_parsedCells` — the same carry model the data-format
 * (`csv`/`tsv`/…) opt-in uses (table-cell-parse.js). The table handler prefers `_parsedCells`
 * when present, so the carrier's content string is never read (we pass `''`); the cells render
 * straight from the parsed mdast, with no serialize-to-pipe-string + re-parse round-trip (#280).
 *
 * Cell classification (per body cell): `extractCellText` decides plain vs markup-bearing.
 *   - plain   → `{ text }`     (byte-identical to the old parseMd path: that path round-tripped
 *                               the same text through `\|` escape/unescape to the same string)
 *   - markup  → `{ inline }`   (the cell's inline children, normalized in place to canonical
 *                               inline mdast by the in-module gate — so refs/cites/math then
 *                               resolve in the mdast phase via the `_parsedCells`-descending walkers)
 *
 * Header cells stay plain text (the `_parsedCells.headers` model is text-only in both render
 * channels); a header carrying markup is flattened AND warned about. Alignment is not carried
 * (the old path dropped it too — output-neutral).
 *
 * @param {object} node - remark-gfm table node
 * @param {object} file - unified VFile (may be a plain object with .message)
 * @returns {object} - a canonical `<table md>` enscribeTag with `_parsedCells` stamped
 */
export function gfmTableToParsedCellsTag(node, file) {
  const rows = node.children ?? [];
  const tag = makeOpaqueTag('table', '', {
    contentHandler: _tableHandler,
    positional: ['md'],
  });
  if (rows.length === 0) {
    tag._parsedCells = { headers: null, rows: [] };
    return tag;
  }

  // Header row (always the first row of a GFM table) → plain text. Warn on any header markup,
  // so the one residual flatten is named, not silent.
  let headerMarkup = false;
  const headers = (rows[0].children ?? []).map((cell) => {
    const r = { text: '', hasMarkup: false };
    extractCellText(cell.children ?? [], r);
    if (r.hasMarkup) headerMarkup = true;
    return r.text;
  });

  // Body rows → carry each cell's parsed nodes. Plain cells stay `{ text }`; markup-bearing
  // cells normalize their inline children in place and carry them as `{ inline }`.
  const bodyRows = rows.slice(1).map((row) =>
    (row.children ?? []).map((cell) => {
      const r = { text: '', hasMarkup: false };
      extractCellText(cell.children ?? [], r);
      if (!r.hasMarkup) return { text: r.text };
      const children = cell.children ?? [];
      walkNormalize(children, isNormalizable, (n) => normalizeNode(n, file));
      return { inline: children };
    }),
  );

  if (headerMarkup && file && typeof file.message === 'function') {
    file.message(
      'GFM table HEADER cell contains inline markup (emphasis, links, math, etc.) — ' +
      'header cells render as plain text, so the markup is flattened. ' +
      'Move it into a body cell to preserve it.',
      node,
      'enscribe:normalize-markdown:table-header-markup-loss',
    );
  }

  tag._parsedCells = { headers, rows: bodyRows };
  return tag;
}

// ─── Per-construct mapping ────────────────────────────────────────────────────
//
// Each entry is { predicate, normalize }.
// predicate(node) — true if this entry handles the node.
// normalize(node, file) — returns the canonical enscribeTag replacement.
//   The `file` argument is optional; math normalizers ignore it.
//
// Future entries for headings will use `depth`-conditional logic inside
// normalize(). Neither requires structural change here.

// ─── Group B helper: heading → section ───────────────────────────────────────
//
// mdast heading shape: { type: 'heading', depth: 1-6, children: <inline[]> }.
//
// Canonical section shape (matches what a named <section | Title> produces
// post-remarkRecursiveContent): an enscribeTag with tagname 'section' /
// 'sub-section' / 'sub-sub-section', content === [ paragraph wrapping the
// title inlines ]. The downstream section-nesting.js plugin reads this shape
// via its extractTitleContent helper (which unwraps the single paragraph).
//
// Depths 4-6 are passed through as a literal HTML <hN> element with an
// informative diagnostic (a named, narrow exception to Layer 1's
// otherwise-closed vocabulary — see DESIGN.md §"The <h4>–<h6> exception").

function headingToSection(node) {
  // depth 1/2/3 → section/sub-section/sub-sub-section. The NORMALIZATIONS
  // predicate gates this to depths 1–3, so SECTION_TAGNAMES[depth − 1] (the
  // inverse of section-kinds' SECTION_DEPTH_MAP) is always in range.
  const tagname = SECTION_TAGNAMES[node.depth - 1];
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
// inline node type; the normalize function returns the canonical enscribeTag.
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
  // inline-code is opaque (the code text is the verbatim content); its
  // contentHandler comes from getContentHandler (dsl-registry).
  return makeOpaqueTag('inline-code', node.value ?? '', {
    contentHandler: getContentHandler('inline-code'),
  });
}

// An autolink — `<https://x>`, or a bare URL / email that remark-gfm links —
// is NOT a removed idiom: it still lifts to `<a>` (so, e.g., an `<email>`
// value stays a `mailto:` link). It is distinguishable from an explicit
// bracket link by structure: an autolink's visible text equals its URL
// (modulo a `mailto:` / `tel:` scheme), since the author never typed separate
// link text. (mdast does not otherwise flag the two apart.)
function isAutolink(node) {
  const kids = node.children ?? [];
  if (kids.length !== 1 || kids[0].type !== 'text') return false;
  const url = node.url ?? '';
  return url === kids[0].value || url.replace(/^(mailto:|tel:)/, '') === kids[0].value;
}

// Explicit markdown links `[text](url)` are no longer an authoring idiom —
// authors write the `<a>` tag (`<a URL | text>`). An explicit link therefore
// renders as its literal source: the brackets and parens show as text, while
// the link text's own inline formatting (e.g. emphasis) still renders. The
// literal is wrapped in a `<span>` so this stays the 1-to-1 normalization
// walkNormalize requires; the span is inert inline and the gate still emits
// only canonical nodes (a `<span>` plus text). The URL inside the literal is
// built after parsing, so remark-gfm never re-autolinks it.
function liftLink(node) {
  if (isAutolink(node)) {
    const kwargs = {};
    if (node.url) kwargs.href = node.url;
    if (node.title) kwargs.title = node.title;
    return makeTag('a', node.children ?? [], { kwargs });
  }
  const title = node.title ? ` "${node.title}"` : '';
  return makeTag('span', [
    { type: 'text', value: '[' },
    ...(node.children ?? []),
    { type: 'text', value: `](${node.url ?? ''}${title})` },
  ]);
}

// Markdown images are no longer an authoring idiom — authors write `<fig>` /
// `<figure>`. A `![alt](url)` markdown image renders as its literal source
// text. Image alt is plain text with no inline children, so a single text node
// suffices (1-to-1).
function liftImage(node) {
  const title = node.title ? ` "${node.title}"` : '';
  return { type: 'text', value: `![${node.alt ?? ''}](${node.url ?? ''}${title})` };
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
// (registered in @enscribejs/enscribe/core/structured-elements.js — today: <meta>,
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
  // (which is what the schema's aggregateHtmlProps(mapAttributes(...)) iterates). Without this,
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
        isEnscribeTag(child) &&
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
// @enscribejs/enscribe/core/frameable-elements.js for the why-a-separate-registry note).
//
// For each frameable tag (fig / table / csv / tsv / mermaid / abc / svg /
// frame), any kwarg in the spec's liftedKwargs (today: `caption`, `title`)
// converts to a child tag of the same name carrying the kwarg's value as a
// single text node. Other kwargs pass through unchanged — frameables don't
// have a strict kwarg allowlist (per-element vocab schemas govern those via
// schema dispatch's aggregateHtmlProps(mapAttributes(...))); this lift only touches the lifted
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
      // #326: this lift runs AFTER the content-model gate (recursive-content.js),
      // so the lifted child never passes through it. Build the SAME content shape
      // the gate would have produced for the equivalent child-tag form, keyed on
      // the SAME classification (FLOW_TAGNAMES): a flow child (`<caption>`) wraps
      // its text in a paragraph, so the kwarg form `caption="…"` renders
      // identically to the child form `<caption | …>`; a phrasing child
      // (`<title>`) stays bare inline. Without this, a kwarg caption would render
      // unwrapped while the child/pipe forms wrap — the same divergence #326 fixes.
      const text = { type: 'text', value: String(value) };
      const childContent = FLOW_TAGNAMES.has(key)
        ? [{ type: 'paragraph', children: [text] }]
        : [text];
      liftedChildren.push(makeTag(key, childContent));
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
//   normalize(node, file) — returns the canonical replacement (enscribeTag or
//     a benign mdast wrapper, depending on the form).
//
// The rules are mutually exclusive by node type / tagname; ordering is not
// behaviorally significant but follows the reading order in the file header.

const NORMALIZATIONS = [
  // ─── Delegated-parser nodes (the historical "normalize-markdown" job) ───
  //
  // remark-math: inline math
  // remark-math produces: { type: 'inlineMath', value: '<LaTeX string>' }
  // Canonical target: enscribeTag with the canonical Layer 1 tagname
  //   'inline-math' (NOT the sigil token '$' — produce the canonical name
  //   directly so the walker does not need a separate sigil-rewrite pass).
  {
    predicate: (node) => node.type === 'inlineMath',
    normalize: (node) =>
      makeOpaqueTag('inline-math', node.value, { contentHandler: _mathHandler }),
  },

  // remark-math: display math
  // remark-math produces: { type: 'math', meta: null|string, value: '<LaTeX>' }
  // Canonical target: enscribeTag with tagname 'display-math'.
  // Note: math.meta has no canonical analog and is discarded — correct.
  {
    predicate: (node) => node.type === 'math',
    normalize: (node) =>
      makeOpaqueTag('display-math', node.value, { contentHandler: _mathDisplayHandler }),
  },

  // remark-gfm: pipe table
  // remark-gfm produces: { type: 'table', align: [...], children: [tableRow...] }
  // Canonical target: enscribeTag with tagname 'table', format 'md', CARRYING its
  // already-parsed cells as `_parsedCells` (see gfmTableToParsedCellsTag).
  //
  // This supersedes the original AUD-20 "Option A" (serialize → pipe-string → re-parse),
  // which flattened inline markup in cells (#280). Carrying the parsed cells preserves
  // body-cell markup; the only residual flatten is header-cell markup (the headers model
  // is text-only), which is warned about.
  {
    predicate: (node) => node.type === 'table',
    normalize: (node, file) => gfmTableToParsedCellsTag(node, file),
  },

  // ─── Group A: sigil tagname rewrite (the tagname↔sigil cipher, lift) ───
  //
  // An authored sigil-form tag (e.g. <# heading #>, <$ x $>) reaches this
  // stage as an enscribeTag whose tagname is the literal sigil token.
  // Rewrite to the canonical Layer 1 vocabulary name so no downstream stage
  // sees a sigil tagname. Uniform across section sigils and math/code
  // sigils.
  {
    predicate: (node) => isEnscribeTag(node) && isSigilTagname(node.tagname),
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
    predicate: (node) => isEnscribeTag(node) && node.tagname === 'figure',
    normalize: (node) => {
      node.tagname = 'fig';
      return node;
    },
  },

  // ─── Group A1.6: <a> positional URL → href ────────────────────────────
  //
  // `<a>` takes the link target as its first positional argument:
  // `<a https://example.com | text>`. Promote that positional to the
  // canonical `href` kwarg so downstream schema dispatch maps it like any
  // other attribute (the `href=` kwarg form remains the explicit alternative
  // and wins if both are present). The positional form covers ordinary
  // absolute/relative URLs and query strings unquoted (`?a=1&b=2` parses fine).
  // It does NOT cover: fragment-only targets (`#sec` is parsed as an id, so use
  // `href="#sec"`); and URLs containing `>` or spaces (the parser has no quoted-
  // positional form — use the `href="..."` kwarg).
  {
    predicate: (node) =>
      isEnscribeTag(node) &&
      node.tagname === 'a' &&
      (node.positional?.length ?? 0) > 0 &&
      node.kwargs?.href == null,
    normalize: (node) => {
      node.kwargs = { ...node.kwargs, href: node.positional[0] };
      node.positional = node.positional.slice(1);
      return node;
    },
  },

  // ─── Group A1.7: shorthand expansion (shared map) ─────────────────────
  //
  // Tag shorthands rewrite to their canonical (host) form through the shared
  // `shorthandRegistry` (interpreter/lib/shorthand-expansions.js). Slice 2
  // lifts the book-part family into that map (output-neutral); the DSL
  // families join in slice 3.
  //
  // First-match dispatch is preserved by keeping the condition IN the
  // predicate via `matches()`: a book-part shorthand matches only in book
  // context, exactly as the former inline predicate did. This is what keeps
  // `<glossary>` resolving to its standalone vocab meaning in articles — the
  // predicate does not match there, so `.find()` moves on to glossary's other
  // normalizations (book-part.md L68 vs glossary.md). `_bookContextFlag` is
  // set per-document at the entry point below.
  {
    predicate: (node) =>
      isEnscribeTag(node) &&
      shorthandRegistry.matches(node, { isBook: _bookContextFlag.isBook }),
    normalize: (node) => shorthandRegistry.expand(node),
  },

  // ─── Group A2: structured-element + <config> kwarg lift ───────────────
  //
  // For any structured-element tag (today: <meta>, <author>, <editor>; registered in
  // @enscribejs/enscribe/core/structured-elements.js): allowlisted kwargs lift to
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
    predicate: (node) => isEnscribeTag(node) && isStructuredElement(node.tagname),
    normalize: (node, file) => liftStructuredKwargs(node, file),
  },
  {
    predicate: (node) => isEnscribeTag(node) && CONFIGURATION_TAGS.has(node.tagname),
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
    predicate: (node) => isEnscribeTag(node) && isFrameableLiftable(node.tagname),
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

// ─── Host accept-set validation (issue #85) ─────────────────────────────────
//
// After canonicalization, every host element carries its format word as the
// leading positional (`<table csv>`, `<diagram mermaid>`, `<library bibtex>`).
// `HOST_ACCEPT_SETS` (interpreter/lib/host-accept-sets.js) is the authority for
// which format words each host admits. This pass promotes that map from inert
// data to a validation gate: a host carrying a format word outside its
// accept-set gets a located, non-fatal diagnostic (via `file.message`, which
// carries the node's source position) — and the document STILL RENDERS. The
// host handler's own fallback produces visible output (e.g. `<diagram bogus>`
// renders an `enscribe-error` span). Validation never aborts and never mutates
// the tree; it is purely observational.
//
// `data` is deliberately NOT validated here. It carries no format word of its
// own — it is a storage container for `<library>` blocks. Its accept-set (still
// declared in `host-accept-sets.js`, mirroring `library`) governs the payload
// languages of the libraries it holds, and those are validated when each inner
// `<library>` node is visited. The hosts checked here are exactly the ones
// whose leading positional IS a format word.
const FORMAT_WORD_HOSTS = ['table', 'diagram', 'library'];

// Read a host's format word the SAME way its handler reads it, so validation
// can never disagree with dispatch:
//   - table   (handlers/table.js):   node.positional[0]
//   - diagram (handlers/diagram.js): node.positional[0]
//   - library (plugins/library-load.js): node.positional[0] ?? node.kwargs.format
// Returns null when no format word is present (the host uses its default —
// e.g. a bare `<table | … >` markdown pipe table). If a handler's format
// accessor ever changes, update this in lockstep.
function hostFormatWord(node) {
  const positional = node.positional?.[0];
  if (positional != null && positional !== '') return positional;
  if (node.tagname === 'library') {
    const kw = node.kwargs?.format;
    if (kw != null && kw !== '') return kw;
  }
  return null;
}

// Validate one host node's format word against its accept-set. Emits a located,
// non-fatal diagnostic on a miss; renders regardless. No-op without a `file`
// (the gate is sometimes run file-less in unit tests).
function validateHostAcceptSet(node, file) {
  const format = hostFormatWord(node);
  if (format == null) return;                            // no format word → nothing to check
  if (hostAcceptsLanguage(node.tagname, format)) return; // in the accept-set → valid
  if (file && typeof file.message === 'function') {
    const accepted = [...(HOST_ACCEPT_SETS.get(node.tagname) ?? [])].join(', ');
    file.message(
      `<${node.tagname}>: "${format}" is not an accepted ${node.tagname} format ` +
      `(accepted: ${accepted}). Rendering anyway.`,
      node,
    );
  }
}

/**
 * Unified mdast-transform plugin — the normalize-to-canonical gate.
 *
 * Runs once over the tree, coercing every authored form to its canonical
 * Layer 1 shape. After this stage no downstream stage handles a non-
 * canonical form.
 *
 * Exported under two names: `enscribeNormalizeToCanonical` is the new
 * canonical name; `enscribeNormalizeMarkdown` is retained as a backward-
 * compat alias for any external consumer that imported the previous name.
 *
 * @returns {(tree: object, file: object) => void}
 */
// ─── Bare boolean authoring forms (#219) ──────────────────────────────────────
//
// The parser parses a bare attribute name (no `=value`, no `+`/`-` sigil) as a POSITIONAL
// — `<config toc>` → positional ['toc']; `<section unlisted>` → positional ['unlisted'].
// Bare is the canonical HTML / Layer 1 spelling of a boolean attribute (`<config toc>`),
// so this promotes a bare positional that is a KNOWN boolean to the same `true` the +/=true
// forms produce, byte-identically:
//   - on `<config>`: a BOOLEAN config kwarg (isBooleanConfigKwarg, from the typed CONFIG_KWARGS Map — `toc`, `number-sections`,
//     …) → `node.kwargs[name] = 'true'` (identical to `name=true`, which config-discovery reads).
//   - on any other element: a name declared in its vocab `booleans:` (`unlisted`, `unnumbered`,
//     …) → `node.booleans[name] = true` (identical to `+name`, which mapAttributes / handlers read).
// A bare name that is NOT a known boolean stays positional — unrecognized exactly as today (so a
// typo never becomes a phantom boolean, and a bare VALUED kwarg like `<config toc-depth>` is inert).
// Runs as a pre-pass before the rule walk (and before config-discovery / structuring / numbering),
// so every downstream reader sees the promoted boolean. A parse-level fact → static and live agree.

// The attribute "home" a known boolean lives in for a tagname — the ONE place the
// config-vs-element decision is made (#235/F2). Decided by the category-derived
// CONFIGURATION_TAGS identity (R5/F1), so it cannot drift from the vocab's notion of
// which tags are configuration.
//
// This makes a DELIBERATE reuse explicit, not incidental: a `<config>` setting rides
// `node.kwargs` — the canonical Layer 1 attribute home, the SAME surface every element
// attribute uses — distinguished from an element boolean (which rides `node.booleans`)
// ONLY by this category check, which is the guard. `<config>` is intentionally NOT given
// a separate storage structure; the kwarg surface IS the attribute home (F2 was resolved
// by documenting + centralizing this reuse, not by forking a config-only path). Both the
// known-boolean test and the bare-boolean promotion target consult this one rule.
//
//   'config'  → known boolean = a boolean <config> kwarg; promote to node.kwargs[name]='true'
//   'element' → known boolean = a vocab `booleans:` entry; promote to node.booleans[name]=true
function booleanHome(tagname) {
  return CONFIGURATION_TAGS.has(tagname) ? 'config' : 'element';
}

/** Is `name` a known boolean ON `tagname`? Config: a boolean config kwarg; else: a vocab boolean. */
function isKnownBoolean(tagname, name) {
  if (booleanHome(tagname) === 'config') return isBooleanConfigKwarg(name);
  const attrs = VOCABULARY?.[tagname]?.enscribe_attributes;
  if (attrs?.booleans?.[name]) return true;
  // #270: a boolean-VALUED kwarg — `values: ['true','false']`, e.g. <details>'s `open` — is also a
  // known boolean. Its bare form (`<details open>`) promotes to node.booleans like a `booleans:` entry,
  // so it renders identically to `+open` / `open=true` (mapAttributes maps a boolean-valued kwarg too).
  const kw = attrs?.kwargs?.[name];
  return !!kw && Array.isArray(kw.values) && kw.values.length === 2
    && kw.values.includes('true') && kw.values.includes('false');
}

/** Promote a single node's bare known-boolean positionals (see header). */
function promoteNodeBareBooleans(node) {
  const positional = node.positional;
  if (!Array.isArray(positional) || positional.length === 0) return;
  const isConfig = booleanHome(node.tagname) === 'config'; // the one home rule (#235)
  const remaining = [];
  for (const p of positional) {
    if (typeof p === 'string' && isKnownBoolean(node.tagname, p)) {
      if (isConfig) {
        node.kwargs = node.kwargs ?? {};
        if (!(p in node.kwargs)) node.kwargs[p] = 'true'; // == <config name=true>
      } else {
        node.booleans = node.booleans ?? {};
        if (!(p in node.booleans)) node.booleans[p] = true; // == <element +name>
      }
    } else {
      remaining.push(p);
    }
  }
  node.positional = remaining;
}

/** Walk the tree (children + non-opaque enscribeTag content) promoting bare known booleans. */
function promoteBareBooleans(nodes) {
  for (const node of nodes ?? []) {
    if (isEnscribeTag(node)) {
      promoteNodeBareBooleans(node);
      if (Array.isArray(node.content) && !node.isOpaqueContent) promoteBareBooleans(node.content);
    }
    if (Array.isArray(node.children)) promoteBareBooleans(node.children);
  }
}

export function enscribeNormalizeToCanonical() {
  return function normalizeToCanonical(tree, file) {
    // #219: promote bare known-boolean positionals (`<config toc>`, `<section unlisted>`) to the
    // same `true` the +/=true forms produce, BEFORE the rule walk + every downstream reader.
    promoteBareBooleans(tree.children ?? []);
    // Phase 4 slice 4a (2026-05-29): set per-document book-context flag
    // before the walk so the book-part shorthand expansion predicate
    // (Group A1.7) fires only in book documents. Cleared in a finally
    // so a thrown error doesn't leak the flag across documents.
    _bookContextFlag.isBook = isBookDocType(file?.data?.[ENSCRIBE_DOC_TYPE] ?? 'article');
    try {
      walkNormalize(tree.children ?? [], isNormalizable, (node) => normalizeNode(node, file));
      // #85: validate host format words against their accept-sets. Runs AFTER
      // canonicalization so gate shorthands (e.g. `<csv>` → `<table csv>`) have
      // already injected their format positional. Observe-only — `discover`
      // never mutates the tree, and host content is opaque so the walk does not
      // descend into payloads.
      const hostValidators = new Map(
        FORMAT_WORD_HOSTS.map((host) => [host, (node) => validateHostAcceptSet(node, file)]),
      );
      discover(tree, hostValidators);
    } finally {
      _bookContextFlag.isBook = false;
    }
  };
}

// Backward-compat alias for the previous export name.
export const enscribeNormalizeMarkdown = enscribeNormalizeToCanonical;
