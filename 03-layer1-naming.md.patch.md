# Patch: notes/layer1-naming.md — Add the "consult JATS first" rule

## Change 1: Add a new rule (Rule 4) to the "Three rules" section

### Find this in layer1-naming.md:

```markdown
## Three rules
```

### Replace the heading with:

```markdown
## Four rules
```

### Add this new rule after Rule 3 ("Named section depth ladder") and before "Two compilation targets":

```markdown
### Rule 4: Consult JATS before adding new vocabulary

When extending Layer 1 with a new element, the JATS tag library ([jats.nlm.nih.gov/archiving/tag-library/](https://jats.nlm.nih.gov/archiving/tag-library/)) is the first reference. JATS has spent two decades refining a vocabulary for academic content; acadamark inherits that thinking rather than reinventing it.

The rule is binding, not advisory. Before specifying a new Layer 1 element:

1. Find the corresponding JATS element (or determine that no JATS equivalent exists).
2. Adopt JATS naming where it makes sense, adjusted for HTML conventions and the container-role rule (Rule 1). For instance, JATS's `<article-title>` becomes acadamark's `<article-title>` directly. JATS's `<sec><title>` pattern becomes acadamark's `<section-title>` (because acadamark uses named depth, not nested `<sec>` with `<title>`).
3. Adopt JATS attribute conventions where they're sensible. For example, JATS uses `<xref ref-type="bibr">` for citations and `<xref ref-type="fig">` for figure references. Acadamark may use `<ref>` (for brevity) but could carry the same `ref-type` attribute, or use `data-ref-type`, depending on what the interpreter needs.
4. Document any deliberate divergences in the spec for that element, with rationale.

This rule means that as the Layer 1 vocabulary grows, it stays close to JATS-translatable rather than drifting into a parallel naming universe. Acadamark's planned JATS export plugin (see `BUILD.md`) becomes a mostly-mechanical transform rather than a deep restructuring.

JATS also includes elements acadamark may not need (`<related-article>`, `<funding-source>`, `<contrib-group>` with full nesting, etc.). Don't add them speculatively. Add elements when authors actually need them.
```

## Change 2: Update the "Why this matters" section

### Find this in layer1-naming.md:

```markdown
## Why this matters

These conventions are the spine of acadamark's contribution. Markdown extensions accrete idioms because they don't have a unifying naming scheme — every feature gets its own special-case syntax. By committing to container-role naming, defer-to-HTML, and named depth, acadamark keeps its vocabulary growing in a single coherent direction.

When in doubt, the question to ask is: "What container does this belong in, and what role does it play there?" The answer names the element.
```

### Replace with:

```markdown
## Why this matters

These conventions are the spine of acadamark's contribution. Markdown extensions accrete idioms because they don't have a unifying naming scheme — every feature gets its own special-case syntax. By committing to container-role naming, defer-to-HTML, named depth, and JATS-aligned vocabulary, acadamark keeps its vocabulary growing in a single coherent direction *and* maintains an exit ramp to the established scholarly publishing ecosystem.

When in doubt, two questions to ask:

1. "What container does this belong in, and what role does it play there?" (Container-role rule.)
2. "What does JATS call this, and why?" (JATS-first rule.)

The answers usually converge on a good name.
```

## Change 3: Update the "Open decisions" section

### Add this entry to the existing "Open decisions" list:

```markdown
- **JATS mapping divergences.** As the Layer 1 vocabulary grows, some elements will deliberately diverge from JATS for good reasons (HTML vs. XML conventions, simpler nesting, different attribute semantics). Each divergence should be documented in the spec for that element. A consolidated "acadamark ↔ JATS mapping table" should appear in the Layer 1 spec once it's mature, both as documentation and as the basis for the JATS export plugin.
```
