import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeFormat from 'rehype-format';
import rehypeStringify from 'rehype-stringify';
import rehypeSectionNesting from '../src/index.js';

// Acadamark Layer 1 (semantic) HTML. Sections are written flat — like
// LaTeX's \section, \subsection, \subsubsection — and the plugin nests
// them based on the named depth ladder.
//
// Note: <section-title> is the acadamark custom element for a section's
// title. In render mode (a separate downstream plugin, not yet built),
// these would be lowered to <h1>/<h2>/<h3> for browser default styling.
// In semantic mode, they stay as custom elements.
const input = `
<article id="article">
  <article-title>My Article</article-title>

  <section id="intro">
    <section-title>Introduction</section-title>
  </section>
  <p>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</p>

  <section id="first-section" class="numbered-section">
    <section-title>First Section</section-title>
  </section>

  <sub-section id="first-subsection">
    <sub-section-title>Sub Section of First</sub-section-title>
  </sub-section>
  <p>It has survived not only five centuries.</p>

  <sub-section id="second-subsection">
    <sub-section-title>Second Sub Section of First</sub-section-title>
  </sub-section>
  <p>Contrary to popular belief, Lorem Ipsum is not simply random text.</p>

  <section id="second-section" class="numbered-section">
    <section-title>Second Section</section-title>
  </section>
  <p>Lorem Ipsum comes from sections 1.10.32 and 1.10.33.</p>

  <section id="conclusion">
    <section-title>Conclusion</section-title>
  </section>
  <p>The first line of Lorem Ipsum.</p>
</article>
`;

const file = await unified()
  .use(rehypeParse, { fragment: true })
  .use(rehypeSectionNesting)
  .use(rehypeFormat)
  .use(rehypeStringify)
  .process(input);

console.log('=== INPUT ===');
console.log(input.trim());
console.log('\n=== OUTPUT ===');
console.log(String(file));
