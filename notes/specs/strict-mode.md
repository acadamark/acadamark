# Strict mode — design (#36)

## The idea

A document-level `<config>` kwarg that controls **how strict the reader is** about which authoring registers it interprets, with three states. It exists because enscribe gives most constructs more than one way to write them, and a committed author may want to switch the looser ones off — either to type those characters literally, or with the system actively nudging them toward the canonical form.

## Background: the three registers

Most enscribe constructs can be written three ways:
- **canonical** — the named tag (always exists): `<section>`, `<list>` + `<li>`, `<blockquote>`, `<a URL | text>`.
- **sigil** — a shorthand where one exists: `<# Heading #>`, `<-> item`, `<$ math $>`.
- **markdown idiom** — the familiar markdown form where one exists: `# Heading`, `- item`, `*italic*`, `> quote`, `` `code` ``.

Strict mode bans the looser registers from the top down. Crucially, **every looser form maps to a canonical one** — the lists work closed the last gap (the bare `-` item and the `<->` sigil both have the canonical `<li>` marker). That completeness is the precondition strict mode waited on: turning a register off loses no expressiveness, because the canonical register covers everything the looser ones do.

## The three states

`<config strict-mode=...>` — three values, each naming the **loosest register still interpreted**:

- **`off`** (default) — all three registers interpret. This is today's behavior; existing documents are unaffected.
- **`sigil`** — canonical and sigil interpret; the **markdown** register is off, and markdown characters pass through as themselves. A committed author types `*`, `#`, `-`, `>`, `` ` `` literally with **no escaping** — `*foo*` renders as the four characters `*foo*`, not as emphasis. Would-be-markdown text is flagged.
- **`canonical`** — only the **canonical named-tag** register interprets; both the markdown **and** the sigil registers are off. `<# Heading #>`, `<$ math $>`, `<->`, `<*>` pass through literal too, alongside the markdown idioms. Would-be-markdown **and** would-be-sigil text is flagged. Two shorthands stay live as exceptions (below).

The naming is a strictness ladder: `off` < `sigil` < `canonical`. Each rung bans one more register than the one before.

### Two exceptions that stay live in `canonical`

- **The canonical `<li>` list item.** Lists are authored with `<li>` (canonical), `<->`/`<*>` (sigil), or `-`/`*` (markdown). `canonical` disables the sigil and markdown item forms, but `<li>` is canonical and stays live — so lists remain authorable in `canonical` mode.
- **The `^{}` / `_{}` sup/sub shortcuts.** These are TeX shortcuts, not part of the sigil register (the project taxonomy keeps them separate). They stay live in every mode, including `canonical`. `x^{2}` still renders sup.

## What never changes: native inferences

Two things are **always on**, in every state, because they aren't a disableable register — they're enscribe-native structural inferences:
- blank line → paragraph break
- section nesting by level

The subtle case is headings. The bare `#` markers (markdown) and `<# … #>` (sigil) are bannable sugar — flagged in `sigil` / `canonical` respectively. But the **section nesting** those levels produce is native — so when you write `<section>` (canonical), the nesting still happens automatically. Strict bans the sugar, not the structural behavior it triggered.

## The flag (any non-`off` rung)

Would-be-shorthand text is wrapped in a visible marker (a span with a class that CSS colors) so the author sees it and can convert it to the canonical form. Properties:
- **Always renders** — the text still appears; the flag is a mark, never a hard failure (consistent with always-renders).
- **Rides every non-`off` rung** — `sigil` flags would-be-**markdown**; `canonical` flags would-be-markdown **and** would-be-**sigil** (`<# … #>`, `<$ … $>`, `<->`, `<*>`). There is no silent passthrough mode — turning a register off and flagging its leftovers go together.
- **Heuristic** — it scans otherwise-literal text for patterns that would have been the disabled register(s): markdown (`*…*`, backticks, links/images `[…](…)`, leading `#`/`>`/`-`/ordered markers) and, in `canonical`, the sigil forms. It errs toward flagging; a false positive is just a nudge the author can confirm and ignore.
- **Output-neutral when `off`** — the flag CSS is injected only for a non-`off` rung, so `off` documents are byte-identical (mirroring how the sidenote CSS is injected only in margin mode).

## A free property: lossless round-trip

Because turning a register off loses no expressiveness, a `sigil` or `canonical` document uses only the registers above the floor — which round-trip eHTML ↔ shorthand cleanly. The lossy round-trip element was the ambiguous markdown `#` (a serialized `<section>` could have been authored `# H` or `<section>`); a register-banned document has none, so it serializes back losslessly. **`enscribe lift` honors the document's `strict-mode`**: a `sigil`/`canonical` document is re-parsed with the matching register(s) off, so its literal `# H` / `*x*` / `<# H #>` stays literal text through the round-trip. An `off` document keeps the markdown-on parse — lossy by design, and that is accepted; round-trip is only ever expected for sigil/canonical/eHTML documents.

## Where it lives in the pipeline

This is purely an Enscribe shorthand → eHTML *interpretation* setting — it changes how shorthand is read, nothing downstream. eHTML and JATS export are unaffected by the mode.

## Scope: document-level now, project-level via #72

The `<config>` kwarg sets the mode per document. A single project-wide setting (one declaration covering every file) is deferred to multi-file authoring (#72) — it's question 4 in that issue. Document-level lands here; the project-level inheritance arrives with the manifest.

## Resolved (build, #36)

- **The kwarg name is `strict-mode`** — `<config strict-mode=off|sigil|canonical>`, with a matching `strictMode` render option (the option wins over the in-document `<config>`, mirroring `note-position`). It realizes the former reserved `strict-mode` config key.
- **The mechanism is "parse off; re-parse with the register(s) disabled."** The document is parsed normally first (so config-discovery can find `<config strict-mode>` anywhere). For `sigil`, the source is re-parsed with the CommonMark/gfm/math idiom constructs disabled (micromark `disable`). For `canonical`, the source is re-parsed with the markdown idioms disabled **and** the sigil register removed from the finder — `enscribeSyntax({ sigils: false })` via `remarkEnscribe({ sigils: false })`, a sigil-less variant of the boundary finder (the sigil tokenizers are not micromark-named constructs, so `disable` cannot target them). The recursive-content sub-parses run in the same mode, so the register(s) are off inside tag pipe bodies too. No source-slicing or AST reconstruction. The `off` path is the unchanged single parse → byte-identical default. See `packages/enscribe/src/interpreter/lib/strict-mode.js` and `packages/enscribe/src/parser/syntax.js`.
- **The flagged set is the disabled register(s) in full** — markdown: emphasis `*…*`, inline code `` `…` ``, links and images `[…](…)` / `![…](…)`, leading `#`/`>`/`-`/`+`/`*`/ordered-list markers; and, in `canonical`, the sigils: `<# … #>`, `<$ … $>`, `` <` … `> ``, `<->`, `<*>`. The lint scans literal text nodes line by line (block markers are line-anchored), so every line of a literal block — a bullet list, a quote — is flagged, not just its first. `<li>` (canonical) and `^{}`/`_{}` (shortcuts) are never flagged.
- **The lint is a nudge, not a rule.** It always renders the text and errs toward flagging; a false positive is harmless.
- **`lift` (and `lower`) honor the mode.** Both `enscribe lift` and `enscribe lower` route through `liftToCanonicalMdast`, which reads the document's `<config strict-mode>` and parses with the matching register set, so sigil/canonical documents round-trip losslessly; `off` keeps the markdown-on parse (byte-identical, lossy by design).
