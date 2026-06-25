// Single source for HTML text-escaping within packages/enscribe (#254).
//
// Before this module the escaper was re-implemented at three sites that had already
// drifted: emit-shell.js and book-scaffold.js escaped `& < >` (3 entities, for
// element-text contexts like <title> / <book-title>), while bibliography.js also
// escaped `"` (4 entities, for its raw-hast <h2> heading override). Two named
// escapers capture that split deliberately, so neither site re-implements and the
// entity set at each call is explicit:
//
//   escapeHtml     — `& < >`. Correct for ELEMENT TEXT / RCDATA content, where a
//                    literal `"` needs no escaping. The common case.
//   escapeHtmlAttr — `& < > "`. The superset, for ATTRIBUTE-value contexts (and any
//                    site that prefers to escape quotes defensively).
//
// (The CLI has its own xml-escape.js for the JATS paths; pandoc-import.js imports the
// shared 3-entity escapeHtml here, as of #263. The two website-chrome 4-entity copies in
// master-document/live-website.js and interpreter/assets/website-nav-asset.js were folded
// onto escapeHtmlAttr here in #316.)

/** Escape text for HTML ELEMENT content (`& < >`). */
export function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Escape text for an HTML ATTRIBUTE value (`& < > "`) — the quote-escaping superset. */
export function escapeHtmlAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
