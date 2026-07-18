// The settings gear panel (#430 — theme slice 3, closing the #398 design arc).
//
// The THIRD chrome-corner affordance beside Edit + GitHub (#392 shell-actions home). A native
// <details>/<summary> disclosure — the SAME pattern as the #392 top-bar dropdown (opens with no JS via
// [open]; Escape and outside-click dismiss; focus returns to the gear), NOT a bespoke modal/focus-trap
// (the codebase has none — one dismissal rule across the chrome). Two tiers of controls:
//
//   READER TIER (universal — static + live, every surface the gear appears on): text size, line spacing,
//   text width, and the light/dark switch. Visitor-local, persisted in localStorage per-origin, applied
//   on load, reset-to-theme. Implemented as CSS-var overrides on <html> (documentElement.style
//   .setProperty) layered ABOVE the theme tokens — an inline style beats every stylesheet :root by
//   cascade origin, so theme + reader settings compose with no !important. The light/dark switch drives
//   the SAME data-theme-variant hook the baked dark CSS keys on (default.css). Because every override
//   lives on the persistent documentElement (never the swapped content region), reader settings survive
//   a live SPA page transition by construction.
//
//   DOCUMENT TIER (any editable single-document ARTICLE surface — wired separately by the edit loop in
//   browser.js, which holds the source + the editor handle): the display-option controls that REWRITE
//   the document's <config> block (visible in the source pane). Since #445 the control set GENERATES
//   from config-options-doc.js gear metadata — collapsible family sections (Numbering, Table of
//   contents, Citations & bibliography, Notes, Display / DSL / strict), each row with an info
//   affordance carrying that key's description from the same single source the docs reference
//   generates from. Rendered when `document:true` — a standalone live/single-file article in edit
//   mode, AND an article page in the website/playground editor (#434). Absent on static pages,
//   read-only live docs (no editable source to act on — the #398 read-only rule), and a BOOK in edit
//   mode (its per-chapter loop edits chapter files, not the master <config> where the display options
//   live — reader tier only there; the master-affordance follow-on is tracked on GitHub).
//
// Dual delivery (like bindWebsiteNavDismiss / WEBSITE_DROPDOWN_JS): the reader-tier binder is a
// self-contained function; static pages run its IIFE-string form as an inline <script>, the live paths
// import and call it directly (their chrome is innerHTML-set, where a <script> stays inert).

import { escapeHtml, escapeHtmlAttr } from '../../core/escape-html.js';
import { CONFIG_OPTIONS_DOC, CONFIG_FAMILIES } from '../lib/config-options-doc.js';

const esc = (s) => escapeHtmlAttr(s ?? '');

/**
 * The document-tier control list (#445) — every CONFIG_OPTIONS_DOC entry carrying `gear` metadata,
 * flattened for the two consumers: buildSettingsPanel (the markup) and browser.js wireDocumentTier
 * (the read-back + rewrite wiring). ONE derivation point, so the rendered controls and the wired
 * controls can never disagree. The `scope === 'all'` filter is load-bearing, not defensive polish:
 * the tier renders only where the edited buffer carries the `<config>` it rewrites — an ARTICLE
 * surface — so a book-only/website-only key has no read-or-write surface here (the unseen-master
 * exclusion, notes/specs/settings.md). When a master-<config> affordance lands, this filter grows a
 * docType parameter instead of the panel growing a second list.
 */
export function gearControlSpecs() {
  return CONFIG_OPTIONS_DOC.filter((e) => e.gear && !e.reserved && e.scope === 'all');
}

// A cog/gear (currentColor so every theme + dark render it with no per-theme asset, like GITHUB_MARK_SVG).
export const GEAR_SVG =
  '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">' +
  '<path d="M8 4.75a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5Zm0 1.5a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5Z"/>' +
  '<path d="M6.94.5a1.5 1.5 0 0 0-1.47 1.2l-.13.64a5.6 5.6 0 0 0-.9.52l-.62-.2a1.5 1.5 0 0 0-1.77.68l-.53.92a1.5 1.5 0 0 0 .3 1.87l.49.43a5.7 5.7 0 0 0 0 1.04l-.49.43a1.5 1.5 0 0 0-.3 1.87l.53.92a1.5 1.5 0 0 0 1.77.68l.62-.2c.28.2.58.38.9.52l.13.64A1.5 1.5 0 0 0 6.94 15.5h1.12a1.5 1.5 0 0 0 1.47-1.2l.13-.64c.32-.14.62-.32.9-.52l.62.2a1.5 1.5 0 0 0 1.77-.68l.53-.92a1.5 1.5 0 0 0-.3-1.87l-.49-.43a5.7 5.7 0 0 0 0-1.04l.49-.43a1.5 1.5 0 0 0 .3-1.87l-.53-.92a1.5 1.5 0 0 0-1.77-.68l-.62.2a5.6 5.6 0 0 0-.9-.52l-.13-.64A1.5 1.5 0 0 0 8.06.5H6.94Z" opacity=".55"/></svg>';

