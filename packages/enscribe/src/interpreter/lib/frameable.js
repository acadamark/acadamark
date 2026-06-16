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
import { convertChildren } from './ast-helpers.js';

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
  // boxed prose (#31) — <p class="title"> / <p class="caption"> inside the
  // element's own wrapper (<aside>). NOT <figcaption> (invalid outside <figure>);
  // the .title / .caption classes are the same styling hooks the figure family
  // uses. `prefix: 'Box'` is the own "Box N" counter label (config key
  // number-boxes, ref-prefix box); <aside> is unnumbered by default.
  ['aside',   { prefix: 'Box',    captionEl: 'p',          layout: 'boxed-prose' }],
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
      captionHast = convertChildren(state, child, unwrapped);
    } else if (tagname === 'title' && titleHast == null) {
      const innerMdast = Array.isArray(child.content) ? child.content : [];
      const unwrapped = unwrapSingleParagraph(innerMdast);
      titleHast = convertChildren(state, child, unwrapped);
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
function buildCaptionEl(captionEl, labelSpan, captionHast, captionClass = null) {
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
  // `captionClass` is null for the figure/table families (a class-less
  // <figcaption>/<caption> — byte-identical to before); the boxed-prose layout
  // passes 'caption' so the <p> gets the .caption styling hook (#31).
  return {
    type: 'element',
    tagName: captionEl,
    properties: captionClass ? { className: [captionClass] } : {},
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

// Frameable border "look" (#58). `border=<name>` selects a named look — the
// document names it; the theme/stylesheet defines what it renders as. Returns a
// safe CSS class-token look name, or null. A look implies border-on (handled in
// renderFrameable). The default theme ships a starter menu (accent / thick /
// dashed / subtle); the mechanism is open — any token name passes through as a
// `frameable-border-<name>` class a theme can target (matching how `type` values
// pass through to `data-*`). A non-token value (e.g. an attempted raw-CSS escape
// hatch, `border="2px dashed red"` — out of scope, #58) is ignored, not emitted
// as a class. `border=true` / `border=false` are the boolean form, not a look.
const BORDER_LOOK_TOKEN = /^[a-z][a-z0-9-]*$/;
export function frameableBorderLook(node) {
  const raw = node?.kwargs?.border;
  if (typeof raw !== 'string') return null;
  const name = raw.toLowerCase();
  if (name === 'true' || name === 'false') return null;
  return BORDER_LOOK_TOKEN.test(name) ? name : null;
}

/**
 * Read the resolved `border` boolean for a frameable, defaulting to ON. The
 * toggle is read from `+border` / `-border` (`node.booleans.border`) or the
 * string/boolean kwarg forms `border=true` / `border=false` (including the
 * quoted `border="false"`). A named-look value (`border=<name>`, e.g.
 * `border=accent`) is NOT a toggle — see `frameableBorderLook` — so it falls
 * through to the default and does not turn the border off (a look implies
 * border-on). Shared by the frame and aside handlers (#170).
 *
 * #186: the parser stores every `key=value` kwarg as a string, so the bareword
 * `border=false` and the quoted `border="false"` both arrive as the string
 * `'false'` — and both were ignored by the prior boolean-only read (only
 * `-border` worked). Comparing the string `'true'` / `'false'` here aligns all
 * four spellings, matching `readBoolKwarg`'s string handling and the way
 * `numbered=true|false` is already read.
 *
 * @param {object} node
 * @returns {boolean}
 */
export function readFrameableBorder(node) {
  // +border / -border — the canonical boolean surface, highest priority.
  if (typeof node.booleans?.border === 'boolean') return node.booleans.border;
  const kw = node.kwargs?.border;
  if (typeof kw === 'boolean') return kw;
  if (kw === 'false') return false;
  if (kw === 'true') return true;
  return true; // default ON (also the path a named look falls through to)
}

// "See source" disclosure (#19). When a document turns on the `show-source`
// <config> switch, a rendered-from-DSL block (mermaid / abc) emits the authored
// source alongside its rendered output, inside a native <details> control — no
// JavaScript: <details> is a native HTML toggle. The disclosure's <pre> is
// deliberately PLAIN (no `mermaid` / `abc` class, no data-enscribe-dsl), so the
// live in-browser scanner and the build-time static renderer never touch it —
// it keeps the verbatim source regardless of the block's render mode. The
// `enscribe-source` class is the theme's styling hook (document says *what* —
// source is available; theme says *how* — it can be made to look like a button).
//
// @param {string} source - the authored DSL source (already trimmed by the handler)
// @returns {import('hast').Element}
export function buildSourceDisclosure(source) {
  return {
    type: 'element',
    tagName: 'details',
    properties: { className: ['enscribe-source'] },
    children: [
      {
        type: 'element',
        tagName: 'summary',
        properties: {},
        children: [{ type: 'text', value: 'See source' }],
      },
      {
        type: 'element',
        tagName: 'pre',
        properties: {},
        children: [{ type: 'text', value: source }],
      },
    ],
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
 * @param {object|null} [opts.sourceDisclosureHast] - #19 "See source" <details>
 *                                     hast (from buildSourceDisclosure), or null.
 *                                     Placed as the final sibling in the sibling
 *                                     (DSL) layout; ignored by the other layouts.
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
    borderLook = null,
    sourceDisclosureHast = null,
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

  // Apply border class(es) to wrapper props. A named look (border=<name>, #58)
  // implies border-on and adds a `frameable-border-<name>` modifier alongside the
  // base class — the document names the look; the theme defines how it renders.
  const finalWrapperProps = { ...wrapperProps };
  if (border || borderLook) {
    const existing = Array.isArray(finalWrapperProps.className) ? finalWrapperProps.className : [];
    const classes = [...existing, 'frameable-border'];
    if (borderLook) classes.push(`frameable-border-${borderLook}`);
    finalWrapperProps.className = classes;
  }

  // Slice B (RQ-BOOK-M4): derive the chapter-prefixed display number via
  // the shared helper so the caption label matches the cross-reference
  // text. formatScopedNumber returns the bare number when scope is absent
  // (articles), so this is zero-diff for unscoped documents.
  const labelSpan = formatLabel(meta.prefix, formatScopedNumber(computedNumber, scope));
  const captionClass = meta.layout === 'boxed-prose' ? 'caption' : null;
  const captionEl = buildCaptionEl(meta.captionEl, labelSpan, captionHast, captionClass);
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

  if (meta.layout === 'boxed-prose') {
    // <aside> [<p class="title">title</p>] body [<p class="caption">label + caption</p>]
    // Keeps the element's own semantic wrapper (e.g. <aside>); title/caption are
    // <p> with the .title / .caption classes — NOT <figcaption> (invalid outside
    // <figure>), so the figure family's CSS hooks apply uniformly (#31).
    const children = [];
    if (titleEl) children.push(titleEl);
    children.push(...bodyHast);
    if (captionEl) children.push(captionEl);
    return {
      type: 'element',
      tagName: wrapperEl ?? 'aside',
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
  // #19: the "See source" disclosure sits at the bottom of the block, after the
  // rendered output and its caption. Only the DSL (sibling-layout) kinds pass it.
  if (sourceDisclosureHast) siblings.push(sourceDisclosureHast);
  if (siblings.length === 1) return wrapper; // no title, caption, or disclosure; bare wrapper
  return { type: 'root', children: siblings };
}
