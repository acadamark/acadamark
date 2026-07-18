// Conditionally-injected CSS/JS for the website chrome (#246 S2b).
//
// The website counterpart of book-nav-asset.js: the live website shell builds its chrome ONCE
// (top bar + sidebar + footer) and swaps only `[data-enscribe-content]`, so the chrome CSS lives
// here and is injected once into the document head (innerHTML-swapped views can't carry head CSS).
// The LOOK was modeled on the original docs-site reference (its site.css, now archived at
// notes/archive/old-docs-site/site.css) — sticky header, brand, nav + aria-current active state,
// footer, the sticky-nav scroll-offset — but uses the package theme's --enscribe-* tokens (NOT the
// docs-local --border/--fg) and adds the two pieces that reference nav lacked: the top-bar dropdown
// (a <nav-group>) and the left sidebar. The book/article chrome (book-nav-asset.js, default.css) is untouched.

import { toHtml } from 'hast-util-to-html';
import { buildList } from '../lib/toc.js';
import { escapeHtmlAttr } from '../../core/escape-html.js';
import { buildSettingsPanel, SETTINGS_PANEL_CSS } from './settings-panel.js';

// The shared 4-entity attribute escaper (#316/1-A), wrapped to keep the inline copy's null-safe
// guard (escapeHtmlAttr coerces null→"null"; here an absent value — e.g. a missing brand icon — → "").
const esc = (s) => escapeHtmlAttr(s ?? '');

// ── The shell-actions corner (#392) ────────────────────────────────────────────────────────────────
// The top-right chrome corner — the shell's ACTION HOME (built as a home, not a one-off: #398's
// settings gear joins it). Two affordances today: an Edit toggle (live surfaces — flips the same
// `?edit` switch the URL hack uses, which keeps working) and the GitHub mark (the official
// invertocat, `fill="currentColor"` so themes/dark work for free, linking to `<config repo=…>`).
// One builder + one CSS block, two placements: inline at the right edge of the website top bar
// (static + live SPA), or `--floating` fixed top-right on standalone live shells (no top bar).

// The official GitHub invertocat (octicons mark-github, 16×16). currentColor inherits the chrome's
// text color, so every theme (and dark) renders it correctly with no per-theme asset.
export const GITHUB_MARK_SVG =
  '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">' +
  '<path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.04-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.27-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/></svg>';

// #435: the edit-layout toggle — two side-by-side columns (currentColor, like GITHUB_MARK_SVG / GEAR_SVG,
// so every theme + dark renders it with no per-theme asset).
export const LAYOUT_COLUMNS_SVG =
  '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">' +
  '<path d="M2.5 2h4a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5Zm7 0h4a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5Z"/></svg>';

/**
 * Build the shell-actions corner. `edit` renders the Edit toggle (a live-surface affordance — the
 * binder in browser.js flips `?edit` and reloads; `editOn` marks the current state); `layout` renders
 * the #435 edit-layout toggle (stacked ↔ side-by-side, edit-mode-only, article surfaces — the binder in
 * browser.js flips `.enscribe-edit-main--split` and persists per-origin); `repoUrl` renders the GitHub
 * mark. Up to four affordances — Edit, layout, GitHub, gear — in that order (layout beside Edit, both
 * edit-related). None → '' (the chrome is byte-identical for a site with no repo config on a static
 * page). Placement is the caller's: inline in the top bar, or `--floating`.
 */
