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
//   browser.js, which holds the source + the editor handle): a theme picker + a default-variant control
//   that REWRITE the document's <config> block (visible in the source pane). Rendered when `document:true`
//   — a standalone live/single-file article in edit mode, AND an article page in the website/playground
//   editor (#434). Absent on static pages, read-only live docs (no editable source to act on — the #398
//   read-only rule), and a BOOK in edit mode (its per-chapter loop edits chapter files, not the master
//   <config> where the theme lives — reader tier only there).
//
// Dual delivery (like bindWebsiteNavDismiss / WEBSITE_DROPDOWN_JS): the reader-tier binder is a
// self-contained function; static pages run its IIFE-string form as an inline <script>, the live paths
// import and call it directly (their chrome is innerHTML-set, where a <script> stays inert).

import { escapeHtmlAttr } from '../../core/escape-html.js';

const esc = (s) => escapeHtmlAttr(s ?? '');

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
 * @param {object} [o]
 * @param {boolean} [o.document=false] - render the document tier (theme picker + variant). Only for a
 *   live-editable article/single-file; the edit loop wires these controls (this only lays them out).
 * @param {string[]} [o.themes=[]] - the bundled theme names for the picker (from the theme single source),
 *   'default' prepended by the builder. Empty is fine (picker shows just Default).
 * @returns {string} the <details> markup (one shell-action).
 */
export function buildSettingsPanel({ document: docTier = false, themes = [] } = {}) {
  const knob = (k) =>
    `<label class="enscribe-settings-row"><span>${k.label}</span>` +
    `<input type="range" data-reader="${k.key}" min="${k.min}" max="${k.max}" step="${k.step}" value="${k.def}"` +
    ` aria-label="${esc(k.label)}"></label>`;

  const variantSelect = (attr, label) =>
    `<label class="enscribe-settings-row"><span>${label}</span>` +
    `<select data-${attr}="theme-variant" aria-label="${esc(label)}">` +
    `<option value="auto">Auto (system)</option><option value="light">Light</option><option value="dark">Dark</option>` +
    `</select></label>`;

  const readerTier =
    `<div class="enscribe-settings-tier" role="group" aria-label="Reader settings">` +
    `<p class="enscribe-settings-tier-label">Reading — just for you</p>` +
    variantSelect('reader', 'Appearance') +
    READER_KNOBS.map(knob).join('') +
    `<button type="button" class="enscribe-settings-reset" data-reader="reset">Reset to theme</button>` +
    `</div>`;

  const themeOptions = ['default', ...themes]
    .map((t) => `<option value="${esc(t)}">${esc(t[0].toUpperCase() + t.slice(1))}</option>`)
    .join('');
  const documentTier = docTier
    ? `<div class="enscribe-settings-tier enscribe-settings-tier--doc" role="group" aria-label="Document settings">` +
      `<p class="enscribe-settings-tier-label">Document — saved in the source</p>` +
      `<label class="enscribe-settings-row"><span>Theme</span>` +
      `<select data-doc="theme" aria-label="Document theme">${themeOptions}</select></label>` +
      variantSelect('doc', 'Default appearance') +
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
.enscribe-settings-row > select { flex: 0 0 auto; font: inherit; font-family: var(--enscribe-font-sans); padding: 0.15rem 0.3rem; border: 1px solid var(--enscribe-border, #d8dee4); border-radius: 4px; background: var(--enscribe-bg, #fff); color: inherit; }
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
  // delegated so it survives the live chrome re-render and needs no re-binding.
  function openPanels() { return document.querySelectorAll('details.enscribe-shell-settings[open]'); }
  document.addEventListener('click', function (ev) {
    Array.prototype.forEach.call(openPanels(), function (d) { if (!d.contains(ev.target)) d.removeAttribute('open'); });
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape' && ev.key !== 'Esc') return;
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
