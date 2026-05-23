# Audit 1A — Design Questions

Questions raised during the Audit 1A reading pass that require a design conversation (Audit 1B chat session) before any code or spec changes are made.

---

## DQ-1: What do we do with `notes/interpreter-design.md`?

**Background:** `notes/interpreter-design.md` is the most deeply stale document in the notes corpus. It describes an architecture (rehype plugin, `acadamarkTagInterpret` as a single post-hast transformer) that doesn't match what was built (mdast plugins + handler functions invoked from `toHast`). It also says the interpreter "doesn't exist yet" when it is substantially implemented.

**The question:** Do we:

- **(A) Rewrite it** to describe the actual architecture — mdast plugin chain, `toHast` handlers, schema vs. handler interpreter_strategy? This is the authoritative spec for how the interpreter works; it should be accurate.
- **(B) Retire it** and let `notes/plugin-pipeline.md` (once updated per DRIFT-3) serve as the architecture doc?
- **(C) Keep it as-is** with a prominent stale notice at the top, for historical reference only?

**Recommendation to consider:** Option A. The interpreter architecture is real and worth having documented. The document needs a rewrite from first principles that describes what was actually built, not what was planned.

**→ Status: Migrated (2026-05-23).** The stale `notes/interpreter-design.md` was retired to `archive/interpreter-design-2026-05.md`. The live question — whether `notes/interpreter.md` accurately describes the current implementation — is filed as AUD-26 in `notes/audit-findings.md`.

---

## DQ-2: `notes/plugin-pipeline.md` — update names, but also: does it describe the right architecture?

**Background:** DRIFT-3 documents that all the plugin names in `plugin-pipeline.md` are wrong (the doc uses planning names, not implemented names). But there's also a deeper question: the doc describes a three-phase model (Discovery → Structural → Resolution) with specific plugin contracts. Is that model still the intended architecture?

Specifically:
- **`acadamarkBookStructuring`** is described in the doc but not implemented. Is it still planned?
- **`acadamarkTagInterpret` as the last plugin** — the actual architecture puts interpretation in `toHast` handlers, not a final rehype plugin. Should the pipeline doc be updated to reflect this?
- **`acadamarkBibEntryRegistration`** as a separate plugin — not implemented, merged into `acadamarkLibraryLoad`. Is the merge deliberate?

**The question:** Before correcting the names throughout, should we review whether the three-phase model and the specific plugin list still reflect the intended design? If some planned plugins were merged or dropped, the doc should describe the actual intended plan, not just have the names corrected.

---

## DQ-3: Should `notes/hover-previews-deferred.md` be renamed?