export function buildShellActions({ edit = false, editOn = false, layout = false, repoUrl = null, floating = false, settings = false, document: docTier = false } = {}) {
  const parts = [];
  if (edit) {
    parts.push(
      `<button type="button" class="enscribe-shell-action enscribe-shell-action--edit" data-enscribe-edit-toggle` +
      ` aria-pressed="${editOn ? 'true' : 'false'}" title="${editOn ? 'Back to the reading view' : 'Edit this page live'}">` +
      `${editOn ? 'Read' : 'Edit'}</button>`,
    );
  }
  // #435: the edit-layout toggle — present only in edit mode on a split-capable (article) surface. SSR-
  // rendered stacked (aria-pressed="false"); the browser binder reconciles it to the per-origin persisted
  // choice on load and re-stamps aria-pressed/title on toggle. Hidden below the split breakpoint by CSS.
  if (layout) {
    parts.push(
      `<button type="button" class="enscribe-shell-action enscribe-shell-action--layout" data-enscribe-layout-toggle` +
      ` aria-pressed="false" aria-label="Editor layout" title="Show the editor and preview side by side">` +
      `${LAYOUT_COLUMNS_SVG}</button>`,
    );
  }
  if (repoUrl) {
    parts.push(
      `<a class="enscribe-shell-action enscribe-shell-action--github" href="${esc(repoUrl)}"` +
      ` aria-label="Project repository on GitHub" title="View source on GitHub">${GITHUB_MARK_SVG}</a>`,
    );
  }
  // #430: the settings gear — rightmost, after Edit / #435 layout / GitHub. Unlike the others it is
  // UNCONDITIONAL on the surfaces that opt in (its reader tier is always available), so a corner carrying
  // only the gear is still a corner — the `parts.length === 0` empty-return no longer fires when `settings`
  // is set.
  if (settings) parts.push(buildSettingsPanel({ document: docTier }));
  if (parts.length === 0) return '';
  return `<div class="enscribe-shell-actions${floating ? ' enscribe-shell-actions--floating' : ''}">${parts.join('')}</div>`;
}

// The corner's CSS — exported SEPARATELY so standalone live shells (which never load the website
// chrome CSS) can inject exactly this block; WEBSITE_NAV_CSS includes it below (one source).
export const SHELL_ACTIONS_CSS = `
.enscribe-shell-actions { margin-left: auto; display: inline-flex; align-items: center; gap: var(--enscribe-space-2, 0.5rem); }
.enscribe-shell-action {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 2rem; min-height: 2rem; padding: 0.25rem 0.5rem; border-radius: 6px;
  color: var(--enscribe-text-muted, #57606a); background: none; border: none; cursor: pointer;
  font-family: var(--enscribe-font-sans); font-size: 0.9rem; font-weight: 600; text-decoration: none;
}
.enscribe-shell-action:hover { color: var(--enscribe-text-primary, #1f2328); background: var(--enscribe-bg-subtle, #f6f8fa); }
.enscribe-shell-action--edit[aria-pressed="true"] { color: var(--enscribe-link, #0969da); }
.enscribe-shell-action--github svg { display: block; }
/* #435: the edit-layout toggle — SVG block like the GitHub mark; pressed (side-by-side active) reads as
   the active accent, like the Edit toggle. Below the split breakpoint two columns don't fit, so the
   toggle hides (its target layout is inert there too — the edit view stays the stacked tab view). */
.enscribe-shell-action--layout svg { display: block; }
.enscribe-shell-action--layout[aria-pressed="true"] { color: var(--enscribe-link, #0969da); }
/* "not all and (min-width: 60rem)" is the EXACT complement of the split grid's min-width:60rem media
   query (enscribe-shell.css) — gapless, so there is no fractional-width band where the toggle shows but
   the grid is inactive. Below the breakpoint the toggle hides (its target layout is inert — stacked). */
@media not all and (min-width: 60rem) { .enscribe-shell-action--layout { display: none; } }
/* Standalone live shells (no top bar): the corner floats fixed top-right — the same pill the
   #398 settings gear will join. Sits above the reading column; the gutter chevrons are vertically
   centered, so the corner (top-anchored) shares no band with them. */
.enscribe-shell-actions--floating {
  position: fixed; top: 0.6rem; right: 0.75rem; z-index: 120; margin-left: 0;
  background: var(--enscribe-bg, #fff); border: 1px solid var(--enscribe-border, #d8dee4);
  border-radius: 999px; padding: 0.1rem 0.35rem; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}
${SETTINGS_PANEL_CSS}`;

