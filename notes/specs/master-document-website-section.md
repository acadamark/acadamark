# master-document.md — website structure (additions / edits)

> Grounded against main @ `006881a`. Three changes: (1) replace the website row in the type table;
> (2) add a "Website structure" subsection after "Structure entries"; (3) update the residual open item.
> The existing Outputs rule (website → HTML only) and the assembler line ("for websites — assembles the
> nav into pages") already stand and are consistent with the below.

---

## (1) Type table — replace the website row

Replace:

```
| website | `<header>` (`<icon>`, `<title>`, `<nav>` → `<item>`/`<dropdown>`), `<footer>`, sidebar, search, page navigation |
```

with:

```
| website | `<nav>` → `<item>` (page) + `<nav-group>` (group), `<footer>`; brand + icon from `<meta>` |
```

---

## (2) Add after "Structure entries"

### Website structure

A website's structure is a single navigation tree. The master declares a `<nav>` containing `<item>`
elements; that one tree is both the site's **page set** and its **menu structure** (as in Quarto, where one
declaration drives the navbar and the sidebar). There is no separate `<page>` element — a nav entry *is* a
page.

The two structural tags are `<item>` (a page) and `<nav-group>` (a grouping):

- **An external page** — `<item src="about.emd" | About>`. `src` names the page's child `.emd`; the pipe
  gives the menu label and overrides the child's own title, exactly as `<section src | Title>` does in an
  article.
- **An inline page** — `<item | Welcome>` followed by body content, authored in the master instead of a
  child file. Same inline form as `<section | Title>` + body: an open marker, peer-closed by the next entry.
  (So a website, like an article, mixes inline and referenced content freely.)
- **A group** — `<nav-group | Resources>` containing `<item>`s (and, later, nested `<nav-group>`s), with no
  `src` or body of its own. A group is a dropdown in the top bar and an expandable node in the sidebar.
  Keeping the group its own tag — rather than an `<item>` with children — means `<item>` is unambiguously a
  page and `<nav-group>` is unambiguously a grouping.

```
<nav>
   <item src="home.emd"  | Home>
   <item src="about.emd" | About>
   <nav-group | Resources>
      <item src="resources/tutorials.emd"     | Tutorials>
      <item src="resources/documentation.emd" | Documentation>
   </nav-group>
   <item src="contact.emd" | Contact>
</nav>
```

The nav tree feeds **both** navigation surfaces: its top level becomes the top bar, and the tree as a whole
feeds the automatic sidebar. The first cut is shallow — one level of grouping; deeper nesting is later work.

`<nav>`/`<nav-group>`/`<item>` reuse the **list-structuring machinery**: a nav tree is a nested list, parsed
exactly as `<list>`/`<li>` (peer-closed entries; a `<nav-group>` is a sublist). The website structurer shares
that code rather than adding a second nested-structure parser. The `src` / pipe-title affordance is the same
one every structural element carries (`<section src>`, `<chapter src>`).

Site chrome is minimal and mostly metadata:

- The top-bar **brand name** is `<meta>`'s `title`; the **icon** is `<meta>`'s `icon`. There are no
  in-header `<title>`/`<icon>` tags — the redundant chrome of the original sketch is dropped.
- `<footer src="footer.emd">` is the **site-wide** footer, declared once in the master (like the nav, it is
  not per-page).

A page's content — inline body or referenced `.emd` — is an ordinary document body, the same vocabulary an
article uses.

**Composition is independent of rendering.** The master *assembles* the pages (inline or external) into the
site; *how* the site is then rendered — static, the live shell, or (future) `enscribe serve` — is the
render/serve matrix, not the structure. The first build targets the existing live render (already
type-agnostic over article/book); the static per-page projection and `enscribe serve` follow later.

---

## (3) Update the residual open item

Replace:

```
- Website page model for anything outside the nav (a home/landing body, blog-style listings).
```

with:

```
- Website: a distinct home/landing body (a hero/feature layout beyond a plain page) and blog-style auto-listings — content beyond the nav-declared pages. (The core page model — nav items as inline/external pages — is settled.)
```
