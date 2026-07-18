// #467 — margin-note projection parity for the per-chapter surfaces.
//
// The guard that keeps #467 fixed. render-chapter-parity's master-book carries NO notes, so it
// could never catch this. This runs the SAME byte-identity invariant over a book whose margin
// notes route to the document-level residual <note-list> (a per-note `<note position=margin>` in a
// book whose default is NOT margin — the #333 residual case), plus a NOTE-LESS preface (Problem B:
// the whole-document margin layout wrapper must be reproduced per chapter, even where no note projects).
//
// Expected side = the full render (`proc.stringify(numbered)`), sliced into <book-part> fragments —
// an INDEPENDENT ground truth (not itself renderChapter). So this fails on the bug and passes on the
// fix with no assertion change; it is the escape valve the slice named.

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VFile } from 'vfile';
import { buildEnscribePipeline, harvestCrossRefRegistry } from '../src/interpreter/index.js';
import { assembleMasterDocument } from '../src/master-document/assemble.js';
import { renderChapter } from '../src/master-document/render-chapter.js';

const BOOK_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'margin-book');

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

export function run_tests() {
  const proc = buildEnscribePipeline({});
  const file = new VFile({ path: 'master-book.emd' });
  const numbered = proc.runSync(assembleMasterDocument({
    source: readFileSync(join(BOOK_DIR, 'master-book.emd'), 'utf8'),
    readFile: (p) => readFileSync(p, 'utf8'),
    resolve: (rel) => join(BOOK_DIR, rel),
    parse: (s) => proc.parse(s),
  }), file);
  const registry = harvestCrossRefRegistry(numbered, file);

  // The full render is the ground truth. It routes the per-note margin bodies to the residual
  // <note-list> in <book-back> but still injects each <sidenote> beside its in-chapter marker, and
  // wraps the whole book in .enscribe-layout--margin.
  const fullHtml = String(proc.stringify(numbered, file));
  const fullParts = fullHtml.match(/<book-part\b[\s\S]*?<\/book-part>/g) ?? [];
  const parts = collectBookParts(numbered);
  assert.strictEqual(parts.length, fullParts.length, 'every book-part appears once in the full render');
  assert.strictEqual(parts.length, 3, 'margin-book has preface + 2 chapters');

  // The full render is a margin book: it wrapped the whole document.
  assert.ok(/enscribe-layout--margin/.test(fullHtml), 'the full render wraps a margin book in .enscribe-layout--margin');
  assert.ok(/<sidenote\b/.test(fullHtml), 'the full render projects margin sidenotes');

  // ── byte-identity: renderChapter (with the numbered tree) reproduces each fragment EXACTLY ──
  const perChapter = parts.map((part) => renderChapter(part, registry, { proc, file, numbered }));
  for (let i = 0; i < parts.length; i++) {
    if (perChapter[i] !== fullParts[i]) {
      const d = firstDiff(perChapter[i], fullParts[i]);
      const ctx = (s) => JSON.stringify(s.slice(Math.max(0, d - 60), d + 60));
      assert.fail(
        `chapter ${i}: renderChapter fragment NOT byte-identical to the in-context fragment (first diff at ${d}):\n` +
        `  per-chapter: …${ctx(perChapter[i])}…\n  in-context:  …${ctx(fullParts[i])}…`,
      );
    }
  }
  console.log(`PASS: #467 — each of ${parts.length} margin-book chapters renders byte-identically to its in-context fragment (residual sidenotes + note-less wrapper)`);

  // ── the projection actually happened, in the RIGHT chapters ──
  // preface (part 0) is note-less → no sidenote; chapters 1 & 2 each project their own margin note.
  assert.ok(!/<sidenote\b/.test(perChapter[0]), 'the note-less preface projects no sidenote');
  assert.ok(/<sidenote\b/.test(perChapter[1]), 'chapter 1 projects its residual-routed margin sidenote per-chapter');
  assert.ok(/<sidenote\b/.test(perChapter[2]), 'chapter 2 projects its OWN residual-routed margin sidenote (filtered per chapter)');
  assert.ok(!perChapter[1].includes("chapter two"), 'chapter 1 does NOT carry chapter 2’s note (the residual list is filtered per chapter)');
  console.log('PASS: #467 — residual-routed margin sidenotes reach the right per-chapter fragment; note-less chapters stay clean');
}
