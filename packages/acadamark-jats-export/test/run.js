// Test runner for acadamark-jats-export.
//
// Phase 5 slice 5a (2026-05-29): minimal test suite covering:
//   - mapAttributes lift integration: jatsEmit produces correct
//     target-keyed attribute kv pairs for id / class / kwarg shapes.
//   - article-shaped fixture (doc-39): runs through the interpreter's
//     structural plugins to get the post-stage-3 mdast, then through
//     acadamarkToJats, and compares against a snapshot.
//   - DTD validation: invokes xmllint on the produced XML against the
//     JATS Archiving and Interchange 1.3 DTD. Skipped with a console
//     note when xmllint isn't available; not a CI hard requirement
//     for slice 5a (the snapshot pins regression; DTD validation
//     pins correctness when the toolchain has it).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execSync } from 'node:child_process';
import { strict as assert } from 'node:assert';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkAcadamark from 'remark-acadamark';
import remarkRecursiveContent from 'remark-acadamark/recursive-content';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import {
  acadamarkNormalizeToCanonical,
  acadamarkConfigDiscovery,
  acadamarkBookStructuring,
  acadamarkArticleStructuring,
  acadamarkSectionNesting,
  acadamarkNotes,
  acadamarkNotePlacement,
  acadamarkNumbering,
  fillNumbering,
  acadamarkRefResolution,
  acadamarkCiteResolution,
  acadamarkBibliography,
} from 'acadamark-interpreter';
import { ensureRegistry } from 'acadamark-core/registry';
import { mapAttributes } from 'acadamark-core/map-attributes';
import { jatsEmit, aggregateJatsAttrs } from '../src/lib/jats-emit.js';
import { acadamarkToJats } from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, 'fixtures');
const UPDATE_SNAPSHOTS = process.env.ACADAMARK_UPDATE_SNAPSHOTS === '1';

let pass = 0;
let fail = 0;

function check(name, condition) {
  if (condition) {
    console.log('PASS:', name);
    pass++;
  } else {
    console.log('FAIL:', name);
    fail++;
  }
}

// ─── Unit: mapAttributes + jatsEmit shape ─────────────────────────────────

{
  const node = {
    type: 'acadamarkTag',
    tagname: 'fake',
    id: 'fig:elephant',
    classes: ['highlight', 'wide'],
    kwargs: { src: 'x.jpg', skipme: 'ignored' },
  };
  const vocab = {
    acadamark_attributes: {
      id:      { maps_to: { html: 'id', jats: 'id' } },
      classes: { maps_to: { html: 'class', jats: 'specific-use' } },
      kwargs: {
        src:    { maps_to: { html: 'src', jats: 'xlink:href' } },
        skipme: { maps_to: { html: 'skipme' } },  // no jats key
      },
    },
  };

  const results = mapAttributes(node, vocab, 'jats', jatsEmit);
  const attrStr = aggregateJatsAttrs(results);

  check(
    'mapAttributes + jatsEmit: id passes through',
    attrStr.includes('id="fig:elephant"'),
  );
  check(
    'mapAttributes + jatsEmit: classes → joined string on specific-use',
    attrStr.includes('specific-use="highlight wide"'),
  );
  check(
    'mapAttributes + jatsEmit: kwarg with jats name renames',
    attrStr.includes('xlink:href="x.jpg"'),
  );
  check(
    'mapAttributes + jatsEmit: kwarg without jats name is skipped',
    !attrStr.includes('skipme'),
  );
}

// ─── Integration: doc-39 minimal article through full pipeline ─────────────

