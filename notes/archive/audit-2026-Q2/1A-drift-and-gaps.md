# Audit 1A — Drift and Gaps

Findings from the Audit 1A reading pass. Each entry is either a **DRIFT** (a document that describes reality incorrectly) or a **GAP** (something real that has no documentation). Most of these require a design conversation before being actioned; a few are straightforward stale-text fixes.

DRIFT and GAP numbering picks up after the existing AUD-01 through AUD-15 sequence.

---

## DRIFT-1: `notes/interpreter-design.md` — pipeline architecture is entirely wrong

**Source:** `notes/interpreter-design.md`  
**Relation to existing findings:** AUD-02 identifies this drift at a high level. This entry provides the full inventory.

**What the doc says:**
The doc describes the interpreter as a rehype plugin running after `remarkRehype`. It shows:
```
remarkRehype → acadamarkTagInterpret → acadamarkSectionNesting → acadamarkNumbering → acadamarkCitations → acadamarkCrossRefs → rehype-katex → rehype-shiki → rehypeStringify
```

**What is actually true (ground truth from plugins/ directory):**
1. The interpreter is NOT a rehype plugin. It is a set of mdast plugins that run before `toHast`, plus handler functions invoked during `toHast`.
2. Actual plugin names:
   - `acadamarkConfigDiscovery` (not in the doc's pipeline at all)
   - `acadamarkLibraryLoad` (not `acadamarkLibraryParsing`)
   - `acadamarkArticleStructuring` (partially correct; doc doesn't list it explicitly)
   - `acadamarkSectionNesting` (correct name)
   - `acadamarkNotes` (not listed in the doc's pipeline)
   - `acadamarkNumbering` (correct name)
   - `acadamarkRefResolution` (not `acadamarkCrossRefs`)
   - `acadamarkCiteResolution` (not `acadamarkCitations`; separate from `acadamarkBibliography`)
   - `acadamarkBibliography` (not in the doc's pipeline)
3. `rehype-katex` is NOT used. KaTeX is called directly in `handlers/math.js`.
4. `rehype-shiki` is NOT used. Code highlighting not implemented.
5. The doc says "interpreter does not yet exist." It is substantially implemented.

**Also stale in the doc:** The "open design questions" section asks whether to use `schema` vs `handler` strategy — this was already resolved (both strategies are implemented).

**Status:** DRIFT. `notes/interpreter-design.md` needs a full rewrite to match the actual mdast-plugin + handler architecture. This is documented here; rewriting the doc is a task for a dedicated editorial pass (not Audit 1A scope).

**→ Status: Resolved (2026-05-23).** `notes/interpreter-design.md` was retired to `archive/interpreter-design-2026-05.md` in the April 2026 cleanup. `notes/interpreter.md` is now the live architecture reference. AUD-02 is also closed.

---

## DRIFT-2: `notes/hover-previews-deferred.md` — feature is implemented, doc says deferred

**Source:** `notes/hover-previews-deferred.md`  
**Relation to existing findings:** AUD-03 identifies this at a high level.

**What the doc says:** Entire document frames hover previews as deferred. It evaluates three implementation options (Web Component, JS + Tippy/Popper, just CSS) and concludes "Web Component (Option B) probably." No option is selected.

**What is actually true:** Hover previews ARE implemented using Tippy.js + Popper.js (Option C, not Option B). The trigger mechanism uses `hasNoteMarkers`, `hasRefLinks`, `hasCiteLinks` to conditionally inject hover JS. The feature has been live for multiple slices.

**Also not documented anywhere:** The hover preview trigger logic (`hasNoteMarkers`, `hasRefLinks`, `hasCiteLinks`) — the conditions under which hover JS is injected — has no spec.

**Status:** DRIFT. The file should either be renamed to `hover-preview-investigation.md` (it's historical thinking, not a deferred-feature spec) or updated to reflect what was chosen and built. Suggested action: rename + add a note at the top pointing to the implementation.

**→ Status: Resolved (2026-05-23).** `notes/hover-previews-deferred.md` was retired to `archive/hover-previews-deferred-2026-05.md` in the April 2026 cleanup.

---

## DRIFT-3: `notes/plugin-pipeline.md` — plugin names throughout are wrong

**Source:** `notes/plugin-pipeline.md`

**What the doc says vs. what is true:**

| Doc name | Actual name |
|----------|-------------|
| `acadamarkLibraryParsing` | `acadamarkLibraryLoad` |
| `acadamarkBibEntryRegistration` | not implemented as separate plugin |
| `acadamarkCitationResolution` | `acadamarkCiteResolution` |
| `acadamarkCrossReferenceResolution` | `acadamarkRefResolution` |
| `acadamarkNoteNumbering` | `acadamarkNotes` (numbering + placement merged) |
| `acadamarkNotePlacement` | merged into `acadamarkNotes` |
| `acadamarkBibliographyAssembly` | `acadamarkBibliography` |
| `acadamarkTagInterpret` | not a plugin; implemented as handlers via `toHast` |
| `acadamarkBookStructuring` | not implemented |

Also: the doc describes `acadamarkTagInterpret` as "the last plugin in the pipeline" that "walks the AST" and "dispatches based on interpreter_strategy." The actual architecture is different: the interpreter logic is embedded in `toHast` handler functions, not a post-hast plugin.

The doc's pipeline ordering diagram and all three phase descriptions need updating.

**Status:** DRIFT. Widespread name drift. Lower priority than Drift-1 (interpreter-design.md) because plugin-pipeline.md is more of a planning document. But it's the authoritative spec for the pipeline; it should match what's built.

**→ Status: Resolved (2026-05-23).** `notes/plugin-pipeline.md` was retired to `archive/plugin-pipeline-2026-05.md` in the April 2026 cleanup.

---

## DRIFT-4: `notes/interpreter-design.md` — "no interpreter" claim is stale

Already captured in DRIFT-1, but calling out separately because it's the single most misleading statement in the notes:

> "The `acadamarkTagInterpret` rehype plugin does not yet exist."

The interpreter is substantially built. Documents 1–9 render. Citations, cross-references, section nesting, notes, numbering, hover previews — all working. The interpreter is not a single plugin but the entire `packages/acadamark-interpreter/` package. This sentence should be removed or replaced.

---

## DRIFT-5: `STATUS.md` "What does NOT yet exist" section is severely stale

**Source:** `STATUS.md` §"What does NOT yet exist"

The doc lists as not-yet-existing:
- `acadamarkTagInterpret` — exists in a different architectural form
- `rehypeAcadamarkToJats` — correctly still absent
- `acadamarkSectionNesting` (markdown-heading version) — still absent (but the named-tag version exists)
- `acadamarkNumbering`, `acadamarkCitations`, `acadamarkCrossRefs` — all exist under different names

The "Just completed" section is also outdated (describes layer1-vocabulary package setup as the most recent work; many slices have landed since then).

**Status:** DRIFT. STATUS.md is a living document that hasn't been updated since approximately May 2026 Layer 1 vocabulary setup. It needs a comprehesinve update after the audit.

---

## DRIFT-6: `STATUS.md` pipeline diagram wrong (same as DRIFT-1)

`STATUS.md` § "The pipeline (canonical)" shows:
```js
.use(acadamarkTagInterpret)
.use(acadamarkCitations)
.use(acadamarkCrossRefs)
.use(rehypeKatex)
.use(rehypeShiki)
```

None of these match actual plugin names or architecture. Same issue as DRIFT-1 / DRIFT-3. The canonical pipeline in STATUS.md should be updated to match what is actually in `packages/acadamark-interpreter/src/index.js`.

---

## DRIFT-7: `cite.md` vocabulary entry — `related_plugins` names wrong

**Source:** `packages/layer1-vocabulary/elements/cite.md`

The `related_plugins` section says:
```yaml
- name: acadamarkCitationResolution
```

Actual name: `acadamarkCiteResolution`.

**→ Status: Migrated (2026-05-23).** Filed as AUD-24 in `notes/audit-findings.md` (covers all three vocabulary entries: `cite.md`, `ref.md`, `note.md`).

---

## DRIFT-8: `ref.md` vocabulary entry — `related_plugins` names wrong

**Source:** `packages/layer1-vocabulary/elements/ref.md`

The `related_plugins` section says:
```yaml
- name: acadamarkCrossReferenceResolution
```

Actual name: `acadamarkRefResolution`.

Also: the handler responsibilities bullet says "ref-resolution plugin (runs before hast)" — this is correct about the order, but the overall architecture description says it's a "rehype plugin" when it runs as an mdast plugin. Minor but could confuse someone reading both files.

**→ Status: Migrated (2026-05-23).** Filed as AUD-24 (see DRIFT-7 note).

---

## DRIFT-9: `note.md` vocabulary entry — `related_plugins` names wrong

**Source:** `packages/layer1-vocabulary/elements/note.md`

Says `acadamarkNoteNumbering`. Actual name: `acadamarkNotes` (numbering and placement are merged into one plugin).

**→ Status: Migrated (2026-05-23).** Filed as AUD-24 (see DRIFT-7 note).

---

## DRIFT-10: `section.md` vocabulary entry — `related_plugins` names wrong

**Source:** `packages/layer1-vocabulary/elements/section.md`

Says `acadamarkSectionNesting` — this name is actually correct! The plugin is named `acadamarkSectionNesting` (confirmed from `section-nesting.js`). No drift here, removing this entry.

*(Self-correction during writing: verified against actual plugin name. DRIFT-10 is moot.)*

**→ Status: Moot (2026-05-23).** The finding's own text confirms the plugin name is correct; no action needed.

---

## DRIFT-11: `notes/plugin-pipeline.md` — `.content` vs `.children` note is correct but mislabeled

**Source:** `notes/plugin-pipeline.md` §"A note on AST traversal"

The note says: "If the node shape ever changes (e.g., migration to standard `.children`), all custom walkers must be updated."

This is accurate and correctly filed. However, the `notes/recursive-content-spec.md` describes `node.content` being populated with `Node[]` after recursive parsing — which is the current implementation. It does NOT migrate to `.children`. The note in plugin-pipeline.md is fine but the phrasing "ever changes" slightly overstates the uncertainty.

Not a material drift, but the relationship between `node.content` (which becomes `Node[]`) and `.children` (never used for acadamarkTag nodes) could be stated more clearly for plugin authors.

**→ Status: Dropped (2026-05-23).** A phrasing observation, not an actionable finding; no code or spec impact.

---

## GAP-1: No spec for asset injection / font bundling

The font-loader mechanism (`src/assets/font-loader.js`, `getDocumentFontsCss()`, `patchKatexFontUrls()`) was implemented in this session and documented in `notes/font-investigation.md` and AUD-10/AUD-11. However, there is no spec document describing:
- The principle (self-contained HTML as a design target)
- The font choices and rationale (Inter, Source Code Pro)
- The subsetting approach (Latin charset, pyftsubset)
- The base64 embedding approach vs. alternatives
- How to add or change bundled fonts in the future

`notes/font-investigation.md` is the closest thing. It reads as an investigation log rather than a spec. A `notes/asset-bundling.md` or similar would be the appropriate home.

**Severity:** Low — implementation works; missing spec is a documentation gap.

---

## GAP-2: Hover preview trigger logic has no spec

The `hasNoteMarkers`, `hasRefLinks`, `hasCiteLinks` flags (computed in the interpreter and used to decide whether to inject hover JS) are not documented in any spec. The only place to understand them is the source code.

Authors and future contributors need to understand: "When does hover JS get injected? What are the conditions? What triggers hover preview availability?"

`notes/hover-previews-deferred.md` exists but describes only the pre-implementation design exploration, not the implemented behavior.

**Severity:** Low — the logic is simple; the gap is a documentation hole.

---

## GAP-3: DD-1 through DD-5 have no corresponding spec updates

`notes/design-directions.md` defines five design directions:
- DD-1: Content gets parsed; arguments don't
- DD-2: Tags with caption-like content support two equivalent forms
- DD-3: `<meta>` is for document metadata; `<config>` is for document options
- DD-4: All tag forms work for all tags where semantically meaningful
- DD-5: Standalone HTML is the build target; client-side rendering is the future

These are good design statements. But:
- None of them appear in `notes/shorthand-syntax.md`, `notes/layer1-naming.md`, or vocabulary entries.
- DD-1 is directly relevant to AUD-14 (captions in kwarg values not parsed). The vocab entries for `<figure>`, `<table>`, etc. don't reference it.
- DD-3 (meta vs. config boundary) is relevant to AUD-13, which found that `<config>` accepts metadata kwargs. The `config.md` and `meta.md` vocab entries don't cross-reference DD-3.
- DD-4 is directly relevant to AUD-08 and AUD-15. The `known-limitations.md` entry for self-closing form doesn't reference DD-4.

**Gap:** Design directions exist in one file but haven't propagated to the specs and vocabulary entries they govern.

**Severity:** Medium — the gap creates a situation where a reader reads the vocab entries and design directions separately and can't connect them.

**→ Status: Migrated (2026-05-23).** Filed as AUD-25 in `notes/audit-findings.md`. Note: GAP-3's reference to `notes/design-directions.md` is itself stale — the design directions now live in `DESIGN.md`'s "Design directions" section (and `archive/design-directions-2026-05.md`). AUD-25 names the correct owner.

---

## GAP-4: `notes/authoring-features-survey.md` is purely prospective — no clear relationship to current scope

`authoring-features-survey.md` catalogs deferred authoring features (`<abbr>`, `<kbd>`, `<details>`, etc.) with rationales. It's a useful living document but has no stated review cadence or priority ordering. It also doesn't cross-reference with `design-directions.md` or `BUILD.md`.

**Gap:** Not a drift — the content is consistent. But the survey would be more useful with a "priority tier" marker per entry and links to any BUILD.md slice where an entry would land.

**Severity:** Very low.

---

## GAP-5: `notes/inline-tex-shortcuts-spec.md` is specced but has no corresponding BUILD.md entry

The inline `^{...}` / `_{...}` shortcut spec is fully written in `notes/inline-tex-shortcuts-spec.md`. However, there is no slice entry in `BUILD.md` where this feature lands. It's a "written spec floating without a build slot."

**Severity:** Low — the spec is correct and complete; it just needs a BUILD.md entry when it becomes scheduled.

---

## GAP-6: Parser newline bug for inline tags at line-start has no AUD entry

`notes/parser-newline-investigation.md` documents three parser bugs related to newline handling:
1. Multi-line content in text-position inline named tags — content silently becomes plain text.
2. Inline tags at line-start captured as flow constructs — trailing text becomes a separate paragraph.
3. Code sigil with multi-line content in text position — produces `acadamarkTagError`.

These are real bugs, not deferred features. None of them appear in `notes/audit-findings.md` or `notes/known-limitations.md`. They were found during an investigation but not filed.

**Severity:** Medium. Recommend adding these as AUD-16, AUD-17, AUD-18 (or a single AUD-16 with three sub-cases).

**→ Status: Migrated (2026-05-23).** Filed as AUD-21 (named-tag multi-line silent loss), AUD-22 (inline-at-line-start paragraph splitting — highest impact), and AUD-23 (code-sigil error node) in `notes/audit-findings.md`.

---

## GAP-7: Parser maturity slice findings not fully filed

`notes/parser-maturity-investigation.md` documents:
- Q2: The `node.children` proposal is incompatible with the existing content model (finding to keep in mind for future parser work).
- Q3: Comma-separated positionals don't work (`<cite Smith2020,Jones2019>` fails).

The comma-positionals finding is a real limitation but doesn't appear in `audit-findings.md` or `known-limitations.md`.

**Severity:** Low for comma-positionals (rare use case; `<cite Smith2020 Jones2019>` works). But it should be filed.
