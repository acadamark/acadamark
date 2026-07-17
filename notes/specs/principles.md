# Enscribe project principles

This document records the core working principles that govern design decisions in the enscribe project. Future slices should reference this document when a decision requires grounding in a principle.

## The always-renders principle

The product-shape decision behind this principle — *why* Enscribe never blocks the build — is recorded in `notes/decisions.md` ("Always renders — never block the build on an error"); this section holds the mechanics.

**The parser always produces a tree. The document always renders to something. Nothing an author writes silently vanishes — every authored construct either renders as itself, resolves to a sensible placement (loose or out-of-order structure is interpreted the way a reasonable reader would read it), or leaves a visible marker where it stood; content is never dropped without a trace. Every error is reported visibly at the location in the rendered output where it occurred. The author never sees a "compilation failed, no output" state with raw error messages, and the author never has to hunt for where an error happened.**

This is the hard requirement, and it is one requirement with two inseparable halves: **everything the author wrote reaches the output** — as itself, a sensible placement, or a visible marker, never a silent drop — *and* **the rendered output is where the author finds out about errors**. The two are distinct: a construct can be *preserved* (its content survives) yet its *failure* still be reported (a marker names what could not resolve), and a failure that renders a marker must still not swallow the content around it. Neither half implies the other; the guarantee owes both. Errors are represented as `enscribeTagError` or `enscribeParseError` nodes inline in the AST. These nodes render visibly — as error markers in the document at their source location, in the same house style the interpreter uses for the other "the author wrote a reference the system couldn't resolve" cases (`??ref: id??` for an unresolved cross-reference, `??cite: key??` for an unresolved citation, an inline table-parse-error marker for a malformed table body). Surrounding content continues to render normally; the error marker localizes the problem to where it occurred.

The principle holds throughout the pipeline: parse errors, grammar errors, and semantic errors all produce AST nodes, never exceptions that halt output, and every such node has a visible rendering in the document at its location.

### Localized recovery is part of the guarantee

Localized error recovery — each error contained to its immediate construct, with content after the error rendering normally — is the machinery by which the guarantee's "at the location where it occurred" half is honored. It is not an optional refinement. If a single early error consumes the rest of the document, the document does not render *at the location of the error*; an entire downstream region renders as "consumed by the error" rather than as the content the author wrote. The author may still see *some* output, but they cannot tell from the output where the actual problem is, and the rest of the document is silently suppressed. That violates the second half of the guarantee even though it preserves the first half in a degenerate sense.

Where localized recovery is genuinely hard to implement, the resulting shortfall is a **known gap** against the guarantee — not a permitted exception — tracked as a backlog item, with the long-run direction to close it even when the route is unclear. (The instance once cited here — a tag opened before a blank line consuming to EOF — was *resolved* rather than left open: the EOF-only termination design makes it an acknowledged bounded tradeoff, not a gap. See *Current known gaps against the guarantee* below.)

### Current known gaps against the guarantee

**No gaps remain open against the guarantee at the time of this writing.** The previously-tracked gaps are closed:

- **The parser-error-node renderer** — closed as of `e17a892`. `enscribeParseError` and `enscribeTagError` nodes now render as visible `<parse-error>??parse: …??</parse-error>` and `<tag-error>??tag: …??</tag-error>` markers via the compile-step handlers in `packages/enscribe/src/interpreter/handlers/parser-errors.js`.

- **Blank-line / EOF consumption** — resolved per the Option A design (decided 2026-05-26). A blank line inside an open tag is a paragraph break, not a terminator; multi-paragraph tag content is allowed; a tag terminates only on its explicit closing `>` or at EOF; an unclosed tag is detected at EOF and produces a visible `enscribeTagError` at its opening position. The previous "the tag consumes across the blank line" framing was based on the opposite design (blank-line-terminates) being assumed correct — the Option A ruling resolved the open question and confirmed the existing tokenizer behavior is the right behavior. Integration fixtures `document-23-multi-paragraph-tag-content.emd` and `document-24-unclosed-tag-at-eof.emd` pin both halves against regression. The design itself is recorded in `DESIGN.md`.

**One acknowledged bounded tradeoff** of the EOF-only design (not a gap): an unclosed tag near the top of a long document swallows the rest of the document into the error node's source. The error still renders visibly at the open position, and the conspicuously missing downstream content is itself a strong author signal — so the always-renders guarantee holds. Tighter localization (a structural-boundary terminator earlier than EOF) was considered and rejected: it would require detecting blank-line-followed-by-a-tag-opener, reintroducing exactly the blank-line-as-signal heuristic Option A was chosen to avoid. If tighter localization is ever needed, it remains an incremental future change — not foreclosed by EOF-only.

With both gaps closed, the always-renders guarantee is fully honored in the current implementation.

### The always-renders doctrine — how a mistake reaches the author (#413/#465)

The guarantee above says *what* must hold; this is the operational **doctrine** for *how* every mistake
is surfaced, so the treatment is uniform wherever a construct can fail (Ariel, 2026-07-17):

> The document never fails. Nothing fails silently. Mistakes render as transparently and intuitively as
> possible — the author gets a document, and by reading it can see the errors and usually infer what
> they did wrong.

The rules that follow from it:

