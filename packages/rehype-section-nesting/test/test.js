import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import rehypeSectionNesting from '../src/index.js';
import assert from 'node:assert/strict';

async function process(input) {
  const file = await unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeSectionNesting)
    .use(rehypeStringify)
    .process(input);
  return String(file);
}

async function run() {
  // Case 1: Two flat <section>s become siblings.
  {
    const out = await process(
      `<section><section-title>A</section-title></section>` +
      `<p>x</p>` +
      `<section><section-title>B</section-title></section>` +
      `<p>y</p>`,
    );
    assert.equal(
      out,
      `<section><section-title>A</section-title><p>x</p></section>` +
      `<section><section-title>B</section-title><p>y</p></section>`,
    );
    console.log('PASS: two flat sections become siblings');
  }

  // Case 2: A <sub-section> nests inside the preceding <section>.
  {
    const out = await process(
      `<section><section-title>A</section-title></section>` +
      `<sub-section><sub-section-title>A.1</sub-section-title></sub-section>` +
      `<p>x</p>`,
    );
    assert.equal(
      out,
      `<section><section-title>A</section-title>` +
      `<sub-section><sub-section-title>A.1</sub-section-title><p>x</p></sub-section>` +
      `</section>`,
    );
    console.log('PASS: sub-section nests inside preceding section');
  }

  // Case 3: After two <sub-section>s, a new <section> closes everything
  // and becomes a top-level sibling of the original <section>.
  {
    const out = await process(
      `<section><section-title>A</section-title></section>` +
      `<sub-section><sub-section-title>A.1</sub-section-title></sub-section>` +
      `<sub-section><sub-section-title>A.2</sub-section-title></sub-section>` +
      `<section><section-title>B</section-title></section>`,
    );
    assert.equal(
      out,
      `<section><section-title>A</section-title>` +
      `<sub-section><sub-section-title>A.1</sub-section-title></sub-section>` +
      `<sub-section><sub-section-title>A.2</sub-section-title></sub-section>` +
      `</section>` +
      `<section><section-title>B</section-title></section>`,
    );
    console.log('PASS: new section closes open sub-sections');
  }

  // Case 4: Three-level nesting works.
  {
    const out = await process(
      `<section><section-title>A</section-title></section>` +
      `<sub-section><sub-section-title>A.1</sub-section-title></sub-section>` +
      `<sub-sub-section><sub-sub-section-title>A.1.a</sub-sub-section-title></sub-sub-section>` +
      `<p>deep</p>`,
    );
    assert.equal(
      out,
      `<section><section-title>A</section-title>` +
      `<sub-section><sub-section-title>A.1</sub-section-title>` +
      `<sub-sub-section><sub-sub-section-title>A.1.a</sub-sub-section-title><p>deep</p></sub-sub-section>` +
      `</sub-section>` +
      `</section>`,
    );
    console.log('PASS: three-level nesting (section → sub-section → sub-sub-section)');
  }

  // Case 5: Skipping levels (section directly to sub-sub-section) still nests.
  // The sub-sub-section attaches to the section, since that's the deepest open.
  {
    const out = await process(
      `<section><section-title>A</section-title></section>` +
      `<sub-sub-section><sub-sub-section-title>deep</sub-sub-section-title></sub-sub-section>`,
    );
    assert.equal(
      out,
      `<section><section-title>A</section-title>` +
      `<sub-sub-section><sub-sub-section-title>deep</sub-sub-section-title></sub-sub-section>` +
      `</section>`,
    );
    console.log('PASS: skipping levels still nests');
  }

  // Case 6: Content before the first section stays at top level.
  {
    const out = await process(
      `<article-title>Title</article-title>` +
      `<p>preamble</p>` +
      `<section><section-title>A</section-title></section>` +
      `<p>body</p>`,
    );
    assert.equal(
      out,
      `<article-title>Title</article-title>` +
      `<p>preamble</p>` +
      `<section><section-title>A</section-title><p>body</p></section>`,
    );
    console.log('PASS: pre-section content stays at top level');
  }

  // Case 7: Wrapped in <article>, sections still nest correctly.
  {
    const out = await process(
      `<article>` +
      `<section><section-title>A</section-title></section>` +
      `<sub-section><sub-section-title>A.1</sub-section-title></sub-section>` +
      `</article>`,
    );
    assert.equal(
      out,
      `<article>` +
      `<section><section-title>A</section-title>` +
      `<sub-section><sub-section-title>A.1</sub-section-title></sub-section>` +
      `</section>` +
      `</article>`,
    );
    console.log('PASS: nesting works inside article wrapper');
  }

  // Case 8: Idempotence — running on already-nested input is a no-op.
  {
    const nested =
      `<section><section-title>A</section-title>` +
      `<sub-section><sub-section-title>A.1</sub-section-title></sub-section>` +
      `</section>`;
    const out = await process(nested);
    assert.equal(out, nested);
    console.log('PASS: idempotent on already-nested input');
  }

  // Case 9: Plain HTML headings inside sections are deliberately NOT
  // touched by the nesting algorithm. This plugin operates on Layer 1
  // semantic HTML only — heading-level-driven nesting belongs to a
  // separate concern.
  {
    const out = await process(
      `<section><h1>A</h1></section>` +
      `<section><h2>B</h2></section>`,
    );
    // Both are <section> at depth 1, so they remain siblings. The h2
    // does NOT cause the second section to nest inside the first.
    assert.equal(
      out,
      `<section><h1>A</h1></section>` +
      `<section><h2>B</h2></section>`,
    );
    console.log('PASS: plain HTML headings do not drive nesting');
  }

  // Case 10: Multiple sub-sections in a row stay as siblings under
  // their parent section, not nested in each other.
  {
    const out = await process(
      `<section><section-title>A</section-title></section>` +
      `<sub-section><sub-section-title>A.1</sub-section-title></sub-section>` +
      `<sub-section><sub-section-title>A.2</sub-section-title></sub-section>` +
      `<sub-section><sub-section-title>A.3</sub-section-title></sub-section>`,
    );
    assert.equal(
      out,
      `<section><section-title>A</section-title>` +
      `<sub-section><sub-section-title>A.1</sub-section-title></sub-section>` +
      `<sub-section><sub-section-title>A.2</sub-section-title></sub-section>` +
      `<sub-section><sub-section-title>A.3</sub-section-title></sub-section>` +
      `</section>`,
    );
    console.log('PASS: peer sub-sections stay as siblings');
  }

  console.log('\nAll tests passed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
