# Appendices — design (article projection)

## The gap

`<appendix>` exists but is **book-only**: it lowers to `<book-part book-part-type="appendix">` in `<book-back>` (BITS). Articles (`<meta type=article>`) have no appendix path — yet JATS models article appendices first-class as `<app>` grouped in `<app-group>`, in `<back>`. (Surfaced during #57, which added book-appendix lettering but deliberately left the article gap as a vocabulary problem, not a numbering one. #57 closed in 0.3.0, so nothing blocks this.)

## The construct

**One authoring element, two projections by document type.** The `<appendix>` surface is unchanged; only the lowering branches on `<meta type>` — the way article and book structuring already diverge downstream of a shared surface:

- **Book** (`<meta type=book>`): → `<book-part book-part-type="appendix">` in `<book-back>`. Existing; untouched.
- **Article** (`<meta type=article>`): → JATS `<app>`, collected into a single `<app-group>` in `<back>`. Multiple appendices → multiple `<app>` within one `<app-group>`. **New** — no emitter today.

## HTML render

An appendix region with its heading, consistent with how book appendices render — reuse that path rather than inventing a separate article-appendix look. Same authored title/id surface as book appendices.

## Numbering (#57)

Article appendices join the appendix letter scheme #57 established for books — `A`, `A.1`, and "Appendix B" cross-references — via an `<app>` `<label>` site, the article analog of the book-part metadata label #57 uses. The numbering walk that letters book-part appendices letters `<app>` appendices the same way.

## Unchanged

- **Book appendices** — same authoring, same `<book-part>` projection, same render, same numbering.
- **The `<appendix>` authoring surface** — identical; only the document-type projection (and its JATS emitter) is new.

## Deferred

- Nothing essential. Appendix-specific args, if any ever surface, can wait.