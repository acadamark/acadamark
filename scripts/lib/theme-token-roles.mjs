// Theme-token ROLES + the dark-variant derivation rules (#398 themes 2/3).
//
// The dark decision (Ariel, 2026-07-14, recorded on #398): a theme ships ONE light token
// set; the engine DERIVES the dark variant. Derivation is deterministic and operates on
// the named tokens BY ROLE — it knows --enscribe-link is a link and --enscribe-bg is a
// background — never by blind inversion. This module is the single source for BOTH:
//
//   - the ROLE of every token (the contract table's Role column — gen-theme-tokens.mjs
//     reads it; a default.css token with no role is a hard error, like a missing meaning);
//   - the per-role derivation RULES (gen-dark-variants.mjs applies them), stated in the
//     published contract (docs-source/theming/index.emd §Dark mode) so the derivation is
//     predictable, not magic.
//
// Color math: OKLCH (via OKLab, Björn Ottosson's reference constants) — perceptual
// lightness so "darken/lighten" behaves uniformly across hues, hue preserved so a warm
// cream page (tufte) derives to a warm near-black, not a neutral one. Out-of-gamut
// results are chroma-clamped back into sRGB. Pure functions, no dependencies.

// ─── The roles ─────────────────────────────────────────────────────────────────
//
// surface — page + raised backgrounds. DARKEN into the dark-surface band; hue kept,
//           chroma capped to a whisper (warmth survives, tint does not glare).
// text    — body text tiers. LIGHTEN, preserving the emphasis ORDER (primary brightest).
// accent  — links, the general accent, error, callout accents. Hue kept, LIGHTENED into
//           the contrast-on-dark band, chroma slightly tamed (no neon).
// border  — rules/dividers. MUTED: low-chroma grays above the page, visibility order kept.
// tint    — callout background washes. A just-above-surface wash of the same hue.
// alias   — tokens whose default is var(<another token>): never derived; they follow
//           their referent through the cascade.
// fixed   — non-color tokens (fonts, weights, sizes, leading, spacing, layout): dark
//           never changes typography or geometry; they pass through untouched.

export const ROLES = {
  'bg': 'surface',
  'bg-subtle': 'surface',
  'bg-code': 'surface',

  'text-primary': 'text',
  'text-secondary': 'text',
  'text-muted': 'text',

  'link': 'accent',
  'link-hover': 'accent',
  'link-visited': 'accent',
  'accent': 'accent',
  'error': 'accent',
  'callout-note-accent': 'accent',
  'callout-info-accent': 'accent',
  'callout-tip-accent': 'accent',
  'callout-warning-accent': 'accent',
  'callout-caution-accent': 'accent',

  'border': 'border',
  'border-strong': 'border',
  'border-subtle': 'border',

  'callout-note-bg': 'tint',
  'callout-info-bg': 'tint',
  'callout-tip-bg': 'tint',
  'callout-warning-bg': 'tint',
  'callout-caution-bg': 'tint',

  'toc-active-bg': 'alias',
  'toc-active-accent': 'alias',
  'border-accent': 'alias',

  'font-sans': 'fixed',
  'font-mono': 'fixed',
  'font-body': 'fixed',
  'font-heading': 'fixed',
  'weight-heading': 'fixed',
  'text-base': 'fixed',
  'text-sm': 'fixed',
  'text-xs': 'fixed',
  'text-code': 'fixed',
  'h1-size': 'fixed',
  'h2-size': 'fixed',
  'h3-size': 'fixed',
  'h4-size': 'fixed',
  'line-height': 'fixed',
  'line-height-heading': 'fixed',
  'line-height-tight': 'fixed',
  'space-1': 'fixed',
  'space-2': 'fixed',
  'space-3': 'fixed',
  'space-4': 'fixed',
  'space-6': 'fixed',
  'space-8': 'fixed',
  'space-12': 'fixed',
  'content-width': 'fixed',
  'content-padding': 'fixed',
  'border-thick': 'fixed', // a width, not a color — the "thick" look's border-width
};

// Roles whose tokens the derivation TRANSFORMS (everything else passes through / follows).
export const DERIVED_ROLES = new Set(['surface', 'text', 'accent', 'border', 'tint']);

// ─── sRGB ⇄ OKLCH (Ottosson reference) ─────────────────────────────────────────

