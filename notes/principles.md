# Acadamark project principles

This document records the core working principles that govern design decisions in the acadamark project. Future slices should reference this document when a decision requires grounding in a principle.

## The always-renders principle

**The parser always produces a tree. The document always renders to something. The author never sees a "compilation failed, no output" state with raw error messages.**

This is the hard requirement. Errors are represented as `acadamarkTagError` or `acadamarkParseError` nodes inline in the AST. These nodes render visibly (as error markers, highlighted source, or other distinguishable output) without preventing the rest of the document from rendering. An error in one part of a document does not prevent any other part from rendering.

This principle holds throughout the pipeline: parse errors, grammar errors, and semantic errors all produce AST nodes, never exceptions that halt output.

### The localized-recovery refinement

Localized error recovery — where errors don't cascade visually past their actual source location — is a refinement of the always-renders principle, not the principle itself.

Without localized recovery, an early error may cause everything after it to render incorrectly (because the parser consumed content into the error node). The author can still see output and can find the problem by looking at where rendering breaks. They are never blocked from seeing output entirely.

With localized recovery, each error is contained to its immediate construct. Content after the error renders normally. This makes finding and fixing errors significantly easier.

Localized recovery is desirable and should be implemented where the implementation is clean and the design is resolved. Where the implementation is architecturally difficult (e.g., blank-line termination in micromark's streaming model, which conflicts with multi-paragraph content), it is acceptable to defer localized recovery while maintaining the always-renders guarantee.

**In short:** always-renders is a hard requirement. Localized recovery is a quality-of-life improvement that is pursued where it is achievable without design conflict.

## The delegation principle

Acadamark does not re-implement what existing parsers already do well. Wherever an existing parser can handle work acadamark would otherwise need to do, acadamark delegates. Bare `$x$` is parsed by `remark-math`. Bare `` `code` `` is parsed by remark's code-span tokenizer. Bare `# Heading` is parsed by remark's heading tokenizer. Acadamark only does novel work — the tagged shorthand and the Layer 1 vocabulary.

See `notes/idioms.md` for the full statement of this principle including its two-layer form.

## The spec-first principle

When implementation reveals a question that the existing specs don't answer, the spec is updated before coding. Ambiguity buried in code is expensive. Ambiguity surfaced in specs is cheap.

Corollary: if a prompt asks for X but X raises a design question, the question is surfaced rather than resolved by guessing. Guesses in the parser are load-bearing and propagate.

## The maximum-correct-output principle

Where a document contains both correct and erroneous constructs, the parser produces the maximum possible correct output. Errors are represented inline; they do not suppress surrounding correct content.

This principle interacts with localized recovery: maximum correct output is best served by the combination of always-renders (hard) and localized recovery (refinement). The refinement is pursued where achievable.
