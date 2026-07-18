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

// `__placement-placeholder` handler (#413 S3) — the doctrine's "a placement element that produces
// nothing leaves a visible placeholder". Used where a placement marker (a master-scope <toc>/<endnotes>)
// would otherwise be silently dropped. It shares the error family's diagnostic-box VOICE (role=alert +
// an enscribe-*-error class → the name-agnostic family CSS at default.css:469, no new CSS); the message
// distinguishes a deferred/empty PLACEHOLDER from a mistake — see notes/specs/principles.md.
export function placementPlaceholderHandler(_state, node) {
  const message = node.kwargs?.message ?? 'this placement produced nothing';
  return {
    type: 'element',
    tagName: 'div',
    properties: { className: ['enscribe-placement-error'], role: 'alert' },
    children: [{ type: 'text', value: `⚠ ??${message}??` }],
  };
}

// `__strict-child-override` handler (#460) — strict-mode is DOCUMENT-WIDE: a multi-file child cannot
// override the master's <config strict-mode>. When a child declares its own, the master's setting still
// governs (a child cannot override), and this visible flag marks the ignored declaration where it stood
// — never a silent strip. The paired CLI/console warning is emitted by the assembler. Same role=alert
// family voice + name-agnostic class (no new CSS).
export function strictChildOverrideHandler(_state, node) {
  const message = node.kwargs?.message ?? 'a child cannot override the master’s document-wide strict-mode';
  return {
    type: 'element',
    tagName: 'div',
    properties: { className: ['enscribe-strict-override-error'], role: 'alert' },
    children: [{ type: 'text', value: `⚠ ??${message}??` }],
  };
}