**Background:** DRIFT-2 notes that the file says "deferred" throughout but the feature is implemented. The file is valuable as a historical record of the design exploration. But its name actively misleads (it's in the notes directory alongside `hover-preview-investigation.md`, which is the post-implementation investigation).

**Options:**
- **(A) Rename to `hover-previews-decision-log.md`** — signals it's historical.
- **(B) Add a prominent "Status: Implemented" header** and keep the name.
- **(C) Delete it** — the investigation doc covers the same ground with post-implementation accuracy.

**Recommendation to consider:** Option B. The design exploration is worth keeping. A status note at the top clarifies the file is a historical decision record, not a current spec.

**→ Status: Moot (2026-05-23).** `notes/hover-previews-deferred.md` was retired to `archive/hover-previews-deferred-2026-05.md` in the April 2026 cleanup. The rename question no longer applies.

---

## DQ-4: Where do the Design Directions (DD-1 through DD-5) live long-term?

**Background:** GAP-3 notes that `notes/design-directions.md` has five well-written design directions that haven't been incorporated into the specs and vocabulary entries they govern. The directions currently exist in their own island.

**The question:** Should design directions be:
- **(A) Incorporated into the relevant spec docs** (DD-1 into `shorthand-syntax.md`; DD-3 into `meta.md` and `config.md`; etc.) and the standalone file retired?
- **(B) Kept as a separate "principles" companion doc** but cross-referenced explicitly from the specs they govern?
- **(C) Moved into `notes/principles.md`** (which already houses similar high-level statements)?

**Recommendation to consider:** Option B. Design directions are cross-cutting; forcing them into individual spec docs fragments them. But they need forward references from the specs they govern, so a reader of `config.md` sees "see also DD-3 in design-directions.md."

---

## DQ-5: Parser newline bugs — what's the slice plan?

**Background:** GAP-6 identifies three real parser bugs (documented in `notes/parser-newline-investigation.md`) that aren't yet in `audit-findings.md` and have no slice:
1. Inline named tags with newlines in text position: content silently becomes plain text.
2. Inline tags at line-start captured as flow constructs: trailing text becomes separate paragraph.
3. Code sigil with multi-line content in text position: produces `acadamarkTagError`.

**The question:** Should these be filed as AUD-16/17/18 and added to the parser slice plan (a future "parser fix" slice)? Or are they lower-priority edge cases that can wait for the "inline tag behavior" spec pass that's probably needed before the interpreter's inline tag support is built?

**Also to decide:** Bug 2 (inline tag at line-start becoming flow) may be the most impactful — it can cause unexpected paragraph splitting in authored documents. Is this worth prioritizing ahead of other parser slice work?

**→ Status: Migrated (2026-05-23).** The three bugs are filed as AUD-21 (named-tag multi-line silent loss), AUD-22 (inline-at-line-start paragraph splitting — highest-impact, explicitly flagged), and AUD-23 (code-sigil error node) in `notes/audit-findings.md`.

---

## DQ-6: Comma-separated positionals for `<cite>` — support or document as unsupported?

**Background:** GAP-7 notes that `<cite Smith2020,Jones2019>` fails (comma-separated keys not supported). Authors who know BibTeX-style comma-separated keys might try this form. The space-separated form `<cite Smith2020 Jones2019>` works.

**The question:** Is this a "add to known-limitations.md and document the workaround" situation, or is comma-separated support worth scheduling as a small grammar fix?

The fix would be small: add `,` as an allowed attribute separator in the Peggy grammar's `Attributes` rule (or add a `CommaAttributes` variant). But it requires a grammar change + test additions.

**→ Status: Resolved (2026-05-23).** Comma-separated `<cite>` keys already work — this landed in the F1 / parser-maturity slice. `<cite Smith2020,Jones2019>` is supported. The `@`-sigil form with bracketed keys (`<cite [@Smith2020, @Jones2019]>`) is also supported.

---

## DQ-7: Should `STATUS.md` be updated now, or as a dedicated audit deliverable?

**Background:** DRIFT-5 and DRIFT-6 note that `STATUS.md` is severely stale. The "What does NOT yet exist" section lists things that exist; the "Just completed" section is outdated; the pipeline diagram is wrong.

**The question:** Should STATUS.md be updated as part of the Audit 1A deliverables (making it the canonical current-state snapshot), or should it be updated after the audit conclusions are written (so it captures the post-audit state)?

A second-order question: who writes the STATUS.md update? It's a high-level narrative document that reads best when written deliberately, not as a diff-correction pass. This might be a good Ariel-writes-with-Claude-assistance task rather than a purely mechanical fix.

**→ Status: Deferred — separate task (2026-05-23).** The STATUS.md rewrite is acknowledged as a distinct task (author-and-Claude collaboration). No code or mechanical fix; left open deliberately.

---

## DQ-8: Audit findings numbering after AUD-15 — use new scheme or continue AUD-N?

**Background:** The current `notes/audit-findings.md` ends at AUD-15. This Audit 1A pass has identified:
- DRIFT-1 through DRIFT-9 (spec documents describing reality incorrectly)
- GAP-1 through GAP-7 (missing documentation for things that exist)
- Additionally, GAP-6 suggests AUD-16/17/18 for parser newline bugs

**The question:** Should new findings from this audit continue the AUD-N series in `audit-findings.md`? Or should we use the DRIFT-N / GAP-N scheme from this report and keep them here, separate from the AUD series?

The AUD series in `audit-findings.md` mixes bugs, doc drift, and implementation gaps under one number space. A DRIFT / GAP / DQ split might be cleaner going forward.

**→ Status: Resolved (2026-05-23).** Decision: continue the single AUD-N series in `notes/audit-findings.md`. The DRIFT/GAP/DQ scheme was audit-pass scaffolding and retires with the 1A files. New findings from this audit are filed as AUD-21 through AUD-26.

**Recommendation to consider:** Migrate the most actionable findings (parser newline bugs, plugin name drift) into `audit-findings.md` as AUD-16+. Keep the design questions in this file. Keep the DRIFT/GAP findings here for traceability but file the actionable ones in audit-findings.md.
