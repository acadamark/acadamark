# Design note: `@` for reference, `#` for assignment

**Status:** Proposed. Not implemented, not scheduled. Captured for the global code/spec review, where the cross-reference system is already due for attention (see AUD-09, and the pipeline-architecture conversation).

This note records a proposed sigil change and the reasoning behind it, so the idea is not lost and can be evaluated deliberately rather than re-derived later.

## The proposal

Acadamark currently uses `#` for two distinct operations:

- **Assigning** an identifier to an element: `<figure #fig:priority src=... | ...>`.
- **Referring** to an identified element: `<ref #fig:priority>`.

The proposal: split the two. Keep `#` for *assignment* (defining an id on an element). Introduce `@` for *reference* (pointing at an already-defined id).

Under the proposal:

```
<figure #fig:priority src=... | ...>      assignment — # defines the id
<ref @fig:priority>                        reference — @ points at it
```

## Why

**It makes a real distinction explicit.** Assigning an identifier and referring to one are different operations. Acadamark's guiding principle is that the source should be explicit, consistent, and as simple as possible but no simpler — and one sigil doing two jobs is a place where the source is *less* explicit than the concepts behind it. With `#` for definition and `@` for use, a reader scanning a document can see every definition site and every reference site by sigil alone.

**`@` already reads as "reference."** Pandoc and Quarto have used `@key` for citation references for years. Anyone coming from that world reads `@` as "refer to a keyed thing" without instruction. The convention is borrowed, not invented — consistent with acadamark's stance of re-discovering existing conventions rather than minting new ones.

**It unifies citations and cross-references.** Today `<cite smith2023>` and `<ref #fig:priority>` are separate constructs, but they are the same gesture: refer to something by key. The key resolves to a bibliography entry in one case and a numbered element in the other, but the authoring act is identical. Under an `@` convention both become `@key` — `@smith2023`, `@fig:priority` — differing only in what the key resolves to. That is a consolidation toward a single concept, which is the simplicity principle working in the right direction.

## The downstream payoff

Once `@` is a recognized reference sigil, unbraced inline references become natural — the author writes a reference directly in flowing prose without a `<ref ...>` wrapper:

```
As the framework shows (@fig:priority), topics cluster in two dimensions.
```

This is the Quarto-style affordance. It is the same `@` doing the same job — resolving a key to a target — so it adds no new surface; it uses the one the proposal defines. Whether to adopt unbraced inline references is a separate decision, but the `@` sigil is what makes it available.

## Costs and open questions

This is a syntax change, not a tweak. It touches:

- **The parser grammar** — `@` becomes a significant character in prose; a new construct (`@key`, and possibly `@type:key`) must be recognized.
- **The `<ref>` and `<cite>` handling** — if the two unify, that is a real change to how both are parsed and interpreted, not only a sigil swap.
- **Every fixture document** — all current `<ref #...>` and `<cite ...>` forms would change.
- **The shorthand spec, escape-rules spec, and vocabulary entries** — all reference the current forms.

**Escape rule.** Literal at-signs occur in prose — email addresses, social handles. `@` joining the significant-character set means `\@` must produce a literal `@`. Acadamark already has a uniform escape mechanism, so this is an application of an existing pattern, not a new mechanism — but it must be specified.

**Migration vs. coexistence.** Decide whether `#`-for-reference is removed outright (clean, but a breaking change to every existing document) or accepted as a deprecated alias for a transition period. The simplicity principle argues for a clean break once the system is small enough that migration is cheap — and acadamark is still that small.

**Relationship to AUD-09.** Section ids are not currently registered for cross-reference at all. If the `@` redesign is taken on, it is the natural moment to also resolve AUD-09 — the cross-reference system would be under active work anyway.

**Interaction with typed colon-ids.** This proposal is orthogonal to the existing `fig:` / `sec:` / `eqn:` / `tab:` colon-prefix convention, which stays. `@fig:priority` keeps the explicit type prefix; the prefix is what selects the correct counter and makes the reference self-describing. (A related, milder idea worth recording: because the system knows what element a given id was declared on, a reference whose type prefix disagrees with the target's actual type — `@fig:priority` pointing at an equation — is a detectable mismatch and could be a warning. That uses element knowledge to *catch author error*, not to *infer the prefix*; inferring the prefix was considered and rejected, because it makes the id's meaning implicit and breaks down once elements are wrapped in `<figure>` downstream.)

## Recommendation

Worth doing, but as a deliberate slice, not a quick change. It belongs with the global review, alongside the pipeline-architecture conversation and the section-syntax reconciliation — the cross-reference system as a whole is the right unit of work, and `@`-vs-`#`, AUD-09, and the `<cite>`/`<ref>` unification are facets of one design, not three independent edits.