// The website chrome CSS. Modeled on the original docs-site site.css (now in notes/archive/old-docs-site/), retoken'd to --enscribe-*.
export const WEBSITE_NAV_CSS = `${SHELL_ACTIONS_CSS}
/* #459: DECLARE the site-nav height on the website root (it was only ever referenced with per-rule
   fallbacks, so BOOK_FLOAT_CSS's var(--enscribe-site-nav-height, 0px) fell back to 0 and a floating
   book-nav dock rendered UNDER the sticky site bar). Declaring it here — website-scoped, the docks
   inherit it via DOM ancestry — resolves that fallback to the real bar height so the docks tuck under
   the bar; a STANDALONE book has no .enscribe-site, so its var stays unset (BOOK_FLOAT_CSS's 0px is
   correct there). Byte-neutral for the other references, which already assumed this 3.25rem value. */
.enscribe-site { --enscribe-site-nav-height: 3.25rem; scroll-padding-top: var(--enscribe-site-nav-height); }
/* #246: a website mounts its FULL app shell (header + multi-column layout) inside the document
   <body>. default.css sizes <body> for a single reading column (a centred content-width column with
   side padding), which traps the whole site at article width — the content collapses to a sliver. The
   website resets the body it lives in. Scoped to a <body> that CONTAINS a mounted site, so it only
   fires for the website: book/article never inject this stylesheet, so their <body> is byte-identical. */
body:has(.enscribe-site) { max-width: none; margin: 0; padding: 0; }
.enscribe-site-header {
  display: flex; align-items: center; gap: var(--enscribe-space-6, 1.5rem); flex-wrap: wrap;
  padding: var(--enscribe-space-3, 0.6rem) var(--enscribe-space-5, 1.25rem);
  border-bottom: 1px solid var(--enscribe-border, #d8dee4);
  position: sticky; top: 0; z-index: 100; background: var(--enscribe-bg, #fff);
}
.enscribe-site-brand {
  display: inline-flex; align-items: center; gap: 0.5rem;
  font-size: 1.1rem; font-weight: 700; letter-spacing: -0.01em;
  color: var(--enscribe-text-primary, #1f2328); text-decoration: none;
}
.enscribe-site-brand-icon { height: 1.4rem; width: auto; display: block; }
.enscribe-site-nav { display: flex; align-items: center; gap: 1.1rem; flex-wrap: wrap; }
.enscribe-site-nav-link, .enscribe-site-dropdown-toggle {
  font-size: 0.9rem; color: var(--enscribe-text-muted, #57606a);
  text-decoration: none; background: none; border: none; padding: 0; cursor: pointer; font: inherit;
}
.enscribe-site-nav-link:hover, .enscribe-site-dropdown-toggle:hover { color: var(--enscribe-text-primary, #1f2328); }
.enscribe-site-nav-link[aria-current="page"] { color: var(--enscribe-text-primary, #1f2328); font-weight: 600; }
/* The dropdown (a <nav-group> in the top bar) — a native <details> disclosure, CSS-only (no JS). */
.enscribe-site-dropdown { position: relative; }
/* <summary> is the toggle: drop the default disclosure marker (both engines) and keep the nav-link look. */
.enscribe-site-dropdown-toggle { display: inline-block; list-style: none; cursor: pointer; }
.enscribe-site-dropdown-toggle::-webkit-details-marker { display: none; }
.enscribe-site-dropdown[open] > .enscribe-site-dropdown-toggle { color: var(--enscribe-text-primary, #1f2328); }
/* The panel: hidden by default, revealed when the <details> is open. Absolutely positioned as before. */
.enscribe-site-dropdown-panel {
  display: none;
  position: absolute; top: 100%; left: 0; min-width: 12rem; margin-top: 0.4rem; padding: 0.3rem 0;
  border: 1px solid var(--enscribe-border, #d8dee4); border-radius: 6px;
  background: var(--enscribe-bg, #fff); box-shadow: 0 2px 8px rgba(0,0,0,0.1); z-index: 110;
}
.enscribe-site-dropdown[open] > .enscribe-site-dropdown-panel { display: block; }
.enscribe-site-dropdown-item {
  display: block; padding: 0.35rem 0.9rem; font-size: 0.9rem;
  color: var(--enscribe-text-muted, #57606a); text-decoration: none; white-space: nowrap;
}
.enscribe-site-dropdown-item:hover { background: var(--enscribe-bg-subtle, #f6f8fa); color: var(--enscribe-text-primary, #1f2328); }
.enscribe-site-dropdown-item[aria-current="page"] { color: var(--enscribe-text-primary, #1f2328); font-weight: 600; }
/* The layout: nav bar + content. The PAGE owns its own layout (an article's config-toc, a book's
   3-col) from default.css + WEBSITE_SHELL_CSS — the SAME .content model the static website shell uses.
   The shell imposes no on-this-page rail and no content-column grid. An opted-in config-sidebar sits
   to the left of the content; without it the content is a plain full-width .content block. */
.enscribe-site-sidebar { padding: 1.5rem 1rem; }
.enscribe-site-sidebar ul { list-style: none; margin: 0; padding-left: 0.75rem; }
.enscribe-site-sidebar > ul { padding-left: 0; }
.enscribe-site-sidebar a, .enscribe-site-sidebar nav-label {
  display: block; padding: 0.2rem 0; font-size: 0.9rem;
  color: var(--enscribe-text-muted, #57606a); text-decoration: none;
}
.enscribe-site-sidebar a:hover { color: var(--enscribe-link, #0969da); }
.enscribe-site-sidebar a[aria-current="page"] { color: var(--enscribe-text-primary, #1f2328); font-weight: 600; }
.enscribe-site-sidebar nav-label { font-weight: 600; color: var(--enscribe-text-primary, #1f2328); }
.enscribe-site-footer {
  max-width: 84rem; margin: 2.5rem auto 0; padding: 1rem 1.75rem 2rem;
  border-top: 1px solid var(--enscribe-border, #d8dee4);
  font-size: 0.85rem; color: var(--enscribe-text-muted, #57606a);
}
@media (min-width: 900px) {
  /* Sidebar opt-in (config sidebar): a left nav column + the content. The content column is
     UNCONSTRAINED (minmax(0,1fr)) so the page lays ITSELF out within it (no 46rem crush). Without a
     sidebar there is no wrapper at all — the content is the plain .content block (static parity). */
  .enscribe-site-withsidebar {
    display: grid; gap: var(--enscribe-space-8, 2rem); align-items: start;
    grid-template-columns: 14rem minmax(0, 1fr); max-width: 84rem; margin: 0 auto;
  }
  .enscribe-site-sidebar {
    position: sticky; top: calc(var(--enscribe-site-nav-height, 3.25rem) + 0.5rem);
    max-height: calc(100vh - var(--enscribe-site-nav-height, 3.25rem) - 1rem); overflow: auto;
  }
}
`;

