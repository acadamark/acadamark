// Phase 3 slice 3c (2026-05-28): unified renderFrameable helper +
// formatLabel primitive.
//
// Replaces slice 3b's primitive-only `lib/frameable.js`. The primitive
// (`formatLabel`) is preserved for shared use with the theorem-family
// handler (which is NOT frameable — see Q3 of slice 3b's findings — but
// shares the label-text shape).
//
// THE UNIFIED HELPER
//
// `renderFrameable(opts)` handles three structural caption-rendering
// idioms via a `kind`-keyed branch (settled per Ariel's design call in
// the slice 3c brief):
//
//   - kind ∈ { table, csv, tsv }
//       → <caption> as INSIDE child of the rendered <table> wrapper
//         (HTML-native: <table> contains <caption> as a child).
//
//   - kind ∈ { fig, svg, frame }
//       → <figcaption> as INSIDE child of the rendered <figure> wrapper
//         (HTML5 figure/figcaption convention).
//
//   - kind ∈ { mermaid, abc }
//       → <figcaption> as SIBLING of the content wrapper (preserves
//         slice 2c's external-DSL markup convention — Mermaid's <pre>
//         and abcjs's <div> need their content slot left clean for
//         external rendering libraries to overwrite).
//
// The helper:
//   - Takes the per-handler "body" (already-rendered hast children) and
//     the frameable opts (id, border, computedNumber, kind, plus the
//     pre-converted caption hast and title hast).
//   - Builds the wrapper element with border class, id, and per-kind
//     caption placement.
//   - Returns either a single hast element (for kinds whose caption
//     lives inside a wrapper) or a hast root-list (for the sibling-
//     figcaption idioms — mermaid/abc).
//
// CAPTION INPUT SHAPE
//
// Per slice 3c's caption-as-content (Option A from Phase 3 Phase 0
// Q1.5), the canonical authoring form is a <caption> child tag. The
// gate (normalize-to-canonical.js's liftFrameableKwargs) lifts any
// `caption=` kwarg to the child-tag form before the handler runs. So
// every handler receives the SAME shape: an array of hast caption
// children if a caption is present, null/empty otherwise.
//
// `extractFrameableChildren(state, node)` is the helper handlers use to
// split node.content into { captionHast, titleHast, bodyContent }. It
// finds the first <caption> and first <title> child tags, converts them
// to hast, and returns the remaining content as bodyContent (still
// mdast — the per-handler code handles body conversion since each kind
// renders body differently).
//
// LABEL PRIMITIVE (`formatLabel`)
//
// Unchanged from slice 3b. The label span shape "Figure 3.", "Table 1
// (Pythagoras).", etc. Used by renderFrameable's caption-building logic
// AND by handlers/theorem.js (theorem family is structurally parallel,
// not a frameable consumer).

import { unwrapSingleParagraph } from '../../core/paragraph-unwrap.js';
import { formatScopedNumber } from './scoped-number.js';

// ─── Internal primitive: label span ────────────────────────────────────────

/**
 * Build a hast span containing a numbered label like "Figure 3.",
 * "Table 2.", "Theorem 1 (Pythagoras).". Optional `name` adds the
 * parenthesized suffix (amsthm "(Pythagoras)" convention; ignored if
 * empty / null / undefined).
 *
 * Returns null when `number` is null/undefined (no label should render).
 *
 * @param {string} prefix
 * @param {number|null|undefined} number
 * @param {string|null|undefined} [name]
 * @returns {import('hast').Element|null}
 */
export function formatLabel(prefix, number, name) {
  if (number == null) return null;
  const text = name
    ? `${prefix} ${number} (${name}).`
    : `${prefix} ${number}.`;
  return {
    type: 'element',
    tagName: 'span',
    properties: { className: [`${prefix.toLowerCase()}-label`] },
    children: [{ type: 'text', value: text }],
  };
}

// ─── Per-kind metadata ─────────────────────────────────────────────────────

// Map from kind (the frameable element's canonical tagname) to:
//   prefix    — display word for the label ("Figure", "Table")
//   captionEl — the inside-wrapper caption element tagname
//               ("caption" for tables; "figcaption" for figure/svg/frame;
//                unused for sibling-figcaption kinds — mermaid/abc set it
//                to "figcaption" but the wrapper output is a root list)
//   wrapperEl — the inside-wrapper element tagname (the handler typically
//               builds the wrapper itself; this is informational and
//               unused by the helper)
const KIND_META = new Map([
  // table family — <caption> inside <table>
  ['table',   { prefix: 'Table',  captionEl: 'caption',    layout: 'inside-table' }],
  ['csv',     { prefix: 'Table',  captionEl: 'caption',    layout: 'inside-table' }],
  ['tsv',     { prefix: 'Table',  captionEl: 'caption',    layout: 'inside-table' }],
  // figure family — <figcaption> inside <figure>
  ['fig',     { prefix: 'Figure', captionEl: 'figcaption', layout: 'inside-figure' }],
  ['svg',     { prefix: 'Figure', captionEl: 'figcaption', layout: 'inside-figure' }],
  ['frame',   { prefix: 'Figure', captionEl: 'figcaption', layout: 'inside-figure' }],
  // external DSL — <figcaption> sibling of the content wrapper
  ['mermaid', { prefix: 'Figure', captionEl: 'figcaption', layout: 'sibling' }],
  ['abc',     { prefix: 'Figure', captionEl: 'figcaption', layout: 'sibling' }],
]);