/** #rgb / #rrggbb → { r, g, b } in [0,1]; null for anything else (var(), keywords, widths). */
export function parseHex(value) {
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(String(value).trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function rgbToOklch({ r, g, b }) {
  const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const b2 = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return { L, C: Math.hypot(a, b2), h: Math.atan2(b2, a) };
}

function oklchToRgbRaw({ L, C, h }) {
  const a = C * Math.cos(h), b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return {
    r: fromLinear(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
  };
}

const inGamut = ({ r, g, b }) => [r, g, b].every((c) => c >= -1e-6 && c <= 1 + 1e-6);

/** OKLCH → hex, reducing chroma until the color fits sRGB (hue+lightness preserved). */
export function oklchToHex(lch) {
  let { L, C, h } = lch;
  let rgb = oklchToRgbRaw({ L, C, h });
  for (let i = 0; i < 24 && !inGamut(rgb); i++) {
    C *= 0.9;
    rgb = oklchToRgbRaw({ L, C, h });
  }
  if (!inGamut(rgb)) rgb = oklchToRgbRaw({ L, C: 0, h });
  const to255 = (c) => Math.round(Math.min(1, Math.max(0, c)) * 255);
  const hex = (n) => n.toString(16).padStart(2, '0');
  return `#${hex(to255(rgb.r))}${hex(to255(rgb.g))}${hex(to255(rgb.b))}`;
}

// ─── The per-role derivation rules ─────────────────────────────────────────────
//
// Stated in the contract verbatim (predictable, not magic). All lightness values are
// OKLCH L. `pageL` is the light-mode page's L (the theme's own --enscribe-bg), so
// surface elevation derives from the THEME's palette, not an assumed white.

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export const RULES = {
  // The page maps to a fixed dark-surface lightness; other surfaces keep their
  // ELEVATION, inverted: what sat below the page in light sits above it in dark
  // (×2.2 so elevation stays perceptible on dark), clamped to the raised band.
  surface(lch, { isPage, pageL }) {
    const L = isPage ? 0.215 : clamp(0.215 + 2.2 * (pageL - lch.L), 0.24, 0.34);
    return { L, C: Math.min(lch.C, 0.03), h: lch.h };
  },
  // Text reflects and brightens — L' = 1 − 0.75·L, clamped to the readable band —
  // preserving the emphasis order (primary brightest, muted dimmest). Chroma is
  // reduced so tinted text stays a hint, never neon.
  text(lch) {
    return { L: clamp(1 - 0.75 * lch.L, 0.55, 0.93), C: lch.C * 0.6, h: lch.h };
  },
  // Accents keep their hue and rise into the contrast-on-dark band —
  // L' = 1 − 0.6·L clamped to [0.65, 0.84] — with chroma slightly tamed.
  accent(lch) {
    return { L: clamp(1 - 0.6 * lch.L, 0.65, 0.84), C: lch.C * 0.85, h: lch.h };
  },
  // Borders mute: near-neutral grays whose VISIBILITY ORDER survives — the further
  // from white in light, the further from black in dark (×2), clamped to the muted
  // band. Visible, never crisp.
  border(lch) {
    return { L: clamp(0.215 + 2.0 * (1 - lch.L), 0.28, 0.46), C: Math.min(lch.C * 0.5, 0.02), h: lch.h };
  },
  // Callout tints become a just-above-surface wash of the same hue.
  tint(lch) {
    return { L: 0.27, C: Math.min(lch.C, 0.045), h: lch.h };
  },
};

/**
 * Derive the dark value of one token. Returns a hex string, or null when the token is
 * not derived (fixed/alias roles, or a value that isn't a plain hex color).
 *
 * @param {string} name  - token name without the --enscribe- prefix
 * @param {string} value - the token's EFFECTIVE light value (theme over default)
 * @param {object} ctx   - { pageL } — OKLCH L of the effective light --enscribe-bg
 */
export function deriveDark(name, value, ctx) {
  const role = ROLES[name];
  if (!role) throw new Error(`theme-token-roles: token "--enscribe-${name}" has no ROLE entry — roles ship with tokens (add it in scripts/lib/theme-token-roles.mjs).`);
  if (!DERIVED_ROLES.has(role)) return null;
  const rgb = parseHex(value);
  if (!rgb) return null; // non-hex color value in a derived role: caller decides how to flag
  const lch = rgbToOklch(rgb);
  return oklchToHex(RULES[role](lch, { isPage: name === 'bg', pageL: ctx.pageL }));
}

// ─── WCAG contrast (the quality gate) ──────────────────────────────────────────

/** WCAG 2.x relative luminance of a hex color. */
export function relativeLuminance(hexValue) {
  const { r, g, b } = parseHex(hexValue);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG contrast ratio between two hex colors (≥ 1). */
export function contrastRatio(hexA, hexB) {
  const la = relativeLuminance(hexA), lb = relativeLuminance(hexB);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The dark-palette quality gate (#398 slice: "auto-dark's failure mode is ugliness").
 * `palette` maps token name → EFFECTIVE dark hex (derived, or a theme's explicit
 * override). Returns [{ pair, ratio, floor, pass }] — the caller fails the build on
 * any miss, so an ugly derivation cannot be baked.
 */
export function contrastReport(palette) {
  const p = (name) => palette[name];
  const checks = [
    // Text on every surface: AA for the reading tiers.
    ['text-primary / bg', p('text-primary'), p('bg'), 4.5],
    ['text-primary / bg-subtle', p('text-primary'), p('bg-subtle'), 4.5],
    ['text-primary / bg-code', p('text-primary'), p('bg-code'), 4.5],
    ['text-secondary / bg', p('text-secondary'), p('bg'), 4.5],
    ['text-muted / bg', p('text-muted'), p('bg'), 3.0],
    // Links and the error flag are text-sized: AA.
    ['link / bg', p('link'), p('bg'), 4.5],
    ['link-hover / bg', p('link-hover'), p('bg'), 4.5],
    ['error / bg', p('error'), p('bg'), 4.5],
    // Callout accents against their own tint: non-text UI floor (WCAG 1.4.11).
    ...['note', 'info', 'tip', 'warning', 'caution'].map((t) => [
      `callout-${t}-accent / its tint`, p(`callout-${t}-accent`), p(`callout-${t}-bg`), 3.0,
    ]),
    // Body text must stay readable on the callout tints (callouts hold prose).
    ...['note', 'info', 'tip', 'warning', 'caution'].map((t) => [
      `text-primary / callout-${t}-bg`, p('text-primary'), p(`callout-${t}-bg`), 4.5,
    ]),
    // The invisible-border bug, encoded: rules must be perceptible against the page.
    ['border / bg', p('border'), p('bg'), 1.3],
    ['border-strong / bg', p('border-strong'), p('bg'), 1.5],
  ];
  return checks.map(([pair, a, b, floor]) => ({
    pair, floor,
    ratio: Math.round(contrastRatio(a, b) * 100) / 100,
    pass: contrastRatio(a, b) >= floor,
  }));
}