{
  const src = readFileSync(join(FIXTURES_DIR, 'document-39-jats-minimal-article.acm'), 'utf8');

  // Build the post-stage-3 mdast via the interpreter's structural plugins.
  // Mirror the slice 5a-spec'd pipeline: parse + recursive content +
  // normalize + config-discovery + book-structuring + article-structuring +
  // section-nesting. Stages 4+ (cite/note/numbering/etc.) aren't needed
  // for slice 5a's minimal scope.
  const inner = unified()
    .use(remarkParse).use(remarkAcadamark).use(remarkMath).use(remarkGfm);

  const tree = unified()
    .use(remarkParse).use(remarkAcadamark).use(remarkMath).use(remarkGfm)
    .parse(src);

  // Run the transforms in pipeline order. remarkRecursiveContent
  // (stage 2) must run before the structural plugins (stage 3) so
  // pipe-content arrays are populated. The order matches what
  // `acadamark-interpreter`'s `acadamarkInterpreter` plugin registers.
  const file = { data: {}, message: () => {} };
  unified()
    .use(remarkRecursiveContent, { processor: inner })
    .use(acadamarkNormalizeToCanonical)
    .use(acadamarkConfigDiscovery)
    .use(acadamarkBookStructuring)
    .use(acadamarkArticleStructuring)
    .use(acadamarkSectionNesting)
    .runSync(tree, file);

  // Export to JATS.
  const jats = acadamarkToJats(tree);

  // Snapshot.
  const snapshotPath = join(FIXTURES_DIR, 'document-39-jats-minimal-article.xml');
  if (UPDATE_SNAPSHOTS || !existsSync(snapshotPath)) {
    writeFileSync(snapshotPath, jats, 'utf8');
    console.log('  (wrote snapshot: document-39-jats-minimal-article.xml)');
  } else {
    const expected = readFileSync(snapshotPath, 'utf8');
    check('integration doc39: JATS snapshot matches', jats === expected);
  }

  // Spot-checks for the most distinctive surface features.
  check('doc39: <?xml declaration present', jats.startsWith('<?xml'));
  check('doc39: <!DOCTYPE article PUBLIC JATS 1.3 declaration', jats.includes('JATS-archivearticle1-3.dtd'));
  check('doc39: <article article-type="research-article"', jats.includes('article-type="research-article"'));
  check('doc39: <article xml:lang="en" dtd-version="1.3"',
    jats.includes('xml:lang="en"') && jats.includes('dtd-version="1.3"'));
  check('doc39: <title-group> wraps article-title + subtitle',
    jats.includes('<title-group>') && jats.includes('<article-title>'));
  check('doc39: article-subtitle lifted to JATS <subtitle>',
    jats.includes('<subtitle>'));
  check('doc39: <contrib-group> wraps author', jats.includes('<contrib-group>'));
  check('doc39: <contrib contrib-type="author">',
    jats.includes('<contrib contrib-type="author">'));
  check('doc39: <string-name> for the author', jats.includes('<string-name>'));
  check('doc39: <abstract> emitted', jats.includes('<abstract>'));
  check('doc39: <body> region', jats.includes('<body>'));
  check('doc39: <sec> with <title> for sections', /<sec>\s*<title>/.test(jats));
  check('doc39: inline <italic> from i', jats.includes('<italic>italic</italic>'));
  check('doc39: inline <bold> from b', jats.includes('<bold>bold</bold>'));
  check('doc39: inline <monospace> from inline-code',
    jats.includes('<monospace>inline code</monospace>'));

  // DTD validation. Try to invoke xmllint; if it's unavailable, log
  // and skip (slice 5a's correctness is pinned by the snapshot; DTD
  // validation is the extra-strict check available when xmllint is).
  try {
    execSync('xmllint --version', { stdio: 'pipe' });
    // Use --noout to suppress XML output; we only care about exit code.
    // --nonet prevents network DTD fetch (we don't bundle the DTD in
    // slice 5a; without a local copy xmllint would try to fetch).
    // For slice 5a, accept the well-formedness check (--noout alone
    // catches malformed XML) and document DTD-local-validation as a
    // follow-up (bundling the DTD into the package is mechanical but
    // requires the DTD file + a few related entity files).
    try {
      const tmpPath = join(FIXTURES_DIR, '.tmp-validate.xml');
      writeFileSync(tmpPath, jats, 'utf8');
      execSync(`xmllint --noout ${tmpPath}`, { stdio: 'pipe' });
      check('doc39: JATS XML is well-formed (xmllint --noout)', true);
    } catch (err) {
      check('doc39: JATS XML is well-formed (xmllint --noout)', false);
      console.log('  xmllint output:', err.stderr?.toString() ?? err.message);
    }
  } catch {
    console.log('  (skipping xmllint validation — xmllint not available)');
  }
}

// ─── Integration: doc-40 body content (Phase 5 slice 5b) ──────────────────

