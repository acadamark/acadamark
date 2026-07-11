// Browser-side diagnostics routing (#402) — the live half of the reporting seam.
//
// The CLI surfaces file.messages through vfile-reporter + the emitted recap script
// (packages/cli/src/diagnostics.js). A live render has no terminal and emits no file,
// so its channel is the browser console: every public render façade routes the run's
// messages here when it completes. One line per message, with every provenance field
// the producer supplied — the same "[enscribe] file:line:col — message [kind]" shape
// the CLI's embedded recap script prints, so an author sees one format whether the
// document was rendered at build time or live.

/** One console line for a vfile message: "[enscribe] file:line:col — message [kind]". */
export function formatDiagnostic(m) {
  const where = m.file
    ? String(m.file) + (m.line != null ? `:${m.line}${m.column != null ? `:${m.column}` : ''}` : '') + ' — '
    : '';
  const kind = m.source ? (m.ruleId ? `${m.source}:${m.ruleId}` : m.source) : m.ruleId;
  return `[enscribe] ${where}${m.reason ?? m}${kind ? ` [${kind}]` : ''}`;
}

/**
 * Route a completed run's messages to the console (console.error for a fatal message,
 * console.warn otherwise). A no-op for a clean run. Returns the file for chaining.
 */
export function routeMessagesToConsole(file) {
  for (const m of file?.messages ?? []) {
    (m.fatal ? console.error : console.warn)(formatDiagnostic(m));
  }
  return file;
}
