// Generator for spec-data.generated.json (#5 transcription-seam fix).
//
// THE PARSE IS THE SOURCE OF TRUTH. This script reads the relevant notes/specs/
// files and emits the machine-form coverage facts. The committed JSON is a build
// artifact kept honest by the drift check in spec-data.test.js (regenerate +
// diff). notes/ is read ONLY here (generation) and in the drift check (test/build
// time, and only when notes/ is present) — never on the shipped test path, which
// imports the committed JSON. This replaces the former hand-transcription that
// could silently rot.
//
// Sources:
//   render-quality.md      → AREAS (RQ codes), PREDICATES (id/area/kind/asserts),
//                            DISPOSITION (§2 coverage map: element → {disposition, area})
//   tag-forms-reference.md → FORMS (element → [pipe, slash, long])
//   idioms.md              → IDIOMS (bare idiom → canonical enscribe tagname)
//
// Usage:  node test/coverage/gen-spec-data.mjs   (writes spec-data.generated.json)
//         import { generate } from './gen-spec-data.mjs'  (returns the object; drift check)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// test/coverage → enscribe → packages → repo root → notes/specs
const SPECS = join(__dirname, '..', '..', '..', '..', 'notes', 'specs');
const OUT = join(__dirname, 'spec-data.generated.json');

export function specsAvailable() {
  return existsSync(join(SPECS, 'render-quality.md'))
    && existsSync(join(SPECS, 'tag-forms-reference.md'))
    && existsSync(join(SPECS, 'idioms.md'));
}