/** Inject the website chrome CSS once into the document head (idempotent via a fixed id). */
export function injectWebsiteNavStyles(doc) {
  const d = doc || (typeof document !== 'undefined' ? document : null);
  if (!d || d.getElementById('enscribe-website-nav-style')) return;
  const style = d.createElement('style');
  style.id = 'enscribe-website-nav-style';
  style.textContent = WEBSITE_NAV_CSS;
  d.head.appendChild(style);
}

// One top-bar item: a page → a link; a <nav-group> → a NATIVE <details> disclosure dropdown (the panel
// lists the group's child pages — the first cut is shallow, one level). <details>/<summary> OPEN on summary
// click with no script (the CSS reveals the panel on `[open]`), so opening works identically on a static
// page and in the live shell; the small dismissal layer (outside-click + Escape, bindWebsiteNavDismiss
// below) ships to both. data-less; the active mover keys on href.
function topItemHtml(entry) {
  if (entry.kind === 'group') {
    const items = (entry.children || [])
      .filter((c) => c.kind === 'page')
      .map((c) => `<a class="enscribe-site-dropdown-item" href="?page=${esc(c.slug)}">${esc(c.title)}</a>`)
      .join('');
    return (
      `<details class="enscribe-site-dropdown">` +
      `<summary class="enscribe-site-dropdown-toggle">${esc(entry.title)}</summary>` +
      `<div class="enscribe-site-dropdown-panel">${items}</div></details>`
    );
  }
  return `<a class="enscribe-site-nav-link" href="?page=${esc(entry.slug)}">${esc(entry.title)}</a>`;
}

