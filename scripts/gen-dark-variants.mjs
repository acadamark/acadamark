// Dark-variant generator + freshness guard (#398 themes 2/3).
//
// The decision (Ariel, 2026-07-14, on #398): a theme ships ONE light token set; the
// engine DERIVES the dark variant. The derivation is deterministic (per-role rules in
// scripts/lib/theme-token-roles.mjs, stated in the published contract), so it is BAKED
// at generation time into the stylesheets themselves — no runtime color math:
//
//   node scripts/gen-dark-variants.mjs            # (re)bake the dark blocks
//   node scripts/gen-dark-variants.mjs --check    # freshness + quality gate (CI / root test)
//   node scripts/gen-dark-variants.mjs --report   # print the per-theme contrast tables
//
// WHAT IS BAKED, WHERE. Each stylesheet (default.css and every themes/*.css that needs
// one) gains a sentinel-delimited block with the SAME payload under two scopes:
//
//   @media (prefers-color-scheme: dark) { :root:not([data-theme-variant="light"]) { … } }
//   :root[data-theme-variant="dark"] { … }
//
// — the media query is the zero-JS default signal (auto follows the OS); the attribute is
// the explicit override hook the settings panel drives (set data-theme-variant on <html>:
// "dark" forces dark, "light" forces light — it defeats the media block via :not() —
// absent = auto). `color-scheme: dark` rides along so UA-rendered pieces (scrollbars,
// form controls) follow.
//
// PER-TOKEN OVERRIDE (the escape hatch): a theme may hand-author ONE block —
//   :root[data-theme-variant="dark"] { --enscribe-…: …; }
// anywhere OUTSIDE the sentinels. The generator reads it and (a) SKIPS deriving those
// tokens (derivation fills only what the theme didn't) and (b) RE-EMITS the explicit
// values inside its own two-scope block, so a hand override works under the OS-auto
// media path too — the author writes one block, the generator makes it total.
//
// THEME BLOCKS ARE DIFFS: a theme's generated block carries only the tokens whose
// effective dark value differs from default.css's derived dark (theme CSS is injected
// after default.css, so its block wins the cascade). A theme with no color retunes and
// no overrides (compact) gets no dark block at all — default's derivation covers it.
//
// QUALITY GATE (auto-dark's failure mode is ugliness): the WCAG contrast report
// (text/surface/link/accent/border floors, lib contrastReport) runs on every theme's
// EFFECTIVE dark palette at generation AND at --check. A failing palette cannot be
// baked — the fix is mechanism (b): an explicit per-token override in that theme.
// Two structural checks ride along: no box-shadow may appear in the document
// stylesheets (the shadows-on-dark classic; none exist today — if one is added it needs
// a shadow token + a dark rule), and a derived-role token whose value is not plain hex
// is a hard error (the contract promises hex there so derivation stays total).

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROLES, DERIVED_ROLES, deriveDark, parseHex, rgbToOklch, contrastReport,
} from './lib/theme-token-roles.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_CSS = join(ROOT, 'packages/enscribe/src/interpreter/assets/default.css');
const THEMES_DIR = join(ROOT, 'packages/enscribe/src/interpreter/assets/themes');
const BEGIN = '/* ── BEGIN generated: dark variant (scripts/gen-dark-variants.mjs) — do not edit; derived per the contract\'s per-role rules from the light tokens above. Hand overrides go in your own :root[data-theme-variant="dark"] block; the generator folds them in. ── */';
const END = '/* ── END generated: dark variant ── */';

/** All `--enscribe-*` declarations inside `:root … { … }` blocks matched by `scopeRe`,
 *  comments stripped, later declarations winning. */
