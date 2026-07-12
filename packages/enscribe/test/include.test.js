// Tests for #424 — <include src=…>: the transclusion substitution primitive
// (master-document.md §Transclusion, point 3) + cycle detection (§Recursion and
// cycles). The spec's own examples, verbatim where it gives them.
//
// Covers:
//   - the motivating example: prose, include, prose, include, prose — each splices
//     at its spot, interstitial text reads in place (document order preserved)
//   - nested include (child includes grandchild), paths composed FILE-relative
//   - structure crosses the splice boundary: an element opened inside an included
//     file stays open (the deepest-open-container rule) and a peer inside an
//     included file closes a caller-opened element
//   - cycle: the visible ??include cycle: a → b → a?? marker, the splice skipped,
//     assembly continues (before/after content intact); the chain seeds from the
//     master via selfSrc so the FULL chain is named
//   - typed-twice legality: the same file included at two sites splices twice; its
//     duplicate ids fall to the ordinary duplicate-id handling, not an assembler error
//   - a missing include target renders the visible load-failure marker
//   - an <include> inside a minipage is rejected visibly (the sealed box has no
//     outward pulls)

import assert from 'node:assert/strict';
import { buildEnscribePipeline } from '../src/interpreter/index.js';
import { assembleMasterDocument } from '../src/master-document/assemble.js';

// An fs-free harness: files live in a map; resolve is identity (map keys are the
// composed master-relative paths — exactly the browser preload shape).
function render(files, masterName = 'master.emd', warnings = []) {
  const proc = buildEnscribePipeline({});
  const tree = assembleMasterDocument({
    source: files[masterName],
    readFile: (p) => {
      if (!(p in files)) throw new Error(`no such file: ${p}`);
      return files[p];
    },
    resolve: (rel) => rel,
    parse: (s) => proc.parse(s),
    warn: (m) => warnings.push(m),
    selfSrc: masterName,
  });
  const file = { data: {} };
  return String(proc.stringify(proc.runSync(tree, file), file));
}

