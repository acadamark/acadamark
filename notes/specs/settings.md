# Display settings: the two tiers and their precedence

This document is the contract for **who can change how a document looks, on which surface, and whose
choice wins**. It exists because that contract lived in no spec and so drifted unfixed three times
(#443): a control that writes a value no surface reads back is the failure this document rules out.

It governs the *display* settings only — the appearance knobs a person changes while reading or
authoring. The `<config>` keys themselves (what each does, its default, its scope) are catalogued in
the generated `<config>` options reference (`config-options-doc.js` → the Authoring Guide); the theme
*token* values are the contract in `docs-source/theming/index.emd`. This document rules only the
*tiers*, their *surfaces*, and their *precedence*.

Glossary (used throughout): **reader tier** — the visitor's own readability choices; **document
tier** — the author's per-document appearance pins written into the `<config>` tag; **surface** — a
way the document is produced (a static build, or a live in-browser mount); **stamp** — setting
`data-theme-variant` on the page root `<html>`, the attribute the dark CSS keys on.

---

## The two tiers

There are exactly two places a person changes display settings, and they are different in kind.

### 1. The reader tier — website-level readability, for the visitor

- **What:** text size, line spacing, text width, and the light/dark switch.
- **Where it is available:** on **every page of both the static site and the live site** — every
  surface that ships the settings gear. It is the visitor's own control, present in read mode.
- **How it is stored:** visitor-local, in `localStorage` per origin. It is *not* written into the
  document; it never changes the published source.
- **How it applies:** by CSS cascade. The three sliders write inline custom properties on the root
  (`--enscribe-text-base` / `--enscribe-line-height` / `--enscribe-content-width`), which beat every
  stylesheet `:root`; the light/dark switch stamps `data-theme-variant` on the root directly. Because
  it is an inline root override, the reader tier **wins over the document tier by construction**.

### 2. The document tier — document-level appearance, for the author

- **What:** the document's theme (`<config theme>`) and its light/dark default
  (`<config theme-variant>`).
- **Where it is available:** **only when editing** — never in read mode. The document tier is an
  authoring affordance, so it appears in the settings gear only on an editable surface (an article in
  edit mode, or the website/playground editor). A read-mode page shows the reader tier alone.
- **How it applies:** the control **rewrites the edited document's `<config>` tag** — the change is
  visible in the source pane (see-what-you-set), and the edit preview reflects it.
- **The unseen-master exception:** a book's live loop edits its per-chapter `<chapter src>` files, not
  the master where `<config>` lives; a website's loop edits the current page, not the master. So the
  book document tier is not offered in the per-chapter loop (a master-`<config>` affordance is a
  separate follow-on), and the website document tier edits the *current page* (see precedence below).

---

## Precedence — whose choice wins

Two questions: what governs **read mode**, and what the **editor preview** shows.

### Read mode

1. **The master `<config>` is the site-wide / document default.** A website's appearance is the
   website master's `<config>`, uniform across every page (a per-page appearance that flipped between
   pages of one site would be jarring) — the same site-wide read as `repo` / `playground` / the site
   icon. A standalone document's appearance is its own master `<config>`. This is the static behavior
   since #431; **the live site must match it** — the live-website mount stamps the master's
   `theme-variant` and injects the master's `theme`, exactly as the static build does server-side.
   (This parity is the render-parity invariant — see `render-parity.md`.)
2. **The reader tier overrides on top**, locally and per visitor, by cascade. A reader who sets dark
   sees dark regardless of the document default.

A page's *own* `<config theme-variant>` does **not** override the master in read mode on a website —
the master governs site-wide. (A page's own `<config theme>` token theme renders in that page's own
content and so takes local effect; the variant, being a root stamp, is the master's site-wide.)

### While editing

The edit preview **must visibly reflect the edited document's `<config>` pin** (see-what-you-set) —
this is the whole point of the document tier. It does so **without leaking onto other pages and
without persisting after leaving the editor**:

- On a **standalone document**, the root IS the document, so the pin is stamped directly; a variant
  change reflects at once.
- On a **website**, the editor stamps the root during edit so the preview reflects the page's pin, and
  keeps it leak-free by construction: **switching pages resets the root to the site default** (then
  the newly-active page re-reflects its own pin), and **exiting edit reloads the page** into read
  mode, which re-stamps the master default. The page pin the picker writes is an editor-preview
  reflection; the *published* read-mode appearance is still the master's, site-wide.

---

## The rule that keeps it honest

**A display-setting control must not ship ahead of its read path on every surface where the control
appears.** A control is a *write*; a value written on a surface that reads it nowhere is the #443
failure. When a new display control or a new surface is added, its slice carries a per-surface
disposition — read site cited on each surface where it applies, or an explicit N/A — and a
consumption fixture asserting the built output on each applicable surface (the theme family's
fixtures are the model: `test/theme-consumption.test.js`). This is the settings analogue of the
family-inventory rule (`coding-conventions.md` §8).

---

## Composition with book navigation (the margin-note stacking rule)

One display setting composes with book navigation in a way worth pinning here so it is never mistaken
for a defect: **`note-position=margin` on a book with a floating chapter/section nav**. The two layer
by design — the margin notes are tied to the page text and scroll with it, while a floating nav is a
fixed overlay that stacks *above* them, so a right-side floating nav over right-margin notes makes the
notes pass *behind* the nav while scrolling. This is the author's chosen composition, not a bug;
Enscribe does not block it. The authoritative statement of the rule (and the recommended pairing — the
expanding nav) lives in `notes/specs/book-navigation.md` ("The stacking rule"); it is named here so a
reader of the display-settings contract knows the interaction is ruled and intentional (#459).

## Cross-references

- `book-navigation.md` — the book's navigation chrome and the margin-note × floating-nav **stacking
  rule** (the composition of the `note-position=margin` display setting with book nav placement).
- `render-parity.md` — the live≡static byte-parity invariant this contract's read-mode precedence
  rests on.
- `website.md` — the website composition class (the master-vs-page structure the precedence rules
  operate over).
- `config-options-doc.js` / the generated `<config>` reference — the per-key catalogue (what each
  setting does).
- `docs-source/theming/index.emd` — the theme *token* contract (the values `<config theme>` selects).
