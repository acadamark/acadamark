// The diagnostics seam (#402 + #415) — the ONE place `file.messages` becomes author-visible.
//
// The pipeline accumulates diagnostics on the vfile (the unified model) and, before this
// module, no surface ever printed them — the channel was write-only (#402). Every document-
// emitting command now surfaces the SAME message stream through three channels, all consumed
// here; no pipeline plugin knows channels exist:
//
//   1. Terminal, as they occur — each document's messages print to stderr when that
//      document's run completes (per-document granularity: the vfile model accumulates per
//      run, so "as they occur" means per page in a multi-page build, once for a single
//      document). Format: vfile-reporter, the unified ecosystem's off-the-shelf terminal
//      formatter (delegation principle — one convention authors already know from
//      remark/rehype tooling).
//   2. End-of-run summary — grouped by file, then by kind, with counts; SILENT when there
//      is nothing to say (zero messages ⇒ zero output).
//   3. Carried into the rendered document (#415) — diagnosticsScript() serializes the same
//      stream into the emitted page as a <script data-enscribe-diagnostics> block that
//      recapitulates each message to the browser console when the document is viewed, with
//      as much provenance as the producer supplied (file, line:column, kind/rule, message —
//      Ariel's #412 principle). Zero messages ⇒ zero bytes (no empty script blocks).
//      --fragment output carries no script (the shell furniture belongs to the host page).
//
// Quiet semantics (two "quiet" notions, two scopes — spec: delivery-modes.md §Diagnostics):
//   - `<config quiet>` (per-document) clears file.messages IN-pipeline
//     (enscribeQuietSuppression), so all three channels are naturally silent for that
//     document — nothing here needs to know.
//   - `--quiet` (per-invocation) silences the TERMINAL channels (1 + 2). It does not touch
//     channel 3: the artifact keeps its record — #415's point is that the terminal can be
//     ignored, the artifact travels.

import { reporter } from 'vfile-reporter';

/**
 * The grouping key for the summary (channel 2): the producer's `source[:ruleId]` when set;
 * else the `producer:` prefix convention most messages already carry ("cite-resolution: …",
 * "library-load: …"); else 'message'.
 */
export function messageKind(m) {
  if (m?.source) return m.ruleId ? `${m.source}:${m.ruleId}` : m.source;
  if (m?.ruleId) return m.ruleId;
  const prefix = /^([a-z][a-z0-9-]*):\s/.exec(String(m?.reason ?? ''));
  return prefix ? prefix[1] : 'message';
}

/**
 * A run-scoped collector for channels 1 + 2. One per CLI invocation.
 *
 * @param {object} [o]
 * @param {boolean} [o.quiet] - the --quiet flag: silence channels 1+2 (channel 3 unaffected).
 * @param {{ write: (s: string) => void }} [o.err] - the stderr sink (injected for tests).
 */
export function createDiagnostics({ quiet = false, err = process.stderr } = {}) {
  const files = [];
  return {
    /** Channel 1: print this document's messages now; remember them for the summary. */
    report(file) {
      if (!file || !Array.isArray(file.messages) || file.messages.length === 0) return;
      files.push(file);
      if (!quiet) err.write(reporter(file) + '\n');
    },
    /** Channel 2: the grouped end-of-run summary. Silent when there is nothing to say. */
    summary() {
      if (quiet || files.length === 0) return;
      const total = files.reduce((n, f) => n + f.messages.length, 0);
      const fileWord = files.length === 1 ? 'file' : 'files';
      const lines = [`enscribe: diagnostics summary — ${total} message${total === 1 ? '' : 's'} in ${files.length} ${fileWord}`];
      for (const f of files) {
        const name = f.path || f.history?.[0] || '(input)';
        const counts = new Map();
        for (const m of f.messages) counts.set(messageKind(m), (counts.get(messageKind(m)) ?? 0) + 1);
        lines.push(`  ${name}: ${f.messages.length}`);
        for (const [kind, n] of counts) lines.push(`    ${n} × ${kind}`);
      }
      err.write(lines.join('\n') + '\n');
    },
  };
}

/**
 * Channel 3 (#415): serialize a message stream into the emitted page. Returns '' for an
 * empty stream (zero bytes — no empty script blocks). The payload carries every provenance
 * field the producer supplied; the inline recap prints each to the viewer's console
 * (console.error for a fatal message, console.warn otherwise) in the same
 * "[enscribe] file:line:col — message [kind]" shape the browser engine uses live.
 * Escape-safe: every `<` in the JSON is emitted as <, so `</script>` and `<!--`
 * cannot occur inside the block regardless of message content.
 *
 * @param {Array} messages - vfile messages (or plain objects with the same fields).
 * @returns {string} a `<script>` block, or '' when there is nothing to carry.
 */
export function diagnosticsScript(messages) {
  const list = (messages ?? []).map((m) => {
    const o = { message: String(m.reason ?? m.message ?? m) };
    const file = m.file || m.path;
    if (file) o.file = String(file);
    if (m.line != null) o.line = m.line;
    if (m.column != null) o.column = m.column;
    const kind = m.source ? (m.ruleId ? `${m.source}:${m.ruleId}` : m.source) : m.ruleId;
    if (kind) o.kind = kind;
    if (m.fatal) o.fatal = true;
    return o;
  });
  if (list.length === 0) return '';
  const json = JSON.stringify(list).replace(/</g, '\\u003c');
  return `<script data-enscribe-diagnostics>(function(d){for(var i=0;i<d.length;i++){var m=d[i],w=m.file?m.file+(m.line!=null?":"+m.line+(m.column!=null?":"+m.column:""):"")+" — ":"";(m.fatal?console.error:console.warn)("[enscribe] "+w+m.message+(m.kind?" ["+m.kind+"]":""))}})(${json})</script>\n`;
}
