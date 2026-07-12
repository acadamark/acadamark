// Theme-token contract table generator + freshness guard (#398 slice 1).
//
// The published theming contract (notes/specs/themes.md) promises a stable list of
// `--enscribe-*` tokens a theme may retune. That list — each token's NAME, its DEFAULT
// value, and WHICH shipped themes retune it — is drift-prone: it changes whenever
// default.css or a theme file changes. So it is GENERATED from the stylesheets rather
// than hand-transcribed, and a freshness guard (regenerate-and-compare, the
// check-data-fresh pattern) keeps the committed table honest.
//
//   node scripts/gen-theme-tokens.mjs           # regenerate the table region in themes.md
//   node scripts/gen-theme-tokens.mjs --check    # verify it is fresh; non-zero + diff on drift
//
// The one-line MEANING per token is curated here (meanings are stable prose; the generator
// THROWS if default.css grows a token with no meaning, so a new token can't ship undocumented).
// Everything else — the token set, defaults, and per-theme retune marks — is read from the CSS.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// #398 slice 2: the ROLE of every token — the dark-derivation category (surface/text/
// accent/border/tint, alias/fixed) — is contract information, single-sourced in the
// derivation lib so the table column and the derivation itself cannot drift apart.
import { ROLES } from './lib/theme-token-roles.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_CSS = join(ROOT, 'packages/enscribe/src/interpreter/assets/default.css');
const THEMES_DIR = join(ROOT, 'packages/enscribe/src/interpreter/assets/themes');
// The contract page is an author-facing docs-site article, NOT a notes/specs file: the token
// table is DERIVED FROM the engine's default.css, so it belongs on the engine/docs side of the
// language/engine boundary (a notes/specs artifact must be regenerable engine-independently, and
// generating it from default.css would invert that — Rule 2b). docs-source/ is the unassigned
// docs surface, so this generator reads engine CSS + writes docs — no prose-surface read.
const CONTRACT = join(ROOT, 'docs-source/theming/index.emd');
const BEGIN = '<!-- BEGIN generated: token table (scripts/gen-theme-tokens.mjs) -->';
const END = '<!-- END generated: token table -->';

// One-line meaning per token. Keyed by the token name without the `--enscribe-` prefix.
// A default.css token with no entry here is a hard error (see below) — meanings ship with tokens.
const MEANING = {
  'text-primary': 'Body text colour.',
  'text-secondary': 'Secondary text — captions, subtitles, secondary UI.',
  'text-muted': 'Muted text — the least-emphasis tier.',
  'link': 'Link colour.',
  'link-hover': 'Link colour on hover.',
  'link-visited': 'Visited-link colour.',
  'bg': 'Page background.',
  'bg-subtle': 'Subtle raised background — e.g. the active chapter tint.',
  'bg-code': 'Code background.',
  'border': 'Default rule / border colour.',
  'border-strong': 'Stronger border colour.',
  'accent': 'General accent colour.',
  'toc-active-bg': 'Active chapter\'s tinted block in the chapter rail.',
  'toc-active-accent': 'Active chapter\'s left accent bar in the chapter rail.',
  'border-accent': 'Frameable `border=accent` look — border colour.',
  'border-thick': 'Frameable `border=thick` look — border width.',
  'border-subtle': 'Frameable `border=subtle` look — border colour.',
  'error': 'Error / flag colour — unresolved `??ref??` / `??cite??` markers.',
  'callout-note-accent': 'Callout `note` accent.',
  'callout-note-bg': 'Callout `note` background tint.',
  'callout-info-accent': 'Callout `info` accent.',
  'callout-info-bg': 'Callout `info` background tint.',
  'callout-tip-accent': 'Callout `tip` accent.',
  'callout-tip-bg': 'Callout `tip` background tint.',
  'callout-warning-accent': 'Callout `warning` accent.',
  'callout-warning-bg': 'Callout `warning` background tint.',
  'callout-caution-accent': 'Callout `caution` accent.',
  'callout-caution-bg': 'Callout `caution` background tint.',
  'font-sans': 'Sans-serif font stack (bundled Inter + system fallback).',
  'font-mono': 'Monospace font stack (bundled Source Code Pro + fallback).',
  'font-body': 'Body text font.',
  'font-heading': 'Heading / label font.',
  'weight-heading': 'Heading font weight.',
  'text-base': 'Base body font size.',
  'text-sm': 'Small text size — captions, notes.',
  'text-xs': 'Extra-small text size — note markers, labels.',
  'text-code': 'Code font size.',
  'h1-size': 'Heading size, level 1 (`article-title` / `book-title`).',
  'h2-size': 'Heading size, level 2 (`section-title`).',
  'h3-size': 'Heading size, level 3 (`sub-section-title`).',
  'h4-size': 'Heading size, level 4 (`sub-sub-section-title`).',
  'line-height': 'Body line height.',
  'line-height-heading': 'Heading line height.',
  'line-height-tight': 'Tight line height — captions, notes.',
  'space-1': 'Spacing scale — step 1 (smallest).',
  'space-2': 'Spacing scale — step 2.',
  'space-3': 'Spacing scale — step 3.',
  'space-4': 'Spacing scale — step 4 (one line).',
  'space-6': 'Spacing scale — step 6.',
  'space-8': 'Spacing scale — step 8.',
  'space-12': 'Spacing scale — step 12 (largest — big structural gaps).',
  'content-width': 'Readable content column width.',
  'content-padding': 'Content horizontal padding.',
};

