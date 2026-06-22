// End-to-end tests for same-line long-form tags (Issue 1):
//
//   <tag attrs>content</tag>  on a single line, for every vocabulary tag.
//
// The micromark long-form tokenizer (packages/enscribe/src/parser/syntax.js)
// scans the opener's line for a matching `</tag>`. When found it emits the
// same Open/Content/Close token structure as the multi-line form, so the
// content is recursively re-parsed and the rendered output is identical to the
// multi-line and pipe spellings. The change is additive: bare openers, the
// pipe form, the slash form, and multi-line long-form are byte-identical.
//
// Locked decisions (see notes/archive/phase-findings-2026-05/issue1-same-line-long-form-findings.md):
//   A — additive: same-line close scan, empty-short-form fallback when absent.
//   B — Enscribe's vocabulary wins over remark's HTML block (`<blockquote>`).
//   C — same-name nesting is NOT depth-counted; the first `</tag>` closes the
//       outer tag (documented limitation). Different-name nesting is free.
import assert from 'node:assert';
import { buildEnscribePipeline } from '../src/interpreter/index.js';

const render = (src) =>
  String(buildEnscribePipeline({ embedResources: false, dslMode: 'skip' }).processSync(src));

export function run() {
  // ── Inline formatting tags render same-line ────────────────────────────────
  {
    const cases = [
      ['<b>bold</b>', '<b>bold</b>'],
      ['<i>ital</i>', '<i>ital</i>'],
      ['<s>gone</s>', '<s>gone</s>'],
      ['<u>under</u>', '<u>under</u>'],
      ['<q>quoted</q>', '<q>quoted</q>'],
    ];
    for (const [src, expected] of cases) {
      const html = render(src);
      assert.ok(html.includes(expected), `${src} → ${expected}`);
    }
    console.log('PASS: inline formatting tags render same-line (b, i, s, u, q)');
  }

  // ── Anchor with a kwarg renders same-line ──────────────────────────────────
  {
    const html = render('<a href="https://example.com">text</a>');
    assert.ok(
      html.includes('<a href="https://example.com">text</a>'),
      '<a href="...">text</a> renders an anchor with href',
    );
    console.log('PASS: <a href="...">text</a> renders same-line');
  }

  // ── Content is recursively parsed: math inside a same-line tag ─────────────
  {
    const html = render('<b>$x^2$</b>');
    assert.ok(html.includes('<b><inline-math'), 'math opens inside the bold');
    assert.ok(html.includes('katex'), 'inline math is rendered (KaTeX)');
    assert.ok(html.includes('</inline-math></b>'), 'math closes inside the bold');
    assert.ok(!html.includes('$x^2$'), 'the literal $…$ is consumed, not passed through');
    console.log('PASS: <b>$x^2$</b> — content recursively parsed (math inside bold)');
  }

  // ── Different-name nesting is free (decision C) ─────────────────────────────
  {
    const html = render('<b>outer <i>inner</i> end</b>');
    assert.ok(
      html.includes('<b>outer <i>inner</i> end</b>'),
      'inner <i>…</i> is part of content and re-parsed',
    );
    console.log('PASS: <b>outer <i>inner</i> end</b> — different-name nesting');
  }

  // ── Mid-paragraph and trailing content stay in one paragraph ───────────────
  {
    const html = render('before <b>bold</b> after');
    assert.ok(
      html.includes('<p>before <b>bold</b> after</p>'),
      'inline same-line tag mid-paragraph stays inline',
    );
    console.log('PASS: mid-paragraph same-line tag stays inline');
  }
  {
    // Flow position rejects the same-line tag when non-whitespace trails the
    // close, so the paragraph forms and the text-position tokenizer claims the
    // tag inline — a single paragraph, not a block + a stray paragraph.
    const html = render('<b>bold</b> trailing words');
    assert.ok(
      html.includes('<p><b>bold</b> trailing words</p>'),
      'tag-at-line-start with trailing content is one inline paragraph',
    );
    console.log('PASS: same-line tag at line start with trailing content → one paragraph');
  }

  // ── Bare opener still falls back to the empty short form ────────────────────
  {
    // No same-line `</b>`, so the long-form tokenizer rejects and the named-tag
    // tokenizer claims `<b>` as an empty short-form tag (unchanged behavior).
    const html = render('x <b> y');
    assert.ok(html.includes('<b></b>'), 'bare <b> renders as an empty tag');
    console.log('PASS: bare <b> (no same-line close) → empty short-form fallback');
  }

  // ── Decision B: Enscribe's vocabulary wins over remark's HTML block ─────────
  {
    // A standalone `<blockquote>…</blockquote>` line. If remark's HTML-block
    // construct claimed it, the content would pass through as raw HTML and the
    // `$…$` would survive literally. Because Enscribe claims it, the content is
    // recursively parsed and the math renders — proof Enscribe won.
    const html = render('<blockquote>note $E=mc^2$ here</blockquote>');
    assert.ok(html.includes('<blockquote>'), 'renders a real <blockquote> element');
    assert.ok(html.includes('katex'), 'blockquote content is recursively parsed (math renders)');
    assert.ok(!html.includes('$E=mc^2$'), 'no raw-HTML passthrough (the $…$ is consumed)');
    console.log('PASS: <blockquote>…</blockquote> — Enscribe wins over remark HTML block (decision B)');
  }

  // ── Same-name nesting limitation (decision C): first close wins ─────────────
  {
    // `<b>a<b>b</b>c</b>`: the first `</b>` closes the OUTER tag, so the
    // captured content is `a<b>b`. Re-parsing that leaves the inner `<b>` as an
    // empty tag (no same-line close of its own). This is the documented
    // limitation — pinned here so a future same-name-nesting fix is findable.
    const html = render('<b>a<b>b</b>c</b>');
    assert.ok(
      html.includes('<b></b>'),
      'same-name nesting: inner <b> is empty (first </b> closed the outer)',
    );
    console.log('PASS: same-name nesting first-close-wins limitation (documented)');
  }

  // ── Multi-line long-form is byte-identical (regression guard) ──────────────
  {
    const html = render('<b>\nmline\n</b>');
    assert.ok(html.includes('<b>mline</b>'), 'multi-line long-form unchanged');
    console.log('PASS: multi-line long-form unchanged (regression guard)');
  }

  // ── Indented long-form closing tag is recognized (#276) ────────────────────
  // A multi-line `</tag>` carrying leading indentation still closes its opener instead of
  // erroring with "long-form tag has no closing tag". The TAB case is the important one:
  // micromark preprocesses a leading tab into virtual-space codes, so the close tokenizer must
  // skip with markdownSpace (which matches space + those virtual spaces — NOT the literal tab 9),
  // not a bare 32/9 test.
  {
    const tab = render('<aside>\nbody\n\t</aside>');
    assert.ok(!/tag-error|\?\?/.test(tab), 'tab-indented </aside> closes (no tag-error)');
    const spaces = render('<aside>\nbody\n    </aside>');
    assert.ok(!/tag-error|\?\?/.test(spaces), '4-space-indented </aside> closes (no tag-error)');
    console.log('PASS: indented long-form closing tag recognized (#276)');
  }

  // ── Indented nested <list> still balances (#276 regression guard) ──────────
  // The nestable <list> depth-counts inner <list>/<\/list> to find its balanced close. Making the
  // CLOSER indent-tolerant without the symmetric OPENER skip would let an indented inner </list>
  // close the OUTER list prematurely, leaving a stray list-item. Guard: no error and no stray
  // list-item (the premature-close signature), matching the flush form's balance.
  {
    const proc = buildEnscribePipeline({ embedResources: false, dslMode: 'skip' });
    const counts = (src) => {
      const root = proc.parse(src);
      let listItem = 0, err = 0;
      const walk = (n) => {
        if (n.type === 'enscribeTagError') err++;
        if (n.type === 'enscribeTag' && n.tagname === 'list-item') listItem++;
        (n.children || []).forEach(walk);
      };
      walk(root);
      return { listItem, err };
    };
    const flush = counts('<list>\n<li> a\n<list>\n<li> x\n</list>\n<li> b\n</list>');
    const indented = counts('<list>\n<li> a\n\t<list>\n\t<li> x\n\t</list>\n<li> b\n</list>');
    assert.equal(indented.err, 0, 'indented nested <list>: no parse error');
    assert.equal(indented.listItem, flush.listItem,
      'indented nested <list>: no stray list-item — outer list not closed prematurely');
    console.log('PASS: indented nested <list> balancing preserved (#276 regression guard)');
  }

  console.log('All same-line long-form tests passed.');
}
