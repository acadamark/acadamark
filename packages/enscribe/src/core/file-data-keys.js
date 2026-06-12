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
// Slice A: the resolved document class ('article' | 'book' | 'book-part'), computed
// ONCE by enscribeDocTypeResolve from <meta type> (validated against meta.md's declared
// set) before the structuring plugins. The structuring plugins and the gate's
// book-context detection read this instead of re-reading <meta type> ad-hoc; the
// <book>/<article> wrapper they build is the derived artifact downstream keys off.
export const ENSCRIBE_DOC_TYPE           = 'enscribeDocType';
// #36 strict mode: the resolved strictness mode ('off' | 'sigil' | 'canonical'),
// set by resolveStrictMode before recursive-content so the sub-parse inner
// processor (and the strict lint) can read it.
export const ENSCRIBE_STRICT_MODE        = 'enscribeStrictMode';
export const ENSCRIBE_CITATIONS          = 'enscribeCitations';
// #133: pre-fetched <library src> content, keyed by the raw src string:
//   { [src]: { content: string } | { error: string } }
// Set by the async pre-load pass (browser renderAsync / the CLI render command)
// before runSync; buildCitationIndex consumes it for src nodes instead of a sync
// read/fetch (which the browser cannot do). Absent → buildCitationIndex falls back
// to readFileSync for filesystem paths (the sync CLI/processSync path, unchanged).
export const ENSCRIBE_LOADED_SOURCES     = 'enscribeLoadedSources';
export const ENSCRIBE_NOTES_PENDING      = 'enscribeNotesPending';
export const ENSCRIBE_NUMBERING_PENDING  = 'enscribeNumberingPending';
// Lazy live book rendering, L1 (#204): the harvested cross-reference registry —
// a Map(anchor -> { number, title, type }) read off the numbered tree + the
// numbering registry (ENSCRIBE_REGISTRY) by harvestCrossRefRegistry(). It is a
// READ-ONLY product of the global pass for the per-chapter render / L3 preview
// layer (a cross-chapter ref whose target chapter was never rendered still has its
// number+title here). Built from numbering's output — never re-numbered.
export const ENSCRIBE_CROSSREF_REGISTRY  = 'enscribeCrossRefRegistry';
