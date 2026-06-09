// String constants for the `file.data.*` keys plugins use to communicate
// during a pipeline run.
//
// Per `notes/specs/interpreter.md` §9 and `notes/specs/pipeline.md` §11, the
// VFile's `data` property is the plugin-communication bus. The keys below
// are the project-wide set; every plugin that reads or writes one should
// import the constant rather than the literal string, so the connections
// between writers and readers are grep-discoverable and so a typo in one
// place breaks a test rather than silently dropping the connection.

export const ENSCRIBE_CONFIG             = 'enscribeConfig';
export const ENSCRIBE_REGISTRY           = 'enscribeRegistry';
// #36 strict mode: the resolved markdown register mode ('on' | 'literal' |
// 'strict'), set by resolveMarkdownMode before recursive-content so the sub-parse
// inner processor (and the strict lint) can read it.
export const ENSCRIBE_MARKDOWN_MODE      = 'enscribeMarkdownMode';
export const ENSCRIBE_CITATIONS          = 'enscribeCitations';
export const ENSCRIBE_NOTES_PENDING      = 'enscribeNotesPending';
export const ENSCRIBE_NUMBERING_PENDING  = 'enscribeNumberingPending';
