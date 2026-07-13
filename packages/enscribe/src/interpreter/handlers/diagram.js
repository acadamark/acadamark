// Diagram handler — the `<diagram>` host (#22 slice 3).
//
// `<diagram>` is the single host for external diagram engines (DESIGN.md
// §"The two axes: host and language"). The engine is the leading format-word
// positional (`<diagram mermaid | … >`, `<diagram abc | … >`); the host
// carries the figure role (counter, caption, frameable membership).
//
// This handler is a thin dispatcher: it reads the engine from positional[0]
// and delegates to the per-engine render handler. The engine handlers ignore
// node.tagname (they hardcode their `kind`), so delegating produces output
// byte-identical to the legacy `<mermaid>` / `<abc>` tags — which now expand at
// the gate to `<diagram mermaid>` / `<diagram abc>` shorthands. The diagram
// host's accept-set (interpreter/lib/host-accept-sets.js) is the set of engines
// admitted here.

import { extractFrameableChildren, renderFrameable, buildSourceDisclosure } from '../lib/frameable.js';

/**
 * Build a per-engine render handler. Every external diagram engine (mermaid,
 * abc, …) emits the same frameable pass-through markup: a `<pre>` wrapper
 * carrying `class="<engine>"` (the renderer's DOM-scan convention) and
 * `data-enscribe-dsl="<engine>"` (the enscribe build-time contract), the source
 * verbatim inside, plus the optional title / caption from the frameable surface
 * (and a "See source" disclosure under `showSource`, #19). The engine string is
 * the only thing that varies, so one factory produces them all (#170 — this
 * replaced the byte-identical `mermaid.js` / `abc.js` handler modules).
 * Rendering happens external to enscribe — in the consumer's browser (the CDN
 * library scans for the class) or a build-time pre-render keyed on
 * `data-enscribe-dsl`.
 *
 * @param {string} engine - the diagram engine / language (e.g. 'mermaid', 'abc')
 * @returns {(state:object, node:object, opts?:object) => import('hast').Element|{type:'root',children:Array}}
 */
function makeEngineHandler(engine) {
  return function engineHandler(state, node, opts) {
    const source = typeof node.content === 'string' ? node.content.trim() : '';
    const id = node.id ?? null;

    const classes = [engine];
    if (node.classes?.length) classes.push(...node.classes);

    const wrapperProps = { className: classes, 'dataEnscribeDsl': engine };
    if (id) wrapperProps.id = id;

    const { captionHast, titleHast } = extractFrameableChildren(state, node);

    return renderFrameable({
      kind: engine,
      bodyHast: [{ type: 'text', value: source }],
      wrapperEl: 'pre',
      wrapperProps,
      captionHast,
      titleHast,
      computedNumber: node.computedNumber ?? null,
      scope: node._scope ?? null,
      sourceDisclosureHast: opts?.showSource ? buildSourceDisclosure(source) : null,
    });
  };
}

// engine (format word) → render handler. Mirrors the diagram host's accept-set.
const ENGINE_HANDLERS = {
  mermaid: makeEngineHandler('mermaid'),
  abc: makeEngineHandler('abc'),
};

/**
 * Handler for the `<diagram>` host. Dispatches on the engine format word.
 *
 * @param {object} state - mdast-util-to-hast state
 * @param {object} node  - enscribeTag with tagname "diagram"; positional[0] is the engine
 * @param {object} [_vocab] - the vocabulary entry (unused; the host dispatches by engine)
 * @param {object} [opts]   - interpreter options; forwarded verbatim to the engine
 *                            handler so document-level switches like `showSource`
 *                            (#19) reach mermaid / abc.
 * @returns {import('hast').Element|{type:'root',children:Array}}
 */
export function diagramHandler(state, node, _vocab, opts) {
  const engine = node.positional?.[0] ?? null;
  const handler = engine ? ENGINE_HANDLERS[engine] : null;
  if (!handler) {
    // C2 (#437): an unknown/absent diagram engine is REACHABLE by ordinary authoring
    // (`<diagram bogus|…>` or `<diagram | …>`). It used to render the raw source in a bare
    // `<pre class="enscribe-error">` with the diagnosis buried in a `data-` attribute — visible
    // content, but no visible "this failed" signal. always-renders: emit the visible marker-family
    // block (the `⚠ [role=alert]` voice shared with asset/library/include errors) naming the bad
    // engine + the accepted set, with the source still shown below so nothing is lost. The located
    // seam warning rides the normalize gate's host-accept-set check (host:unaccepted-format).
    const source = typeof node.content === 'string' ? node.content : '';
    const accepted = Object.keys(ENGINE_HANDLERS).join(', ');
    return {
      type: 'element',
      tagName: 'div',
      properties: { className: ['enscribe-diagram-error'], role: 'alert' },
      children: [
        { type: 'text', value: `⚠ unknown diagram engine "${engine ?? ''}" — expected one of: ${accepted}. Showing the source:` },
        { type: 'element', tagName: 'pre', properties: {}, children: [{ type: 'text', value: source }] },
      ],
    };
  }
  return handler(state, node, opts);
}
