# Strict mode — design (#36)

## The idea

A document-level `<config>` kwarg that controls how the **markdown register** is treated, with three states. It exists because enscribe gives most constructs three ways to write them, and a committed author may want to switch the loosest one off — either quietly, or with the system actively nudging them toward tags.

## Background: the three registers

Most enscribe constructs can be written three ways:
- **canonical** — the named tag (always exists): `<section>`, `<list>`, `<blockquote>`, `<a URL | text>`.
- **sigil** — a shorthand where one exists: `<# Heading #>`, `<- item ->`, `<$ math $>`.
- **markdown idiom** — the familiar markdown form where one exists: `# Heading`, `- item`, `*italic*`, `> quote`, `` `code` ``, `[text](url)`.

Strict mode is about that third register. Crucially, **every markdown idiom now maps to a canonical (and often sigil) form** — the lists work closed the last gap (the bare `-` list got `<list>` + the `<- ->` sigil). That completeness is the precondition strict mode waited on: turning the whole markdown register off loses no expressiveness, because the other two registers cover everything it does.

## The three states

`<config markdown=...>` — three values:

- **`on`** (default) — all three registers interpret. This is today's behavior; existing documents are unaffected.
- **`literal`** — canonical and sigil interpret; the markdown register is off, and markdown characters pass through as themselves. A committed author can type `*`, `#`, `**`, `>` literally with **no escaping** — `*foo*` renders as the four characters `*foo*`, not as emphasis.
- **`strict`** — same interpretation as `literal` (markdown register off), **plus** the system flags markdown-looking text visibly, as a lint nudging the author toward the tag/sigil form.

The only difference between `literal` and `strict` is the flagging: `literal` is silent passthrough, `strict` is passthrough with a visible mark. Both keep canonical and sigil fully live — sigils are a real register, never flagged.

## What never changes: native inferences

Two things are **always on**, in every state, because they aren't markdown idioms — they're enscribe-native structural inferences:
- blank line → paragraph break
- section nesting by level

The subtle case is headings. The bare `#` / `##` markers are bannable markdown sugar (flagged in `strict`). But the **section nesting** those levels produce is native — so when you write `<# Heading #>` or `<section>`, the nesting still happens automatically. Strict bans the sugar, not the structural behavior it triggered.

## The flag (strict only)

Markdown-looking text is wrapped in a visible marker (a span with a class that CSS colors) so the author sees it and can convert it to a tag. Properties:
- **Always renders** — the text still appears; the flag is a mark, never a hard failure (consistent with always-renders).
- **Heuristic** — it scans otherwise-literal text for patterns that would have been markdown (`*…*`, leading `#`, leading `>`, `-`/ordered list markers, backticks, `[…](…)`). It errs toward flagging; a false positive is just a nudge the author can confirm and ignore.
- **Output-neutral when off** — the flag CSS is injected only when `strict` is active, so non-strict documents are byte-identical (mirroring how the sidenote CSS is injected only in margin mode).

## A free property: lossless round-trip

Because turning off the markdown register loses no expressiveness, a `literal` or `strict` document uses only canonical and sigil forms — which round-trip Layer 1 ↔ shorthand cleanly. The lossy element in round-tripping was the ambiguous markdown `#`; a register-banned document has none, so it serializes back losslessly for free.

## Where it lives in the pipeline

This is purely a Layer 2 → Layer 1 *interpretation* setting — it changes how shorthand is read, nothing downstream. Layer 1 and JATS export are unaffected by the mode.

## Scope: document-level now, project-level via #72

The `<config>` kwarg sets the mode per document. A single project-wide setting (one declaration covering every file) is deferred to multi-file authoring (#72) — it's question 4 in that issue. Document-level lands here; the project-level inheritance arrives with the manifest.

## Resolved (build, #36)

- **The kwarg name is `markdown`** — `<config markdown=on|literal|strict>`, with a matching `markdown` render option (the option wins over the in-document `<config>`, mirroring `note-position`). It realizes the former reserved `strict-mode` config key, which is retired.
- **The mechanism is "parse on; re-parse with markdown disabled."** The document is parsed normally first (so config-discovery can find `<config markdown>` anywhere). For `literal`/`strict`, the source is re-parsed with the CommonMark/gfm/math idiom constructs disabled (micromark `disable`), so `*`, `#`, `-`, `>`, `` ` ``, `[](…)`, `$…$` are plain text *everywhere*, including inside tag pipe bodies (the recursive-content sub-parses run idioms-off too). No source-slicing or AST reconstruction. The `on` path is the unchanged single parse → byte-identical default. See `packages/enscribe/src/interpreter/lib/markdown-mode.js`.
- **The flagged set is the markdown register in full** — emphasis `*…*`, inline code `` `…` ``, leading `#`/`>`/`-`/`+`/`*`/ordered-list markers, and `[…](…)`. The strict lint scans literal text nodes line by line (block markers are line-anchored), so every line of a literal block — a bullet list, a quote — is flagged, not just its first.
- **The lint is a nudge, not a rule.** It always renders the text and errs toward flagging; a false positive is harmless. (`[…](…)` is flagged even though enscribe does not currently interpret a markdown link idiom — it is would-be-markdown, and over-flagging is sanctioned.)