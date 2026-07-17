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
import { assembleMasterDocument, hasMasterSrcEntries } from '../src/master-document/assemble.js';

// An fs-free harness: files live in a map; resolve is identity (map keys are the
// composed master-relative paths — exactly the browser preload shape).
function render(files, masterName = 'master.emd', warnings = [], reads = []) {
  const proc = buildEnscribePipeline({});
  const tree = assembleMasterDocument({
    source: files[masterName],
    readFile: (p) => {
      reads.push(p);
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

  // ── #413 S1: a missing STRUCTURAL child (<chapter src>) — flagged placeholder, BOTH channels,
  //    the chapter keeps its number (never-fail, doctrine). Distinct from a failed <include>. ──
  {
    const warnings = [];
    const html = render({
      'master.emd': '<meta type=book title="B" />\n\n<chapter src=ch1.emd | First>\n\n<chapter src=missing.emd | Second>\n',
      'ch1.emd': '<meta title="First" />\n\nChapter one body.\n',
    }, 'master.emd', warnings);
    // Channel 1 — the in-document flagged placeholder in the error family (NOT the include family):
    assert.match(html, /enscribe-master-src-error/, 'S1: the missing child renders the master-src error family flag (not a bare <p>)');
    assert.match(html, /role="alert"/, 'S1: the placeholder carries role=alert so the family CSS styles it');
    // (the pipeline typography turns the message's straight quotes into curly quotes, hence the . for the quote)
    assert.match(html, /could not load chapter source .missing\.emd./, 'S1: the flag names the missing source');
    // Channel 2 — the stream warning names the failure:
    assert.ok(warnings.some((w) => /master: could not load <chapter src="missing\.emd">/.test(w)),
      'S1: the CLI/console warning names the missing chapter source (second channel)');
    // Never-fail: the chapter is still emitted as a numbered book-part — it keeps its number/title.
    assert.match(html, /Chapter one body/, 'S1: the sibling chapter still renders (assembly continues)');
    assert.equal((html.match(/book-part-type=/g) || []).length, 2, 'S1: the missing chapter keeps its <book-part> — it is still numbered, not dropped');
    assert.ok(html.indexOf('Second') >= 0, 'S1: the missing chapter keeps its title (pipe override survives)');
    console.log('PASS: #413 S1 — a missing structural child renders a flagged placeholder, keeps its number, and warns (both channels)');
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

  // ── #426: the assembly gate is STRUCTURAL — verbatim src-forms never trigger it ──
  // The contract behind master-document.md §"Substitution before structure": a document enters
  // the assembly path only when its PARSED tree carries an actual src-bearing entry. A src-form
  // inside a code fence or inline-code span is a text node, never an entry.
  {
    const proc = buildEnscribePipeline({});
    const parse = (s) => proc.parse(s);
    // Real entries → TRUE
    assert.equal(hasMasterSrcEntries(parse('<meta type=article title=A />\n\n<section src=s.emd | S>\n')), true,
      'a real <section src> triggers the gate');
    assert.equal(hasMasterSrcEntries(parse('Prose.\n\n<include src=part.emd />\n\nMore.\n')), true,
      'a real <include src> triggers the gate');
    // Fenced / inline-code src-forms → FALSE (the #426 regression's exact shape)
    assert.equal(hasMasterSrcEntries(parse('Teaching:\n\n```\n<include src=methods.emd />\n<chapter src=ch1.emd | One>\n```\n')), false,
      'a FENCED <include src>/<chapter src> example does NOT trigger the gate');
    assert.equal(hasMasterSrcEntries(parse('Splice a file with `<include src=methods.emd />` at its call site.\n')), false,
      'an INLINE-CODE <include src> mention does NOT trigger the gate');
    // The pre-#426 raw regex would have matched all four; the structural gate splits them correctly.
    console.log('PASS: #426 — the assembly gate is structural: real src-entries trigger, fenced/inline src-forms do not');
    passed++;
  }

  // ── #426: one document, both shapes — assembles the REAL entry, ignores the FENCED example ──
  // The load-bearing case: a page that TEACHES <include src> in a fence AND genuinely uses one.
  {
    const reads = [];
    const warnings = [];
    const html = render({
      'master.emd':
        '<meta type=article title="Mixed" />\n\n' +
        'How to transclude — write this:\n\n' +
        '```\n<include src=NEVER_READ.emd />\n```\n\n' +   // fenced: documentation, must NOT be read
        'And here is a real one:\n\n' +
        '<include src=real.emd />\n\n' +
        'End.\n',
      'real.emd': 'REAL_CHILD_BODY spliced in.\n',
    }, 'master.emd', warnings, reads);
    assert.match(html, /REAL_CHILD_BODY/, 'the real <include src=real.emd> assembled its child');
    assert.match(html, /NEVER_READ\.emd/, 'the fenced example text survives verbatim (shown, not spliced)');
    assert.ok(!reads.includes('NEVER_READ.emd'), 'the FENCED example file was never read (not treated as a live include)');
    assert.deepEqual(warnings, [], 'no could-not-load warning for the fenced example');
    console.log('PASS: #426 — a document teaching <include src> in a fence AND using one: real assembles, fenced ignored');
    passed++;
  }

  console.log(`include (#424, #426): ${passed}/10 passed`);
}