- **Always both channels.** Every mistake is surfaced in **two** places at once: an **in-document flag**
  (a visible marker where the construct stood) *and* a more descriptive **warning on the stream** —
  printed to the CLI (`stderr` + the end-of-run summary) or, for a live/browser render, the console.
  The stream carrier is the vfile message seam (`file.message(reason, node, ruleId)`); the CLI seam
  (`packages/cli/src/diagnostics.js`) also recapitulates it into every emitted page. A control that
  ships one channel without the other is a defect (the #443/#465 failure). When a warning is produced
  *after* the diagnostics seam has already run — a late producer on a page-emitting path — it is
  re-delivered to all channels rather than dropped (`diag.reportLate`, #465).

- **Duplicate information → first-wins + a flag.** When two sources define the same thing, keep the
  **first in source order** and leave a visible duplicate flag (plus the warning). Examples: a `<fig>`
  with both a `src=` and an inline body keeps the `src` (the head precedes the body); duplicate
  citation keys / asset ids keep the appropriate one and flag the collision.

- **Missing information → a flag.** A reference to something that isn't there (a missing format on a
  dataset→table, an unresolved `@id` / `<ref>` / `<cite>`, an unsupported format word) leaves a visible
  flag naming the miss + the warning — never a silent fallthrough or a misleading auto-detect.

- **A placement element that produces nothing → a visible placeholder.** A deferred master-scope
  `<toc>`/`<endnotes>`, or an authored `<bibliography>` that resolved no citations, leaves a small
  visible placeholder where it stood (+ the warning), rather than vanishing. A placeholder is
  conceptually distinct from an *error* (produces-nothing vs a mistake), but it shares the error
  family's diagnostic-box **voice** — the wording ("deferred", "empty") distinguishes it. (Gated on the
  element being *authored*: a document that wrote nothing still renders nothing.)

- **Structure never fails the build.** A declared `<chapter/section/… src>` whose file is missing does
  **not** abort the build. The chapter **keeps its number** (the assembler preserves the numbered
  structure marker), renders a **flagged placeholder** in its place, and the CLI **names the missing
  path**. This holds on every build surface (static separate-pages, single-page, and the `--live`
  folder copy, #413 C2). The recommended pairing is that the reader still gets a navigable, numbered
  book with a clearly-flagged hole, not a "compilation failed" with no output.

- **No CLI path leaks a stack.** At the CLI boundary a filesystem failure or an internal invariant
  surfaces as one clean, named line, never a raw Node stack — every write routes through the shared
  guarded writer (`packages/cli/src/lib/safe-write.js`) and every throw is a `CliError`. A standing
  guard (`packages/cli/test/no-stack.test.js`) keeps this true.

**Where the shared machinery lives** (so a new failure joins the family instead of inventing its own):

- **The error/placeholder CSS family.** Inline markers (`parse-error`, `tag-error`, `ref-error`,
  `cite-error`, `import-error`) and one **name-agnostic block selector**
  `[role="alert"][class*="enscribe-"][class*="-error"]` (`default.css`) style the whole family. A new
  block marker inherits the look *for free* by rendering `<div class="enscribe-<x>-error" role="alert">⚠
  ??…??</div>` — **do not add a new named CSS rule** (it would re-baseline every inlined-CSS golden).
- **The marker taxonomy.** Internal marker tagnames dispatched by the interpreter's `INTERNAL_REGISTRY`
  (`interpret-plugin.js`): `__asset-error` / `__library-error` (resolution failures), `__include-error`
  (a failed `<include>` splice), `__master-src-error` (a missing structural child, #413 S1),
  `__placement-placeholder` (a produces-nothing placement, #413 S3), and the parser's
  `<parse-error>` / `<tag-error>`. The assembler mints its markers straight into the pre-pipeline tree;
  resolution plugins mint via `makeErrorNode` + `injectBodyErrors` (`lib/error-injection.js`).
- **The diagnostics seam** (`packages/cli/src/diagnostics.js`) and the vfile message stream carry the
  second channel; `notes/specs/settings.md` governs the display-settings controls that must obey the
  "no control ships ahead of its read path" corollary.

## The delegation principle

Enscribe does not re-implement what existing parsers already do well. Wherever an existing parser can handle work enscribe would otherwise need to do, enscribe delegates. Bare `$x$` is parsed by `remark-math`. Bare `` `code` `` is parsed by remark's code-span tokenizer. Bare `# Heading` is parsed by remark's heading tokenizer. Enscribe only does novel work — the tagged shorthand and the eHTML vocabulary.

See `notes/specs/idioms.md` for the full statement of this principle including its two-layer form.

## The spec-first principle

When implementation reveals a question that the existing specs don't answer, the spec is updated before coding. Ambiguity buried in code is expensive. Ambiguity surfaced in specs is cheap.

Corollary: if a prompt asks for X but X raises a design question, the question is surfaced rather than resolved by guessing. Guesses in the parser are load-bearing and propagate.

## The maximum-correct-output principle

Where a document contains both correct and erroneous constructs, the parser produces the maximum possible correct output. Errors are represented inline; they do not suppress surrounding correct content.

This principle is the counterpart of the always-renders guarantee viewed from the output side: always-renders says the document and its errors must both reach the reader, at their actual locations; maximum-correct-output says the correct parts of the document must reach the reader in full, never traded away to simplify error handling. Both halves of always-renders (the rendering half and the localized half) are what make maximum-correct-output achievable in practice — see the *current known gaps* note in the always-renders section for the places where the practice currently falls short of the principle.

## The parser-knows-nothing-about-meaning principle

The shorthand parser produces generic `enscribeTag` nodes. A separate interpretation pass converts those nodes into specific HTML based on tag name and the eHTML vocabulary entry for that tag. Parsing and interpretation are kept separate because:

- New tags can be added without touching the parser.
- Tag semantics can evolve without parser changes.
- Alternative interpretations (a different output dialect, a different downstream target) can reuse the parser unchanged.
- Bugs in interpretation do not cascade into parsing.

This principle is the structural reason new vocabulary entries are added by registering a vocabulary `.md` file under `packages/ehtml/elements/`, not by modifying any parser file. The parser is closed for modification when adding ordinary vocabulary; the interpretation layer is open.
