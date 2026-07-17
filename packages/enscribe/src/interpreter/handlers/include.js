// `__include-error` handler (#424) — the visible degrade for a failed `<include>`
// splice: an include CYCLE (the one prohibited topology — the marker names the
// chain, `??include cycle: a.emd → b.emd → a.emd??`) or an unloadable target.
// Emitted by the assembler (master-document/assemble.js) straight into the
// pre-pipeline tree; rendered here in the asset/library error family's shape
// (a role=alert block, ⚠-prefixed). always-renders: a failed splice is never a
// silent drop. (Family CSS is #413's scope — all error blocks style together.)

/**
 * @param {object} _state - hast state (unused)
 * @param {object} node   - enscribeTag with tagname '__include-error'
 * @returns {import('hast').Element}
 */
export function includeErrorHandler(_state, node) {
  const src = node.kwargs?.src ?? '';
  const message = node.kwargs?.message ?? 'include could not be spliced';
  return {
    type: 'element',
    tagName: 'div',
    properties: {
      className: ['enscribe-include-error'],
      role: 'alert',
      ...(src ? { dataSrc: src } : {}),
    },
    children: [{ type: 'text', value: `⚠ ??${message}??` }],
  };
}

// `__master-src-error` handler (#413 S1) — the visible flagged placeholder for a structural child
// (`<chapter/section/preface/… src>`) whose file could not be loaded. A ~mirror of includeErrorHandler
// in the SAME role=alert family (so the name-agnostic family selector at default.css:469 styles it with
// no new CSS), but its own `enscribe-master-src-error` class so the failure reads as a missing
// structural child, not a failed <include>. Emitted by master-document/assemble.js; the chapter marker
// around it is preserved, so the chapter keeps its number and this is its placeholder body.
export function masterSrcErrorHandler(_state, node) {
  const src = node.kwargs?.src ?? '';
  const message = node.kwargs?.message ?? 'could not load a structural child source';
  return {
    type: 'element',
    tagName: 'div',
    properties: {
      className: ['enscribe-master-src-error'],
      role: 'alert',
      ...(src ? { dataSrc: src } : {}),
    },
    children: [{ type: 'text', value: `⚠ ??${message}??` }],
  };
}
