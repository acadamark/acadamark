---
semantic_role: navigation-item
category: navigation
semantic_family: structural-scaffolding
html_output:
  element: item
  is_html_native: false
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    src:
      maps_to: data-src
      notes: |
        For an EXTERNAL page: the child `.emd` file that supplies the page body. The
        pipe gives the menu label and overrides the child's own title, exactly as
        `<section src | Title>` does in an article. Omitted for an INLINE page, whose
        body is authored in the master after the `<item | Title>` marker (peer-closed
        by the next entry, the `<section | Title>` model). The website render (S2)
        loads the child; S1 records the `src` as a reference only.
content:
  shape:
    - element: body
      required: false
      contains: [inline, block]
interpreter_strategy: schema
related_plugins:
  - name: enscribeWebsiteStructuring
    runs_before: enscribeInterpreter
    purpose: 'Records this page (external src or inline body) in the nav model with a ?page= slug (#246).'
---

# `<item>`

A page in a website `<nav>` (#246). A nav entry *is* a page — there is no separate `<page>` element. An `<item>` is either:

- **External** — `<item src="about.emd" | About>`. `src` names the page's child `.emd`; the pipe is the menu label.
- **Inline** — `<item | Welcome>` followed by body content authored in the master, peer-closed by the next entry (the `<section | Title>` model). So a website, like an article, mixes inline and referenced content freely.

Both forms are short-form (pipe/`src`) leaves; the body of an inline page is the following sibling blocks, not nested content. The `enscribeWebsiteStructuring` plugin records each page in the nav model with a `?page=` slug (sourced from the menu title, falling back to the `src` filename stem). The website render (S2) turns each entry into a routed page; S1 does not load external pages.

## See also

- [`<nav>`](nav.md) — the navigation tree.
- [`<nav-group>`](nav-group.md) — a grouping of items.
