// Single factory for the enscribeTag default-attribute block (#256).
//
// The micromark handlers (parser/from-markdown.js: buildShortcutNode,
// buildItemMarkerNode, enterEnscribeLongFormTag) and the Peggy grammar
// (grammar/enscribe.peggy's defaultAttrs helper) must emit the SAME node shape
// field-for-field — the from-markdown.js header comment calls this out as a
// deliberately-coupled cross-surface invariant. This collapses the open-coded JS
// copies to one definition.
//
// Returns a FRESH object on every call, so the mutable `[]` / `{}` fields are never
// aliased across nodes (a shared array/object would let one node's positionals or
// kwargs leak into another).

/** A fresh default-attribute block for an enscribeTag node. */
export function defaultEnscribeTagAttrs() {
  return {
    positional: [],
    booleans: {},
    kwargs: {},
    id: null,
    classes: [],
    atRefs: [],
    rawArgs: '',
    selfClosing: false,
  };
}
