// The default host-side editor adapter (#214 — the editor seam from #213).
//
// The live shell's editor, shipped as a shell-LAYER module rather than hand-copied inline into
// every shell. Per #213, CodeMirror stays HOST-side and OUT of the core engine bundle — so this
// is shipped *alongside* the engine, not folded into it. A shell imports `codeMirrorEditorFactory`
// and passes it to `mountLiveShell` as `editorFactory`; the engine calls it ONLY when editing
// is on, so read mode never loads CodeMirror. A host may pass its own factory instead.
//
// CodeMirror is BUNDLED into the shipped editor asset (not fetched from a CDN): the tsup `editor`
// build inlines the `codemirror` dependency into `dist/editor-codemirror.js`, and the package's
// `./shell/editor-codemirror.js` export ships that bundled file. The import below is kept as a
// DYNAMIC import INSIDE the factory so merely importing this module still loads nothing — tsup
// inlines the dynamically-imported module (code-splitting off) into the same asset and evaluates it
// lazily, only when the factory is called (i.e. when editing is on). So read mode never pays for
// CodeMirror, and a load-bearing editor no longer depends on a third-party CDN resolving an unpinned
// dep tree at load (the CDN runtime import it replaced was failing to resolve its transitive
// `@codemirror/view`). A host may still pass its own `editorFactory` instead.

/**
 * Build the default editor adapter: lazily load the BUNDLED CodeMirror 6 and turn a mount element
 * into an editor. Matches the #211 adapter seam — `mount(el, {value, onChange}) → {destroy()}` —
 * reporting every document change through `onChange`.
 *
 * @returns {Promise<{ mount: (el: Element, opts: { value: string, onChange: (source: string) => void }) => { destroy(): void } }>}
 */
export async function codeMirrorEditorFactory() {
  const { EditorView, basicSetup } = await import('codemirror');
  return {
    mount(el, { value, onChange }) {
      const view = new EditorView({
        doc: value,
        parent: el,
        extensions: [
          basicSetup,
          EditorView.lineWrapping,
          EditorView.updateListener.of((u) => { if (u.docChanged) onChange(u.state.doc.toString()); }),
        ],
      });
      return { destroy() { view.destroy(); } };
    },
  };
}