// ─── Caption / title extraction ────────────────────────────────────────────

/**
 * Split a frameable node's content into:
 *   - captionHast — hast children of the first <caption> child tag, or null
 *   - titleHast   — hast children of the first <title> child tag, or null
 *   - bodyContent — remaining content (still mdast), for the per-handler
 *                   body-conversion logic
 *
 * The lift gate (liftFrameableKwargs in normalize-to-canonical.js) lifts
 * any `caption=` / `title=` kwargs to <caption> / <title> child tags
 * before this function runs, so the kwarg-form authoring surface is
 * handled uniformly through the same child-tag path.
 *
 * Both extraction passes use single-paragraph unwrap (the typical case
 * for short caption / title text). Multi-paragraph captions stay
 * wrapped — the lift produces a single text-node child so this only
 * matters for author-written multi-paragraph captions, which are rare
 * but supported.
 *
 * @param {object} state - mdast-util-to-hast state
 * @param {object} node  - the frameable enscribeTag node
 * @returns {{ captionHast: object[]|null, titleHast: object[]|null, bodyContent: object[] }}
 */
export function extractFrameableChildren(state, node) {
  const content = Array.isArray(node.content) ? node.content : [];

  let captionHast = null;
  let titleHast = null;
  const bodyContent = [];

  for (const child of content) {
    const tagname = child?.tagname;
    if (tagname === 'caption' && captionHast == null) {
      const innerMdast = Array.isArray(child.content) ? child.content : [];
      const unwrapped = unwrapSingleParagraph(innerMdast);
      captionHast = unwrapped.flatMap(c => {
        const h = state.one(c, child);
        if (h == null) return [];
        return Array.isArray(h) ? h : [h];
      });
    } else if (tagname === 'title' && titleHast == null) {
      const innerMdast = Array.isArray(child.content) ? child.content : [];
      const unwrapped = unwrapSingleParagraph(innerMdast);
      titleHast = unwrapped.flatMap(c => {
        const h = state.one(c, child);
        if (h == null) return [];
        return Array.isArray(h) ? h : [h];
      });
    } else {
      bodyContent.push(child);
    }
  }

  // Opaque-content fallback (Phase 3 slice 3c). For frameables whose
  // body is an opaque string (tables / csv / tsv / mermaid / abc / svg —
  // see liftFrameableKwargs's matching opaque-content guard in
  // normalize-to-canonical.js), the gate cannot lift caption= / title=
  // kwargs to child tags without destroying the body. The handler-side
  // code path stays uniform by reading from node.kwargs when no child
  // tag fired. The kwarg value becomes a single text node.
  if (captionHast == null && typeof node.kwargs?.caption === 'string') {
    captionHast = [{ type: 'text', value: node.kwargs.caption }];
  }
  if (titleHast == null && typeof node.kwargs?.title === 'string') {
    titleHast = [{ type: 'text', value: node.kwargs.title }];
  }

  return { captionHast, titleHast, bodyContent };
}

// ─── The unified helper ────────────────────────────────────────────────────

/**
 * Build a hast caption element ("<caption>" or "<figcaption>", depending
 * on kind) containing the formatted label span (when numbered) followed
 * by the caption content (when present). Returns null when no caption
 * needs to render (no label AND no content).
 */
function buildCaptionEl(captionEl, labelSpan, captionHast) {
  if (labelSpan == null && (captionHast == null || captionHast.length === 0)) {
    return null;
  }
  const children = [];
  if (labelSpan) {
    children.push(labelSpan);
    // Always emit a trailing text-space after the label span — matches
    // slice 3b's behavior for byte-identical snapshots on existing
    // fixtures whose captions previously had label-only or label+text
    // shapes (the space is harmless trailing whitespace in HTML when
    // no caption text follows).
    children.push({ type: 'text', value: ' ' });
  }
  if (captionHast && captionHast.length > 0) {
    children.push(...captionHast);
  }
  return {
    type: 'element',
    tagName: captionEl,
    properties: {},
    children,
  };
}

/**
 * Build a hast title element when titleHast is present. Always
 * <figcaption class="title"> for the figure-family layout (the inside-
 * figure idiom uses figcaption for both title and caption, distinguished
 * by the `title` class); a class-less <caption class="title"> for the
 * table layout. Returns null when titleHast is empty/null.
 */
