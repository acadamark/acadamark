// Chapter-granularity render parity (lazy live book rendering, L1 — #204).
//
// The engine foundation's load-bearing invariant: a chapter rendered IN ISOLATION
// via renderChapter() — concatenated across the book — is BYTE-IDENTICAL to that
// chapter's content within the full-book render. This is the parity the live lazy
// path (L2) will rely on: render only the viewed chapter, trust it equals the slice.
//
// It mirrors render-parity.test.js (the live≡static invariant) at chapter
// granularity. Expected GREEN on landing — it is a standing regression guard for an
// invariant that already holds by construction (the global runSync bakes refs /
// per-chapter numbering / per-chapter notes into the tree, so a <book-part> subtree
// is self-contained; renderChapter is a pure projection of it).
//
// Also exercises harvestCrossRefRegistry: the harvested anchor -> {number,title,type}
// is the L3 cross-chapter preview data, and a harvested number EQUALS the cross-ref
// text the full render bakes (e.g. fig:transect -> "1.1", and chapter 2's cross-
// chapter <ref> renders "figure 1.1").

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { VFile } from 'vfile';
import {
  buildEnscribePipeline,
  assembleMasterDocument,
  harvestCrossRefRegistry,
  renderChapter,
} from '../src/interpreter/index.js';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const BOOK_DIR = join(FIXTURES_DIR, 'master-book');

// All <book-part> nodes in document order (flat for master-book; recurses for safety).
function collectBookParts(node, out = []) {
  if (node?.type === 'enscribeTag' && node.tagname === 'book-part') out.push(node);
  for (const c of node?.children ?? []) collectBookParts(c, out);
  for (const c of (Array.isArray(node?.content) ? node.content : [])) collectBookParts(c, out);
  return out;
}

function firstDiff(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return a.length === b.length ? -1 : n;
}

export async function run() {
  // ── the cheap GLOBAL pass: assemble + runSync (numbers + resolves refs, no render).
  // An explicit VFile is REQUIRED so file.data.enscribeRegistry is reachable (the
  // no-VFile path drops the registry).
  const proc = buildEnscribePipeline({});
  const file = new VFile({ path: 'master-book.emd' });
  const tree = assembleMasterDocument({
    source: readFileSync(join(BOOK_DIR, 'master-book.emd'), 'utf8'),
    readFile: (p) => readFileSync(p, 'utf8'),
    resolve: (rel) => join(BOOK_DIR, rel),
    parse: (s) => proc.parse(s),
  });
  const numbered = proc.runSync(tree, file);

  // ── (1) registry harvest — anchor -> { number, title, type } ─────────────────
  const registry = harvestCrossRefRegistry(numbered, file);
  {
    assert.ok(registry instanceof Map && registry.size >= 2, 'harvest returns a non-empty Map');
    assert.strictEqual(file.data.enscribeCrossRefRegistry, registry, 'harvest stored on file.data');
    const transect = registry.get('fig:transect');
    const browse = registry.get('fig:browse');
    assert.deepStrictEqual(transect, { number: '1.1', title: 'A standard aerial-transect grid.', type: 'figure' },
      'fig:transect harvested with per-chapter number, caption title, and type');
    assert.deepStrictEqual(browse, { number: '2.1', title: 'A browse-damage scoring rubric.', type: 'figure' },
      'fig:browse harvested as chapter 2 figure 2.1');
    console.log('PASS: L1 — cross-ref registry harvested (anchor -> {number, title, type}) from the numbered tree');
  }

  // ── the full-book render: each chapter's in-context content fragment ──────────
  const fullHtml = String(proc.stringify(numbered, file));
  const fullParts = fullHtml.match(/<book-part\b[\s\S]*?<\/book-part>/g) ?? [];
  const parts = collectBookParts(numbered);
  assert.strictEqual(parts.length, fullParts.length, 'every book-part appears once in the full render');
  assert.ok(parts.length >= 4, 'master-book has its preface + 2 chapters + appendix');

  // ── (2)+(3) per-chapter render entry + the byte-identity PROOF ────────────────
  {
    const perChapter = parts.map((part) => renderChapter(part, registry, { proc, file }));
    for (let i = 0; i < parts.length; i++) {
      if (perChapter[i] !== fullParts[i]) {
        const d = firstDiff(perChapter[i], fullParts[i]);
        const ctx = (s) => JSON.stringify(s.slice(Math.max(0, d - 60), d + 60));
        assert.fail(
          `chapter ${i}: renderChapter fragment is NOT byte-identical to the in-context fragment ` +
            `(first diff at ${d}):\n  per-chapter: …${ctx(perChapter[i])}…\n  in-context:  …${ctx(fullParts[i])}…`,
        );
      }
    }
    console.log(`PASS: L1 — each of ${parts.length} chapters renders byte-identically to its in-context fragment`);

    assert.strictEqual(perChapter.join(''), fullParts.join(''),
      'concatenated per-chapter renders == concatenated full-render chapter content (byte-identical)');
    console.log('PASS: L1 — concatenated per-chapter render is byte-identical to the full-book chapter content');
  }

  // ── (4) consistency: the registry number IS the cross-ref text the render bakes ─
  {
    const ch2 = renderChapter(parts[2], registry, { proc, file }); // "Estimating Browse Pressure"
    assert.ok(/<a href="#fig:transect" class="ref">figure 1\.1<\/a>/.test(ch2),
      'chapter 2 cross-chapter <ref> renders "figure 1.1" (resolved from the registry in the global pass)');
    assert.strictEqual(registry.get('fig:transect').number, '1.1',
      'the harvested registry number equals the cross-ref display number — one source of truth');
    console.log('PASS: L1 — harvested registry number == the baked cross-reference text (consistent)');
  }

  console.log('All chapter-granularity render-parity (L1) checks passed.');
}
