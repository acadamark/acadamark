// The default host-side editor adapter (#214 — the editor seam from #213), with a small set of
// AUTHORING HELPERS (#212) wired as standard CodeMirror 6 extensions on the factory's `extensions`
// array — the intended #211 extension point. A demonstrative subset (not a full IDE): enough to show
// the editor is a real authoring surface.
//
// The live shell's editor, shipped as a shell-LAYER module rather than hand-copied inline into
// every shell. Per #213, CodeMirror stays HOST-side and OUT of the core engine bundle — so this
// is shipped *alongside* the engine, not folded into it. A shell imports `codeMirrorEditorFactory`
// and passes it to `mountLiveShell` as `editorFactory`; the engine calls it ONLY when editing
// is on, so read mode never loads CodeMirror. A host may pass its own factory instead.
//
// CodeMirror is BUNDLED into the shipped editor asset (not fetched from a CDN): the tsup `editor`
// build inlines the `codemirror` dependency into `dist/editor-codemirror.js`, and the package's
// `./shell/editor-codemirror.js` export ships that bundled file. Every CodeMirror import is a DYNAMIC
// import INSIDE the factory so merely importing this module still loads nothing — tsup inlines the
// dynamically-imported modules (code-splitting off) into the same asset and evaluates them lazily,
// only when the factory is called (i.e. when editing is on). So read mode never pays for CodeMirror.
// The authoring-helper imports (@codemirror/view, @codemirror/state) are the SAME deduped instances
// `codemirror` bundles, so they compose with `basicSetup` without a second CodeMirror in the graph.
//
// The three helpers (#212 — "just show that they can happen", not the full suite):
//   1. Enscribe-tag syntax highlighting — a ViewPlugin of muted decorations over the tag chrome
//      (`<tag`, sigils `#.@+`, attrs, `|`, `>`), rendered LIGHTER than the prose so tags are legible
//      but not distracting (and, after an import, show where the enscribe tags are).
//   2. `<cite @…` autocomplete — a completion source (ridden on basicSetup's autocompletion via
//      languageData) offering the document's bibliography keys, scraped from an inline
//      `<library bibtex | @type{key,…}>` block and from citations already in the doc.
//   3. Tag-name completion — typing `<fi…` suggests common canonical Enscribe tags.
// The `mount(el,{value,onChange}) → {destroy()}` adapter seam (#211) is unchanged.

// ── The tag names offered by helper 3 (a curated common set — a demonstration, not the full vocab) ──
const COMMON_TAGS = [
  'section', 'title', 'author', 'meta', 'abstract',
  'cite', 'ref', 'library', 'bibliography', 'note', 'marginnote',
  'fig', 'figure', 'table', 'code', 'code-block', 'diagram', 'math', 'equation',
  'data', 'dataset', 'item', 'nav', 'nav-group', 'book-part', 'chapter', 'appendix',
  'theorem', 'lemma', 'corollary', 'proof', 'remark', 'definition',
  'b', 'i', 'term', 'abbr', 'link', 'a',
];

