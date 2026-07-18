// The citation-style single source (#445 relocated it here from library-load.js so the settings
// gear's picker and the pipeline's warned-default guard read ONE set — a second hand-kept list in
// the panel would drift exactly the way coding-conventions §2 forbids).
//
// C1 (#436): the accepted citation-style vocabulary — the warned-default guard for
// `<config citation-style=…>`, mirroring index.js's KNOWN_THEMES guard. A value OUTSIDE this set is a
// typo (e.g. "chicagoo") and warns through the seam + falls to the default; a value inside is passed
// through. The set is the documented styles (cite.md's Citation-styles table + config-options-doc's
// examples) plus citation-js's bundled CSL templates. NOTE the deeper gap this guard does NOT cover:
// only apa / vancouver / harvard1 are actually BUNDLED in citation-js 0.7; the rest (author-year,
// chicago-*, ieee, numbered, …) currently fall back to citation-js's default style at format time.
// That advertised-but-unbundled gap is tracked separately; C1's scope is narrower — catch the
// outright-invalid VALUE, the one true silent survivor of the always-render contract.

export const DEFAULT_CITATION_STYLE = 'chicago-author-date';
export const KNOWN_CITATION_STYLES = new Set([
  'apa', 'vancouver', 'harvard1',                                          // citation-js bundled CSL templates
  'chicago-author-date', 'chicago',                                        // the default + a common alias
  'author-year', 'numbered', 'footnote', 'endnote', 'inline-author-year',  // cite.md's documented styles
  'ieee',                                                                  // config-options-doc example
]);
