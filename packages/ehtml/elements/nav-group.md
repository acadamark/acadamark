---
semantic_role: navigation-group
category: navigation
semantic_family: structural-scaffolding
html_output:
  element: nav-group
  is_html_native: false
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    title:
      maps_to: data-title
      notes: |
        The group's display label — its heading in the top bar (a dropdown) and the
        sidebar (an expandable node). Supplied as a kwarg, NOT a pipe: a `<nav-group>`
        is a long-form container (neither `|` nor `/`), so the label cannot ride the
        pipe slot the way a page's title does.
content:
  shape:
    - element: item
      required: false
      contains: [item, nav-group]
interpreter_strategy: schema
related_plugins:
  - name: enscribeWebsiteStructuring
    runs_before: enscribeInterpreter
    purpose: 'Recurses this group into the nav model (#246).'
---

# `<nav-group>`

A grouping within a website `<nav>` (#246): a dropdown in the top bar and an expandable node in the sidebar. It contains `<item>` pages (and, later, nested `<nav-group>`s) and has **no `src` and no body of its own** — it purely groups.

```
<nav-group title="Resources">
<item src="tutorials.emd" | Tutorials>
<item src="documentation.emd" | Documentation>
</nav-group>
```

`<nav-group>` is a **long-form container** — written with neither `|` nor `/`, it pairs with `</nav-group>` and nests its children by the ordinary close-tag grammar (verified: a no-pipe tag is a long-form opener; a pipe-form tag is a self-delimiting leaf). Its label is the `title` kwarg, not a pipe — keeping `<item>` unambiguously a page and `<nav-group>` unambiguously a grouping. The first cut is shallow: one level of grouping; deeper nesting is later work.

## See also

- [`<nav>`](nav.md) — the navigation tree.
- [`<item>`](item.md) — a page entry.
