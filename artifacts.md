Both confirmed locatable. The docs-site menu/layout is in the docs-rethink transcript; the options grid I still need to pin down. Let me grep both.Found both — they're from the docs-site rethink (#223) session. Here they are, reconstructed faithfully.

## 1. Docs-site menu + document layout

The locked site menu (replaces the flat nine-item top bar; becomes a left sidebar reflecting this tree):

```
Homepage          ← sourced from the README (single-source)
Design            ← "Under the Hood": how the browser-as-engine works
Vocabulary        ← the two registers, introduced (curated, light, a few examples)
  ├─ Enscribe Shorthand
  └─ Layer 1
Documentation     ← comprehensive, GENERATED from the vocab source
  ├─ Shorthand catalog   (catalog + full documentation + inline examples)
  ├─ Layer 1 catalog     (catalog + full documentation + inline examples)
  ├─ Rendering guide     (the option grid below + decision prose)
  └─ JATS export         (+ imported-articles listing at its foot)
Try It            ← downloadable, self-contained editor + engine
```

**Per-page layout:** left sidebar = this menu; main column = content; right rail = the config-driven on-this-page ToC (`<config toc toc-location=right>`), with a stable `id` anchor on every element/option entry so the future search (#138) can jump to it.

**Content map (where the old nine pages went — nothing lost):** Home → Homepage (from README); Design → Design/Under the Hood; Quickstart → Try It (downloadable); Authoring Guide (the monolith) dissolves — workflow prose into the catalogs' "full documentation", render/config part into the Rendering guide, gentle intro into Vocabulary; Layer 1 Reference → replaced by the generated Layer 1 catalog; Book Build → folds into the catalogs' "full documentation"; Gallery → dissolves into the catalogs (examples inline per element); JATS → JATS export; Demos → dissolves into the JATS page (imported-articles list at its foot).

## 2. Usage / build / render options grid

Above every option sits the one thing that **isn't** a `<config>` knob: the **render mode** — static build vs live render. That's a build-time choice, not a document option.

Then the ~30 `<config>` options, six families, columns `option · what it does · type/values · default · scope`:

| Option | What it does | Type / values | Default | Scope |
|---|---|---|---|---|
| **Numbering** | | | | |
| `number-sections` | number section headings | boolean | off (articles) / on (books) | all |
| `number-figures` | number figures | boolean | — | all |
| `number-tables` | number tables | boolean | — | all |
| `number-equations` | number equations | boolean | — | all |
| `number-theorems` | theorem/lemma/corollary/proposition counter | boolean | — | all |
| `number-definitions` | `<definition>` counter | boolean | — | all |
| `number-examples` | `<example>` counter | boolean | — | all |
| `number-boxes` | numbered `<aside>` ("box" counter, #31) | boolean | — | all |
| `number-depth` | deepest heading level numbered (≠ toc-depth) | valued | all levels | all |
| `counter-reset-scope` | where counters reset | none \| chapter \| section | none (art) / chapter (book) | all |
| **Table of contents** | | | | |
| `toc` | the config-driven contents listing | boolean | off | all |
| `toc-depth` | deepest heading level listed | valued | 3 | all |
| `toc-title` | heading above the listing | valued | "Contents" | all |
| `toc-location` | inline vs sticky sidebar | body \| left \| right | body | all |
| `toc-expand` | sidebar levels expanded initially | valued | 1 | all |
| **Citations / bibliography** | | | | |
| `citation-style` | CSL citation style | valued | citation-js default | all |
| `bibliography-heading` | overrides the "References" heading | valued | "References" | all |
| `bibliography-position` | *reserved (future)* | valued | — | all |
| **Notes** | | | | |
| `note-scope` | where notes collect | document \| chapter \| section | section (art) / chapter (book) | all |
| `note-position` | note render mode (#33) | bottom \| margin | bottom | all |
| **Book navigation** (book-only) | | | | |
| `chapter-nav` | the chapter rail | boolean | on | book |
| `chapter-nav-depth` | rail depth (1 = chapters; ≥2 + sections) | valued | 1 | book |
| `page-navigation` | prev/next chapter links | boolean | on | book |
| `cover` | cover landing page (off = land on ch. 1) | boolean | on | book |
| `back-to-top` | scroll-to-top within a chapter | boolean | **off** (the exception) | book |
| `split-by` | pagination unit (only `chapter` built) | chapter \| section \| none | chapter | book |
| **Display / DSL / strict** | | | | |
| `theme` | inject a theme's `:root` token overrides | valued | default theme | all |
| `strict-mode` | strictness register switch (#36) | off \| sigil \| canonical | off | all |
| `show-source` | reveal DSL source in a `<details>` (#19) | boolean | off | all |
| `parse-data-tables` | data-table cells parse as Enscribe markup (#21) | boolean | off | all |
| `display-style` | *reserved (future)* | valued | — | all |
| **Wildcard** | | | | |
| `ref-prefix-*` | per-type cross-ref prefix override | valued (wildcard) | — | all |

The `—` cells are defaults the allowlist Map's comments don't state — in the original plan those got filled by generating the grid from a structured config-options source plus a guard, rather than hand-keying them (the same single-source move as the catalogs). Want me to drop either of these into a repo file, or run down the missing numbering defaults against the live `numbering.js`?