// ── render-quality.md: AREAS + PREDICATES + DISPOSITION ──────────────────────
function parseRenderQuality(text) {
  const lines = text.split('\n');

  // section number (e.g. "3", "15.5") → RQ code, from level-2 headings.
  const sectionToArea = {};
  const areas = [];
  for (const line of lines) {
    const h = line.match(/^##\s+(\d+(?:\.\d+)?)\.?\s+(.*?)\s*[—-]\s*`(RQ-[A-Z]+)`/);
    if (h) {
      sectionToArea[h[1]] = h[3];
      sectionToArea[h[1].split('.')[0]] = h[3]; // integer part too (e.g. 4.4 → 4)
      areas.push([h[3], h[2].trim()]);
    }
  }

  // PREDICATES — bullets/standalone bolds: **`RQ-…`** — statement (multi-line).
  let area = null;
  let cur = null;
  const predicates = [];
  const flush = () => {
    if (cur) { cur.asserts = cur.asserts.replace(/\s+/g, ' ').trim(); predicates.push(cur); cur = null; }
  };
  for (const line of lines) {
    const h2 = line.match(/^##\s+\d+(?:\.\d+)?\.?.*`(RQ-[A-Z]+)`/);
    if (h2) { flush(); area = h2[1]; continue; }
    if (/^#{2,3}\s/.test(line)) { flush(); continue; } // sub-heading keeps current area
    // Anchor: **`RQ-…`** optionally followed by a parenthetical annotation
    // (*(observable, visual-only)* on O predicates; (#103) on the #103 ones) then — statement.
    const a = line.match(/\*\*`(RQ-[A-Z0-9-]+)`\*\*\s*(?:\*?\([^)]*\)\*?\s*)?[—-]\s*(.*)$/);
    if (a) {
      flush();
      const kind = (a[1].match(/(M|S|O)\d+$/) || [])[1] || '?';
      cur = { id: a[1], area, kind, asserts: a[2] };
      continue;
    }
    if (cur) {
      if (line.trim() === '') flush();
      else if (/^\s*-\s/.test(line) || /^\*\*/.test(line)) flush();
      else cur.asserts += ' ' + line.trim();
    }
  }
  flush();

  // DISPOSITION — the §2 coverage-map table.
  const dispOf = (label) => {
    if (/^Specified with deferred/i.test(label)) return 'deferred-presentation';
    if (/^Specified/i.test(label)) return 'specified';
    if (/^Generic-implicit/i.test(label)) return 'generic-implicit';
    if (/^No-output/i.test(label)) return 'no-output';
    return 'unknown';
  };
  const expandElements = (cell) => {
    const hasTitleExp = /\(\+\s*`-title`\/`-subtitle`\)/.test(cell);
    const c = cell.replace(/\(\+\s*`-title`\/`-subtitle`\)/g, '');
    const out = [];
    for (const m of c.matchAll(/`([^`]+)`/g)) {
      const tok = m[1];
      if (tok.includes('/')) {
        const parts = tok.split('/');
        const first = parts[0];
        const dash = first.lastIndexOf('-');
        const prefix = dash >= 0 ? first.slice(0, dash + 1) : '';
        out.push(first);
        for (const p of parts.slice(1)) out.push(prefix + p);
      } else {
        out.push(tok);
      }
    }
    if (hasTitleExp) {
      for (const t of out.filter((t) => /^(section|sub-section|sub-sub-section)$/.test(t))) {
        out.push(`${t}-title`, `${t}-subtitle`);
      }
    }
    return [...new Set(out)];
  };

  const dispositions = {};
  let inMap = false;
  for (const line of lines) {
    if (/^##\s+2\.\s+Coverage map/.test(line)) { inMap = true; continue; }
    if (inMap && /^##\s/.test(line)) break;
    if (!inMap) continue;
    const row = line.match(/^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$/);
    if (!row) continue;
    if (/^Disposition$/i.test(row[1]) || /^[-\s|]+$/.test(row[1])) continue; // header / separator
    const disposition = dispOf(row[1]);
    if (disposition === 'unknown') continue;
    const secRef = (row[3].match(/§(\d+(?:\.\d+)?)/) || [])[1];
    const area2 = sectionToArea[secRef] || sectionToArea[(secRef || '').split('.')[0]] || '?';
    for (const el of expandElements(row[2])) {
      // first disposition wins (specified rows precede the deferred/no-output rows
      // in §2), so an element listed twice keeps its primary disposition.
      if (!dispositions[el]) dispositions[el] = { area: area2, disposition };
    }
  }

  return { areas, predicates, dispositions };
}

// ── tag-forms-reference.md: FORMS ────────────────────────────────────────────
function parseForms(text) {
  const forms = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^\|\s*`<([^>]+)>`\s*\|\s*([✓·—])\s*\|\s*([✓·—])\s*\|\s*([✓·—])\s*\|/);
    if (m) forms[m[1]] = [m[2], m[3], m[4]];
  }
  return forms;
}

// ── idioms.md: IDIOMS (bare → canonical tagname) ─────────────────────────────
function parseIdioms(text) {
  const idioms = [];
  let inTable = false;
  for (const line of text.split('\n')) {
    if (/^\|\s*Bare idiom/i.test(line)) { inTable = true; continue; }
    if (inTable) {
      if (!line.startsWith('|')) { if (idioms.length) break; else continue; }
      if (/^\|[-\s|]+$/.test(line)) continue; // separator
      // third column: `enscribeTag` tagname `NAME`[, positional `md`]
      const tn = line.match(/tagname\s*`([^`]+)`/);
      const bare = (line.match(/^\|\s*(.+?)\s*\|/) || [])[1] || '';
      if (tn) idioms.push({ bare: bare.replace(/`/g, ''), tagname: tn[1] });
    }
  }
  return idioms;
}

export function generate() {
  const rq = parseRenderQuality(readFileSync(join(SPECS, 'render-quality.md'), 'utf8'));
  const forms = parseForms(readFileSync(join(SPECS, 'tag-forms-reference.md'), 'utf8'));
  const idioms = parseIdioms(readFileSync(join(SPECS, 'idioms.md'), 'utf8'));
  // Deterministic ordering for stable diffs.
  const dispositions = {};
  for (const k of Object.keys(rq.dispositions).sort()) dispositions[k] = rq.dispositions[k];
  const formsSorted = {};
  for (const k of Object.keys(forms).sort()) formsSorted[k] = forms[k];
  return {
    _generatedFrom: 'notes/specs/{render-quality,tag-forms-reference,idioms}.md via test/coverage/gen-spec-data.mjs',
    areas: rq.areas,
    predicates: rq.predicates,
    dispositions,
    forms: formsSorted,
    formNames: ['pipe', 'slash', 'long'],
    idioms,
  };
}

if (process.argv[1] && process.argv[1].endsWith('gen-spec-data.mjs')) {
  if (!specsAvailable()) {
    console.error('notes/specs not found — cannot generate.');
    process.exit(1);
  }
  writeFileSync(OUT, JSON.stringify(generate(), null, 2) + '\n', 'utf8');
  const d = generate();
  console.log(`generated: ${d.predicates.length} predicates, ${Object.keys(d.forms).length} form rows, ${Object.keys(d.dispositions).length} dispositions, ${d.idioms.length} idioms`);
}
