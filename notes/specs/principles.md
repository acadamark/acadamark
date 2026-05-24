# Acadamark project principles

This document records the core working principles that govern design decisions in the acadamark project. Future slices should reference this document when a decision requires grounding in a principle.

## The always-renders principle

**The parser always produces a tree. The document always renders to something. Every error is reported visibly at the location in the rendered output where it occurred. The author never sees a "compilation failed, no output" state with raw error messages, and the author never has to hunt for where an error happened.**

This is the hard requirement, and it is one requirement with two inseparable halves: the document renders, *and* the rendered output is where the author finds out about errors. Errors are represented as `acadamarkTagError` or `acadamarkParseError` nodes inline in the AST. These nodes render visibly — as error markers in the document at their source location, in the same house style the interpreter uses for the other "the author wrote a reference the system couldn't resolve" cases (`??ref: id??` for an unresolved cross-reference, `??cite: key??` for an unresolved citation, an inline table-parse-error marker for a malformed table body). Surrounding content continues to render normally; the error marker localizes the problem to where it occurred.

The principle holds throughout the pipeline: parse errors, grammar errors, and semantic errors all produce AST nodes, never exceptions that halt output, and every such node has a visible rendering in the document at its location.

### Localized recovery is part of the guarantee

Localized error recovery — each error contained to its immediate construct, with content after the error rendering normally — is the machinery by which the guarantee's "at the location where it occurred" half is honored. It is not an optional refinement. If a single early error consumes the rest of the document, the document does not render *at the location of the error*; an entire downstream region renders as "consumed by the error" rather than as the content the author wrote. The author may still see *some* output, but they cannot tell from the output where the actual problem is, and the rest of the document is silently suppressed. That violates the second half of the guarantee even though it preserves the first half in a degenerate sense.

Where localized recovery is hard to implement — for instance, blank-line termination in micromark's streaming model conflicts with multi-paragraph content, and a tag opened before a blank line currently consumes across the blank line or to EOF — the gap is a known shortfall against the guarantee, not a permitted exception to it. Such gaps are tracked as backlog items; the long-run direction is to close them, even when the route to closing them is unclear.

### Current known gaps against the guarantee

Two gaps are open against the guarantee at the time of this writing. They are recorded here, in the spec, so that future readers can see them as gaps rather than mistaking the present state for the intended state. The work to close them is tracked in `BACKLOG-ROADMAP.md`.

- **The parser-error-node renderer.** `acadamarkTagError` and `acadamarkParseError` nodes are produced by the parser but the interpreter has no compile-step handler for them, so they do not yet render as visible error markers. The guarantee says they should — in the house style described above. Closing this gap is the more impactful of the two; until it closes, parser errors fall through silently in the rendered output.

- **Blank-line / EOF consumption.** The micromark finder does not terminate open constructs at blank lines, so a tag opened before a blank line consumes across the blank line or to EOF rather than failing in place. This violates the "at the location where it occurred" half by causing the error's footprint to swallow content downstream. Tracked under "blank-line termination error recovery" (formerly DF-16); the route is partly a design question (where does the construct end?) and partly an implementation question (how does the streaming tokenizer notice the blank line in time?).

These two gaps are siblings: the first concerns whether produced error nodes are seen by the reader; the second concerns whether errors are bounded so the rest of the document is seen. Both must close for the guarantee to hold in full.

## The delegation principle

Acadamark does not re-implement what existing parsers already do well. Wherever an existing parser can handle work acadamark would otherwise need to do, acadamark delegates. Bare `$x$` is parsed by `remark-math`. Bare `` `code` `` is parsed by remark's code-span tokenizer. Bare `# Heading` is parsed by remark's heading tokenizer. Acadamark only does novel work — the tagged shorthand and the Layer 1 vocabulary.

See `notes/specs/idioms.md` for the full statement of this principle including its two-layer form.

## The spec-first principle

When implementation reveals a question that the existing specs don't answer, the spec is updated before coding. Ambiguity buried in code is expensive. Ambiguity surfaced in specs is cheap.

Corollary: if a prompt asks for X but X raises a design question, the question is surfaced rather than resolved by guessing. Guesses in the parser are load-bearing and propagate.

## The maximum-correct-output principle

Where a document contains both correct and erroneous constructs, the parser produces the maximum possible correct output. Errors are represented inline; they do not suppress surrounding correct content.

This principle is the counterpart of the always-renders guarantee viewed from the output side: always-renders says the document and its errors must both reach the reader, at their actual locations; maximum-correct-output says the correct parts of the document must reach the reader in full, never traded away to simplify error handling. Both halves of always-renders (the rendering half and the localized half) are what make maximum-correct-output achievable in practice — see the *current known gaps* note in the always-renders section for the places where the practice currently falls short of the principle.

## The parser-knows-nothing-about-meaning principle

The shorthand parser produces generic `acadamarkTag` nodes. A separate interpretation pass converts those nodes into specific HTML based on tag name and the Layer 1 vocabulary entry for that tag. Parsing and interpretation are kept separate because:

- New tags can be added without touching the parser.
- Tag semantics can evolve without parser changes.
- Alternative interpretations (a different output dialect, a different downstream target) can reuse the parser unchanged.
- Bugs in interpretation do not cascade into parsing.

This principle is the structural reason new vocabulary entries are added by registering a vocabulary `.md` file under `packages/layer1-vocabulary/elements/`, not by modifying any parser file. The parser is closed for modification when adding ordinary vocabulary; the interpretation layer is open.
