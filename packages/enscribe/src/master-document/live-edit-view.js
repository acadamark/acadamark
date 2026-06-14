// Shared live edit-view UI (#211 / #216) — the GitHub-style Write/Preview pane.
//
// The edit loop's surface is ONE DOM contract: a tab bar (Source | Preview) + an "unsaved" marker,
// a SOURCE pane (an empty mount the browser entry fills with the editor adapter), and a PREVIEW
// pane (the live render). The engine wires it by `data-edit-tab` / `data-edit-pane`, so the markup
// and the wiring must agree. That contract is single-sourced HERE so the BOOK (chapter) edit view
// and the ARTICLE edit view cannot drift — they share `buildEditMain`; only the surrounding chrome
// differs (the book wraps it in the chapter rail + book layout; the article in a chrome-free edit
// layout, since an article is one unit — no rail, no routing).
//
// PURE BY DESIGN (no DOM, no fetch): a string builder, exactly like live-book.js's view functions.

// The Write/Preview tab bar — Source active by default (you arrive to type), Preview second, and an
// "unsaved" marker stating edits are preview-only (no save this slice). Identical for book + article.
const EDIT_TABS =
  '<div class="enscribe-edit-tabs" role="tablist">' +
    '<button type="button" class="enscribe-edit-tab enscribe-edit-tab--active" data-edit-tab="source" role="tab" aria-selected="true">Source</button>' +
    '<button type="button" class="enscribe-edit-tab" data-edit-tab="preview" role="tab" aria-selected="false">Preview</button>' +
    '<span class="enscribe-edit-status" title="Edits are preview-only — they live in memory and are lost on reload (no save this slice).">preview — unsaved</span>' +
  '</div>';

/**
 * Build the Write/Preview `<main>` — the tab bar + the source mount + the preview pane. The shared
 * core of every edit view: the source pane is an empty mount (the browser entry fills it with the
 * editor adapter); the preview pane holds the initial live render and is re-rendered on each edit.
 * Source pane visible by default, preview hidden — the browser entry toggles them via the tabs.
 *
 * @param {string} previewBody - the initial preview pane inner HTML (the live-rendered document)
 * @returns {string} the `<main class="enscribe-edit-main">…</main>` fragment
 */
export function buildEditMain(previewBody) {
  const panes =
    '<div class="enscribe-edit-pane enscribe-edit-pane--source" data-edit-pane="source"></div>' +
    `<div class="enscribe-edit-pane enscribe-edit-pane--preview enscribe-body" data-edit-pane="preview" hidden>${previewBody}</div>`;
  return `<main class="enscribe-edit-main">${EDIT_TABS}${panes}</main>`;
}

/**
 * Render an ARTICLE's edit view (#216) — the single-unit collapse of the book's chapter edit view.
 * Just the Write/Preview pane in a chrome-free edit layout: NO chapter rail, NO routing, NO cover
 * (an article is one unit). The body centers the `enscribe-layout` block at the reading-column
 * width, exactly as the read article centers, so editing and reading share the same column.
 *
 * @param {string} previewBody - the live-rendered `<article>` HTML for the preview pane
 * @returns {string} the mounted article edit-view HTML
 */
export function renderLiveArticleEditView(previewBody) {
  return `<div class="enscribe-layout enscribe-layout--edit">${buildEditMain(previewBody)}</div>`;
}
