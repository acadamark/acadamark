// String constants for the `file.data.*` keys plugins use to communicate
// during a pipeline run.
//
// Per `notes/specs/interpreter.md` §9 and `notes/specs/pipeline.md` §11, the
// VFile's `data` property is the plugin-communication bus. The keys below
// are the project-wide set; every plugin that reads or writes one should
// import the constant rather than the literal string, so the connections
// between writers and readers are grep-discoverable and so a typo in one
// place breaks a test rather than silently dropping the connection.

export const ACADAMARK_CONFIG             = 'acadamarkConfig';
export const ACADAMARK_REGISTRY           = 'acadamarkRegistry';
export const ACADAMARK_CITATIONS          = 'acadamarkCitations';
export const ACADAMARK_NOTES_PENDING      = 'acadamarkNotesPending';
export const ACADAMARK_NUMBERING_PENDING  = 'acadamarkNumberingPending';
