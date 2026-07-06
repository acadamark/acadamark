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

// The landing view — ONE source of truth (#editability model). Both the active TAB and the visible
// PANE derive from this single value, so flipping the landing view is one edit, not a tab class + a
// `hidden` attribute kept in sync. Display defaults to PREVIEW: an editable page opens on the rendered
// document; Source (the editor) is the inactive tab, one click away. (Edit-on-load is a deferred knob.)
export const DEFAULT_TAB = 'preview';
const TAB_LABELS = { source: 'Source', preview: 'Preview' };

// The Write/Preview tab bar, derived from `defaultTab`: that tab is `--active` / `aria-selected="true"`,
// the other inactive. Identical for book + article. (With `defaultTab='source'` this emits exactly the
// pre-#editability markup.)
//
// `saveable` (#351) — the single-file vessel case: edits serialize back into the self-contained file, so
// the bar carries a Save button + a dirty-tracked status (`saved` ↔ `unsaved`, driven imperatively by
// browser.js `wireEditSave`, initial `saved` = matches the embedded source). Otherwise (a served/live
// document) editing stays preview-only — saving writes a self-contained file, which only the single-file
// vessel is — and the status keeps the preview-only marker.
function editTabs(defaultTab, saveable = false) {
  const tab = (name) => {
    const active = name === defaultTab;
    return `<button type="button" class="enscribe-edit-tab${active ? ' enscribe-edit-tab--active' : ''}" ` +
      `data-edit-tab="${name}" role="tab" aria-selected="${active ? 'true' : 'false'}">${TAB_LABELS[name]}</button>`;
  };
  const tabs = tab('source') + tab('preview');
  if (saveable) {
    return '<div class="enscribe-edit-tabs" role="tablist">' + tabs +
        '<button type="button" class="enscribe-edit-save" data-edit-save>Save</button>' +
        '<span class="enscribe-edit-status" data-edit-status ' +
          'title="Saved — the edited source is written into this self-contained HTML file.">saved</span>' +
      '</div>';
  }
  return '<div class="enscribe-edit-tabs" role="tablist">' + tabs +
      '<span class="enscribe-edit-status" title="Edits are preview-only — they live in memory and are lost ' +
        'on reload. Saving writes a self-contained file, which only a single-file document is.">preview — unsaved</span>' +
    '</div>';
}

/**
 * Build the Write/Preview `<main>` — the tab bar + the source mount + the preview pane. The shared
 * core of every edit view: the source pane is an empty mount (the browser entry fills it with the
 * editor adapter); the preview pane holds the initial live render and is re-rendered on each edit.
 * The visible pane is `defaultTab`'s; the other is `hidden` — the SAME single value the active tab
 * derives from, so the landing view has one source of truth. The browser entry toggles via the tabs.
 *
 * @param {string} previewBody - the initial preview pane inner HTML (the live-rendered document)
 * @param {'preview'|'source'} [defaultTab=DEFAULT_TAB] - the landing pane/tab (default: preview)
 * @param {boolean} [saveable=false] - single-file vessel: render the Save button + dirty status (#351)
 * @returns {string} the `<main class="enscribe-edit-main">…</main>` fragment
 */
export function buildEditMain(previewBody, defaultTab = DEFAULT_TAB, saveable = false) {
  return `<main class="enscribe-edit-main">${buildEditMainInner(previewBody, defaultTab, saveable)}</main>`;
}

/**
 * The Write/Preview INNER — the tab bar + the source mount + the preview pane — WITHOUT the outer
 * wrapper. `buildEditMain` wraps it in `<main class="enscribe-edit-main">` (the ARTICLE edit view, a
 * top-level mount). The BOOK chapter edit view wraps it in `<div class="enscribe-edit-main">` and frames
 * THAT through `composeBookBody`'s content column — a `<main>` cannot nest inside composeBookBody's own
 * `<main class="enscribe-body">`. Single-sourced so the two framings cannot drift.
 *
 * @param {string} previewBody - the initial preview pane inner HTML (the live-rendered document)
 * @param {'preview'|'source'} [defaultTab=DEFAULT_TAB] - the landing pane/tab (default: preview)
 * @param {boolean} [saveable=false] - single-file vessel: render the Save button + dirty status (#351)
 * @returns {string} the tab bar + panes (no wrapper element)
 */
export function buildEditMainInner(previewBody, defaultTab = DEFAULT_TAB, saveable = false) {
  const pane = (name, cls, inner) =>
    `<div class="enscribe-edit-pane ${cls}" data-edit-pane="${name}"${name === defaultTab ? '' : ' hidden'}>${inner}</div>`;
  // The PREVIEW pane carries the `content` class so the page's render is framed EXACTLY as read mode
  // frames it (the website `.content` rules — the bare-article reading column, and the `.content
  // .enscribe-toc`/`.enscribe-onthispage` sticky-below-nav offsets). So the page owns its layout in the
  // preview, the SAME as in read mode — not nested inside a competing edit grid. (In a standalone
  // article/book mount the `content` class is inert; the page's own `.enscribe-layout--*` lays it out.)
  // The SOURCE pane is width-matched to the preview's reading column by `.enscribe-edit-pane--source`
  // (enscribe-shell.css) — so the Write/Preview toggle never jumps full-width ↔ reading-column.
  const panes =
    pane('source', 'enscribe-edit-pane--source', '') +
    pane('preview', 'enscribe-edit-pane--preview enscribe-body content', previewBody);
  return `${editTabs(defaultTab, saveable)}${panes}`;
}

/**
 * Render an ARTICLE's edit view (#216) — the single-unit collapse of the book's chapter edit view.
 * Just the Write/Preview pane: NO chapter rail, NO routing, NO cover (an article is one unit). The
 * PAGE owns its layout — the preview pane (`.content`, in buildEditMain) frames the article exactly as
 * read mode does, so its config-toc rail lays out the same. NO competing `enscribe-layout--edit`
 * wrapper (it imposed nothing but signalled a competing layout; the page owns layout, here too).
 *
 * @param {string} previewBody - the live-rendered `<article>` HTML for the preview pane
 * @param {'preview'|'source'} [defaultTab=DEFAULT_TAB] - the landing pane/tab (default: preview)
 * @param {boolean} [saveable=false] - single-file vessel: render the Save button + dirty status (#351)
 * @returns {string} the mounted article edit-view HTML
 */
export function renderLiveArticleEditView(previewBody, defaultTab = DEFAULT_TAB, saveable = false) {
  return buildEditMain(previewBody, defaultTab, saveable);
}