function buildTitleEl(captionEl, titleHast) {
  if (!titleHast || titleHast.length === 0) return null;
  return {
    type: 'element',
    tagName: captionEl,
    properties: { className: ['title'] },
    children: titleHast,
  };
}

/**
 * The unified frameable rendering helper.
 *
 * @param {object} opts
 * @param {string} opts.kind         - canonical tagname: 'fig', 'table',
 *                                     'csv', 'tsv', 'mermaid', 'abc', 'svg',
 *                                     'frame'.
 * @param {object[]} opts.bodyHast   - the per-handler body (already-rendered
 *                                     hast children). For inside-* layouts
 *                                     these become the wrapper's children
 *                                     (alongside caption / title); for
 *                                     sibling layout they become the wrapper
 *                                     itself + the figcaption follows.
 * @param {string} opts.wrapperEl    - the wrapper element to emit
 *                                     ('table' for table family;
 *                                     'figure' for figure family;
 *                                     'pre' / 'div' / etc. for sibling).
 * @param {object} [opts.wrapperProps]   - hast properties for the wrapper
 *                                     (id, className, plus per-handler
 *                                     custom attributes like data-enscribe-dsl).
 * @param {object[]|null} [opts.captionHast] - caption content (hast), or null.
 * @param {object[]|null} [opts.titleHast]   - title content (hast), or null.
 * @param {number|null} [opts.computedNumber] - the registry-assigned number,
 *                                              or null/undefined for
 *                                              unnumbered.
 * @param {{chapter:number, section:number}|null} [opts.scope] - the node's
 *                                     `_scope` stamp (numbering.js, book /
 *                                     scoped documents). When present with
 *                                     chapter > 0 the label number is
 *                                     chapter-prefixed ("Figure 1.3.") to
 *                                     match cross-references (RQ-BOOK-M4);
 *                                     null/absent for articles → bare
 *                                     number, current behavior.
 * @param {boolean} [opts.border]    - whether to add the frameable-border
 *                                     class to the wrapper.
 * @returns {import('hast').Element|{type:'root', children:object[]}}
 */
export function renderFrameable(opts) {
  const {
    kind,
    bodyHast = [],
    wrapperEl,
    wrapperProps = {},
    captionHast = null,
    titleHast = null,
    computedNumber = null,
    scope = null,
    border = false,
  } = opts;

  const meta = KIND_META.get(kind);
  if (!meta) {
    // Defensive — should be unreachable. Fall through to body only.
    return {
      type: 'element',
      tagName: wrapperEl ?? 'div',
      properties: wrapperProps,
      children: bodyHast,
    };
  }

  // Apply border class to wrapper props.
  const finalWrapperProps = { ...wrapperProps };
  if (border) {
    const existing = Array.isArray(finalWrapperProps.className) ? finalWrapperProps.className : [];
    finalWrapperProps.className = [...existing, 'frameable-border'];
  }

  // Slice B (RQ-BOOK-M4): derive the chapter-prefixed display number via
  // the shared helper so the caption label matches the cross-reference
  // text. formatScopedNumber returns the bare number when scope is absent
  // (articles), so this is zero-diff for unscoped documents.
  const labelSpan = formatLabel(meta.prefix, formatScopedNumber(computedNumber, scope));
  const captionEl = buildCaptionEl(meta.captionEl, labelSpan, captionHast);
  const titleEl = buildTitleEl(meta.captionEl, titleHast);

  if (meta.layout === 'inside-table') {
    // <table> [<caption class="title">title</caption>] [<caption>label + caption</caption>] body
    const children = [];
    if (titleEl) children.push(titleEl);
    if (captionEl) children.push(captionEl);
    children.push(...bodyHast);
    return {
      type: 'element',
      tagName: wrapperEl ?? 'table',
      properties: finalWrapperProps,
      children,
    };
  }

  if (meta.layout === 'inside-figure') {
    // <figure> [<figcaption class="title">title</figcaption>] body [<figcaption>label + caption</figcaption>]
    const children = [];
    if (titleEl) children.push(titleEl);
    children.push(...bodyHast);
    if (captionEl) children.push(captionEl);
    return {
      type: 'element',
      tagName: wrapperEl ?? 'figure',
      properties: finalWrapperProps,
      children,
    };
  }

  // sibling layout — title above the wrapper, caption below.
  // Returns a root-list. toHast inlines a root's children at the call site.
  const wrapper = {
    type: 'element',
    tagName: wrapperEl,
    properties: finalWrapperProps,
    children: bodyHast,
  };
  const siblings = [];
  if (titleEl) siblings.push(titleEl);
  siblings.push(wrapper);
  if (captionEl) siblings.push(captionEl);
  if (siblings.length === 1) return wrapper; // no title or caption; bare wrapper
  return { type: 'root', children: siblings };
}