function tokensInScopes(css, scopeRe) {
  const out = new Map();
  for (const m of css.matchAll(scopeRe)) {
    const body = m[1].replace(/\/\*[\s\S]*?\*\//g, '');
    for (const d of body.matchAll(/--enscribe-([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      out.set(d[1], d[2].replace(/\s+/g, ' ').trim());
    }
  }
  return out;
}

/** The light palette: the file's FIRST plain `:root { … }` block. */
const lightTokens = (css) => tokensInScopes(css, /(?<!\S):root\s*\{([\s\S]*?)\}/g);

/** Hand-authored explicit dark overrides — `[data-theme-variant="dark"]` blocks OUTSIDE
 *  the generated sentinels. */
function explicitDark(css) {
  const stripped = stripGenerated(css);
  return tokensInScopes(stripped, /:root\[data-theme-variant="dark"\]\s*\{([\s\S]*?)\}/g);
}

function stripGenerated(css) {
  const b = css.indexOf(BEGIN);
  const e = css.indexOf(END);
  if (b === -1) return css;
  if (e === -1 || e < b) throw new Error('gen-dark-variants: unbalanced sentinels');
  return css.slice(0, b) + css.slice(e + END.length);
}

/** Render the two-scope dark block from a token→value map ('' when the map is empty). */
function renderBlock(entries) {
  if (entries.size === 0) return '';
  const decls = [...entries].map(([n, v]) => `  --enscribe-${n}: ${v};`).join('\n');
  const indented = decls.replace(/^/gm, '  ');
  return [
    BEGIN,
    '@media (prefers-color-scheme: dark) {',
    '  :root:not([data-theme-variant="light"]) {',
    '    color-scheme: dark;',
    indented,
    '  }',
    '}',
    ':root[data-theme-variant="dark"] {',
    '  color-scheme: dark;',
    decls,
    '}',
    END,
  ].join('\n');
}

/** Splice the generated block into a stylesheet (replacing an existing one; appended at
 *  the end otherwise; removed entirely when the block is ''). */
function splice(css, block) {
  const without = stripGenerated(css).replace(/\n+$/, '\n');
  return block === '' ? without : `${without}\n${block}\n`;
}

// ─── Compute ───────────────────────────────────────────────────────────────────

const defaultCssText = readFileSync(DEFAULT_CSS, 'utf8');
const defaultLight = lightTokens(defaultCssText);

// Role totality guard: every default.css token must carry a role (the same
// meanings-ship-with-tokens discipline the contract table enforces).
for (const name of defaultLight.keys()) {
  if (!(name in ROLES)) {
    throw new Error(`gen-dark-variants: token "--enscribe-${name}" has no ROLE in scripts/lib/theme-token-roles.mjs — roles ship with tokens.`);
  }
}

const themeFiles = readdirSync(THEMES_DIR).filter((f) => f.endsWith('.css')).sort();

/** Effective dark palette + generated entries for one stylesheet. */
function computeFor(fileLabel, cssText, { isDefault, defaultDark }) {
  const light = lightTokens(cssText);
  const effectiveLight = new Map(isDefault ? defaultLight : new Map([...defaultLight, ...light]));
  const explicit = explicitDark(cssText);
  const pageHex = effectiveLight.get('bg');
  const pageRgb = parseHex(pageHex);
  if (!pageRgb) throw new Error(`gen-dark-variants: ${fileLabel} — effective --enscribe-bg "${pageHex}" is not plain hex; the surface role requires hex (contract §Dark mode).`);
  const ctx = { pageL: rgbToOklch(pageRgb).L };

  // The effective DARK palette (for the quality gate): derived from the effective light,
  // with explicit overrides winning.
  const dark = new Map();
  for (const [name, value] of effectiveLight) {
    if (!DERIVED_ROLES.has(ROLES[name])) continue;
    if (explicit.has(name)) { dark.set(name, explicit.get(name)); continue; }
    const derived = deriveDark(name, value, ctx);
    if (derived == null) {
      throw new Error(`gen-dark-variants: ${fileLabel} — "--enscribe-${name}" (${ROLES[name]} role) has non-hex value "${value}"; derived roles must be plain hex, or give the token an explicit :root[data-theme-variant="dark"] override.`);
    }
    dark.set(name, derived);
  }

  // The GENERATED block: for default.css, the whole dark palette; for a theme, only the
  // entries that differ from default's dark (the theme file wins the cascade) — plus the
  // theme's explicit overrides re-emitted so they hold under the media (auto) path too.
  const emitted = new Map();
  for (const [name, value] of dark) {
    if (isDefault || explicit.has(name) || defaultDark.get(name) !== value) emitted.set(name, value);
  }
  return { dark, emitted, explicit };
}

// ─── Bake / check / report ───────────────────────────────────────────────────────

const mode = process.argv.includes('--check') ? 'check' : process.argv.includes('--report') ? 'report' : 'gen';
const failures = [];
const reports = [];
const writes = [];

const defaultResult = computeFor('default.css', defaultCssText, { isDefault: true, defaultDark: new Map() });
const targets = [
  { label: 'default', path: DEFAULT_CSS, text: defaultCssText, result: defaultResult },
  ...themeFiles.map((f) => {
    const path = join(THEMES_DIR, f);
    const text = readFileSync(path, 'utf8');
    return { label: basename(f, '.css'), path, text, result: computeFor(f, text, { isDefault: false, defaultDark: defaultResult.dark }) };
  }),
];

for (const t of targets) {
  // Quality gate on the effective dark palette.
  const palette = Object.fromEntries(t.result.dark);
  const report = contrastReport(palette);
  reports.push({ theme: t.label, report, overrides: [...t.result.explicit.keys()] });
  for (const row of report) {
    if (!row.pass) failures.push(`${t.label}: ${row.pair} = ${row.ratio} (floor ${row.floor})`);
  }
  // Freshness.
  const next = splice(t.text, renderBlock(t.result.emitted));
  if (next !== t.text) writes.push({ path: t.path, label: t.label, next });
}

// The shadows-on-dark classic, encoded: the document stylesheets carry no box-shadow
// today; if one is added it needs a shadow token + a role + a dark rule — fail loud.
for (const t of targets) {
  if (/box-shadow\s*:/.test(t.text.replace(/\/\*[\s\S]*?\*\//g, ''))) {
    failures.push(`${t.label}: box-shadow found — shadows need a token + a dark derivation rule (the shadows-on-dark bug)`);
  }
}

if (mode === 'report') {
  for (const { theme, report, overrides } of reports) {
    console.log(`\n═══ ${theme} ═══${overrides.length ? `  (explicit dark overrides: ${overrides.join(', ')})` : ''}`);
    for (const r of report) console.log(`  ${r.pass ? '✓' : '✗'} ${r.pair}: ${r.ratio} (floor ${r.floor})`);
  }
}

if (failures.length) {
  console.error('[dark-variants] QUALITY GATE FAILED — an ugly derivation cannot be baked:');
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error('[dark-variants] Fix: give the failing token an explicit :root[data-theme-variant="dark"] override in that theme (the contract\'s escape hatch), then regenerate.');
  process.exit(1);
}

if (mode === 'check') {
  if (writes.length) {
    console.error(`[dark-variants] STALE dark blocks in: ${writes.map((w) => w.label).join(', ')}.`);
    console.error('[dark-variants] Run: node scripts/gen-dark-variants.mjs');
    process.exit(1);
  }
  // fresh + gate green — quiet success (house guard style)
} else if (mode === 'gen') {
  if (writes.length === 0) {
    console.log('[dark-variants] dark blocks already fresh (quality gate green)');
  } else {
    for (const w of writes) {
      writeFileSync(w.path, w.next, 'utf8');
      console.log(`[dark-variants] baked the dark block into ${w.label}`);
    }
  }
}
