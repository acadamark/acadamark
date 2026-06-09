// #36 strict mode — CSS for the markdown-lint flag.
//
// Injected as a scoped <style> ONLY when a document is in `strict` mode, so
// non-strict output (on / literal) is byte-identical (the sidenote / margin
// CSS-injection model). A STRING CONSTANT (not an fs read) so the browser bundle
// stays fs-free, matching MARGIN_CSS / CHAPTER_NAV_JS. Reuses the warning-callout
// tokens from the consumer's default.css with literal fallbacks so the flag is
// visible even without it.

export const STRICT_FLAG_CSS = `/* Strict mode (#36): visible lint on would-be-markdown text. Injected only in strict. */
.enscribe-md-flag {
  background: var(--enscribe-callout-warning-bg, #fff8e1);
  color: var(--enscribe-callout-warning-accent, #8a6d1f);
  border-bottom: 1px dotted var(--enscribe-callout-warning-accent, #8a6d1f);
  border-radius: 2px;
  cursor: help;
}
`;
