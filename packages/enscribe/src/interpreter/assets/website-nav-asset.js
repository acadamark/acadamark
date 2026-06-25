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

// The shared 4-entity attribute escaper (#316/1-A), wrapped to keep the inline copy's null-safe
// guard (escapeHtmlAttr coerces null→"null"; here an absent value — e.g. a missing brand icon — → "").
const esc = (s) => escapeHtmlAttr(s ?? '');

// The website chrome CSS. Modeled on the original docs-site site.css (now in notes/archive/old-docs-site/), retoken'd to --enscribe-*.
export const WEBSITE_NAV_CSS = `
.enscribe-site { scroll-padding-top: var(--enscribe-site-nav-height, 3.25rem); }
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
/* The layout: a left sidebar + the content + an on-this-page rail (3 columns on desktop). */
.enscribe-site-layout { display: block; max-width: 84rem; margin: 0 auto; }
.enscribe-site-main { padding: 1.5rem 1.75rem 0; min-width: 0; }
.enscribe-site-sidebar { padding: 1.5rem 1rem; }
.enscribe-site-sidebar ul { list-style: none; margin: 0; padding-left: 0.75rem; }
.enscribe-site-sidebar > ul { padding-left: 0; }
.enscribe-site-sidebar a, .enscribe-site-sidebar .enscribe-nav-label {
  display: block; padding: 0.2rem 0; font-size: 0.9rem;
  color: var(--enscribe-text-muted, #57606a); text-decoration: none;
}
.enscribe-site-sidebar a:hover { color: var(--enscribe-link, #0969da); }
.enscribe-site-sidebar a[aria-current="page"] { color: var(--enscribe-text-primary, #1f2328); font-weight: 600; }
.enscribe-site-sidebar .enscribe-nav-label { font-weight: 600; color: var(--enscribe-text-primary, #1f2328); }
.enscribe-site-onthispage { padding: 1.5rem 1rem; }
.enscribe-site-onthispage ul { list-style: none; margin: 0; padding: 0; }
.enscribe-site-onthispage a { font-size: 0.82rem; color: var(--enscribe-text-muted, #57606a); text-decoration: none; }
.enscribe-site-onthispage a:hover, .enscribe-site-onthispage a.active { color: var(--enscribe-link, #0969da); }
/* An empty on-this-page rail (a page with <2 headings → innerHTML '') drops out of the flow entirely,
   so its grid column can be reclaimed (the :has rules below) instead of leaving a blank padded box. */
.enscribe-site-onthispage:empty { display: none; }
.enscribe-site-footer {
  max-width: 84rem; margin: 2.5rem auto 0; padding: 1rem 1.75rem 2rem;
  border-top: 1px solid var(--enscribe-border, #d8dee4);
  font-size: 0.85rem; color: var(--enscribe-text-muted, #57606a);
}
@media (min-width: 900px) {
  /* The grid reflows to whatever columns are actually present (#246 S1.5). The sidebar is a master
     opt-in (<config sidebar>), so it may be absent from the DOM; the on-this-page rail may be empty
     (hidden above) on a short page. Four states, resolved by :has in source order (the most specific
     last so it wins when several match). */
  .enscribe-site-layout {
    display: grid; gap: var(--enscribe-space-8, 2rem);
    align-items: start; justify-content: center;
    /* default: sidebar OFF, on-this-page present → content + the right rail. */
    grid-template-columns: minmax(0, 46rem) 13rem;
  }
  /* sidebar ON → the full three columns. */
  .enscribe-site-layout:has(.enscribe-site-sidebar) {
    grid-template-columns: 14rem minmax(0, 46rem) 13rem;
  }
  /* no on-this-page rail → drop its column (a centred single content column when the sidebar is off too). */
  .enscribe-site-layout:has(.enscribe-site-onthispage:empty) {
    grid-template-columns: minmax(0, 46rem);
  }
  /* sidebar ON but no rail → sidebar + content. (Last, so it wins over the two single-condition rules.) */
  .enscribe-site-layout:has(.enscribe-site-sidebar):has(.enscribe-site-onthispage:empty) {
    grid-template-columns: 14rem minmax(0, 46rem);
  }
  .enscribe-site-sidebar, .enscribe-site-onthispage {
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
// lists the group's child pages — the first cut is shallow, one level). <details>/<summary> open and
// close on summary click in the browser with NO script, so this works identically on a static page and
// in the live shell. data-less; the active mover keys on href.
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
 *  built from the tree's TOP LEVEL (groups → dropdowns). */
export function buildWebsiteTopBar({ title, icon, firstSlug }, entries) {
  const iconHtml = icon ? `<img class="enscribe-site-brand-icon" src="${esc(icon)}" alt="" />` : '';
  const brand = `<a class="enscribe-site-brand" href="?page=${esc(firstSlug || '')}">${iconHtml}${esc(title || '')}</a>`;
  const nav = (entries || []).map(topItemHtml).join('');
  return `<header class="enscribe-site-header">${brand}<nav class="enscribe-site-nav">${nav}</nav></header>`;
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

/** The persistent shell: top bar + (sidebar | content | on-this-page) layout + the site-wide footer.
 *  route() swaps ONLY `[data-enscribe-content]`; the bar/sidebar/footer survive a page swap. */
export function composeWebsiteShell({ topBar = '', sidebar = '', footer = '' }) {
  return (
    `${topBar}` +
    `<div class="enscribe-site-layout">${sidebar}` +
    `<main class="enscribe-site-main" data-enscribe-content></main>` +
    `<aside class="enscribe-site-onthispage" data-enscribe-onthispage></aside></div>` +
    `${footer}`
  );
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

// The top-bar dropdown is a native <details> disclosure (CSS-only) — it needs NO JS wiring, so the
// former bindWebsiteNav (click-toggle of aria-expanded/hidden) is gone. setActivePage (above) and
// buildOnThisPage (below) are the remaining runtime helpers.

/** Build the current page's "on this page" list from its id'd section-family headings (the id is on
 *  the `<section>` / `<sub-section>` / `<h*>`; the text is its `*-title` child). Pure DOM-in → HTML-out;
 *  the live mount re-runs it per page swap. Returns '' for fewer than two headings (no rail worth it).
 *
 *  #223/#246: a heading nested inside a `<frame>` (rendered `<figure class="frameable-border">`) or an
 *  `<aside>` is DEMO content — e.g. a Documentation catalog's live-render box showing a `<section>` — and
 *  must NOT appear in the page's on-this-page rail. Exclude any heading with a `figure` / `aside` ancestor
 *  (a real section heading never lives inside a float / boxed-prose element). */
const ONTHISPAGE_HEADING_RE = /^(SECTION|SUB-SECTION|SUB-SUB-SECTION|H[1-6])$/;
export function buildOnThisPage(contentEl) {
  if (!contentEl || typeof contentEl.querySelectorAll !== 'function') return '';
  const heads = Array.from(contentEl.querySelectorAll('[id]'))
    .filter((el) => ONTHISPAGE_HEADING_RE.test(el.tagName)
      && !(typeof el.closest === 'function' && el.closest('figure, aside')))
    .map((el) => {
      const titleEl = el.querySelector('section-title, sub-section-title, sub-sub-section-title');
      const text = ((titleEl || el).textContent || '').trim().split('\n')[0].trim();
      return { id: el.id, text };
    })
    .filter((h) => h.id && h.text);
  if (heads.length < 2) return '';
  const items = heads.map((h) => `<li><a href="#${esc(h.id)}">${esc(h.text)}</a></li>`).join('');
  return `<nav aria-label="On this page"><ul>${items}</ul></nav>`;
}