// ── Helper 2's source: the document's bibliography keys ─────────────────────────────────────────────
// Scrapes the CURRENT editor content — the editor adapter only ever has the source text (the citation
// registry the engine computes is not plumbed to it), so the demonstrable, self-contained source is the
// document itself: BibTeX entry keys from an inline `<library bibtex | @type{key, …}>` block, plus keys
// already cited. (An EXTERNAL `<library src="refs.bib">` is not in the editor's text, so its keys are not
// offered — a documented limit of the demo, not a design choice.)
function collectBibKeys(doc) {
  const keys = new Set();
  // BibTeX entry keys: `@article{Smith2020,` → `Smith2020`.
  for (const m of doc.matchAll(/@\w+\s*\{\s*([^,\s{}]+)/g)) keys.add(m[1]);
  // Keys already cited: `<cite @Smith2020>` / `<cite @Smith2020 | …>`.
  for (const m of doc.matchAll(/<cite\s+@([\w:.-]+)/g)) keys.add(m[1]);
  return [...keys];
}

// A CodeMirror completion source: after `<cite @`, offer the document's bibliography keys. Returns null
// when the cursor is not in a `<cite @…` context, so it composes with the tag-name source below.
function citeCompletionSource(context) {
  const before = context.matchBefore(/<cite\s+@[\w:.-]*/);
  if (!before) return null;
  const from = before.from + before.text.lastIndexOf('@') + 1;   // insert after the `@`
  const keys = collectBibKeys(context.state.doc.toString());
  if (keys.length === 0) return null;
  return {
    from,
    options: keys.map((k) => ({ label: k, type: 'variable', detail: 'citation' })),
    validFor: /^[\w:.-]*$/,
  };
}

// A CodeMirror completion source: after `<` (a tag opener) offer common canonical tag names. Fires on
// `<x…` (or an explicit request on a bare `<`); it does NOT fire in the `<cite @…` key context above
// (that text has no `<tagname` ending at the cursor), so the two sources never collide.
function tagCompletionSource(context) {
  const before = context.matchBefore(/<\/?[\w-]*/);
  if (!before) return null;
  if (before.text === '<' && !context.explicit) return null;    // don't pop the whole list on a bare `<`
  const from = before.from + (before.text.startsWith('</') ? 2 : 1);
  return {
    from,
    options: COMMON_TAGS.map((t) => ({ label: t, type: 'type' })),
    validFor: /^[\w-]*$/,
  };
}

/**
 * Build the enscribe-tag syntax highlighter (helper 1): a ViewPlugin whose decorations mark the tag
 * CHROME — the `<tag` opener, sigils (`#id .class @ref +flag`), attribute name=value, the `|` content
 * separator, and the `>` closer — leaving the CONTENT (prose after `|`) undecorated so it keeps the
 * prose colour. A small state machine over the doc tracks tag nesting and the pre/post-`|` regions;
 * inline math `$…$` is skipped so a `<` inside math does not read as a tag. The theme colours the marks
 * LIGHTER than the prose (Ariel's preference). Built with the injected CodeMirror ctors so this module
 * still loads nothing until the factory runs.
 */
function makeTagHighlighter({ Decoration, ViewPlugin, RangeSetBuilder, EditorView }) {
  const marks = {
    tag: Decoration.mark({ class: 'cm-esc-tag' }),      // `<tag`, `>`
    sigil: Decoration.mark({ class: 'cm-esc-sigil' }),  // `#id .class @ref +flag`
    attr: Decoration.mark({ class: 'cm-esc-attr' }),    // `name=`
    string: Decoration.mark({ class: 'cm-esc-string' }),// `"…"` / `'…'`
    pipe: Decoration.mark({ class: 'cm-esc-pipe' }),    // `|`
  };
  const TAG_OPEN = /^<\/?[A-Za-z][\w-]*/;

  function buildDecorations(view) {
    const b = new RangeSetBuilder();
    const text = view.state.doc.toString();
    const n = text.length;
    const stack = [];                                   // { content: boolean } per open tag
    let i = 0;
    const add = (from, len, mark) => { if (len > 0) b.add(from, from + len, mark); };
    while (i < n) {
      const top = stack[stack.length - 1];
      const inHead = top && !top.content;               // inside a tag, before its `|`
      const c = text[i];
      // Inline math: skip a same-line `$…$` at the prose/content level so a `<` inside math is not read
      // as a tag. (Only when NOT in a tag head — a `$` inside attributes is left alone.)
      if (c === '$' && !inHead) {
        const close = text.indexOf('$', i + 1);
        const nl = text.indexOf('\n', i + 1);
        if (close > i && (nl === -1 || nl > close)) { i = close + 1; continue; }
      }
      if (c === '<') {
        const m = TAG_OPEN.exec(text.slice(i, i + 48));
        if (m) { add(i, m[0].length, marks.tag); stack.push({ content: false }); i += m[0].length; continue; }
        i++; continue;
      }
      if (!top) { i++; continue; }                      // prose outside any tag
      if (top.content) {                                // content region (prose); only `>` closes
        if (c === '>') { add(i, 1, marks.tag); stack.pop(); }
        i++; continue;
      }
      // inside a tag head
      if (c === '>') { add(i, 1, marks.tag); stack.pop(); i++; continue; }
      if (c === '|') { add(i, 1, marks.pipe); top.content = true; i++; continue; }
      if (c === '#' || c === '.' || c === '@' || c === '+') {
        const m = /^[#.@+][\w:.-]*/.exec(text.slice(i, i + 64));
        if (m && m[0].length > 1) { add(i, m[0].length, marks.sigil); i += m[0].length; continue; }
        i++; continue;
      }
      if (c === '"' || c === "'") {
        const j = text.indexOf(c, i + 1);
        const nl = text.indexOf('\n', i + 1);
        if (j > i && (nl === -1 || nl > j)) { add(i, j - i + 1, marks.string); i = j + 1; continue; }
        i++; continue;
      }
      const am = /^[A-Za-z][\w-]*(?=\s*=)/.exec(text.slice(i, i + 48));
      if (am) { add(i, am[0].length, marks.attr); i += am[0].length; continue; }
      if (c === '=') { add(i, 1, marks.attr); i++; continue; }
      i++;
    }
    return b.finish();
  }

  const plugin = ViewPlugin.fromClass(
    class {
      constructor(view) { this.decorations = buildDecorations(view); }
      update(u) { if (u.docChanged || u.viewportChanged) this.decorations = buildDecorations(u.view); }
    },
    { decorations: (v) => v.decorations },
  );

  // Muted palette — the tag chrome sits LIGHTER than the prose so the writing stays prominent. Mid-greys
  // read as "less emphatic than prose" on both a light and a dark editor; sigils get a faint blue tint so
  // ids/classes/refs stay scannable. Tunable — this is a demonstration of the capability, not a final theme.
  const theme = EditorView.baseTheme({
    '.cm-esc-tag': { color: '#8a8f98' },
    '.cm-esc-sigil': { color: '#6f8fb0' },
    '.cm-esc-attr': { color: '#8a8f98' },
    '.cm-esc-string': { color: '#8a8f98' },
    '.cm-esc-pipe': { color: '#b0b4bb' },
    '&dark .cm-esc-tag': { color: '#7d828b' },
    '&dark .cm-esc-sigil': { color: '#8098b6' },
    '&dark .cm-esc-attr': { color: '#7d828b' },
    '&dark .cm-esc-string': { color: '#7d828b' },
    '&dark .cm-esc-pipe': { color: '#6c7079' },
  });

  return [plugin, theme];
}

/**
 * Build the default editor adapter: lazily load the BUNDLED CodeMirror 6 (+ the authoring helpers, #212)
 * and turn a mount element into an editor. Matches the #211 adapter seam —
 * `mount(el, {value, onChange}) → {destroy()}` — reporting every document change through `onChange`.
 *
 * @returns {Promise<{ mount: (el: Element, opts: { value: string, onChange: (source: string) => void }) => { destroy(): void } }>}
 */
export async function codeMirrorEditorFactory() {
  // All CodeMirror imports are dynamic + inside the factory (read mode loads nothing). @codemirror/view
  // and @codemirror/state resolve to the SAME modules `codemirror` bundles (deduped in node_modules), so
  // the helper extensions compose with basicSetup without a second CodeMirror instance.
  const { EditorView, basicSetup } = await import('codemirror');
  const { Decoration, ViewPlugin } = await import('@codemirror/view');
  const { RangeSetBuilder } = await import('@codemirror/state');
  const { autocompletion } = await import('@codemirror/autocomplete');

  const tagHighlighting = makeTagHighlighter({ Decoration, ViewPlugin, RangeSetBuilder, EditorView });
  // Provide the helper completion sources via `override` — the explicit source list autocompletion honours.
  // basicSetup already adds `autocompletion()`; the completion StateField is a shared singleton, so this
  // second config does not duplicate the machinery — it just supplies the sources. Each source returns null
  // outside its context, so they compose (cite keys after `<cite @`, tag names after `<tag…`).
  const completion = autocompletion({ override: [citeCompletionSource, tagCompletionSource] });

  return {
    mount(el, { value, onChange }) {
      const view = new EditorView({
        doc: value,
        parent: el,
        extensions: [
          basicSetup,
          ...tagHighlighting,          // helper 1 (highlighting + theme)
          completion,                  // helpers 2 + 3 (cite / tag-name completion)
          EditorView.lineWrapping,
          EditorView.updateListener.of((u) => { if (u.docChanged) onChange(u.state.doc.toString()); }),
        ],
      });
      return { destroy() { view.destroy(); } };
    },
  };
}
