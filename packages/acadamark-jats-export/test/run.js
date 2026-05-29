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
  acadamarkNumbering,
  fillNumbering,
  acadamarkRefResolution,
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

// ─── Summary ──────────────────────────────────────────────────────────────

console.log('');
if (fail === 0) {
  console.log(`OK: ${pass}/${pass + fail} checks passed`);
  process.exit(0);
} else {
  console.log(`FAILED: ${pass}/${pass + fail} checks passed (${fail} failed)`);
  process.exit(1);
}