// The reader-tier knobs: the three token overrides. Names come from the token contract (default.css):
// text size = --enscribe-text-base (1rem), line spacing = --enscribe-line-height (1.65), text width =
// --enscribe-content-width (760px). All role 'fixed' (dark derivation never touches them). The min/max
// bracket the base default so the slider centers on "no change"; `def` is the base token value shown as
// the reset/neutral position.
const READER_KNOBS = [
  { key: 'fontSize', label: 'Text size', cssVar: '--enscribe-text-base', unit: 'rem', min: 0.85, max: 1.3, step: 0.05, def: 1 },
  { key: 'lineHeight', label: 'Line spacing', cssVar: '--enscribe-line-height', unit: '', min: 1.3, max: 2, step: 0.05, def: 1.65 },
  { key: 'width', label: 'Text width', cssVar: '--enscribe-content-width', unit: 'px', min: 540, max: 1000, step: 20, def: 760 },
];

/**
 * The settings panel markup — a native <details> disclosure whose <summary> is the gear and whose panel
 * holds the reader tier (always) and, when `document` is true, the document tier.
 *
 * The document tier (#445) GENERATES from gearControlSpecs() — collapsible family sections in
 * CONFIG_FAMILIES order (Ariel's design point: the families are the efficient UI, not a flat wall of
 * controls), one row per gear-carrying key. The Display / DSL / strict section opens by default: it
 * holds the tier's two pre-expansion controls (theme + variant), so the most common act — change the
 * theme — stays one click from the gear, as it was before the families arrived. Each row carries a
 * native-<details> info affordance whose body is the entry's description/values/default from the SAME
 * single source the docs-site options reference generates from (no per-key docs anchors exist, and the
 * shipped chrome knows no docs-site URL — the info body is the self-contained, cannot-drift link).
 * Picking a row's "Default" option removes the kwarg (the theme picker's shipped convention).
 *
 * @param {object} [o]
 * @param {boolean} [o.document=false] - render the document tier (the gear-metadata control set). Only
 *   for a live-editable article/single-file; the edit loop wires these controls (this only lays them out).
 * @returns {string} the <details> markup (one shell-action).
 */