/** The sticky top bar: brand (`<meta>` title + optional icon, linking to the first page) + the nav
 *  built from the tree's TOP LEVEL (groups → dropdowns) + the shell-actions corner (#392 — '' when
 *  the caller has no actions; `margin-left:auto` right-aligns it, the top-right corner). */
export function buildWebsiteTopBar({ title, icon, firstSlug }, entries, actions = '') {
  const iconHtml = icon ? `<img class="enscribe-site-brand-icon" src="${esc(icon)}" alt="" />` : '';
  const brand = `<a class="enscribe-site-brand" href="?page=${esc(firstSlug || '')}">${iconHtml}${esc(title || '')}</a>`;
  const nav = (entries || []).map(topItemHtml).join('');
  return `<header class="enscribe-site-header">${brand}<nav class="enscribe-site-nav">${nav}</nav>${actions}</header>`;
}

// Map the nav tree → buildList's {id, clean, children} shape: a page carries its slug as `id`
// (→ an `<a href="?page=slug">`); a group has NO id (→ a non-link `<span>` label, the S2b affordance).
function navToListEntries(entries) {
  return (entries || []).map((e) =>
    e.kind === 'group'
      ? { id: null, clean: e.title, children: navToListEntries(e.children) }
      : { id: e.slug, clean: e.title, children: navToListEntries(e.children) },
  );
}

/** The left sidebar: the FULL nav tree via the #226 buildList (a page → a `?page=` link; a group →
 *  a non-link label with its children nested beneath). */
export function buildWebsiteSidebar(entries) {
  const list = buildList(navToListEntries(entries), (e) => [{ type: 'text', value: e.clean }], (e) => `?page=${e.id}`);
  return `<nav class="enscribe-site-sidebar" aria-label="Site navigation">${toHtml(list)}</nav>`;
}

/** The persistent shell: the top nav bar + the page content + the site-wide footer. The shell's job
 *  is the NAV BAR; the PAGE owns its own layout (an article's `<config toc>` rail, a book's 3-col
 *  chapter-rail/reading-column/on-this-page) from default.css + WEBSITE_SHELL_CSS — exactly the model
 *  the STATIC website shell uses (`.content`). The shell imposes NO on-this-page rail and NO
 *  content-column grid (which crushed a book and double-railed a config-toc article). An opted-in
 *  sidebar (`<config sidebar>`) sits to the left of the content; without it the content is a plain
 *  full-width `.content` block. route() swaps ONLY `[data-enscribe-content]`; the bar/sidebar/footer
 *  survive a page swap. */
export function composeWebsiteShell({ topBar = '', sidebar = '', footer = '' }) {
  const content = `<main class="content" data-enscribe-content></main>`;
  const body = sidebar
    ? `<div class="enscribe-site-withsidebar">${sidebar}${content}</div>`
    : content;
  return `${topBar}${body}${footer}`;
}

/** Move `aria-current="page"` to the active page's link in BOTH the top bar and the sidebar, WITHOUT
 *  rebuilding the chrome. Scoped to the chrome (not the content region), keyed on the `?page=slug` href. */
