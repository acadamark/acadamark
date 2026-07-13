// Figure handler — renders `<fig>` (canonical) and the `<figure>` authoring
// alias.
//
// Output: HTML5-native <figure> wrapper containing an optional <img>
// (from the `src` kwarg) and an optional <figcaption> (from either the
// new <caption> child tag — Phase 3 slice 3c canonical form — or the
// legacy pipe-content-as-caption fallback when no <caption> child is
// present).
//
// Slice 3c refactor: this handler now extracts <caption> / <title>
// child tags via the shared `extractFrameableChildren` helper, then
// calls `renderFrameable` to build the wrapped output. Behavior-
// preserving for the legacy pipe-as-caption authoring form (every
// existing fixture); enables formatted captions and titles via the
// new child-tag form.
//
// Schema-mapped attributes (align, width, type) flow through the same
// `aggregateHtmlProps(mapAttributes(...))` pair the schema dispatcher uses.

import { mapAttributes } from '../../core/map-attributes.js';
import { htmlEmit, aggregateHtmlProps } from '../lib/html-emit.js';
import { extractPlainText, convertChildren } from '../lib/ast-helpers.js';
import { extractFrameableChildren, renderFrameable, frameableBorderLook, readFrameableBorder } from '../lib/frameable.js';

/**
 * Legacy pipe-content-as-caption fallback. When the author writes
 * `<fig src=x.jpg | caption text>` without a `<caption>` child, the
 * pipe content (the remaining body after caption/title extraction)
 * becomes the figcaption. Returns hast children or null when the body
 * is empty.
 */
function buildPipeAsCaptionHast(state, node, bodyContent) {
  if (!bodyContent || bodyContent.length === 0) return null;
  // The single-paragraph wrap/unwrap decision (#326) is made at parse time by
  // the content-model gate (recursive-content.js extractFromRoot): <fig> is
  // flow, so its single-paragraph pipe body keeps its <p>. Convert as-is — a
  // re-unwrap here would undo that wrap.
  const children = convertChildren(state, node, bodyContent);
  return children.length > 0 ? children : null;
}

/**
 * Figure handler. Called by the interpret-plugin dispatcher when the
 * vocabulary's `interpreter_strategy === 'handler'` +
 * `handler_module === './handlers/figure.js'`.
 *
 * @param {object} state - mdast-util-to-hast state
 * @param {object} node  - enscribeTag node with canonical tagname 'fig'
 *                          (the gate rewrites authored '<figure>' to 'fig'
 *                          before this handler runs).
 * @param {object} vocab - vocabulary entry for `<fig>`
 * @returns {object} hast element
 */
export function figureHandler(state, node, vocab) {
  const src = node.kwargs?.src ?? null;
  const altKwarg = node.kwargs?.alt ?? null;

  // Extract <caption> / <title> child tags first. These have priority
  // over the pipe-content-as-caption fallback (Phase 3 slice 3c
  // canonical form).
  const { captionHast: childCaptionHast, titleHast, bodyContent } =
    extractFrameableChildren(state, node);

  // Fallback: pipe-content-as-caption when no <caption> child exists.
  // Preserves the legacy figure-as-pipe-caption authoring form. The
  // body content (post caption/title extraction) IS the caption in
  // this fallback.
  const captionHast =
    childCaptionHast ?? buildPipeAsCaptionHast(state, node, bodyContent);

  // Image body: when src is present, generate an <img> as the body.
  // The alt text falls back to the caption (caption-as-content can be
  // arbitrary hast, so we plain-text-ify the original mdast for alt
  // when child <caption> isn't there).
  //
  // #408 B7 — DECISION (Ariel, 2026-07-15): the figure `src` is emitted verbatim with NO
  // handler-time filesystem existence check, and that is a NON-GOAL, not a gap. A figure
  // legitimately resolves its src in the BROWSER (a relative path the reader's browser fetches,
  // an `@id`/`data:`/`http(s)` reference the handler must not touch), so a build-time fs.stat here
  // would be wrong for the common case and cannot run at all on the live path. The asymmetry with
  // `table.js` — which reads-and-errors because it must INLINE the CSV bytes at build time to render
  // a grid — is therefore BY DESIGN: a table consumes its source, a figure references it. The
  // missing-figure case is still surfaced where it can be (the static-website `auditReferencedAssets`
  // pass warns on a referenced-but-unshipped path); a future reader should not re-flag this as a bug.
  const bodyHast = [];
  if (src) {
    let altText = altKwarg;
    if (altText == null) {
      // Prefer child <caption>'s plain text if available; else legacy
      // pipe content's plain text.
      if (childCaptionHast) {
        altText = extractPlainText(childCaptionHast, { trim: false });
      } else {
        altText = extractPlainText(bodyContent ?? []);
      }
    }
    bodyHast.push({
      type: 'element',
      tagName: 'img',
      properties: { src, alt: altText },
      children: [],
    });
  }

  // Phase 3 frameable surface: border opts in to the frameable-border class.
  // #250: read via the shared helper with defaultOn:false (fig defaults border
  // OFF) so the documented `border=true|false` kwarg form works — not just
  // +border/-border — matching frame/aside.
  const border = readFrameableBorder(node, false);
  // #58: border=<name> selects a named look (and implies border-on).
  const borderLook = frameableBorderLook(node);

  // Properties for the wrapper (id, classes, schema-mapped attributes).
  const wrapperProps = aggregateHtmlProps(mapAttributes(node, vocab, 'html', htmlEmit));

  return renderFrameable({
    kind: 'fig',
    bodyHast,
    wrapperEl: 'figure',  // HTML5-native; the canonical eHTML name is <fig>
                           // but the rendered HTML uses <figure>.
    wrapperProps,
    captionHast,
    titleHast,
    computedNumber: node.computedNumber ?? null,
    scope: node._scope ?? null,
    border,
    borderLook,
  });
}
