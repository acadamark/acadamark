# enscribe-core

The inward-pointing shared foundation that enscribe's parser, interpreter,
and future output generators depend on.

`enscribe-core` depends on nothing internal — it is the root of the
package dependency graph. The parser (`remark-enscribe`), the interpreter
(`enscribe-interpreter`), and any future output generator
(`enscribe-jats-export`, etc.) all depend on it.

By design, `enscribe-core` is **filesystem-free and browser-safe** — its
modules do not import `fs`, `path`, `url`, or any other Node-only built-in,
and they do not carry heavy runtime dependencies. This is what lets the
shared foundation be bundled into a future client-side build of enscribe.

The architectural decision is described in the architecture Phase 0 report
that designed this package. The contents grow over several extraction slices;
the first slice (this one) moves the pure-data, zero-logic-risk modules
(`dsl-registry`, `sigil-mapping`) here from `remark-enscribe`. Later slices
add tag-shape builders, error-node shapes, the centralized tree walkers, the
numbering registry, the colon-id helper, and the `file.data` plugin-bus key
constants.

What is *not* in `enscribe-core`:

- Build-time-only code (the Peggy grammar compiler; the filesystem
  vocabulary loader).
- Output-stage-specific code (the HTML attribute mapper; the future JATS
  attribute mapper).
- Heavy runtime dependencies (KaTeX, citation-js, tippy, etc.).