export function buildSettingsPanel({ document: docTier = false } = {}) {
  const knob = (k) =>
    `<label class="enscribe-settings-row"><span>${k.label}</span>` +
    `<input type="range" data-reader="${k.key}" min="${k.min}" max="${k.max}" step="${k.step}" value="${k.def}"` +
    ` aria-label="${esc(k.label)}"></label>`;

  const readerTier =
    `<div class="enscribe-settings-tier" role="group" aria-label="Reader settings">` +
    `<p class="enscribe-settings-tier-label">Reading — just for you</p>` +
    `<label class="enscribe-settings-row"><span>Appearance</span>` +
    `<select data-reader="theme-variant" aria-label="Appearance">` +
    `<option value="auto">Auto (system)</option><option value="light">Light</option><option value="dark">Dark</option>` +
    `</select></label>` +
    READER_KNOBS.map(knob).join('') +
    `<button type="button" class="enscribe-settings-reset" data-reader="reset">Reset to theme</button>` +
    `</div>`;

  // One document-tier row: label + info affordance + select. The select's value set: booleans offer
  // Default/On/Off (writing true/false — the documented string forms); valued keys offer Default + the
  // gear options (labels from optionLabels, else the value verbatim — the value IS what lands in the
  // source, so showing it verbatim is see-what-you-set). `noUnset` (theme-variant) drops the Default
  // sentinel: 'auto' is that control's neutral and is written explicitly (the shipped #430 behavior).
  const infoBody = (e) => {
    let t = e.description;
    if (e.type === 'valued' && e.values) t += ` Values: ${e.values}.`;
    t += ` Default: ${e.default}.`;
    return t;
  };
  const rowOptions = (e) => {
    const label = (v) => e.gear.optionLabels?.[v] ?? v;
    const vals = e.type === 'boolean' ? ['true', 'false'] : (e.gear.options ?? []);
    const named = e.type === 'boolean' ? { true: 'On', false: 'Off' } : null;
    const opts = vals.map((v) => `<option value="${esc(v)}">${escapeHtml(named ? named[v] : label(v))}</option>`);
    if (!e.gear.noUnset) opts.unshift(`<option value="">Default</option>`);
    return opts.join('');
  };
  const row = (e) => {
    const id = `enscribe-doc-${e.key}`;
    return (
      `<div class="enscribe-settings-row">` +
      `<span class="enscribe-settings-key"><label for="${id}">${escapeHtml(e.gear.label)}</label>` +
      `<details class="enscribe-settings-info">` +
      `<summary aria-label="About ${esc(e.gear.label)}" title="What this option does">i</summary>` +
      `<p class="enscribe-settings-info-body">${escapeHtml(infoBody(e))}</p>` +
      `</details></span>` +
      `<select id="${id}" data-doc="${esc(e.key)}" aria-label="${esc(e.gear.label)}">${rowOptions(e)}</select>` +
      `</div>`
    );
  };
  const familySections = CONFIG_FAMILIES.map((fam) => {
    const entries = gearControlSpecs().filter((e) => e.family === fam);
    if (entries.length === 0) return '';
    const open = fam === 'Display / DSL / strict' ? ' open' : '';
    return (
      `<details class="enscribe-settings-family"${open}><summary>${escapeHtml(fam)}</summary>` +
      `<div class="enscribe-settings-family-body" role="group" aria-label="${esc(fam)}">` +
      entries.map(row).join('') +
      `</div></details>`
    );
  }).join('');
  const documentTier = docTier
    ? `<div class="enscribe-settings-tier enscribe-settings-tier--doc" role="group" aria-label="Document settings">` +
      `<p class="enscribe-settings-tier-label">Document — saved in the source</p>` +
      familySections +
      `<p class="enscribe-settings-note">Rewrites this document’s &lt;config&gt;.</p>` +
      `</div>`
    : '';

  return (
    `<details class="enscribe-shell-settings">` +
    `<summary class="enscribe-shell-action enscribe-shell-action--gear" aria-label="Settings" title="Reading &amp; theme settings">${GEAR_SVG}</summary>` +
    `<div class="enscribe-settings-panel" role="group" aria-label="Settings">${readerTier}${documentTier}</div>` +
    `</details>`
  );
}

