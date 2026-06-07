# The lift/lower round-trip specification

Defines the correctness model for enscribe's `lift` and `lower` transforms: what survives a round trip between authoring registers, in which register, and what is allowed to change.

## Registers and direction

A `.emd` document is written in a mix of three registers, all of which parse to one AST:

- **canonical** — every construct as an explicit named tag
- **shorthand (sigil)** — sigil-based forms
- **markdown** — markdown idioms

The two transforms move between them:

- **lower** = de-sugar → the **canonical** register (every construct as an explicit named tag).
- **lift** = re-sugar → an **idiomatic** register, *under a style policy*: a deterministic, lossless rule for choosing among equivalent idioms. The default policy prefers the most concise lossless form (markdown > sigil > canonical). The laws below hold for any deterministic, lossless policy; selectable non-default policies (e.g. a sigil-preferring style) are future work.

## The invariant

The AST is the single source of truth. The registers are surface syntaxes over it. **A round trip must preserve the AST, not the bytes.** Surface choices — which equivalent idiom an author used, whitespace, attribute order — are *normalized*, not preserved. Losing them is correct behavior, not a defect.

## The functions

- `parse : Text → AST` — accepts any mix of registers; many-to-one.
- `lower : AST → Text` — serializes every node in canonical named-tag form.
- `lift  : AST → Text` — serializes every node in its preferred lossless idiom under the active style policy.

## The laws

1. **Faithful serialization (both directions).** `parse(lower(a)) ≡ a` and `parse(lift(a)) ≡ a` for every AST `a`. Neither serializer may change meaning. This is the core contract; lossiness bugs (#6) are violations of it.

2. **Lower is a normal form (byte-idempotent).** `lower(parse(lower(a))) == lower(a)`, byte-for-byte. Canonical output is canonical input's fixed point.

3. **Lift is byte-idempotent.** `lift(parse(lift(a))) == lift(a)`. Under a fixed policy, lift makes the same idiom choice every time, so its output is its own fixed point.

4. **Round trip survives at the AST level (the real guarantee).** For any input text `t`: `parse(lower(parse(t))) ≡ parse(t)` and `parse(lift(parse(t))) ≡ parse(t)`. Re-serialize in either register, re-parse, and the same AST comes back.

5. **Byte-identity of author input is *not* guaranteed.** `lower(parse(t)) ≠ t` and `lift(parse(t)) ≠ t` in general. This is by design: laws 2–3 make the output a normal form, and arbitrary input need not already be one. Expecting the exact original source back is mis-modeling the contract.

6. **The losslessness rule.** `lift` may emit an idiom for a node *only if that idiom round-trips the node's full AST* — every attribute, child, ID, and reference. If any feature has no idiomatic representation, `lift` falls back to canonical *for that node*. Therefore lift is never lossy; a lift that drops an attribute is a law-6 violation, not an accepted limitation.

## Semantic equality

Define `a ≡ b` iff `lower(a) == lower(b)` byte-for-byte. `lower` is the canonicalization function, and equality is decidable by comparing lowerings. This is what `≡` means in laws 1 and 4, and it is what fixture round-trip tests should assert — compare lowerings, never raw bytes.

## What is preserved vs what may change

- **Never lost:** semantic content, element identity / IDs, cross-references, meaning-bearing attribute values, content order.
- **May be normalized:** whitespace (per the policy below), choice among equivalent idioms, attribute ordering, omitted or defaulted attributes.
- **Verbatim-exempt (byte-preserved):** code blocks, `pre`, and math source — excluded from whitespace normalization entirely.

## Idiom precedence (default lift policy)

When more than one lossless idiom maps to a node, lift takes the most concise in the fixed order **markdown > sigil > canonical**. This is a fixed preference order, not a byte-count minimizer — fixed so that lift stays deterministic (law 3) and produces a predictable house style. A node with no lossless idiom stays canonical (law 6).

**This default is provisional.** The preferred long-term direction is the reverse — lean toward the canonical form and sugar only where the author opts in, rather than auto-minimizing — expressed as an author-controlled style policy. The laws above hold for either direction (any deterministic, lossless policy), so this is a choice of *default*, not a change to the contract. To be settled together with strict mode (#36), since both turn on what counts as a document's intended normal form.

## Whitespace policy

In prose, runs of spaces, tabs, and newlines collapse to a single space, and block separation is normalized to one consistent form; the amount of whitespace authored is not preserved, only the content and its order. Inside the verbatim-exempt nodes (code blocks, `pre`, math), all whitespace is preserved byte-for-byte. In short: prose whitespace is insignificant and normalized; verbatim whitespace is significant and preserved.

## Relationship to strict mode (#36)

The laws hold regardless of strict mode. Strict mode adds a stronger requirement on top: that a document already be in a chosen register's normal form — `== lower(parse(it))` or `== lift(parse(it))` — and reject non-normalized input rather than silently normalizing it. This spec does not define strict mode, only how it composes with the round trip.

## Scope

This covers the `.emd` authoring registers only. The JATS axis (`import-jats` / `export-jats`) is a separate round trip with its own, lossier contract and is out of scope here. (#6 is the lossiness bug against law 1; #66 is the pipeline-spec re-sync; neither is this document.)
