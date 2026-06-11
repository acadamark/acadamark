# enscribe — checklist roadmap (planning view)

A readable, feature-clean view of where things are heading. **Bugs are pulled out
into their own severity-sorted section** so they don't contaminate the feature
roadmap (per the milestone-cadence split: feature milestones + bugs-by-severity +
`.5` consolidation).

*This is a planning snapshot to look at — the GitHub milestones remain the source
of truth. Don't commit it as a second roadmap that drifts from the issues.*

---

## 🚀 Road to launch (the critical path)

The sequence that gates "tell people," in dependency order:

1. [ ] **Build the multi-file / master-document system** (currently specced, not
   built) — *the long pole.* Dogfooding depends on it.
2. [ ] **Dogfood** — rebuild the website *and* author the authoring-guide book in
   enscribe, using the multi-file system. **This is the demo** — a tool that wrote
   its own book and site is the most convincing artifact you can show.
3. [ ] **Interchange import working** (the on-ramp) — at minimum Quarto + LaTeX
   import, so people can bring existing documents.
4. [ ] **A few real imported paper examples** (evidence).
5. [ ] **Fix #141** (the parser hang) — blocks credible demos on real documents.
6. [ ] **Soft launch** — friendly Quarto/LaTeX users; feedback + testimonials +
   rough edges off.
7. [ ] **Public launch** — Show HN · r/LaTeX + academia/PhD subs · academic
   Bluesky/fedi · Lobsters · the markup-tool niche (Typst/Asciidoctor/djot
   watchers).

Slides, full LaTeX/DOCX export fidelity, and Quarto round-trip *perfection* are
**not** on this path — they're roadmap, not launch gates.

---

## Feature releases

### v0.5.0 — "HTML output" (finish the core architecture)
- [ ] #147 — finish the HTML-shaped Layer 1 migration (sections, figures, the
  semantic-only elements)
- [ ] #40 — lossy lowering to plain HTML (`<h1>`/`<h2>`/`<div>`)
- [ ] #117 — well-formatted, non-minified rendered output
- Round-out (trim if the release feels heavy): #17 code highlighting · #27
  `""`→`<q>` · #138 docs search · #155 bibliography style/sort/type

### v0.6.0 — "advanced layout"
- [ ] #34 — multi-column display *(do its Phase-0 spec first; #71 folded in)*
- [ ] #35 — print CSS + pagination
- [ ] #164 — paged per-page footnotes *(needs #35)*
- [ ] #116 — composite multi-panel figures
- *Move out:* #39 (executable code) is parked here but belongs in Later — it's a
  big feature, not advanced-layout.

---

## Epics (cross-cutting, big)

### Data model
- [ ] #134 — structured config data block (build the future register)
- [ ] #102 — asset store (embedded, keyed resources)
- [ ] #166 / #168 — settle the open forks first (category taxonomy; meta data-block)

### Interchange (new — spec attached, `notes/specs/interchange.md`)
- [ ] File the spec
- [ ] Quarto round-trip *(direct engine; its own Phase-0 — IX-Q1/Q2)*
- [ ] LaTeX import/export *(pandoc, lossy both ways)*
- [ ] DOCX import *(pandoc, content-only)*

---

## JATS (feature track — worked when JATS gets a focused pass)
- [ ] #120 — `enscribe fetch` (download a PMC article package)
- [ ] #136 — export `<front>` for meta-less docs *(bug, DTD-invalid)*
- [ ] #119 — import drops back-matter `<fn-group>` notes *(bug)*
- [ ] #142 — import-jats cell-whitespace idempotence *(bug, minor)*
- [ ] #144 — migrate hand-assembled export-test pipelines *(test-health)*

---

## 🐛 Bugs (severity-sorted — OFF the feature roadmap)

**Serious → patch release / merge immediately, don't wait for a slot:**
- [ ] #141 — re-parse of dense serialized docs is exponential / hangs *(also a
  launch blocker)*

**Minor → ride a `.5` pass or fix opportunistically:**
- [ ] #186 — frame/aside border ignores quoted `"false"` *(you slotted it in v0.5.0
  — fine, it's trivial)*
- (JATS bugs #136 / #119 / #142 live in the JATS track above)

---

## Later / post-launch (real features, not gating launch)
- [ ] #50 — slides / presentations vocabulary *(confirmed in the vision; post-launch)*
- [ ] #39 — executable code blocks (JS / Arquero / Vega-Lite) *(big; own Phase-0)*
- [ ] #32 — grammar of tables (gt-style)
- [ ] #122 — MDN-grade Layer 1 reference *(epic)*
- [ ] #115 — minipage layout panels
- [ ] #37 — `<html-passthrough>` *(needs a spec)*
- [ ] #139 — arrow typography (`-->`)
- [ ] #25 — trim browser-bundle citation-js weight

---

## Infra / health (rides `.5` consolidation passes)
#29 .d.ts types · #42 conda-forge · #49 CI on push/PR · #99 escapeXml
consolidation

---

## Not planned (recorded, may never build)
#28 same-name tag nesting · #51 wiki:/doi: shorthand · #52 link hover previews ·
#53 just-in-time math-symbol definitions