// The panel CSS — shipped inside SHELL_ACTIONS_CSS (website-nav-asset.js) so it rides every surface the
// corner does. Token-driven (var(--enscribe-*)) so it inherits the derived dark palette for free.
export const SETTINGS_PANEL_CSS = `
.enscribe-shell-settings { position: relative; display: inline-flex; }
.enscribe-shell-action--gear { list-style: none; }
.enscribe-shell-action--gear::-webkit-details-marker { display: none; }
.enscribe-shell-settings[open] > .enscribe-shell-action--gear { color: var(--enscribe-text-primary, #1f2328); }
.enscribe-settings-panel {
  display: none; position: absolute; top: 100%; right: 0; margin-top: 0.4rem; z-index: 130;
  min-width: 15rem; max-width: min(20rem, calc(100vw - 1.5rem)); padding: 0.7rem 0.85rem;
  border: 1px solid var(--enscribe-border, #d8dee4); border-radius: 8px;
  background: var(--enscribe-bg, #fff); box-shadow: 0 4px 16px rgba(0,0,0,0.14);
  font-family: var(--enscribe-font-sans); font-size: 0.85rem; color: var(--enscribe-text-primary, #1f2328);
  max-height: min(70vh, 32rem); overflow-y: auto;
}
.enscribe-shell-settings[open] > .enscribe-settings-panel { display: block; }
.enscribe-settings-tier { display: flex; flex-direction: column; gap: 0.5rem; }
/* Author-origin reset so the HTML \`hidden\` attribute actually hides a tier — the UA \`[hidden]{display:none}\`
   rule is otherwise overridden by the author \`display:flex\` above (resetDocumentTier hides the doc tier on a
   book/read/not-found edit surface; #434). Class+attribute specificity beats the bare-class rule. */
.enscribe-settings-tier[hidden] { display: none; }
.enscribe-settings-tier + .enscribe-settings-tier { margin-top: 0.7rem; padding-top: 0.7rem; border-top: 1px solid var(--enscribe-border-subtle, var(--enscribe-border, #e6e6e6)); }
.enscribe-settings-tier-label { margin: 0 0 0.15rem; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.02em; text-transform: uppercase; color: var(--enscribe-text-muted, #57606a); }
.enscribe-settings-row { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
.enscribe-settings-row > span { flex: 0 0 auto; }
.enscribe-settings-row > input[type="range"] { flex: 1 1 auto; min-width: 0; accent-color: var(--enscribe-link, #0969da); }
.enscribe-settings-row > select { flex: 0 1 auto; min-width: 0; max-width: 60%; font: inherit; font-family: var(--enscribe-font-sans); padding: 0.15rem 0.3rem; border: 1px solid var(--enscribe-border, #d8dee4); border-radius: 4px; background: var(--enscribe-bg, #fff); color: inherit; }
/* #445: the document tier's collapsible family sections (the single source's family names). Native
   <details> — the chrome's one disclosure pattern — so sections open/close with no JS. */
.enscribe-settings-family > summary { cursor: pointer; padding: 0.1rem 0; font-size: 0.76rem; font-weight: 600; color: var(--enscribe-text-primary, #1f2328); }
.enscribe-settings-family-body { display: flex; flex-direction: column; gap: 0.5rem; padding: 0.35rem 0 0.2rem 0.15rem; }
/* #445: the per-control info affordance — a tiny native-<details> "i" whose body is the option's
   description/values/default from config-options-doc.js (the docs page's own generator source). The
   body is a positioned popover; near the panel's bottom it extends the panel's scroll area rather
   than clipping (the panel is the scroll container). */
.enscribe-settings-key { display: inline-flex; align-items: center; gap: 0.3rem; min-width: 0; }
.enscribe-settings-info { position: relative; display: inline-flex; }
.enscribe-settings-info > summary { list-style: none; cursor: help; width: 0.9rem; height: 0.9rem; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--enscribe-border, #d8dee4); border-radius: 50%; font-size: 0.6rem; font-style: italic; font-family: var(--enscribe-font-serif, Georgia, serif); color: var(--enscribe-text-muted, #57606a); }
.enscribe-settings-info > summary::-webkit-details-marker { display: none; }
.enscribe-settings-info-body { position: absolute; top: calc(100% + 0.3rem); left: -0.5rem; z-index: 2; width: min(13rem, 70vw); margin: 0; padding: 0.45rem 0.55rem; border: 1px solid var(--enscribe-border, #d8dee4); border-radius: 6px; background: var(--enscribe-bg, #fff); box-shadow: 0 3px 10px rgba(0,0,0,0.12); font-size: 0.72rem; line-height: 1.45; color: var(--enscribe-text-primary, #1f2328); }
.enscribe-settings-reset { align-self: flex-start; margin-top: 0.15rem; appearance: none; background: none; border: 0; padding: 0.1rem 0; font: inherit; font-family: var(--enscribe-font-sans); font-size: 0.8rem; color: var(--enscribe-link, #0969da); cursor: pointer; text-decoration: underline; }
.enscribe-settings-note { margin: 0.1rem 0 0; font-size: 0.72rem; font-style: italic; color: var(--enscribe-text-muted, #57606a); }
/* Floating corner (standalone live shells): the panel would overflow the fixed pill's right edge on a
   narrow viewport; clamp it to the viewport so it never spills off-screen (the sweep test guards this). */
.enscribe-shell-actions--floating .enscribe-settings-panel { right: 0; }
`;

/**
 * The universal reader-tier binder + the panel's dismissal (Escape / outside-click / focus-return).
 * Self-contained (only browser globals + nested helpers) so `(${bindSettingsPanel})()` runs as a static
 * inline <script>. Idempotent via a document flag: a second call (a live re-mount, or a static page that
 * injects the string twice) is a no-op. The document tier is wired elsewhere (browser.js edit loop).
 */
