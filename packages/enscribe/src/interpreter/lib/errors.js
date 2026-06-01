// Error helpers for the enscribe interpreter.
//
// "Emit warning" per the design means a console.warn with a recognizable
// prefix. Errors are always visible in the rendered document via marker
// elements; warnings tell the author where to look.

const PREFIX = '[enscribe-interpreter] warning:';

export function warnUnknownTag(tagname) {
  // eslint-disable-next-line no-console
  console.warn(`${PREFIX} unknown tag <${tagname}>`);
}

export function warnValidation(tagname, message) {
  // eslint-disable-next-line no-console
  console.warn(`${PREFIX} validation [<${tagname}>]: ${message}`);
}

export function warnHandlerError(tagname, err) {
  const msg = err?.message ?? String(err);
  // eslint-disable-next-line no-console
  console.warn(`${PREFIX} handler error [<${tagname}>]: ${msg}`);
}

export function warnTitlePrecedence(tagname) {
  // eslint-disable-next-line no-console
  console.warn(`${PREFIX} [<${tagname}>] both meta <title> and pipe-supplied title found; meta wins`);
}

export function warnSkippedDocType(type) {
  // eslint-disable-next-line no-console
  console.warn(`${PREFIX} document type "${type}" is not handled by enscribeArticleStructuring; skipping structural wrapping`);
}