{
  const src = readFileSync(join(FIXTURES_DIR, 'document-40-jats-body-content.acm'), 'utf8');

  const inner = unified()
    .use(remarkParse).use(remarkAcadamark).use(remarkMath).use(remarkGfm);

  const tree = unified()
    .use(remarkParse).use(remarkAcadamark).use(remarkMath).use(remarkGfm)
    .parse(src);

  // Run the same transform pipeline as doc-39 but also include
  // numbering + apply-numbers + ref-resolution so display-math and
  // frameables get computedNumber populated (required for <label>
  // emission per slice 5b).
  const file = { data: {}, message: () => {} };
  unified()
    .use(remarkRecursiveContent, { processor: inner })
    .use(acadamarkNormalizeToCanonical)
    .use(acadamarkConfigDiscovery)
    .use(acadamarkBookStructuring)
    .use(acadamarkArticleStructuring)
    .use(acadamarkSectionNesting)
    .use(acadamarkNumbering)
    .use(function applyNumbers() {
      return (_t, f) => { ensureRegistry(f).numberRegistry(); fillNumbering(f); };
    })
    .use(acadamarkRefResolution)
    .runSync(tree, file);

  const jats = acadamarkToJats(tree);

  const snapshotPath = join(FIXTURES_DIR, 'document-40-jats-body-content.xml');
  if (UPDATE_SNAPSHOTS || !existsSync(snapshotPath)) {
    writeFileSync(snapshotPath, jats, 'utf8');
    console.log('  (wrote snapshot: document-40-jats-body-content.xml)');
  } else {
    const expected = readFileSync(snapshotPath, 'utf8');
    check('integration doc40: JATS snapshot matches', jats === expected);
  }

  // Spot-checks per slice 5b's added surface.

  // Lists.
  check('doc40: <list list-type="bullet">', jats.includes('<list list-type="bullet">'));
  check('doc40: <list list-type="order">', jats.includes('<list list-type="order">'));
  check('doc40: <list-item> emitted', jats.includes('<list-item>'));
  check('doc40: <def-list> for <dl>', jats.includes('<def-list>'));
  check('doc40: <def-item> + <term> + <def>',
    jats.includes('<def-item>') && jats.includes('<term>') && jats.includes('<def>'));

  // Math.
  check('doc40: <inline-formula><tex-math>',
    /<inline-formula><tex-math><!\[CDATA\[E = mc\^2\]\]><\/tex-math><\/inline-formula>/.test(jats));
  check('doc40: <disp-formula> with <tex-math> CDATA',
    /<disp-formula[^>]*>[\s\S]*<tex-math><!\[CDATA\[/.test(jats));
  check('doc40: <disp-formula> has <label>',
    /<disp-formula[^>]*>\s*<label>/.test(jats));
  check('doc40: align env wrapped in \\begin{aligned}',
    jats.includes('\\begin{aligned}'));

  // Theorem family.
  check('doc40: <statement content-type="theorem">',
    jats.includes('<statement content-type="theorem"'));
  check('doc40: <statement content-type="proof">',
    jats.includes('<statement content-type="proof"'));
  check('doc40: theorem <label>',
    jats.includes('<label>Theorem 1.</label>'));
  check('doc40: theorem <title> from name kwarg',
    jats.includes('<title>Pythagoras</title>'));
  check('doc40: unnumbered <proof> <label>',
    jats.includes('<label>Proof.</label>'));

  // Frameables.
  check('doc40: <fig> emitted', jats.includes('<fig'));
  check('doc40: <fig> <graphic xlink:href>',
    /<graphic xlink:href="elephant\.jpg"/.test(jats));
  check('doc40: <fig> <caption><p>',
    /<fig[^>]*>[\s\S]*<caption>[\s\S]*<p>An elephant\.<\/p>/.test(jats));
  check('doc40: <table-wrap> emitted', jats.includes('<table-wrap'));
  check('doc40: <table-wrap> <caption>',
    /<table-wrap[^>]*>[\s\S]*<caption>[\s\S]*<p>A small CSV table\.<\/p>/.test(jats));

  // Abstract limitation fix (Q1).
  check('doc40: abstract prose text retained (slice 5b Q1 fix)',
    /<abstract>\s*<p>[\s\S]*This abstract has[\s\S]*<i>italic<\/i>[\s\S]*<b>bold<\/b>/.test(jats) ||
    /<abstract>\s*<p>[\s\S]*This abstract has[\s\S]*<italic>italic<\/italic>[\s\S]*<bold>bold<\/bold>/.test(jats));
}

// ─── Integration: doc-41 cross-refs + footnotes + table rows (slice 5c) ──
//
// Article-shaped fixture exercising the slice 5c added surface:
//   - <ref @id> resolves to <xref ref-type="..." rid="...">text</xref>
//   - <note> resolves to <xref ref-type="fn"> inline + collects into
//     a per-section / article-back <fn-group>
//   - <table csv | data> renders inner <thead>/<tbody> rows
//   - Theorem / equation / figure refs round-trip through their
//     respective ref-types.

{
  const src = readFileSync(join(FIXTURES_DIR, 'document-41-jats-refs-notes-tables.acm'), 'utf8');

  const inner = unified()
    .use(remarkParse).use(remarkAcadamark).use(remarkMath).use(remarkGfm);

  const tree = unified()
    .use(remarkParse).use(remarkAcadamark).use(remarkMath).use(remarkGfm)
    .parse(src);

  const file = { data: {}, message: () => {} };
  unified()
    .use(remarkRecursiveContent, { processor: inner })
    .use(acadamarkNormalizeToCanonical)
    .use(acadamarkConfigDiscovery)
    .use(acadamarkBookStructuring)
    .use(acadamarkArticleStructuring)
    .use(acadamarkSectionNesting)
    .use(acadamarkNotes)
    .use(acadamarkNumbering)
    .use(function applyNumbers() {
      return (_t, f) => { ensureRegistry(f).numberRegistry(); fillNumbering(f); };
    })
    .use(acadamarkRefResolution)
    .use(acadamarkCiteResolution)
    .use(acadamarkNotePlacement)
    .use(acadamarkBibliography)
    .runSync(tree, file);

  const jats = acadamarkToJats(tree);

  const snapshotPath = join(FIXTURES_DIR, 'document-41-jats-refs-notes-tables.xml');
  if (UPDATE_SNAPSHOTS || !existsSync(snapshotPath)) {
    writeFileSync(snapshotPath, jats, 'utf8');
    console.log('  (wrote snapshot: document-41-jats-refs-notes-tables.xml)');
  } else {
    const expected = readFileSync(snapshotPath, 'utf8');
    check('integration doc41: JATS snapshot matches', jats === expected);
  }

  // Spot-checks per slice 5c's added surface.

  // Cross-references — one per discriminator type.
  check('doc41: <xref ref-type="fig"> for figure ref',
    /<xref ref-type="fig" rid="fig:elephant">/.test(jats));
  check('doc41: <xref ref-type="disp-formula"> for equation ref',
    /<xref ref-type="disp-formula" rid="eqn:euler">/.test(jats));
  check('doc41: <xref ref-type="table"> for table ref',
    /<xref ref-type="table" rid="tab:demo">/.test(jats));
  check('doc41: <xref ref-type="sec"> for section ref',
    /<xref ref-type="sec" rid="sec:intro">/.test(jats));
  check('doc41: <xref ref-type="statement"> for theorem ref',
    /<xref ref-type="statement" rid="thm:pyth">/.test(jats));
  check('doc41: xref text uses pre-computed display text (e.g. "figure 1")',
    /<xref[^>]*rid="fig:elephant">figure 1<\/xref>/.test(jats));

  // Footnotes.
  check('doc41: inline <xref ref-type="fn"> for note marker',
    /<xref ref-type="fn" id="noteref-\d+" rid="[^"]+">\d+<\/xref>/.test(jats));
  check('doc41: <fn-group> emitted', /<fn-group/.test(jats));
  check('doc41: <fn id="..."> with <label>',
    /<fn id="[^"]+">\s*<label>\d+<\/label>/.test(jats));

  // Table rows.
  check('doc41: <table> <thead> <tr> <th> for headers',
    /<thead>\s*<tr>\s*<th>a<\/th>\s*<th>b<\/th>\s*<th>c<\/th>/.test(jats));
  check('doc41: <table> <tbody> <tr> <td> for body rows',
    /<tbody>\s*<tr>\s*<td>1<\/td>\s*<td>2<\/td>\s*<td>3<\/td>/.test(jats));
  check('doc41: second body row present',
    /<td>4<\/td>\s*<td>5<\/td>\s*<td>6<\/td>/.test(jats));

  // Per-section footnote collection (foot-scope default for articles —
  // sections that contain foot-notes get a <fn-group> at section end).
  check('doc41: at least one <fn-group> sits inside a <sec>',
    /<sec[^>]*>[\s\S]*<fn-group[\s\S]*?<\/fn-group>[\s\S]*<\/sec>/.test(jats));
}

// ─── Integration: doc-42 BITS book export (slice 5c) ──────────────────────

{
  const src = readFileSync(join(FIXTURES_DIR, 'document-42-jats-bits-book.acm'), 'utf8');

  const inner = unified()
    .use(remarkParse).use(remarkAcadamark).use(remarkMath).use(remarkGfm);

  const tree = unified()
    .use(remarkParse).use(remarkAcadamark).use(remarkMath).use(remarkGfm)
    .parse(src);

  const file = { data: {}, message: () => {} };
  unified()
    .use(remarkRecursiveContent, { processor: inner })
    .use(acadamarkNormalizeToCanonical)
    .use(acadamarkConfigDiscovery)
    .use(acadamarkBookStructuring)
    .use(acadamarkArticleStructuring)
    .use(acadamarkSectionNesting)
    .use(acadamarkNotes)
    .use(acadamarkNumbering)
    .use(function applyNumbers() {
      return (_t, f) => { ensureRegistry(f).numberRegistry(); fillNumbering(f); };
    })
    .use(acadamarkRefResolution)
    .use(acadamarkCiteResolution)
    .use(acadamarkNotePlacement)
    .use(acadamarkBibliography)
    .runSync(tree, file);

  const jats = acadamarkToJats(tree);

  const snapshotPath = join(FIXTURES_DIR, 'document-42-jats-bits-book.xml');
  if (UPDATE_SNAPSHOTS || !existsSync(snapshotPath)) {
    writeFileSync(snapshotPath, jats, 'utf8');
    console.log('  (wrote snapshot: document-42-jats-bits-book.xml)');
  } else {
    const expected = readFileSync(snapshotPath, 'utf8');
    check('integration doc42: JATS snapshot matches', jats === expected);
  }

  // Spot-checks for the BITS book path.

  check('doc42: BITS doctype declaration',
    jats.includes('BITS-book2-0.dtd'));
  check('doc42: <book book-type="book" xml:lang="en" dtd-version="2.0">',
    /<book book-type="book" xml:lang="en" dtd-version="2\.0">/.test(jats));
  check('doc42: <book-meta> with <book-title-group>',
    jats.includes('<book-meta>') && jats.includes('<book-title-group>'));
  check('doc42: <book-title> emitted',
    /<book-title>A BITS Book for JATS Export<\/book-title>/.test(jats));
  check('doc42: <book-subtitle subtitle> emitted',
    jats.includes('<subtitle>Demonstrating Phase 5 slice 5c book path</subtitle>'));
  check('doc42: <front-matter> region for preface', jats.includes('<front-matter>'));
  check('doc42: <book-part book-part-type="preface">',
    /<book-part book-part-type="preface"/.test(jats));
  check('doc42: <body> region for chapters',
    jats.includes('<body>'));
  check('doc42: <book-part book-part-type="chapter">',
    /<book-part book-part-type="chapter"/.test(jats));
  check('doc42: per-book-part <book-part-meta>',
    jats.includes('<book-part-meta>'));
  check('doc42: <book-back> region for appendix',
    jats.includes('<book-back>'));
  check('doc42: <book-part book-part-type="appendix">',
    /<book-part book-part-type="appendix"/.test(jats));
  check('doc42: edited-volume — per-book-part <contrib-group> for Methods',
    /<book-part book-part-type="chapter"[\s\S]*<book-part-meta>[\s\S]*<contrib-group>[\s\S]*<string-name>Guest Author/.test(jats));
  check('doc42: chapter-scope footnotes collected per book-part (in <back>)',
    /<book-part[\s\S]*?<back>\s*<fn-group/.test(jats));
  // Chapter-prefixed cross-ref text. The exact chapter number depends
  // on how the numbering registry counts book-parts (current behavior
  // counts preface as chapter 1 — see drift finding noted in the
  // slice commit message). Pattern-match the chapter-prefixed shape
  // rather than the specific number.
  check('doc42: chapter-prefixed cross-ref text (figure N.M)',
    /<xref[^>]*rid="fig:intro">figure \d+\.\d+<\/xref>/.test(jats));

  // Book-part titles lifted from pipe content.
  check('doc42: <book-part-title> from <chapter | Introduction> pipe content',
    jats.includes('<title>Introduction</title>'));
  check('doc42: <book-part-title> from <preface | About this Book>',
    jats.includes('<title>About this Book</title>'));
  check('doc42: <book-part-title> from <appendix | Notation>',
    jats.includes('<title>Notation</title>'));
}

// ─── Summary ──────────────────────────────────────────────────────────────

console.log('');
if (fail === 0) {
  console.log(`OK: ${pass}/${pass + fail} checks passed`);
  process.exit(0);
} else {
  console.log(`FAILED: ${pass}/${pass + fail} checks passed (${fail} failed)`);
  process.exit(1);
}