export function bindSettingsPanel() {
  if (typeof document === 'undefined' || document.__enscribeSettingsBound) return;
  document.__enscribeSettingsBound = true;
  var root = document.documentElement;
  var PREFIX = 'enscribe:reader:';
  // The three token overrides (kept in step with buildSettingsPanel's READER_KNOBS).
  var VARS = {
    fontSize: { v: '--enscribe-text-base', unit: 'rem' },
    lineHeight: { v: '--enscribe-line-height', unit: '' },
    width: { v: '--enscribe-content-width', unit: 'px' },
  };
  // The document's DEFAULT variant (from <config>, stamped server-side or at mount), captured BEFORE any
  // reader override so "reset" and reader-"auto"→reset can restore it.
  var docDefaultVariant = root.getAttribute('data-theme-variant') || 'auto';

  function ls(k) { try { return localStorage.getItem(PREFIX + k); } catch (e) { return null; } }
  function save(k, val) { try { if (val == null) localStorage.removeItem(PREFIX + k); else localStorage.setItem(PREFIX + k, String(val)); } catch (e) { /* storage off */ } }
  function applyVariant(v) {
    if (v === 'light' || v === 'dark') root.setAttribute('data-theme-variant', v);
    else root.removeAttribute('data-theme-variant'); // auto → follow prefers-color-scheme
  }
  function applyKnob(k, val) {
    var spec = VARS[k];
    if (val == null || val === '') root.style.removeProperty(spec.v);
    else root.style.setProperty(spec.v, val + spec.unit);
  }

  // APPLY persisted reader settings on load — the reader overrides the document default.
  var savedVariant = ls('variant');
  if (savedVariant) applyVariant(savedVariant);
  var savedKnobs = {};
  for (var vk in VARS) { var s = ls(vk); if (s) { savedKnobs[vk] = s; applyKnob(vk, s); } }

  // WIRE each panel's reader controls (one corner today; guarded idempotent per panel).
  var panels = document.querySelectorAll('.enscribe-settings-panel');
  Array.prototype.forEach.call(panels, function (panel) {
    if (panel.__enscribeReaderWired) return;
    panel.__enscribeReaderWired = true;
    var vsel = panel.querySelector('[data-reader="theme-variant"]');
    if (vsel) {
      vsel.value = savedVariant || docDefaultVariant;
      vsel.addEventListener('change', function () { save('variant', vsel.value); applyVariant(vsel.value); });
    }
    Array.prototype.forEach.call(panel.querySelectorAll('input[data-reader]'), function (inp) {
      var k = inp.getAttribute('data-reader');
      if (!VARS[k]) return;
      if (savedKnobs[k] != null) inp.value = savedKnobs[k];
      inp.addEventListener('input', function () { save(k, inp.value); applyKnob(k, inp.value); });
    });
    var reset = panel.querySelector('[data-reader="reset"]');
    if (reset) {
      reset.addEventListener('click', function () {
        for (var k in VARS) { save(k, null); applyKnob(k, null); }
        save('variant', null);
        applyVariant(docDefaultVariant);
        if (vsel) vsel.value = docDefaultVariant;
        Array.prototype.forEach.call(panel.querySelectorAll('input[data-reader]'), function (inp) {
          inp.value = inp.getAttribute('value'); // the default the markup shipped
        });
      });
    }
  });

  // DISMISS — Escape + outside-click close the open settings panel and return focus to the gear (a11y:
  // focus must not strand on a control that just collapsed). Mirrors bindWebsiteNavDismiss; document-
  // delegated so it survives the live chrome re-render and needs no re-binding. The #445 per-control
  // info popovers get the same treatment first: an outside click closes any open info, and Escape
  // closes open infos BEFORE it would close the panel (one press, one layer — the overlay convention).
  function openPanels() { return document.querySelectorAll('details.enscribe-shell-settings[open]'); }
  function openInfos() { return document.querySelectorAll('details.enscribe-settings-info[open]'); }
  document.addEventListener('click', function (ev) {
    Array.prototype.forEach.call(openInfos(), function (d) { if (!d.contains(ev.target)) d.removeAttribute('open'); });
    Array.prototype.forEach.call(openPanels(), function (d) { if (!d.contains(ev.target)) d.removeAttribute('open'); });
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape' && ev.key !== 'Esc') return;
    var infos = openInfos();
    if (infos.length) {
      Array.prototype.forEach.call(infos, function (d) { d.removeAttribute('open'); });
      return;
    }
    Array.prototype.forEach.call(openPanels(), function (d) {
      d.removeAttribute('open');
      var summary = d.querySelector('summary');
      if (summary && typeof summary.focus === 'function') summary.focus();
    });
  });
}

// The IIFE-string form for STATIC pages (injected as an inline <script>), derived from the one function
// above so the bind logic has a single source — exactly as WEBSITE_DROPDOWN_JS derives from
// bindWebsiteNavDismiss. The live paths import and call bindSettingsPanel() directly.
export const SETTINGS_PANEL_JS = `(${bindSettingsPanel.toString()})();`;