export function run() {
  let passed = 0;

  // ── the motivating example: prose, include, prose, include, prose ───────────
  {
    const html = render({
      'master.emd': '<meta type=article title="T" />\n\nOpening prose.\n\n<include src=one.emd />\n\nBetween the includes.\n\n<include src=two.emd />\n\nClosing prose.\n',
      'one.emd': 'First spliced.\n',
      'two.emd': 'Second spliced.\n',
    });
    const order = ['Opening prose', 'First spliced', 'Between the includes', 'Second spliced', 'Closing prose']
      .map((s) => html.indexOf(s));
    assert.ok(order.every((i) => i >= 0), 'all five passages render');
    assert.deepEqual([...order].sort((a, b) => a - b), order, 'document order preserved through the splices');
    console.log('PASS: prose, include, prose, include, prose — each splices at its spot');
    passed++;
  }

  // ── nested include; paths compose file-relative ──────────────────────────────
  {
    const html = render({
      'master.emd': '<meta type=article title="T" />\n\n<include src=deep/mid.emd />\n',
      'deep/mid.emd': 'Middle content.\n\n<include src=leaf.emd />\n',
      'deep/leaf.emd': 'Leaf content (deep/-relative).\n',
    });
    assert.match(html, /Middle content/, 'mid splices');
    assert.match(html, /Leaf content/, 'leaf splices — src resolved relative to deep/mid.emd, not the master');
    console.log('PASS: nested include, paths composed file-relative (recursively)');
    passed++;
  }

  // ── structure crosses the boundary: deepest-open-container ──────────────────
  {
    // chapter1.emd ends with an OPEN sub-section (the spec's own example): master
    // text after the include lands INSIDE it — exactly as if typed in one file.
    const html = render({
      'master.emd': '<meta type=article title="T" />\n\n<include src=part.emd />\n\nMore master text.\n',
      'part.emd': '<section | Outer>\n\nSection prose.\n\n<sub-section | Fine print>\n\nSome fine print.\n',
    });
    const sub = html.slice(html.indexOf('<sub-section'), html.indexOf('</sub-section>'));
    assert.match(sub, /More master text/, 'text after the include lands in the deepest open container (the sub-section)');
    console.log('PASS: an element opened in an included file stays open — deepest-open-container');
    passed++;
  }

  // ── structure crosses the boundary: peer-close from inside the splice ───────
  {
    // The caller opens a section; the included file opens a PEER section — the file
    // boundary is invisible to peer-closing, so the caller's section closes.
    const html = render({
      'master.emd': '<meta type=article title="T" />\n\n<section | Caller>\n\nCaller prose.\n\n<include src=peer.emd />\n',
      'peer.emd': '<section | Peer>\n\nPeer prose.\n',
    });
    const caller = html.slice(html.indexOf('Caller prose'), html.indexOf('Peer prose'));
    assert.match(caller, /<\/section>/, "the included file's peer section closed the caller's section");
    console.log('PASS: a peer tag inside an included file closes a caller-opened element');
    passed++;
  }

  // ── cycle: visible marker naming the FULL chain, splice skipped, assembly continues ──
  {
    const warnings = [];
    const html = render({
      'master.emd': '<meta type=article title="T" />\n\nBefore.\n\n<include src=b.emd />\n\nAfter.\n',
      'b.emd': 'B content.\n\n<include src=master.emd />\n',
    }, 'master.emd', warnings);
    assert.match(html, /\?\?include cycle: master\.emd → b\.emd → master\.emd\?\?/, 'the marker names the full chain');
    assert.match(html, /enscribe-include-error/, 'the marker renders in the visible error family');
    assert.match(html, /Before\./, 'content before the cycle renders');
    assert.match(html, /After\./, 'content after the cycle renders — assembly continued');
    assert.match(html, /B content/, "the non-cyclic part of b.emd spliced");
    assert.ok(warnings.some((w) => /cycle detected/.test(w) && /master\.emd → b\.emd → master\.emd/.test(w)),
      'the warning carries the chain as provenance');
    console.log('PASS: cycle — visible ??include cycle: a → b → a?? marker, skipped splice, assembly continues');
    passed++;
  }

  // ── typed-twice legality + ordinary duplicate-id handling ────────────────────
  {
    const warnings = [];
    const html = render({
      'master.emd': '<meta type=article title="T" />\n\n<include src=frag.emd />\n\nBetween.\n\n<include src=frag.emd />\n',
      'frag.emd': '<figure #fig:x | A captioned figure.>\n\nFragment prose.\n',
    }, 'master.emd', warnings);
    assert.equal((html.match(/Fragment prose/g) ?? []).length, 2, 'the same file splices at BOTH sites (typed-twice)');
    assert.doesNotMatch(html, /include cycle/, 'double inclusion is not a cycle');
    // The duplicate #fig:x falls to the ordinary duplicate-id diagnostics — the
    // assembler itself neither errors nor dedupes (one id renders; the collision is
    // the ordinary #403-family concern, not an assembly failure).
    assert.equal((html.match(/id="fig:x"/g) ?? []).length >= 1, true, 'the id renders (no assembler-level suppression)');
    console.log('PASS: typed-twice is legal; duplicate ids fall to ordinary handling');
    passed++;
  }

  // ── missing include target: visible load-failure marker ─────────────────────
  {
    const html = render({
      'master.emd': '<meta type=article title="T" />\n\nBefore.\n\n<include src=nope.emd />\n\nAfter.\n',
    });
    assert.match(html, /enscribe-include-error/, 'a visible marker, never a silent drop');
    assert.match(html, /could not load/, 'the message names the failure');
    assert.match(html, /After\./, 'assembly continues');
    console.log('PASS: a missing include target degrades visibly and assembly continues');
    passed++;
  }

  // ── an <include> inside a minipage is rejected (sealed box, no outward pulls) ──
  {
    const proc = buildEnscribePipeline({});
    const file = { data: {} };
    const html = String(proc.stringify(proc.runSync(proc.parse(
      '<minipage caption="Box" |\n\nBox prose.\n\n<include src=extra.emd />\n\n>\n'), file), file));
    assert.match(html, /enscribe-include-error/, 'the boxed include renders the visible rejection');
    assert.match(html, /not allowed inside a minipage/, 'the message names the seal');
    console.log('PASS: <include> inside a minipage is rejected visibly (no outward pulls)');
    passed++;
  }

  console.log(`include (#424): ${passed}/8 passed`);
}
