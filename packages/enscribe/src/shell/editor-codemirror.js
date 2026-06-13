// The default host-side editor adapter (#214 — the editor seam from #213).
//
// The live shell's editor, shipped as a shell-LAYER module rather than hand-copied inline into
// every shell. Per #213, CodeMirror stays HOST-side and OUT of the core engine bundle — so this
// is shipped *alongside* the engine, not folded into it. A shell imports `codeMirrorEditorFactory`
// and passes it to `mountLiveBookShell` as `editorFactory`; the engine calls it ONLY when editing
// is on, so read mode never loads CodeMirror. A host may pass its own factory instead.
//
// CodeMirror is lazy-imported from a CDN INSIDE the factory, so merely importing this module loads
// nothing. The reference path / bundling for a deployed shell is the shell EMITTER's job (a
// follow-on); here a fixture imports this file dev/package-relative.

/**
 * Build the default editor adapter: lazily load CodeMirror 6 (from a CDN) and turn a mount element
 * into an editor. Matches the #211 adapter seam — `mount(el, {value, onChange}) → {destroy()}` —
 * reporting every document change through `onChange`.
 *
 * @returns {Promise<{ mount: (el: Element, opts: { value: string, onChange: (source: string) => void }) => { destroy(): void } }>}
 */
export async function codeMirrorEditorFactory() {
  const { EditorView, basicSetup } = await import('https://esm.sh/codemirror@6.0.1');
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
