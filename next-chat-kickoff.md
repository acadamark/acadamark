# Acadamark — kickoff for the next chat

This document gets you (Claude in a fresh chat) and me (Ariel) on the same page quickly without re-reading the whole project.

## Where things stand at the moment of this handoff

**Parser:** Slice 3.5 is complete. 48/48 tests pass. The parser handles all sigil families (`#`, `##`, `###`, `$`, `$$`, `` ` ``, ```` ``` ````), named tags in short form, and the full attribute vocabulary (positionals, bracketed lists, ids, classes, kwargs, flags, permissive identifiers). Five small post-Slice-3.5 cleanup edits have been queued for Claude Code (CC), all documentation only — once those land, the slice is fully closed.

**Vocabulary spec:** Just produced. The first complete draft of acadamark's Layer 1 semantic HTML vocabulary lives in `notes/layer1-vocabulary-revised.md` (or wherever the user filed it). All major decisions are settled and documented with rationale. ~35 elements covering articles, books, chapters, and book-parts with floats, citations, cross-refs, notes, and apparatus.

**Notes file:** `notes/idioms.md` has been added. Captures the delegation principle (acadamark is not markdown plus extensions; markdown idioms are accepted as shortcuts because the parsers exist; at the interpreter, sigil tags convert to existing mdast/hast types where possible).

**Test fixture:** `notes/test.amd` exists. Comprehensive feature catalog exercising every parser feature through Slice 3.5 plus authoring patterns for section-nesting and the worked-document scenario.

## What was just decided in the previous chat

Six design questions about Layer 1 vocabulary, all resolved:

1. **Citations and cross-references are first-class, separate elements.** `<cite>` for bibliography references, `<ref>` for cross-references. JATS export reunifies them under `<xref>`.

2. **Bibliography entries are `<bib-entry>`.** Avoids name collision with `<ref>`.

3. **Notes are first-class.** `<note>` (inline marker) and `<note-list>` (apparatus block). Position (foot/end/side) is a document-level attribute, not per-note.

4. **`<author>` is simple.** Content is a single name string. Rich metadata deferred.

5. **`<float>` is the universal captioned-content element.** Tables, figures, listings, equations all wrap in `<float>`. Numbering is per-domain. Name is provisional; may revisit.

6. **Distinct container elements (Option Y).** `<article>`, `<book>`, `<book-part>`, `<chapter>` as separate elements with their own front/body/back. Document-type attribute for finer classification.

## Project workflow conventions

These are how Ariel and Claude work together. Keep them in mind:

- **Spec-first discipline.** When implementation reveals a question the spec doesn't answer, update the spec before coding.
- **Pushback is preferred over agreement.** Ariel has stated this explicitly. Disagreement, alternative framings, "have you considered X?" — these are part of the work, not interruptions.
- **Drift checks at the end of each slice.** Re-read spec, grammar, tests together to catch where they've gotten out of sync.
- **Two-surface workflow.** This chat session is for design, drift analysis, prompt-crafting, decisions. Claude Code in VS Code is for tactical implementation. The chat produces specs and prompts; CC executes them.
- **Slow over fast.** Decisions are made deliberately. Acadamark has been worked on intermittently over years; deliberate decisions are what make it resumable.

## Most likely next steps (Ariel's call which one to start)

In rough priority order:

1. **Set up `packages/layer1-vocabulary/`.** First-time-monorepo work. Package structure, README, version, place to hold the vocabulary spec and (eventually) the custom-element implementations. The spec from `notes/layer1-vocabulary-revised.md` becomes this package's primary documentation.

2. **Attribute spec for each element.** The second draft of the vocabulary, where each element gets its allowed attributes specified with JATS as primary reference. This is a focused design pass — probably worth doing before any implementation.

3. **`acadamarkTagInterpret` design.** The interpreter is the next major plugin in the pipeline. Per `STATUS.md`, it needs a schema-registration model. The vocabulary spec gives it a concrete target. A `notes/tag-schemas.md` should precede the implementation.

4. **Slice 4 of the parser** (long-form DSL tags: `<csv>...</csv>`, `<theorem>...</theorem>`). Mechanical extension of the parser. Can run in parallel with vocabulary work since they don't interfere.

5. **Update `BUILD.md`** to reflect the vocabulary as a deliverable and to add a third resolver plugin (notes, alongside citations and cross-refs already planned).

## Important context flags

- **`<float>` as a name is provisional.** Ariel is not fully sold on the name; the CSS overlap is unfortunate. Alternatives considered: `<exhibit>` (formal, slightly legal), `<panel>` (collides with multi-part-figure terminology), `<artifact>` (negative connotation in scientific contexts). If a better term surfaces during implementation, swap it. The element is unimplemented, so renaming is cheap.

- **Option Y for containers is settled, but it's the most refactorable decision.** If the vocabulary feels too heavy in practice, collapsing back to Option X (single recursive `<article>` with document-type attribute) is mechanical, not architectural.

- **Theorem-family is reserved but not specified.** The slot is held in the vocabulary; specifying the elements is a separate design pass.

- **The vocabulary as a standalone artifact has value beyond acadamark.** It can be published as a usable custom-element library independent of the shorthand parser. Worth keeping the boundary clean — the package shouldn't depend on acadamark internals, and acadamark's interpreter consumes the vocabulary via its public interface.

- **`packages/layer1-vocabulary/` is recommended location** rather than a separate repo, but the package should be cleanly extractable later if needed.

## Where the previous chat left tension

Two things to keep an eye on:

1. **The `<float>` naming.** Ariel was drawn to `<panel>` and accepted `<float>` as a working name reluctantly. If `<panel>` keeps coming up, it might be worth revisiting.

2. **Option X vs Y.** Settled toward Y, but Ariel said "I'm not totally opposed to option Y, I just don't want to make life hard for myself." If implementation reveals that Option Y is heavier than projected, the door isn't closed on revisiting.

## How to start the next chat

Ariel will probably open with something like "starting back up on acadamark, want to work on X." Read the relevant docs in this order based on what X is:

- **For vocabulary work:** `README.md`, `DESIGN.md`, `notes/layer1-naming.md`, `notes/layer1-vocabulary-revised.md` (the spec from the previous chat).
- **For parser work:** `README.md`, `DESIGN.md`, `BUILD.md`, `STATUS.md`, `notes/shorthand-syntax.md`.
- **For interpreter work:** all of the above plus `notes/idioms.md` and the vocabulary spec.
- **For monorepo-package setup:** the vocabulary spec and BUILD.md.

For any work, the standard preamble:

> Resuming work on acadamark. Please read [files in order]. The previous chat session settled the Layer 1 vocabulary and produced `notes/layer1-vocabulary-revised.md`. Today I want to work on [topic].

If Claude needs to push back on something or has a real concern, surface it before proceeding. That's the working style.

## One thing not to forget

Ariel mentioned at one point in the previous chat: "this project has gotten quite ahead of my level of understanding. I don't have experience vibecoding work I could not do myself with enough effort and time." This is worth remembering. Ariel is a physicist and data scientist with strong design instincts and good judgment about what makes sense, but is not a parser engineer or a JATS expert. Explanations should err toward "more words, more examples, less jargon" rather than the dense compressed style that LLMs default to.

Asked literally: when Ariel says "I don't fully understand," the right response is to slow down and re-explain with examples, not to gloss over and proceed.

End of handoff.