export function setActivePage(root, slug) {
  if (!root || slug == null) return;
  const want = `?page=${slug}`;
  const links = root.querySelectorAll('.enscribe-site-header a[href], .enscribe-site-sidebar a[href]');
  links.forEach((a) => {
    if (a.getAttribute('href') === want) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

// The top-bar dropdown is a native <details>/<summary> disclosure: it OPENS on summary click and the CSS
// reveals the panel on `[open]` — no script needed to open. But a native <details> does NOT dismiss on an
// outside-click or on Escape, which is broken dropdown UX (an audit-7.1 finding). bindWebsiteNavDismiss adds
// exactly that missing dismissal and nothing else: the element stays a <details>, native open/close (summary
// click, keyboard) and its native expanded-state semantics are kept — so no aria-expanded bookkeeping is
// added to fight them (a native <summary> already exposes its open/closed state to assistive tech).
//
// Document-level DELEGATION (not a per-<details> bind): one click + one keydown handler on `document` read
// the OPEN dropdowns at event time. That survives the live shell's chrome re-render (the handler is on the
// persistent document, not on a node that gets replaced), covers any number of dropdowns, and never needs
// re-binding. Idempotent via a one-shot `document` flag, so a second call — a live re-mount, or a static
// page that injects the <script> twice — is a no-op. The static separate-pages path runs the IIFE-wrapped
// string form (WEBSITE_DROPDOWN_JS) as an inline <script>; the live website shell imports and calls this
// function directly (its chrome is set via innerHTML, where an injected <script> would not execute) — the
// same dual delivery book-nav-asset.js uses for bindBackToTop / BACK_TO_TOP_JS.
export function bindWebsiteNavDismiss() {
  if (typeof document === 'undefined' || document.__enscribeNavDismissBound) return;
  document.__enscribeNavDismissBound = true;
  function openDropdowns() {
    return Array.prototype.slice.call(document.querySelectorAll('details.enscribe-site-dropdown[open]'));
  }
  // Outside-click closes an open dropdown. A click on the summary (native open / native toggle-closed) or on
  // a panel item is INSIDE the <details>, so it is left to the native disclosure; only a click ELSEWHERE
  // dismisses. The open set is read BEFORE the summary toggle's default action runs, so opening a closed
  // dropdown is never self-cancelled — it is not yet in the open set when this bubble-phase handler sees the
  // click, and even if a browser toggled it first, the `contains(target)` guard keeps the summary's own click
  // out of the close path.
  document.addEventListener('click', function (ev) {
    var open = openDropdowns();
    for (var i = 0; i < open.length; i++) {
      if (!open[i].contains(ev.target)) open[i].removeAttribute('open');
    }
  });
  // Escape closes every open dropdown and returns focus to its <summary> (a11y: focus must not strand on a
  // control that just collapsed). Only one dropdown is ever open at a time (opening one outside-click-closes
  // the others), so this restores focus to the dropdown the user was actually in.
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape' && ev.key !== 'Esc') return;
    var open = openDropdowns();
    for (var i = 0; i < open.length; i++) {
      open[i].removeAttribute('open');
      var summary = open[i].querySelector('summary');
      if (summary && typeof summary.focus === 'function') summary.focus();
    }
  });
}

// The IIFE-wrapped string form for STATIC pages — injected as an inline <script>, which the browser runs at
// parse time. Derived from the one function above (so the bind logic has a single source), exactly as
// book-nav-asset.js derives BACK_TO_TOP_JS from bindBackToTop. The live path cannot use this string (its
// chrome is innerHTML-set, where a <script> stays inert) and calls bindWebsiteNavDismiss() directly instead.
export const WEBSITE_DROPDOWN_JS = `(${bindWebsiteNavDismiss.toString()})();`;

// The former bindWebsiteNav (a JS click-toggle of aria-expanded/hidden) is gone — the dropdown opens
// natively now; only the dismissal above is scripted. setActivePage (above) is the other runtime helper.
//
// REMOVED (maintainer decision — the shell renders the nav bar; the PAGE owns its layout, including
// whether it has a ToC): the shell's `buildOnThisPage` rail builder. The website no longer manufactures
// an on-this-page rail. A page's rail comes only from the page itself — an article's `<config toc>`, a
// book's own chapter-rail + on-this-page (the page-owned `buildOnThisPage` in lib/toc.js, used at build
// time, is unaffected). A no-config-toc article simply has no ToC.
