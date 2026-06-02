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

import { mermaidHandler } from './mermaid.js';
import { abcHandler } from './abc.js';

// engine (format word) → render handler. Mirrors the diagram host's accept-set.
const ENGINE_HANDLERS = {
  mermaid: mermaidHandler,
  abc: abcHandler,
};

/**
 * Handler for the `<diagram>` host. Dispatches on the engine format word.
 *
 * @param {object} state - mdast-util-to-hast state
 * @param {object} node  - enscribeTag with tagname "diagram"; positional[0] is the engine
 * @returns {import('hast').Element|{type:'root',children:Array}}
 */
export function diagramHandler(state, node) {
  const engine = node.positional?.[0] ?? null;
  const handler = engine ? ENGINE_HANDLERS[engine] : null;
  if (!handler) {
    // Defensive: the gate only ever injects mermaid/abc and the host
    // accept-set admits only those, so this is unreachable for valid input.
    // Emit a visible error rather than throwing.
    const source = typeof node.content === 'string' ? node.content : '';
    return {
      type: 'element',
      tagName: 'pre',
      properties: { className: ['enscribe-error'], 'dataEnscribeError': `unknown diagram engine "${engine ?? ''}"` },
      children: [{ type: 'text', value: source }],
    };
  }
  return handler(state, node);
}
