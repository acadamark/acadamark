// <a> handler (#289) — the website internal-link form `<a {slug} | label>`.
//
// normalize-to-canonical PROMOTES an <a>'s positional[0] to kwargs.href, so by handler time
// `<a design | label>` is an <a> whose href is the bare slug "design" (NOT a surviving positional).
// We therefore detect an INTERNAL page link by the href SHAPE — a bare slug (what slugifyPage emits:
// lowercase alphanumerics + hyphens, with no scheme `:`, path `/`, file extension `.`, or fragment
// `#`) — and emit a marker `<a data-page-slug="slug">label</a>` for the website BUILDER to resolve to
// the page's depth-relative URL (and to fill the label from the target page's title when it is empty).
// The engine renders ONE page in isolation, so it cannot resolve slug → URL here; it records intent.
//
// Everything else — an external/absolute/relative href (`https://…`, `foo.html`, `./x`, `#frag`) or a
// bare <a> with no href — is the ordinary anchor, rendered byte-identically via the schema dispatch.

import { schemaDispatch } from '../interpret-plugin.js';

// A bare page slug: slugifyPage's output. Any `:`/`/`/`.`/`#` means a real URL/path/fragment, not a slug.
const PAGE_SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

export function aHandler(state, node, vocab) {
  // The normal anchor render first — gives the label children + the mapped href/target/rel/title/id/class.
  const el = schemaDispatch(state, node, vocab);
  const href = node.kwargs?.href;
  if (typeof href === 'string' && PAGE_SLUG_RE.test(href)) {
    // Internal page-slug link: drop the literal href (the builder writes the real relative URL) and
    // record the slug as a marker; keep every other property (id, classes, …) and the label children.
    const { href: _dropped, ...rest } = el.properties || {};
    el.properties = { ...rest, 'data-page-slug': href };
  }
  return el;
}