/** The `--enscribe-*` tokens declared in a CSS string's first `:root { … }` block, in
 *  document order, as [name, value] with comments stripped and value whitespace collapsed. */
function rootTokens(css) {
  const block = css.match(/:root\s*\{([\s\S]*?)\}/)?.[1] ?? '';
  const nocomments = block.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  const re = /--enscribe-([a-z0-9-]+)\s*:\s*([^;]+);/g;
  for (let m; (m = re.exec(nocomments)); ) out.push([m[1], m[2].replace(/\s+/g, ' ').trim()]);
  return out;
}

/** The set of `--enscribe-*` token names a theme file retunes (its `:root` overrides). */
function themeTokenSet(css) {
  return new Set(rootTokens(css).map(([name]) => name));
}

function buildTable() {
  const tokens = rootTokens(readFileSync(DEFAULT_CSS, 'utf8'));
  // Shipped themes other than the default, in alphabetical order (the enumerable family).
  const themeNames = readdirSync(THEMES_DIR)
    .filter((f) => f.endsWith('.css'))
    .map((f) => f.replace(/\.css$/, ''))
    .sort();
  const themeSets = new Map(
    themeNames.map((n) => [n, themeTokenSet(readFileSync(join(THEMES_DIR, `${n}.css`), 'utf8'))]),
  );

  const missing = tokens.filter(([name]) => !(name in MEANING)).map(([n]) => n);
  if (missing.length) {
    throw new Error(
      `gen-theme-tokens: default.css declares token(s) with no MEANING entry: ${missing.join(', ')}. ` +
      `Add a one-line meaning in scripts/gen-theme-tokens.mjs (meanings ship with tokens).`,
    );
  }
  const unroled = tokens.filter(([name]) => !(name in ROLES)).map(([n]) => n);
  if (unroled.length) {
    throw new Error(
      `gen-theme-tokens: default.css declares token(s) with no ROLE entry: ${unroled.join(', ')}. ` +
      `Add the role in scripts/lib/theme-token-roles.mjs (roles ship with tokens — they drive dark derivation).`,
    );
  }

  const header = `| Token | Role | Meaning | Default | Retuned by |\n|---|---|---|---|---|`;
  const rows = tokens.map(([name, value]) => {
    const retuners = themeNames.filter((n) => themeSets.get(n).has(name));
    const retunedBy = retuners.length ? retuners.map((n) => `\`${n}\``).join(', ') : '—';
    // Escape a `|` inside a value (font stacks have none today, but be safe) and wrap in code.
    const val = `\`${value.replace(/\|/g, '\\|')}\``;
    return `| \`--enscribe-${name}\` | ${ROLES[name]} | ${MEANING[name]} | ${val} | ${retunedBy} |`;
  });
  const note = `\n*${tokens.length} tokens. Generated from ` +
    `\`packages/enscribe/src/interpreter/assets/default.css\` and the shipped ` +
    `\`themes/*.css\` by \`scripts/gen-theme-tokens.mjs\`; guarded by \`npm run check:theme-tokens\`.*`;
  return `${header}\n${rows.join('\n')}\n${note}\n`;
}

function render(existing, table) {
  const b = existing.indexOf(BEGIN);
  const e = existing.indexOf(END);
  if (b === -1 || e === -1 || e < b) {
    throw new Error(`gen-theme-tokens: sentinels not found in ${CONTRACT} (need ${BEGIN} … ${END}).`);
  }
  return existing.slice(0, b + BEGIN.length) + '\n' + table + existing.slice(e);
}

const check = process.argv.includes('--check');
const existing = readFileSync(CONTRACT, 'utf8');
const next = render(existing, buildTable());

if (check) {
  if (next !== existing) {
    console.error('[theme-tokens] notes/specs/themes.md token table is STALE.');
    console.error('[theme-tokens] Run: node scripts/gen-theme-tokens.mjs');
    process.exit(1);
  }
  // fresh — quiet success
} else {
  if (next !== existing) {
    writeFileSync(CONTRACT, next, 'utf8');
    console.log('[theme-tokens] regenerated the token table in docs-source/theming/index.emd');
  } else {
    console.log('[theme-tokens] token table already fresh');
  }
}
