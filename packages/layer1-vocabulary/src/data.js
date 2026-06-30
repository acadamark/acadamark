// GENERATED — do not edit.
// Regenerated from `packages/layer1-vocabulary/elements/*.md` by
// `packages/layer1-vocabulary/build/generate-data-module.js`.
// Source files: 109 vocabulary entries.
//
// The generator is build-time-only (it uses `fs` / `js-yaml`); the
// emitted module below is pure data — no `fs`, no dependencies,
// browser-safe. Consumers import `VOCABULARY` (and
// `VOCABULARY_ERRORS` for build-time-surfaced load issues).
//
// Shorthand aliases share the spec object reference of their target
// (matching the previous loader's identity behavior).

const _a = Object.freeze({
    "semantic_role": "a",
    "category": "inline-formatting",
    "html_output": {
      "element": "a",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "href": {
          "maps_to": {
            "html": "href",
          },
          "notes": "The URL or fragment identifier the anchor points to. Required\nfor hyperlinks; optional for anchors used as link targets.\n",
        },
        "target": {
          "maps_to": {
            "html": "target",
          },
          "values": [
            "_self",
            "_blank",
            "_parent",
            "_top",
          ],
          "notes": "How the link opens. _blank opens in a new tab/window.\n",
        },
        "rel": {
          "maps_to": {
            "html": "rel",
          },
          "notes": "Relationship between the current document and the link target.\nCommon values: nofollow, noopener, noreferrer, external.\n",
        },
        "title": {
          "maps_to": {
            "html": "title",
          },
          "notes": "Tooltip text shown on hover.\n",
        },
      },
      "positional": [
        {
          "name": "href",
          "notes": "The link target as the first positional argument:\n`<a https://example.com | text>`. The normalize-to-canonical gate\npromotes it to the `href` kwarg (the explicit `href=` form wins if\nboth are given). Covers ordinary absolute/relative URLs and query\nstrings unquoted; a fragment-only target (`#sec`) must use\n`href=\"#sec\"` because a leading `#` is the id sigil, and a URL\ncontaining `>` or spaces must use the `href=\"...\"` kwarg (there is no\nquoted-positional form).\n",
        },
      ],
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
      "notes": "Link text. The visible label for the link.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "ext-link",
      "attributes": {
        "ext-link-type": "uri",
        "xlink:href": "from href",
      },
      "notes": "JATS uses <ext-link> for external links and <xref> for internal\ncross-references. Enscribe's <a> maps to <ext-link> for external\nURLs; for internal references (enscribe id targets), the JATS\nexporter typically transforms the link into an <xref> instead.\n",
    },
    "shorthand_examples": [
      {
        "source": "See <a https://example.com/docs | the documentation>.",
        "layer1_html": "<p>See <a href=\"https://example.com/docs\">the documentation</a>.</p>",
        "notes": "The positional URL form — the target is the first argument, the pipe\ncontent is the link text. The most common authoring path. (Markdown\n`[text](url)` is not an enscribe idiom; it renders as literal text.)\n",
      },
      {
        "source": "<a href=https://example.com | the example site>",
        "layer1_html": "<a href=\"https://example.com\">the example site</a>",
      },
      {
        "source": "<a href=https://example.com target=_blank rel=noopener | external link>",
        "layer1_html": "<a href=\"https://example.com\" target=\"_blank\" rel=\"noopener\">external link</a>",
      },
      {
        "source": "<a href=#section-2 | jump to Section 2>",
        "layer1_html": "<a href=\"#section-2\">jump to Section 2</a>",
        "notes": "Internal links use fragment identifiers pointing at element ids.\n",
      },
    ],
    "interpreter_strategy": "handler",
    "handler_module": "./handlers/a.js",
    "_sourceFile": "a.md",
  });

const _abbr = Object.freeze({
    "semantic_role": "abbr",
    "category": "inline-formatting",
    "html_output": {
      "element": "abbr",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "title": {
          "maps_to": {
            "html": "title",
          },
          "notes": "The abbreviation's expansion. Standard HTML <abbr title=\"...\"> —\nbrowsers display the expansion as a tooltip on hover. Strongly\nrecommended on first use of an abbreviation; optional on\nsubsequent uses if the expansion is already in scope.\n",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
      "notes": "The abbreviation as text — typically a short uppercase token\n(DOI, DOM, NASA, CSS, CRISPR). Inline elements may appear in the\ncontent though this is unusual.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "abbrev",
      "notes": "JATS uses <abbrev> with the expansion typically supplied either\nas the content of a child <def> element or as the title-like\nattribute, depending on the JATS version. The exporter maps\nenscribe's title kwarg to the JATS form the target schema expects.\n",
    },
    "shorthand_examples": [
      {
        "source": "The <abbr title=\"Document Object Model\" | DOM> is the browser API for HTML.",
        "layer1_html": "<p>The <abbr title=\"Document Object Model\">DOM</abbr> is the browser API for HTML.</p>",
        "notes": "Standard pattern — abbreviation with its expansion as the title\nkwarg. Browsers show the expansion in a hover tooltip.\n",
      },
      {
        "source": "Using <abbr | CSS> selectors.",
        "layer1_html": "<p>Using <abbr>CSS</abbr> selectors.</p>",
        "notes": "Bare abbreviation, no title. Acceptable when the expansion\nhas already been introduced earlier in the document.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "abbr.md",
  });

const _abstract = Object.freeze({
    "semantic_role": "abstract",
    "category": "metadata",
    "html_output": {
      "element": "abstract",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "type": {
          "maps_to": {
            "html": "data-abstract-type",
          },
          "values": [
            "unstructured",
            "structured",
            "graphical",
            "executive-summary",
            "other",
          ],
          "default": "unstructured",
          "notes": "Distinguishes abstract types. Structured abstracts have explicit\nsub-section headings (Background, Methods, Results, Conclusion);\nunstructured abstracts are flowing prose.\n",
        },
        "word-limit": {
          "maps_to": {
            "html": "data-word-limit",
          },
          "notes": "Optional documentation of the journal's word limit for this\nabstract. Informational only; does not enforce.\n",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "block",
        ],
      },
      "becomes": "children",
      "notes": "Abstract content. Single-paragraph or multi-paragraph. Structured\nabstracts may contain explicit sub-section elements.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "abstract",
      "attributes": {
        "abstract-type": "from type",
      },
    },
    "shorthand_examples": [
      {
        "source": "<abstract |\nThis paper presents new evidence that elephant populations\nsignificantly affect regional climate patterns through their\nrole in shaping vegetation and carbon storage.\n>\n",
        "layer1_html": "<abstract>\n  <p>This paper presents new evidence that elephant populations significantly affect regional climate patterns through their role in shaping vegetation and carbon storage.</p>\n</abstract>\n",
        "notes": "Unstructured abstract (the default). Single paragraph of summary prose.\n",
      },
      {
        "source": "<abstract type=structured |\n**Background:** Elephant populations have declined significantly.\n\n**Methods:** We surveyed 50 forest sites over 10 years.\n\n**Results:** Decline correlates with vegetation loss.\n\n**Conclusion:** Conservation efforts are essential.\n>\n",
        "layer1_html": "<abstract data-abstract-type=\"structured\"><p><b>Background:</b> Elephant populations have declined significantly.</p><p><b>Methods:</b> We surveyed 50 forest sites over 10 years.</p><p><b>Results:</b> Decline correlates with vegetation loss.</p><p><b>Conclusion:</b> Conservation efforts are essential.</p></abstract>",
        "notes": "Structured abstract using markdown bold for section headings.\nCommon in medical and scientific journals. The structure is\nvisible in the rendered output via the bold prefixes.\n",
      },
      {
        "source": "<abstract word-limit=250 |\nThis paper presents...\n>\n",
        "layer1_html": "<abstract data-word-limit=\"250\">\n  <p>This paper presents…</p>\n</abstract>\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "abstract.md",
  });

const _affiliation = Object.freeze({
    "semantic_role": "affiliation",
    "category": "metadata",
    "html_output": {
      "element": "affiliation",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
        "notes": "Optional id, useful for cross-referencing the affiliation from\nmultiple <author> elements (e.g. <author><affiliation #aff1 | …>)\nand reusing the id with subsequent authors.\n",
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
      "notes": "The affiliation as text — typically institution, department, city,\ncountry. Free-form short prose; inline elements (e.g. <i type=other>\nfor italicized institution names) work normally.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "aff",
      "notes": "JATS uses <aff> inside <contrib> (the JATS counterpart of <author>).\nMultiple authors sharing an affiliation reference it by id via\n<xref ref-type=\"aff\" rid=\"...\">; the exporter generates the xref\nstructure from enscribe's affiliation ids.\n",
    },
    "shorthand_examples": [
      {
        "source": "<author>\n  <name | Jane Goodall>\n  <affiliation | Anthropic>\n</author>\n",
        "layer1_html": "<author>\n  <name>Jane Goodall</name>\n  <affiliation>Anthropic</affiliation>\n</author>\n",
        "notes": "Simple author affiliation. The affiliation sits as a sub-element\nof <author>, parallel to other rich-author-metadata elements\n(<orcid>, <email>).\n",
      },
      {
        "source": "<author>\n  <name | Jane Goodall>\n  <affiliation #aff1 | Anthropic, San Francisco, USA>\n</author>\n<author>\n  <name | David Attenborough>\n  <affiliation #aff1 />\n</author>\n",
        "layer1_html": "<author>\n  <name>Jane Goodall</name>\n  <affiliation id=\"aff1\">Anthropic, San Francisco, USA</affiliation>\n</author>\n<author>\n  <name>David Attenborough</name>\n  <affiliation id=\"aff1\"></affiliation>\n</author>\n",
        "notes": "Shared affiliation. The id on the first affiliation lets\nsubsequent authors reference the same one by id via a\nself-closing tag. JATS exporter generates the appropriate\n<xref ref-type=\"aff\" rid=\"aff1\"> structure.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "affiliation.md",
  });

const _align = Object.freeze({
    "semantic_role": "align",
    "category": "math",
    "html_output": {
      "element": "align",
      "is_html_native": false,
      "default_attributes": {},
      "notes": "`html_output.element` is the vocabulary lookup key (must match the\ntagname). Handler emits `<align>` wrapper directly; the schema\nfield is not consulted under `interpreter_strategy: handler`.\n",
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "notes": "Author writes pure environment body (each line `lhs & rhs`,\nterminated by `\\\\`). The handler wraps in\n`\\begin{aligned}...\\end{aligned}` before passing to KaTeX. (KaTeX\nsupports the `aligned` environment for inline-into-disp-mode\ncontexts; the `align` LaTeX environment proper is a top-level\ndocument env that KaTeX does not support standalone. Using\n`aligned` inside KaTeX's displayMode produces the equivalent\nvisual output.)\n",
    },
    "content_handler": "align",
    "jats_counterpart": {
      "element": "disp-formula",
      "notes": "JATS does not have a dedicated `<align>` element. The LaTeX math\nenvironment maps to JATS `<disp-formula>` with `<tex-math>`\ncarrying the wrapped LaTeX source.\n",
    },
    "shorthand_examples": [
      {
        "source": "<align>\nx^2 + y^2 &= z^2 \\\\\na + b &= c\n</align>\n",
        "layer1_html": "<align>(KaTeX-rendered HTML of \\begin{aligned}...\\end{aligned})</align>\n",
        "notes": "Two aligned equations. The `&` marks the alignment column (here,\nthe `=` sign). Handler wraps in `\\begin{aligned}...\\end{aligned}`\n(KaTeX-compatible variant of LaTeX's `align`).\n",
      },
    ],
    "interpreter_strategy": "handler",
    "handler_module": "./handlers/math.js",
    "handler_responsibilities": [
      "Read the opaque content as LaTeX math-environment body.",
      "Wrap in `\\begin{aligned}...\\end{aligned}` (KaTeX-supported variant).",
      {
        "Render via KaTeX with `displayMode": "true`.",
      },
      "Emit an `<align>` wrapper element containing KaTeX's HTML output.",
      "Apply id / classes from the node.",
    ],
    "_sourceFile": "align.md",
  });

const _article_back = Object.freeze({
    "semantic_role": "article-back",
    "category": "structural-regions",
    "authoring": "generated",
    "html_output": {
      "element": "article-back",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "bibliography",
          "note-list",
          "book-part",
          "data",
          "config",
        ],
      },
    },
    "content_handler": "default",
    "interpreter_strategy": "schema",
    "_sourceFile": "article-back.md",
  });

const _article_body = Object.freeze({
    "semantic_role": "article-body",
    "category": "structural-regions",
    "authoring": "generated",
    "html_output": {
      "element": "article-body",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "block",
          "section",
        ],
      },
    },
    "content_handler": "default",
    "interpreter_strategy": "schema",
    "_sourceFile": "article-body.md",
  });

const _article_front = Object.freeze({
    "semantic_role": "article-front",
    "category": "structural-regions",
    "authoring": "generated",
    "html_output": {
      "element": "article-front",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "meta",
          "article-title",
          "article-subtitle",
          "author",
          "abstract",
          "data",
          "config",
        ],
      },
    },
    "content_handler": "default",
    "interpreter_strategy": "schema",
    "_sourceFile": "article-front.md",
  });

const _article_subtitle = Object.freeze({
    "semantic_role": "article-subtitle",
    "category": "metadata",
    "authoring": "generated",
    "html_output": {
      "element": "article-subtitle",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
    },
    "content_handler": "default",
    "interpreter_strategy": "schema",
    "_sourceFile": "article-subtitle.md",
  });

const _article_title = Object.freeze({
    "semantic_role": "article-title",
    "category": "metadata",
    "authoring": "generated",
    "html_output": {
      "element": "article-title",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
    },
    "content_handler": "default",
    "interpreter_strategy": "schema",
    "_sourceFile": "article-title.md",
  });

const _article = Object.freeze({
    "semantic_role": "article",
    "category": "document-containers",
    "html_output": {
      "element": "article",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "numbering-style": {
          "maps_to": {
            "html": "data-numbering-style",
          },
          "values": [
            "arabic",
            "roman",
            "alpha",
          ],
          "default": "arabic",
        },
        "note-position": {
          "maps_to": {
            "html": "data-note-position",
          },
          "values": [
            "bottom",
            "margin",
          ],
          "default": "bottom",
          "notes": "Document-level note render mode (#33): \"bottom\" (default) keeps numbered\nnotes at the foot of the document; \"margin\" projects each note into a\nmargin column beside its marker (Tufte sidenotes). Where notes COLLECT\n(per-note end/foot/side; per-section or per-chapter) is the per-note\n`placement` kwarg plus `note-scope`, not this attribute — see <note>.\n",
        },
      },
    },
    "content": {
      "shape": [
        {
          "element": "article-front",
          "required": false,
        },
        {
          "element": "article-body",
          "required": false,
        },
        {
          "element": "article-back",
          "required": false,
        },
      ],
    },
    "content_handler": "default",
    "title_extraction": true,
    "jats_counterpart": {
      "element": "article",
      "notes": "JATS <article> wraps <front>, <body>, and <back>. Enscribe uses\n<article-front>, <article-body>, <article-back> as parallel custom\nelements. The mapping is direct. JATS's article-type attribute (with\nvalues like research-article, review-article, editorial, etc.) is\nnot currently set by enscribe — sub-classification within the\narticle category is deferred until a JATS-export slice needs it.\n",
    },
    "shorthand_examples": [
      {
        "source": "<meta type=article>\n  <title | The Effect of Elephants on Climate>\n  <author | Jane Goodall>\n  <date | 2024-03-15>\n</meta>\n\n<section | Introduction>\nThe paper begins here.\n\n<section | Conclusion>\nThe paper concludes here.\n",
        "layer1_html": "<article>\n  <article-front>\n    <meta data-document-type=\"article\">\n      <article-title>The Effect of Elephants on Climate</article-title>\n      <author>Jane Goodall</author>\n      <date>2024-03-15</date>\n    </meta>\n  </article-front>\n  <article-body>\n    <section>\n      <section-title>Introduction</section-title>\n      <p>The paper begins here.</p>\n    </section>\n    <section>\n      <section-title>Conclusion</section-title>\n      <p>The paper concludes here.</p>\n    </section>\n  </article-body>\n</article>\n",
        "notes": "Typical authoring path: <meta type=article> at the top with no\n<article> wrapper. The structural plugin generates the <article>\ncontainer and the three region wrappers. <title> in <meta> is\npromoted to <article-title>; <meta> itself survives inside\n<article-front>.\n",
      },
      {
        "source": "<article | The Effect of Elephants on Climate>\n<meta>\n  <author | Jane Goodall>\n</meta>\n\n<section | Introduction>\nThe paper begins here.\n",
        "layer1_html": "<article>\n  <article-front>\n    <meta>\n      <article-title>The Effect of Elephants on Climate</article-title>\n      <author>Jane Goodall</author>\n    </meta>\n  </article-front>\n  <article-body>\n    <section>\n      <section-title>Introduction</section-title>\n      <p>The paper begins here.</p>\n    </section>\n  </article-body>\n</article>\n",
        "notes": "Explicit-form escape hatch: <article | Title>. The structural plugin\nrespects the explicit wrapper. Pipe content from <article> becomes\n<article-title>, placed as the first child of <meta> (creating\n<meta> if absent, or appending if present).\n",
      },
      {
        "source": "<section | Introduction>\nThe introduction.\n\n<section | Conclusion>\nThe conclusion.\n",
        "layer1_html": "<article>\n  <article-body>\n    <section>\n      <section-title>Introduction</section-title>\n      <p>The introduction.</p>\n    </section>\n    <section>\n      <section-title>Conclusion</section-title>\n      <p>The conclusion.</p>\n    </section>\n  </article-body>\n</article>\n",
        "notes": "No <meta> and no <article> declared. The structural plugin assumes\narticle-shaped (the default) and wraps the sections in an implicit\narticle. <article-front> is omitted because there's no metadata.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "related_plugins": [
      {
        "name": "enscribeArticleStructuring",
        "runs_before": "enscribeInterpreter",
        "purpose": "Reads <meta type=article> (or <meta> with no type, defaulting to\narticle) and generates the <article> wrapper plus\n<article-front>/<article-body>/<article-back> regions. Promotes\n<title>/<subtitle> in <meta> to <article-title>/<article-subtitle>.\nHonors explicit <article> if the author wrote it. See\nnotes/specs/pipeline.md for the full pipeline.\n",
      },
    ],
    "_sourceFile": "article.md",
  });

const _aside = Object.freeze({
    "semantic_role": "aside",
    "category": "block-prose",
    "html_output": {
      "element": "aside",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "type": {
          "maps_to": {
            "html": "data-aside-type",
          },
          "values": [
            "note",
            "sidebar",
            "callout",
            "warning",
            "tip",
            "info",
            "caution",
          ],
          "notes": "Optional classification of the aside's role. Affects rendering\n(callouts get visual emphasis; sidebars get layout treatment).\nMaps to JATS via boxed-text content-type at export.\n",
        },
        "title": {
          "handled_by": "handler",
          "notes": "Optional title rendered at the top of the aside (the frameable\ntitle-top convention, #31). Lifts to a <title> child tag at the\nnormalize-to-canonical gate; the child form is equivalent.\n",
        },
        "caption": {
          "handled_by": "handler",
          "notes": "Optional caption rendered at the foot of the aside (frameable\ncaption-bottom convention, #31), with the \"Box N.\" label folded in\nwhen numbered. Lifts to a <caption> child tag at the gate.\n",
        },
      },
      "booleans": {
        "numbered": {
          "handled_by": "handler",
          "default": false,
          "notes": "Whether this aside is numbered. **Off by default** (boxed prose is\nusually a one-off callout). When +numbered, the aside counts in its\nOWN \"Box N\" series (the `box` counter / ref-prefix `box`), not the\nfigure counter.\n",
        },
        "border": {
          "handled_by": "handler",
          "default": true,
          "notes": "Frameable surface (#31). **On by default for boxed prose** — the\nvisual box is the point of a callout / sidebar. Use -border to\nsuppress the outline.\n",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "block",
        ],
      },
      "becomes": "children",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "boxed-text",
      "notes": "All <aside> variants map to JATS <boxed-text>. The exporter sets\ncontent-type based on the type kwarg (e.g., type=note becomes\n<boxed-text content-type=\"note\">). Default (no type) maps to\n<boxed-text content-type=\"aside\">. JATS <notes> is reserved for\ndocument-level collected footnotes — see <note-list>, not <aside>.\n",
    },
    "shorthand_examples": [
      {
        "source": "<aside | A side note about the elephant.>",
        "layer1_html": "<aside class=\"frameable-border\"><p>A side note about the elephant.</p></aside>",
      },
      {
        "source": "<aside type=warning .important | Be careful here.>",
        "layer1_html": "<aside class=\"important frameable-border\" data-aside-type=\"warning\"><p>Be careful here.</p></aside>",
      },
      {
        "source": "<aside type=callout |\nThis is a multi-line callout.\n\nIt can contain multiple paragraphs and other content like\n<strong | emphasis> and inline references.\n>\n",
        "layer1_html": "<aside class=\"frameable-border\" data-aside-type=\"callout\"><p>This is a multi-line callout.</p><p>It can contain multiple paragraphs and other content like <strong>emphasis</strong> and inline references.</p></aside>",
      },
    ],
    "interpreter_strategy": "handler",
    "handler_module": "./handlers/aside.js",
    "_sourceFile": "aside.md",
  });

const _author = Object.freeze({
    "semantic_role": "author",
    "category": "structured-data-containers",
    "html_output": {
      "element": "author",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "name": {
          "lifts_to_child": "name",
          "notes": "The author's name. Authored as a kwarg, lifted at the\nnormalize-to-canonical gate to a <name> child tag. Equivalent\nto authoring <name | ...> inside the <author>'s child-tag form.\n",
        },
        "affiliation": {
          "lifts_to_child": "affiliation",
          "notes": "Author's institutional affiliation. Lifts to <affiliation>.\n",
        },
        "orcid": {
          "lifts_to_child": "orcid",
          "notes": "Author's ORCID identifier (e.g., 0000-0000-0000-0000). Lifts\nto <orcid>.\n",
        },
        "email": {
          "lifts_to_child": "email",
          "notes": "Author's contact email address. Lifts to <email>.\n",
        },
        "corresponding": {
          "maps_to": {
            "html": "corresponding",
          },
          "values": [
            "true",
            "false",
          ],
          "notes": "Marks this author as the corresponding author (JATS\ncontrib corresp=\"yes\"). A scalar marker — stays as a kwarg/\nattribute on the canonical Layer 1 <author>; never lifted to\na child tag. Both surface forms are accepted: +corresponding\n(boolean shorthand) and corresponding=true (explicit kwarg)\nboth normalize to a `corresponding=\"true\"` attribute on the\ncanonical Layer 1 node. The structured-element gate promotes\nthe +form into the kwarg surface so the schema renderer's\nattribute mapping fires uniformly.\n",
        },
      },
    },
    "content": {
      "shape": [
        {
          "element": "name",
          "required": false,
          "contains": [
            "inline",
          ],
        },
        {
          "element": "affiliation",
          "required": false,
          "multiple": true,
        },
        {
          "element": "orcid",
          "required": false,
        },
        {
          "element": "email",
          "required": false,
          "multiple": true,
        },
      ],
      "notes": "<author> is a structured-data-container tag (parallel to <meta>;\nsee DESIGN.md §\"Structured-data-container tags\"). It accepts two\nequivalent authoring forms: kwargs (scalar fields) and child tags\n(structured fields). The normalize-to-canonical gate lifts the\nkwarg form to the canonical child-tag form per the spec in\n@enscribejs/enscribe/core/structured-elements.js. The Layer 1 canonical\nshape carries child tags plus the +corresponding boolean kwarg.\n\nAn unrecognized child tag inside <author> produces an informative\ndiagnostic (warn, not error — the always-renders pattern).\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "contrib contrib-type=\"author\"",
      "notes": "JATS uses <contrib contrib-type=\"author\"> for authors. The structural\nJATS form uses <name><given-names>...</given-names><surname>...</surname></name>\ninside <contrib>. Enscribe's <name> is a single unparsed string\nmatching JATS's <string-name>; the exporter elects to emit\n<string-name> verbatim or decompose it into <surname>/<given-names>\nper the target schema's requirements. <affiliation>, <orcid>,\n<email> map to JATS <aff>, <contrib-id contrib-id-type=\"orcid\">,\nand <email> respectively. +corresponding becomes corresp=\"yes\" on\nthe <contrib> element.\n",
    },
    "shorthand_examples": [
      {
        "source": "<author | Jane Goodall>",
        "layer1_html": "<author>Jane Goodall</author>\n",
        "notes": "Backward-compatible casual form (carried forward from before the\nstructured-interface reconciliation). The pipe content sits as\ntext content of <author>; it is NOT lifted to a <name> child —\nauthors who want the structured shape use the kwarg form below\nor the child-tag form. JATS export reads the name string either\nway.\n",
      },
      {
        "source": "<author name=\"Jane Goodall\" orcid=\"0000-0001-2345-6789\" affiliation=\"Cambridge University\" +corresponding />",
        "layer1_html": "<author corresponding><name>Jane Goodall</name><orcid>0000-0001-2345-6789</orcid><affiliation>Cambridge University</affiliation></author>",
        "notes": "Kwarg form. Each lifted kwarg becomes a child tag at the gate;\n+corresponding stays as a boolean kwarg on the canonical\nLayer 1 <author>.\n",
      },
      {
        "source": "<author +corresponding>\n  <name | Jane Goodall>\n  <affiliation | Cambridge University>\n  <orcid | 0000-0001-2345-6789>\n  <email | jane@example.com>\n</author>\n",
        "layer1_html": "<author corresponding><name>Jane Goodall</name><affiliation>Cambridge University</affiliation><orcid>0000-0001-2345-6789</orcid><email><a href=\"mailto:jane@example.com\">jane@example.com</a></email></author>",
        "notes": "Child-tag form. The canonical Layer 1 shape. Both this form and\nthe equivalent kwarg form above produce the same Layer 1 output.\n",
      },
      {
        "source": "<meta>\n  <author | Jane Goodall>\n  <author | David Attenborough>\n  <author +corresponding | Charles Darwin>\n</meta>\n",
        "layer1_html": "<meta><author>Jane Goodall</author><author>David Attenborough</author><author corresponding>Charles Darwin</author></meta>",
        "notes": "Multiple authors are sibling <author> elements inside <meta>.\nThe third is the corresponding author. JATS export groups them\nas <contrib-group>.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "author.md",
  });

const _b = Object.freeze({
    "semantic_role": "b",
    "category": "inline-formatting",
    "html_output": {
      "element": "b",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "type": {
          "maps_to": {
            "html": "data-bold-type",
          },
          "values": [
            "keyword",
            "product-name",
            "lead",
            "offset",
            "other",
          ],
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "bold",
      "attributes": {
        "toggle": "no",
      },
    },
    "shorthand_examples": [
      {
        "source": "The keyword <b type=keyword | recursion> is fundamental.",
        "layer1_html": "<p>The keyword <b data-bold-type=\"keyword\">recursion</b> is fundamental.</p>",
      },
      {
        "source": "Use <b type=product-name | Acrobat> to read the file.",
        "layer1_html": "<p>Use <b data-bold-type=\"product-name\">Acrobat</b> to read the file.</p>",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "b.md",
  });

const _bib_entry = Object.freeze({
    "semantic_role": "bib-entry",
    "category": "citations-and-references",
    "authoring": "generated",
    "html_output": {
      "element": "bib-entry",
      "is_html_native": false,
      "default_attributes": {},
      "notes": "Enscribe's <bib-entry> is a custom element representing a single\nbibliography entry in structured form. It is generated output — the\ncitation plugins assemble it from <library> / external-file sources\n(parsed by citation-js); it is not authored field-by-field.\n",
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
        "required": true,
        "notes": "The citation key. Must be unique across the document's citation\nregistry. Citations elsewhere use this id to reference the entry.\n",
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "type": {
          "maps_to": {
            "html": "data-bib-type",
          },
          "values": [
            "article",
            "book",
            "chapter",
            "thesis",
            "proceedings",
            "report",
            "webpage",
            "other",
          ],
          "required": true,
          "notes": "The bibliography entry type. Determines required and optional\nchild elements, and how the entry renders in the bibliography.\n",
        },
      },
    },
    "content": {
      "shape": [
        {
          "element": "author",
          "required": false,
          "multiple": true,
          "notes": "Author(s) of the cited work. Multiple authors as siblings,\nsame as document <author>.\n",
        },
        {
          "element": "editor",
          "required": false,
          "multiple": true,
        },
        {
          "element": "year",
          "required": false,
        },
        {
          "element": "title",
          "required": false,
          "notes": "Title of the cited work (article title, book title, etc.).",
        },
        {
          "element": "journal",
          "required": false,
          "notes": "Journal name (for type=article).",
        },
        {
          "element": "publisher",
          "required": false,
          "notes": "Publisher name (for type=book, etc.).",
        },
        {
          "element": "volume",
          "required": false,
        },
        {
          "element": "issue",
          "required": false,
        },
        {
          "element": "pages",
          "required": false,
        },
        {
          "element": "doi",
          "required": false,
        },
        {
          "element": "isbn",
          "required": false,
        },
        {
          "element": "url",
          "required": false,
        },
      ],
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "ref (containing element-citation or mixed-citation)",
      "notes": "JATS uses <ref id=\"...\"> as the bibliography entry container,\nwith structured content as <element-citation> (when fully structured)\nor <mixed-citation> (when partially structured).\n",
    },
    "interpreter_strategy": "schema",
    "related_plugins": [
      {
        "name": "enscribeBibEntryRegistration",
        "runs_before": "enscribeCitationResolution",
        "purpose": "Registers <bib-entry> elements in the citation registry. See notes/specs/pipeline.md for the full pipeline.",
      },
    ],
    "_sourceFile": "bib-entry.md",
  });

const _bibliography = Object.freeze({
    "semantic_role": "bibliography",
    "category": "citations-and-references",
    "authoring": "generated",
    "html_output": {
      "element": "bibliography",
      "is_html_native": false,
      "default_attributes": {},
      "notes": "Enscribe's <bibliography> is the rendered bibliography container.\nDistinct from JATS's <ref-list>; the elements correspond but the names differ.\n",
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "style": {
          "maps_to": {
            "html": "data-bibliography-style",
          },
          "values": [
            "author-year",
            "numbered",
            "footnote",
            "custom",
          ],
          "notes": "Future — not yet implemented: the interpreter does not read this kwarg\nor emit data-bibliography-style. Planned: how the bibliography is\nrendered; typically inherits from the document-level citation-style,\nwith this kwarg overriding for the bibliography rendering specifically.\n",
        },
        "sort": {
          "maps_to": {
            "html": "data-bibliography-sort",
          },
          "values": [
            "alpha",
            "citation-order",
            "year",
            "none",
          ],
          "default": "alpha",
          "notes": "Future — not yet implemented: the interpreter does not read this kwarg\nor emit data-bibliography-sort. Planned: how bibliography entries are\nsorted. \"alpha\" is alphabetical by author surname (default for\nauthor-year styles); \"citation-order\" is the order in which entries are\nfirst cited (default for numbered styles).\n",
        },
        "type": {
          "maps_to": {
            "html": "data-bibliography-type",
          },
          "values": [
            "cited-only",
            "full",
            "hybrid",
          ],
          "default": "cited-only",
          "notes": "Future — not yet implemented: the interpreter does not read this kwarg\nor emit data-bibliography-type. Planned: which entries appear —\n\"cited-only\" includes only entries cited in the document; \"full\"\nincludes all registered entries; \"hybrid\" includes cited entries with a\nseparate \"Further Reading\" section.\n",
        },
      },
    },
    "content": {
      "shape": [
        {
          "element": "bib-entry",
          "required": false,
          "multiple": true,
          "notes": "When the bibliography is rendered (auto-generated), entries appear\nas children. Authors don't typically write these directly — the\nbibliography assembly plugin populates the element.\n",
        },
      ],
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "ref-list",
      "notes": "JATS uses <ref-list> as the bibliography container, with <ref>\nchildren for each entry. Direct mapping.\n",
    },
    "interpreter_strategy": "schema",
    "generated_by": [
      {
        "plugin": "enscribeBibliographyAssembly",
        "when": "The document has citations or bibliography entries. The plugin\ncollects all cited entries from the citation registry and renders\nthem as children of <bibliography>. Auto-placed in article-back\nor book-back unless explicitly written by the author.\n",
      },
    ],
    "related_plugins": [
      {
        "name": "enscribeBibliographyAssembly",
        "runs_after": "enscribeCitationResolution",
        "purpose": "Assembles cited entries into <bibliography> per the configured style. See notes/specs/pipeline.md for the full pipeline.",
      },
    ],
    "_sourceFile": "bibliography.md",
  });

const _blockquote = Object.freeze({
    "semantic_role": "blockquote",
    "category": "block-prose",
    "html_output": {
      "element": "blockquote",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "cite": {
          "maps_to": {
            "html": "cite",
          },
          "notes": "URL of the source being quoted. Maps to HTML's standard cite\nattribute on <blockquote>. For inline citation references\n(citing a bibliography entry), use a <cite> element inside the\nblockquote instead.\n",
        },
        "type": {
          "maps_to": {
            "html": "data-blockquote-type",
          },
          "values": [
            "verse",
            "dialogue",
            "epigraph",
            "pullquote",
            "other",
          ],
          "notes": "Optional classification of the quotation's role. Affects styling\nand may affect JATS export.\n",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "block",
        ],
      },
      "becomes": "children",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "disp-quote or epigraph",
      "notes": "JATS uses <disp-quote> for displayed quotations in the main flow and\n<epigraph> for opening epigraphs. The exporter dispatches based on type:\ntype=epigraph maps to <epigraph>; everything else to <disp-quote>.\n",
    },
    "shorthand_expansions": [
      {
        "shorthand": "quote",
        "expands_to": "blockquote",
        "notes": "Authoring shortcut. <quote> is the preferred authoring form;\n<blockquote> is the Layer 1 element. The shorthand expands at\nthe interpreter; the rendered HTML uses HTML's native <blockquote>.\n",
      },
    ],
    "shorthand_examples": [
      {
        "source": "<quote | A short quotation.>",
        "layer1_html": "<blockquote><p>A short quotation.</p></blockquote>",
        "notes": "The <quote> shorthand expands to <blockquote> at Layer 1.\n",
      },
      {
        "source": "<quote cite=https://example.com/source |\nA longer quotation that may contain multiple paragraphs.\n\nThe second paragraph of the quotation.\n>\n",
        "layer1_html": "<blockquote cite=\"https://example.com/source\">\n  <p>A longer quotation that may contain multiple paragraphs.</p>\n  <p>The second paragraph of the quotation.</p>\n</blockquote>\n",
      },
      {
        "source": "<quote type=epigraph |\nAll happy families are alike; each unhappy family is unhappy in its own way.\n>\n",
        "layer1_html": "<blockquote data-blockquote-type=\"epigraph\">\n  <p>All happy families are alike; each unhappy family is unhappy in its own way.</p>\n</blockquote>\n",
      },
      {
        "source": "<blockquote | Same as `<quote>` but using the explicit Layer 1 name.>",
        "layer1_html": "<blockquote><p>Same as <code>&#x3C;quote></code> but using the explicit Layer 1 name.</p></blockquote>",
        "notes": "Authors can also write <blockquote> directly. Both forms produce\nthe same Layer 1 output.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "blockquote.md",
  });

const _book_back = Object.freeze({
    "semantic_role": "book-back",
    "category": "structural-regions",
    "authoring": "generated",
    "html_output": {
      "element": "book-back",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "bibliography",
          "note-list",
          "book-part",
          "data",
          "config",
        ],
      },
    },
    "content_handler": "default",
    "interpreter_strategy": "schema",
    "_sourceFile": "book-back.md",
  });

const _book_body = Object.freeze({
    "semantic_role": "book-body",
    "category": "structural-regions",
    "authoring": "generated",
    "html_output": {
      "element": "book-body",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "book-part",
        ],
      },
    },
    "content_handler": "default",
    "interpreter_strategy": "schema",
    "_sourceFile": "book-body.md",
  });

const _book_front = Object.freeze({
    "semantic_role": "book-front",
    "category": "structural-regions",
    "authoring": "generated",
    "html_output": {
      "element": "book-front",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "meta",
          "book-title",
          "book-subtitle",
          "author",
          "editor",
          "book-part",
          "data",
          "config",
        ],
      },
    },
    "content_handler": "default",
    "interpreter_strategy": "schema",
    "_sourceFile": "book-front.md",
  });

const _book_part_subtitle = Object.freeze({
    "semantic_role": "book-part-subtitle",
    "category": "metadata",
    "authoring": "generated",
    "html_output": {
      "element": "book-part-subtitle",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
    },
    "content_handler": "default",
    "interpreter_strategy": "schema",
    "_sourceFile": "book-part-subtitle.md",
  });

const _book_part_title = Object.freeze({
    "semantic_role": "book-part-title",
    "category": "metadata",
    "authoring": "generated",
    "html_output": {
      "element": "book-part-title",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
    },
    "content_handler": "default",
    "interpreter_strategy": "schema",
    "_sourceFile": "book-part-title.md",
  });

const _book_part = Object.freeze({
    "semantic_role": "book-part",
    "category": "document-containers",
    "requires-context": "book",
    "html_output": {
      "element": "book-part",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "type": {
          "maps_to": {
            "html": "book-part-type",
          },
          "values": [
            "chapter",
            "part",
            "appendix",
            "preface",
            "foreword",
            "introduction",
            "conclusion",
            "glossary",
            "dedication",
            "afterword",
            "colophon",
            "other",
          ],
          "regions": {
            "front": [
              "preface",
              "foreword",
              "dedication",
            ],
            "back": [
              "appendix",
              "glossary",
              "colophon",
              "afterword",
            ],
          },
          "required": true,
          "notes": "The kind of book-part. Authored as `type` (the prefix is redundant inside a\n<book-part>); renders to the HTML/BITS attribute `book-part-type` (maps_to).\nDistinct from <meta type>, which is the document class. Always present in\nLayer 1; the shorthand layer typically supplies it via a shorthand element\nname (e.g., <chapter> sets it to \"chapter\").\n",
        },
        "numbering-style": {
          "maps_to": {
            "html": "data-numbering-style",
          },
          "values": [
            "arabic",
            "roman",
            "alpha",
            "none",
          ],
        },
        "note-position": {
          "maps_to": {
            "html": "data-note-position",
          },
          "values": [
            "bottom",
            "margin",
          ],
          "notes": "Document-level note render mode (#33): \"bottom\" / \"margin\". Collection\n(the per-note `placement` kwarg and `note-scope`) is a separate axis —\nsee <note>.\n",
        },
      },
      "booleans": {
        "unlisted": {
          "maps_to": {
            "html": "unlisted",
          },
          "default": false,
          "notes": "Keep this book-part out of the generated table of contents, regardless of\ntoc-depth (#218) — e.g. a preface or an index chapter that should not\nappear in the contents. Display-only: it still renders; it is only absent\nfrom the contents listing. See notes/specs/toc-and-numbering.md. Authored\nas +unlisted; renders to the HTML attribute unlisted.\n",
        },
        "unnumbered": {
          "maps_to": {
            "html": "unnumbered",
          },
          "default": false,
          "notes": "Skip this book-part's number, regardless of number-depth (#218) — e.g. an\nunnumbered \"Introduction\" chapter. Outside the numbered sequence: no number,\nno counter advance (the next numbered chapter continues unbroken), subtree\nunnumbered. (Front-matter and non-appendix back-matter are already unnumbered\nby region.) See notes/specs/toc-and-numbering.md. Authored as +unnumbered.\n",
        },
      },
    },
    "content": {
      "shape": [
        {
          "element": "meta",
          "required": false,
          "contains": [
            "book-part-title",
            "book-part-subtitle",
            "author",
          ],
          "notes": "Book-parts use the same <meta> container as articles and books for\ndescriptive metadata. Unlike books, book-parts do NOT have nested\n<book-part-front>/<book-part-body>/<book-part-back> wrappers —\n<meta> and body content sit directly inside <book-part>.\n",
        },
        {
          "element": "body",
          "required": false,
          "contains": [
            "section",
            "sub-section",
            "p",
            "figure",
            "aside",
            "blockquote",
            "table",
            "book-part",
          ],
          "notes": "Body content sits as direct children of <book-part> after <meta>.",
        },
      ],
    },
    "content_handler": "default",
    "title_extraction": true,
    "jats_counterpart": {
      "element": "book-part",
      "attributes": {
        "book-part-type": "from type",
      },
      "notes": "Direct mapping to JATS <book-part>. The canonical `type` kwarg emits the BITS `book-part-type` attribute. Recursive structure preserved exactly.",
    },
    "shorthand_expansions": [
      {
        "shorthand": "chapter",
        "expands_to": "book-part type=\"chapter\"",
        "notes": "The most common book-part type.",
      },
      {
        "shorthand": "part",
        "expands_to": "book-part type=\"part\"",
        "notes": "Named major divisions (\"Part I: Foundations\").",
      },
      {
        "shorthand": "appendix",
        "expands_to": "book-part type=\"appendix\"",
        "notes": "Typically appears in book-back.",
      },
      {
        "shorthand": "preface",
        "expands_to": "book-part type=\"preface\"",
        "notes": "Front-matter prose by the author. Typically in book-front.",
      },
      {
        "shorthand": "foreword",
        "expands_to": "book-part type=\"foreword\"",
        "notes": "Front-matter prose by someone other than the author.",
      },
      {
        "shorthand": "introduction",
        "expands_to": "book-part type=\"introduction\"",
      },
      {
        "shorthand": "conclusion",
        "expands_to": "book-part type=\"conclusion\"",
      },
      {
        "shorthand": "glossary",
        "expands_to": "book-part type=\"glossary\"",
      },
      {
        "shorthand": "dedication",
        "expands_to": "book-part type=\"dedication\"",
        "notes": "Front-matter dedication. Typically in book-front.",
      },
      {
        "shorthand": "afterword",
        "expands_to": "book-part type=\"afterword\"",
        "notes": "Back-matter closing prose. Typically in book-back.",
      },
    ],
    "shorthand_examples": [
      {
        "source": "<chapter | Origins>\nContent of the chapter.\n",
        "layer1_html": "<book-part book-part-type=\"chapter\">\n  <meta>\n    <book-part-title>Origins</book-part-title>\n  </meta>\n  <p>Content of the chapter.</p>\n</book-part>\n",
      },
      {
        "source": "<part | Part I: Foundations>\n<chapter | First Chapter>\nContent.\n\n<chapter | Second Chapter>\nContent.\n",
        "layer1_html": "<book-part book-part-type=\"part\">\n  <meta>\n    <book-part-title>Part I: Foundations</book-part-title>\n  </meta>\n  <book-part book-part-type=\"chapter\">\n    <meta>\n      <book-part-title>First Chapter</book-part-title>\n    </meta>\n    <p>Content.</p>\n  </book-part>\n  <book-part book-part-type=\"chapter\">\n    <meta>\n      <book-part-title>Second Chapter</book-part-title>\n    </meta>\n    <p>Content.</p>\n  </book-part>\n</book-part>\n",
      },
      {
        "source": "<preface | A Note from the Author>\nI wrote this book because...\n\n<chapter | Chapter One>\nBody content.\n\n<appendix | Notation>\nNotation conventions used in this book.\n",
        "layer1_html": "<book-part book-part-type=\"preface\">\n  <meta>\n    <book-part-title>A Note from the Author</book-part-title>\n  </meta>\n  <p>I wrote this book because...</p>\n</book-part>\n\n<book-part book-part-type=\"chapter\">\n  <meta>\n    <book-part-title>Chapter One</book-part-title>\n  </meta>\n  <p>Body content.</p>\n</book-part>\n\n<book-part book-part-type=\"appendix\">\n  <meta>\n    <book-part-title>Notation</book-part-title>\n  </meta>\n  <p>Notation conventions used in this book.</p>\n</book-part>\n",
        "notes": "The structural plugin places the preface in book-front, the chapter\nin book-body, and the appendix in book-back based on book-part-type.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "related_plugins": [
      {
        "name": "enscribeBookStructuring",
        "runs_before": "enscribeInterpreter",
        "purpose": "Generates <book-part> from <meta type=book-part> or from book-part\nshorthand expansions (<chapter>, <part>, <appendix>, etc.). Inside\neach <book-part>, <meta> and body content sit directly — no nested\nfront/body/back wrappers. Promotes <title>/<subtitle> in <meta> to\n<book-part-title>/<book-part-subtitle>. At the book level, places\nbook-parts into the appropriate region (<book-front>, <book-body>,\n<book-back>) based on book-part-type. See notes/specs/pipeline.md.\n",
      },
    ],
    "deferred_features": [
      {
        "name": "book-part-import",
        "description": "Future support for <book-part src=\"...\"> and shorthand forms\n(<chapter src=\"...\">, <part src=\"...\">) to reference book-parts from\nexternal files.\n",
      },
    ],
    "_sourceFile": "book-part.md",
  });

const _book_subtitle = Object.freeze({
    "semantic_role": "book-subtitle",
    "category": "metadata",
    "authoring": "generated",
    "html_output": {
      "element": "book-subtitle",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
    },
    "content_handler": "default",
    "interpreter_strategy": "schema",
    "_sourceFile": "book-subtitle.md",
  });

const _book_title = Object.freeze({
    "semantic_role": "book-title",
    "category": "metadata",
    "authoring": "generated",
    "html_output": {
      "element": "book-title",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
    },
    "content_handler": "default",
    "interpreter_strategy": "schema",
    "_sourceFile": "book-title.md",
  });

const _book = Object.freeze({
    "semantic_role": "book",
    "category": "document-containers",
    "html_output": {
      "element": "book",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "numbering-style": {
          "maps_to": {
            "html": "data-numbering-style",
          },
          "values": [
            "arabic",
            "roman",
            "alpha",
          ],
          "default": "arabic",
        },
        "note-position": {
          "maps_to": {
            "html": "data-note-position",
          },
          "values": [
            "bottom",
            "margin",
          ],
          "default": "bottom",
          "notes": "Document-level note render mode (#33): \"bottom\" (default) / \"margin\"\n(Tufte sidenotes). Where notes COLLECT — including per-chapter — is the\nper-note `placement` kwarg plus `note-scope` (a book defaults to\n`note-scope=chapter`), not this attribute. See <note>.\n",
        },
      },
    },
    "content": {
      "shape": [
        {
          "element": "book-front",
          "required": false,
        },
        {
          "element": "book-body",
          "required": false,
        },
        {
          "element": "book-back",
          "required": false,
        },
      ],
    },
    "content_handler": "default",
    "title_extraction": true,
    "jats_counterpart": {
      "element": "book",
      "notes": "JATS <book> wraps <book-front>, <book-body>, and <book-back>. Enscribe's\nstructural elements map directly. JATS uses <book-part> recursively for\nall major divisions discriminated by the book-part-type attribute.\nJATS's book-type attribute (with values like monograph, edited-volume,\ntextbook, etc.) is not currently set by enscribe — sub-classification\nwithin the book category is deferred until a JATS-export slice needs it.\n",
    },
    "shorthand_examples": [
      {
        "source": "<meta type=book>\n  <title | A Natural History of Elephants>\n  <author | Jane Goodall>\n</meta>\n\n<chapter | Origins>\n<section | Early ancestors>\nContent here.\n\n<chapter | Modern populations>\n<section | African elephants>\nContent here.\n",
        "layer1_html": "<book>\n  <book-front>\n    <meta data-document-type=\"book\">\n      <book-title>A Natural History of Elephants</book-title>\n      <author>Jane Goodall</author>\n    </meta>\n  </book-front>\n  <book-body>\n    <book-part book-part-type=\"chapter\">\n      <meta>\n        <book-part-title>Origins</book-part-title>\n      </meta>\n      <section>\n        <section-title>Early ancestors</section-title>\n        <p>Content here.</p>\n      </section>\n    </book-part>\n    <book-part book-part-type=\"chapter\">\n      <meta>\n        <book-part-title>Modern populations</book-part-title>\n      </meta>\n      <section>\n        <section-title>African elephants</section-title>\n        <p>Content here.</p>\n      </section>\n    </book-part>\n  </book-body>\n</book>\n",
        "notes": "Typical authoring path: <meta type=book> at the top with no <book>\nwrapper. The structural plugin generates <book> + the three region\nwrappers. Each book-part contains its own <meta> with the promoted\n<book-part-title>; no <book-part-meta> wrapper.\n",
      },
      {
        "source": "<meta type=book>\n  <title | The Comprehensive Guide>\n  <author | Author Name>\n</meta>\n\n<part | Part I: Foundations>\n<chapter | First Principles>\nContent.\n\n<chapter | Background>\nContent.\n\n<part | Part II: Applications>\n<chapter | Practical Examples>\nContent.\n",
        "layer1_html": "<book><book-front><meta data-document-type=\"book\"><book-title>The Comprehensive Guide</book-title><author>Author Name</author></meta></book-front><book-body><book-part book-part-type=\"part\"><meta><book-part-title>Part I: Foundations</book-part-title></meta></book-part><book-part book-part-type=\"chapter\"><meta><book-part-title>First Principles</book-part-title></meta><p>Content.</p></book-part><book-part book-part-type=\"chapter\"><meta><book-part-title>Background</book-part-title></meta><p>Content.</p></book-part><book-part book-part-type=\"part\"><meta><book-part-title>Part II: Applications</book-part-title></meta></book-part><book-part book-part-type=\"chapter\"><meta><book-part-title>Practical Examples</book-part-title></meta><p>Content.</p></book-part></book-body></book>",
      },
    ],
    "interpreter_strategy": "schema",
    "related_plugins": [
      {
        "name": "enscribeBookStructuring",
        "runs_before": "enscribeInterpreter",
        "purpose": "Reads <meta type=book> and generates the <book> wrapper plus\n<book-front>/<book-body>/<book-back> regions. Promotes\n<title>/<subtitle> in <meta> to <book-title>/<book-subtitle>.\nExpands book-part shorthands (<chapter>, <part>, <appendix>, etc.)\nto <book-part book-part-type=\"...\">. Honors explicit <book> if\nthe author wrote it. See notes/specs/pipeline.md for the full pipeline.\n",
      },
    ],
    "deferred_features": [
      {
        "name": "book-part-import",
        "description": "Future support for <book-part src=\"...\"> and shorthand forms\n(<chapter src=\"...\">, <part src=\"...\">) to reference book-parts from\nexternal files. The build system would inline the referenced content\nbefore rendering.\n",
      },
    ],
    "_sourceFile": "book.md",
  });

const _caption = Object.freeze({
    "semantic_role": "caption",
    "category": "frameables",
    "html_output": {
      "element": "caption",
      "is_html_native": true,
      "default_attributes": {},
      "notes": "`<caption>` is the canonical child-tag authoring form for a frameable's\ncaption (Phase 3 slice 3c). The frameable handler consumes it and renders\nit as the wrapper-appropriate element — `<figcaption>` inside a figure /\nsvg / frame, `<caption>` inside a table. A `caption=` kwarg lowers to this\nchild form before the handler runs, so every frameable receives one shape.\n",
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "block",
        ],
      },
      "becomes": "children",
      "notes": "A caption is flow content: it can hold one or several paragraphs (and\nblock content). Per the single-paragraph wrapping rule\n(notes/specs/shape-tokens.md \"Content model and single-paragraph\nwrapping\"), `contains: [block]` classifies it as flow, so a\nsingle-paragraph caption WRAPS in `<p>` — identical to the\nmulti-paragraph case, and identical across both authoring forms (the\n`<caption>` child tag and the legacy pipe-content-as-caption fallback),\nwhich both route through the one parse-time content-model gate.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "caption",
      "notes": "JATS models a float caption as <caption> (containing <title>? and\n<p>+), inside <fig> / <table-wrap>. The flow content model here matches\nJATS's <p>-bearing caption.\n",
    },
    "interpreter_strategy": "schema",
    "_sourceFile": "caption.md",
  });

const _cases = Object.freeze({
    "semantic_role": "cases",
    "category": "math",
    "html_output": {
      "element": "cases",
      "is_html_native": false,
      "default_attributes": {},
      "notes": "`html_output.element` is the vocabulary lookup key (must match the\ntagname). Handler emits `<cases>` wrapper directly; the schema\nfield is not consulted under `interpreter_strategy: handler`.\n",
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "notes": "Author writes pure environment body (each case on its own line,\nterminated by `\\\\`, with `&` separating value from condition). The\nhandler wraps in `\\begin{cases}...\\end{cases}` before passing to\nKaTeX.\n",
    },
    "content_handler": "cases",
    "jats_counterpart": {
      "element": "disp-formula",
      "notes": "JATS does not have a dedicated `<cases>` element. The LaTeX math\nenvironment maps to JATS `<disp-formula>` with `<tex-math>`\ncarrying the wrapped LaTeX source.\n",
    },
    "shorthand_examples": [
      {
        "source": "<cases>\nx^2 & \\text{if } x \\ge 0 \\\\\n-x^2 & \\text{if } x < 0\n</cases>\n",
        "layer1_html": "<cases>(KaTeX-rendered HTML of \\begin{cases}...\\end{cases})</cases>\n",
        "notes": "A two-case piecewise definition. Handler wraps in\n`\\begin{cases}...\\end{cases}`.\n",
      },
    ],
    "interpreter_strategy": "handler",
    "handler_module": "./handlers/math.js",
    "handler_responsibilities": [
      "Read the opaque content as LaTeX math-environment body.",
      "Wrap in `\\begin{cases}...\\end{cases}`.",
      {
        "Render via KaTeX with `displayMode": "true`.",
      },
      "Emit a `<cases>` wrapper element containing KaTeX's HTML output.",
      "Apply id / classes from the node.",
    ],
    "_sourceFile": "cases.md",
  });

const _cite = Object.freeze({
    "semantic_role": "cite",
    "category": "citations-and-references",
    "requires-context": "bibliography",
    "html_output": {
      "element": "cite",
      "is_html_native": true,
      "default_attributes": {},
      "notes": "Enscribe's <cite> overlaps with HTML's <cite> (which marks \"the title\nof a work\"). Enscribe uses the element more broadly: it represents a\ncitation to a bibliography entry, with the rendered output determined\nby the citation style. The semantic intent is similar (referencing\nother work) but enscribe's version carries citation-resolver semantics\nthat HTML's plain <cite> doesn't.\n",
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "keys": {
          "handled_by": "handler",
          "notes": "One or more citation keys, supplied as positional arguments.\nMultiple keys group into a single citation: <cite key1 key2>\nrenders as a combined citation (e.g., \"(Smith 2020; Jones 2021)\").\n",
        },
        "page": {
          "handled_by": "handler",
          "notes": "Page number or page range for the citation locator.\nE.g., <cite goodall2024 page=42>.\n",
        },
        "chapter": {
          "handled_by": "handler",
          "notes": "Chapter reference within the cited work.\n",
        },
        "section": {
          "handled_by": "handler",
          "notes": "Section reference within the cited work.\n",
        },
        "prefix": {
          "handled_by": "handler",
          "notes": "Text to appear before the citation. E.g., \"see also\" in\n\"(see also Smith 2020)\".\n",
        },
        "suffix": {
          "handled_by": "handler",
          "notes": "Text to appear after the citation.\n",
        },
        "style": {
          "maps_to": {
            "html": "data-citation-style",
          },
          "values": [
            "author-year",
            "numbered",
            "footnote",
            "endnote",
            "inline-author-year",
            "default",
          ],
          "default": "default",
          "notes": "Override the document-level citation style for this citation.\n\"default\" uses the document-level <citation-style> from <config>.\n",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
      "notes": "Content inside <cite> is optional. When present, it overrides the\nautomatically-rendered citation text. Most citations have no content\n(the resolver generates the rendered text from the bibliography entry\nand the citation style).\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "xref ref-type=\"bibr\"",
      "attributes": {
        "rid": "from cite key",
      },
      "notes": "JATS uses <xref ref-type=\"bibr\" rid=\"...\"> for inline citations.\nThe rendered text inside the JATS xref is the citation marker\n(typically a number or author-year string). Enscribe's <cite>\nmaps directly. Multiple keys produce multiple <xref> elements\ngrouped together.\n",
    },
    "shorthand_examples": [
      {
        "source": "The argument is supported by data <cite goodall2024>.",
        "layer1_html": "<p>The argument is supported by data <cite data-cite-keys=\"goodall2024\">(Goodall 2024)</cite>.</p>",
        "notes": "A simple citation. The resolver renders the citation according\nto the document-level style. For author-year style, this becomes\n\"(Goodall 2024)\". For numbered style, \"[1]\". The actual rendered\ntext is generated by the citation resolver, not written by the author.\n",
      },
      {
        "source": "Multiple sources confirm this <cite goodall2024 attenborough2020 darwin1859>.",
        "layer1_html": "<p>Multiple sources confirm this <cite data-cite-keys=\"goodall2024 attenborough2020 darwin1859\">(Goodall 2024; Attenborough 2020; Darwin 1859)</cite>.</p>",
        "notes": "Multiple citation keys group into one citation marker. The resolver\nhandles the joining (with separators appropriate to the style).\n",
      },
      {
        "source": "See <cite goodall2024 page=42> for details.",
        "layer1_html": "<p>See <cite data-cite-keys=\"goodall2024\" data-page=\"42\">(Goodall 2024, p. 42)</cite> for details.</p>",
        "notes": "A citation with a page locator. The locator renders alongside the\ncitation marker.\n",
      },
      {
        "source": "See also <cite goodall2024 prefix=\"cf.\" page=42-45>.",
        "layer1_html": "<p>See also <cite data-cite-keys=\"goodall2024\" data-prefix=\"cf.\" data-page=\"42-45\">(cf. Goodall 2024, pp. 42-45)</cite>.</p>",
        "notes": "Citation with prefix and page range.\n",
      },
      {
        "source": "A specific work <cite goodall2024 style=footnote>.",
        "layer1_html": "<p>A specific work <cite data-cite-keys=\"goodall2024\" data-citation-style=\"footnote\">¹</cite>.</p>",
        "notes": "Per-citation style override. This citation renders as a footnote\nmarker even if the document-level style is something else.\n",
      },
    ],
    "interpreter_strategy": "handler",
    "handler_module": "./handlers/cite.js",
    "handler_responsibilities": [
      "Read the citation keys (positional arguments).",
      "Resolve each key against the citation registry (entries from external file, <library>, <bib-entry>).",
      "Apply the citation style (document-level or per-citation override).",
      "Generate the rendered citation marker text.",
      "Set the data-cite-keys attribute on the output for cross-reference back to source keys.",
      "Handle locator information (page, chapter, section).",
      "Handle prefix and suffix text.",
      "For unresolved keys, render an error marker (e.g., \"[?key]\") that's visible in output.",
    ],
    "related_plugins": [
      {
        "name": "enscribeCiteResolution",
        "runs_after": "enscribeLibraryLoad, enscribeArticleStructuring",
        "purpose": "Resolves <cite> elements against the citation registry; generates rendered markers. See notes/specs/pipeline.md for the full pipeline.",
      },
    ],
    "_sourceFile": "cite.md",
  });

const _code_block = Object.freeze({
    "semantic_role": "code-block",
    "category": "code",
    "html_output": {
      "element": "code-block",
      "is_html_native": false,
      "notes": "The vocabulary entry key is \"code-block\", but the rendered HTML does NOT\nuse a <code-block> wrapping element. The handler emits <pre><code ...>\ndirectly, matching the output of markdown fenced code blocks. The element\nfield is used only as a dispatch key for the interpreter.\n",
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
        "notes": "Placed on <code>. Used as cross-reference target.\n",
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
        "notes": "Added to <code> alongside any language class.\n",
      },
    },
    "content": {
      "notes": "The pipe content is verbatim code source. No markdown idioms or enscribe\nconstructs are interpreted inside the code block. Newlines are preserved.\n",
    },
    "shorthand_examples": [
      {
        "source": "<``` python | print(\"hello, world\") ```>",
        "layer1_html": "<pre><code class=\"language-python\"> print(\"hello, world\") </code></pre>",
        "notes": "The triple-backtick sigil. The first positional token is the\nlanguage (emitted as a `language-X` class on the <code>); the pipe\nseparates it from the verbatim, whitespace-preserving content — the\npipe-form padding (the spaces around the content) is KEPT, since\nwhitespace in code is significant and visible to the reader. (#327)\n",
      },
      {
        "source": "<``` this is all content ```>",
        "layer1_html": "<pre><code> this is all content </code></pre>",
        "notes": "The no-pipe form: the entire body is opaque content with no language\nextraction.\n",
      },
    ],
    "interpreter_strategy": "handler",
    "handler_module": "./handlers/code-block.js",
    "jats_counterpart": {
      "element": "code",
      "notes": "JATS <code> inside <preformat> for block code. The language attribute\nmaps to the JATS language attribute on <code>. Equation numbering and\ncross-references are handled separately.\n",
    },
    "_sourceFile": "code-block.md",
  });

const _code = Object.freeze({
    "semantic_role": "code",
    "category": "code",
    "html_output": {
      "element": "code",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "language": {
          "maps_to": {
            "html": "class (as language-X)",
          },
          "notes": "The programming language of the code. Maps to a class like\n\"language-python\" for syntax highlighting via shiki/prism.\n",
        },
      },
    },
    "content": {
      "becomes": "text-content",
      "notes": "Code content is preserved verbatim. No markdown idioms or enscribe\nconstructs are interpreted inside <code> elements.\n",
    },
    "content_handler": "code",
    "jats_counterpart": {
      "element": "monospace",
      "notes": "JATS uses <monospace> for inline code-like content. For block-level\ncode, JATS uses <code> wrapped in <preformat>. Enscribe's inline\n<code> maps to JATS <monospace>.\n",
    },
    "shorthand_examples": [
      {
        "source": "The function is `factorial`.",
        "layer1_html": "<p>The function is <code>factorial</code>.</p>",
        "notes": "Plain markdown backticks produce inline <code>. The most common\nauthoring path.\n",
      },
      {
        "source": "Use `<`code`>` for inline code.",
        "layer1_html": "<p>Use <code>&#x3C;</code>code<code>></code> for inline code.</p>",
        "notes": "The enscribe sigil form. Equivalent to plain markdown backticks\nbut supports attributes.\n",
      },
      {
        "source": "<code language=python | def hello(): print(\"hi\")>",
        "layer1_html": "<code class=\"language-python\">def hello(): print(\"hi\")</code>",
      },
      {
        "source": "<code #factorial-impl language=python | def factorial(n):>",
        "layer1_html": "<code id=\"factorial-impl\" class=\"language-python\">def factorial(n):</code>",
      },
    ],
    "interpreter_strategy": "handler",
    "handler_module": "./handlers/code.js",
    "handler_responsibilities": [
      "Pull the opaque content string from `node.content`.",
      "Honor the `language` kwarg (mapped to a `language-X` class for downstream syntax highlighters).",
      "Apply id / classes on the rendered `<code>` element.",
      "Emit a `<code>` element with the code text as a single text child.",
      "Mirrors handlers/inline-code.js's shape so long-form and sigil forms produce consistent output.",
    ],
    "_sourceFile": "code.md",
  });

const _config = Object.freeze({
    "semantic_role": "config",
    "category": "configuration",
    "html_output": {
      "element": "config",
      "is_html_native": false,
      "default_attributes": {},
      "notes": "Enscribe's <config> is a custom element. It does not produce inline\noutput; it carries build-time and render-time configuration that the\npipeline reads to determine how to process the document. The element\nis parsed during a discovery pass before body rendering.\n",
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "notes": "<config> accepts an allowlisted set of kwargs as its flat authoring\nform (the settled register for flat config; #134). The current\nallowlist (interpreter-side, see\npackages/enscribe/src/interpreter/lib/apparatus-allowlists.js):\n  - citation-style          (live; consumed by cite-resolution)\n  - number-equations        (live; consumed by numbering)\n  - number-figures          (live; consumed by numbering)\n  - number-tables           (live; consumed by numbering)\n  - number-sections         (live; consumed by numbering; default off for articles, on for books)\n  - number-depth            (live; consumed by numbering; deepest heading level that receives a number, #218; default all levels; INDEPENDENT of toc-depth)\n  - toc                     (live; consumed by index.js compiler → lib/toc.js; the config-driven contents listing, default off, #218 — see notes/specs/toc-and-numbering.md)\n  - toc-depth               (live; deepest heading level the contents lists; default 3)\n  - toc-title               (live; the heading shown above the listing; default \"Contents\")\n  - toc-location            (live; body | left | right; default body — body is inline near the top, left/right a sticky sidebar)\n  - toc-expand              (live; sidebar levels expanded initially; default 1; no effect on a body listing)\n  - show-source             (live; consumed by index.js compileToHtml → diagram handlers; default off — reveals authored DSL source in a <details> disclosure, #19)\n  - parse-data-tables       (live; consumed by the table-cell-parse plugin; default off — doc-wide default for whether data-format table cells parse as Enscribe inline markup, #21; per-table +parse-text / parse-columns / -parse-text override it)\n  - quiet                   (live; boolean; consumed by interpreter/index.js enscribeQuietSuppression — suppresses THIS document's authoring warnings (the vfile message stream: raw-HTML passthrough, mis-placed apparatus, …) from build/console output; page-scoped; gates emission only, rendering is untouched; default off; #281 — the supported way to quiet a teaching/demo page that deliberately shows warnings-worthy markup)\n  - ref-prefix-{prefix}     (live wildcard; consumed by ref-resolution)\n  - theme                   (live; consumed by index.js compileToHtml — injects a theme's :root token overrides, Phase 8 Slice 2)\n  - display-style           (reserved; future)\n  - note-position           (live; consumed by index.js compileToHtml → sidenotes — the #33 margin render mode, 'bottom' default / 'margin')\n  - strict-mode             (live; consumed by strict-mode.js #36: 'off' default / 'sigil' / 'canonical' — each names the loosest register still interpreted. 'sigil' turns the markdown register off (canonical + sigils stay); 'canonical' turns markdown AND sigils off, leaving only canonical named tags. Non-'off' rungs flag would-be-shorthand text)\n  - bibliography-position   (reserved; future)\n  (the reserved `reference-library` was retired: #133 makes external library\n  sources the body element `<library src=…>`, never a <config> kwarg)\nUnknown kwargs are dropped at the normalize-to-canonical gate with an\ninformative diagnostic. A <meta>-shaped kwarg (title, author, etc.) on\n<config> additionally triggers a \"did you mean <meta>?\" hint. Kwargs are\n<config>'s FLAT authoring form. Structured configuration is settled\n(#134) to be authored as a fenced DATA BLOCK inside <config> — a bounded\ndata-language island (e.g. YAML), the same pattern <library> uses for\nBibTeX and <$$> for LaTeX — NOT as a tree of child tags; that structured\nregister is future/unbuilt. <config> takes no\nchild elements today: the retired `<bibliography source=… />` form (#133)\nis replaced by the body element `<library src>` (see library.md /\nbibliography.md). See DESIGN.md \"Configuration and metadata are data\".\n",
      },
    },
    "content": {
      "notes": "<config> takes no child-element content. Its authoring form is kwargs\n(the flat config register documented in the kwargs block above), and it\nrenders as an empty <config></config>. Structured config is settled (#134)\nto be authored as a fenced DATA BLOCK inside <config> — a bounded\ndata-language island (e.g. YAML), the same pattern <library> uses for\nBibTeX — NOT a tree of child tags; that structured register is future and\nunbuilt. An earlier `type: structured` plus a child-element `shape` list\n(output-format, citation-style, numbering-style, note-position, stylesheet,\ntheme) modeled the rejected child-tag form and was removed in #167. See\nDESIGN.md \"Configuration and metadata are data\". (The `category:` field is\nleft unchanged here pending the taxonomy discussion in #166.)\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "no direct equivalent",
      "notes": "JATS doesn't have a single configuration element. Most configuration\nis handled at the publication-system level, not in JATS. Enscribe's\n<config> is decomposed at JATS export — relevant settings affect how\nthe export is generated; they don't appear in JATS output.\n",
    },
    "shorthand_examples": [
      {
        "source": "<config citation-style=author-year number-sections=true />",
        "layer1_html": "<config></config>",
        "notes": "The authoring form for <config> is kwargs. Settings are read at the\ndiscovery pass into the configuration registry; the element itself\nproduces no body output (it renders as an empty <config>).\n",
      },
      {
        "source": "<config number-figures=true number-tables=true show-source=true />",
        "layer1_html": "<config></config>",
        "notes": "More operational options, all from the live kwarg allowlist\n(citation-style, number-sections, number-figures, number-tables,\nnumber-equations, show-source, parse-data-tables, ref-prefix-*).\n",
      },
    ],
    "interpreter_strategy": "schema",
    "related_plugins": [
      {
        "name": "enscribeConfigDiscovery",
        "runs_before": "enscribeInterpreter",
        "purpose": "Phase 1 discovery — extracts <config> values into the configuration registry. See notes/specs/pipeline.md for the full pipeline.",
      },
    ],
    "_sourceFile": "config.md",
  });

const _corollary = Object.freeze({
    "semantic_role": "corollary",
    "category": "theorem-family",
    "html_output": {
      "element": "corollary",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "name": {
          "maps_to": {
            "html": "data-name",
          },
          "notes": "Optional name suffix for the corollary's label, parallel to\n<theorem>'s `name` kwarg.\n",
        },
      },
      "booleans": {
        "numbered": {
          "handled_by": "handler",
          "default": true,
          "notes": "Whether this corollary participates in the propositional\ntheorem-family shared counter. Default true.\n",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "block",
        ],
      },
      "becomes": "children",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "statement",
      "attributes": {
        "content-type": "corollary",
      },
      "notes": "JATS <statement content-type=\"corollary\">.\n",
    },
    "shorthand_examples": [
      {
        "source": "<corollary | Every prime greater than 2 is odd.>\n",
        "layer1_html": "<corollary><span class=\"corollary-label\">Corollary 1.</span><p>Every prime greater than 2 is odd.</p></corollary>",
      },
      {
        "source": "<corollary #cor:bounded>\nAny continuous function on a closed interval is bounded.\n</corollary>\n",
        "layer1_html": "<corollary id=\"cor:bounded\"><span class=\"corollary-label\">Corollary 1.</span><p>Any continuous function on a closed interval is bounded.</p></corollary>",
      },
    ],
    "interpreter_strategy": "handler",
    "handler_module": "./handlers/theorem.js",
    "_sourceFile": "corollary.md",
  });

const _data = Object.freeze({
    "semantic_role": "data",
    "category": "storage-hosts",
    "html_output": {
      "element": "data",
      "is_html_native": false,
      "default_attributes": {},
      "notes": "Enscribe's <data> is a custom element. It does not produce inline\noutput; it holds resources that other parts of the document reference.\nThe element is parsed and processed for its contents but does not\nrender visibly in the document body.\n",
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": [
        {
          "element": "library",
          "required": false,
          "multiple": true,
          "notes": "Inline bibliography blocks in BibTeX, CSL-JSON, or other formats.",
        },
        {
          "element": "bib-entry",
          "required": false,
          "multiple": true,
          "notes": "Structured bibliography entries authored in enscribe form.",
        },
        {
          "element": "fig",
          "required": false,
          "multiple": true,
          "notes": "Image asset (#190): embedded <fig #id png>base64</fig> (png/jpg/jpeg/svg/gif/webp) or external <fig #id src=\"path\" />, pulled into the body by <fig src=\"@id\" />. Merges project-wide across an assembled document. JATS <graphic> export (embedded → data: URI, external → rebased path; DTD-valid) is done. The opaque-store design — and consumers beyond <fig> (table/code/dataset) — is specced in notes/specs/data-store.md (#313).",
        },
        {
          "element": "dataset",
          "required": false,
          "multiple": true,
          "notes": "Opaque data store (#313 slice 1): <dataset #id format=csv | a,b\\n1,2> (or a leading-positional format, <dataset #id csv | …>) holds a CSV/TSV/JSON/… payload as OPAQUE bytes under its id — never markdown-parsed, so a #/*/_ in the payload passes through untouched. Pure storage: a consumer (<table src=\"@id\">, a future <plot>) interprets the bytes; <dataset> itself renders nothing (invisible, like <library>). Harvested into the project data store keyed by id (+ the optional format hint), project-wide merged. Consumer-side interpretation is slice 2; see notes/specs/data-store.md Piece 1.",
        },
      ],
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "no direct equivalent",
      "notes": "JATS doesn't have a single resource-block element. Enscribe's <data>\nis decomposed at JATS export: <library> entries are merged into\n<ref-list>; <bib-entry> entries become <ref> elements; embedded image\ndata becomes <graphic> with embedded data; etc. The <data> wrapper\nitself does not appear in JATS output.\n",
    },
    "shorthand_examples": [
      {
        "source": "<data>\n  <library format=bibtex>\n    @article{goodall2024,\n      author = {Goodall, Jane},\n      title = {The Effect of Elephants on Climate},\n      journal = {Nature},\n      year = {2024}\n    }\n  </library>\n</data>\n",
        "layer1_html": "<data>\n  <library format=\"bibtex\">\n    @article{goodall2024,\n      author = {Goodall, Jane},\n      title = {The Effect of Elephants on Climate},\n      journal = {Nature},\n      year = {2024}\n    }\n  </library>\n</data>\n",
        "notes": "A library block in BibTeX format. The library plugin parses this,\nregisters entries in the citation system. The <data> block itself\nproduces no rendered output.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "related_plugins": [
      {
        "name": "enscribeLibraryParsing",
        "purpose": "Phase 1 discovery — parses <library> blocks into the citation registry. See notes/specs/pipeline.md for the full pipeline.",
      },
      {
        "name": "enscribeResourceCollection",
        "purpose": "Phase 1 discovery — collects <data> blocks regardless of source position. See notes/specs/pipeline.md for the full pipeline.",
      },
    ],
    "_sourceFile": "data.md",
  });

const _date = Object.freeze({
    "semantic_role": "date",
    "category": "metadata",
    "html_output": {
      "element": "date",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "type": {
          "maps_to": {
            "html": "data-date-type",
          },
          "values": [
            "publication",
            "submission",
            "acceptance",
            "revision",
            "retraction",
            "embargo",
            "other",
          ],
          "default": "publication",
          "notes": "Distinguishes different kinds of dates. The default (publication)\nis the date the document was published.\n",
        },
        "format": {
          "maps_to": {
            "html": "data-date-format",
          },
          "values": [
            "iso",
            "ymd",
            "ymd-time",
            "mdy",
            "dmy",
            "custom",
          ],
          "notes": "Optional hint about how the date should be parsed and formatted.\nDefault is iso (YYYY-MM-DD).\n",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
      "notes": "The date value, typically as text. Common formats:\n- ISO 8601: 2024-03-15 (default).\n- With time: 2024-03-15T14:30:00Z.\n- Free-form: \"March 15, 2024\" or \"Spring 2024\".\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "pub-date or date (in history)",
      "notes": "JATS uses <pub-date> for publication dates. Other date types\n(submission, acceptance, revision) appear inside <history> as\n<date date-type=\"...\">. The exporter dispatches based on the type\nkwarg value.\n",
    },
    "shorthand_examples": [
      {
        "source": "<date | 2024-03-15>",
        "layer1_html": "<date>2024-03-15</date>",
        "notes": "A bare <date> is UNTYPED (no data-date-type) — an authoring date is\n\"when you wrote it\" (like the date on a letter), not a publication\ndate (cf. Quarto/Pandoc/Bookdown preamble date slots). Use an explicit\ntype= (e.g. <date type=publication | …>) for a typed date. (#325)\n",
      },
      {
        "source": "<date type=submission | 2023-11-01>",
        "layer1_html": "<date data-date-type=\"submission\">2023-11-01</date>",
      },
      {
        "source": "<meta>\n  <date type=submission | 2023-11-01>\n  <date type=acceptance | 2024-02-10>\n  <date type=publication | 2024-03-15>\n</meta>\n",
        "layer1_html": "<meta>\n  <date data-date-type=\"submission\">2023-11-01</date>\n  <date data-date-type=\"acceptance\">2024-02-10</date>\n  <date data-date-type=\"publication\">2024-03-15</date>\n</meta>\n",
        "notes": "Multiple dates of different types. The publication date is the\nprimary; submission, acceptance, etc., go in JATS history.\n",
      },
      {
        "source": "<date | March 15, 2024>",
        "layer1_html": "<date>March 15, 2024</date>",
        "notes": "Free-form date format. Acceptable but ISO 8601 is preferred for\nmachine readability and for predictable JATS export.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "date.md",
  });

const _dd = Object.freeze({
    "semantic_role": "dd",
    "category": "block-prose",
    "html_output": {
      "element": "dd",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "block",
        ],
      },
      "becomes": "children",
      "notes": "The description / definition of the preceding <dt> term. Prose\ncontent; may contain inline markup and block content (paragraphs,\nnested lists, etc.). Multi-paragraph descriptions are valid.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "def",
      "notes": "JATS uses <def> inside <def-item> inside <def-list>. Direct\none-to-one mapping at the definition-text level; the JATS exporter\nwraps the <dt>/<dd> pair in <def-item> at export.\n",
    },
    "shorthand_examples": [
      {
        "source": "<dd | An academic publishing system built on HTML+CSS+JS.>",
        "layer1_html": "<dd><p>An academic publishing system built on HTML+CSS+JS.</p></dd>",
        "notes": "A definition-list description. Appears as a child of <dl>,\nfollowing the term it defines.\n",
      },
      {
        "source": "<dd |\nA multi-paragraph definition.\n\nThe second paragraph of the definition.\n>\n",
        "layer1_html": "<dd>\n  <p>A multi-paragraph definition.</p>\n  <p>The second paragraph of the definition.</p>\n</dd>\n",
        "notes": "Multi-paragraph descriptions are valid — the pipe content's\nparagraph structure is preserved.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "dd.md",
  });

const _definition = Object.freeze({
    "semantic_role": "definition",
    "category": "theorem-family",
    "html_output": {
      "element": "definition",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "name": {
          "maps_to": {
            "html": "data-name",
          },
          "notes": "Optional name suffix for the definition's label.\n",
        },
      },
      "booleans": {
        "numbered": {
          "handled_by": "handler",
          "default": true,
          "notes": "Whether this definition participates in the definition counter.\n<definition> runs on its own counter (separate from the\npropositional theorem-family counter), matching amsthm's\nconventional \"definition\" theorem-style family. Default true.\n",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "block",
        ],
      },
      "becomes": "children",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "statement",
      "attributes": {
        "content-type": "definition",
      },
      "notes": "JATS <statement content-type=\"definition\">.\n",
    },
    "shorthand_examples": [
      {
        "source": "<definition | A *group* is a set with an associative binary operation, identity, and inverses.>\n",
        "layer1_html": "<definition><span class=\"definition-label\">Definition 1.</span><p>A <i>group</i> is a set with an associative binary operation, identity, and inverses.</p></definition>",
      },
      {
        "source": "<definition name=\"Group\" #def:group>\nA *group* is a set $G$ together with a binary operation\n$\\cdot$ satisfying associativity, identity, and inverses.\n</definition>\n",
        "layer1_html": "<definition id=\"def:group\" data-name=\"Group\">A <em>group</em> is a set $G$ together with a binary operation $\\cdot$ satisfying associativity, identity, and inverses.</definition>\n",
      },
    ],
    "interpreter_strategy": "handler",
    "handler_module": "./handlers/theorem.js",
    "_sourceFile": "definition.md",
  });

const _details = Object.freeze({
    "semantic_role": "details",
    "category": "block-prose",
    "html_output": {
      "element": "details",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "open": {
          "maps_to": {
            "html": "open",
          },
          "values": [
            "true",
            "false",
          ],
          "notes": "HTML's open attribute on <details>. When present, the disclosure\nis expanded by default. Either +open or open=true form works;\nabsence (or -open / open=false) renders collapsed.\n",
        },
      },
    },
    "content": {
      "shape": [
        {
          "element": "summary",
          "required": false,
          "contains": [
            "inline",
          ],
        },
        {
          "element": "__block__",
          "required": false,
          "multiple": true,
          "contains": [
            "block",
          ],
        },
      ],
      "notes": "A <details> typically begins with a <summary> (the visible heading\nof the disclosure) and is followed by the body content that the\nsummary controls. The body is arbitrary block content; the spec's\nshape marks it as __block__ rather than enumerating allowed\nelements (the body is genuinely open, parallel to <aside>'s prose\ncontent).\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "(no direct JATS counterpart; HTML-native)",
      "notes": "JATS has no disclosure/collapsible primitive. <details> is an\nHTML-native presentation construct for interactive disclosure of\ncontent. Recorded honestly as having no JATS counterpart, per the\n<lang> / <kbd> precedent. At JATS export the exporter must decide\nwhether to flatten <details> (always-include the body) or drop it;\nthe default expectation is to flatten — the body content is\ndocument-meaningful and should reach the JATS output regardless of\nthe HTML-side interactive disclosure.\n",
    },
    "shorthand_examples": [
      {
        "source": "<details>\n  <summary | More background>\n  Additional context for the curious reader. The summary is the\n  visible heading; this body shows when the disclosure is opened.\n</details>\n",
        "layer1_html": "<details>\n  <summary>More background</summary>\n  <p>Additional context for the curious reader. The summary is the visible heading; this body shows when the disclosure is opened.</p>\n</details>\n",
        "notes": "The canonical shape: a <summary> for the visible heading,\nfollowed by the disclosure body. The body is recursively parsed\nas prose / block content.\n",
      },
      {
        "source": "<details +open>\n  <summary | Always-expanded section>\n  This disclosure is expanded by default.\n</details>\n",
        "layer1_html": "<details open>\n  <summary>Always-expanded section</summary>\n  <p>This disclosure is expanded by default.</p>\n</details>\n",
        "notes": "The +open boolean kwarg expands the disclosure by default.\nMaps to HTML's standard open attribute.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "details.md",
  });

const _diagram = Object.freeze({
    "semantic_role": "diagram",
    "category": "frameables",
    "html_output": {
      "element": "diagram",
      "is_html_native": false,
      "default_attributes": {},
      "notes": "`html_output.element` here is the vocabulary lookup key (must match\nthe tagname). Under `interpreter_strategy: handler` the schema field\nis not consulted — the handler emits the wrapper element shape\ndirectly (a `<pre class=\"<engine>\" data-enscribe-dsl=\"<engine>\">…</pre>`).\n",
    },
    "interpreter_strategy": "handler",
    "handler_module": "./handlers/diagram.js",
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "positional": [
        {
          "name": "engine",
          "values": [
            "mermaid",
            "abc",
          ],
          "notes": "The diagram engine — the language that renders the body. The\nleading format word selects which external renderer interprets the\nsource (`<diagram mermaid | …>`, `<diagram abc | …>`). A new engine\n(D2, Graphviz, PlantUML, …) is a new format word admitted by the\ndiagram host's accept-set, not a new vocabulary element. See\n`format-words.md` and `DESIGN.md` §\"The two axes: host and language\".\n",
        },
      ],
      "kwargs": {
        "caption": {
          "handled_by": "handler",
          "notes": "Optional caption text. When present the handler emits a\n`<figcaption>` sibling after the rendered diagram (the external-DSL\nsibling-caption layout). When the diagram participates in figure\nnumbering the caption carries a \"Figure N.\" label prefix.\n",
        },
      },
    },
    "content": {
      "notes": "Author writes the engine's diagram source verbatim. Enscribe preserves\nthe content unmodified inside the wrapper element; the engine's library\n(loaded from CDN at view time, or run at build time) parses the source.\n",
    },
    "content_handler": "diagram",
    "jats_counterpart": {
      "element": "(no direct JATS counterpart; exported as <fig specific-use=\"enscribe-dsl-<engine>\"> with the verbatim source in <preformat preformat-type=\"<engine>-source\">)",
      "notes": "JATS has no diagram-source counterpart. The JATS exporter emits a\n`<fig>` carrying an `<alt-text>` and the verbatim source in a\n`<preformat>` element; a downstream pre-render pass may replace it with\nthe rendered `<graphic>`. The engine is read from the format-word\npositional.\n",
    },
    "shorthand_examples": [
      {
        "source": "<diagram mermaid>\ngraph LR\n  A[Start] --> B{Decision}\n  B -->|yes| C[OK]\n  B -->|no| D[Stop]\n</diagram>\n",
        "layer1_html": "<pre class=\"mermaid\" data-enscribe-dsl=\"mermaid\">graph LR\n  A[Start] --> B{Decision}\n  B -->|yes| C[OK]\n  B -->|no| D[Stop]</pre>\n",
        "notes": "The `mermaid` format word selects the Mermaid engine. The handler\nemits the same `<pre class=\"mermaid\" data-enscribe-dsl=\"mermaid\">`\ncontract as the legacy `<mermaid>` shorthand expands to.\n",
      },
      {
        "source": "<diagram abc>\nX:1\nT:Scale\nK:C\nCDEFGABc\n</diagram>\n",
        "layer1_html": "<pre class=\"abc\" data-enscribe-dsl=\"abc\">X:1\nT:Scale\nK:C\nCDEFGABc</pre>\n",
        "notes": "The `abc` format word selects the abcjs engine.\n",
      },
    ],
    "handler_responsibilities": [
      "Read the format-word positional as the engine (`mermaid`, `abc`).",
      "Read the opaque content as the engine's diagram source.",
      "Emit a `<pre class=\"<engine>\" data-enscribe-dsl=\"<engine>\">…</pre>` wrapper preserving the source verbatim (delegating to the per-engine render path).",
      "Apply id / classes from the node; honor the optional `caption` kwarg.",
    ],
    "_sourceFile": "diagram.md",
  });

const _display_math = Object.freeze({
    "semantic_role": "display-math",
    "category": "math",
    "html_output": {
      "element": "display-math",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "booleans": {
        "numbered": {
          "handled_by": "handler",
          "default": true,
          "notes": "Whether this equation participates in the document-wide numbered\nsequence. Use +numbered (default) to number, -numbered to suppress.\nCan also be written as numbered=true / numbered=false.\nWhen suppressed, the equation renders without a number and is not\nadded to the numbered counter. The config key number-equations=false\nsuppresses all equations unless overridden per-element with +numbered.\n",
        },
      },
    },
    "content": {
      "notes": "The pipe content is LaTeX math source. It is passed directly to KaTeX\nas a string; it is not parsed as prose. The author is responsible for\nvalid LaTeX math syntax.\n",
    },
    "content_handler": "math-display",
    "shorthand_examples": [
      {
        "source": "<$$ \\sum_{i=1}^{n} x_i = X $$>",
        "layer1_html": "<display-math><span class=\"katex-display\">…</span><span class=\"equation-number\">(1)</span></display-math>",
        "notes": "The `$$` sigil. Display-mode LaTeX rendered by KaTeX on its own line;\nnumbered by default (the equation number is appended after the KaTeX\noutput).\n",
      },
    ],
    "interpreter_strategy": "handler",
    "handler_module": "./handlers/math.js",
    "jats_counterpart": {
      "element": "disp-formula",
      "notes": "JATS <disp-formula> wraps a displayed equation. The JATS exporter\ngenerates <tex-math> with the raw LaTeX source plus optionally\n<mml:math>. The id attribute (for cross-references) maps to JATS\nid. Equation numbering maps to JATS <label>.\n",
    },
    "_sourceFile": "display-math.md",
  });

const _dl = Object.freeze({
    "semantic_role": "dl",
    "category": "block-prose",
    "html_output": {
      "element": "dl",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": [
        {
          "element": "dt",
          "required": false,
          "multiple": true,
          "contains": [
            "inline",
          ],
        },
        {
          "element": "dd",
          "required": false,
          "multiple": true,
          "contains": [
            "inline",
            "block",
          ],
        },
      ],
      "notes": "A definition list alternates <dt> (term) and <dd> (description)\nchildren. The spec declares both as multiple+optional because a\nwell-formed <dl> may pair one term with several descriptions, or\nseveral terms with one shared description (HTML5 permits both\npatterns). Parser-level validation of the alternation / pairing\nis not performed (always-renders posture); the intended structure\nis documented here and demonstrated by fixtures.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "def-list",
      "notes": "JATS uses <def-list> for definition lists, with <def-item> wrapping\neach term/definition pair: <def-list><def-item><term/><def/>\n</def-item>...</def-list>. Enscribe's <dl> follows HTML's flatter\npattern (alternating <dt>/<dd> siblings); the JATS exporter groups\nadjacent <dt>/<dd> pairs into <def-item> wrappers at export.\n",
    },
    "shorthand_examples": [
      {
        "source": "<dl>\n  <dt | enscribe>\n  <dd | An academic publishing system built on HTML+CSS+JS.>\n  <dt | Layer 1>\n  <dd | The canonical semantic HTML vocabulary.>\n  <dt | Layer 2>\n  <dd | The shorthand authoring syntax that compiles to Layer 1.>\n</dl>\n",
        "layer1_html": "<dl>\n  <dt>enscribe</dt>\n  <dd><p>An academic publishing system built on HTML+CSS+JS.</p></dd>\n  <dt>Layer 1</dt>\n  <dd><p>The canonical semantic HTML vocabulary.</p></dd>\n  <dt>Layer 2</dt>\n  <dd><p>The shorthand authoring syntax that compiles to Layer 1.</p></dd>\n</dl>\n",
        "notes": "Long-form <dl> with short-form <dt>/<dd> children. The natural\nauthoring pattern.\n",
      },
      {
        "source": "<dl .compact>\n  <dt | term-1>\n  <dd | First definition of term-1.>\n  <dd | Second definition of term-1.>\n</dl>\n",
        "layer1_html": "<dl class=\"compact\">\n  <dt>term-1</dt>\n  <dd><p>First definition of term-1.</p></dd>\n  <dd><p>Second definition of term-1.</p></dd>\n</dl>\n",
        "notes": "One term with multiple definitions — a valid HTML pattern.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "dl.md",
  });

const _doi = Object.freeze({
    "semantic_role": "doi",
    "category": "metadata",
    "html_output": {
      "element": "doi",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
      "notes": "The DOI value, as text. Typically the bare DOI string (e.g.\n\"10.1234/example.2024\") rather than a URL form.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "article-id",
      "attributes": {
        "pub-id-type": "doi",
      },
      "notes": "JATS uses <article-id pub-id-type=\"doi\">VALUE</article-id> inside\n<article-meta>. The exporter constructs the article-id element with\nthe pub-id-type attribute set to \"doi\" from the value in <doi>.\n",
    },
    "shorthand_examples": [
      {
        "source": "<meta>\n  <doi | 10.1234/example.2024>\n</meta>\n",
        "layer1_html": "<meta>\n  <doi>10.1234/example.2024</doi>\n</meta>\n",
        "notes": "Bare DOI as the typical authoring form.\n",
      },
      {
        "source": "<meta doi=\"10.5555/test\" />",
        "layer1_html": "<meta>\n  <doi>10.5555/test</doi>\n</meta>\n",
        "notes": "Kwarg-form authoring lifts to the child-tag form at the\nnormalize-to-canonical gate (per the apparatus-tag reconciliation,\nDESIGN.md §\"Apparatus-tag positioning\").\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "doi.md",
  });

const _dt = Object.freeze({
    "semantic_role": "dt",
    "category": "block-prose",
    "html_output": {
      "element": "dt",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
      "notes": "The term being defined. Typically short — a word or phrase — but\nmay contain inline markup (emphasis, code, math) where useful.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "term",
      "notes": "JATS uses <term> inside <def-item> inside <def-list>. Direct\none-to-one mapping at the term-text level; the JATS exporter\nwraps the <dt>/<dd> pair in <def-item> at export.\n",
    },
    "shorthand_examples": [
      {
        "source": "<dt | enscribe>",
        "layer1_html": "<dt>enscribe</dt>",
        "notes": "A definition-list term. Appears as a child of <dl>.\n",
      },
      {
        "source": "<dt | <code | strict-mode>>",
        "layer1_html": "<dt><code>strict-mode</code></dt>",
        "notes": "Inline markup in a term. The recursive-content pass parses the\npipe content normally.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "dt.md",
  });

const _editor = Object.freeze({
    "semantic_role": "editor",
    "category": "metadata",
    "html_output": {
      "element": "editor",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "affiliation": {
          "maps_to": {
            "html": "data-affiliation",
          },
        },
        "orcid": {
          "maps_to": {
            "html": "data-orcid",
          },
        },
        "email": {
          "maps_to": {
            "html": "data-email",
          },
        },
        "role": {
          "maps_to": {
            "html": "data-editor-role",
          },
          "values": [
            "editor",
            "co-editor",
            "series-editor",
            "volume-editor",
            "guest-editor",
            "other",
          ],
          "default": "editor",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
      "notes": "Same content model as <author>. Simple form (pipe content as name)\nor structured form (explicit child elements).\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "contrib contrib-type=\"editor\"",
    },
    "shorthand_examples": [
      {
        "source": "<editor | The Editor>",
        "layer1_html": "<editor>The Editor</editor>",
      },
      {
        "source": "<editor role=series-editor affiliation=\"Cambridge University\" | Jane Goodall>",
        "layer1_html": "<editor data-editor-role=\"series-editor\" data-affiliation=\"Cambridge University\">Jane Goodall</editor>",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "editor.md",
  });

const _em = Object.freeze({
    "semantic_role": "em",
    "category": "inline-formatting",
    "html_output": {
      "element": "em",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "italic",
      "attributes": {
        "toggle": "yes",
      },
      "notes": "JATS uses <italic> for emphasized text. The toggle attribute controls\nwhether the italic state is asserted or toggled relative to surrounding\ntext (inheritance behavior).\n",
    },
    "shorthand_examples": [
      {
        "source": "This has *emphasized* content.",
        "layer1_html": "<p>This has <i>emphasized</i> content.</p>",
        "notes": "Plain markdown emphasis with single asterisks (or single underscores)\nproduces <em> elements. This is the most common authoring path.\n",
      },
      {
        "source": "<em | emphasized>",
        "layer1_html": "<em>emphasized</em>",
        "notes": "The explicit form is reached for when attributes are needed.\n",
      },
      {
        "source": "<em #key-term .highlighted | distinguishing feature>",
        "layer1_html": "<em id=\"key-term\" class=\"highlighted\">distinguishing feature</em>",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "em.md",
  });

const _email = Object.freeze({
    "semantic_role": "email",
    "category": "metadata",
    "html_output": {
      "element": "email",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
      "notes": "The email address as text (e.g. \"jane@example.org\"). No special\nparsing — the value passes through verbatim.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "email",
      "notes": "JATS uses <email> inside <contrib> for author contact email.\nDirect one-to-one mapping.\n",
    },
    "shorthand_examples": [
      {
        "source": "<author>\n  <name | Jane Goodall>\n  <email | jane@example.org>\n</author>\n",
        "layer1_html": "<author><name>Jane Goodall</name><email><a href=\"mailto:jane@example.org\">jane@example.org</a></email></author>",
        "notes": "Author contact email. Common in journal article metadata for\nthe corresponding author (see also the +corresponding boolean\nkwarg on <author>).\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "email.md",
  });

const _endnotes = Object.freeze({
    "semantic_role": "endnotes",
    "category": "block-prose",
    "authoring": "generated",
    "html_output": {
      "element": "endnotes",
      "is_html_native": false,
      "default_attributes": {},
      "notes": "<endnotes> is a placement MARKER: the note-placement plugin replaces it with the\ncollected end-notes block (which renders as <note-list>). It is parallel to an\nauthor-placed <bibliography> — the author writes an empty <endnotes> where the\nnotes should render; absent it, the collection lands at its default position.\n",
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": [
        {
          "element": "note",
          "required": false,
          "multiple": true,
          "notes": "When the block is rendered the collected notes appear here. Authors do not\nwrite these directly — the note-placement plugin populates the block.\n",
        },
      ],
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "fn-group",
      "notes": "The collected end-notes map to a JATS <fn-group>. Per-chapter <endnotes> are an\nHTML display concern; JATS keeps its existing single note handling.\n",
    },
    "interpreter_strategy": "schema",
    "generated_by": [
      {
        "plugin": "enscribeNotePlacement",
        "when": "The document has notes. The plugin collects notes (per-chapter in a book,\ndocument-level otherwise) and, when an <endnotes> marker is present, renders\nthe collected block at the marker instead of the default position.\n",
      },
    ],
    "related_plugins": [
      {
        "name": "enscribeNotePlacement",
        "runs_after": "enscribeNotes",
        "purpose": "Collects notes and places the rendered <note-list> block — at an <endnotes> marker when present, else at the default (chapter end / back-matter). See notes/specs/pipeline.md.",
      },
    ],
    "_sourceFile": "endnotes.md",
  });

const _eqnarray = Object.freeze({
    "semantic_role": "eqnarray",
    "category": "math",
    "html_output": {
      "element": "eqnarray",
      "is_html_native": false,
      "default_attributes": {},
      "notes": "`html_output.element` is the vocabulary lookup key (must match the\ntagname). Handler emits `<eqnarray>` wrapper directly; the schema\nfield is not consulted under `interpreter_strategy: handler`.\n",
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "notes": "Author writes pure environment body (each line `lhs & op & rhs`,\nterminated by `\\\\`). The handler wraps in\n`\\begin{aligned}...\\end{aligned}` before passing to KaTeX. KaTeX\ndoes not implement the LaTeX `eqnarray` environment standalone;\n`aligned` is the supported KaTeX equivalent and renders the same\nmulti-line-equation visual output. `<eqnarray>` exists alongside\n`<align>` for LaTeX-source compatibility: an author copying\n`\\begin{eqnarray}...\\end{eqnarray}` source from a LaTeX document\nhas a target enscribe tag whose name matches.\n",
    },
    "content_handler": "eqnarray",
    "jats_counterpart": {
      "element": "disp-formula",
      "notes": "JATS does not have a dedicated `<eqnarray>` element. Maps to JATS\n`<disp-formula>` with `<tex-math>` carrying the wrapped LaTeX\nsource.\n",
    },
    "shorthand_examples": [
      {
        "source": "<eqnarray>\nf(x) &=& x^2 \\\\\ng(x) &=& 2x\n</eqnarray>\n",
        "layer1_html": "<eqnarray>(KaTeX-rendered HTML of \\begin{aligned}...\\end{aligned})</eqnarray>\n",
        "notes": "Two equations rendered via KaTeX's `aligned` env (the supported\nequivalent of LaTeX's `eqnarray`).\n",
      },
    ],
    "interpreter_strategy": "handler",
    "handler_module": "./handlers/math.js",
    "handler_responsibilities": [
      "Read the opaque content as LaTeX math-environment body.",
      "Wrap in `\\begin{aligned}...\\end{aligned}` (KaTeX-supported equivalent of `eqnarray`).",
      {
        "Render via KaTeX with `displayMode": "true`.",
      },
      "Emit an `<eqnarray>` wrapper element containing KaTeX's HTML output.",
      "Apply id / classes from the node.",
    ],
    "_sourceFile": "eqnarray.md",
  });

const _example = Object.freeze({
    "semantic_role": "example",
    "category": "theorem-family",
    "html_output": {
      "element": "example",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "name": {
          "maps_to": {
            "html": "data-name",
          },
          "notes": "Optional name suffix for the example's label.\n",
        },
      },
      "booleans": {
        "numbered": {
          "handled_by": "handler",
          "default": true,
          "notes": "Whether this example participates in the example counter.\n<example> runs on its own counter (separate from theorem,\nlemma, definition counters), matching amsthm's conventional\n\"example\" theorem-style family. Default true.\n",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "block",
        ],
      },
      "becomes": "children",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "statement",
      "attributes": {
        "content-type": "example",
      },
      "notes": "JATS <statement content-type=\"example\">.\n",
    },
    "shorthand_examples": [
      {
        "source": "<example | The integers under addition form a group.>\n",
        "layer1_html": "<example><span class=\"example-label\">Example 1.</span><p>The integers under addition form a group.</p></example>",
      },
      {
        "source": "<example #ex:integers>\nThe integers $\\mathbb{Z}$ under addition form a group: the\noperation is associative, $0$ is the identity, and every\ninteger has an additive inverse.\n</example>\n",
        "layer1_html": "<example id=\"ex:integers\">The integers $\\mathbb{Z}$ under addition form a group: the operation is associative, $0$ is the identity, and every integer has an additive inverse.</example>\n",
      },
    ],
    "interpreter_strategy": "handler",
    "handler_module": "./handlers/theorem.js",
    "_sourceFile": "example.md",
  });

const _fig = Object.freeze({
    "semantic_role": "figure",
    "category": "frameables",
    "html_output": {
      "element": "fig",
      "is_html_native": true,
      "default_attributes": {},
      "notes": "Figures are HTML-shaped at Layer 1 (#147): the rendered Layer 1\nelement is the HTML5-native `<figure>`. The figure handler\n(`handlers/figure.js`) hardcodes its output tagName to `'figure'`,\nso `is_html_native: true` describes that rendered element — the same\nway `<table>` / `<svg>` / `<aside>` are native handler-strategy\nframeables. `html_output.element` retains `fig` as the vocab key\n(the filename stem) and the interpreter's dispatch name: schema-\nstrategy entries derive the output tagName from this field, but\nhandler-strategy entries control the output tagName in the handler,\nso for `<fig>` this field is the keying signal only, not the\nrendered element. `fig` is also the JATS export target (see\n`jats_counterpart` below); `<figure>` is the canonical HTML /\nauthoring name.\n",
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "src": {
          "handled_by": "handler",
          "notes": "URL of an image to embed. The handler generates an <img> child\nelement from this kwarg. When src is present, the figure renders\nas an image with a caption.\n\nAsset reference (#190): when src is `@id` it pulls in an asset\ndeclared inside `<data>`, either embedded —\n`<fig #id png>base64</fig>` (the format flag is one of png, jpg,\njpeg, svg, gif, webp) — or external — `<fig #id src=\"path\" />`. An\nembedded reference resolves to a `data:<mime>;base64,…` URI; an\nexternal one resolves to the declared path (rebased master-relative\nfor a cross-file child) as a plain `<img src=\"path\">`. The placed\nfigure adopts the id, so it numbers and cross-references (`<ref @id>`)\nas that id; the `<data>` declaration itself renders nothing.\nRe-placing one asset is legitimate — each `<fig src=\"@id\" />` renders\nand numbers, but only the first adopts the id (the cross-reference\nanchor); give a later placement its own `#id` to reference it. An\nunresolved `@id`, or an embedded format outside the list above,\nrenders a visible asset-error rather than a broken image. Assets\nmerge project-wide across an assembled document; the same id declared\nin two `<data>` blocks is last-wins with a visible collision flag.\n(JATS `<graphic>` export of assets is done — an embedded asset\nprojects to a `data:` URI, an external one to the rebased path,\nDTD-valid; the opaque-store design is `notes/specs/data-store.md`.)\n",
        },
        "alt": {
          "handled_by": "handler",
          "notes": "Alt text for the generated <img> when src is present. Recommended\nfor accessibility but not required: when alt is not specified, the\nhandler falls back to the figcaption text. Ignored when src is\nabsent.\n",
        },
        "align": {
          "maps_to": {
            "html": "data-align",
          },
          "values": [
            "left",
            "right",
            "center",
            "full-width",
          ],
          "notes": "How the figure is positioned in the document flow. Affects\nrendering only; not exported to JATS.\n",
        },
        "width": {
          "maps_to": {
            "html": "data-width",
          },
          "notes": "Suggested rendered width. Can be a CSS length (e.g., \"300px\",\n\"50%\") or a relative value.\n",
        },
        "type": {
          "maps_to": {
            "html": "data-figure-type",
          },
          "values": [
            "image",
            "table",
            "code",
            "equation",
            "diagram",
            "multi-part",
            "other",
          ],
          "notes": "Optional classification of the figure's content. Maps to JATS\nfig content-type or to wrapping element choices.\n",
        },
        "caption": {
          "handled_by": "handler",
          "notes": "Optional caption text. The `caption=` kwarg lifts to a `<caption>`\nchild tag at the normalize-to-canonical gate (caption-as-content) —\nthe same way `<meta>` / `<author>` kwargs lift to their child tags —\nso a `<caption>` child can equivalently be authored directly. The\nfigure handler also still accepts the legacy figure-as-pipe-caption\nform: when no `<caption>` child is present, the pipe content becomes\nthe caption. (`title=` lifts to a `<title>` child the same way.)\n",
        },
      },
      "booleans": {
        "numbered": {
          "handled_by": "handler",
          "default": true,
          "notes": "Whether this figure participates in the document-wide figure\nsequence. Use +numbered (default) to number, -numbered to suppress.\nCan also be written as numbered=true / numbered=false.\nThe config key number-figures=false suppresses all figures unless\noverridden per-element with +numbered.\n",
        },
        "border": {
          "handled_by": "handler",
          "default": false,
          "notes": "The frameable surface. When +border is set, the rendered\n<figure> gains the `frameable-border` class so theme stylesheets\ncan draw the outline box per the frameable convention. Off by\ndefault.\n",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "block",
        ],
      },
      "becomes": "figcaption",
      "notes": "The pipe content becomes a <figcaption> child of the figure. When\nthe figure has an src kwarg, the figcaption appears alongside the\nauto-generated <img>. When no src is present, the figcaption appears\nalongside whatever the author placed inside the figure (a table,\na code block, an equation, etc.).\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "fig",
      "attributes": {
        "fig-type": "from type",
      },
      "notes": "JATS <fig> wraps <graphic> (the image) and <caption>. When src is\npresent, the exporter generates <graphic xlink:href=\"...\"> from the\nsrc kwarg. The figcaption becomes <caption>. The fig-type attribute\nmaps from enscribe's type kwarg.\n",
    },
    "shorthand_expansions": [
      {
        "shorthand": "figure",
        "expands_to": "fig",
        "notes": "`<figure>` is an accepted authoring alias for the canonical\n`<fig>`, recorded in `DESIGN.md` §\"Frameable elements: a shared\ncapability\". The normalize-to-canonical gate rewrites\n`<figure>`-authored node tagnames to `fig` before downstream\nplugins run, so the entire pipeline below the gate sees the\ncanonical name. Both shorthand_expansions (this vocab-level\nalias) and the gate rewrite exist together because they serve\ndifferent needs: the vocab alias makes `<figure>` survive a\nbypass of the gate (defensive), and the gate rewrite ensures\ntagname-keyed downstream lookups (NUMBERED_TAGNAMES, handler\nrouting) see the single canonical name.\n",
      },
    ],
    "shorthand_examples": [
      {
        "source": "<fig src=elephant.jpg | An adult African elephant.>",
        "layer1_html": "<figure><img alt=\"An adult African elephant.\" src=\"elephant.jpg\"><figcaption><span class=\"figure-label\">Figure 1.</span><p>An adult African elephant.</p></figcaption></figure>",
        "notes": "The simplest case. The src kwarg generates the <img>; the pipe\ncontent generates the figcaption. The alt text defaults to the\nfigcaption text when not specified explicitly. The Layer 1\nelement is HTML-native <figure> (not the custom-element <fig>)\nbecause the HTML rendering surface is the HTML5 native element\nwhile the enscribe canonical name follows JATS's shorter <fig>.\n",
      },
      {
        "source": "<figure src=elephant.jpg | An adult African elephant.>",
        "layer1_html": "<figure><img alt=\"An adult African elephant.\" src=\"elephant.jpg\"><figcaption><span class=\"figure-label\">Figure 1.</span><p>An adult African elephant.</p></figcaption></figure>",
        "notes": "`<figure>` is the authoring alias. The normalize-to-canonical gate rewrites the\ntagname to `fig` early; the rendered output is the same.\n",
      },
      {
        "source": "<fig #elephant src=elephant.jpg align=right alt=\"A photograph of an elephant\" | An adult African elephant photographed in Tanzania.>",
        "layer1_html": "<figure data-align=\"right\" id=\"elephant\"><img alt=\"A photograph of an elephant\" src=\"elephant.jpg\"><figcaption><span class=\"figure-label\">Figure 1.</span><p>An adult African elephant photographed in Tanzania.</p></figcaption></figure>",
        "notes": "The `id` enables cross-referencing with `<ref @elephant>` (or the\ncanonical `<ref @fig:elephant>` colon-prefix form). Numbered by\ndefault; the figcaption gets a \"Figure N.\" label span prepended.\n",
      },
      {
        "source": "<fig #revenue-table type=table |\n<table>\n  <tr><th>Quarter</th><th>Revenue</th></tr>\n  <tr><td>Q1</td><td>$100M</td></tr>\n  <tr><td>Q2</td><td>$120M</td></tr>\n</table>\nQuarterly revenue for fiscal year 2024.\n>\n",
        "layer1_html": "<figure data-figure-type=\"table\" id=\"revenue-table\"><figcaption><span class=\"figure-label\">Figure 1.</span><table><caption><span class=\"table-label\">Table 1.</span></caption><tbody><tr><th>Quarter</th><th>Revenue</th></tr><tr><td>Q1</td><td>$100M</td></tr><tr><td>Q2</td><td>$120M</td></tr></tbody></table><p>Quarterly revenue for fiscal year 2024.</p></figcaption></figure>",
        "notes": "A figure without src. The content (a table) is preserved as-is;\nthe trailing line becomes the figcaption. Author convention is\nto put the caption text on its own line at the end of the content.\n",
      },
    ],
    "interpreter_strategy": "handler",
    "handler_module": "./handlers/figure.js",
    "handler_responsibilities": [
      "Generate <img> child element when src kwarg is present.",
      "Use alt kwarg as the img's alt attribute, or fall back to the figcaption text.",
      "Wrap pipe content (or the trailing line of multi-content figures) as <figcaption>.",
      "Preserve any non-caption content (tables, code blocks, equations) as direct children before the figcaption.",
      "Handle the type kwarg by setting data-figure-type and potentially adjusting the wrapping.",
      "When +border is set, add `frameable-border` to the rendered class list (the frameable surface).",
      "Prepend \"Figure N.\" label span to the figcaption when computedNumber is set (uses formatLabel helper).",
    ],
    "_sourceFile": "fig.md",
  });

const _frame = Object.freeze({
    "semantic_role": "frame",
    "category": "frameables",
    "html_output": {
      "element": "frame",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "title": {
          "handled_by": "handler",
          "notes": "Optional title rendered at the top of the frame (the frameable\ntitle-top convention), as a title= kwarg or a <title> child tag.\n",
        },
        "caption": {
          "handled_by": "handler",
          "notes": "Optional caption text rendered at the bottom of the frame\n(the frameable caption-bottom convention). The caption= kwarg\nlifts to a <caption> child tag at the gate.\n",
        },
        "type": {
          "maps_to": {
            "html": "data-frame-type",
          },
          "notes": "Optional classification of what the frame contains (note,\nwarning, tip, theorem-block, etc.), preserved as the\ndata-frame-type attribute. Since <frame> renders as\n<figure class=\"frameable-border\"> (not a custom <frame> element),\nauthors target it with the rendered figure —\nfigure[data-frame-type=\"note\"] { … } — not a \".frame\" selector.\n",
        },
      },
      "booleans": {
        "numbered": {
          "handled_by": "handler",
          "default": true,
          "notes": "Whether this frame participates in the document-wide figure\nsequence. **On by default** (#272: captioned floats and frames are\nnumbered by default, consistent with <fig>/<table>/<svg>). Use\n-numbered to opt out for a one-off sidebar / callout / annotation.\n",
        },
        "border": {
          "handled_by": "handler",
          "default": true,
          "notes": "The frameable surface. **On by default for frame** (unlike\n<fig>/<svg>/etc.) because the whole point of the generic\n<frame> element is the visual frame. Use -border to suppress\nthe outline and just use the frame as a semantic grouping\nwrapper. border=<name> selects a named look (accent / thick /\ndashed / subtle) and implies the border on; the look renders as a\nframeable-border-<name> modifier class (document names it, theme\ndefines it — #58; see frameable.md).\n",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "block",
        ],
      },
      "becomes": "children",
      "notes": "The pipe content is the frame's body. Prose (paragraphs, inline,\nembedded elements) — same content model as <aside> or <section>.\nRecursive content parsing applies.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "boxed-text",
      "attributes": {},
      "notes": "JATS <boxed-text> is the closest counterpart — a generic boxed,\nset-apart content block. The `type` kwarg can map to JATS's\ncontent-type attribute. For numbered frames, wrap in <fig> at\nexport.\n",
    },
    "shorthand_examples": [
      {
        "source": "<frame | A short callout.>",
        "layer1_html": "<figure class=\"frameable-border\"><p>A short callout.</p><figcaption><span class=\"figure-label\">Figure 1.</span></figcaption></figure>",
        "notes": "The simplest case. The handler emits a <figure> wrapper (the vocab\nhtml_output.element `frame` is only the lookup key for handler-strategy\nentries — the handler controls the actual element). +border is default on\nfor <frame>, so the class appears automatically.\n",
      },
      {
        "source": "<frame type=note title=\"Important\" |\nMake sure to read this carefully.\n>\n",
        "layer1_html": "<figure class=\"frameable-border\" data-frame-type=\"note\"><figcaption class=\"title\">Important</figcaption><p>Make sure to read this carefully.</p><figcaption><span class=\"figure-label\">Figure 1.</span></figcaption></figure>",
        "notes": "With a title rendered at the top.\n",
      },
      {
        "source": "<frame #fig:method-box caption=\"Workflow steps\" |\n1. Collect data.\n2. Clean.\n3. Model.\n>\n",
        "layer1_html": "<figure class=\"frameable-border\" id=\"fig:method-box\"><ol><li>Collect data.</li><li>Clean.</li><li>Model.</li></ol><figcaption><span class=\"figure-label\">Figure 1.</span><p>Workflow steps</p></figcaption></figure>",
        "notes": "Numbered by default (#272). Shares the figure counter with\n<fig>/<svg>/<mermaid>/<abc>; use -numbered for an unnumbered frame.\n",
      },
    ],
    "interpreter_strategy": "handler",
    "handler_module": "./handlers/frame.js",
    "handler_responsibilities": [
      "Emit the <frame> wrapper element (a custom element; not HTML-native).",
      "Apply `frameable-border` class by default (border flag default true).",
      "Render optional title at the top of the frame.",
      "Render optional caption (with \"Figure N.\" label prefix if numbered) at the bottom.",
      "Pass through type kwarg as data-frame-type.",
    ],
    "_sourceFile": "frame.md",
  });

const _glossary_entry = Object.freeze({
    "semantic_role": "glossary-entry",
    "category": "block-prose",
    "html_output": {
      "element": "glossary-entry",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": [
        {
          "element": "dt",
          "required": false,
          "contains": [
            "inline",
          ],
        },
        {
          "element": "dd",
          "required": false,
          "multiple": true,
          "contains": [
            "inline",
            "block",
          ],
        },
      ],
      "notes": "A single glossary entry holds one term and its definition, reusing\nthe <dt>/<dd> child shapes of <dl>. Multiple <dd> children are\npermitted for one term (HTML5 pattern); a missing <dt> or <dd> is\nnot enforced at parser time (always-renders posture).\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "def-item",
      "notes": "JATS uses <def-item> inside <glossary> (or inside <def-list>) to\nwrap a term/definition pair. Enscribe's <glossary-entry> maps\ndirectly to JATS <def-item> — the envelope around the <term>/<def>\npair. (JATS does not have a separate \"glossary-entry\" name; the\npairing structure is provided by <def-item>.)\n",
    },
    "shorthand_examples": [
      {
        "source": "<glossary-entry #term:enscribe>\n  <dt | enscribe>\n  <dd | An academic publishing system built on HTML+CSS+JS.>\n</glossary-entry>\n",
        "layer1_html": "<glossary-entry id=\"term:enscribe\">\n  <dt>enscribe</dt>\n  <dd><p>An academic publishing system built on HTML+CSS+JS.</p></dd>\n</glossary-entry>\n",
        "notes": "A single glossary entry. The id uses the \"term:\" colon-prefix\nconvention so cross-references like <ref @term:enscribe> can\nresolve into the entry.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "glossary-entry.md",
  });

const _glossary = Object.freeze({
    "semantic_role": "glossary",
    "category": "block-prose",
    "html_output": {
      "element": "glossary",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": [
        {
          "element": "glossary-entry",
          "required": false,
          "multiple": true,
        },
      ],
      "notes": "A glossary holds a sequence of <glossary-entry> children, each a\npaired term and definition. Distinct from <dl> (which uses raw\nalternating <dt>/<dd> children with flexible pairing) — a glossary\nhas a fixed entry-pair shape and is referenceable as a unit.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "glossary",
      "notes": "JATS has a <glossary> element. Enscribe's <glossary> maps directly,\nwith children mapping per <glossary-entry>'s entry. JATS's <glossary>\ncan also wrap a <def-list>; the exporter chooses the structure based\non whether the source uses <glossary> or <dl>.\n",
    },
    "shorthand_examples": [
      {
        "source": "<glossary #project-terms>\n  <glossary-entry>\n    <dt | enscribe>\n    <dd | An academic publishing system built on HTML+CSS+JS.>\n  </glossary-entry>\n  <glossary-entry>\n    <dt | Layer 1>\n    <dd | The canonical semantic HTML vocabulary.>\n  </glossary-entry>\n</glossary>\n",
        "layer1_html": "<glossary id=\"project-terms\">\n  <glossary-entry>\n    <dt>enscribe</dt>\n    <dd><p>An academic publishing system built on HTML+CSS+JS.</p></dd>\n  </glossary-entry>\n  <glossary-entry>\n    <dt>Layer 1</dt>\n    <dd><p>The canonical semantic HTML vocabulary.</p></dd>\n  </glossary-entry>\n</glossary>\n",
        "notes": "A glossary with two entries. Each <glossary-entry> uses <dt>/<dd>\nfor its term and definition (the same shapes <dl> uses), wrapped\nin the entry's own envelope for cross-reference / styling.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "glossary.md",
  });

const _hr = Object.freeze({
    "semantic_role": "hr",
    "category": "block-prose",
    "html_output": {
      "element": "hr",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "type": {
          "maps_to": {
            "html": "data-hr-type",
          },
          "values": [
            "scene-break",
            "section-break",
            "ornamental",
            "decorative",
            "other",
          ],
          "notes": "Optional classification of the thematic break's role. Affects\nrendering (scene breaks render as blank space; ornamental breaks\nrender with decorative characters or images).\n",
        },
      },
    },
    "content": {
      "notes": "The hr element is void; it cannot contain content.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "hr",
      "notes": "JATS has no direct equivalent. The closest is using <break-quote-content>\nfor similar visual effects, or simply relying on document structure.\nFor enscribe-to-JATS export, hr elements are typically replaced with\na structural break (an empty paragraph or visual marker) since JATS\nprefers explicit semantic structure over thematic breaks.\n",
    },
    "shorthand_examples": [
      {
        "source": "<hr>",
        "layer1_html": "<hr />",
      },
      {
        "source": "<hr type=scene-break>",
        "layer1_html": "<hr data-hr-type=\"scene-break\" />",
      },
      {
        "source": "<p | First paragraph.>\n\n<hr type=ornamental>\n\n<p | Second paragraph after a thematic break.>\n",
        "layer1_html": "<p>First paragraph.</p>\n<hr data-hr-type=\"ornamental\" />\n<p>Second paragraph after a thematic break.</p>\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "hr.md",
  });

const _i = Object.freeze({
    "semantic_role": "i",
    "category": "inline-formatting",
    "html_output": {
      "element": "i",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "type": {
          "maps_to": {
            "html": "data-italic-type",
          },
          "values": [
            "foreign",
            "taxonomic",
            "technical",
            "thought",
            "ship-name",
            "other",
          ],
          "notes": "Optional classification of the italic's role. Useful for\naccessibility tools and stylesheet targeting.\n",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "italic",
      "attributes": {
        "toggle": "no",
      },
      "notes": "JATS uses <italic toggle=\"no\"> for italics that assert italic state\nrather than toggling relative to context. This matches <i>'s semantic\nrole: a stylistic distinction without emphasis.\n",
    },
    "shorthand_examples": [
      {
        "source": "The species is <i type=taxonomic | Loxodonta africana>.",
        "layer1_html": "<p>The species is <i data-italic-type=\"taxonomic\">Loxodonta africana</i>.</p>",
      },
      {
        "source": "The French <i type=foreign | tour de force> is impressive.",
        "layer1_html": "<p>The French <i data-italic-type=\"foreign\">tour de force</i> is impressive.</p>",
      },
      {
        "source": "The technical term <i type=technical | mitochondria> refers to organelles.",
        "layer1_html": "<p>The technical term <i data-italic-type=\"technical\">mitochondria</i> refers to organelles.</p>",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "i.md",
  });

const _inline_code = Object.freeze({
    "semantic_role": "inline-code",
    "category": "code",
    "html_output": {
      "element": "inline-code",
      "is_html_native": false,
      "notes": "The vocabulary entry key is \"inline-code\", but the rendered HTML does NOT\nuse an <inline-code> wrapping element. The handler emits <code ...>\ndirectly, matching the output of markdown backtick spans. The element\nfield is used only as a dispatch key for the interpreter.\n",
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
        "notes": "Placed on <code>. Used as cross-reference target.\n",
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
        "notes": "Added to <code> alongside any language class.\n",
      },
    },
    "content": {
      "notes": "The pipe content is verbatim code source. No markdown idioms or enscribe\nconstructs are interpreted inside inline code.\n",
    },
    "shorthand_examples": [
      {
        "source": "Assign with <` x = 1 `> at the top of the function.",
        "layer1_html": "<p>Assign with <code>x = 1 </code>at the top of the function.</p>",
        "notes": "The single-backtick sigil. With no pipe, the whole body is opaque\ncode content rendered as <code> (the same output as a markdown\nbacktick span). Whitespace in code is significant and preserved, so\nthe pipe-form padding stays INSIDE the <code>. (#327)\n",
      },
      {
        "source": "Call <` python | factorial(n) `> to recurse.",
        "layer1_html": "<p>Call <code class=\"language-python\">factorial(n) </code>to recurse.</p>",
        "notes": "The first positional token before the pipe is the language, emitted\nas a `language-X` class on the <code> (discoverable by highlighters;\nthe interpreter applies no highlighting itself).\n",
      },
    ],
    "interpreter_strategy": "handler",
    "handler_module": "./handlers/inline-code.js",
    "jats_counterpart": {
      "element": "monospace",
      "notes": "JATS uses <monospace> for inline code-like content. If a language is\nspecified, it is not directly representable in JATS monospace; the\nattribute is dropped on export.\n",
    },
    "_sourceFile": "inline-code.md",
  });

const _inline_math = Object.freeze({
    "semantic_role": "inline-math",
    "category": "math",
    "html_output": {
      "element": "inline-math",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "notes": "The pipe content is LaTeX math source. It is passed directly to KaTeX\nas a string; it is not parsed as prose. The author is responsible for\nvalid LaTeX math syntax.\n",
    },
    "content_handler": "math",
    "shorthand_examples": [
      {
        "source": "The identity <$ a^2 + b^2 = c^2 $> holds for right triangles.",
        "layer1_html": "<p>The identity <inline-math><span class=\"katex\">…</span></inline-math> holds for right triangles.</p>",
        "notes": "The `$` sigil. Opaque LaTeX content rendered inline by KaTeX and\nwrapped in <inline-math> for CSS targeting. The sigil carries no\nattributes — id and classes are not supported for inline math.\n",
      },
    ],
    "interpreter_strategy": "handler",
    "handler_module": "./handlers/math.js",
    "jats_counterpart": {
      "element": "inline-formula",
      "notes": "JATS <inline-formula> wraps MathML or TeX alternatives. The JATS\nexporter generates <tex-math> with the raw LaTeX source, plus\noptionally a <mml:math> rendered form.\n",
    },
    "_sourceFile": "inline-math.md",
  });

const _item = Object.freeze({
    "semantic_role": "navigation-item",
    "category": "navigation",
    "html_output": {
      "element": "item",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "src": {
          "maps_to": {
            "html": "data-src",
          },
          "notes": "For an EXTERNAL page: the child `.emd` file that supplies the page body. The\npipe gives the menu label and overrides the child's own title, exactly as\n`<section src | Title>` does in an article. Omitted for an INLINE page, whose\nbody is authored in the master after the `<item | Title>` marker (peer-closed\nby the next entry, the `<section | Title>` model). The website render (S2)\nloads the child; S1 records the `src` as a reference only.\n",
        },
      },
    },
    "content": {
      "shape": [
        {
          "element": "body",
          "required": false,
          "contains": [
            "inline",
            "block",
          ],
        },
      ],
    },
    "content_handler": "default",
    "interpreter_strategy": "schema",
    "related_plugins": [
      {
        "name": "enscribeWebsiteStructuring",
        "runs_before": "enscribeInterpreter",
        "purpose": "Records this page (external src or inline body) in the nav model with a ?page= slug (#246).",
      },
    ],
    "_sourceFile": "item.md",
  });

const _kbd = Object.freeze({
    "semantic_role": "kbd",
    "category": "inline-formatting",
    "html_output": {
      "element": "kbd",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
      "notes": "The keyboard input as text — typically a single key, a chord\n(Ctrl+C), or a short sequence. Inline elements within <kbd> are\npermitted but unusual; nested <kbd> is the conventional way to\ndistinguish individual keys in a chord.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "(no direct JATS counterpart; HTML-native)",
      "notes": "JATS has no dedicated element for keyboard input — the closest\nis <named-content content-type=\"...\"> with a chosen content-type,\nor simply emitting the text as inline prose. The exporter chooses\nper the target schema variant; the default is to emit the kbd\ncontent as inline text with no special JATS markup. This is a\nconscious tradeoff: <kbd> is a presentation concern for technical\ndocumentation, not a scholarly-content concern JATS models.\n",
    },
    "shorthand_examples": [
      {
        "source": "Press <kbd | Ctrl+C> to copy.",
        "layer1_html": "<p>Press <kbd>Ctrl+C</kbd> to copy.</p>",
        "notes": "Single chord as a kbd block. Browsers render <kbd> in a\nmonospace font by default, distinguishing it from surrounding\nprose.\n",
      },
      {
        "source": "Press <kbd | <kbd | Ctrl>+<kbd | C>> to copy.",
        "layer1_html": "<p>Press <kbd><kbd>Ctrl</kbd>+<kbd>C</kbd></kbd> to copy.</p>",
        "notes": "Nested <kbd> distinguishes individual keys in a chord. Browsers\nrender the outer block as the chord and the inner blocks as\nindividual keys, both monospace.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "kbd.md",
  });

const _keywords = Object.freeze({
    "semantic_role": "keywords",
    "category": "metadata",
    "html_output": {
      "element": "keywords",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
      "notes": "Comma-separated keyword list as text, OR a structured list of\nindividual <keyword> child elements. The simpler comma-separated\nform is preferred for ergonomics; the structured form is useful\nwhen individual keywords need ids or other attributes for\ncross-referencing.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "kwd-group",
      "notes": "JATS uses <kwd-group> containing <kwd> elements, inside\n<article-meta>. Comma-separated enscribe content splits on\ncommas at export time; structured <keyword> children map\ndirectly to <kwd>. Multiple <kwd-group> elements (each with a\nkwd-group-type attribute) are allowed in JATS for multi-language\nkeyword sets — enscribe does not currently model that distinction\nat the authoring layer.\n",
    },
    "shorthand_examples": [
      {
        "source": "<meta>\n  <keywords | elephants, conservation, climate, carbon storage>\n</meta>\n",
        "layer1_html": "<meta>\n  <keywords>elephants, conservation, climate, carbon storage</keywords>\n</meta>\n",
        "notes": "Comma-separated keyword list — the simpler and more common\nauthoring form. The exporter splits on commas when emitting JATS.\n",
      },
      {
        "source": "<meta keywords=\"elephants, conservation, climate\" />",
        "layer1_html": "<meta>\n  <keywords>elephants, conservation, climate</keywords>\n</meta>\n",
        "notes": "Kwarg-form authoring lifts to the child-tag form at the gate.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "keywords.md",
  });

const _lang = Object.freeze({
    "semantic_role": "lang",
    "category": "metadata",
    "html_output": {
      "element": "lang",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
      "notes": "The document's primary language, typically as a BCP 47 / ISO 639-1\nlanguage tag (e.g. \"en\", \"en-US\", \"fr\", \"ja\"). Free-form language\nnames (\"English\", \"French\") are accepted but the tag form is\npreferred for machine readability.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "(no direct element; maps to xml:lang attribute)",
      "notes": "JATS does not have a dedicated <lang> element. Language is expressed\nvia the xml:lang attribute, typically on the <article> root or on\n<title-group> for language-specific titles. The exporter reads the\nvalue from <meta>'s <lang> and emits it as an xml:lang attribute on\nthe appropriate JATS container — there is no <lang> element in the\nJATS output. Verified: JATS 1.3 uses xml:lang on the root element\nrather than a child element for the document's primary language.\n",
    },
    "shorthand_examples": [
      {
        "source": "<meta>\n  <lang | en-US>\n</meta>\n",
        "layer1_html": "<meta>\n  <lang>en-US</lang>\n</meta>\n",
        "notes": "BCP 47 language tag. The Layer 1 form preserves the value as a\nchild element of <meta>; downstream consumers (the JATS exporter,\nthe render-mode lowering) project it where each format expects.\n",
      },
      {
        "source": "<meta lang=\"fr\" />",
        "layer1_html": "<meta>\n  <lang>fr</lang>\n</meta>\n",
        "notes": "Kwarg-form authoring lifts to the child-tag form at the gate.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "lang.md",
  });

const _lemma = Object.freeze({
    "semantic_role": "lemma",
    "category": "theorem-family",
    "html_output": {
      "element": "lemma",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "name": {
          "maps_to": {
            "html": "data-name",
          },
          "notes": "Optional name suffix for the lemma's label, parallel to\n<theorem>'s `name` kwarg. Honored by the Phase-2 handler.\n",
        },
      },
      "booleans": {
        "numbered": {
          "handled_by": "handler",
          "default": true,
          "notes": "Whether this lemma participates in the propositional theorem-\nfamily shared counter. Default true; -numbered suppresses.\n",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "block",
        ],
      },
      "becomes": "children",
      "notes": "Body content directly (no internal element parts), per the\ntheorem-family convention.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "statement",
      "attributes": {
        "content-type": "lemma",
      },
      "notes": "JATS <statement content-type=\"lemma\">. The Phase-2 handler\nconstructs <label> and (when `name` is set) <title> at export.\n",
    },
    "shorthand_examples": [
      {
        "source": "<lemma | Every continuous function on a compact set attains its maximum.>\n",
        "layer1_html": "<lemma><span class=\"lemma-label\">Lemma 1.</span><p>Every continuous function on a compact set attains its maximum.</p></lemma>",
      },
      {
        "source": "<lemma name=\"Zorn\" #lem:zorn>\nEvery non-empty partially-ordered set in which every chain has\nan upper bound contains a maximal element.\n</lemma>\n",
        "layer1_html": "<lemma data-name=\"Zorn\" id=\"lem:zorn\"><span class=\"lemma-label\">Lemma 1 (Zorn).</span><p>Every non-empty partially-ordered set in which every chain has an upper bound contains a maximal element.</p></lemma>",
      },
    ],
    "interpreter_strategy": "handler",
    "handler_module": "./handlers/theorem.js",
    "_sourceFile": "lemma.md",
  });

const _library = Object.freeze({
    "semantic_role": "library",
    "category": "storage-hosts",
    "html_output": {
      "element": "library",
      "is_html_native": false,
      "default_attributes": {},
      "notes": "Enscribe's <library> is a custom element. It is a data block: opaque\ncontent processed by a format-specific parser, registers entries with\nthe citation system, produces no inline rendered output.\n",
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "positional": [
        {
          "name": "format",
          "values": [
            "bibtex",
            "csl-json",
            "ris",
            "endnote-xml",
            "other",
          ],
          "notes": "The format word — the canonical way to name the payload language\n(`<library bibtex | …>`). `<library>` is a storage host on the\nhost/language axis (DESIGN.md §\"The two axes\"; format-words.md): the\npositional names which parser reads the body. Omitted → citation-js\nauto-detect (today's behavior). The `format=` kwarg below is the\nequivalent attribute form.\n",
        },
      ],
      "kwargs": {
        "format": {
          "maps_to": {
            "html": "data-format",
          },
          "values": [
            "bibtex",
            "csl-json",
            "ris",
            "endnote-xml",
            "other",
          ],
          "required": false,
          "default": "auto",
          "notes": "Attribute-form equivalent of the format-word positional. When both the\npositional and the kwarg are omitted, the library-load plugin\nauto-detects the format via citation-js (works reliably for BibTeX and\nCSL-JSON). A named format is passed to citation-js as a forceType.\n",
        },
        "src": {
          "maps_to": {
            "html": "data-src",
          },
          "required": false,
          "notes": "External source (#133): a filesystem path, an http(s) URL, or any\nreachable URL (e.g. a GitHub raw link). The reference data is loaded from\nthere and parsed exactly as inline content (same formats; never injected\nas markup). With src= the node's own (empty) body is ignored; inline and\nsrc libraries are both valid and multiple of either merge. A failed load\n(unreachable / 404 / CORS-blocked / parse-fail) renders a visible error\nand never aborts the document (always-renders). Filesystem paths apply on\nthe CLI/build; in the browser a relative path resolves against the\ndocument base URL and is fetched (cross-origin URLs are CORS-limited). A\nURL source needs an async render (the CLI render command / the browser\nrenderAsync); a synchronous render flags it.\n",
        },
      },
    },
    "content": {
      "becomes": "parsed entries (registered in citation system)",
      "notes": "Content is preserved verbatim and parsed by a format-specific parser.\nNo enscribe interpretation of the content. Authors typically copy\nthe content directly from a reference manager (Zotero, JabRef, etc.)\nor a text editor.\n",
    },
    "content_handler": "library",
    "jats_counterpart": {
      "element": "no direct equivalent (entries lift into ref-list)",
      "notes": "JATS doesn't have an opaque-source equivalent. Library entries\nare parsed at processing time and merged into the citation registry.\nAt JATS export, the registered entries appear in <ref-list> as\n<ref> elements (whether they came from <library>, <bib-entry>, or\nexternal file). The <library> element itself doesn't appear in\nJATS output.\n",
    },
    "shorthand_examples": [
      {
        "source": "<library format=bibtex>\n  @article{goodall2024,\n    author = {Goodall, Jane},\n    title = {The Effect of Elephants on Climate},\n    journal = {Nature},\n    year = {2024}\n  }\n\n  @book{darwin1859,\n    author = {Darwin, Charles},\n    title = {On the Origin of Species},\n    publisher = {John Murray},\n    year = {1859}\n  }\n</library>\n",
        "layer1_html": "<library data-format=\"bibtex\">\n  @article{goodall2024,\n    author = {Goodall, Jane},\n    title = {The Effect of Elephants on Climate},\n    journal = {Nature},\n    year = {2024}\n  }\n\n  @book{darwin1859,\n    author = {Darwin, Charles},\n    title = {On the Origin of Species},\n    publisher = {John Murray},\n    year = {1859}\n  }\n</library>\n",
        "notes": "A BibTeX library block. The parser reads the entries and registers\ngoodall2024 and darwin1859 in the citation registry. Citations\nelsewhere (e.g., <cite goodall2024>) resolve against these entries.\nThe library block itself produces no rendered output.\n",
      },
      {
        "source": "<library format=csl-json>\n  [\n    {\n      \"id\": \"goodall2024\",\n      \"type\": \"article-journal\",\n      \"author\": [{\"family\": \"Goodall\", \"given\": \"Jane\"}],\n      \"title\": \"The Effect of Elephants on Climate\",\n      \"container-title\": \"Nature\",\n      \"issued\": {\"date-parts\": [[2024]]}\n    }\n  ]\n</library>\n",
        "layer1_html": "<library data-format=\"csl-json\">\n  [\n    {\n      \"id\": \"goodall2024\",\n      ...\n    }\n  ]\n</library>\n",
      },
    ],
    "interpreter_strategy": "schema",
    "related_plugins": [
      {
        "name": "enscribeLibraryLoad",
        "location": "packages/enscribe/src/interpreter/plugins/library-load.js",
        "runs_before": "enscribeCiteResolution",
        "purpose": "The actual library processing happens at PLUGIN time, not at handler\ntime. `enscribeLibraryLoad` walks `<data>` root siblings, reads each\ncontained `<library>` node's opaque content, dispatches to the\nformat-specific parser (BibTeX via citation-js, etc.), and registers\nevery entry in the citation registry. By the time interpreter\nrendering runs, the library entries are already in the registry; the\n`<library>` element itself produces no inline output (the structural\npipeline routes `<data>` into `<article-back>` where the empty\n`<library>` element is filtered from the rendered HTML).\n\nThe interpreter_strategy is `schema` (not `handler`) because no\nhandler-time work is needed — the upstream plugin has already done\neverything. A handler module entry was previously declared\n(`handler_module: ./handlers/library.js`) but pointed at a file\nthat does not exist; the declaration was stale aspirational text\nand was removed by an earlier change. If `<library>`\never needs handler-time work in the future (e.g. a render-mode\nthat shows library content inline), the entry can be re-elevated\nto handler strategy at that time.\n",
      },
    ],
    "_sourceFile": "library.md",
  });

const _license = Object.freeze({
    "semantic_role": "license",
    "category": "metadata",
    "html_output": {
      "element": "license",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "href": {
          "maps_to": {
            "html": "href",
          },
          "notes": "Optional URL of the license terms (e.g. https://creativecommons.org/licenses/by/4.0/).\n",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
      "notes": "The license name or short identifier (e.g. \"CC BY 4.0\",\n\"MIT License\", \"All rights reserved\"). The optional href kwarg\ncarries the canonical URL of the license terms.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "license",
      "attributes": {
        "xlink:href": "from href",
      },
      "notes": "JATS uses <license xlink:href=\"...\"> inside <permissions> inside\n<article-meta>. The license content can be free-form text or a\nstructured <license-p>. Enscribe's <license> maps to JATS's\n<license> directly; the href kwarg maps to xlink:href.\n",
    },
    "shorthand_examples": [
      {
        "source": "<meta>\n  <license href=\"https://creativecommons.org/licenses/by/4.0/\" | CC BY 4.0>\n</meta>\n",
        "layer1_html": "<meta>\n  <license href=\"https://creativecommons.org/licenses/by/4.0/\">CC BY 4.0</license>\n</meta>\n",
        "notes": "License name with canonical URL.\n",
      },
      {
        "source": "<meta license=\"MIT License\" />",
        "layer1_html": "<meta>\n  <license>MIT License</license>\n</meta>\n",
        "notes": "Kwarg-form authoring (license name only) lifts to the child-tag\nform at the normalize-to-canonical gate.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "license.md",
  });

const _marginnote = Object.freeze({
    "semantic_role": "marginnote",
    "category": "inline-formatting",
    "html_output": {
      "element": "aside",
      "is_html_native": true,
      "default_attributes": {
        "class": "enscribe-marginnote",
      },
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "boxed-text",
      "attributes": {
        "content-type": "marginnote",
      },
      "notes": "JATS models a sidebar / aside as <boxed-text>; content-type=\"marginnote\"\nmarks the identity for round-trip. The inline-authored body is wrapped in a\n<p> (boxed-text takes block content).\n",
    },
    "shorthand_examples": [
      {
        "source": "The result holds.<marginnote | A caveat, set in the margin.>",
        "layer1_html": "<style>/* Margin column (#33) — shared by sidenotes and marginnotes; injected only when used. */ /* ── Default / narrow (the mobile fallback) ────────────────────────────────── */ /* A relocated sidenote hides (the bottom note-list shows instead); a marginnote has no list to fall back to, so it renders inline as a block aside. */ .enscribe-sidenote { display: none; } .enscribe-marginnote { display: inline-block; font-size: var(--enscribe-text-sm); line-height: var(--enscribe-line-height-tight); color: var(--enscribe-text-secondary); } @media (min-width: 900px) { /* Relax the body cap so body + margin gutter can be wider (mirrors the ToC layout); only when a margin layout is present. */ body:has(.enscribe-layout--margin) { max-width: none; padding: 0; } .enscribe-layout--margin { margin: 0 auto; padding: 0 var(--enscribe-content-padding); /* the readable body column plus a margin gutter to its right */ max-width: calc(var(--enscribe-content-width) + var(--enscribe-space-12) + 18rem); } /* The body keeps the readable measure; the gutter to its right holds the notes. */ .enscribe-layout--margin .enscribe-body { max-width: var(--enscribe-content-width); margin-right: calc(var(--enscribe-space-12) + 18rem); } /* Both kinds of margin content float into the right gutter, near their anchor. */ .enscribe-layout--margin .enscribe-sidenote, .enscribe-layout--margin .enscribe-marginnote { display: block; float: right; clear: right; width: 18rem; margin-right: -18rem; margin-bottom: var(--enscribe-space-3); font-size: var(--enscribe-text-sm); line-height: var(--enscribe-line-height-tight); color: var(--enscribe-text-secondary); text-indent: 0; } /* The sidenote number, carried verbatim from the bottom-list <sup>. */ .enscribe-layout--margin .enscribe-sidenote > sup { font-family: var(--enscribe-font-sans); font-size: var(--enscribe-text-xs); color: var(--enscribe-link); margin-right: var(--enscribe-space-1); } /* On wide screens the bottom note-list is redundant with the relocated copies. */ .enscribe-layout--margin note-list { display: none; } /* ── ToC + margin combined (#33 part 2, folded loose end) ─────────────────── A document with BOTH a ToC sidebar and margin content uses a three-track grid — ToC | body | margin gutter — so the floats land in a real gutter track instead of overrunning the ToC layout's two-column grid. */ .enscribe-layout--toc.enscribe-layout--margin { display: grid; grid-template-columns: 14rem minmax(0, var(--enscribe-content-width)) 18rem; column-gap: var(--enscribe-space-12); max-width: calc(14rem + var(--enscribe-content-width) + 18rem + 2 * var(--enscribe-space-12)); } /* In the combined grid the body is the middle track and the gutter is the third track, so the floats use the column-gap offset, not the single-layout negative margin against the body. */ .enscribe-layout--toc.enscribe-layout--margin .enscribe-body { margin-right: 0; } .enscribe-layout--toc.enscribe-layout--margin .enscribe-sidenote, .enscribe-layout--toc.enscribe-layout--margin .enscribe-marginnote { margin-right: calc(-1 * (18rem + var(--enscribe-space-12))); } } </style><div class=\"enscribe-layout enscribe-layout--margin\"><main class=\"enscribe-body\"><article><article-body><p>The result holds. <aside class=\"enscribe-marginnote\">A caveat, set in the margin.</aside></p></article-body></article></main></div>",
        "notes": "An unnumbered margin aside, authored in place. Unlike a numbered <note>,\nit is not collected, numbered, or relocated — it renders where written and\nfloats into the margin column (note-position is irrelevant to it).\n",
      },
      {
        "source": "<marginnote #m1 | A margin note with an id.>",
        "layer1_html": "<style>/* Margin column (#33) — shared by sidenotes and marginnotes; injected only when used. */ /* ── Default / narrow (the mobile fallback) ────────────────────────────────── */ /* A relocated sidenote hides (the bottom note-list shows instead); a marginnote has no list to fall back to, so it renders inline as a block aside. */ .enscribe-sidenote { display: none; } .enscribe-marginnote { display: inline-block; font-size: var(--enscribe-text-sm); line-height: var(--enscribe-line-height-tight); color: var(--enscribe-text-secondary); } @media (min-width: 900px) { /* Relax the body cap so body + margin gutter can be wider (mirrors the ToC layout); only when a margin layout is present. */ body:has(.enscribe-layout--margin) { max-width: none; padding: 0; } .enscribe-layout--margin { margin: 0 auto; padding: 0 var(--enscribe-content-padding); /* the readable body column plus a margin gutter to its right */ max-width: calc(var(--enscribe-content-width) + var(--enscribe-space-12) + 18rem); } /* The body keeps the readable measure; the gutter to its right holds the notes. */ .enscribe-layout--margin .enscribe-body { max-width: var(--enscribe-content-width); margin-right: calc(var(--enscribe-space-12) + 18rem); } /* Both kinds of margin content float into the right gutter, near their anchor. */ .enscribe-layout--margin .enscribe-sidenote, .enscribe-layout--margin .enscribe-marginnote { display: block; float: right; clear: right; width: 18rem; margin-right: -18rem; margin-bottom: var(--enscribe-space-3); font-size: var(--enscribe-text-sm); line-height: var(--enscribe-line-height-tight); color: var(--enscribe-text-secondary); text-indent: 0; } /* The sidenote number, carried verbatim from the bottom-list <sup>. */ .enscribe-layout--margin .enscribe-sidenote > sup { font-family: var(--enscribe-font-sans); font-size: var(--enscribe-text-xs); color: var(--enscribe-link); margin-right: var(--enscribe-space-1); } /* On wide screens the bottom note-list is redundant with the relocated copies. */ .enscribe-layout--margin note-list { display: none; } /* ── ToC + margin combined (#33 part 2, folded loose end) ─────────────────── A document with BOTH a ToC sidebar and margin content uses a three-track grid — ToC | body | margin gutter — so the floats land in a real gutter track instead of overrunning the ToC layout's two-column grid. */ .enscribe-layout--toc.enscribe-layout--margin { display: grid; grid-template-columns: 14rem minmax(0, var(--enscribe-content-width)) 18rem; column-gap: var(--enscribe-space-12); max-width: calc(14rem + var(--enscribe-content-width) + 18rem + 2 * var(--enscribe-space-12)); } /* In the combined grid the body is the middle track and the gutter is the third track, so the floats use the column-gap offset, not the single-layout negative margin against the body. */ .enscribe-layout--toc.enscribe-layout--margin .enscribe-body { margin-right: 0; } .enscribe-layout--toc.enscribe-layout--margin .enscribe-sidenote, .enscribe-layout--toc.enscribe-layout--margin .enscribe-marginnote { margin-right: calc(-1 * (18rem + var(--enscribe-space-12))); } } </style><div class=\"enscribe-layout enscribe-layout--margin\"><main class=\"enscribe-body\"><article><article-body><aside class=\"enscribe-marginnote\" id=\"m1\">A margin note with an id.</aside></article-body></article></main></div>",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "marginnote.md",
  });

const _math = Object.freeze({
    "semantic_role": "math",
    "category": "math",
    "html_output": {
      "element": "math",
      "is_html_native": false,
      "default_attributes": {},
      "notes": "`html_output.element` here is the vocabulary lookup key (must match\nthe tagname). The handler emits a `<math>` wrapper element directly;\nthe schema field is not consulted under\n`interpreter_strategy: handler`. (Same pattern the csv/tsv\nentries follow.)\n",
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "notes": "The content is LaTeX math source. It is passed directly to KaTeX\n(displayMode: true) as a string; not parsed as prose. The author is\nresponsible for valid LaTeX math syntax.\n",
    },
    "content_handler": "math",
    "jats_counterpart": {
      "element": "disp-formula",
      "notes": "JATS `<disp-formula>` wraps a displayed equation, same as the\ncounterpart for `<display-math>` (the `<$$>` sigil). The two surfaces\nare semantic synonyms in enscribe; both map to JATS\n`<disp-formula>`.\n",
    },
    "shorthand_examples": [
      {
        "source": "<math>\nE = mc^2\n</math>\n",
        "layer1_html": "<math>(KaTeX-rendered HTML)</math>\n",
        "notes": "Long-form `<math>` block. Semantically equivalent to the\n`<$$ E = mc^2 $$>` display-math sigil — both render block-level\nLaTeX math via KaTeX. Use the long-form when the source is\nmulti-line or when explicit tag bounds aid readability; use the\nsigil for brevity.\n",
      },
    ],
    "interpreter_strategy": "handler",
    "handler_module": "./handlers/math.js",
    "handler_responsibilities": [
      "Read the opaque content as LaTeX source.",
      {
        "Render via KaTeX with `displayMode": "true` (block-level).",
      },
      "Emit a `<math>` wrapper element containing KaTeX's HTML output.",
      "Apply id / classes from the node.",
    ],
    "_sourceFile": "math.md",
  });

const _matrix = Object.freeze({
    "semantic_role": "matrix",
    "category": "math",
    "html_output": {
      "element": "matrix",
      "is_html_native": false,
      "default_attributes": {},
      "notes": "`html_output.element` is the vocabulary lookup key (must match the\ntagname). Handler emits `<matrix>` wrapper directly; the schema\nfield is not consulted under `interpreter_strategy: handler`.\n",
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "notes": "Author writes pure environment body (rows separated by `\\\\`, cells\nseparated by `&`). The handler wraps in `\\begin{matrix}...\\end{matrix}`\nbefore passing to KaTeX (wrap-inside convention; see DESIGN.md and\nan earlier STATUS milestone).\n",
    },
    "content_handler": "matrix",
    "jats_counterpart": {
      "element": "disp-formula",
      "notes": "JATS does not have a dedicated `<matrix>` element. The LaTeX math\nenvironment (after the handler wraps it) maps to JATS\n`<disp-formula>` with `<tex-math>` carrying the wrapped LaTeX\nsource. The exporter decides whether to also emit MathML.\n",
    },
    "shorthand_examples": [
      {
        "source": "<matrix>\n1 & 2 \\\\\n3 & 4\n</matrix>\n",
        "layer1_html": "<matrix>(KaTeX-rendered HTML of \\begin{matrix}1 & 2 \\\\ 3 & 4\\end{matrix})</matrix>\n",
        "notes": "A 2×2 matrix. The handler wraps the body in\n`\\begin{matrix}...\\end{matrix}` before KaTeX renders.\n",
      },
    ],
    "interpreter_strategy": "handler",
    "handler_module": "./handlers/math.js",
    "handler_responsibilities": [
      "Read the opaque content as LaTeX math-environment body.",
      "Wrap in `\\begin{matrix}...\\end{matrix}`.",
      {
        "Render via KaTeX with `displayMode": "true`.",
      },
      "Emit a `<matrix>` wrapper element containing KaTeX's HTML output.",
      "Apply id / classes from the node.",
    ],
    "_sourceFile": "matrix.md",
  });

const _meta = Object.freeze({
    "semantic_role": "meta",
    "category": "structured-data-containers",
    "html_output": {
      "element": "meta",
      "is_html_native": false,
      "default_attributes": {},
      "notes": "Enscribe's <meta> is a custom element distinct from HTML's <meta>\n(which is a void element used for character encoding, viewport, etc.).\nEnscribe's <meta> is a structured container for descriptive metadata —\ninformation about what the document is. Operational and configuration\ncontent lives in <data> and <config>, respectively.\n",
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "type": {
          "maps_to": {
            "html": "data-document-type",
          },
          "values": [
            "article",
            "book",
            "book-part",
            "website",
          ],
          "default": "article",
          "notes": "Declares the document class. Resolved ONCE before structuring by\nenscribeDocTypeResolve: the value is validated against this set, stored on\nfile.data, and an explicitly-set unknown type (a typo, an unbuilt class) is\nreported with a non-fatal diagnostic and falls back to \"article\"\n(always-renders). The structural plugins (enscribeArticleStructuring /\nenscribeBookStructuring) read the resolved class to decide which Layer 1\nwrapper to generate around the document:\ntype=article → <article> with <article-front>/<article-body>/<article-back>;\ntype=book → <book> with <book-front>/<book-body>/<book-back>;\ntype=book-part → <book-part> containing <meta> and body content directly\n(no nested front/body/back wrappers).\ntype=website → no Layer 1 wrapper; enscribeWebsiteStructuring builds a nav\nmodel on file.data from the master's <nav> (#246). HTML render only — no\nJATS/BITS (a site is not a scholarly document).\nDefault is \"article\" — the most common case. An absent type kwarg is the\nnormal article case: silent default, no diagnostic.\n",
        },
        "book-part-type": {
          "maps_to": {
            "html": "book-part-type",
          },
          "values": [
            "chapter",
            "part",
            "introduction",
            "conclusion",
            "other",
            "preface",
            "foreword",
            "dedication",
            "appendix",
            "glossary",
            "colophon",
            "afterword",
          ],
          "default": "chapter",
          "notes": "For a single-file book-part (type=book-part) only: sets the\nbook-part-type on the generated <book-part> wrapper (#176). This is how\na standalone book-part file declares whether it is an appendix, preface,\netc. — a single-file appendix needs book-part-type=appendix (#100), so it\nis not always \"chapter\". Read by enscribeBookStructuring; allowlisted but\nnot lifted (a structural kwarg, like type — it configures the wrapper, it\nis not a descriptive <meta> field). Default \"chapter\" when unset. An\nunknown value is reported with a non-fatal diagnostic and the document\nstill renders (always-renders). Ignored on type=article / type=book\ndocuments, which route their book-parts by the <chapter> / <appendix> /\n… shorthand instead.\n",
        },
        "icon": {
          "maps_to": {
            "html": "data-icon",
          },
          "notes": "Optional brand icon for a website's top bar (#246): the path or URL of the\nsite icon, read by the website chrome (S2). Descriptive metadata, like the\ntitle; ignored by article/book documents. The brand NAME is <meta>'s title —\nthere is no in-header <icon>/<title> tag.\n",
        },
        "slug": {
          "maps_to": {
            "html": "data-slug",
          },
          "notes": "The page's stable public SLUG (#289) — its identity, independent of title\nand of where it sits in a website's <nav>. A website builder uses it to form\nthe page's URL and to resolve <a {slug}> internal links; reorganizing the\nmenu moves only the URL, while authored links re-resolve untouched. Optional:\nwhen absent the slug is derived from the <meta> title (slugifyPage). The value\nis normalized to a lowercase [a-z0-9-] slug (slugifyPage), so `slug=Foo Bar`\nbecomes `foo-bar` — author the matching <a foo-bar> link in that normalized\nform. Slugs are unique site-wide. Descriptive metadata, like icon; ignored by\narticle/book documents read on their own.\n",
        },
      },
    },
    "content": {
      "shape": [
        {
          "element": "title",
          "required": false,
          "contains": [
            "inline",
          ],
        },
        {
          "element": "subtitle",
          "required": false,
          "contains": [
            "inline",
          ],
        },
        {
          "element": "author",
          "required": false,
          "multiple": true,
        },
        {
          "element": "editor",
          "required": false,
          "multiple": true,
        },
        {
          "element": "date",
          "required": false,
          "multiple": true,
        },
        {
          "element": "keywords",
          "required": false,
        },
      ],
      "notes": "The structured-child content above is one of two equivalent authoring\nforms for <meta>. The other is the kwarg form: <meta title=\"...\"\nauthor=\"...\" doi=\"...\">. The normalize-to-canonical gate lifts the\nkwarg form to the canonical child-tag form per the META_KWARGS\nallowlist (title / subtitle / author / date / doi / license / lang /\nversion / keywords). Unknown kwargs are dropped with a diagnostic;\n<config>-shaped kwargs (e.g. citation-style) on <meta> get a\n\"did you mean <config>?\" misuse hint.\n\nNOTE on <abstract>: an <abstract> tag is the *its own element*, not\na child of <meta> — descriptive but distinct from descriptive\nmetadata. The vocabulary entry for <abstract> is not yet written\n(filed as a finding in GitHub Issues). Until that entry exists,\ndocuments that include an abstract should author it as <abstract>\noutside <meta>; in <meta>, the key 'abstract' is NOT in the\nallowlist and would be dropped with a diagnostic.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "article-meta, book-meta, or book-part-meta",
      "notes": "The JATS mapping depends on the document type (driven by <meta>'s\ntype kwarg, or by the surrounding container if <meta> is nested):\n  type=article (or default) → <article-meta> inside <front>\n  type=book → <book-meta> inside <book-front>\n  type=book-part → <book-part-meta> inside <book-part>\nAt Layer 1 the element is always <meta>; the exporter constructs\nthe type-specific JATS container and the surrounding region wrappers\n(<front>, <book-front>, <book-part>) at export time.\n",
    },
    "shorthand_examples": [
      {
        "source": "<meta type=article>\n  <title | The Effect of Elephants on Climate>\n  <author | Jane Goodall>\n  <date | 2024-03-15>\n</meta>\n\n<section | Introduction>\nThe paper begins.\n",
        "layer1_html": "<article>\n  <article-front>\n    <meta data-document-type=\"article\">\n      <article-title>The Effect of Elephants on Climate</article-title>\n      <author>Jane Goodall</author>\n      <date>2024-03-15</date>\n    </meta>\n  </article-front>\n  <article-body>\n    <section>\n      <section-title>Introduction</section-title>\n      <p>The paper begins.</p>\n    </section>\n  </article-body>\n</article>\n",
        "notes": "Author writes <meta type=article> at the top with no <article>\nwrapper. The structural plugin reads type=article and generates:\n  - the <article> container\n  - <article-front> wrapping the original <meta>\n  - <article-body> wrapping the section content\n<title> is promoted to <article-title> as the first child of <meta>.\n<meta> itself survives in the output, inside <article-front>.\n",
      },
      {
        "source": "<meta type=book>\n  <title | A Natural History of Elephants>\n  <author | Jane Goodall>\n</meta>\n\n<chapter | Origins>\nContent.\n",
        "layer1_html": "<book>\n  <book-front>\n    <meta data-document-type=\"book\">\n      <book-title>A Natural History of Elephants</book-title>\n      <author>Jane Goodall</author>\n    </meta>\n  </book-front>\n  <book-body>\n    <book-part book-part-type=\"chapter\">\n      <meta>\n        <book-part-title>Origins</book-part-title>\n      </meta>\n      <p>Content.</p>\n    </book-part>\n  </book-body>\n</book>\n",
        "notes": "type=book generates the book-shaped wrapper instead. Changing the\nsingle kwarg switches the entire output structure. Each book-part\ncontains its own <meta> with <book-part-title>; no <book-part-meta>\nwrapper.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "related_plugins": [
      {
        "name": "enscribeArticleStructuring",
        "purpose": "When <meta type=article> (or <meta> with no type, defaulting to\narticle) is present, generates the <article> wrapper plus\n<article-front>/<article-body>/<article-back> regions; promotes\n<title>/<subtitle> in <meta> to <article-title>/<article-subtitle>;\nplaces <meta> inside <article-front>. See notes/specs/pipeline.md.\n",
      },
      {
        "name": "enscribeBookStructuring",
        "purpose": "When <meta type=book> or <meta type=book-part> is present (or\nvia shorthand expansions like <chapter>), generates the\n<book>/<book-part> wrapper. For books: also generates\n<book-front>/<book-body>/<book-back>. For book-parts: <meta> and\nbody content sit directly inside <book-part> with no nested region\nwrappers. See notes/specs/pipeline.md.\n",
      },
    ],
    "_sourceFile": "meta.md",
  });

const _minipage = Object.freeze({
    "semantic_role": "minipage",
    "category": "frameables",
    "html_output": {
      "element": "minipage",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "title": {
          "handled_by": "handler",
          "notes": "Optional title rendered at the top of the minipage (the frameable\ntitle-top convention). Authored as a title= kwarg. Because the body\nis opaque (a sealed sub-document), the kwarg stays a kwarg — it is not\nlifted to a <title> child tag the way it is for prose frameables; a\n<title> written inside the pipe would be part of the sealed body, not\nthe box's outward title. Same opaque-frameable convention as\n<svg>/<table>/<csv>.\n",
        },
        "caption": {
          "handled_by": "handler",
          "notes": "Optional caption rendered at the bottom of the minipage (the frameable\ncaption-bottom convention), with the \"Minipage N.\" label folded in when\nnumbered. Authored as a caption= kwarg (kwarg-only, for the same\nopaque-body reason as title).\n",
        },
      },
      "booleans": {
        "numbered": {
          "handled_by": "handler",
          "default": true,
          "notes": "Whether this minipage is numbered. **On by default** (#272: floats are\nnumbered by default; use -numbered for a layout-only box). A numbered\nminipage counts in its OWN \"Minipage N\" series (the `minipage` counter,\nconfig key number-minipages, ref-prefix `mp`) — NOT the figure counter.\nA sealed sub-document is distinct from a figure, and its private body\nnumbering must not touch the document's figure sequence (#115).\n",
        },
        "border": {
          "handled_by": "handler",
          "default": true,
          "notes": "The frameable surface. **On by default for minipage** — the visual box\nis the point (a minipage sets its sealed content apart, like <frame>).\nUse -border to suppress the outline and keep only the seal. border=<name>\nselects a named look (accent / thick / dashed / subtle) and implies the\nborder on (#58; see frameable.md).\n",
        },
      },
    },
    "content": {
      "becomes": "sealed-subdocument",
      "notes": "The pipe content is the minipage's body — a SEALED sub-document. It is held\nopaque (the raw source string) at parse time, so the main pipeline never\ndescends into it: the body's floats do not consume document counters, its\nlabels never enter the document registry, and its footnotes do not bubble to\nthe document. The body is processed in its OWN pipeline run with its OWN\nregistry (the deferred phase), producing resolved Layer 1 that is spliced\ninto the <figure> shell. Recursive content parsing applies INSIDE that\nsealed run, so the full enscribe vocabulary works in the body — including a\nnested <minipage>. External pulls (@src / <data>) are disallowed inside a\nminipage (a visible error, not a silent drop).\n",
    },
    "content_handler": "opaque",
    "jats_counterpart": {
      "element": "boxed-text",
      "attributes": {},
      "notes": "JATS <boxed-text> is the closest counterpart — a generic boxed, set-apart\ncontent block — matching <frame>. A numbered minipage wraps in <fig> at\nexport. The sealed body's resolved Layer 1 is the boxed-text content.\n",
    },
    "shorthand_examples": [
      {
        "source": "<minipage | Two panels side by side.>",
        "layer1_html": "<figure class=\"frameable-border\"><p>Two panels side by side.</p><figcaption><span class=\"minipage-label\">Minipage 1.</span></figcaption></figure>",
        "notes": "The simplest case. The handler emits a <figure> wrapper (the vocab\nhtml_output.element `minipage` is only the lookup key for handler-strategy\nentries — the handler controls the actual element). +border is default on\nfor <minipage>, so the class appears automatically. The body renders as\nsealed Layer 1.\n",
      },
      {
        "source": "<minipage #mp:compare caption=\"Side-by-side comparison\" |\nA figure here counts privately.\n\n<fig #fig:left src=\"left.png\" | Left panel.>\n<fig #fig:right src=\"right.png\" | Right panel.>\n>\n",
        "layer1_html": "<figure class=\"frameable-border\" id=\"mp:compare\"><p>A figure here counts privately.</p><figure id=\"mp-compare-fig:left\"><img alt=\"Left panel.\" src=\"left.png\"><figcaption><span class=\"figure-label\">Figure 1.</span><p>Left panel.</p></figcaption></figure><figure id=\"mp-compare-fig:right\"><img alt=\"Right panel.\" src=\"right.png\"><figcaption><span class=\"figure-label\">Figure 2.</span><p>Right panel.</p></figcaption></figure><figcaption><span class=\"minipage-label\">Minipage 1.</span> Side-by-side comparison</figcaption></figure>",
        "notes": "Numbered by default (#272). It counts in its own\n\"Minipage N\" series — `<ref @mp:compare>` resolves to \"minipage 1\". The two\ninner figures number 1 and 2 in the minipage's PRIVATE figure counter, NOT\nthe document's: a document <fig> elsewhere is unaffected, and an outside\n`<ref @fig:left>` is a normal not-found ref-error (the seal forbids inbound\nreferences to the body).\n",
      },
    ],
    "interpreter_strategy": "handler",
    "handler_module": "./handlers/minipage.js",
    "handler_responsibilities": [
      "Emit the <minipage> wrapper element (a custom element rendered as <figure>; not HTML-native).",
      "Apply `frameable-border` class by default (border flag default true).",
      "Render optional title at the top and optional caption (with \"Minipage N.\" label prefix if numbered) at the bottom.",
      "Splice the sealed body's resolved Layer 1 (produced by the deferred phase) as the figure body.",
    ],
    "_sourceFile": "minipage.md",
  });

const _name = Object.freeze({
    "semantic_role": "name",
    "category": "metadata",
    "html_output": {
      "element": "name",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
      "notes": "The author's name as a single string (e.g. \"Jane Goodall\"). No\nsurname/given-name decomposition at Layer 1 — the value passes\nthrough verbatim. The JATS exporter is the boundary that splits\na Western-style name into <surname>/<given-names> if required by\nthe target JATS schema; cultures with non-Western name ordering\n(surname-first, mononym) are preserved as-is at Layer 1 and\ntreated specially at export.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "string-name",
      "notes": "JATS uses <string-name> inside <name> as the \"unparsed name\"\nform — the full name string when the document does not commit to\na surname/given-names split. JATS's structured <name> wraps\n<surname>/<given-names>; <string-name> is the unparsed sibling.\nEnscribe's <name> matches <string-name> directly because Layer 1\npreserves the author-written form without imposing a name-model.\nThe exporter chooses between emitting <string-name> verbatim or\nparsing it into <surname>/<given-names> per the target schema's\nrequirements.\n",
    },
    "shorthand_examples": [
      {
        "source": "<author>\n  <name | Jane Goodall>\n</author>\n",
        "layer1_html": "<author>\n  <name>Jane Goodall</name>\n</author>\n",
        "notes": "The common case. Pipe content becomes the name string.\n",
      },
      {
        "source": "<author name=\"Jane Goodall\" orcid=\"0000-0001-2345-6789\" +corresponding>",
        "layer1_html": "<author corresponding>\n  <name>Jane Goodall</name>\n  <orcid>0000-0001-2345-6789</orcid>\n</author>\n",
        "notes": "Kwarg form of <author>. The `name` kwarg lifts to a <name> child\ntag at the normalize-to-canonical gate, parallel to <meta>'s\nkwarg-to-child-tag lift. The `+corresponding` boolean stays as\na kwarg/attribute on the canonical Layer 1 <author> (it is a\nscalar marker, not a structured field).\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "name.md",
  });

const _nav_group = Object.freeze({
    "semantic_role": "navigation-group",
    "category": "navigation",
    "html_output": {
      "element": "nav-group",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "title": {
          "maps_to": {
            "html": "data-title",
          },
          "notes": "The group's display label — its heading in the top bar (a dropdown) and the\nsidebar (an expandable node). Supplied as a kwarg, NOT a pipe: a `<nav-group>`\nis a long-form container (neither `|` nor `/`), so the label cannot ride the\npipe slot the way a page's title does.\n",
        },
      },
    },
    "content": {
      "shape": [
        {
          "element": "item",
          "required": false,
          "contains": [
            "item",
            "nav-group",
          ],
        },
      ],
    },
    "content_handler": "default",
    "interpreter_strategy": "schema",
    "related_plugins": [
      {
        "name": "enscribeWebsiteStructuring",
        "runs_before": "enscribeInterpreter",
        "purpose": "Recurses this group into the nav model (#246).",
      },
    ],
    "_sourceFile": "nav-group.md",
  });

const _nav = Object.freeze({
    "semantic_role": "navigation",
    "category": "navigation",
    "html_output": {
      "element": "nav",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": [
        {
          "element": "item",
          "required": false,
          "contains": [
            "item",
            "nav-group",
          ],
        },
        {
          "element": "nav-group",
          "required": false,
          "contains": [
            "item",
            "nav-group",
          ],
        },
      ],
    },
    "content_handler": "default",
    "interpreter_strategy": "schema",
    "related_plugins": [
      {
        "name": "enscribeWebsiteStructuring",
        "runs_before": "enscribeInterpreter",
        "purpose": "Builds the website nav model on file.data from this tree (#246). See notes/specs/master-document.md §\"Website structure\".",
      },
    ],
    "_sourceFile": "nav.md",
  });

const _note_list = Object.freeze({
    "semantic_role": "note-list",
    "category": "block-prose",
    "authoring": "output-only",
    "html_output": {
      "element": "note-list",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "type": {
          "maps_to": {
            "html": "data-note-list-type",
          },
          "values": [
            "end-notes",
            "chapter-notes",
            "footnotes-collected",
            "other",
          ],
          "default": "end-notes",
        },
      },
    },
    "content": {
      "shape": [
        {
          "element": "note",
          "required": false,
          "multiple": true,
          "notes": "Notes are typically not authored directly inside <note-list>.\nThey are placed there by the enscribeNotePlacement plugin\nbased on each note's placement (end/foot) and the document's\nnote-scope.\n",
        },
      ],
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "fn-group",
      "notes": "JATS uses <fn-group> as the container for collected footnotes.\nThe mapping is direct.\n",
    },
    "interpreter_strategy": "schema",
    "generated_by": [
      {
        "plugin": "enscribeNotePlacement",
        "when": "The document has notes with a collecting placement (end/foot).\nnote-scope chooses the unit: \"document\" places one <note-list> in\nthe back-matter, \"chapter\" one at the end of each chapter/book-part,\n\"section\" one per section.\n",
      },
    ],
    "_sourceFile": "note-list.md",
  });

const _note = Object.freeze({
    "semantic_role": "note",
    "category": "block-prose",
    "html_output": {
      "element": "note",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
        "notes": "Auto-generated when not specified. Used as the target for cross-references\nand as the basis for note numbering.\n",
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "placement": {
          "maps_to": {
            "html": "data-note-placement",
          },
          "values": [
            "end",
            "foot",
            "side",
          ],
          "default": "end",
          "notes": "Determines where the note content is collected. \"end\" collects at\narticle-back; \"foot\" collects at article-back (distinguished from \"end\"\nby CSS class on the note-list); \"side\" renders the content\ninline-adjacent to the marker. Document-wide default is \"end\".\n",
        },
        "position": {
          "maps_to": {
            "html": "data-note-placement",
          },
          "values": [
            "end",
            "foot",
            "side",
          ],
          "notes": "Legacy alias for \"placement\" (same values, same data-note-placement\noutput). Retained for backwards compatibility; \"placement\" is preferred\nfor new documents.\n",
        },
        "type": {
          "maps_to": {
            "html": "data-note-type",
          },
          "values": [
            "substantive",
            "technical",
            "editorial",
            "translator",
            "other",
          ],
          "default": "substantive",
          "notes": "Optional classification. Most notes are substantive (authorial commentary).\n",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "block",
        ],
      },
      "becomes": "children",
    },
    "content_handler": "default",
    "interpreter_strategy": "schema",
    "jats_counterpart": {
      "element": "fn",
      "notes": "JATS uses <fn> for substantive footnotes regardless of position.\nThe placement (foot of page, end of document, end of chapter) is\na rendering decision, not a structural one.\n",
    },
    "shorthand_examples": [
      {
        "source": "Some text<note | A substantive note about the text.>.",
        "layer1_html": "<style>.tippy-box[data-animation=fade][data-state=hidden]{opacity:0}[data-tippy-root]{max-width:calc(100vw - 10px)}.tippy-box{position:relative;background-color:#333;color:#fff;border-radius:4px;font-size:14px;line-height:1.4;white-space:normal;outline:0;transition-property:transform,visibility,opacity}.tippy-box[data-placement^=top]>.tippy-arrow{bottom:0}.tippy-box[data-placement^=top]>.tippy-arrow:before{bottom:-7px;left:0;border-width:8px 8px 0;border-top-color:initial;transform-origin:center top}.tippy-box[data-placement^=bottom]>.tippy-arrow{top:0}.tippy-box[data-placement^=bottom]>.tippy-arrow:before{top:-7px;left:0;border-width:0 8px 8px;border-bottom-color:initial;transform-origin:center bottom}.tippy-box[data-placement^=left]>.tippy-arrow{right:0}.tippy-box[data-placement^=left]>.tippy-arrow:before{border-width:8px 0 8px 8px;border-left-color:initial;right:-7px;transform-origin:center left}.tippy-box[data-placement^=right]>.tippy-arrow{left:0}.tippy-box[data-placement^=right]>.tippy-arrow:before{left:-7px;border-width:8px 8px 8px 0;border-right-color:initial;transform-origin:center right}.tippy-box[data-inertia][data-state=visible]{transition-timing-function:cubic-bezier(.54,1.5,.38,1.11)}.tippy-arrow{width:16px;height:16px;color:#333}.tippy-arrow:before{content:\"\";position:absolute;border-color:transparent;border-style:solid}.tippy-content{position:relative;padding:5px 9px;z-index:1} .tippy-box[data-theme~=light-border]{background-color:#fff;background-clip:padding-box;border:1px solid rgba(0,8,16,.15);color:#333;box-shadow:0 4px 14px -2px rgba(0,8,16,.08)}.tippy-box[data-theme~=light-border]>.tippy-backdrop{background-color:#fff}.tippy-box[data-theme~=light-border]>.tippy-arrow:after,.tippy-box[data-theme~=light-border]>.tippy-svg-arrow:after{content:\"\";position:absolute;z-index:-1}.tippy-box[data-theme~=light-border]>.tippy-arrow:after{border-color:transparent;border-style:solid}.tippy-box[data-theme~=light-border][data-placement^=top]>.tippy-arrow:before{border-top-color:#fff}.tippy-box[data-theme~=light-border][data-placement^=top]>.tippy-arrow:after{border-top-color:rgba(0,8,16,.2);border-width:7px 7px 0;top:17px;left:1px}.tippy-box[data-theme~=light-border][data-placement^=top]>.tippy-svg-arrow>svg{top:16px}.tippy-box[data-theme~=light-border][data-placement^=top]>.tippy-svg-arrow:after{top:17px}.tippy-box[data-theme~=light-border][data-placement^=bottom]>.tippy-arrow:before{border-bottom-color:#fff;bottom:16px}.tippy-box[data-theme~=light-border][data-placement^=bottom]>.tippy-arrow:after{border-bottom-color:rgba(0,8,16,.2);border-width:0 7px 7px;bottom:17px;left:1px}.tippy-box[data-theme~=light-border][data-placement^=bottom]>.tippy-svg-arrow>svg{bottom:16px}.tippy-box[data-theme~=light-border][data-placement^=bottom]>.tippy-svg-arrow:after{bottom:17px}.tippy-box[data-theme~=light-border][data-placement^=left]>.tippy-arrow:before{border-left-color:#fff}.tippy-box[data-theme~=light-border][data-placement^=left]>.tippy-arrow:after{border-left-color:rgba(0,8,16,.2);border-width:7px 0 7px 7px;left:17px;top:1px}.tippy-box[data-theme~=light-border][data-placement^=left]>.tippy-svg-arrow>svg{left:11px}.tippy-box[data-theme~=light-border][data-placement^=left]>.tippy-svg-arrow:after{left:12px}.tippy-box[data-theme~=light-border][data-placement^=right]>.tippy-arrow:before{border-right-color:#fff;right:16px}.tippy-box[data-theme~=light-border][data-placement^=right]>.tippy-arrow:after{border-width:7px 7px 7px 0;right:17px;top:1px;border-right-color:rgba(0,8,16,.2)}.tippy-box[data-theme~=light-border][data-placement^=right]>.tippy-svg-arrow>svg{right:11px}.tippy-box[data-theme~=light-border][data-placement^=right]>.tippy-svg-arrow:after{right:12px}.tippy-box[data-theme~=light-border]>.tippy-svg-arrow{fill:#fff}.tippy-box[data-theme~=light-border]>.tippy-svg-arrow:after{background-image:url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMCA2czEuNzk2LS4wMTMgNC42Ny0zLjYxNUM1Ljg1MS45IDYuOTMuMDA2IDggMGMxLjA3LS4wMDYgMi4xNDguODg3IDMuMzQzIDIuMzg1QzE0LjIzMyA2LjAwNSAxNiA2IDE2IDZIMHoiIGZpbGw9InJnYmEoMCwgOCwgMTYsIDAuMikiLz48L3N2Zz4=);background-size:16px 6px;width:16px;height:6px} /* Sidenote fallback: collected-to-end items authored as placement=side. * Future margin-positioning themes can detect this class and reposition. */ .sidenote-fallback { font-style: italic; } /* Note list: suppress default <ol>numbering since <sup>N</sup> provides it. */ note-list ol { list-style: none; padding-left: 0; margin: 0; } note-list li { margin-bottom: 0.5em; } /* Figure tooltips: constrain image and caption within the tooltip box. */ .tippy-box figure { margin: 0; } .tippy-box figure img { max-width: 100%; height: auto; display: block; } .tippy-box figure figcaption { font-size: 0.9em; margin-top: 0.5em; color: #555; } /* Table tooltips: compact styling with border grid; overflow-x for wide tables. */ .tippy-content { overflow-x: auto; } .tippy-box table { border-collapse: collapse; width: 100%; font-size: 0.9em; margin: 0; } .tippy-box table th, .tippy-box table td { border: 1px solid #ccc; padding: 0.3em 0.6em; text-align: left; } .tippy-box table caption { font-size: 0.9em; margin-bottom: 0.4em; text-align: left; color: #444; } </style><script>/** * @popperjs/core v2.11.8 - MIT License */ !function(e,t){\"object\"==typeof exports&&\"undefined\"!=typeof module?t(exports):\"function\"==typeof define&&define.amd?define([\"exports\"],t):t((e=\"undefined\"!=typeof globalThis?globalThis:e||self).Popper={})}(this,(function(e){\"use strict\";function t(e){if(null==e)return window;if(\"[object Window]\"!==e.toString()){var t=e.ownerDocument;return t&&t.defaultView||window}return e}function n(e){return e instanceof t(e).Element||e instanceof Element}function r(e){return e instanceof t(e).HTMLElement||e instanceof HTMLElement}function o(e){return\"undefined\"!=typeof ShadowRoot&&(e instanceof t(e).ShadowRoot||e instanceof ShadowRoot)}var i=Math.max,a=Math.min,s=Math.round;function f(){var e=navigator.userAgentData;return null!=e&&e.brands&&Array.isArray(e.brands)?e.brands.map((function(e){return e.brand+\"/\"+e.version})).join(\" \"):navigator.userAgent}function c(){return!/^((?!chrome|android).)*safari/i.test(f())}function p(e,o,i){void 0===o&&(o=!1),void 0===i&&(i=!1);var a=e.getBoundingClientRect(),f=1,p=1;o&&r(e)&&(f=e.offsetWidth>0&&s(a.width)/e.offsetWidth||1,p=e.offsetHeight>0&&s(a.height)/e.offsetHeight||1);var u=(n(e)?t(e):window).visualViewport,l=!c()&&i,d=(a.left+(l&&u?u.offsetLeft:0))/f,h=(a.top+(l&&u?u.offsetTop:0))/p,m=a.width/f,v=a.height/p;return{width:m,height:v,top:h,right:d+m,bottom:h+v,left:d,x:d,y:h}}function u(e){var n=t(e);return{scrollLeft:n.pageXOffset,scrollTop:n.pageYOffset}}function l(e){return e?(e.nodeName||\"\").toLowerCase():null}function d(e){return((n(e)?e.ownerDocument:e.document)||window.document).documentElement}function h(e){return p(d(e)).left+u(e).scrollLeft}function m(e){return t(e).getComputedStyle(e)}function v(e){var t=m(e),n=t.overflow,r=t.overflowX,o=t.overflowY;return/auto|scroll|overlay|hidden/.test(n+o+r)}function y(e,n,o){void 0===o&&(o=!1);var i,a,f=r(n),c=r(n)&&function(e){var t=e.getBoundingClientRect(),n=s(t.width)/e.offsetWidth||1,r=s(t.height)/e.offsetHeight||1;return 1!==n||1!==r}(n),m=d(n),y=p(e,c,o),g={scrollLeft:0,scrollTop:0},b={x:0,y:0};return(f||!f&&!o)&&((\"body\"!==l(n)||v(m))&&(g=(i=n)!==t(i)&&r(i)?{scrollLeft:(a=i).scrollLeft,scrollTop:a.scrollTop}:u(i)),r(n)?((b=p(n,!0)).x+=n.clientLeft,b.y+=n.clientTop):m&&(b.x=h(m))),{x:y.left+g.scrollLeft-b.x,y:y.top+g.scrollTop-b.y,width:y.width,height:y.height}}function g(e){var t=p(e),n=e.offsetWidth,r=e.offsetHeight;return Math.abs(t.width-n)<=1&&(n=t.width),Math.abs(t.height-r)<=1&&(r=t.height),{x:e.offsetLeft,y:e.offsetTop,width:n,height:r}}function b(e){return\"html\"===l(e)?e:e.assignedSlot||e.parentNode||(o(e)?e.host:null)||d(e)}function x(e){return[\"html\",\"body\",\"#document\"].indexOf(l(e))>=0?e.ownerDocument.body:r(e)&&v(e)?e:x(b(e))}function w(e,n){var r;void 0===n&&(n=[]);var o=x(e),i=o===(null==(r=e.ownerDocument)?void 0:r.body),a=t(o),s=i?[a].concat(a.visualViewport||[],v(o)?o:[]):o,f=n.concat(s);return i?f:f.concat(w(b(s)))}function O(e){return[\"table\",\"td\",\"th\"].indexOf(l(e))>=0}function j(e){return r(e)&&\"fixed\"!==m(e).position?e.offsetParent:null}function E(e){for(var n=t(e),i=j(e);i&&O(i)&&\"static\"===m(i).position;)i=j(i);return i&&(\"html\"===l(i)||\"body\"===l(i)&&\"static\"===m(i).position)?n:i||function(e){var t=/firefox/i.test(f());if(/Trident/i.test(f())&&r(e)&&\"fixed\"===m(e).position)return null;var n=b(e);for(o(n)&&(n=n.host);r(n)&&[\"html\",\"body\"].indexOf(l(n))<0;){var i=m(n);if(\"none\"!==i.transform||\"none\"!==i.perspective||\"paint\"===i.contain||-1!==[\"transform\",\"perspective\"].indexOf(i.willChange)||t&&\"filter\"===i.willChange||t&&i.filter&&\"none\"!==i.filter)return n;n=n.parentNode}return null}(e)||n}var D=\"top\",A=\"bottom\",L=\"right\",P=\"left\",M=\"auto\",k=[D,A,L,P],W=\"start\",B=\"end\",H=\"viewport\",T=\"popper\",R=k.reduce((function(e,t){return e.concat([t+\"-\"+W,t+\"-\"+B])}),[]),S=[].concat(k,[M]).reduce((function(e,t){return e.concat([t,t+\"-\"+W,t+\"-\"+B])}),[]),V=[\"beforeRead\",\"read\",\"afterRead\",\"beforeMain\",\"main\",\"afterMain\",\"beforeWrite\",\"write\",\"afterWrite\"];function q(e){var t=new Map,n=new Set,r=[];function o(e){n.add(e.name),[].concat(e.requires||[],e.requiresIfExists||[]).forEach((function(e){if(!n.has(e)){var r=t.get(e);r&&o(r)}})),r.push(e)}return e.forEach((function(e){t.set(e.name,e)})),e.forEach((function(e){n.has(e.name)||o(e)})),r}function C(e,t){var n=t.getRootNode&&t.getRootNode();if(e.contains(t))return!0;if(n&&o(n)){var r=t;do{if(r&&e.isSameNode(r))return!0;r=r.parentNode||r.host}while(r)}return!1}function N(e){return Object.assign({},e,{left:e.x,top:e.y,right:e.x+e.width,bottom:e.y+e.height})}function I(e,r,o){return r===H?N(function(e,n){var r=t(e),o=d(e),i=r.visualViewport,a=o.clientWidth,s=o.clientHeight,f=0,p=0;if(i){a=i.width,s=i.height;var u=c();(u||!u&&\"fixed\"===n)&&(f=i.offsetLeft,p=i.offsetTop)}return{width:a,height:s,x:f+h(e),y:p}}(e,o)):n(r)?function(e,t){var n=p(e,!1,\"fixed\"===t);return n.top=n.top+e.clientTop,n.left=n.left+e.clientLeft,n.bottom=n.top+e.clientHeight,n.right=n.left+e.clientWidth,n.width=e.clientWidth,n.height=e.clientHeight,n.x=n.left,n.y=n.top,n}(r,o):N(function(e){var t,n=d(e),r=u(e),o=null==(t=e.ownerDocument)?void 0:t.body,a=i(n.scrollWidth,n.clientWidth,o?o.scrollWidth:0,o?o.clientWidth:0),s=i(n.scrollHeight,n.clientHeight,o?o.scrollHeight:0,o?o.clientHeight:0),f=-r.scrollLeft+h(e),c=-r.scrollTop;return\"rtl\"===m(o||n).direction&&(f+=i(n.clientWidth,o?o.clientWidth:0)-a),{width:a,height:s,x:f,y:c}}(d(e)))}function _(e,t,o,s){var f=\"clippingParents\"===t?function(e){var t=w(b(e)),o=[\"absolute\",\"fixed\"].indexOf(m(e).position)>=0&&r(e)?E(e):e;return n(o)?t.filter((function(e){return n(e)&&C(e,o)&&\"body\"!==l(e)})):[]}(e):[].concat(t),c=[].concat(f,[o]),p=c[0],u=c.reduce((function(t,n){var r=I(e,n,s);return t.top=i(r.top,t.top),t.right=a(r.right,t.right),t.bottom=a(r.bottom,t.bottom),t.left=i(r.left,t.left),t}),I(e,p,s));return u.width=u.right-u.left,u.height=u.bottom-u.top,u.x=u.left,u.y=u.top,u}function F(e){return e.split(\"-\")[0]}function U(e){return e.split(\"-\")[1]}function z(e){return[\"top\",\"bottom\"].indexOf(e)>=0?\"x\":\"y\"}function X(e){var t,n=e.reference,r=e.element,o=e.placement,i=o?F(o):null,a=o?U(o):null,s=n.x+n.width/2-r.width/2,f=n.y+n.height/2-r.height/2;switch(i){case D:t={x:s,y:n.y-r.height};break;case A:t={x:s,y:n.y+n.height};break;case L:t={x:n.x+n.width,y:f};break;case P:t={x:n.x-r.width,y:f};break;default:t={x:n.x,y:n.y}}var c=i?z(i):null;if(null!=c){var p=\"y\"===c?\"height\":\"width\";switch(a){case W:t[c]=t[c]-(n[p]/2-r[p]/2);break;case B:t[c]=t[c]+(n[p]/2-r[p]/2)}}return t}function Y(e){return Object.assign({},{top:0,right:0,bottom:0,left:0},e)}function G(e,t){return t.reduce((function(t,n){return t[n]=e,t}),{})}function J(e,t){void 0===t&&(t={});var r=t,o=r.placement,i=void 0===o?e.placement:o,a=r.strategy,s=void 0===a?e.strategy:a,f=r.boundary,c=void 0===f?\"clippingParents\":f,u=r.rootBoundary,l=void 0===u?H:u,h=r.elementContext,m=void 0===h?T:h,v=r.altBoundary,y=void 0!==v&&v,g=r.padding,b=void 0===g?0:g,x=Y(\"number\"!=typeof b?b:G(b,k)),w=m===T?\"reference\":T,O=e.rects.popper,j=e.elements[y?w:m],E=_(n(j)?j:j.contextElement||d(e.elements.popper),c,l,s),P=p(e.elements.reference),M=X({reference:P,element:O,strategy:\"absolute\",placement:i}),W=N(Object.assign({},O,M)),B=m===T?W:P,R={top:E.top-B.top+x.top,bottom:B.bottom-E.bottom+x.bottom,left:E.left-B.left+x.left,right:B.right-E.right+x.right},S=e.modifiersData.offset;if(m===T&&S){var V=S[i];Object.keys(R).forEach((function(e){var t=[L,A].indexOf(e)>=0?1:-1,n=[D,A].indexOf(e)>=0?\"y\":\"x\";R[e]+=V[n]*t}))}return R}var K={placement:\"bottom\",modifiers:[],strategy:\"absolute\"};function Q(){for(var e=arguments.length,t=new Array(e),n=0;n<e;n++)t[n]=arguments[n];return!t.some((function(e){return!(e&&\"function\"==typeof e.getBoundingClientRect)}))}function Z(e){void 0===e&&(e={});var t=e,r=t.defaultModifiers,o=void 0===r?[]:r,i=t.defaultOptions,a=void 0===i?K:i;return function(e,t,r){void 0===r&&(r=a);var i,s,f={placement:\"bottom\",orderedModifiers:[],options:Object.assign({},K,a),modifiersData:{},elements:{reference:e,popper:t},attributes:{},styles:{}},c=[],p=!1,u={state:f,setOptions:function(r){var i=\"function\"==typeof r?r(f.options):r;l(),f.options=Object.assign({},a,f.options,i),f.scrollParents={reference:n(e)?w(e):e.contextElement?w(e.contextElement):[],popper:w(t)};var s,p,d=function(e){var t=q(e);return V.reduce((function(e,n){return e.concat(t.filter((function(e){return e.phase===n})))}),[])}((s=[].concat(o,f.options.modifiers),p=s.reduce((function(e,t){var n=e[t.name];return e[t.name]=n?Object.assign({},n,t,{options:Object.assign({},n.options,t.options),data:Object.assign({},n.data,t.data)}):t,e}),{}),Object.keys(p).map((function(e){return p[e]}))));return f.orderedModifiers=d.filter((function(e){return e.enabled})),f.orderedModifiers.forEach((function(e){var t=e.name,n=e.options,r=void 0===n?{}:n,o=e.effect;if(\"function\"==typeof o){var i=o({state:f,name:t,instance:u,options:r}),a=function(){};c.push(i||a)}})),u.update()},forceUpdate:function(){if(!p){var e=f.elements,t=e.reference,n=e.popper;if(Q(t,n)){f.rects={reference:y(t,E(n),\"fixed\"===f.options.strategy),popper:g(n)},f.reset=!1,f.placement=f.options.placement,f.orderedModifiers.forEach((function(e){return f.modifiersData[e.name]=Object.assign({},e.data)}));for(var r=0;r<f.orderedModifiers.length;r++)if(!0!==f.reset){var o=f.orderedModifiers[r],i=o.fn,a=o.options,s=void 0===a?{}:a,c=o.name;\"function\"==typeof i&&(f=i({state:f,options:s,name:c,instance:u})||f)}else f.reset=!1,r=-1}}},update:(i=function(){return new Promise((function(e){u.forceUpdate(),e(f)}))},function(){return s||(s=new Promise((function(e){Promise.resolve().then((function(){s=void 0,e(i())}))}))),s}),destroy:function(){l(),p=!0}};if(!Q(e,t))return u;function l(){c.forEach((function(e){return e()})),c=[]}return u.setOptions(r).then((function(e){!p&&r.onFirstUpdate&&r.onFirstUpdate(e)})),u}}var $={passive:!0};var ee={name:\"eventListeners\",enabled:!0,phase:\"write\",fn:function(){},effect:function(e){var n=e.state,r=e.instance,o=e.options,i=o.scroll,a=void 0===i||i,s=o.resize,f=void 0===s||s,c=t(n.elements.popper),p=[].concat(n.scrollParents.reference,n.scrollParents.popper);return a&&p.forEach((function(e){e.addEventListener(\"scroll\",r.update,$)})),f&&c.addEventListener(\"resize\",r.update,$),function(){a&&p.forEach((function(e){e.removeEventListener(\"scroll\",r.update,$)})),f&&c.removeEventListener(\"resize\",r.update,$)}},data:{}};var te={name:\"popperOffsets\",enabled:!0,phase:\"read\",fn:function(e){var t=e.state,n=e.name;t.modifiersData[n]=X({reference:t.rects.reference,element:t.rects.popper,strategy:\"absolute\",placement:t.placement})},data:{}},ne={top:\"auto\",right:\"auto\",bottom:\"auto\",left:\"auto\"};function re(e){var n,r=e.popper,o=e.popperRect,i=e.placement,a=e.variation,f=e.offsets,c=e.position,p=e.gpuAcceleration,u=e.adaptive,l=e.roundOffsets,h=e.isFixed,v=f.x,y=void 0===v?0:v,g=f.y,b=void 0===g?0:g,x=\"function\"==typeof l?l({x:y,y:b}):{x:y,y:b};y=x.x,b=x.y;var w=f.hasOwnProperty(\"x\"),O=f.hasOwnProperty(\"y\"),j=P,M=D,k=window;if(u){var W=E(r),H=\"clientHeight\",T=\"clientWidth\";if(W===t(r)&&\"static\"!==m(W=d(r)).position&&\"absolute\"===c&&(H=\"scrollHeight\",T=\"scrollWidth\"),W=W,i===D||(i===P||i===L)&&a===B)M=A,b-=(h&&W===k&&k.visualViewport?k.visualViewport.height:W[H])-o.height,b*=p?1:-1;if(i===P||(i===D||i===A)&&a===B)j=L,y-=(h&&W===k&&k.visualViewport?k.visualViewport.width:W[T])-o.width,y*=p?1:-1}var R,S=Object.assign({position:c},u&&ne),V=!0===l?function(e,t){var n=e.x,r=e.y,o=t.devicePixelRatio||1;return{x:s(n*o)/o||0,y:s(r*o)/o||0}}({x:y,y:b},t(r)):{x:y,y:b};return y=V.x,b=V.y,p?Object.assign({},S,((R={})[M]=O?\"0\":\"\",R[j]=w?\"0\":\"\",R.transform=(k.devicePixelRatio||1)<=1?\"translate(\"+y+\"px, \"+b+\"px)\":\"translate3d(\"+y+\"px, \"+b+\"px, 0)\",R)):Object.assign({},S,((n={})[M]=O?b+\"px\":\"\",n[j]=w?y+\"px\":\"\",n.transform=\"\",n))}var oe={name:\"computeStyles\",enabled:!0,phase:\"beforeWrite\",fn:function(e){var t=e.state,n=e.options,r=n.gpuAcceleration,o=void 0===r||r,i=n.adaptive,a=void 0===i||i,s=n.roundOffsets,f=void 0===s||s,c={placement:F(t.placement),variation:U(t.placement),popper:t.elements.popper,popperRect:t.rects.popper,gpuAcceleration:o,isFixed:\"fixed\"===t.options.strategy};null!=t.modifiersData.popperOffsets&&(t.styles.popper=Object.assign({},t.styles.popper,re(Object.assign({},c,{offsets:t.modifiersData.popperOffsets,position:t.options.strategy,adaptive:a,roundOffsets:f})))),null!=t.modifiersData.arrow&&(t.styles.arrow=Object.assign({},t.styles.arrow,re(Object.assign({},c,{offsets:t.modifiersData.arrow,position:\"absolute\",adaptive:!1,roundOffsets:f})))),t.attributes.popper=Object.assign({},t.attributes.popper,{\"data-popper-placement\":t.placement})},data:{}};var ie={name:\"applyStyles\",enabled:!0,phase:\"write\",fn:function(e){var t=e.state;Object.keys(t.elements).forEach((function(e){var n=t.styles[e]||{},o=t.attributes[e]||{},i=t.elements[e];r(i)&&l(i)&&(Object.assign(i.style,n),Object.keys(o).forEach((function(e){var t=o[e];!1===t?i.removeAttribute(e):i.setAttribute(e,!0===t?\"\":t)})))}))},effect:function(e){var t=e.state,n={popper:{position:t.options.strategy,left:\"0\",top:\"0\",margin:\"0\"},arrow:{position:\"absolute\"},reference:{}};return Object.assign(t.elements.popper.style,n.popper),t.styles=n,t.elements.arrow&&Object.assign(t.elements.arrow.style,n.arrow),function(){Object.keys(t.elements).forEach((function(e){var o=t.elements[e],i=t.attributes[e]||{},a=Object.keys(t.styles.hasOwnProperty(e)?t.styles[e]:n[e]).reduce((function(e,t){return e[t]=\"\",e}),{});r(o)&&l(o)&&(Object.assign(o.style,a),Object.keys(i).forEach((function(e){o.removeAttribute(e)})))}))}},requires:[\"computeStyles\"]};var ae={name:\"offset\",enabled:!0,phase:\"main\",requires:[\"popperOffsets\"],fn:function(e){var t=e.state,n=e.options,r=e.name,o=n.offset,i=void 0===o?[0,0]:o,a=S.reduce((function(e,n){return e[n]=function(e,t,n){var r=F(e),o=[P,D].indexOf(r)>=0?-1:1,i=\"function\"==typeof n?n(Object.assign({},t,{placement:e})):n,a=i[0],s=i[1];return a=a||0,s=(s||0)*o,[P,L].indexOf(r)>=0?{x:s,y:a}:{x:a,y:s}}(n,t.rects,i),e}),{}),s=a[t.placement],f=s.x,c=s.y;null!=t.modifiersData.popperOffsets&&(t.modifiersData.popperOffsets.x+=f,t.modifiersData.popperOffsets.y+=c),t.modifiersData[r]=a}},se={left:\"right\",right:\"left\",bottom:\"top\",top:\"bottom\"};function fe(e){return e.replace(/left|right|bottom|top/g,(function(e){return se[e]}))}var ce={start:\"end\",end:\"start\"};function pe(e){return e.replace(/start|end/g,(function(e){return ce[e]}))}function ue(e,t){void 0===t&&(t={});var n=t,r=n.placement,o=n.boundary,i=n.rootBoundary,a=n.padding,s=n.flipVariations,f=n.allowedAutoPlacements,c=void 0===f?S:f,p=U(r),u=p?s?R:R.filter((function(e){return U(e)===p})):k,l=u.filter((function(e){return c.indexOf(e)>=0}));0===l.length&&(l=u);var d=l.reduce((function(t,n){return t[n]=J(e,{placement:n,boundary:o,rootBoundary:i,padding:a})[F(n)],t}),{});return Object.keys(d).sort((function(e,t){return d[e]-d[t]}))}var le={name:\"flip\",enabled:!0,phase:\"main\",fn:function(e){var t=e.state,n=e.options,r=e.name;if(!t.modifiersData[r]._skip){for(var o=n.mainAxis,i=void 0===o||o,a=n.altAxis,s=void 0===a||a,f=n.fallbackPlacements,c=n.padding,p=n.boundary,u=n.rootBoundary,l=n.altBoundary,d=n.flipVariations,h=void 0===d||d,m=n.allowedAutoPlacements,v=t.options.placement,y=F(v),g=f||(y===v||!h?[fe(v)]:function(e){if(F(e)===M)return[];var t=fe(e);return[pe(e),t,pe(t)]}(v)),b=[v].concat(g).reduce((function(e,n){return e.concat(F(n)===M?ue(t,{placement:n,boundary:p,rootBoundary:u,padding:c,flipVariations:h,allowedAutoPlacements:m}):n)}),[]),x=t.rects.reference,w=t.rects.popper,O=new Map,j=!0,E=b[0],k=0;k<b.length;k++){var B=b[k],H=F(B),T=U(B)===W,R=[D,A].indexOf(H)>=0,S=R?\"width\":\"height\",V=J(t,{placement:B,boundary:p,rootBoundary:u,altBoundary:l,padding:c}),q=R?T?L:P:T?A:D;x[S]>w[S]&&(q=fe(q));var C=fe(q),N=[];if(i&&N.push(V[H]<=0),s&&N.push(V[q]<=0,V[C]<=0),N.every((function(e){return e}))){E=B,j=!1;break}O.set(B,N)}if(j)for(var I=function(e){var t=b.find((function(t){var n=O.get(t);if(n)return n.slice(0,e).every((function(e){return e}))}));if(t)return E=t,\"break\"},_=h?3:1;_>0;_--){if(\"break\"===I(_))break}t.placement!==E&&(t.modifiersData[r]._skip=!0,t.placement=E,t.reset=!0)}},requiresIfExists:[\"offset\"],data:{_skip:!1}};function de(e,t,n){return i(e,a(t,n))}var he={name:\"preventOverflow\",enabled:!0,phase:\"main\",fn:function(e){var t=e.state,n=e.options,r=e.name,o=n.mainAxis,s=void 0===o||o,f=n.altAxis,c=void 0!==f&&f,p=n.boundary,u=n.rootBoundary,l=n.altBoundary,d=n.padding,h=n.tether,m=void 0===h||h,v=n.tetherOffset,y=void 0===v?0:v,b=J(t,{boundary:p,rootBoundary:u,padding:d,altBoundary:l}),x=F(t.placement),w=U(t.placement),O=!w,j=z(x),M=\"x\"===j?\"y\":\"x\",k=t.modifiersData.popperOffsets,B=t.rects.reference,H=t.rects.popper,T=\"function\"==typeof y?y(Object.assign({},t.rects,{placement:t.placement})):y,R=\"number\"==typeof T?{mainAxis:T,altAxis:T}:Object.assign({mainAxis:0,altAxis:0},T),S=t.modifiersData.offset?t.modifiersData.offset[t.placement]:null,V={x:0,y:0};if(k){if(s){var q,C=\"y\"===j?D:P,N=\"y\"===j?A:L,I=\"y\"===j?\"height\":\"width\",_=k[j],X=_+b[C],Y=_-b[N],G=m?-H[I]/2:0,K=w===W?B[I]:H[I],Q=w===W?-H[I]:-B[I],Z=t.elements.arrow,$=m&&Z?g(Z):{width:0,height:0},ee=t.modifiersData[\"arrow#persistent\"]?t.modifiersData[\"arrow#persistent\"].padding:{top:0,right:0,bottom:0,left:0},te=ee[C],ne=ee[N],re=de(0,B[I],$[I]),oe=O?B[I]/2-G-re-te-R.mainAxis:K-re-te-R.mainAxis,ie=O?-B[I]/2+G+re+ne+R.mainAxis:Q+re+ne+R.mainAxis,ae=t.elements.arrow&&E(t.elements.arrow),se=ae?\"y\"===j?ae.clientTop||0:ae.clientLeft||0:0,fe=null!=(q=null==S?void 0:S[j])?q:0,ce=_+ie-fe,pe=de(m?a(X,_+oe-fe-se):X,_,m?i(Y,ce):Y);k[j]=pe,V[j]=pe-_}if(c){var ue,le=\"x\"===j?D:P,he=\"x\"===j?A:L,me=k[M],ve=\"y\"===M?\"height\":\"width\",ye=me+b[le],ge=me-b[he],be=-1!==[D,P].indexOf(x),xe=null!=(ue=null==S?void 0:S[M])?ue:0,we=be?ye:me-B[ve]-H[ve]-xe+R.altAxis,Oe=be?me+B[ve]+H[ve]-xe-R.altAxis:ge,je=m&&be?function(e,t,n){var r=de(e,t,n);return r>n?n:r}(we,me,Oe):de(m?we:ye,me,m?Oe:ge);k[M]=je,V[M]=je-me}t.modifiersData[r]=V}},requiresIfExists:[\"offset\"]};var me={name:\"arrow\",enabled:!0,phase:\"main\",fn:function(e){var t,n=e.state,r=e.name,o=e.options,i=n.elements.arrow,a=n.modifiersData.popperOffsets,s=F(n.placement),f=z(s),c=[P,L].indexOf(s)>=0?\"height\":\"width\";if(i&&a){var p=function(e,t){return Y(\"number\"!=typeof(e=\"function\"==typeof e?e(Object.assign({},t.rects,{placement:t.placement})):e)?e:G(e,k))}(o.padding,n),u=g(i),l=\"y\"===f?D:P,d=\"y\"===f?A:L,h=n.rects.reference[c]+n.rects.reference[f]-a[f]-n.rects.popper[c],m=a[f]-n.rects.reference[f],v=E(i),y=v?\"y\"===f?v.clientHeight||0:v.clientWidth||0:0,b=h/2-m/2,x=p[l],w=y-u[c]-p[d],O=y/2-u[c]/2+b,j=de(x,O,w),M=f;n.modifiersData[r]=((t={})[M]=j,t.centerOffset=j-O,t)}},effect:function(e){var t=e.state,n=e.options.element,r=void 0===n?\"[data-popper-arrow]\":n;null!=r&&(\"string\"!=typeof r||(r=t.elements.popper.querySelector(r)))&&C(t.elements.popper,r)&&(t.elements.arrow=r)},requires:[\"popperOffsets\"],requiresIfExists:[\"preventOverflow\"]};function ve(e,t,n){return void 0===n&&(n={x:0,y:0}),{top:e.top-t.height-n.y,right:e.right-t.width+n.x,bottom:e.bottom-t.height+n.y,left:e.left-t.width-n.x}}function ye(e){return[D,L,A,P].some((function(t){return e[t]>=0}))}var ge={name:\"hide\",enabled:!0,phase:\"main\",requiresIfExists:[\"preventOverflow\"],fn:function(e){var t=e.state,n=e.name,r=t.rects.reference,o=t.rects.popper,i=t.modifiersData.preventOverflow,a=J(t,{elementContext:\"reference\"}),s=J(t,{altBoundary:!0}),f=ve(a,r),c=ve(s,o,i),p=ye(f),u=ye(c);t.modifiersData[n]={referenceClippingOffsets:f,popperEscapeOffsets:c,isReferenceHidden:p,hasPopperEscaped:u},t.attributes.popper=Object.assign({},t.attributes.popper,{\"data-popper-reference-hidden\":p,\"data-popper-escaped\":u})}},be=Z({defaultModifiers:[ee,te,oe,ie]}),xe=[ee,te,oe,ie,ae,le,he,me,ge],we=Z({defaultModifiers:xe});e.applyStyles=ie,e.arrow=me,e.computeStyles=oe,e.createPopper=we,e.createPopperLite=be,e.defaultModifiers=xe,e.detectOverflow=J,e.eventListeners=ee,e.flip=le,e.hide=ge,e.offset=ae,e.popperGenerator=Z,e.popperOffsets=te,e.preventOverflow=he,Object.defineProperty(e,\"__esModule\",{value:!0})})); !function(e,t){\"object\"==typeof exports&&\"undefined\"!=typeof module?module.exports=t(require(\"@popperjs/core\")):\"function\"==typeof define&&define.amd?define([\"@popperjs/core\"],t):(e=e||self).tippy=t(e.Popper)}(this,(function(e){\"use strict\";var t={passive:!0,capture:!0},n=function(){return document.body};function r(e,t,n){if(Array.isArray(e)){var r=e[t];return null==r?Array.isArray(n)?n[t]:n:r}return e}function o(e,t){var n={}.toString.call(e);return 0===n.indexOf(\"[object\")&&n.indexOf(t+\"]\")>-1}function i(e,t){return\"function\"==typeof e?e.apply(void 0,t):e}function a(e,t){return 0===t?e:function(r){clearTimeout(n),n=setTimeout((function(){e(r)}),t)};var n}function s(e,t){var n=Object.assign({},e);return t.forEach((function(e){delete n[e]})),n}function u(e){return[].concat(e)}function c(e,t){-1===e.indexOf(t)&&e.push(t)}function p(e){return e.split(\"-\")[0]}function f(e){return[].slice.call(e)}function l(e){return Object.keys(e).reduce((function(t,n){return void 0!==e[n]&&(t[n]=e[n]),t}),{})}function d(){return document.createElement(\"div\")}function v(e){return[\"Element\",\"Fragment\"].some((function(t){return o(e,t)}))}function m(e){return o(e,\"MouseEvent\")}function g(e){return!(!e||!e._tippy||e._tippy.reference!==e)}function h(e){return v(e)?[e]:function(e){return o(e,\"NodeList\")}(e)?f(e):Array.isArray(e)?e:f(document.querySelectorAll(e))}function b(e,t){e.forEach((function(e){e&&(e.style.transitionDuration=t+\"ms\")}))}function y(e,t){e.forEach((function(e){e&&e.setAttribute(\"data-state\",t)}))}function w(e){var t,n=u(e)[0];return null!=n&&null!=(t=n.ownerDocument)&&t.body?n.ownerDocument:document}function E(e,t,n){var r=t+\"EventListener\";[\"transitionend\",\"webkitTransitionEnd\"].forEach((function(t){e[r](t,n)}))}function O(e,t){for(var n=t;n;){var r;if(e.contains(n))return!0;n=null==n.getRootNode||null==(r=n.getRootNode())?void 0:r.host}return!1}var x={isTouch:!1},C=0;function T(){x.isTouch||(x.isTouch=!0,window.performance&&document.addEventListener(\"mousemove\",A))}function A(){var e=performance.now();e-C<20&&(x.isTouch=!1,document.removeEventListener(\"mousemove\",A)),C=e}function L(){var e=document.activeElement;if(g(e)){var t=e._tippy;e.blur&&!t.state.isVisible&&e.blur()}}var D=!!(\"undefined\"!=typeof window&&\"undefined\"!=typeof document)&&!!window.msCrypto,R=Object.assign({appendTo:n,aria:{content:\"auto\",expanded:\"auto\"},delay:0,duration:[300,250],getReferenceClientRect:null,hideOnClick:!0,ignoreAttributes:!1,interactive:!1,interactiveBorder:2,interactiveDebounce:0,moveTransition:\"\",offset:[0,10],onAfterUpdate:function(){},onBeforeUpdate:function(){},onCreate:function(){},onDestroy:function(){},onHidden:function(){},onHide:function(){},onMount:function(){},onShow:function(){},onShown:function(){},onTrigger:function(){},onUntrigger:function(){},onClickOutside:function(){},placement:\"top\",plugins:[],popperOptions:{},render:null,showOnCreate:!1,touch:!0,trigger:\"mouseenter focus\",triggerTarget:null},{animateFill:!1,followCursor:!1,inlinePositioning:!1,sticky:!1},{allowHTML:!1,animation:\"fade\",arrow:!0,content:\"\",inertia:!1,maxWidth:350,role:\"tooltip\",theme:\"\",zIndex:9999}),k=Object.keys(R);function P(e){var t=(e.plugins||[]).reduce((function(t,n){var r,o=n.name,i=n.defaultValue;o&&(t[o]=void 0!==e[o]?e[o]:null!=(r=R[o])?r:i);return t}),{});return Object.assign({},e,t)}function j(e,t){var n=Object.assign({},t,{content:i(t.content,[e])},t.ignoreAttributes?{}:function(e,t){return(t?Object.keys(P(Object.assign({},R,{plugins:t}))):k).reduce((function(t,n){var r=(e.getAttribute(\"data-tippy-\"+n)||\"\").trim();if(!r)return t;if(\"content\"===n)t[n]=r;else try{t[n]=JSON.parse(r)}catch(e){t[n]=r}return t}),{})}(e,t.plugins));return n.aria=Object.assign({},R.aria,n.aria),n.aria={expanded:\"auto\"===n.aria.expanded?t.interactive:n.aria.expanded,content:\"auto\"===n.aria.content?t.interactive?null:\"describedby\":n.aria.content},n}function M(e,t){e.innerHTML=t}function V(e){var t=d();return!0===e?t.className=\"tippy-arrow\":(t.className=\"tippy-svg-arrow\",v(e)?t.appendChild(e):M(t,e)),t}function I(e,t){v(t.content)?(M(e,\"\"),e.appendChild(t.content)):\"function\"!=typeof t.content&&(t.allowHTML?M(e,t.content):e.textContent=t.content)}function S(e){var t=e.firstElementChild,n=f(t.children);return{box:t,content:n.find((function(e){return e.classList.contains(\"tippy-content\")})),arrow:n.find((function(e){return e.classList.contains(\"tippy-arrow\")||e.classList.contains(\"tippy-svg-arrow\")})),backdrop:n.find((function(e){return e.classList.contains(\"tippy-backdrop\")}))}}function N(e){var t=d(),n=d();n.className=\"tippy-box\",n.setAttribute(\"data-state\",\"hidden\"),n.setAttribute(\"tabindex\",\"-1\");var r=d();function o(n,r){var o=S(t),i=o.box,a=o.content,s=o.arrow;r.theme?i.setAttribute(\"data-theme\",r.theme):i.removeAttribute(\"data-theme\"),\"string\"==typeof r.animation?i.setAttribute(\"data-animation\",r.animation):i.removeAttribute(\"data-animation\"),r.inertia?i.setAttribute(\"data-inertia\",\"\"):i.removeAttribute(\"data-inertia\"),i.style.maxWidth=\"number\"==typeof r.maxWidth?r.maxWidth+\"px\":r.maxWidth,r.role?i.setAttribute(\"role\",r.role):i.removeAttribute(\"role\"),n.content===r.content&&n.allowHTML===r.allowHTML||I(a,e.props),r.arrow?s?n.arrow!==r.arrow&&(i.removeChild(s),i.appendChild(V(r.arrow))):i.appendChild(V(r.arrow)):s&&i.removeChild(s)}return r.className=\"tippy-content\",r.setAttribute(\"data-state\",\"hidden\"),I(r,e.props),t.appendChild(n),n.appendChild(r),o(e.props,e.props),{popper:t,onUpdate:o}}N.$$tippy=!0;var B=1,H=[],U=[];function _(o,s){var v,g,h,C,T,A,L,k,M=j(o,Object.assign({},R,P(l(s)))),V=!1,I=!1,N=!1,_=!1,F=[],W=a(we,M.interactiveDebounce),X=B++,Y=(k=M.plugins).filter((function(e,t){return k.indexOf(e)===t})),$={id:X,reference:o,popper:d(),popperInstance:null,props:M,state:{isEnabled:!0,isVisible:!1,isDestroyed:!1,isMounted:!1,isShown:!1},plugins:Y,clearDelayTimeouts:function(){clearTimeout(v),clearTimeout(g),cancelAnimationFrame(h)},setProps:function(e){if($.state.isDestroyed)return;ae(\"onBeforeUpdate\",[$,e]),be();var t=$.props,n=j(o,Object.assign({},t,l(e),{ignoreAttributes:!0}));$.props=n,he(),t.interactiveDebounce!==n.interactiveDebounce&&(ce(),W=a(we,n.interactiveDebounce));t.triggerTarget&&!n.triggerTarget?u(t.triggerTarget).forEach((function(e){e.removeAttribute(\"aria-expanded\")})):n.triggerTarget&&o.removeAttribute(\"aria-expanded\");ue(),ie(),J&&J(t,n);$.popperInstance&&(Ce(),Ae().forEach((function(e){requestAnimationFrame(e._tippy.popperInstance.forceUpdate)})));ae(\"onAfterUpdate\",[$,e])},setContent:function(e){$.setProps({content:e})},show:function(){var e=$.state.isVisible,t=$.state.isDestroyed,o=!$.state.isEnabled,a=x.isTouch&&!$.props.touch,s=r($.props.duration,0,R.duration);if(e||t||o||a)return;if(te().hasAttribute(\"disabled\"))return;if(ae(\"onShow\",[$],!1),!1===$.props.onShow($))return;$.state.isVisible=!0,ee()&&(z.style.visibility=\"visible\");ie(),de(),$.state.isMounted||(z.style.transition=\"none\");if(ee()){var u=re(),p=u.box,f=u.content;b([p,f],0)}A=function(){var e;if($.state.isVisible&&!_){if(_=!0,z.offsetHeight,z.style.transition=$.props.moveTransition,ee()&&$.props.animation){var t=re(),n=t.box,r=t.content;b([n,r],s),y([n,r],\"visible\")}se(),ue(),c(U,$),null==(e=$.popperInstance)||e.forceUpdate(),ae(\"onMount\",[$]),$.props.animation&&ee()&&function(e,t){me(e,t)}(s,(function(){$.state.isShown=!0,ae(\"onShown\",[$])}))}},function(){var e,t=$.props.appendTo,r=te();e=$.props.interactive&&t===n||\"parent\"===t?r.parentNode:i(t,[r]);e.contains(z)||e.appendChild(z);$.state.isMounted=!0,Ce()}()},hide:function(){var e=!$.state.isVisible,t=$.state.isDestroyed,n=!$.state.isEnabled,o=r($.props.duration,1,R.duration);if(e||t||n)return;if(ae(\"onHide\",[$],!1),!1===$.props.onHide($))return;$.state.isVisible=!1,$.state.isShown=!1,_=!1,V=!1,ee()&&(z.style.visibility=\"hidden\");if(ce(),ve(),ie(!0),ee()){var i=re(),a=i.box,s=i.content;$.props.animation&&(b([a,s],o),y([a,s],\"hidden\"))}se(),ue(),$.props.animation?ee()&&function(e,t){me(e,(function(){!$.state.isVisible&&z.parentNode&&z.parentNode.contains(z)&&t()}))}(o,$.unmount):$.unmount()},hideWithInteractivity:function(e){ne().addEventListener(\"mousemove\",W),c(H,W),W(e)},enable:function(){$.state.isEnabled=!0},disable:function(){$.hide(),$.state.isEnabled=!1},unmount:function(){$.state.isVisible&&$.hide();if(!$.state.isMounted)return;Te(),Ae().forEach((function(e){e._tippy.unmount()})),z.parentNode&&z.parentNode.removeChild(z);U=U.filter((function(e){return e!==$})),$.state.isMounted=!1,ae(\"onHidden\",[$])},destroy:function(){if($.state.isDestroyed)return;$.clearDelayTimeouts(),$.unmount(),be(),delete o._tippy,$.state.isDestroyed=!0,ae(\"onDestroy\",[$])}};if(!M.render)return $;var q=M.render($),z=q.popper,J=q.onUpdate;z.setAttribute(\"data-tippy-root\",\"\"),z.id=\"tippy-\"+$.id,$.popper=z,o._tippy=$,z._tippy=$;var G=Y.map((function(e){return e.fn($)})),K=o.hasAttribute(\"aria-expanded\");return he(),ue(),ie(),ae(\"onCreate\",[$]),M.showOnCreate&&Le(),z.addEventListener(\"mouseenter\",(function(){$.props.interactive&&$.state.isVisible&&$.clearDelayTimeouts()})),z.addEventListener(\"mouseleave\",(function(){$.props.interactive&&$.props.trigger.indexOf(\"mouseenter\")>=0&&ne().addEventListener(\"mousemove\",W)})),$;function Q(){var e=$.props.touch;return Array.isArray(e)?e:[e,0]}function Z(){return\"hold\"===Q()[0]}function ee(){var e;return!(null==(e=$.props.render)||!e.$$tippy)}function te(){return L||o}function ne(){var e=te().parentNode;return e?w(e):document}function re(){return S(z)}function oe(e){return $.state.isMounted&&!$.state.isVisible||x.isTouch||C&&\"focus\"===C.type?0:r($.props.delay,e?0:1,R.delay)}function ie(e){void 0===e&&(e=!1),z.style.pointerEvents=$.props.interactive&&!e?\"\":\"none\",z.style.zIndex=\"\"+$.props.zIndex}function ae(e,t,n){var r;(void 0===n&&(n=!0),G.forEach((function(n){n[e]&&n[e].apply(n,t)})),n)&&(r=$.props)[e].apply(r,t)}function se(){var e=$.props.aria;if(e.content){var t=\"aria-\"+e.content,n=z.id;u($.props.triggerTarget||o).forEach((function(e){var r=e.getAttribute(t);if($.state.isVisible)e.setAttribute(t,r?r+\" \"+n:n);else{var o=r&&r.replace(n,\"\").trim();o?e.setAttribute(t,o):e.removeAttribute(t)}}))}}function ue(){!K&&$.props.aria.expanded&&u($.props.triggerTarget||o).forEach((function(e){$.props.interactive?e.setAttribute(\"aria-expanded\",$.state.isVisible&&e===te()?\"true\":\"false\"):e.removeAttribute(\"aria-expanded\")}))}function ce(){ne().removeEventListener(\"mousemove\",W),H=H.filter((function(e){return e!==W}))}function pe(e){if(!x.isTouch||!N&&\"mousedown\"!==e.type){var t=e.composedPath&&e.composedPath()[0]||e.target;if(!$.props.interactive||!O(z,t)){if(u($.props.triggerTarget||o).some((function(e){return O(e,t)}))){if(x.isTouch)return;if($.state.isVisible&&$.props.trigger.indexOf(\"click\")>=0)return}else ae(\"onClickOutside\",[$,e]);!0===$.props.hideOnClick&&($.clearDelayTimeouts(),$.hide(),I=!0,setTimeout((function(){I=!1})),$.state.isMounted||ve())}}}function fe(){N=!0}function le(){N=!1}function de(){var e=ne();e.addEventListener(\"mousedown\",pe,!0),e.addEventListener(\"touchend\",pe,t),e.addEventListener(\"touchstart\",le,t),e.addEventListener(\"touchmove\",fe,t)}function ve(){var e=ne();e.removeEventListener(\"mousedown\",pe,!0),e.removeEventListener(\"touchend\",pe,t),e.removeEventListener(\"touchstart\",le,t),e.removeEventListener(\"touchmove\",fe,t)}function me(e,t){var n=re().box;function r(e){e.target===n&&(E(n,\"remove\",r),t())}if(0===e)return t();E(n,\"remove\",T),E(n,\"add\",r),T=r}function ge(e,t,n){void 0===n&&(n=!1),u($.props.triggerTarget||o).forEach((function(r){r.addEventListener(e,t,n),F.push({node:r,eventType:e,handler:t,options:n})}))}function he(){var e;Z()&&(ge(\"touchstart\",ye,{passive:!0}),ge(\"touchend\",Ee,{passive:!0})),(e=$.props.trigger,e.split(/\\s+/).filter(Boolean)).forEach((function(e){if(\"manual\"!==e)switch(ge(e,ye),e){case\"mouseenter\":ge(\"mouseleave\",Ee);break;case\"focus\":ge(D?\"focusout\":\"blur\",Oe);break;case\"focusin\":ge(\"focusout\",Oe)}}))}function be(){F.forEach((function(e){var t=e.node,n=e.eventType,r=e.handler,o=e.options;t.removeEventListener(n,r,o)})),F=[]}function ye(e){var t,n=!1;if($.state.isEnabled&&!xe(e)&&!I){var r=\"focus\"===(null==(t=C)?void 0:t.type);C=e,L=e.currentTarget,ue(),!$.state.isVisible&&m(e)&&H.forEach((function(t){return t(e)})),\"click\"===e.type&&($.props.trigger.indexOf(\"mouseenter\")<0||V)&&!1!==$.props.hideOnClick&&$.state.isVisible?n=!0:Le(e),\"click\"===e.type&&(V=!n),n&&!r&&De(e)}}function we(e){var t=e.target,n=te().contains(t)||z.contains(t);\"mousemove\"===e.type&&n||function(e,t){var n=t.clientX,r=t.clientY;return e.every((function(e){var t=e.popperRect,o=e.popperState,i=e.props.interactiveBorder,a=p(o.placement),s=o.modifiersData.offset;if(!s)return!0;var u=\"bottom\"===a?s.top.y:0,c=\"top\"===a?s.bottom.y:0,f=\"right\"===a?s.left.x:0,l=\"left\"===a?s.right.x:0,d=t.top-r+u>i,v=r-t.bottom-c>i,m=t.left-n+f>i,g=n-t.right-l>i;return d||v||m||g}))}(Ae().concat(z).map((function(e){var t,n=null==(t=e._tippy.popperInstance)?void 0:t.state;return n?{popperRect:e.getBoundingClientRect(),popperState:n,props:M}:null})).filter(Boolean),e)&&(ce(),De(e))}function Ee(e){xe(e)||$.props.trigger.indexOf(\"click\")>=0&&V||($.props.interactive?$.hideWithInteractivity(e):De(e))}function Oe(e){$.props.trigger.indexOf(\"focusin\")<0&&e.target!==te()||$.props.interactive&&e.relatedTarget&&z.contains(e.relatedTarget)||De(e)}function xe(e){return!!x.isTouch&&Z()!==e.type.indexOf(\"touch\")>=0}function Ce(){Te();var t=$.props,n=t.popperOptions,r=t.placement,i=t.offset,a=t.getReferenceClientRect,s=t.moveTransition,u=ee()?S(z).arrow:null,c=a?{getBoundingClientRect:a,contextElement:a.contextElement||te()}:o,p=[{name:\"offset\",options:{offset:i}},{name:\"preventOverflow\",options:{padding:{top:2,bottom:2,left:5,right:5}}},{name:\"flip\",options:{padding:5}},{name:\"computeStyles\",options:{adaptive:!s}},{name:\"$$tippy\",enabled:!0,phase:\"beforeWrite\",requires:[\"computeStyles\"],fn:function(e){var t=e.state;if(ee()){var n=re().box;[\"placement\",\"reference-hidden\",\"escaped\"].forEach((function(e){\"placement\"===e?n.setAttribute(\"data-placement\",t.placement):t.attributes.popper[\"data-popper-\"+e]?n.setAttribute(\"data-\"+e,\"\"):n.removeAttribute(\"data-\"+e)})),t.attributes.popper={}}}}];ee()&&u&&p.push({name:\"arrow\",options:{element:u,padding:3}}),p.push.apply(p,(null==n?void 0:n.modifiers)||[]),$.popperInstance=e.createPopper(c,z,Object.assign({},n,{placement:r,onFirstUpdate:A,modifiers:p}))}function Te(){$.popperInstance&&($.popperInstance.destroy(),$.popperInstance=null)}function Ae(){return f(z.querySelectorAll(\"[data-tippy-root]\"))}function Le(e){$.clearDelayTimeouts(),e&&ae(\"onTrigger\",[$,e]),de();var t=oe(!0),n=Q(),r=n[0],o=n[1];x.isTouch&&\"hold\"===r&&o&&(t=o),t?v=setTimeout((function(){$.show()}),t):$.show()}function De(e){if($.clearDelayTimeouts(),ae(\"onUntrigger\",[$,e]),$.state.isVisible){if(!($.props.trigger.indexOf(\"mouseenter\")>=0&&$.props.trigger.indexOf(\"click\")>=0&&[\"mouseleave\",\"mousemove\"].indexOf(e.type)>=0&&V)){var t=oe(!1);t?g=setTimeout((function(){$.state.isVisible&&$.hide()}),t):h=requestAnimationFrame((function(){$.hide()}))}}else ve()}}function F(e,n){void 0===n&&(n={});var r=R.plugins.concat(n.plugins||[]);document.addEventListener(\"touchstart\",T,t),window.addEventListener(\"blur\",L);var o=Object.assign({},n,{plugins:r}),i=h(e).reduce((function(e,t){var n=t&&_(t,o);return n&&e.push(n),e}),[]);return v(e)?i[0]:i}F.defaultProps=R,F.setDefaultProps=function(e){Object.keys(e).forEach((function(t){R[t]=e[t]}))},F.currentInput=x;var W=Object.assign({},e.applyStyles,{effect:function(e){var t=e.state,n={popper:{position:t.options.strategy,left:\"0\",top:\"0\",margin:\"0\"},arrow:{position:\"absolute\"},reference:{}};Object.assign(t.elements.popper.style,n.popper),t.styles=n,t.elements.arrow&&Object.assign(t.elements.arrow.style,n.arrow)}}),X={mouseover:\"mouseenter\",focusin:\"focus\",click:\"click\"};var Y={name:\"animateFill\",defaultValue:!1,fn:function(e){var t;if(null==(t=e.props.render)||!t.$$tippy)return{};var n=S(e.popper),r=n.box,o=n.content,i=e.props.animateFill?function(){var e=d();return e.className=\"tippy-backdrop\",y([e],\"hidden\"),e}():null;return{onCreate:function(){i&&(r.insertBefore(i,r.firstElementChild),r.setAttribute(\"data-animatefill\",\"\"),r.style.overflow=\"hidden\",e.setProps({arrow:!1,animation:\"shift-away\"}))},onMount:function(){if(i){var e=r.style.transitionDuration,t=Number(e.replace(\"ms\",\"\"));o.style.transitionDelay=Math.round(t/10)+\"ms\",i.style.transitionDuration=e,y([i],\"visible\")}},onShow:function(){i&&(i.style.transitionDuration=\"0ms\")},onHide:function(){i&&y([i],\"hidden\")}}}};var $={clientX:0,clientY:0},q=[];function z(e){var t=e.clientX,n=e.clientY;$={clientX:t,clientY:n}}var J={name:\"followCursor\",defaultValue:!1,fn:function(e){var t=e.reference,n=w(e.props.triggerTarget||t),r=!1,o=!1,i=!0,a=e.props;function s(){return\"initial\"===e.props.followCursor&&e.state.isVisible}function u(){n.addEventListener(\"mousemove\",f)}function c(){n.removeEventListener(\"mousemove\",f)}function p(){r=!0,e.setProps({getReferenceClientRect:null}),r=!1}function f(n){var r=!n.target||t.contains(n.target),o=e.props.followCursor,i=n.clientX,a=n.clientY,s=t.getBoundingClientRect(),u=i-s.left,c=a-s.top;!r&&e.props.interactive||e.setProps({getReferenceClientRect:function(){var e=t.getBoundingClientRect(),n=i,r=a;\"initial\"===o&&(n=e.left+u,r=e.top+c);var s=\"horizontal\"===o?e.top:r,p=\"vertical\"===o?e.right:n,f=\"horizontal\"===o?e.bottom:r,l=\"vertical\"===o?e.left:n;return{width:p-l,height:f-s,top:s,right:p,bottom:f,left:l}}})}function l(){e.props.followCursor&&(q.push({instance:e,doc:n}),function(e){e.addEventListener(\"mousemove\",z)}(n))}function d(){0===(q=q.filter((function(t){return t.instance!==e}))).filter((function(e){return e.doc===n})).length&&function(e){e.removeEventListener(\"mousemove\",z)}(n)}return{onCreate:l,onDestroy:d,onBeforeUpdate:function(){a=e.props},onAfterUpdate:function(t,n){var i=n.followCursor;r||void 0!==i&&a.followCursor!==i&&(d(),i?(l(),!e.state.isMounted||o||s()||u()):(c(),p()))},onMount:function(){e.props.followCursor&&!o&&(i&&(f($),i=!1),s()||u())},onTrigger:function(e,t){m(t)&&($={clientX:t.clientX,clientY:t.clientY}),o=\"focus\"===t.type},onHidden:function(){e.props.followCursor&&(p(),c(),i=!0)}}}};var G={name:\"inlinePositioning\",defaultValue:!1,fn:function(e){var t,n=e.reference;var r=-1,o=!1,i=[],a={name:\"tippyInlinePositioning\",enabled:!0,phase:\"afterWrite\",fn:function(o){var a=o.state;e.props.inlinePositioning&&(-1!==i.indexOf(a.placement)&&(i=[]),t!==a.placement&&-1===i.indexOf(a.placement)&&(i.push(a.placement),e.setProps({getReferenceClientRect:function(){return function(e){return function(e,t,n,r){if(n.length<2||null===e)return t;if(2===n.length&&r>=0&&n[0].left>n[1].right)return n[r]||t;switch(e){case\"top\":case\"bottom\":var o=n[0],i=n[n.length-1],a=\"top\"===e,s=o.top,u=i.bottom,c=a?o.left:i.left,p=a?o.right:i.right;return{top:s,bottom:u,left:c,right:p,width:p-c,height:u-s};case\"left\":case\"right\":var f=Math.min.apply(Math,n.map((function(e){return e.left}))),l=Math.max.apply(Math,n.map((function(e){return e.right}))),d=n.filter((function(t){return\"left\"===e?t.left===f:t.right===l})),v=d[0].top,m=d[d.length-1].bottom;return{top:v,bottom:m,left:f,right:l,width:l-f,height:m-v};default:return t}}(p(e),n.getBoundingClientRect(),f(n.getClientRects()),r)}(a.placement)}})),t=a.placement)}};function s(){var t;o||(t=function(e,t){var n;return{popperOptions:Object.assign({},e.popperOptions,{modifiers:[].concat(((null==(n=e.popperOptions)?void 0:n.modifiers)||[]).filter((function(e){return e.name!==t.name})),[t])})}}(e.props,a),o=!0,e.setProps(t),o=!1)}return{onCreate:s,onAfterUpdate:s,onTrigger:function(t,n){if(m(n)){var o=f(e.reference.getClientRects()),i=o.find((function(e){return e.left-2<=n.clientX&&e.right+2>=n.clientX&&e.top-2<=n.clientY&&e.bottom+2>=n.clientY})),a=o.indexOf(i);r=a>-1?a:r}},onHidden:function(){r=-1}}}};var K={name:\"sticky\",defaultValue:!1,fn:function(e){var t=e.reference,n=e.popper;function r(t){return!0===e.props.sticky||e.props.sticky===t}var o=null,i=null;function a(){var s=r(\"reference\")?(e.popperInstance?e.popperInstance.state.elements.reference:t).getBoundingClientRect():null,u=r(\"popper\")?n.getBoundingClientRect():null;(s&&Q(o,s)||u&&Q(i,u))&&e.popperInstance&&e.popperInstance.update(),o=s,i=u,e.state.isMounted&&requestAnimationFrame(a)}return{onMount:function(){e.props.sticky&&a()}}}};function Q(e,t){return!e||!t||(e.top!==t.top||e.right!==t.right||e.bottom!==t.bottom||e.left!==t.left)}return F.setDefaultProps({plugins:[Y,J,G,K],render:N}),F.createSingleton=function(e,t){var n;void 0===t&&(t={});var r,o=e,i=[],a=[],c=t.overrides,p=[],f=!1;function l(){a=o.map((function(e){return u(e.props.triggerTarget||e.reference)})).reduce((function(e,t){return e.concat(t)}),[])}function v(){i=o.map((function(e){return e.reference}))}function m(e){o.forEach((function(t){e?t.enable():t.disable()}))}function g(e){return o.map((function(t){var n=t.setProps;return t.setProps=function(o){n(o),t.reference===r&&e.setProps(o)},function(){t.setProps=n}}))}function h(e,t){var n=a.indexOf(t);if(t!==r){r=t;var s=(c||[]).concat(\"content\").reduce((function(e,t){return e[t]=o[n].props[t],e}),{});e.setProps(Object.assign({},s,{getReferenceClientRect:\"function\"==typeof s.getReferenceClientRect?s.getReferenceClientRect:function(){var e;return null==(e=i[n])?void 0:e.getBoundingClientRect()}}))}}m(!1),v(),l();var b={fn:function(){return{onDestroy:function(){m(!0)},onHidden:function(){r=null},onClickOutside:function(e){e.props.showOnCreate&&!f&&(f=!0,r=null)},onShow:function(e){e.props.showOnCreate&&!f&&(f=!0,h(e,i[0]))},onTrigger:function(e,t){h(e,t.currentTarget)}}}},y=F(d(),Object.assign({},s(t,[\"overrides\"]),{plugins:[b].concat(t.plugins||[]),triggerTarget:a,popperOptions:Object.assign({},t.popperOptions,{modifiers:[].concat((null==(n=t.popperOptions)?void 0:n.modifiers)||[],[W])})})),w=y.show;y.show=function(e){if(w(),!r&&null==e)return h(y,i[0]);if(!r||null!=e){if(\"number\"==typeof e)return i[e]&&h(y,i[e]);if(o.indexOf(e)>=0){var t=e.reference;return h(y,t)}return i.indexOf(e)>=0?h(y,e):void 0}},y.showNext=function(){var e=i[0];if(!r)return y.show(0);var t=i.indexOf(r);y.show(i[t+1]||e)},y.showPrevious=function(){var e=i[i.length-1];if(!r)return y.show(e);var t=i.indexOf(r),n=i[t-1]||e;y.show(n)};var E=y.setProps;return y.setProps=function(e){c=e.overrides||c,E(e)},y.setInstances=function(e){m(!0),p.forEach((function(e){return e()})),o=e,m(!1),v(),l(),p=g(y),y.setProps({triggerTarget:a})},p=g(y),y},F.delegate=function(e,n){var r=[],o=[],i=!1,a=n.target,c=s(n,[\"target\"]),p=Object.assign({},c,{trigger:\"manual\",touch:!1}),f=Object.assign({touch:R.touch},c,{showOnCreate:!0}),l=F(e,p);function d(e){if(e.target&&!i){var t=e.target.closest(a);if(t){var r=t.getAttribute(\"data-tippy-trigger\")||n.trigger||R.trigger;if(!t._tippy&&!(\"touchstart\"===e.type&&\"boolean\"==typeof f.touch||\"touchstart\"!==e.type&&r.indexOf(X[e.type])<0)){var s=F(t,f);s&&(o=o.concat(s))}}}}function v(e,t,n,o){void 0===o&&(o=!1),e.addEventListener(t,n,o),r.push({node:e,eventType:t,handler:n,options:o})}return u(l).forEach((function(e){var n=e.destroy,a=e.enable,s=e.disable;e.destroy=function(e){void 0===e&&(e=!0),e&&o.forEach((function(e){e.destroy()})),o=[],r.forEach((function(e){var t=e.node,n=e.eventType,r=e.handler,o=e.options;t.removeEventListener(n,r,o)})),r=[],n()},e.enable=function(){a(),o.forEach((function(e){return e.enable()})),i=!1},e.disable=function(){s(),o.forEach((function(e){return e.disable()})),i=!0},function(e){var n=e.reference;v(n,\"touchstart\",d,t),v(n,\"mouseover\",d),v(n,\"focusin\",d),v(n,\"click\",d)}(e)})),l},F.hideAll=function(e){var t=void 0===e?{}:e,n=t.exclude,r=t.duration;U.forEach((function(e){var t=!1;if(n&&(t=g(n)?e.reference===n:e.popper===n.popper),!t){var o=e.props.duration;e.setProps({duration:r}),e.hide(),e.state.isDestroyed||e.setProps({duration:o})}}))},F.roundArrow='<svg height=\"6\" width=\"16\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M0 6s1.796-.013 4.67-3.615C5.851.9 6.93.006 8 0c1.07-.006 2.148.887 3.343 2.385C14.233 6.005 16 6 16 6H0z\"></svg>',F})); /* Hover-preview initialization for enscribe note markers, cross-reference * links, and citation markers. * * Attaches Tippy.js tooltips to: * - <sup data-note-id=\"...\"> note markers (showing note content) * - <a class=\"ref\" href=\"#...\"> cross-reference links (showing the target element) * - <cite class=\"cite\" data-keys=\"...\"> citation markers (showing bib entries) * * Requires: tippy.js (bundled by enscribe or loaded from CDN). * The tippy-bundle includes @popperjs/core so no separate Popper script needed. */ (function () { /** * Extract clean note content from a <li>element, stripping the leading * <sup> marker and the trailing back-arrow link that appear in the list. * Tooltips should show only the note's prose content. * * @param {Element} noteEl The <li>element from the note list. * @returns {string} innerHTML of the cloned, stripped element. */ function getNoteContent(noteEl) { var clone = noteEl.cloneNode(true); // Remove leading superscript marker (e.g. <sup>2</sup>). var sup = clone.querySelector('sup'); if (sup) sup.remove(); // Remove trailing back-arrow link (e.g. <a class=\"note-backref\">↩</a>). var backref = clone.querySelector('.note-backref'); if (backref) backref.remove(); return clone.innerHTML.trim(); } /** * Extract equation content from a display-math element, stripping the * equation-number span so the tooltip shows only the math itself. * * @param {Element} el The display-math element. * @returns {string} innerHTML of the cloned, stripped element. */ function getEquationContent(el) { var clone = el.cloneNode(true); var numSpan = clone.querySelector('.equation-number'); if (numSpan) numSpan.remove(); return clone.innerHTML.trim(); } /** * Extract figure content from a <figure>element, stripping the * figure-label span so the tooltip shows image + caption without \"Figure N.\". * * @param {Element} el The <figure>element. * @returns {string} outerHTML of the cloned, stripped element. */ function getFigureContent(el) { var clone = el.cloneNode(true); var label = clone.querySelector('.figure-label'); if (label) label.remove(); return clone.outerHTML; } /** * Get tooltip content for a <table>cross-reference target. * Strips the \"Table N.\" label span to keep the preview compact. * * @param {Element} el The <table>element. * @returns {string} outerHTML of the cloned, stripped element. */ function getTableContent(el) { var clone = el.cloneNode(true); clone.querySelectorAll('.table-label').forEach(function(n) { n.remove(); }); return clone.outerHTML; } /** * Dispatch to the appropriate content extractor based on the target element type. * * @param {Element} targetEl The element pointed to by a ref link. * @returns {string} HTML string to use as tooltip content. */ function getRefTargetContent(targetEl) { var tagName = targetEl.tagName.toLowerCase(); if (tagName === 'display-math') return getEquationContent(targetEl); if (tagName === 'figure') return getFigureContent(targetEl); if (tagName === 'table') return getTableContent(targetEl); if (tagName === 'li') return getNoteContent(targetEl); return targetEl.outerHTML; } /** * Attach a Tippy tooltip to a note marker <sup> element. * * @param {Element} marker The <sup data-note-id=\"...\"> element. */ function attachNoteTooltip(marker) { var noteId = marker.getAttribute('data-note-id'); var noteEl = document.getElementById(noteId); if (!noteEl) return; tippy(marker, { content: getNoteContent(noteEl), allowHTML: true, interactive: true, placement: 'top', theme: 'light-border', maxWidth: 400, appendTo: document.body, }); } /** * Attach a Tippy tooltip to an <a class=\"ref\"> cross-reference link. * The tooltip shows the content of the element the ref points to. * Refs pointing to missing targets are silently skipped. * * @param {Element} linkEl The <a class=\"ref\" href=\"#...\"> element. */ function attachRefTooltip(linkEl) { // -preview opt-out: ref-resolution.js / handlers/ref.js stamp // data-no-preview=\"true\" when the author wrote -preview on the <ref>. if (linkEl.getAttribute('data-no-preview') === 'true') return; var href = linkEl.getAttribute('href'); if (!href || href.charAt(0) !== '#') return; var targetId = href.slice(1); var targetEl = document.getElementById(targetId); if (!targetEl) return; var content = getRefTargetContent(targetEl); if (!content) return; var maxWidth = (function() { var t = targetEl.tagName.toLowerCase(); if (t === 'display-math') return 500; if (t === 'table') return 600; return 420; })(); tippy(linkEl, { content: content, allowHTML: true, interactive: false, placement: 'top', theme: 'light-border', maxWidth: maxWidth, appendTo: document.body, }); } /** * Build tooltip content for a <cite class=\"cite\"> element. * Looks up each key in data-keys by finding the #ref-KEY element in the * bibliography and returning its innerHTML. Keys missing from the * bibliography get a placeholder message. * * @param {Element} citeEl The <cite class=\"cite\"> element. * @returns {string} HTML string for the tooltip, or '' if no keys found. */ function getCiteContent(citeEl) { var keysAttr = citeEl.getAttribute('data-keys') || ''; if (!keysAttr) return ''; var keys = keysAttr.split(',').map(function(k) { return k.trim(); }).filter(Boolean); if (keys.length === 0) return ''; var items = keys.map(function(key) { var refEl = document.getElementById('ref-' + key); if (refEl) { return '<li>' + refEl.innerHTML + '</li>'; } return '<li class=\"cite-missing\"><em>' + key + '</em> (not in bibliography)</li>'; }); return '<ul class=\"cite-tooltip-list\">' + items.join('') + '</ul>'; } /** * Attach a Tippy tooltip to a <cite class=\"cite\"> citation marker. * Shows full bibliography entries for each cited key. * cite-error elements are deliberately excluded (no tooltip on errors). * * @param {Element} citeEl The <cite class=\"cite\"> element. */ function attachCiteTooltip(citeEl) { var content = getCiteContent(citeEl); if (!content) return; tippy(citeEl, { content: content, allowHTML: true, interactive: true, placement: 'top', theme: 'light-border', maxWidth: 500, appendTo: document.body, }); } function init() { document.querySelectorAll('sup[data-note-id]').forEach(attachNoteTooltip); document.querySelectorAll('a.ref[href^=\"#\"]').forEach(attachRefTooltip); document.querySelectorAll('cite.cite').forEach(attachCiteTooltip); } if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); } })(); </script><link href=\"https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,600;0,700;1,400;1,700&#x26;family=Source+Code+Pro:wght@400&#x26;display=swap\" rel=\"stylesheet\"><article><article-body><p>Some text<sup data-note-id=\"note-1\" id=\"noteref-1\"><a href=\"#note-1\">1</a></sup>.</p></article-body><article-back><note-list class=\"endnotes\"><ol><li id=\"note-1\"><sup>1</sup><p>A substantive note about the text.</p><a aria-label=\"back to text\" class=\"note-backref\" href=\"#noteref-1\">↩</a></li></ol></note-list>",
      },
      {
        "source": "A claim<note placement=foot | A footnote.>.",
        "layer1_html": "<style>.tippy-box[data-animation=fade][data-state=hidden]{opacity:0}[data-tippy-root]{max-width:calc(100vw - 10px)}.tippy-box{position:relative;background-color:#333;color:#fff;border-radius:4px;font-size:14px;line-height:1.4;white-space:normal;outline:0;transition-property:transform,visibility,opacity}.tippy-box[data-placement^=top]>.tippy-arrow{bottom:0}.tippy-box[data-placement^=top]>.tippy-arrow:before{bottom:-7px;left:0;border-width:8px 8px 0;border-top-color:initial;transform-origin:center top}.tippy-box[data-placement^=bottom]>.tippy-arrow{top:0}.tippy-box[data-placement^=bottom]>.tippy-arrow:before{top:-7px;left:0;border-width:0 8px 8px;border-bottom-color:initial;transform-origin:center bottom}.tippy-box[data-placement^=left]>.tippy-arrow{right:0}.tippy-box[data-placement^=left]>.tippy-arrow:before{border-width:8px 0 8px 8px;border-left-color:initial;right:-7px;transform-origin:center left}.tippy-box[data-placement^=right]>.tippy-arrow{left:0}.tippy-box[data-placement^=right]>.tippy-arrow:before{left:-7px;border-width:8px 8px 8px 0;border-right-color:initial;transform-origin:center right}.tippy-box[data-inertia][data-state=visible]{transition-timing-function:cubic-bezier(.54,1.5,.38,1.11)}.tippy-arrow{width:16px;height:16px;color:#333}.tippy-arrow:before{content:\"\";position:absolute;border-color:transparent;border-style:solid}.tippy-content{position:relative;padding:5px 9px;z-index:1} .tippy-box[data-theme~=light-border]{background-color:#fff;background-clip:padding-box;border:1px solid rgba(0,8,16,.15);color:#333;box-shadow:0 4px 14px -2px rgba(0,8,16,.08)}.tippy-box[data-theme~=light-border]>.tippy-backdrop{background-color:#fff}.tippy-box[data-theme~=light-border]>.tippy-arrow:after,.tippy-box[data-theme~=light-border]>.tippy-svg-arrow:after{content:\"\";position:absolute;z-index:-1}.tippy-box[data-theme~=light-border]>.tippy-arrow:after{border-color:transparent;border-style:solid}.tippy-box[data-theme~=light-border][data-placement^=top]>.tippy-arrow:before{border-top-color:#fff}.tippy-box[data-theme~=light-border][data-placement^=top]>.tippy-arrow:after{border-top-color:rgba(0,8,16,.2);border-width:7px 7px 0;top:17px;left:1px}.tippy-box[data-theme~=light-border][data-placement^=top]>.tippy-svg-arrow>svg{top:16px}.tippy-box[data-theme~=light-border][data-placement^=top]>.tippy-svg-arrow:after{top:17px}.tippy-box[data-theme~=light-border][data-placement^=bottom]>.tippy-arrow:before{border-bottom-color:#fff;bottom:16px}.tippy-box[data-theme~=light-border][data-placement^=bottom]>.tippy-arrow:after{border-bottom-color:rgba(0,8,16,.2);border-width:0 7px 7px;bottom:17px;left:1px}.tippy-box[data-theme~=light-border][data-placement^=bottom]>.tippy-svg-arrow>svg{bottom:16px}.tippy-box[data-theme~=light-border][data-placement^=bottom]>.tippy-svg-arrow:after{bottom:17px}.tippy-box[data-theme~=light-border][data-placement^=left]>.tippy-arrow:before{border-left-color:#fff}.tippy-box[data-theme~=light-border][data-placement^=left]>.tippy-arrow:after{border-left-color:rgba(0,8,16,.2);border-width:7px 0 7px 7px;left:17px;top:1px}.tippy-box[data-theme~=light-border][data-placement^=left]>.tippy-svg-arrow>svg{left:11px}.tippy-box[data-theme~=light-border][data-placement^=left]>.tippy-svg-arrow:after{left:12px}.tippy-box[data-theme~=light-border][data-placement^=right]>.tippy-arrow:before{border-right-color:#fff;right:16px}.tippy-box[data-theme~=light-border][data-placement^=right]>.tippy-arrow:after{border-width:7px 7px 7px 0;right:17px;top:1px;border-right-color:rgba(0,8,16,.2)}.tippy-box[data-theme~=light-border][data-placement^=right]>.tippy-svg-arrow>svg{right:11px}.tippy-box[data-theme~=light-border][data-placement^=right]>.tippy-svg-arrow:after{right:12px}.tippy-box[data-theme~=light-border]>.tippy-svg-arrow{fill:#fff}.tippy-box[data-theme~=light-border]>.tippy-svg-arrow:after{background-image:url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMCA2czEuNzk2LS4wMTMgNC42Ny0zLjYxNUM1Ljg1MS45IDYuOTMuMDA2IDggMGMxLjA3LS4wMDYgMi4xNDguODg3IDMuMzQzIDIuMzg1QzE0LjIzMyA2LjAwNSAxNiA2IDE2IDZIMHoiIGZpbGw9InJnYmEoMCwgOCwgMTYsIDAuMikiLz48L3N2Zz4=);background-size:16px 6px;width:16px;height:6px} /* Sidenote fallback: collected-to-end items authored as placement=side. * Future margin-positioning themes can detect this class and reposition. */ .sidenote-fallback { font-style: italic; } /* Note list: suppress default <ol>numbering since <sup>N</sup> provides it. */ note-list ol { list-style: none; padding-left: 0; margin: 0; } note-list li { margin-bottom: 0.5em; } /* Figure tooltips: constrain image and caption within the tooltip box. */ .tippy-box figure { margin: 0; } .tippy-box figure img { max-width: 100%; height: auto; display: block; } .tippy-box figure figcaption { font-size: 0.9em; margin-top: 0.5em; color: #555; } /* Table tooltips: compact styling with border grid; overflow-x for wide tables. */ .tippy-content { overflow-x: auto; } .tippy-box table { border-collapse: collapse; width: 100%; font-size: 0.9em; margin: 0; } .tippy-box table th, .tippy-box table td { border: 1px solid #ccc; padding: 0.3em 0.6em; text-align: left; } .tippy-box table caption { font-size: 0.9em; margin-bottom: 0.4em; text-align: left; color: #444; } </style><script>/** * @popperjs/core v2.11.8 - MIT License */ !function(e,t){\"object\"==typeof exports&&\"undefined\"!=typeof module?t(exports):\"function\"==typeof define&&define.amd?define([\"exports\"],t):t((e=\"undefined\"!=typeof globalThis?globalThis:e||self).Popper={})}(this,(function(e){\"use strict\";function t(e){if(null==e)return window;if(\"[object Window]\"!==e.toString()){var t=e.ownerDocument;return t&&t.defaultView||window}return e}function n(e){return e instanceof t(e).Element||e instanceof Element}function r(e){return e instanceof t(e).HTMLElement||e instanceof HTMLElement}function o(e){return\"undefined\"!=typeof ShadowRoot&&(e instanceof t(e).ShadowRoot||e instanceof ShadowRoot)}var i=Math.max,a=Math.min,s=Math.round;function f(){var e=navigator.userAgentData;return null!=e&&e.brands&&Array.isArray(e.brands)?e.brands.map((function(e){return e.brand+\"/\"+e.version})).join(\" \"):navigator.userAgent}function c(){return!/^((?!chrome|android).)*safari/i.test(f())}function p(e,o,i){void 0===o&&(o=!1),void 0===i&&(i=!1);var a=e.getBoundingClientRect(),f=1,p=1;o&&r(e)&&(f=e.offsetWidth>0&&s(a.width)/e.offsetWidth||1,p=e.offsetHeight>0&&s(a.height)/e.offsetHeight||1);var u=(n(e)?t(e):window).visualViewport,l=!c()&&i,d=(a.left+(l&&u?u.offsetLeft:0))/f,h=(a.top+(l&&u?u.offsetTop:0))/p,m=a.width/f,v=a.height/p;return{width:m,height:v,top:h,right:d+m,bottom:h+v,left:d,x:d,y:h}}function u(e){var n=t(e);return{scrollLeft:n.pageXOffset,scrollTop:n.pageYOffset}}function l(e){return e?(e.nodeName||\"\").toLowerCase():null}function d(e){return((n(e)?e.ownerDocument:e.document)||window.document).documentElement}function h(e){return p(d(e)).left+u(e).scrollLeft}function m(e){return t(e).getComputedStyle(e)}function v(e){var t=m(e),n=t.overflow,r=t.overflowX,o=t.overflowY;return/auto|scroll|overlay|hidden/.test(n+o+r)}function y(e,n,o){void 0===o&&(o=!1);var i,a,f=r(n),c=r(n)&&function(e){var t=e.getBoundingClientRect(),n=s(t.width)/e.offsetWidth||1,r=s(t.height)/e.offsetHeight||1;return 1!==n||1!==r}(n),m=d(n),y=p(e,c,o),g={scrollLeft:0,scrollTop:0},b={x:0,y:0};return(f||!f&&!o)&&((\"body\"!==l(n)||v(m))&&(g=(i=n)!==t(i)&&r(i)?{scrollLeft:(a=i).scrollLeft,scrollTop:a.scrollTop}:u(i)),r(n)?((b=p(n,!0)).x+=n.clientLeft,b.y+=n.clientTop):m&&(b.x=h(m))),{x:y.left+g.scrollLeft-b.x,y:y.top+g.scrollTop-b.y,width:y.width,height:y.height}}function g(e){var t=p(e),n=e.offsetWidth,r=e.offsetHeight;return Math.abs(t.width-n)<=1&&(n=t.width),Math.abs(t.height-r)<=1&&(r=t.height),{x:e.offsetLeft,y:e.offsetTop,width:n,height:r}}function b(e){return\"html\"===l(e)?e:e.assignedSlot||e.parentNode||(o(e)?e.host:null)||d(e)}function x(e){return[\"html\",\"body\",\"#document\"].indexOf(l(e))>=0?e.ownerDocument.body:r(e)&&v(e)?e:x(b(e))}function w(e,n){var r;void 0===n&&(n=[]);var o=x(e),i=o===(null==(r=e.ownerDocument)?void 0:r.body),a=t(o),s=i?[a].concat(a.visualViewport||[],v(o)?o:[]):o,f=n.concat(s);return i?f:f.concat(w(b(s)))}function O(e){return[\"table\",\"td\",\"th\"].indexOf(l(e))>=0}function j(e){return r(e)&&\"fixed\"!==m(e).position?e.offsetParent:null}function E(e){for(var n=t(e),i=j(e);i&&O(i)&&\"static\"===m(i).position;)i=j(i);return i&&(\"html\"===l(i)||\"body\"===l(i)&&\"static\"===m(i).position)?n:i||function(e){var t=/firefox/i.test(f());if(/Trident/i.test(f())&&r(e)&&\"fixed\"===m(e).position)return null;var n=b(e);for(o(n)&&(n=n.host);r(n)&&[\"html\",\"body\"].indexOf(l(n))<0;){var i=m(n);if(\"none\"!==i.transform||\"none\"!==i.perspective||\"paint\"===i.contain||-1!==[\"transform\",\"perspective\"].indexOf(i.willChange)||t&&\"filter\"===i.willChange||t&&i.filter&&\"none\"!==i.filter)return n;n=n.parentNode}return null}(e)||n}var D=\"top\",A=\"bottom\",L=\"right\",P=\"left\",M=\"auto\",k=[D,A,L,P],W=\"start\",B=\"end\",H=\"viewport\",T=\"popper\",R=k.reduce((function(e,t){return e.concat([t+\"-\"+W,t+\"-\"+B])}),[]),S=[].concat(k,[M]).reduce((function(e,t){return e.concat([t,t+\"-\"+W,t+\"-\"+B])}),[]),V=[\"beforeRead\",\"read\",\"afterRead\",\"beforeMain\",\"main\",\"afterMain\",\"beforeWrite\",\"write\",\"afterWrite\"];function q(e){var t=new Map,n=new Set,r=[];function o(e){n.add(e.name),[].concat(e.requires||[],e.requiresIfExists||[]).forEach((function(e){if(!n.has(e)){var r=t.get(e);r&&o(r)}})),r.push(e)}return e.forEach((function(e){t.set(e.name,e)})),e.forEach((function(e){n.has(e.name)||o(e)})),r}function C(e,t){var n=t.getRootNode&&t.getRootNode();if(e.contains(t))return!0;if(n&&o(n)){var r=t;do{if(r&&e.isSameNode(r))return!0;r=r.parentNode||r.host}while(r)}return!1}function N(e){return Object.assign({},e,{left:e.x,top:e.y,right:e.x+e.width,bottom:e.y+e.height})}function I(e,r,o){return r===H?N(function(e,n){var r=t(e),o=d(e),i=r.visualViewport,a=o.clientWidth,s=o.clientHeight,f=0,p=0;if(i){a=i.width,s=i.height;var u=c();(u||!u&&\"fixed\"===n)&&(f=i.offsetLeft,p=i.offsetTop)}return{width:a,height:s,x:f+h(e),y:p}}(e,o)):n(r)?function(e,t){var n=p(e,!1,\"fixed\"===t);return n.top=n.top+e.clientTop,n.left=n.left+e.clientLeft,n.bottom=n.top+e.clientHeight,n.right=n.left+e.clientWidth,n.width=e.clientWidth,n.height=e.clientHeight,n.x=n.left,n.y=n.top,n}(r,o):N(function(e){var t,n=d(e),r=u(e),o=null==(t=e.ownerDocument)?void 0:t.body,a=i(n.scrollWidth,n.clientWidth,o?o.scrollWidth:0,o?o.clientWidth:0),s=i(n.scrollHeight,n.clientHeight,o?o.scrollHeight:0,o?o.clientHeight:0),f=-r.scrollLeft+h(e),c=-r.scrollTop;return\"rtl\"===m(o||n).direction&&(f+=i(n.clientWidth,o?o.clientWidth:0)-a),{width:a,height:s,x:f,y:c}}(d(e)))}function _(e,t,o,s){var f=\"clippingParents\"===t?function(e){var t=w(b(e)),o=[\"absolute\",\"fixed\"].indexOf(m(e).position)>=0&&r(e)?E(e):e;return n(o)?t.filter((function(e){return n(e)&&C(e,o)&&\"body\"!==l(e)})):[]}(e):[].concat(t),c=[].concat(f,[o]),p=c[0],u=c.reduce((function(t,n){var r=I(e,n,s);return t.top=i(r.top,t.top),t.right=a(r.right,t.right),t.bottom=a(r.bottom,t.bottom),t.left=i(r.left,t.left),t}),I(e,p,s));return u.width=u.right-u.left,u.height=u.bottom-u.top,u.x=u.left,u.y=u.top,u}function F(e){return e.split(\"-\")[0]}function U(e){return e.split(\"-\")[1]}function z(e){return[\"top\",\"bottom\"].indexOf(e)>=0?\"x\":\"y\"}function X(e){var t,n=e.reference,r=e.element,o=e.placement,i=o?F(o):null,a=o?U(o):null,s=n.x+n.width/2-r.width/2,f=n.y+n.height/2-r.height/2;switch(i){case D:t={x:s,y:n.y-r.height};break;case A:t={x:s,y:n.y+n.height};break;case L:t={x:n.x+n.width,y:f};break;case P:t={x:n.x-r.width,y:f};break;default:t={x:n.x,y:n.y}}var c=i?z(i):null;if(null!=c){var p=\"y\"===c?\"height\":\"width\";switch(a){case W:t[c]=t[c]-(n[p]/2-r[p]/2);break;case B:t[c]=t[c]+(n[p]/2-r[p]/2)}}return t}function Y(e){return Object.assign({},{top:0,right:0,bottom:0,left:0},e)}function G(e,t){return t.reduce((function(t,n){return t[n]=e,t}),{})}function J(e,t){void 0===t&&(t={});var r=t,o=r.placement,i=void 0===o?e.placement:o,a=r.strategy,s=void 0===a?e.strategy:a,f=r.boundary,c=void 0===f?\"clippingParents\":f,u=r.rootBoundary,l=void 0===u?H:u,h=r.elementContext,m=void 0===h?T:h,v=r.altBoundary,y=void 0!==v&&v,g=r.padding,b=void 0===g?0:g,x=Y(\"number\"!=typeof b?b:G(b,k)),w=m===T?\"reference\":T,O=e.rects.popper,j=e.elements[y?w:m],E=_(n(j)?j:j.contextElement||d(e.elements.popper),c,l,s),P=p(e.elements.reference),M=X({reference:P,element:O,strategy:\"absolute\",placement:i}),W=N(Object.assign({},O,M)),B=m===T?W:P,R={top:E.top-B.top+x.top,bottom:B.bottom-E.bottom+x.bottom,left:E.left-B.left+x.left,right:B.right-E.right+x.right},S=e.modifiersData.offset;if(m===T&&S){var V=S[i];Object.keys(R).forEach((function(e){var t=[L,A].indexOf(e)>=0?1:-1,n=[D,A].indexOf(e)>=0?\"y\":\"x\";R[e]+=V[n]*t}))}return R}var K={placement:\"bottom\",modifiers:[],strategy:\"absolute\"};function Q(){for(var e=arguments.length,t=new Array(e),n=0;n<e;n++)t[n]=arguments[n];return!t.some((function(e){return!(e&&\"function\"==typeof e.getBoundingClientRect)}))}function Z(e){void 0===e&&(e={});var t=e,r=t.defaultModifiers,o=void 0===r?[]:r,i=t.defaultOptions,a=void 0===i?K:i;return function(e,t,r){void 0===r&&(r=a);var i,s,f={placement:\"bottom\",orderedModifiers:[],options:Object.assign({},K,a),modifiersData:{},elements:{reference:e,popper:t},attributes:{},styles:{}},c=[],p=!1,u={state:f,setOptions:function(r){var i=\"function\"==typeof r?r(f.options):r;l(),f.options=Object.assign({},a,f.options,i),f.scrollParents={reference:n(e)?w(e):e.contextElement?w(e.contextElement):[],popper:w(t)};var s,p,d=function(e){var t=q(e);return V.reduce((function(e,n){return e.concat(t.filter((function(e){return e.phase===n})))}),[])}((s=[].concat(o,f.options.modifiers),p=s.reduce((function(e,t){var n=e[t.name];return e[t.name]=n?Object.assign({},n,t,{options:Object.assign({},n.options,t.options),data:Object.assign({},n.data,t.data)}):t,e}),{}),Object.keys(p).map((function(e){return p[e]}))));return f.orderedModifiers=d.filter((function(e){return e.enabled})),f.orderedModifiers.forEach((function(e){var t=e.name,n=e.options,r=void 0===n?{}:n,o=e.effect;if(\"function\"==typeof o){var i=o({state:f,name:t,instance:u,options:r}),a=function(){};c.push(i||a)}})),u.update()},forceUpdate:function(){if(!p){var e=f.elements,t=e.reference,n=e.popper;if(Q(t,n)){f.rects={reference:y(t,E(n),\"fixed\"===f.options.strategy),popper:g(n)},f.reset=!1,f.placement=f.options.placement,f.orderedModifiers.forEach((function(e){return f.modifiersData[e.name]=Object.assign({},e.data)}));for(var r=0;r<f.orderedModifiers.length;r++)if(!0!==f.reset){var o=f.orderedModifiers[r],i=o.fn,a=o.options,s=void 0===a?{}:a,c=o.name;\"function\"==typeof i&&(f=i({state:f,options:s,name:c,instance:u})||f)}else f.reset=!1,r=-1}}},update:(i=function(){return new Promise((function(e){u.forceUpdate(),e(f)}))},function(){return s||(s=new Promise((function(e){Promise.resolve().then((function(){s=void 0,e(i())}))}))),s}),destroy:function(){l(),p=!0}};if(!Q(e,t))return u;function l(){c.forEach((function(e){return e()})),c=[]}return u.setOptions(r).then((function(e){!p&&r.onFirstUpdate&&r.onFirstUpdate(e)})),u}}var $={passive:!0};var ee={name:\"eventListeners\",enabled:!0,phase:\"write\",fn:function(){},effect:function(e){var n=e.state,r=e.instance,o=e.options,i=o.scroll,a=void 0===i||i,s=o.resize,f=void 0===s||s,c=t(n.elements.popper),p=[].concat(n.scrollParents.reference,n.scrollParents.popper);return a&&p.forEach((function(e){e.addEventListener(\"scroll\",r.update,$)})),f&&c.addEventListener(\"resize\",r.update,$),function(){a&&p.forEach((function(e){e.removeEventListener(\"scroll\",r.update,$)})),f&&c.removeEventListener(\"resize\",r.update,$)}},data:{}};var te={name:\"popperOffsets\",enabled:!0,phase:\"read\",fn:function(e){var t=e.state,n=e.name;t.modifiersData[n]=X({reference:t.rects.reference,element:t.rects.popper,strategy:\"absolute\",placement:t.placement})},data:{}},ne={top:\"auto\",right:\"auto\",bottom:\"auto\",left:\"auto\"};function re(e){var n,r=e.popper,o=e.popperRect,i=e.placement,a=e.variation,f=e.offsets,c=e.position,p=e.gpuAcceleration,u=e.adaptive,l=e.roundOffsets,h=e.isFixed,v=f.x,y=void 0===v?0:v,g=f.y,b=void 0===g?0:g,x=\"function\"==typeof l?l({x:y,y:b}):{x:y,y:b};y=x.x,b=x.y;var w=f.hasOwnProperty(\"x\"),O=f.hasOwnProperty(\"y\"),j=P,M=D,k=window;if(u){var W=E(r),H=\"clientHeight\",T=\"clientWidth\";if(W===t(r)&&\"static\"!==m(W=d(r)).position&&\"absolute\"===c&&(H=\"scrollHeight\",T=\"scrollWidth\"),W=W,i===D||(i===P||i===L)&&a===B)M=A,b-=(h&&W===k&&k.visualViewport?k.visualViewport.height:W[H])-o.height,b*=p?1:-1;if(i===P||(i===D||i===A)&&a===B)j=L,y-=(h&&W===k&&k.visualViewport?k.visualViewport.width:W[T])-o.width,y*=p?1:-1}var R,S=Object.assign({position:c},u&&ne),V=!0===l?function(e,t){var n=e.x,r=e.y,o=t.devicePixelRatio||1;return{x:s(n*o)/o||0,y:s(r*o)/o||0}}({x:y,y:b},t(r)):{x:y,y:b};return y=V.x,b=V.y,p?Object.assign({},S,((R={})[M]=O?\"0\":\"\",R[j]=w?\"0\":\"\",R.transform=(k.devicePixelRatio||1)<=1?\"translate(\"+y+\"px, \"+b+\"px)\":\"translate3d(\"+y+\"px, \"+b+\"px, 0)\",R)):Object.assign({},S,((n={})[M]=O?b+\"px\":\"\",n[j]=w?y+\"px\":\"\",n.transform=\"\",n))}var oe={name:\"computeStyles\",enabled:!0,phase:\"beforeWrite\",fn:function(e){var t=e.state,n=e.options,r=n.gpuAcceleration,o=void 0===r||r,i=n.adaptive,a=void 0===i||i,s=n.roundOffsets,f=void 0===s||s,c={placement:F(t.placement),variation:U(t.placement),popper:t.elements.popper,popperRect:t.rects.popper,gpuAcceleration:o,isFixed:\"fixed\"===t.options.strategy};null!=t.modifiersData.popperOffsets&&(t.styles.popper=Object.assign({},t.styles.popper,re(Object.assign({},c,{offsets:t.modifiersData.popperOffsets,position:t.options.strategy,adaptive:a,roundOffsets:f})))),null!=t.modifiersData.arrow&&(t.styles.arrow=Object.assign({},t.styles.arrow,re(Object.assign({},c,{offsets:t.modifiersData.arrow,position:\"absolute\",adaptive:!1,roundOffsets:f})))),t.attributes.popper=Object.assign({},t.attributes.popper,{\"data-popper-placement\":t.placement})},data:{}};var ie={name:\"applyStyles\",enabled:!0,phase:\"write\",fn:function(e){var t=e.state;Object.keys(t.elements).forEach((function(e){var n=t.styles[e]||{},o=t.attributes[e]||{},i=t.elements[e];r(i)&&l(i)&&(Object.assign(i.style,n),Object.keys(o).forEach((function(e){var t=o[e];!1===t?i.removeAttribute(e):i.setAttribute(e,!0===t?\"\":t)})))}))},effect:function(e){var t=e.state,n={popper:{position:t.options.strategy,left:\"0\",top:\"0\",margin:\"0\"},arrow:{position:\"absolute\"},reference:{}};return Object.assign(t.elements.popper.style,n.popper),t.styles=n,t.elements.arrow&&Object.assign(t.elements.arrow.style,n.arrow),function(){Object.keys(t.elements).forEach((function(e){var o=t.elements[e],i=t.attributes[e]||{},a=Object.keys(t.styles.hasOwnProperty(e)?t.styles[e]:n[e]).reduce((function(e,t){return e[t]=\"\",e}),{});r(o)&&l(o)&&(Object.assign(o.style,a),Object.keys(i).forEach((function(e){o.removeAttribute(e)})))}))}},requires:[\"computeStyles\"]};var ae={name:\"offset\",enabled:!0,phase:\"main\",requires:[\"popperOffsets\"],fn:function(e){var t=e.state,n=e.options,r=e.name,o=n.offset,i=void 0===o?[0,0]:o,a=S.reduce((function(e,n){return e[n]=function(e,t,n){var r=F(e),o=[P,D].indexOf(r)>=0?-1:1,i=\"function\"==typeof n?n(Object.assign({},t,{placement:e})):n,a=i[0],s=i[1];return a=a||0,s=(s||0)*o,[P,L].indexOf(r)>=0?{x:s,y:a}:{x:a,y:s}}(n,t.rects,i),e}),{}),s=a[t.placement],f=s.x,c=s.y;null!=t.modifiersData.popperOffsets&&(t.modifiersData.popperOffsets.x+=f,t.modifiersData.popperOffsets.y+=c),t.modifiersData[r]=a}},se={left:\"right\",right:\"left\",bottom:\"top\",top:\"bottom\"};function fe(e){return e.replace(/left|right|bottom|top/g,(function(e){return se[e]}))}var ce={start:\"end\",end:\"start\"};function pe(e){return e.replace(/start|end/g,(function(e){return ce[e]}))}function ue(e,t){void 0===t&&(t={});var n=t,r=n.placement,o=n.boundary,i=n.rootBoundary,a=n.padding,s=n.flipVariations,f=n.allowedAutoPlacements,c=void 0===f?S:f,p=U(r),u=p?s?R:R.filter((function(e){return U(e)===p})):k,l=u.filter((function(e){return c.indexOf(e)>=0}));0===l.length&&(l=u);var d=l.reduce((function(t,n){return t[n]=J(e,{placement:n,boundary:o,rootBoundary:i,padding:a})[F(n)],t}),{});return Object.keys(d).sort((function(e,t){return d[e]-d[t]}))}var le={name:\"flip\",enabled:!0,phase:\"main\",fn:function(e){var t=e.state,n=e.options,r=e.name;if(!t.modifiersData[r]._skip){for(var o=n.mainAxis,i=void 0===o||o,a=n.altAxis,s=void 0===a||a,f=n.fallbackPlacements,c=n.padding,p=n.boundary,u=n.rootBoundary,l=n.altBoundary,d=n.flipVariations,h=void 0===d||d,m=n.allowedAutoPlacements,v=t.options.placement,y=F(v),g=f||(y===v||!h?[fe(v)]:function(e){if(F(e)===M)return[];var t=fe(e);return[pe(e),t,pe(t)]}(v)),b=[v].concat(g).reduce((function(e,n){return e.concat(F(n)===M?ue(t,{placement:n,boundary:p,rootBoundary:u,padding:c,flipVariations:h,allowedAutoPlacements:m}):n)}),[]),x=t.rects.reference,w=t.rects.popper,O=new Map,j=!0,E=b[0],k=0;k<b.length;k++){var B=b[k],H=F(B),T=U(B)===W,R=[D,A].indexOf(H)>=0,S=R?\"width\":\"height\",V=J(t,{placement:B,boundary:p,rootBoundary:u,altBoundary:l,padding:c}),q=R?T?L:P:T?A:D;x[S]>w[S]&&(q=fe(q));var C=fe(q),N=[];if(i&&N.push(V[H]<=0),s&&N.push(V[q]<=0,V[C]<=0),N.every((function(e){return e}))){E=B,j=!1;break}O.set(B,N)}if(j)for(var I=function(e){var t=b.find((function(t){var n=O.get(t);if(n)return n.slice(0,e).every((function(e){return e}))}));if(t)return E=t,\"break\"},_=h?3:1;_>0;_--){if(\"break\"===I(_))break}t.placement!==E&&(t.modifiersData[r]._skip=!0,t.placement=E,t.reset=!0)}},requiresIfExists:[\"offset\"],data:{_skip:!1}};function de(e,t,n){return i(e,a(t,n))}var he={name:\"preventOverflow\",enabled:!0,phase:\"main\",fn:function(e){var t=e.state,n=e.options,r=e.name,o=n.mainAxis,s=void 0===o||o,f=n.altAxis,c=void 0!==f&&f,p=n.boundary,u=n.rootBoundary,l=n.altBoundary,d=n.padding,h=n.tether,m=void 0===h||h,v=n.tetherOffset,y=void 0===v?0:v,b=J(t,{boundary:p,rootBoundary:u,padding:d,altBoundary:l}),x=F(t.placement),w=U(t.placement),O=!w,j=z(x),M=\"x\"===j?\"y\":\"x\",k=t.modifiersData.popperOffsets,B=t.rects.reference,H=t.rects.popper,T=\"function\"==typeof y?y(Object.assign({},t.rects,{placement:t.placement})):y,R=\"number\"==typeof T?{mainAxis:T,altAxis:T}:Object.assign({mainAxis:0,altAxis:0},T),S=t.modifiersData.offset?t.modifiersData.offset[t.placement]:null,V={x:0,y:0};if(k){if(s){var q,C=\"y\"===j?D:P,N=\"y\"===j?A:L,I=\"y\"===j?\"height\":\"width\",_=k[j],X=_+b[C],Y=_-b[N],G=m?-H[I]/2:0,K=w===W?B[I]:H[I],Q=w===W?-H[I]:-B[I],Z=t.elements.arrow,$=m&&Z?g(Z):{width:0,height:0},ee=t.modifiersData[\"arrow#persistent\"]?t.modifiersData[\"arrow#persistent\"].padding:{top:0,right:0,bottom:0,left:0},te=ee[C],ne=ee[N],re=de(0,B[I],$[I]),oe=O?B[I]/2-G-re-te-R.mainAxis:K-re-te-R.mainAxis,ie=O?-B[I]/2+G+re+ne+R.mainAxis:Q+re+ne+R.mainAxis,ae=t.elements.arrow&&E(t.elements.arrow),se=ae?\"y\"===j?ae.clientTop||0:ae.clientLeft||0:0,fe=null!=(q=null==S?void 0:S[j])?q:0,ce=_+ie-fe,pe=de(m?a(X,_+oe-fe-se):X,_,m?i(Y,ce):Y);k[j]=pe,V[j]=pe-_}if(c){var ue,le=\"x\"===j?D:P,he=\"x\"===j?A:L,me=k[M],ve=\"y\"===M?\"height\":\"width\",ye=me+b[le],ge=me-b[he],be=-1!==[D,P].indexOf(x),xe=null!=(ue=null==S?void 0:S[M])?ue:0,we=be?ye:me-B[ve]-H[ve]-xe+R.altAxis,Oe=be?me+B[ve]+H[ve]-xe-R.altAxis:ge,je=m&&be?function(e,t,n){var r=de(e,t,n);return r>n?n:r}(we,me,Oe):de(m?we:ye,me,m?Oe:ge);k[M]=je,V[M]=je-me}t.modifiersData[r]=V}},requiresIfExists:[\"offset\"]};var me={name:\"arrow\",enabled:!0,phase:\"main\",fn:function(e){var t,n=e.state,r=e.name,o=e.options,i=n.elements.arrow,a=n.modifiersData.popperOffsets,s=F(n.placement),f=z(s),c=[P,L].indexOf(s)>=0?\"height\":\"width\";if(i&&a){var p=function(e,t){return Y(\"number\"!=typeof(e=\"function\"==typeof e?e(Object.assign({},t.rects,{placement:t.placement})):e)?e:G(e,k))}(o.padding,n),u=g(i),l=\"y\"===f?D:P,d=\"y\"===f?A:L,h=n.rects.reference[c]+n.rects.reference[f]-a[f]-n.rects.popper[c],m=a[f]-n.rects.reference[f],v=E(i),y=v?\"y\"===f?v.clientHeight||0:v.clientWidth||0:0,b=h/2-m/2,x=p[l],w=y-u[c]-p[d],O=y/2-u[c]/2+b,j=de(x,O,w),M=f;n.modifiersData[r]=((t={})[M]=j,t.centerOffset=j-O,t)}},effect:function(e){var t=e.state,n=e.options.element,r=void 0===n?\"[data-popper-arrow]\":n;null!=r&&(\"string\"!=typeof r||(r=t.elements.popper.querySelector(r)))&&C(t.elements.popper,r)&&(t.elements.arrow=r)},requires:[\"popperOffsets\"],requiresIfExists:[\"preventOverflow\"]};function ve(e,t,n){return void 0===n&&(n={x:0,y:0}),{top:e.top-t.height-n.y,right:e.right-t.width+n.x,bottom:e.bottom-t.height+n.y,left:e.left-t.width-n.x}}function ye(e){return[D,L,A,P].some((function(t){return e[t]>=0}))}var ge={name:\"hide\",enabled:!0,phase:\"main\",requiresIfExists:[\"preventOverflow\"],fn:function(e){var t=e.state,n=e.name,r=t.rects.reference,o=t.rects.popper,i=t.modifiersData.preventOverflow,a=J(t,{elementContext:\"reference\"}),s=J(t,{altBoundary:!0}),f=ve(a,r),c=ve(s,o,i),p=ye(f),u=ye(c);t.modifiersData[n]={referenceClippingOffsets:f,popperEscapeOffsets:c,isReferenceHidden:p,hasPopperEscaped:u},t.attributes.popper=Object.assign({},t.attributes.popper,{\"data-popper-reference-hidden\":p,\"data-popper-escaped\":u})}},be=Z({defaultModifiers:[ee,te,oe,ie]}),xe=[ee,te,oe,ie,ae,le,he,me,ge],we=Z({defaultModifiers:xe});e.applyStyles=ie,e.arrow=me,e.computeStyles=oe,e.createPopper=we,e.createPopperLite=be,e.defaultModifiers=xe,e.detectOverflow=J,e.eventListeners=ee,e.flip=le,e.hide=ge,e.offset=ae,e.popperGenerator=Z,e.popperOffsets=te,e.preventOverflow=he,Object.defineProperty(e,\"__esModule\",{value:!0})})); !function(e,t){\"object\"==typeof exports&&\"undefined\"!=typeof module?module.exports=t(require(\"@popperjs/core\")):\"function\"==typeof define&&define.amd?define([\"@popperjs/core\"],t):(e=e||self).tippy=t(e.Popper)}(this,(function(e){\"use strict\";var t={passive:!0,capture:!0},n=function(){return document.body};function r(e,t,n){if(Array.isArray(e)){var r=e[t];return null==r?Array.isArray(n)?n[t]:n:r}return e}function o(e,t){var n={}.toString.call(e);return 0===n.indexOf(\"[object\")&&n.indexOf(t+\"]\")>-1}function i(e,t){return\"function\"==typeof e?e.apply(void 0,t):e}function a(e,t){return 0===t?e:function(r){clearTimeout(n),n=setTimeout((function(){e(r)}),t)};var n}function s(e,t){var n=Object.assign({},e);return t.forEach((function(e){delete n[e]})),n}function u(e){return[].concat(e)}function c(e,t){-1===e.indexOf(t)&&e.push(t)}function p(e){return e.split(\"-\")[0]}function f(e){return[].slice.call(e)}function l(e){return Object.keys(e).reduce((function(t,n){return void 0!==e[n]&&(t[n]=e[n]),t}),{})}function d(){return document.createElement(\"div\")}function v(e){return[\"Element\",\"Fragment\"].some((function(t){return o(e,t)}))}function m(e){return o(e,\"MouseEvent\")}function g(e){return!(!e||!e._tippy||e._tippy.reference!==e)}function h(e){return v(e)?[e]:function(e){return o(e,\"NodeList\")}(e)?f(e):Array.isArray(e)?e:f(document.querySelectorAll(e))}function b(e,t){e.forEach((function(e){e&&(e.style.transitionDuration=t+\"ms\")}))}function y(e,t){e.forEach((function(e){e&&e.setAttribute(\"data-state\",t)}))}function w(e){var t,n=u(e)[0];return null!=n&&null!=(t=n.ownerDocument)&&t.body?n.ownerDocument:document}function E(e,t,n){var r=t+\"EventListener\";[\"transitionend\",\"webkitTransitionEnd\"].forEach((function(t){e[r](t,n)}))}function O(e,t){for(var n=t;n;){var r;if(e.contains(n))return!0;n=null==n.getRootNode||null==(r=n.getRootNode())?void 0:r.host}return!1}var x={isTouch:!1},C=0;function T(){x.isTouch||(x.isTouch=!0,window.performance&&document.addEventListener(\"mousemove\",A))}function A(){var e=performance.now();e-C<20&&(x.isTouch=!1,document.removeEventListener(\"mousemove\",A)),C=e}function L(){var e=document.activeElement;if(g(e)){var t=e._tippy;e.blur&&!t.state.isVisible&&e.blur()}}var D=!!(\"undefined\"!=typeof window&&\"undefined\"!=typeof document)&&!!window.msCrypto,R=Object.assign({appendTo:n,aria:{content:\"auto\",expanded:\"auto\"},delay:0,duration:[300,250],getReferenceClientRect:null,hideOnClick:!0,ignoreAttributes:!1,interactive:!1,interactiveBorder:2,interactiveDebounce:0,moveTransition:\"\",offset:[0,10],onAfterUpdate:function(){},onBeforeUpdate:function(){},onCreate:function(){},onDestroy:function(){},onHidden:function(){},onHide:function(){},onMount:function(){},onShow:function(){},onShown:function(){},onTrigger:function(){},onUntrigger:function(){},onClickOutside:function(){},placement:\"top\",plugins:[],popperOptions:{},render:null,showOnCreate:!1,touch:!0,trigger:\"mouseenter focus\",triggerTarget:null},{animateFill:!1,followCursor:!1,inlinePositioning:!1,sticky:!1},{allowHTML:!1,animation:\"fade\",arrow:!0,content:\"\",inertia:!1,maxWidth:350,role:\"tooltip\",theme:\"\",zIndex:9999}),k=Object.keys(R);function P(e){var t=(e.plugins||[]).reduce((function(t,n){var r,o=n.name,i=n.defaultValue;o&&(t[o]=void 0!==e[o]?e[o]:null!=(r=R[o])?r:i);return t}),{});return Object.assign({},e,t)}function j(e,t){var n=Object.assign({},t,{content:i(t.content,[e])},t.ignoreAttributes?{}:function(e,t){return(t?Object.keys(P(Object.assign({},R,{plugins:t}))):k).reduce((function(t,n){var r=(e.getAttribute(\"data-tippy-\"+n)||\"\").trim();if(!r)return t;if(\"content\"===n)t[n]=r;else try{t[n]=JSON.parse(r)}catch(e){t[n]=r}return t}),{})}(e,t.plugins));return n.aria=Object.assign({},R.aria,n.aria),n.aria={expanded:\"auto\"===n.aria.expanded?t.interactive:n.aria.expanded,content:\"auto\"===n.aria.content?t.interactive?null:\"describedby\":n.aria.content},n}function M(e,t){e.innerHTML=t}function V(e){var t=d();return!0===e?t.className=\"tippy-arrow\":(t.className=\"tippy-svg-arrow\",v(e)?t.appendChild(e):M(t,e)),t}function I(e,t){v(t.content)?(M(e,\"\"),e.appendChild(t.content)):\"function\"!=typeof t.content&&(t.allowHTML?M(e,t.content):e.textContent=t.content)}function S(e){var t=e.firstElementChild,n=f(t.children);return{box:t,content:n.find((function(e){return e.classList.contains(\"tippy-content\")})),arrow:n.find((function(e){return e.classList.contains(\"tippy-arrow\")||e.classList.contains(\"tippy-svg-arrow\")})),backdrop:n.find((function(e){return e.classList.contains(\"tippy-backdrop\")}))}}function N(e){var t=d(),n=d();n.className=\"tippy-box\",n.setAttribute(\"data-state\",\"hidden\"),n.setAttribute(\"tabindex\",\"-1\");var r=d();function o(n,r){var o=S(t),i=o.box,a=o.content,s=o.arrow;r.theme?i.setAttribute(\"data-theme\",r.theme):i.removeAttribute(\"data-theme\"),\"string\"==typeof r.animation?i.setAttribute(\"data-animation\",r.animation):i.removeAttribute(\"data-animation\"),r.inertia?i.setAttribute(\"data-inertia\",\"\"):i.removeAttribute(\"data-inertia\"),i.style.maxWidth=\"number\"==typeof r.maxWidth?r.maxWidth+\"px\":r.maxWidth,r.role?i.setAttribute(\"role\",r.role):i.removeAttribute(\"role\"),n.content===r.content&&n.allowHTML===r.allowHTML||I(a,e.props),r.arrow?s?n.arrow!==r.arrow&&(i.removeChild(s),i.appendChild(V(r.arrow))):i.appendChild(V(r.arrow)):s&&i.removeChild(s)}return r.className=\"tippy-content\",r.setAttribute(\"data-state\",\"hidden\"),I(r,e.props),t.appendChild(n),n.appendChild(r),o(e.props,e.props),{popper:t,onUpdate:o}}N.$$tippy=!0;var B=1,H=[],U=[];function _(o,s){var v,g,h,C,T,A,L,k,M=j(o,Object.assign({},R,P(l(s)))),V=!1,I=!1,N=!1,_=!1,F=[],W=a(we,M.interactiveDebounce),X=B++,Y=(k=M.plugins).filter((function(e,t){return k.indexOf(e)===t})),$={id:X,reference:o,popper:d(),popperInstance:null,props:M,state:{isEnabled:!0,isVisible:!1,isDestroyed:!1,isMounted:!1,isShown:!1},plugins:Y,clearDelayTimeouts:function(){clearTimeout(v),clearTimeout(g),cancelAnimationFrame(h)},setProps:function(e){if($.state.isDestroyed)return;ae(\"onBeforeUpdate\",[$,e]),be();var t=$.props,n=j(o,Object.assign({},t,l(e),{ignoreAttributes:!0}));$.props=n,he(),t.interactiveDebounce!==n.interactiveDebounce&&(ce(),W=a(we,n.interactiveDebounce));t.triggerTarget&&!n.triggerTarget?u(t.triggerTarget).forEach((function(e){e.removeAttribute(\"aria-expanded\")})):n.triggerTarget&&o.removeAttribute(\"aria-expanded\");ue(),ie(),J&&J(t,n);$.popperInstance&&(Ce(),Ae().forEach((function(e){requestAnimationFrame(e._tippy.popperInstance.forceUpdate)})));ae(\"onAfterUpdate\",[$,e])},setContent:function(e){$.setProps({content:e})},show:function(){var e=$.state.isVisible,t=$.state.isDestroyed,o=!$.state.isEnabled,a=x.isTouch&&!$.props.touch,s=r($.props.duration,0,R.duration);if(e||t||o||a)return;if(te().hasAttribute(\"disabled\"))return;if(ae(\"onShow\",[$],!1),!1===$.props.onShow($))return;$.state.isVisible=!0,ee()&&(z.style.visibility=\"visible\");ie(),de(),$.state.isMounted||(z.style.transition=\"none\");if(ee()){var u=re(),p=u.box,f=u.content;b([p,f],0)}A=function(){var e;if($.state.isVisible&&!_){if(_=!0,z.offsetHeight,z.style.transition=$.props.moveTransition,ee()&&$.props.animation){var t=re(),n=t.box,r=t.content;b([n,r],s),y([n,r],\"visible\")}se(),ue(),c(U,$),null==(e=$.popperInstance)||e.forceUpdate(),ae(\"onMount\",[$]),$.props.animation&&ee()&&function(e,t){me(e,t)}(s,(function(){$.state.isShown=!0,ae(\"onShown\",[$])}))}},function(){var e,t=$.props.appendTo,r=te();e=$.props.interactive&&t===n||\"parent\"===t?r.parentNode:i(t,[r]);e.contains(z)||e.appendChild(z);$.state.isMounted=!0,Ce()}()},hide:function(){var e=!$.state.isVisible,t=$.state.isDestroyed,n=!$.state.isEnabled,o=r($.props.duration,1,R.duration);if(e||t||n)return;if(ae(\"onHide\",[$],!1),!1===$.props.onHide($))return;$.state.isVisible=!1,$.state.isShown=!1,_=!1,V=!1,ee()&&(z.style.visibility=\"hidden\");if(ce(),ve(),ie(!0),ee()){var i=re(),a=i.box,s=i.content;$.props.animation&&(b([a,s],o),y([a,s],\"hidden\"))}se(),ue(),$.props.animation?ee()&&function(e,t){me(e,(function(){!$.state.isVisible&&z.parentNode&&z.parentNode.contains(z)&&t()}))}(o,$.unmount):$.unmount()},hideWithInteractivity:function(e){ne().addEventListener(\"mousemove\",W),c(H,W),W(e)},enable:function(){$.state.isEnabled=!0},disable:function(){$.hide(),$.state.isEnabled=!1},unmount:function(){$.state.isVisible&&$.hide();if(!$.state.isMounted)return;Te(),Ae().forEach((function(e){e._tippy.unmount()})),z.parentNode&&z.parentNode.removeChild(z);U=U.filter((function(e){return e!==$})),$.state.isMounted=!1,ae(\"onHidden\",[$])},destroy:function(){if($.state.isDestroyed)return;$.clearDelayTimeouts(),$.unmount(),be(),delete o._tippy,$.state.isDestroyed=!0,ae(\"onDestroy\",[$])}};if(!M.render)return $;var q=M.render($),z=q.popper,J=q.onUpdate;z.setAttribute(\"data-tippy-root\",\"\"),z.id=\"tippy-\"+$.id,$.popper=z,o._tippy=$,z._tippy=$;var G=Y.map((function(e){return e.fn($)})),K=o.hasAttribute(\"aria-expanded\");return he(),ue(),ie(),ae(\"onCreate\",[$]),M.showOnCreate&&Le(),z.addEventListener(\"mouseenter\",(function(){$.props.interactive&&$.state.isVisible&&$.clearDelayTimeouts()})),z.addEventListener(\"mouseleave\",(function(){$.props.interactive&&$.props.trigger.indexOf(\"mouseenter\")>=0&&ne().addEventListener(\"mousemove\",W)})),$;function Q(){var e=$.props.touch;return Array.isArray(e)?e:[e,0]}function Z(){return\"hold\"===Q()[0]}function ee(){var e;return!(null==(e=$.props.render)||!e.$$tippy)}function te(){return L||o}function ne(){var e=te().parentNode;return e?w(e):document}function re(){return S(z)}function oe(e){return $.state.isMounted&&!$.state.isVisible||x.isTouch||C&&\"focus\"===C.type?0:r($.props.delay,e?0:1,R.delay)}function ie(e){void 0===e&&(e=!1),z.style.pointerEvents=$.props.interactive&&!e?\"\":\"none\",z.style.zIndex=\"\"+$.props.zIndex}function ae(e,t,n){var r;(void 0===n&&(n=!0),G.forEach((function(n){n[e]&&n[e].apply(n,t)})),n)&&(r=$.props)[e].apply(r,t)}function se(){var e=$.props.aria;if(e.content){var t=\"aria-\"+e.content,n=z.id;u($.props.triggerTarget||o).forEach((function(e){var r=e.getAttribute(t);if($.state.isVisible)e.setAttribute(t,r?r+\" \"+n:n);else{var o=r&&r.replace(n,\"\").trim();o?e.setAttribute(t,o):e.removeAttribute(t)}}))}}function ue(){!K&&$.props.aria.expanded&&u($.props.triggerTarget||o).forEach((function(e){$.props.interactive?e.setAttribute(\"aria-expanded\",$.state.isVisible&&e===te()?\"true\":\"false\"):e.removeAttribute(\"aria-expanded\")}))}function ce(){ne().removeEventListener(\"mousemove\",W),H=H.filter((function(e){return e!==W}))}function pe(e){if(!x.isTouch||!N&&\"mousedown\"!==e.type){var t=e.composedPath&&e.composedPath()[0]||e.target;if(!$.props.interactive||!O(z,t)){if(u($.props.triggerTarget||o).some((function(e){return O(e,t)}))){if(x.isTouch)return;if($.state.isVisible&&$.props.trigger.indexOf(\"click\")>=0)return}else ae(\"onClickOutside\",[$,e]);!0===$.props.hideOnClick&&($.clearDelayTimeouts(),$.hide(),I=!0,setTimeout((function(){I=!1})),$.state.isMounted||ve())}}}function fe(){N=!0}function le(){N=!1}function de(){var e=ne();e.addEventListener(\"mousedown\",pe,!0),e.addEventListener(\"touchend\",pe,t),e.addEventListener(\"touchstart\",le,t),e.addEventListener(\"touchmove\",fe,t)}function ve(){var e=ne();e.removeEventListener(\"mousedown\",pe,!0),e.removeEventListener(\"touchend\",pe,t),e.removeEventListener(\"touchstart\",le,t),e.removeEventListener(\"touchmove\",fe,t)}function me(e,t){var n=re().box;function r(e){e.target===n&&(E(n,\"remove\",r),t())}if(0===e)return t();E(n,\"remove\",T),E(n,\"add\",r),T=r}function ge(e,t,n){void 0===n&&(n=!1),u($.props.triggerTarget||o).forEach((function(r){r.addEventListener(e,t,n),F.push({node:r,eventType:e,handler:t,options:n})}))}function he(){var e;Z()&&(ge(\"touchstart\",ye,{passive:!0}),ge(\"touchend\",Ee,{passive:!0})),(e=$.props.trigger,e.split(/\\s+/).filter(Boolean)).forEach((function(e){if(\"manual\"!==e)switch(ge(e,ye),e){case\"mouseenter\":ge(\"mouseleave\",Ee);break;case\"focus\":ge(D?\"focusout\":\"blur\",Oe);break;case\"focusin\":ge(\"focusout\",Oe)}}))}function be(){F.forEach((function(e){var t=e.node,n=e.eventType,r=e.handler,o=e.options;t.removeEventListener(n,r,o)})),F=[]}function ye(e){var t,n=!1;if($.state.isEnabled&&!xe(e)&&!I){var r=\"focus\"===(null==(t=C)?void 0:t.type);C=e,L=e.currentTarget,ue(),!$.state.isVisible&&m(e)&&H.forEach((function(t){return t(e)})),\"click\"===e.type&&($.props.trigger.indexOf(\"mouseenter\")<0||V)&&!1!==$.props.hideOnClick&&$.state.isVisible?n=!0:Le(e),\"click\"===e.type&&(V=!n),n&&!r&&De(e)}}function we(e){var t=e.target,n=te().contains(t)||z.contains(t);\"mousemove\"===e.type&&n||function(e,t){var n=t.clientX,r=t.clientY;return e.every((function(e){var t=e.popperRect,o=e.popperState,i=e.props.interactiveBorder,a=p(o.placement),s=o.modifiersData.offset;if(!s)return!0;var u=\"bottom\"===a?s.top.y:0,c=\"top\"===a?s.bottom.y:0,f=\"right\"===a?s.left.x:0,l=\"left\"===a?s.right.x:0,d=t.top-r+u>i,v=r-t.bottom-c>i,m=t.left-n+f>i,g=n-t.right-l>i;return d||v||m||g}))}(Ae().concat(z).map((function(e){var t,n=null==(t=e._tippy.popperInstance)?void 0:t.state;return n?{popperRect:e.getBoundingClientRect(),popperState:n,props:M}:null})).filter(Boolean),e)&&(ce(),De(e))}function Ee(e){xe(e)||$.props.trigger.indexOf(\"click\")>=0&&V||($.props.interactive?$.hideWithInteractivity(e):De(e))}function Oe(e){$.props.trigger.indexOf(\"focusin\")<0&&e.target!==te()||$.props.interactive&&e.relatedTarget&&z.contains(e.relatedTarget)||De(e)}function xe(e){return!!x.isTouch&&Z()!==e.type.indexOf(\"touch\")>=0}function Ce(){Te();var t=$.props,n=t.popperOptions,r=t.placement,i=t.offset,a=t.getReferenceClientRect,s=t.moveTransition,u=ee()?S(z).arrow:null,c=a?{getBoundingClientRect:a,contextElement:a.contextElement||te()}:o,p=[{name:\"offset\",options:{offset:i}},{name:\"preventOverflow\",options:{padding:{top:2,bottom:2,left:5,right:5}}},{name:\"flip\",options:{padding:5}},{name:\"computeStyles\",options:{adaptive:!s}},{name:\"$$tippy\",enabled:!0,phase:\"beforeWrite\",requires:[\"computeStyles\"],fn:function(e){var t=e.state;if(ee()){var n=re().box;[\"placement\",\"reference-hidden\",\"escaped\"].forEach((function(e){\"placement\"===e?n.setAttribute(\"data-placement\",t.placement):t.attributes.popper[\"data-popper-\"+e]?n.setAttribute(\"data-\"+e,\"\"):n.removeAttribute(\"data-\"+e)})),t.attributes.popper={}}}}];ee()&&u&&p.push({name:\"arrow\",options:{element:u,padding:3}}),p.push.apply(p,(null==n?void 0:n.modifiers)||[]),$.popperInstance=e.createPopper(c,z,Object.assign({},n,{placement:r,onFirstUpdate:A,modifiers:p}))}function Te(){$.popperInstance&&($.popperInstance.destroy(),$.popperInstance=null)}function Ae(){return f(z.querySelectorAll(\"[data-tippy-root]\"))}function Le(e){$.clearDelayTimeouts(),e&&ae(\"onTrigger\",[$,e]),de();var t=oe(!0),n=Q(),r=n[0],o=n[1];x.isTouch&&\"hold\"===r&&o&&(t=o),t?v=setTimeout((function(){$.show()}),t):$.show()}function De(e){if($.clearDelayTimeouts(),ae(\"onUntrigger\",[$,e]),$.state.isVisible){if(!($.props.trigger.indexOf(\"mouseenter\")>=0&&$.props.trigger.indexOf(\"click\")>=0&&[\"mouseleave\",\"mousemove\"].indexOf(e.type)>=0&&V)){var t=oe(!1);t?g=setTimeout((function(){$.state.isVisible&&$.hide()}),t):h=requestAnimationFrame((function(){$.hide()}))}}else ve()}}function F(e,n){void 0===n&&(n={});var r=R.plugins.concat(n.plugins||[]);document.addEventListener(\"touchstart\",T,t),window.addEventListener(\"blur\",L);var o=Object.assign({},n,{plugins:r}),i=h(e).reduce((function(e,t){var n=t&&_(t,o);return n&&e.push(n),e}),[]);return v(e)?i[0]:i}F.defaultProps=R,F.setDefaultProps=function(e){Object.keys(e).forEach((function(t){R[t]=e[t]}))},F.currentInput=x;var W=Object.assign({},e.applyStyles,{effect:function(e){var t=e.state,n={popper:{position:t.options.strategy,left:\"0\",top:\"0\",margin:\"0\"},arrow:{position:\"absolute\"},reference:{}};Object.assign(t.elements.popper.style,n.popper),t.styles=n,t.elements.arrow&&Object.assign(t.elements.arrow.style,n.arrow)}}),X={mouseover:\"mouseenter\",focusin:\"focus\",click:\"click\"};var Y={name:\"animateFill\",defaultValue:!1,fn:function(e){var t;if(null==(t=e.props.render)||!t.$$tippy)return{};var n=S(e.popper),r=n.box,o=n.content,i=e.props.animateFill?function(){var e=d();return e.className=\"tippy-backdrop\",y([e],\"hidden\"),e}():null;return{onCreate:function(){i&&(r.insertBefore(i,r.firstElementChild),r.setAttribute(\"data-animatefill\",\"\"),r.style.overflow=\"hidden\",e.setProps({arrow:!1,animation:\"shift-away\"}))},onMount:function(){if(i){var e=r.style.transitionDuration,t=Number(e.replace(\"ms\",\"\"));o.style.transitionDelay=Math.round(t/10)+\"ms\",i.style.transitionDuration=e,y([i],\"visible\")}},onShow:function(){i&&(i.style.transitionDuration=\"0ms\")},onHide:function(){i&&y([i],\"hidden\")}}}};var $={clientX:0,clientY:0},q=[];function z(e){var t=e.clientX,n=e.clientY;$={clientX:t,clientY:n}}var J={name:\"followCursor\",defaultValue:!1,fn:function(e){var t=e.reference,n=w(e.props.triggerTarget||t),r=!1,o=!1,i=!0,a=e.props;function s(){return\"initial\"===e.props.followCursor&&e.state.isVisible}function u(){n.addEventListener(\"mousemove\",f)}function c(){n.removeEventListener(\"mousemove\",f)}function p(){r=!0,e.setProps({getReferenceClientRect:null}),r=!1}function f(n){var r=!n.target||t.contains(n.target),o=e.props.followCursor,i=n.clientX,a=n.clientY,s=t.getBoundingClientRect(),u=i-s.left,c=a-s.top;!r&&e.props.interactive||e.setProps({getReferenceClientRect:function(){var e=t.getBoundingClientRect(),n=i,r=a;\"initial\"===o&&(n=e.left+u,r=e.top+c);var s=\"horizontal\"===o?e.top:r,p=\"vertical\"===o?e.right:n,f=\"horizontal\"===o?e.bottom:r,l=\"vertical\"===o?e.left:n;return{width:p-l,height:f-s,top:s,right:p,bottom:f,left:l}}})}function l(){e.props.followCursor&&(q.push({instance:e,doc:n}),function(e){e.addEventListener(\"mousemove\",z)}(n))}function d(){0===(q=q.filter((function(t){return t.instance!==e}))).filter((function(e){return e.doc===n})).length&&function(e){e.removeEventListener(\"mousemove\",z)}(n)}return{onCreate:l,onDestroy:d,onBeforeUpdate:function(){a=e.props},onAfterUpdate:function(t,n){var i=n.followCursor;r||void 0!==i&&a.followCursor!==i&&(d(),i?(l(),!e.state.isMounted||o||s()||u()):(c(),p()))},onMount:function(){e.props.followCursor&&!o&&(i&&(f($),i=!1),s()||u())},onTrigger:function(e,t){m(t)&&($={clientX:t.clientX,clientY:t.clientY}),o=\"focus\"===t.type},onHidden:function(){e.props.followCursor&&(p(),c(),i=!0)}}}};var G={name:\"inlinePositioning\",defaultValue:!1,fn:function(e){var t,n=e.reference;var r=-1,o=!1,i=[],a={name:\"tippyInlinePositioning\",enabled:!0,phase:\"afterWrite\",fn:function(o){var a=o.state;e.props.inlinePositioning&&(-1!==i.indexOf(a.placement)&&(i=[]),t!==a.placement&&-1===i.indexOf(a.placement)&&(i.push(a.placement),e.setProps({getReferenceClientRect:function(){return function(e){return function(e,t,n,r){if(n.length<2||null===e)return t;if(2===n.length&&r>=0&&n[0].left>n[1].right)return n[r]||t;switch(e){case\"top\":case\"bottom\":var o=n[0],i=n[n.length-1],a=\"top\"===e,s=o.top,u=i.bottom,c=a?o.left:i.left,p=a?o.right:i.right;return{top:s,bottom:u,left:c,right:p,width:p-c,height:u-s};case\"left\":case\"right\":var f=Math.min.apply(Math,n.map((function(e){return e.left}))),l=Math.max.apply(Math,n.map((function(e){return e.right}))),d=n.filter((function(t){return\"left\"===e?t.left===f:t.right===l})),v=d[0].top,m=d[d.length-1].bottom;return{top:v,bottom:m,left:f,right:l,width:l-f,height:m-v};default:return t}}(p(e),n.getBoundingClientRect(),f(n.getClientRects()),r)}(a.placement)}})),t=a.placement)}};function s(){var t;o||(t=function(e,t){var n;return{popperOptions:Object.assign({},e.popperOptions,{modifiers:[].concat(((null==(n=e.popperOptions)?void 0:n.modifiers)||[]).filter((function(e){return e.name!==t.name})),[t])})}}(e.props,a),o=!0,e.setProps(t),o=!1)}return{onCreate:s,onAfterUpdate:s,onTrigger:function(t,n){if(m(n)){var o=f(e.reference.getClientRects()),i=o.find((function(e){return e.left-2<=n.clientX&&e.right+2>=n.clientX&&e.top-2<=n.clientY&&e.bottom+2>=n.clientY})),a=o.indexOf(i);r=a>-1?a:r}},onHidden:function(){r=-1}}}};var K={name:\"sticky\",defaultValue:!1,fn:function(e){var t=e.reference,n=e.popper;function r(t){return!0===e.props.sticky||e.props.sticky===t}var o=null,i=null;function a(){var s=r(\"reference\")?(e.popperInstance?e.popperInstance.state.elements.reference:t).getBoundingClientRect():null,u=r(\"popper\")?n.getBoundingClientRect():null;(s&&Q(o,s)||u&&Q(i,u))&&e.popperInstance&&e.popperInstance.update(),o=s,i=u,e.state.isMounted&&requestAnimationFrame(a)}return{onMount:function(){e.props.sticky&&a()}}}};function Q(e,t){return!e||!t||(e.top!==t.top||e.right!==t.right||e.bottom!==t.bottom||e.left!==t.left)}return F.setDefaultProps({plugins:[Y,J,G,K],render:N}),F.createSingleton=function(e,t){var n;void 0===t&&(t={});var r,o=e,i=[],a=[],c=t.overrides,p=[],f=!1;function l(){a=o.map((function(e){return u(e.props.triggerTarget||e.reference)})).reduce((function(e,t){return e.concat(t)}),[])}function v(){i=o.map((function(e){return e.reference}))}function m(e){o.forEach((function(t){e?t.enable():t.disable()}))}function g(e){return o.map((function(t){var n=t.setProps;return t.setProps=function(o){n(o),t.reference===r&&e.setProps(o)},function(){t.setProps=n}}))}function h(e,t){var n=a.indexOf(t);if(t!==r){r=t;var s=(c||[]).concat(\"content\").reduce((function(e,t){return e[t]=o[n].props[t],e}),{});e.setProps(Object.assign({},s,{getReferenceClientRect:\"function\"==typeof s.getReferenceClientRect?s.getReferenceClientRect:function(){var e;return null==(e=i[n])?void 0:e.getBoundingClientRect()}}))}}m(!1),v(),l();var b={fn:function(){return{onDestroy:function(){m(!0)},onHidden:function(){r=null},onClickOutside:function(e){e.props.showOnCreate&&!f&&(f=!0,r=null)},onShow:function(e){e.props.showOnCreate&&!f&&(f=!0,h(e,i[0]))},onTrigger:function(e,t){h(e,t.currentTarget)}}}},y=F(d(),Object.assign({},s(t,[\"overrides\"]),{plugins:[b].concat(t.plugins||[]),triggerTarget:a,popperOptions:Object.assign({},t.popperOptions,{modifiers:[].concat((null==(n=t.popperOptions)?void 0:n.modifiers)||[],[W])})})),w=y.show;y.show=function(e){if(w(),!r&&null==e)return h(y,i[0]);if(!r||null!=e){if(\"number\"==typeof e)return i[e]&&h(y,i[e]);if(o.indexOf(e)>=0){var t=e.reference;return h(y,t)}return i.indexOf(e)>=0?h(y,e):void 0}},y.showNext=function(){var e=i[0];if(!r)return y.show(0);var t=i.indexOf(r);y.show(i[t+1]||e)},y.showPrevious=function(){var e=i[i.length-1];if(!r)return y.show(e);var t=i.indexOf(r),n=i[t-1]||e;y.show(n)};var E=y.setProps;return y.setProps=function(e){c=e.overrides||c,E(e)},y.setInstances=function(e){m(!0),p.forEach((function(e){return e()})),o=e,m(!1),v(),l(),p=g(y),y.setProps({triggerTarget:a})},p=g(y),y},F.delegate=function(e,n){var r=[],o=[],i=!1,a=n.target,c=s(n,[\"target\"]),p=Object.assign({},c,{trigger:\"manual\",touch:!1}),f=Object.assign({touch:R.touch},c,{showOnCreate:!0}),l=F(e,p);function d(e){if(e.target&&!i){var t=e.target.closest(a);if(t){var r=t.getAttribute(\"data-tippy-trigger\")||n.trigger||R.trigger;if(!t._tippy&&!(\"touchstart\"===e.type&&\"boolean\"==typeof f.touch||\"touchstart\"!==e.type&&r.indexOf(X[e.type])<0)){var s=F(t,f);s&&(o=o.concat(s))}}}}function v(e,t,n,o){void 0===o&&(o=!1),e.addEventListener(t,n,o),r.push({node:e,eventType:t,handler:n,options:o})}return u(l).forEach((function(e){var n=e.destroy,a=e.enable,s=e.disable;e.destroy=function(e){void 0===e&&(e=!0),e&&o.forEach((function(e){e.destroy()})),o=[],r.forEach((function(e){var t=e.node,n=e.eventType,r=e.handler,o=e.options;t.removeEventListener(n,r,o)})),r=[],n()},e.enable=function(){a(),o.forEach((function(e){return e.enable()})),i=!1},e.disable=function(){s(),o.forEach((function(e){return e.disable()})),i=!0},function(e){var n=e.reference;v(n,\"touchstart\",d,t),v(n,\"mouseover\",d),v(n,\"focusin\",d),v(n,\"click\",d)}(e)})),l},F.hideAll=function(e){var t=void 0===e?{}:e,n=t.exclude,r=t.duration;U.forEach((function(e){var t=!1;if(n&&(t=g(n)?e.reference===n:e.popper===n.popper),!t){var o=e.props.duration;e.setProps({duration:r}),e.hide(),e.state.isDestroyed||e.setProps({duration:o})}}))},F.roundArrow='<svg height=\"6\" width=\"16\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M0 6s1.796-.013 4.67-3.615C5.851.9 6.93.006 8 0c1.07-.006 2.148.887 3.343 2.385C14.233 6.005 16 6 16 6H0z\"></svg>',F})); /* Hover-preview initialization for enscribe note markers, cross-reference * links, and citation markers. * * Attaches Tippy.js tooltips to: * - <sup data-note-id=\"...\"> note markers (showing note content) * - <a class=\"ref\" href=\"#...\"> cross-reference links (showing the target element) * - <cite class=\"cite\" data-keys=\"...\"> citation markers (showing bib entries) * * Requires: tippy.js (bundled by enscribe or loaded from CDN). * The tippy-bundle includes @popperjs/core so no separate Popper script needed. */ (function () { /** * Extract clean note content from a <li>element, stripping the leading * <sup> marker and the trailing back-arrow link that appear in the list. * Tooltips should show only the note's prose content. * * @param {Element} noteEl The <li>element from the note list. * @returns {string} innerHTML of the cloned, stripped element. */ function getNoteContent(noteEl) { var clone = noteEl.cloneNode(true); // Remove leading superscript marker (e.g. <sup>2</sup>). var sup = clone.querySelector('sup'); if (sup) sup.remove(); // Remove trailing back-arrow link (e.g. <a class=\"note-backref\">↩</a>). var backref = clone.querySelector('.note-backref'); if (backref) backref.remove(); return clone.innerHTML.trim(); } /** * Extract equation content from a display-math element, stripping the * equation-number span so the tooltip shows only the math itself. * * @param {Element} el The display-math element. * @returns {string} innerHTML of the cloned, stripped element. */ function getEquationContent(el) { var clone = el.cloneNode(true); var numSpan = clone.querySelector('.equation-number'); if (numSpan) numSpan.remove(); return clone.innerHTML.trim(); } /** * Extract figure content from a <figure>element, stripping the * figure-label span so the tooltip shows image + caption without \"Figure N.\". * * @param {Element} el The <figure>element. * @returns {string} outerHTML of the cloned, stripped element. */ function getFigureContent(el) { var clone = el.cloneNode(true); var label = clone.querySelector('.figure-label'); if (label) label.remove(); return clone.outerHTML; } /** * Get tooltip content for a <table>cross-reference target. * Strips the \"Table N.\" label span to keep the preview compact. * * @param {Element} el The <table>element. * @returns {string} outerHTML of the cloned, stripped element. */ function getTableContent(el) { var clone = el.cloneNode(true); clone.querySelectorAll('.table-label').forEach(function(n) { n.remove(); }); return clone.outerHTML; } /** * Dispatch to the appropriate content extractor based on the target element type. * * @param {Element} targetEl The element pointed to by a ref link. * @returns {string} HTML string to use as tooltip content. */ function getRefTargetContent(targetEl) { var tagName = targetEl.tagName.toLowerCase(); if (tagName === 'display-math') return getEquationContent(targetEl); if (tagName === 'figure') return getFigureContent(targetEl); if (tagName === 'table') return getTableContent(targetEl); if (tagName === 'li') return getNoteContent(targetEl); return targetEl.outerHTML; } /** * Attach a Tippy tooltip to a note marker <sup> element. * * @param {Element} marker The <sup data-note-id=\"...\"> element. */ function attachNoteTooltip(marker) { var noteId = marker.getAttribute('data-note-id'); var noteEl = document.getElementById(noteId); if (!noteEl) return; tippy(marker, { content: getNoteContent(noteEl), allowHTML: true, interactive: true, placement: 'top', theme: 'light-border', maxWidth: 400, appendTo: document.body, }); } /** * Attach a Tippy tooltip to an <a class=\"ref\"> cross-reference link. * The tooltip shows the content of the element the ref points to. * Refs pointing to missing targets are silently skipped. * * @param {Element} linkEl The <a class=\"ref\" href=\"#...\"> element. */ function attachRefTooltip(linkEl) { // -preview opt-out: ref-resolution.js / handlers/ref.js stamp // data-no-preview=\"true\" when the author wrote -preview on the <ref>. if (linkEl.getAttribute('data-no-preview') === 'true') return; var href = linkEl.getAttribute('href'); if (!href || href.charAt(0) !== '#') return; var targetId = href.slice(1); var targetEl = document.getElementById(targetId); if (!targetEl) return; var content = getRefTargetContent(targetEl); if (!content) return; var maxWidth = (function() { var t = targetEl.tagName.toLowerCase(); if (t === 'display-math') return 500; if (t === 'table') return 600; return 420; })(); tippy(linkEl, { content: content, allowHTML: true, interactive: false, placement: 'top', theme: 'light-border', maxWidth: maxWidth, appendTo: document.body, }); } /** * Build tooltip content for a <cite class=\"cite\"> element. * Looks up each key in data-keys by finding the #ref-KEY element in the * bibliography and returning its innerHTML. Keys missing from the * bibliography get a placeholder message. * * @param {Element} citeEl The <cite class=\"cite\"> element. * @returns {string} HTML string for the tooltip, or '' if no keys found. */ function getCiteContent(citeEl) { var keysAttr = citeEl.getAttribute('data-keys') || ''; if (!keysAttr) return ''; var keys = keysAttr.split(',').map(function(k) { return k.trim(); }).filter(Boolean); if (keys.length === 0) return ''; var items = keys.map(function(key) { var refEl = document.getElementById('ref-' + key); if (refEl) { return '<li>' + refEl.innerHTML + '</li>'; } return '<li class=\"cite-missing\"><em>' + key + '</em> (not in bibliography)</li>'; }); return '<ul class=\"cite-tooltip-list\">' + items.join('') + '</ul>'; } /** * Attach a Tippy tooltip to a <cite class=\"cite\"> citation marker. * Shows full bibliography entries for each cited key. * cite-error elements are deliberately excluded (no tooltip on errors). * * @param {Element} citeEl The <cite class=\"cite\"> element. */ function attachCiteTooltip(citeEl) { var content = getCiteContent(citeEl); if (!content) return; tippy(citeEl, { content: content, allowHTML: true, interactive: true, placement: 'top', theme: 'light-border', maxWidth: 500, appendTo: document.body, }); } function init() { document.querySelectorAll('sup[data-note-id]').forEach(attachNoteTooltip); document.querySelectorAll('a.ref[href^=\"#\"]').forEach(attachRefTooltip); document.querySelectorAll('cite.cite').forEach(attachCiteTooltip); } if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); } })(); </script><link href=\"https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,600;0,700;1,400;1,700&#x26;family=Source+Code+Pro:wght@400&#x26;display=swap\" rel=\"stylesheet\"><article><article-body><p>A claim<sup data-note-id=\"note-1\" id=\"noteref-1\"><a href=\"#note-1\">1</a></sup>.</p></article-body><article-back><note-list class=\"footnotes\"><ol><li id=\"note-1\"><sup>1</sup><p>A footnote.</p><a aria-label=\"back to text\" class=\"note-backref\" href=\"#noteref-1\">↩</a></li></ol></note-list>",
      },
      {
        "source": "A definition<note placement=side | Inline-adjacent note.>.",
        "layer1_html": "<style>.tippy-box[data-animation=fade][data-state=hidden]{opacity:0}[data-tippy-root]{max-width:calc(100vw - 10px)}.tippy-box{position:relative;background-color:#333;color:#fff;border-radius:4px;font-size:14px;line-height:1.4;white-space:normal;outline:0;transition-property:transform,visibility,opacity}.tippy-box[data-placement^=top]>.tippy-arrow{bottom:0}.tippy-box[data-placement^=top]>.tippy-arrow:before{bottom:-7px;left:0;border-width:8px 8px 0;border-top-color:initial;transform-origin:center top}.tippy-box[data-placement^=bottom]>.tippy-arrow{top:0}.tippy-box[data-placement^=bottom]>.tippy-arrow:before{top:-7px;left:0;border-width:0 8px 8px;border-bottom-color:initial;transform-origin:center bottom}.tippy-box[data-placement^=left]>.tippy-arrow{right:0}.tippy-box[data-placement^=left]>.tippy-arrow:before{border-width:8px 0 8px 8px;border-left-color:initial;right:-7px;transform-origin:center left}.tippy-box[data-placement^=right]>.tippy-arrow{left:0}.tippy-box[data-placement^=right]>.tippy-arrow:before{left:-7px;border-width:8px 8px 8px 0;border-right-color:initial;transform-origin:center right}.tippy-box[data-inertia][data-state=visible]{transition-timing-function:cubic-bezier(.54,1.5,.38,1.11)}.tippy-arrow{width:16px;height:16px;color:#333}.tippy-arrow:before{content:\"\";position:absolute;border-color:transparent;border-style:solid}.tippy-content{position:relative;padding:5px 9px;z-index:1} .tippy-box[data-theme~=light-border]{background-color:#fff;background-clip:padding-box;border:1px solid rgba(0,8,16,.15);color:#333;box-shadow:0 4px 14px -2px rgba(0,8,16,.08)}.tippy-box[data-theme~=light-border]>.tippy-backdrop{background-color:#fff}.tippy-box[data-theme~=light-border]>.tippy-arrow:after,.tippy-box[data-theme~=light-border]>.tippy-svg-arrow:after{content:\"\";position:absolute;z-index:-1}.tippy-box[data-theme~=light-border]>.tippy-arrow:after{border-color:transparent;border-style:solid}.tippy-box[data-theme~=light-border][data-placement^=top]>.tippy-arrow:before{border-top-color:#fff}.tippy-box[data-theme~=light-border][data-placement^=top]>.tippy-arrow:after{border-top-color:rgba(0,8,16,.2);border-width:7px 7px 0;top:17px;left:1px}.tippy-box[data-theme~=light-border][data-placement^=top]>.tippy-svg-arrow>svg{top:16px}.tippy-box[data-theme~=light-border][data-placement^=top]>.tippy-svg-arrow:after{top:17px}.tippy-box[data-theme~=light-border][data-placement^=bottom]>.tippy-arrow:before{border-bottom-color:#fff;bottom:16px}.tippy-box[data-theme~=light-border][data-placement^=bottom]>.tippy-arrow:after{border-bottom-color:rgba(0,8,16,.2);border-width:0 7px 7px;bottom:17px;left:1px}.tippy-box[data-theme~=light-border][data-placement^=bottom]>.tippy-svg-arrow>svg{bottom:16px}.tippy-box[data-theme~=light-border][data-placement^=bottom]>.tippy-svg-arrow:after{bottom:17px}.tippy-box[data-theme~=light-border][data-placement^=left]>.tippy-arrow:before{border-left-color:#fff}.tippy-box[data-theme~=light-border][data-placement^=left]>.tippy-arrow:after{border-left-color:rgba(0,8,16,.2);border-width:7px 0 7px 7px;left:17px;top:1px}.tippy-box[data-theme~=light-border][data-placement^=left]>.tippy-svg-arrow>svg{left:11px}.tippy-box[data-theme~=light-border][data-placement^=left]>.tippy-svg-arrow:after{left:12px}.tippy-box[data-theme~=light-border][data-placement^=right]>.tippy-arrow:before{border-right-color:#fff;right:16px}.tippy-box[data-theme~=light-border][data-placement^=right]>.tippy-arrow:after{border-width:7px 7px 7px 0;right:17px;top:1px;border-right-color:rgba(0,8,16,.2)}.tippy-box[data-theme~=light-border][data-placement^=right]>.tippy-svg-arrow>svg{right:11px}.tippy-box[data-theme~=light-border][data-placement^=right]>.tippy-svg-arrow:after{right:12px}.tippy-box[data-theme~=light-border]>.tippy-svg-arrow{fill:#fff}.tippy-box[data-theme~=light-border]>.tippy-svg-arrow:after{background-image:url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMCA2czEuNzk2LS4wMTMgNC42Ny0zLjYxNUM1Ljg1MS45IDYuOTMuMDA2IDggMGMxLjA3LS4wMDYgMi4xNDguODg3IDMuMzQzIDIuMzg1QzE0LjIzMyA2LjAwNSAxNiA2IDE2IDZIMHoiIGZpbGw9InJnYmEoMCwgOCwgMTYsIDAuMikiLz48L3N2Zz4=);background-size:16px 6px;width:16px;height:6px} /* Sidenote fallback: collected-to-end items authored as placement=side. * Future margin-positioning themes can detect this class and reposition. */ .sidenote-fallback { font-style: italic; } /* Note list: suppress default <ol>numbering since <sup>N</sup> provides it. */ note-list ol { list-style: none; padding-left: 0; margin: 0; } note-list li { margin-bottom: 0.5em; } /* Figure tooltips: constrain image and caption within the tooltip box. */ .tippy-box figure { margin: 0; } .tippy-box figure img { max-width: 100%; height: auto; display: block; } .tippy-box figure figcaption { font-size: 0.9em; margin-top: 0.5em; color: #555; } /* Table tooltips: compact styling with border grid; overflow-x for wide tables. */ .tippy-content { overflow-x: auto; } .tippy-box table { border-collapse: collapse; width: 100%; font-size: 0.9em; margin: 0; } .tippy-box table th, .tippy-box table td { border: 1px solid #ccc; padding: 0.3em 0.6em; text-align: left; } .tippy-box table caption { font-size: 0.9em; margin-bottom: 0.4em; text-align: left; color: #444; } </style><script>/** * @popperjs/core v2.11.8 - MIT License */ !function(e,t){\"object\"==typeof exports&&\"undefined\"!=typeof module?t(exports):\"function\"==typeof define&&define.amd?define([\"exports\"],t):t((e=\"undefined\"!=typeof globalThis?globalThis:e||self).Popper={})}(this,(function(e){\"use strict\";function t(e){if(null==e)return window;if(\"[object Window]\"!==e.toString()){var t=e.ownerDocument;return t&&t.defaultView||window}return e}function n(e){return e instanceof t(e).Element||e instanceof Element}function r(e){return e instanceof t(e).HTMLElement||e instanceof HTMLElement}function o(e){return\"undefined\"!=typeof ShadowRoot&&(e instanceof t(e).ShadowRoot||e instanceof ShadowRoot)}var i=Math.max,a=Math.min,s=Math.round;function f(){var e=navigator.userAgentData;return null!=e&&e.brands&&Array.isArray(e.brands)?e.brands.map((function(e){return e.brand+\"/\"+e.version})).join(\" \"):navigator.userAgent}function c(){return!/^((?!chrome|android).)*safari/i.test(f())}function p(e,o,i){void 0===o&&(o=!1),void 0===i&&(i=!1);var a=e.getBoundingClientRect(),f=1,p=1;o&&r(e)&&(f=e.offsetWidth>0&&s(a.width)/e.offsetWidth||1,p=e.offsetHeight>0&&s(a.height)/e.offsetHeight||1);var u=(n(e)?t(e):window).visualViewport,l=!c()&&i,d=(a.left+(l&&u?u.offsetLeft:0))/f,h=(a.top+(l&&u?u.offsetTop:0))/p,m=a.width/f,v=a.height/p;return{width:m,height:v,top:h,right:d+m,bottom:h+v,left:d,x:d,y:h}}function u(e){var n=t(e);return{scrollLeft:n.pageXOffset,scrollTop:n.pageYOffset}}function l(e){return e?(e.nodeName||\"\").toLowerCase():null}function d(e){return((n(e)?e.ownerDocument:e.document)||window.document).documentElement}function h(e){return p(d(e)).left+u(e).scrollLeft}function m(e){return t(e).getComputedStyle(e)}function v(e){var t=m(e),n=t.overflow,r=t.overflowX,o=t.overflowY;return/auto|scroll|overlay|hidden/.test(n+o+r)}function y(e,n,o){void 0===o&&(o=!1);var i,a,f=r(n),c=r(n)&&function(e){var t=e.getBoundingClientRect(),n=s(t.width)/e.offsetWidth||1,r=s(t.height)/e.offsetHeight||1;return 1!==n||1!==r}(n),m=d(n),y=p(e,c,o),g={scrollLeft:0,scrollTop:0},b={x:0,y:0};return(f||!f&&!o)&&((\"body\"!==l(n)||v(m))&&(g=(i=n)!==t(i)&&r(i)?{scrollLeft:(a=i).scrollLeft,scrollTop:a.scrollTop}:u(i)),r(n)?((b=p(n,!0)).x+=n.clientLeft,b.y+=n.clientTop):m&&(b.x=h(m))),{x:y.left+g.scrollLeft-b.x,y:y.top+g.scrollTop-b.y,width:y.width,height:y.height}}function g(e){var t=p(e),n=e.offsetWidth,r=e.offsetHeight;return Math.abs(t.width-n)<=1&&(n=t.width),Math.abs(t.height-r)<=1&&(r=t.height),{x:e.offsetLeft,y:e.offsetTop,width:n,height:r}}function b(e){return\"html\"===l(e)?e:e.assignedSlot||e.parentNode||(o(e)?e.host:null)||d(e)}function x(e){return[\"html\",\"body\",\"#document\"].indexOf(l(e))>=0?e.ownerDocument.body:r(e)&&v(e)?e:x(b(e))}function w(e,n){var r;void 0===n&&(n=[]);var o=x(e),i=o===(null==(r=e.ownerDocument)?void 0:r.body),a=t(o),s=i?[a].concat(a.visualViewport||[],v(o)?o:[]):o,f=n.concat(s);return i?f:f.concat(w(b(s)))}function O(e){return[\"table\",\"td\",\"th\"].indexOf(l(e))>=0}function j(e){return r(e)&&\"fixed\"!==m(e).position?e.offsetParent:null}function E(e){for(var n=t(e),i=j(e);i&&O(i)&&\"static\"===m(i).position;)i=j(i);return i&&(\"html\"===l(i)||\"body\"===l(i)&&\"static\"===m(i).position)?n:i||function(e){var t=/firefox/i.test(f());if(/Trident/i.test(f())&&r(e)&&\"fixed\"===m(e).position)return null;var n=b(e);for(o(n)&&(n=n.host);r(n)&&[\"html\",\"body\"].indexOf(l(n))<0;){var i=m(n);if(\"none\"!==i.transform||\"none\"!==i.perspective||\"paint\"===i.contain||-1!==[\"transform\",\"perspective\"].indexOf(i.willChange)||t&&\"filter\"===i.willChange||t&&i.filter&&\"none\"!==i.filter)return n;n=n.parentNode}return null}(e)||n}var D=\"top\",A=\"bottom\",L=\"right\",P=\"left\",M=\"auto\",k=[D,A,L,P],W=\"start\",B=\"end\",H=\"viewport\",T=\"popper\",R=k.reduce((function(e,t){return e.concat([t+\"-\"+W,t+\"-\"+B])}),[]),S=[].concat(k,[M]).reduce((function(e,t){return e.concat([t,t+\"-\"+W,t+\"-\"+B])}),[]),V=[\"beforeRead\",\"read\",\"afterRead\",\"beforeMain\",\"main\",\"afterMain\",\"beforeWrite\",\"write\",\"afterWrite\"];function q(e){var t=new Map,n=new Set,r=[];function o(e){n.add(e.name),[].concat(e.requires||[],e.requiresIfExists||[]).forEach((function(e){if(!n.has(e)){var r=t.get(e);r&&o(r)}})),r.push(e)}return e.forEach((function(e){t.set(e.name,e)})),e.forEach((function(e){n.has(e.name)||o(e)})),r}function C(e,t){var n=t.getRootNode&&t.getRootNode();if(e.contains(t))return!0;if(n&&o(n)){var r=t;do{if(r&&e.isSameNode(r))return!0;r=r.parentNode||r.host}while(r)}return!1}function N(e){return Object.assign({},e,{left:e.x,top:e.y,right:e.x+e.width,bottom:e.y+e.height})}function I(e,r,o){return r===H?N(function(e,n){var r=t(e),o=d(e),i=r.visualViewport,a=o.clientWidth,s=o.clientHeight,f=0,p=0;if(i){a=i.width,s=i.height;var u=c();(u||!u&&\"fixed\"===n)&&(f=i.offsetLeft,p=i.offsetTop)}return{width:a,height:s,x:f+h(e),y:p}}(e,o)):n(r)?function(e,t){var n=p(e,!1,\"fixed\"===t);return n.top=n.top+e.clientTop,n.left=n.left+e.clientLeft,n.bottom=n.top+e.clientHeight,n.right=n.left+e.clientWidth,n.width=e.clientWidth,n.height=e.clientHeight,n.x=n.left,n.y=n.top,n}(r,o):N(function(e){var t,n=d(e),r=u(e),o=null==(t=e.ownerDocument)?void 0:t.body,a=i(n.scrollWidth,n.clientWidth,o?o.scrollWidth:0,o?o.clientWidth:0),s=i(n.scrollHeight,n.clientHeight,o?o.scrollHeight:0,o?o.clientHeight:0),f=-r.scrollLeft+h(e),c=-r.scrollTop;return\"rtl\"===m(o||n).direction&&(f+=i(n.clientWidth,o?o.clientWidth:0)-a),{width:a,height:s,x:f,y:c}}(d(e)))}function _(e,t,o,s){var f=\"clippingParents\"===t?function(e){var t=w(b(e)),o=[\"absolute\",\"fixed\"].indexOf(m(e).position)>=0&&r(e)?E(e):e;return n(o)?t.filter((function(e){return n(e)&&C(e,o)&&\"body\"!==l(e)})):[]}(e):[].concat(t),c=[].concat(f,[o]),p=c[0],u=c.reduce((function(t,n){var r=I(e,n,s);return t.top=i(r.top,t.top),t.right=a(r.right,t.right),t.bottom=a(r.bottom,t.bottom),t.left=i(r.left,t.left),t}),I(e,p,s));return u.width=u.right-u.left,u.height=u.bottom-u.top,u.x=u.left,u.y=u.top,u}function F(e){return e.split(\"-\")[0]}function U(e){return e.split(\"-\")[1]}function z(e){return[\"top\",\"bottom\"].indexOf(e)>=0?\"x\":\"y\"}function X(e){var t,n=e.reference,r=e.element,o=e.placement,i=o?F(o):null,a=o?U(o):null,s=n.x+n.width/2-r.width/2,f=n.y+n.height/2-r.height/2;switch(i){case D:t={x:s,y:n.y-r.height};break;case A:t={x:s,y:n.y+n.height};break;case L:t={x:n.x+n.width,y:f};break;case P:t={x:n.x-r.width,y:f};break;default:t={x:n.x,y:n.y}}var c=i?z(i):null;if(null!=c){var p=\"y\"===c?\"height\":\"width\";switch(a){case W:t[c]=t[c]-(n[p]/2-r[p]/2);break;case B:t[c]=t[c]+(n[p]/2-r[p]/2)}}return t}function Y(e){return Object.assign({},{top:0,right:0,bottom:0,left:0},e)}function G(e,t){return t.reduce((function(t,n){return t[n]=e,t}),{})}function J(e,t){void 0===t&&(t={});var r=t,o=r.placement,i=void 0===o?e.placement:o,a=r.strategy,s=void 0===a?e.strategy:a,f=r.boundary,c=void 0===f?\"clippingParents\":f,u=r.rootBoundary,l=void 0===u?H:u,h=r.elementContext,m=void 0===h?T:h,v=r.altBoundary,y=void 0!==v&&v,g=r.padding,b=void 0===g?0:g,x=Y(\"number\"!=typeof b?b:G(b,k)),w=m===T?\"reference\":T,O=e.rects.popper,j=e.elements[y?w:m],E=_(n(j)?j:j.contextElement||d(e.elements.popper),c,l,s),P=p(e.elements.reference),M=X({reference:P,element:O,strategy:\"absolute\",placement:i}),W=N(Object.assign({},O,M)),B=m===T?W:P,R={top:E.top-B.top+x.top,bottom:B.bottom-E.bottom+x.bottom,left:E.left-B.left+x.left,right:B.right-E.right+x.right},S=e.modifiersData.offset;if(m===T&&S){var V=S[i];Object.keys(R).forEach((function(e){var t=[L,A].indexOf(e)>=0?1:-1,n=[D,A].indexOf(e)>=0?\"y\":\"x\";R[e]+=V[n]*t}))}return R}var K={placement:\"bottom\",modifiers:[],strategy:\"absolute\"};function Q(){for(var e=arguments.length,t=new Array(e),n=0;n<e;n++)t[n]=arguments[n];return!t.some((function(e){return!(e&&\"function\"==typeof e.getBoundingClientRect)}))}function Z(e){void 0===e&&(e={});var t=e,r=t.defaultModifiers,o=void 0===r?[]:r,i=t.defaultOptions,a=void 0===i?K:i;return function(e,t,r){void 0===r&&(r=a);var i,s,f={placement:\"bottom\",orderedModifiers:[],options:Object.assign({},K,a),modifiersData:{},elements:{reference:e,popper:t},attributes:{},styles:{}},c=[],p=!1,u={state:f,setOptions:function(r){var i=\"function\"==typeof r?r(f.options):r;l(),f.options=Object.assign({},a,f.options,i),f.scrollParents={reference:n(e)?w(e):e.contextElement?w(e.contextElement):[],popper:w(t)};var s,p,d=function(e){var t=q(e);return V.reduce((function(e,n){return e.concat(t.filter((function(e){return e.phase===n})))}),[])}((s=[].concat(o,f.options.modifiers),p=s.reduce((function(e,t){var n=e[t.name];return e[t.name]=n?Object.assign({},n,t,{options:Object.assign({},n.options,t.options),data:Object.assign({},n.data,t.data)}):t,e}),{}),Object.keys(p).map((function(e){return p[e]}))));return f.orderedModifiers=d.filter((function(e){return e.enabled})),f.orderedModifiers.forEach((function(e){var t=e.name,n=e.options,r=void 0===n?{}:n,o=e.effect;if(\"function\"==typeof o){var i=o({state:f,name:t,instance:u,options:r}),a=function(){};c.push(i||a)}})),u.update()},forceUpdate:function(){if(!p){var e=f.elements,t=e.reference,n=e.popper;if(Q(t,n)){f.rects={reference:y(t,E(n),\"fixed\"===f.options.strategy),popper:g(n)},f.reset=!1,f.placement=f.options.placement,f.orderedModifiers.forEach((function(e){return f.modifiersData[e.name]=Object.assign({},e.data)}));for(var r=0;r<f.orderedModifiers.length;r++)if(!0!==f.reset){var o=f.orderedModifiers[r],i=o.fn,a=o.options,s=void 0===a?{}:a,c=o.name;\"function\"==typeof i&&(f=i({state:f,options:s,name:c,instance:u})||f)}else f.reset=!1,r=-1}}},update:(i=function(){return new Promise((function(e){u.forceUpdate(),e(f)}))},function(){return s||(s=new Promise((function(e){Promise.resolve().then((function(){s=void 0,e(i())}))}))),s}),destroy:function(){l(),p=!0}};if(!Q(e,t))return u;function l(){c.forEach((function(e){return e()})),c=[]}return u.setOptions(r).then((function(e){!p&&r.onFirstUpdate&&r.onFirstUpdate(e)})),u}}var $={passive:!0};var ee={name:\"eventListeners\",enabled:!0,phase:\"write\",fn:function(){},effect:function(e){var n=e.state,r=e.instance,o=e.options,i=o.scroll,a=void 0===i||i,s=o.resize,f=void 0===s||s,c=t(n.elements.popper),p=[].concat(n.scrollParents.reference,n.scrollParents.popper);return a&&p.forEach((function(e){e.addEventListener(\"scroll\",r.update,$)})),f&&c.addEventListener(\"resize\",r.update,$),function(){a&&p.forEach((function(e){e.removeEventListener(\"scroll\",r.update,$)})),f&&c.removeEventListener(\"resize\",r.update,$)}},data:{}};var te={name:\"popperOffsets\",enabled:!0,phase:\"read\",fn:function(e){var t=e.state,n=e.name;t.modifiersData[n]=X({reference:t.rects.reference,element:t.rects.popper,strategy:\"absolute\",placement:t.placement})},data:{}},ne={top:\"auto\",right:\"auto\",bottom:\"auto\",left:\"auto\"};function re(e){var n,r=e.popper,o=e.popperRect,i=e.placement,a=e.variation,f=e.offsets,c=e.position,p=e.gpuAcceleration,u=e.adaptive,l=e.roundOffsets,h=e.isFixed,v=f.x,y=void 0===v?0:v,g=f.y,b=void 0===g?0:g,x=\"function\"==typeof l?l({x:y,y:b}):{x:y,y:b};y=x.x,b=x.y;var w=f.hasOwnProperty(\"x\"),O=f.hasOwnProperty(\"y\"),j=P,M=D,k=window;if(u){var W=E(r),H=\"clientHeight\",T=\"clientWidth\";if(W===t(r)&&\"static\"!==m(W=d(r)).position&&\"absolute\"===c&&(H=\"scrollHeight\",T=\"scrollWidth\"),W=W,i===D||(i===P||i===L)&&a===B)M=A,b-=(h&&W===k&&k.visualViewport?k.visualViewport.height:W[H])-o.height,b*=p?1:-1;if(i===P||(i===D||i===A)&&a===B)j=L,y-=(h&&W===k&&k.visualViewport?k.visualViewport.width:W[T])-o.width,y*=p?1:-1}var R,S=Object.assign({position:c},u&&ne),V=!0===l?function(e,t){var n=e.x,r=e.y,o=t.devicePixelRatio||1;return{x:s(n*o)/o||0,y:s(r*o)/o||0}}({x:y,y:b},t(r)):{x:y,y:b};return y=V.x,b=V.y,p?Object.assign({},S,((R={})[M]=O?\"0\":\"\",R[j]=w?\"0\":\"\",R.transform=(k.devicePixelRatio||1)<=1?\"translate(\"+y+\"px, \"+b+\"px)\":\"translate3d(\"+y+\"px, \"+b+\"px, 0)\",R)):Object.assign({},S,((n={})[M]=O?b+\"px\":\"\",n[j]=w?y+\"px\":\"\",n.transform=\"\",n))}var oe={name:\"computeStyles\",enabled:!0,phase:\"beforeWrite\",fn:function(e){var t=e.state,n=e.options,r=n.gpuAcceleration,o=void 0===r||r,i=n.adaptive,a=void 0===i||i,s=n.roundOffsets,f=void 0===s||s,c={placement:F(t.placement),variation:U(t.placement),popper:t.elements.popper,popperRect:t.rects.popper,gpuAcceleration:o,isFixed:\"fixed\"===t.options.strategy};null!=t.modifiersData.popperOffsets&&(t.styles.popper=Object.assign({},t.styles.popper,re(Object.assign({},c,{offsets:t.modifiersData.popperOffsets,position:t.options.strategy,adaptive:a,roundOffsets:f})))),null!=t.modifiersData.arrow&&(t.styles.arrow=Object.assign({},t.styles.arrow,re(Object.assign({},c,{offsets:t.modifiersData.arrow,position:\"absolute\",adaptive:!1,roundOffsets:f})))),t.attributes.popper=Object.assign({},t.attributes.popper,{\"data-popper-placement\":t.placement})},data:{}};var ie={name:\"applyStyles\",enabled:!0,phase:\"write\",fn:function(e){var t=e.state;Object.keys(t.elements).forEach((function(e){var n=t.styles[e]||{},o=t.attributes[e]||{},i=t.elements[e];r(i)&&l(i)&&(Object.assign(i.style,n),Object.keys(o).forEach((function(e){var t=o[e];!1===t?i.removeAttribute(e):i.setAttribute(e,!0===t?\"\":t)})))}))},effect:function(e){var t=e.state,n={popper:{position:t.options.strategy,left:\"0\",top:\"0\",margin:\"0\"},arrow:{position:\"absolute\"},reference:{}};return Object.assign(t.elements.popper.style,n.popper),t.styles=n,t.elements.arrow&&Object.assign(t.elements.arrow.style,n.arrow),function(){Object.keys(t.elements).forEach((function(e){var o=t.elements[e],i=t.attributes[e]||{},a=Object.keys(t.styles.hasOwnProperty(e)?t.styles[e]:n[e]).reduce((function(e,t){return e[t]=\"\",e}),{});r(o)&&l(o)&&(Object.assign(o.style,a),Object.keys(i).forEach((function(e){o.removeAttribute(e)})))}))}},requires:[\"computeStyles\"]};var ae={name:\"offset\",enabled:!0,phase:\"main\",requires:[\"popperOffsets\"],fn:function(e){var t=e.state,n=e.options,r=e.name,o=n.offset,i=void 0===o?[0,0]:o,a=S.reduce((function(e,n){return e[n]=function(e,t,n){var r=F(e),o=[P,D].indexOf(r)>=0?-1:1,i=\"function\"==typeof n?n(Object.assign({},t,{placement:e})):n,a=i[0],s=i[1];return a=a||0,s=(s||0)*o,[P,L].indexOf(r)>=0?{x:s,y:a}:{x:a,y:s}}(n,t.rects,i),e}),{}),s=a[t.placement],f=s.x,c=s.y;null!=t.modifiersData.popperOffsets&&(t.modifiersData.popperOffsets.x+=f,t.modifiersData.popperOffsets.y+=c),t.modifiersData[r]=a}},se={left:\"right\",right:\"left\",bottom:\"top\",top:\"bottom\"};function fe(e){return e.replace(/left|right|bottom|top/g,(function(e){return se[e]}))}var ce={start:\"end\",end:\"start\"};function pe(e){return e.replace(/start|end/g,(function(e){return ce[e]}))}function ue(e,t){void 0===t&&(t={});var n=t,r=n.placement,o=n.boundary,i=n.rootBoundary,a=n.padding,s=n.flipVariations,f=n.allowedAutoPlacements,c=void 0===f?S:f,p=U(r),u=p?s?R:R.filter((function(e){return U(e)===p})):k,l=u.filter((function(e){return c.indexOf(e)>=0}));0===l.length&&(l=u);var d=l.reduce((function(t,n){return t[n]=J(e,{placement:n,boundary:o,rootBoundary:i,padding:a})[F(n)],t}),{});return Object.keys(d).sort((function(e,t){return d[e]-d[t]}))}var le={name:\"flip\",enabled:!0,phase:\"main\",fn:function(e){var t=e.state,n=e.options,r=e.name;if(!t.modifiersData[r]._skip){for(var o=n.mainAxis,i=void 0===o||o,a=n.altAxis,s=void 0===a||a,f=n.fallbackPlacements,c=n.padding,p=n.boundary,u=n.rootBoundary,l=n.altBoundary,d=n.flipVariations,h=void 0===d||d,m=n.allowedAutoPlacements,v=t.options.placement,y=F(v),g=f||(y===v||!h?[fe(v)]:function(e){if(F(e)===M)return[];var t=fe(e);return[pe(e),t,pe(t)]}(v)),b=[v].concat(g).reduce((function(e,n){return e.concat(F(n)===M?ue(t,{placement:n,boundary:p,rootBoundary:u,padding:c,flipVariations:h,allowedAutoPlacements:m}):n)}),[]),x=t.rects.reference,w=t.rects.popper,O=new Map,j=!0,E=b[0],k=0;k<b.length;k++){var B=b[k],H=F(B),T=U(B)===W,R=[D,A].indexOf(H)>=0,S=R?\"width\":\"height\",V=J(t,{placement:B,boundary:p,rootBoundary:u,altBoundary:l,padding:c}),q=R?T?L:P:T?A:D;x[S]>w[S]&&(q=fe(q));var C=fe(q),N=[];if(i&&N.push(V[H]<=0),s&&N.push(V[q]<=0,V[C]<=0),N.every((function(e){return e}))){E=B,j=!1;break}O.set(B,N)}if(j)for(var I=function(e){var t=b.find((function(t){var n=O.get(t);if(n)return n.slice(0,e).every((function(e){return e}))}));if(t)return E=t,\"break\"},_=h?3:1;_>0;_--){if(\"break\"===I(_))break}t.placement!==E&&(t.modifiersData[r]._skip=!0,t.placement=E,t.reset=!0)}},requiresIfExists:[\"offset\"],data:{_skip:!1}};function de(e,t,n){return i(e,a(t,n))}var he={name:\"preventOverflow\",enabled:!0,phase:\"main\",fn:function(e){var t=e.state,n=e.options,r=e.name,o=n.mainAxis,s=void 0===o||o,f=n.altAxis,c=void 0!==f&&f,p=n.boundary,u=n.rootBoundary,l=n.altBoundary,d=n.padding,h=n.tether,m=void 0===h||h,v=n.tetherOffset,y=void 0===v?0:v,b=J(t,{boundary:p,rootBoundary:u,padding:d,altBoundary:l}),x=F(t.placement),w=U(t.placement),O=!w,j=z(x),M=\"x\"===j?\"y\":\"x\",k=t.modifiersData.popperOffsets,B=t.rects.reference,H=t.rects.popper,T=\"function\"==typeof y?y(Object.assign({},t.rects,{placement:t.placement})):y,R=\"number\"==typeof T?{mainAxis:T,altAxis:T}:Object.assign({mainAxis:0,altAxis:0},T),S=t.modifiersData.offset?t.modifiersData.offset[t.placement]:null,V={x:0,y:0};if(k){if(s){var q,C=\"y\"===j?D:P,N=\"y\"===j?A:L,I=\"y\"===j?\"height\":\"width\",_=k[j],X=_+b[C],Y=_-b[N],G=m?-H[I]/2:0,K=w===W?B[I]:H[I],Q=w===W?-H[I]:-B[I],Z=t.elements.arrow,$=m&&Z?g(Z):{width:0,height:0},ee=t.modifiersData[\"arrow#persistent\"]?t.modifiersData[\"arrow#persistent\"].padding:{top:0,right:0,bottom:0,left:0},te=ee[C],ne=ee[N],re=de(0,B[I],$[I]),oe=O?B[I]/2-G-re-te-R.mainAxis:K-re-te-R.mainAxis,ie=O?-B[I]/2+G+re+ne+R.mainAxis:Q+re+ne+R.mainAxis,ae=t.elements.arrow&&E(t.elements.arrow),se=ae?\"y\"===j?ae.clientTop||0:ae.clientLeft||0:0,fe=null!=(q=null==S?void 0:S[j])?q:0,ce=_+ie-fe,pe=de(m?a(X,_+oe-fe-se):X,_,m?i(Y,ce):Y);k[j]=pe,V[j]=pe-_}if(c){var ue,le=\"x\"===j?D:P,he=\"x\"===j?A:L,me=k[M],ve=\"y\"===M?\"height\":\"width\",ye=me+b[le],ge=me-b[he],be=-1!==[D,P].indexOf(x),xe=null!=(ue=null==S?void 0:S[M])?ue:0,we=be?ye:me-B[ve]-H[ve]-xe+R.altAxis,Oe=be?me+B[ve]+H[ve]-xe-R.altAxis:ge,je=m&&be?function(e,t,n){var r=de(e,t,n);return r>n?n:r}(we,me,Oe):de(m?we:ye,me,m?Oe:ge);k[M]=je,V[M]=je-me}t.modifiersData[r]=V}},requiresIfExists:[\"offset\"]};var me={name:\"arrow\",enabled:!0,phase:\"main\",fn:function(e){var t,n=e.state,r=e.name,o=e.options,i=n.elements.arrow,a=n.modifiersData.popperOffsets,s=F(n.placement),f=z(s),c=[P,L].indexOf(s)>=0?\"height\":\"width\";if(i&&a){var p=function(e,t){return Y(\"number\"!=typeof(e=\"function\"==typeof e?e(Object.assign({},t.rects,{placement:t.placement})):e)?e:G(e,k))}(o.padding,n),u=g(i),l=\"y\"===f?D:P,d=\"y\"===f?A:L,h=n.rects.reference[c]+n.rects.reference[f]-a[f]-n.rects.popper[c],m=a[f]-n.rects.reference[f],v=E(i),y=v?\"y\"===f?v.clientHeight||0:v.clientWidth||0:0,b=h/2-m/2,x=p[l],w=y-u[c]-p[d],O=y/2-u[c]/2+b,j=de(x,O,w),M=f;n.modifiersData[r]=((t={})[M]=j,t.centerOffset=j-O,t)}},effect:function(e){var t=e.state,n=e.options.element,r=void 0===n?\"[data-popper-arrow]\":n;null!=r&&(\"string\"!=typeof r||(r=t.elements.popper.querySelector(r)))&&C(t.elements.popper,r)&&(t.elements.arrow=r)},requires:[\"popperOffsets\"],requiresIfExists:[\"preventOverflow\"]};function ve(e,t,n){return void 0===n&&(n={x:0,y:0}),{top:e.top-t.height-n.y,right:e.right-t.width+n.x,bottom:e.bottom-t.height+n.y,left:e.left-t.width-n.x}}function ye(e){return[D,L,A,P].some((function(t){return e[t]>=0}))}var ge={name:\"hide\",enabled:!0,phase:\"main\",requiresIfExists:[\"preventOverflow\"],fn:function(e){var t=e.state,n=e.name,r=t.rects.reference,o=t.rects.popper,i=t.modifiersData.preventOverflow,a=J(t,{elementContext:\"reference\"}),s=J(t,{altBoundary:!0}),f=ve(a,r),c=ve(s,o,i),p=ye(f),u=ye(c);t.modifiersData[n]={referenceClippingOffsets:f,popperEscapeOffsets:c,isReferenceHidden:p,hasPopperEscaped:u},t.attributes.popper=Object.assign({},t.attributes.popper,{\"data-popper-reference-hidden\":p,\"data-popper-escaped\":u})}},be=Z({defaultModifiers:[ee,te,oe,ie]}),xe=[ee,te,oe,ie,ae,le,he,me,ge],we=Z({defaultModifiers:xe});e.applyStyles=ie,e.arrow=me,e.computeStyles=oe,e.createPopper=we,e.createPopperLite=be,e.defaultModifiers=xe,e.detectOverflow=J,e.eventListeners=ee,e.flip=le,e.hide=ge,e.offset=ae,e.popperGenerator=Z,e.popperOffsets=te,e.preventOverflow=he,Object.defineProperty(e,\"__esModule\",{value:!0})})); !function(e,t){\"object\"==typeof exports&&\"undefined\"!=typeof module?module.exports=t(require(\"@popperjs/core\")):\"function\"==typeof define&&define.amd?define([\"@popperjs/core\"],t):(e=e||self).tippy=t(e.Popper)}(this,(function(e){\"use strict\";var t={passive:!0,capture:!0},n=function(){return document.body};function r(e,t,n){if(Array.isArray(e)){var r=e[t];return null==r?Array.isArray(n)?n[t]:n:r}return e}function o(e,t){var n={}.toString.call(e);return 0===n.indexOf(\"[object\")&&n.indexOf(t+\"]\")>-1}function i(e,t){return\"function\"==typeof e?e.apply(void 0,t):e}function a(e,t){return 0===t?e:function(r){clearTimeout(n),n=setTimeout((function(){e(r)}),t)};var n}function s(e,t){var n=Object.assign({},e);return t.forEach((function(e){delete n[e]})),n}function u(e){return[].concat(e)}function c(e,t){-1===e.indexOf(t)&&e.push(t)}function p(e){return e.split(\"-\")[0]}function f(e){return[].slice.call(e)}function l(e){return Object.keys(e).reduce((function(t,n){return void 0!==e[n]&&(t[n]=e[n]),t}),{})}function d(){return document.createElement(\"div\")}function v(e){return[\"Element\",\"Fragment\"].some((function(t){return o(e,t)}))}function m(e){return o(e,\"MouseEvent\")}function g(e){return!(!e||!e._tippy||e._tippy.reference!==e)}function h(e){return v(e)?[e]:function(e){return o(e,\"NodeList\")}(e)?f(e):Array.isArray(e)?e:f(document.querySelectorAll(e))}function b(e,t){e.forEach((function(e){e&&(e.style.transitionDuration=t+\"ms\")}))}function y(e,t){e.forEach((function(e){e&&e.setAttribute(\"data-state\",t)}))}function w(e){var t,n=u(e)[0];return null!=n&&null!=(t=n.ownerDocument)&&t.body?n.ownerDocument:document}function E(e,t,n){var r=t+\"EventListener\";[\"transitionend\",\"webkitTransitionEnd\"].forEach((function(t){e[r](t,n)}))}function O(e,t){for(var n=t;n;){var r;if(e.contains(n))return!0;n=null==n.getRootNode||null==(r=n.getRootNode())?void 0:r.host}return!1}var x={isTouch:!1},C=0;function T(){x.isTouch||(x.isTouch=!0,window.performance&&document.addEventListener(\"mousemove\",A))}function A(){var e=performance.now();e-C<20&&(x.isTouch=!1,document.removeEventListener(\"mousemove\",A)),C=e}function L(){var e=document.activeElement;if(g(e)){var t=e._tippy;e.blur&&!t.state.isVisible&&e.blur()}}var D=!!(\"undefined\"!=typeof window&&\"undefined\"!=typeof document)&&!!window.msCrypto,R=Object.assign({appendTo:n,aria:{content:\"auto\",expanded:\"auto\"},delay:0,duration:[300,250],getReferenceClientRect:null,hideOnClick:!0,ignoreAttributes:!1,interactive:!1,interactiveBorder:2,interactiveDebounce:0,moveTransition:\"\",offset:[0,10],onAfterUpdate:function(){},onBeforeUpdate:function(){},onCreate:function(){},onDestroy:function(){},onHidden:function(){},onHide:function(){},onMount:function(){},onShow:function(){},onShown:function(){},onTrigger:function(){},onUntrigger:function(){},onClickOutside:function(){},placement:\"top\",plugins:[],popperOptions:{},render:null,showOnCreate:!1,touch:!0,trigger:\"mouseenter focus\",triggerTarget:null},{animateFill:!1,followCursor:!1,inlinePositioning:!1,sticky:!1},{allowHTML:!1,animation:\"fade\",arrow:!0,content:\"\",inertia:!1,maxWidth:350,role:\"tooltip\",theme:\"\",zIndex:9999}),k=Object.keys(R);function P(e){var t=(e.plugins||[]).reduce((function(t,n){var r,o=n.name,i=n.defaultValue;o&&(t[o]=void 0!==e[o]?e[o]:null!=(r=R[o])?r:i);return t}),{});return Object.assign({},e,t)}function j(e,t){var n=Object.assign({},t,{content:i(t.content,[e])},t.ignoreAttributes?{}:function(e,t){return(t?Object.keys(P(Object.assign({},R,{plugins:t}))):k).reduce((function(t,n){var r=(e.getAttribute(\"data-tippy-\"+n)||\"\").trim();if(!r)return t;if(\"content\"===n)t[n]=r;else try{t[n]=JSON.parse(r)}catch(e){t[n]=r}return t}),{})}(e,t.plugins));return n.aria=Object.assign({},R.aria,n.aria),n.aria={expanded:\"auto\"===n.aria.expanded?t.interactive:n.aria.expanded,content:\"auto\"===n.aria.content?t.interactive?null:\"describedby\":n.aria.content},n}function M(e,t){e.innerHTML=t}function V(e){var t=d();return!0===e?t.className=\"tippy-arrow\":(t.className=\"tippy-svg-arrow\",v(e)?t.appendChild(e):M(t,e)),t}function I(e,t){v(t.content)?(M(e,\"\"),e.appendChild(t.content)):\"function\"!=typeof t.content&&(t.allowHTML?M(e,t.content):e.textContent=t.content)}function S(e){var t=e.firstElementChild,n=f(t.children);return{box:t,content:n.find((function(e){return e.classList.contains(\"tippy-content\")})),arrow:n.find((function(e){return e.classList.contains(\"tippy-arrow\")||e.classList.contains(\"tippy-svg-arrow\")})),backdrop:n.find((function(e){return e.classList.contains(\"tippy-backdrop\")}))}}function N(e){var t=d(),n=d();n.className=\"tippy-box\",n.setAttribute(\"data-state\",\"hidden\"),n.setAttribute(\"tabindex\",\"-1\");var r=d();function o(n,r){var o=S(t),i=o.box,a=o.content,s=o.arrow;r.theme?i.setAttribute(\"data-theme\",r.theme):i.removeAttribute(\"data-theme\"),\"string\"==typeof r.animation?i.setAttribute(\"data-animation\",r.animation):i.removeAttribute(\"data-animation\"),r.inertia?i.setAttribute(\"data-inertia\",\"\"):i.removeAttribute(\"data-inertia\"),i.style.maxWidth=\"number\"==typeof r.maxWidth?r.maxWidth+\"px\":r.maxWidth,r.role?i.setAttribute(\"role\",r.role):i.removeAttribute(\"role\"),n.content===r.content&&n.allowHTML===r.allowHTML||I(a,e.props),r.arrow?s?n.arrow!==r.arrow&&(i.removeChild(s),i.appendChild(V(r.arrow))):i.appendChild(V(r.arrow)):s&&i.removeChild(s)}return r.className=\"tippy-content\",r.setAttribute(\"data-state\",\"hidden\"),I(r,e.props),t.appendChild(n),n.appendChild(r),o(e.props,e.props),{popper:t,onUpdate:o}}N.$$tippy=!0;var B=1,H=[],U=[];function _(o,s){var v,g,h,C,T,A,L,k,M=j(o,Object.assign({},R,P(l(s)))),V=!1,I=!1,N=!1,_=!1,F=[],W=a(we,M.interactiveDebounce),X=B++,Y=(k=M.plugins).filter((function(e,t){return k.indexOf(e)===t})),$={id:X,reference:o,popper:d(),popperInstance:null,props:M,state:{isEnabled:!0,isVisible:!1,isDestroyed:!1,isMounted:!1,isShown:!1},plugins:Y,clearDelayTimeouts:function(){clearTimeout(v),clearTimeout(g),cancelAnimationFrame(h)},setProps:function(e){if($.state.isDestroyed)return;ae(\"onBeforeUpdate\",[$,e]),be();var t=$.props,n=j(o,Object.assign({},t,l(e),{ignoreAttributes:!0}));$.props=n,he(),t.interactiveDebounce!==n.interactiveDebounce&&(ce(),W=a(we,n.interactiveDebounce));t.triggerTarget&&!n.triggerTarget?u(t.triggerTarget).forEach((function(e){e.removeAttribute(\"aria-expanded\")})):n.triggerTarget&&o.removeAttribute(\"aria-expanded\");ue(),ie(),J&&J(t,n);$.popperInstance&&(Ce(),Ae().forEach((function(e){requestAnimationFrame(e._tippy.popperInstance.forceUpdate)})));ae(\"onAfterUpdate\",[$,e])},setContent:function(e){$.setProps({content:e})},show:function(){var e=$.state.isVisible,t=$.state.isDestroyed,o=!$.state.isEnabled,a=x.isTouch&&!$.props.touch,s=r($.props.duration,0,R.duration);if(e||t||o||a)return;if(te().hasAttribute(\"disabled\"))return;if(ae(\"onShow\",[$],!1),!1===$.props.onShow($))return;$.state.isVisible=!0,ee()&&(z.style.visibility=\"visible\");ie(),de(),$.state.isMounted||(z.style.transition=\"none\");if(ee()){var u=re(),p=u.box,f=u.content;b([p,f],0)}A=function(){var e;if($.state.isVisible&&!_){if(_=!0,z.offsetHeight,z.style.transition=$.props.moveTransition,ee()&&$.props.animation){var t=re(),n=t.box,r=t.content;b([n,r],s),y([n,r],\"visible\")}se(),ue(),c(U,$),null==(e=$.popperInstance)||e.forceUpdate(),ae(\"onMount\",[$]),$.props.animation&&ee()&&function(e,t){me(e,t)}(s,(function(){$.state.isShown=!0,ae(\"onShown\",[$])}))}},function(){var e,t=$.props.appendTo,r=te();e=$.props.interactive&&t===n||\"parent\"===t?r.parentNode:i(t,[r]);e.contains(z)||e.appendChild(z);$.state.isMounted=!0,Ce()}()},hide:function(){var e=!$.state.isVisible,t=$.state.isDestroyed,n=!$.state.isEnabled,o=r($.props.duration,1,R.duration);if(e||t||n)return;if(ae(\"onHide\",[$],!1),!1===$.props.onHide($))return;$.state.isVisible=!1,$.state.isShown=!1,_=!1,V=!1,ee()&&(z.style.visibility=\"hidden\");if(ce(),ve(),ie(!0),ee()){var i=re(),a=i.box,s=i.content;$.props.animation&&(b([a,s],o),y([a,s],\"hidden\"))}se(),ue(),$.props.animation?ee()&&function(e,t){me(e,(function(){!$.state.isVisible&&z.parentNode&&z.parentNode.contains(z)&&t()}))}(o,$.unmount):$.unmount()},hideWithInteractivity:function(e){ne().addEventListener(\"mousemove\",W),c(H,W),W(e)},enable:function(){$.state.isEnabled=!0},disable:function(){$.hide(),$.state.isEnabled=!1},unmount:function(){$.state.isVisible&&$.hide();if(!$.state.isMounted)return;Te(),Ae().forEach((function(e){e._tippy.unmount()})),z.parentNode&&z.parentNode.removeChild(z);U=U.filter((function(e){return e!==$})),$.state.isMounted=!1,ae(\"onHidden\",[$])},destroy:function(){if($.state.isDestroyed)return;$.clearDelayTimeouts(),$.unmount(),be(),delete o._tippy,$.state.isDestroyed=!0,ae(\"onDestroy\",[$])}};if(!M.render)return $;var q=M.render($),z=q.popper,J=q.onUpdate;z.setAttribute(\"data-tippy-root\",\"\"),z.id=\"tippy-\"+$.id,$.popper=z,o._tippy=$,z._tippy=$;var G=Y.map((function(e){return e.fn($)})),K=o.hasAttribute(\"aria-expanded\");return he(),ue(),ie(),ae(\"onCreate\",[$]),M.showOnCreate&&Le(),z.addEventListener(\"mouseenter\",(function(){$.props.interactive&&$.state.isVisible&&$.clearDelayTimeouts()})),z.addEventListener(\"mouseleave\",(function(){$.props.interactive&&$.props.trigger.indexOf(\"mouseenter\")>=0&&ne().addEventListener(\"mousemove\",W)})),$;function Q(){var e=$.props.touch;return Array.isArray(e)?e:[e,0]}function Z(){return\"hold\"===Q()[0]}function ee(){var e;return!(null==(e=$.props.render)||!e.$$tippy)}function te(){return L||o}function ne(){var e=te().parentNode;return e?w(e):document}function re(){return S(z)}function oe(e){return $.state.isMounted&&!$.state.isVisible||x.isTouch||C&&\"focus\"===C.type?0:r($.props.delay,e?0:1,R.delay)}function ie(e){void 0===e&&(e=!1),z.style.pointerEvents=$.props.interactive&&!e?\"\":\"none\",z.style.zIndex=\"\"+$.props.zIndex}function ae(e,t,n){var r;(void 0===n&&(n=!0),G.forEach((function(n){n[e]&&n[e].apply(n,t)})),n)&&(r=$.props)[e].apply(r,t)}function se(){var e=$.props.aria;if(e.content){var t=\"aria-\"+e.content,n=z.id;u($.props.triggerTarget||o).forEach((function(e){var r=e.getAttribute(t);if($.state.isVisible)e.setAttribute(t,r?r+\" \"+n:n);else{var o=r&&r.replace(n,\"\").trim();o?e.setAttribute(t,o):e.removeAttribute(t)}}))}}function ue(){!K&&$.props.aria.expanded&&u($.props.triggerTarget||o).forEach((function(e){$.props.interactive?e.setAttribute(\"aria-expanded\",$.state.isVisible&&e===te()?\"true\":\"false\"):e.removeAttribute(\"aria-expanded\")}))}function ce(){ne().removeEventListener(\"mousemove\",W),H=H.filter((function(e){return e!==W}))}function pe(e){if(!x.isTouch||!N&&\"mousedown\"!==e.type){var t=e.composedPath&&e.composedPath()[0]||e.target;if(!$.props.interactive||!O(z,t)){if(u($.props.triggerTarget||o).some((function(e){return O(e,t)}))){if(x.isTouch)return;if($.state.isVisible&&$.props.trigger.indexOf(\"click\")>=0)return}else ae(\"onClickOutside\",[$,e]);!0===$.props.hideOnClick&&($.clearDelayTimeouts(),$.hide(),I=!0,setTimeout((function(){I=!1})),$.state.isMounted||ve())}}}function fe(){N=!0}function le(){N=!1}function de(){var e=ne();e.addEventListener(\"mousedown\",pe,!0),e.addEventListener(\"touchend\",pe,t),e.addEventListener(\"touchstart\",le,t),e.addEventListener(\"touchmove\",fe,t)}function ve(){var e=ne();e.removeEventListener(\"mousedown\",pe,!0),e.removeEventListener(\"touchend\",pe,t),e.removeEventListener(\"touchstart\",le,t),e.removeEventListener(\"touchmove\",fe,t)}function me(e,t){var n=re().box;function r(e){e.target===n&&(E(n,\"remove\",r),t())}if(0===e)return t();E(n,\"remove\",T),E(n,\"add\",r),T=r}function ge(e,t,n){void 0===n&&(n=!1),u($.props.triggerTarget||o).forEach((function(r){r.addEventListener(e,t,n),F.push({node:r,eventType:e,handler:t,options:n})}))}function he(){var e;Z()&&(ge(\"touchstart\",ye,{passive:!0}),ge(\"touchend\",Ee,{passive:!0})),(e=$.props.trigger,e.split(/\\s+/).filter(Boolean)).forEach((function(e){if(\"manual\"!==e)switch(ge(e,ye),e){case\"mouseenter\":ge(\"mouseleave\",Ee);break;case\"focus\":ge(D?\"focusout\":\"blur\",Oe);break;case\"focusin\":ge(\"focusout\",Oe)}}))}function be(){F.forEach((function(e){var t=e.node,n=e.eventType,r=e.handler,o=e.options;t.removeEventListener(n,r,o)})),F=[]}function ye(e){var t,n=!1;if($.state.isEnabled&&!xe(e)&&!I){var r=\"focus\"===(null==(t=C)?void 0:t.type);C=e,L=e.currentTarget,ue(),!$.state.isVisible&&m(e)&&H.forEach((function(t){return t(e)})),\"click\"===e.type&&($.props.trigger.indexOf(\"mouseenter\")<0||V)&&!1!==$.props.hideOnClick&&$.state.isVisible?n=!0:Le(e),\"click\"===e.type&&(V=!n),n&&!r&&De(e)}}function we(e){var t=e.target,n=te().contains(t)||z.contains(t);\"mousemove\"===e.type&&n||function(e,t){var n=t.clientX,r=t.clientY;return e.every((function(e){var t=e.popperRect,o=e.popperState,i=e.props.interactiveBorder,a=p(o.placement),s=o.modifiersData.offset;if(!s)return!0;var u=\"bottom\"===a?s.top.y:0,c=\"top\"===a?s.bottom.y:0,f=\"right\"===a?s.left.x:0,l=\"left\"===a?s.right.x:0,d=t.top-r+u>i,v=r-t.bottom-c>i,m=t.left-n+f>i,g=n-t.right-l>i;return d||v||m||g}))}(Ae().concat(z).map((function(e){var t,n=null==(t=e._tippy.popperInstance)?void 0:t.state;return n?{popperRect:e.getBoundingClientRect(),popperState:n,props:M}:null})).filter(Boolean),e)&&(ce(),De(e))}function Ee(e){xe(e)||$.props.trigger.indexOf(\"click\")>=0&&V||($.props.interactive?$.hideWithInteractivity(e):De(e))}function Oe(e){$.props.trigger.indexOf(\"focusin\")<0&&e.target!==te()||$.props.interactive&&e.relatedTarget&&z.contains(e.relatedTarget)||De(e)}function xe(e){return!!x.isTouch&&Z()!==e.type.indexOf(\"touch\")>=0}function Ce(){Te();var t=$.props,n=t.popperOptions,r=t.placement,i=t.offset,a=t.getReferenceClientRect,s=t.moveTransition,u=ee()?S(z).arrow:null,c=a?{getBoundingClientRect:a,contextElement:a.contextElement||te()}:o,p=[{name:\"offset\",options:{offset:i}},{name:\"preventOverflow\",options:{padding:{top:2,bottom:2,left:5,right:5}}},{name:\"flip\",options:{padding:5}},{name:\"computeStyles\",options:{adaptive:!s}},{name:\"$$tippy\",enabled:!0,phase:\"beforeWrite\",requires:[\"computeStyles\"],fn:function(e){var t=e.state;if(ee()){var n=re().box;[\"placement\",\"reference-hidden\",\"escaped\"].forEach((function(e){\"placement\"===e?n.setAttribute(\"data-placement\",t.placement):t.attributes.popper[\"data-popper-\"+e]?n.setAttribute(\"data-\"+e,\"\"):n.removeAttribute(\"data-\"+e)})),t.attributes.popper={}}}}];ee()&&u&&p.push({name:\"arrow\",options:{element:u,padding:3}}),p.push.apply(p,(null==n?void 0:n.modifiers)||[]),$.popperInstance=e.createPopper(c,z,Object.assign({},n,{placement:r,onFirstUpdate:A,modifiers:p}))}function Te(){$.popperInstance&&($.popperInstance.destroy(),$.popperInstance=null)}function Ae(){return f(z.querySelectorAll(\"[data-tippy-root]\"))}function Le(e){$.clearDelayTimeouts(),e&&ae(\"onTrigger\",[$,e]),de();var t=oe(!0),n=Q(),r=n[0],o=n[1];x.isTouch&&\"hold\"===r&&o&&(t=o),t?v=setTimeout((function(){$.show()}),t):$.show()}function De(e){if($.clearDelayTimeouts(),ae(\"onUntrigger\",[$,e]),$.state.isVisible){if(!($.props.trigger.indexOf(\"mouseenter\")>=0&&$.props.trigger.indexOf(\"click\")>=0&&[\"mouseleave\",\"mousemove\"].indexOf(e.type)>=0&&V)){var t=oe(!1);t?g=setTimeout((function(){$.state.isVisible&&$.hide()}),t):h=requestAnimationFrame((function(){$.hide()}))}}else ve()}}function F(e,n){void 0===n&&(n={});var r=R.plugins.concat(n.plugins||[]);document.addEventListener(\"touchstart\",T,t),window.addEventListener(\"blur\",L);var o=Object.assign({},n,{plugins:r}),i=h(e).reduce((function(e,t){var n=t&&_(t,o);return n&&e.push(n),e}),[]);return v(e)?i[0]:i}F.defaultProps=R,F.setDefaultProps=function(e){Object.keys(e).forEach((function(t){R[t]=e[t]}))},F.currentInput=x;var W=Object.assign({},e.applyStyles,{effect:function(e){var t=e.state,n={popper:{position:t.options.strategy,left:\"0\",top:\"0\",margin:\"0\"},arrow:{position:\"absolute\"},reference:{}};Object.assign(t.elements.popper.style,n.popper),t.styles=n,t.elements.arrow&&Object.assign(t.elements.arrow.style,n.arrow)}}),X={mouseover:\"mouseenter\",focusin:\"focus\",click:\"click\"};var Y={name:\"animateFill\",defaultValue:!1,fn:function(e){var t;if(null==(t=e.props.render)||!t.$$tippy)return{};var n=S(e.popper),r=n.box,o=n.content,i=e.props.animateFill?function(){var e=d();return e.className=\"tippy-backdrop\",y([e],\"hidden\"),e}():null;return{onCreate:function(){i&&(r.insertBefore(i,r.firstElementChild),r.setAttribute(\"data-animatefill\",\"\"),r.style.overflow=\"hidden\",e.setProps({arrow:!1,animation:\"shift-away\"}))},onMount:function(){if(i){var e=r.style.transitionDuration,t=Number(e.replace(\"ms\",\"\"));o.style.transitionDelay=Math.round(t/10)+\"ms\",i.style.transitionDuration=e,y([i],\"visible\")}},onShow:function(){i&&(i.style.transitionDuration=\"0ms\")},onHide:function(){i&&y([i],\"hidden\")}}}};var $={clientX:0,clientY:0},q=[];function z(e){var t=e.clientX,n=e.clientY;$={clientX:t,clientY:n}}var J={name:\"followCursor\",defaultValue:!1,fn:function(e){var t=e.reference,n=w(e.props.triggerTarget||t),r=!1,o=!1,i=!0,a=e.props;function s(){return\"initial\"===e.props.followCursor&&e.state.isVisible}function u(){n.addEventListener(\"mousemove\",f)}function c(){n.removeEventListener(\"mousemove\",f)}function p(){r=!0,e.setProps({getReferenceClientRect:null}),r=!1}function f(n){var r=!n.target||t.contains(n.target),o=e.props.followCursor,i=n.clientX,a=n.clientY,s=t.getBoundingClientRect(),u=i-s.left,c=a-s.top;!r&&e.props.interactive||e.setProps({getReferenceClientRect:function(){var e=t.getBoundingClientRect(),n=i,r=a;\"initial\"===o&&(n=e.left+u,r=e.top+c);var s=\"horizontal\"===o?e.top:r,p=\"vertical\"===o?e.right:n,f=\"horizontal\"===o?e.bottom:r,l=\"vertical\"===o?e.left:n;return{width:p-l,height:f-s,top:s,right:p,bottom:f,left:l}}})}function l(){e.props.followCursor&&(q.push({instance:e,doc:n}),function(e){e.addEventListener(\"mousemove\",z)}(n))}function d(){0===(q=q.filter((function(t){return t.instance!==e}))).filter((function(e){return e.doc===n})).length&&function(e){e.removeEventListener(\"mousemove\",z)}(n)}return{onCreate:l,onDestroy:d,onBeforeUpdate:function(){a=e.props},onAfterUpdate:function(t,n){var i=n.followCursor;r||void 0!==i&&a.followCursor!==i&&(d(),i?(l(),!e.state.isMounted||o||s()||u()):(c(),p()))},onMount:function(){e.props.followCursor&&!o&&(i&&(f($),i=!1),s()||u())},onTrigger:function(e,t){m(t)&&($={clientX:t.clientX,clientY:t.clientY}),o=\"focus\"===t.type},onHidden:function(){e.props.followCursor&&(p(),c(),i=!0)}}}};var G={name:\"inlinePositioning\",defaultValue:!1,fn:function(e){var t,n=e.reference;var r=-1,o=!1,i=[],a={name:\"tippyInlinePositioning\",enabled:!0,phase:\"afterWrite\",fn:function(o){var a=o.state;e.props.inlinePositioning&&(-1!==i.indexOf(a.placement)&&(i=[]),t!==a.placement&&-1===i.indexOf(a.placement)&&(i.push(a.placement),e.setProps({getReferenceClientRect:function(){return function(e){return function(e,t,n,r){if(n.length<2||null===e)return t;if(2===n.length&&r>=0&&n[0].left>n[1].right)return n[r]||t;switch(e){case\"top\":case\"bottom\":var o=n[0],i=n[n.length-1],a=\"top\"===e,s=o.top,u=i.bottom,c=a?o.left:i.left,p=a?o.right:i.right;return{top:s,bottom:u,left:c,right:p,width:p-c,height:u-s};case\"left\":case\"right\":var f=Math.min.apply(Math,n.map((function(e){return e.left}))),l=Math.max.apply(Math,n.map((function(e){return e.right}))),d=n.filter((function(t){return\"left\"===e?t.left===f:t.right===l})),v=d[0].top,m=d[d.length-1].bottom;return{top:v,bottom:m,left:f,right:l,width:l-f,height:m-v};default:return t}}(p(e),n.getBoundingClientRect(),f(n.getClientRects()),r)}(a.placement)}})),t=a.placement)}};function s(){var t;o||(t=function(e,t){var n;return{popperOptions:Object.assign({},e.popperOptions,{modifiers:[].concat(((null==(n=e.popperOptions)?void 0:n.modifiers)||[]).filter((function(e){return e.name!==t.name})),[t])})}}(e.props,a),o=!0,e.setProps(t),o=!1)}return{onCreate:s,onAfterUpdate:s,onTrigger:function(t,n){if(m(n)){var o=f(e.reference.getClientRects()),i=o.find((function(e){return e.left-2<=n.clientX&&e.right+2>=n.clientX&&e.top-2<=n.clientY&&e.bottom+2>=n.clientY})),a=o.indexOf(i);r=a>-1?a:r}},onHidden:function(){r=-1}}}};var K={name:\"sticky\",defaultValue:!1,fn:function(e){var t=e.reference,n=e.popper;function r(t){return!0===e.props.sticky||e.props.sticky===t}var o=null,i=null;function a(){var s=r(\"reference\")?(e.popperInstance?e.popperInstance.state.elements.reference:t).getBoundingClientRect():null,u=r(\"popper\")?n.getBoundingClientRect():null;(s&&Q(o,s)||u&&Q(i,u))&&e.popperInstance&&e.popperInstance.update(),o=s,i=u,e.state.isMounted&&requestAnimationFrame(a)}return{onMount:function(){e.props.sticky&&a()}}}};function Q(e,t){return!e||!t||(e.top!==t.top||e.right!==t.right||e.bottom!==t.bottom||e.left!==t.left)}return F.setDefaultProps({plugins:[Y,J,G,K],render:N}),F.createSingleton=function(e,t){var n;void 0===t&&(t={});var r,o=e,i=[],a=[],c=t.overrides,p=[],f=!1;function l(){a=o.map((function(e){return u(e.props.triggerTarget||e.reference)})).reduce((function(e,t){return e.concat(t)}),[])}function v(){i=o.map((function(e){return e.reference}))}function m(e){o.forEach((function(t){e?t.enable():t.disable()}))}function g(e){return o.map((function(t){var n=t.setProps;return t.setProps=function(o){n(o),t.reference===r&&e.setProps(o)},function(){t.setProps=n}}))}function h(e,t){var n=a.indexOf(t);if(t!==r){r=t;var s=(c||[]).concat(\"content\").reduce((function(e,t){return e[t]=o[n].props[t],e}),{});e.setProps(Object.assign({},s,{getReferenceClientRect:\"function\"==typeof s.getReferenceClientRect?s.getReferenceClientRect:function(){var e;return null==(e=i[n])?void 0:e.getBoundingClientRect()}}))}}m(!1),v(),l();var b={fn:function(){return{onDestroy:function(){m(!0)},onHidden:function(){r=null},onClickOutside:function(e){e.props.showOnCreate&&!f&&(f=!0,r=null)},onShow:function(e){e.props.showOnCreate&&!f&&(f=!0,h(e,i[0]))},onTrigger:function(e,t){h(e,t.currentTarget)}}}},y=F(d(),Object.assign({},s(t,[\"overrides\"]),{plugins:[b].concat(t.plugins||[]),triggerTarget:a,popperOptions:Object.assign({},t.popperOptions,{modifiers:[].concat((null==(n=t.popperOptions)?void 0:n.modifiers)||[],[W])})})),w=y.show;y.show=function(e){if(w(),!r&&null==e)return h(y,i[0]);if(!r||null!=e){if(\"number\"==typeof e)return i[e]&&h(y,i[e]);if(o.indexOf(e)>=0){var t=e.reference;return h(y,t)}return i.indexOf(e)>=0?h(y,e):void 0}},y.showNext=function(){var e=i[0];if(!r)return y.show(0);var t=i.indexOf(r);y.show(i[t+1]||e)},y.showPrevious=function(){var e=i[i.length-1];if(!r)return y.show(e);var t=i.indexOf(r),n=i[t-1]||e;y.show(n)};var E=y.setProps;return y.setProps=function(e){c=e.overrides||c,E(e)},y.setInstances=function(e){m(!0),p.forEach((function(e){return e()})),o=e,m(!1),v(),l(),p=g(y),y.setProps({triggerTarget:a})},p=g(y),y},F.delegate=function(e,n){var r=[],o=[],i=!1,a=n.target,c=s(n,[\"target\"]),p=Object.assign({},c,{trigger:\"manual\",touch:!1}),f=Object.assign({touch:R.touch},c,{showOnCreate:!0}),l=F(e,p);function d(e){if(e.target&&!i){var t=e.target.closest(a);if(t){var r=t.getAttribute(\"data-tippy-trigger\")||n.trigger||R.trigger;if(!t._tippy&&!(\"touchstart\"===e.type&&\"boolean\"==typeof f.touch||\"touchstart\"!==e.type&&r.indexOf(X[e.type])<0)){var s=F(t,f);s&&(o=o.concat(s))}}}}function v(e,t,n,o){void 0===o&&(o=!1),e.addEventListener(t,n,o),r.push({node:e,eventType:t,handler:n,options:o})}return u(l).forEach((function(e){var n=e.destroy,a=e.enable,s=e.disable;e.destroy=function(e){void 0===e&&(e=!0),e&&o.forEach((function(e){e.destroy()})),o=[],r.forEach((function(e){var t=e.node,n=e.eventType,r=e.handler,o=e.options;t.removeEventListener(n,r,o)})),r=[],n()},e.enable=function(){a(),o.forEach((function(e){return e.enable()})),i=!1},e.disable=function(){s(),o.forEach((function(e){return e.disable()})),i=!0},function(e){var n=e.reference;v(n,\"touchstart\",d,t),v(n,\"mouseover\",d),v(n,\"focusin\",d),v(n,\"click\",d)}(e)})),l},F.hideAll=function(e){var t=void 0===e?{}:e,n=t.exclude,r=t.duration;U.forEach((function(e){var t=!1;if(n&&(t=g(n)?e.reference===n:e.popper===n.popper),!t){var o=e.props.duration;e.setProps({duration:r}),e.hide(),e.state.isDestroyed||e.setProps({duration:o})}}))},F.roundArrow='<svg height=\"6\" width=\"16\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M0 6s1.796-.013 4.67-3.615C5.851.9 6.93.006 8 0c1.07-.006 2.148.887 3.343 2.385C14.233 6.005 16 6 16 6H0z\"></svg>',F})); /* Hover-preview initialization for enscribe note markers, cross-reference * links, and citation markers. * * Attaches Tippy.js tooltips to: * - <sup data-note-id=\"...\"> note markers (showing note content) * - <a class=\"ref\" href=\"#...\"> cross-reference links (showing the target element) * - <cite class=\"cite\" data-keys=\"...\"> citation markers (showing bib entries) * * Requires: tippy.js (bundled by enscribe or loaded from CDN). * The tippy-bundle includes @popperjs/core so no separate Popper script needed. */ (function () { /** * Extract clean note content from a <li>element, stripping the leading * <sup> marker and the trailing back-arrow link that appear in the list. * Tooltips should show only the note's prose content. * * @param {Element} noteEl The <li>element from the note list. * @returns {string} innerHTML of the cloned, stripped element. */ function getNoteContent(noteEl) { var clone = noteEl.cloneNode(true); // Remove leading superscript marker (e.g. <sup>2</sup>). var sup = clone.querySelector('sup'); if (sup) sup.remove(); // Remove trailing back-arrow link (e.g. <a class=\"note-backref\">↩</a>). var backref = clone.querySelector('.note-backref'); if (backref) backref.remove(); return clone.innerHTML.trim(); } /** * Extract equation content from a display-math element, stripping the * equation-number span so the tooltip shows only the math itself. * * @param {Element} el The display-math element. * @returns {string} innerHTML of the cloned, stripped element. */ function getEquationContent(el) { var clone = el.cloneNode(true); var numSpan = clone.querySelector('.equation-number'); if (numSpan) numSpan.remove(); return clone.innerHTML.trim(); } /** * Extract figure content from a <figure>element, stripping the * figure-label span so the tooltip shows image + caption without \"Figure N.\". * * @param {Element} el The <figure>element. * @returns {string} outerHTML of the cloned, stripped element. */ function getFigureContent(el) { var clone = el.cloneNode(true); var label = clone.querySelector('.figure-label'); if (label) label.remove(); return clone.outerHTML; } /** * Get tooltip content for a <table>cross-reference target. * Strips the \"Table N.\" label span to keep the preview compact. * * @param {Element} el The <table>element. * @returns {string} outerHTML of the cloned, stripped element. */ function getTableContent(el) { var clone = el.cloneNode(true); clone.querySelectorAll('.table-label').forEach(function(n) { n.remove(); }); return clone.outerHTML; } /** * Dispatch to the appropriate content extractor based on the target element type. * * @param {Element} targetEl The element pointed to by a ref link. * @returns {string} HTML string to use as tooltip content. */ function getRefTargetContent(targetEl) { var tagName = targetEl.tagName.toLowerCase(); if (tagName === 'display-math') return getEquationContent(targetEl); if (tagName === 'figure') return getFigureContent(targetEl); if (tagName === 'table') return getTableContent(targetEl); if (tagName === 'li') return getNoteContent(targetEl); return targetEl.outerHTML; } /** * Attach a Tippy tooltip to a note marker <sup> element. * * @param {Element} marker The <sup data-note-id=\"...\"> element. */ function attachNoteTooltip(marker) { var noteId = marker.getAttribute('data-note-id'); var noteEl = document.getElementById(noteId); if (!noteEl) return; tippy(marker, { content: getNoteContent(noteEl), allowHTML: true, interactive: true, placement: 'top', theme: 'light-border', maxWidth: 400, appendTo: document.body, }); } /** * Attach a Tippy tooltip to an <a class=\"ref\"> cross-reference link. * The tooltip shows the content of the element the ref points to. * Refs pointing to missing targets are silently skipped. * * @param {Element} linkEl The <a class=\"ref\" href=\"#...\"> element. */ function attachRefTooltip(linkEl) { // -preview opt-out: ref-resolution.js / handlers/ref.js stamp // data-no-preview=\"true\" when the author wrote -preview on the <ref>. if (linkEl.getAttribute('data-no-preview') === 'true') return; var href = linkEl.getAttribute('href'); if (!href || href.charAt(0) !== '#') return; var targetId = href.slice(1); var targetEl = document.getElementById(targetId); if (!targetEl) return; var content = getRefTargetContent(targetEl); if (!content) return; var maxWidth = (function() { var t = targetEl.tagName.toLowerCase(); if (t === 'display-math') return 500; if (t === 'table') return 600; return 420; })(); tippy(linkEl, { content: content, allowHTML: true, interactive: false, placement: 'top', theme: 'light-border', maxWidth: maxWidth, appendTo: document.body, }); } /** * Build tooltip content for a <cite class=\"cite\"> element. * Looks up each key in data-keys by finding the #ref-KEY element in the * bibliography and returning its innerHTML. Keys missing from the * bibliography get a placeholder message. * * @param {Element} citeEl The <cite class=\"cite\"> element. * @returns {string} HTML string for the tooltip, or '' if no keys found. */ function getCiteContent(citeEl) { var keysAttr = citeEl.getAttribute('data-keys') || ''; if (!keysAttr) return ''; var keys = keysAttr.split(',').map(function(k) { return k.trim(); }).filter(Boolean); if (keys.length === 0) return ''; var items = keys.map(function(key) { var refEl = document.getElementById('ref-' + key); if (refEl) { return '<li>' + refEl.innerHTML + '</li>'; } return '<li class=\"cite-missing\"><em>' + key + '</em> (not in bibliography)</li>'; }); return '<ul class=\"cite-tooltip-list\">' + items.join('') + '</ul>'; } /** * Attach a Tippy tooltip to a <cite class=\"cite\"> citation marker. * Shows full bibliography entries for each cited key. * cite-error elements are deliberately excluded (no tooltip on errors). * * @param {Element} citeEl The <cite class=\"cite\"> element. */ function attachCiteTooltip(citeEl) { var content = getCiteContent(citeEl); if (!content) return; tippy(citeEl, { content: content, allowHTML: true, interactive: true, placement: 'top', theme: 'light-border', maxWidth: 500, appendTo: document.body, }); } function init() { document.querySelectorAll('sup[data-note-id]').forEach(attachNoteTooltip); document.querySelectorAll('a.ref[href^=\"#\"]').forEach(attachRefTooltip); document.querySelectorAll('cite.cite').forEach(attachCiteTooltip); } if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); } })(); </script><link href=\"https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,600;0,700;1,400;1,700&#x26;family=Source+Code+Pro:wght@400&#x26;display=swap\" rel=\"stylesheet\"><article><article-body><p>A definition<sup data-note-id=\"note-1\" id=\"noteref-1\"><a href=\"#note-1\">1</a></sup>.</p></article-body><article-back><note-list class=\"notes\"><ol><li class=\"sidenote-fallback\" id=\"note-1\"><sup>1</sup><p>Inline-adjacent note.</p><a aria-label=\"back to text\" class=\"note-backref\" href=\"#noteref-1\">↩</a></li></ol></note-list>",
      },
    ],
    "related_plugins": [
      {
        "name": "enscribeNotes",
        "runs_after": "enscribeSectionNesting",
        "purpose": "Assigns sequential numbers, replaces <note> nodes with markers,\ncollects content into <note-list> at the appropriate location.\n",
      },
    ],
    "_sourceFile": "note.md",
  });

const _orcid = Object.freeze({
    "semantic_role": "orcid",
    "category": "metadata",
    "html_output": {
      "element": "orcid",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
      "notes": "The ORCID identifier as text. The canonical form is the bare 16-digit\nID with hyphens (e.g. \"0000-0002-1825-0097\"); URL form\n(\"https://orcid.org/0000-0002-1825-0097\") is also accepted but the\nbare form is preferred — tooling can construct the URL when needed.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "contrib-id",
      "attributes": {
        "contrib-id-type": "orcid",
      },
      "notes": "JATS uses <contrib-id contrib-id-type=\"orcid\">ID</contrib-id> inside\n<contrib>. The exporter constructs the contrib-id element with the\ncontrib-id-type attribute set to \"orcid\" from the value in <orcid>.\n",
    },
    "shorthand_examples": [
      {
        "source": "<author>\n  <name | Jane Goodall>\n  <orcid | 0000-0002-1825-0097>\n</author>\n",
        "layer1_html": "<author>\n  <name>Jane Goodall</name>\n  <orcid>0000-0002-1825-0097</orcid>\n</author>\n",
        "notes": "Bare 16-digit ORCID — the canonical form.\n",
      },
      {
        "source": "<author>\n  <name | Jane Goodall>\n  <orcid | https://orcid.org/0000-0002-1825-0097>\n</author>\n",
        "layer1_html": "<author><name>Jane Goodall</name><orcid><a href=\"https://orcid.org/0000-0002-1825-0097\">https://orcid.org/0000-0002-1825-0097</a></orcid></author>",
        "notes": "URL form is accepted but bare form is preferred.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "orcid.md",
  });

const _output = Object.freeze({
    "semantic_role": "output",
    "category": "inline-formatting",
    "html_output": {
      "element": "output",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
      "notes": "The result of a calculation as text — typically a single value\nor short result fragment.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "(no direct JATS counterpart; HTML-native)",
      "notes": "JATS has no dedicated element for calculation results. The\nexporter emits the content as inline text with no special JATS\nmarkup. The same situation as the other programming-related\nHTML-native inline elements (<kbd>, <var>, <samp>); recorded\nhonestly per the <lang>  precedent.\n",
    },
    "shorthand_examples": [
      {
        "source": "The function returns <output | 42> for the test input.",
        "layer1_html": "<p>The function returns <output>42</output> for the test input.</p>",
        "notes": "Result of a calculation in prose. <output> is semantically\ndistinct from <samp> — <samp> is what a program prints (a\ndisplay artifact); <output> is the result of a computation\n(a semantic value). Browsers render both similarly.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "output.md",
  });

const _p = Object.freeze({
    "semantic_role": "p",
    "category": "block-prose",
    "html_output": {
      "element": "p",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "type": {
          "maps_to": {
            "html": "data-paragraph-type",
          },
          "values": [
            "normal",
            "lead",
            "intro",
            "abstract",
            "summary",
            "other",
          ],
          "notes": "Optional classification of the paragraph's role. Mostly used for\nstyling (lead paragraphs render larger; abstract paragraphs styled\ndistinctly).\n",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "p",
      "notes": "Direct mapping to JATS <p>. JATS does not have paragraph type\nclassifications natively; the data-paragraph-type attribute is\npreserved as an HTML data attribute but does not appear in JATS export.\n",
    },
    "shorthand_examples": [
      {
        "source": "<p | A simple paragraph.>",
        "layer1_html": "<p>A simple paragraph.</p>",
      },
      {
        "source": "A paragraph written without explicit tags.",
        "layer1_html": "<p>A paragraph written without explicit tags.</p>",
        "notes": "In most cases, paragraphs do not need to be written with explicit\ntags. Plain markdown handles paragraph separation: blank lines\ndelineate paragraphs. The explicit <p> form is used when attributes\n(id, classes, type) are needed.\n",
      },
      {
        "source": "<p type=lead | The opening paragraph of an article.>",
        "layer1_html": "<p data-paragraph-type=\"lead\">The opening paragraph of an article.</p>",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "p.md",
  });

const _proof = Object.freeze({
    "semantic_role": "proof",
    "category": "theorem-family",
    "html_output": {
      "element": "proof",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "name": {
          "maps_to": {
            "html": "data-name",
          },
          "notes": "Optional name suffix — e.g. \"Proof (of Theorem 1.2)\" or\n\"Proof (sketch)\". Honored by the Phase-2 handler.\n",
        },
      },
      "booleans": {
        "numbered": {
          "handled_by": "handler",
          "default": false,
          "notes": "Whether this proof is numbered. Default false — proofs are\nconventionally unnumbered (a proof's identity comes from the\ntheorem it proves, not from a counter). An author who wants\nnumbering can opt-in per instance with +numbered.\n",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "block",
        ],
      },
      "becomes": "children",
      "notes": "The proof body — paragraphs, math, lists, etc. The closing QED\nsymbol is rendered by the Phase-2 handler at the end of the\nbody, not authored explicitly.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "statement",
      "attributes": {
        "content-type": "proof",
      },
      "notes": "JATS <statement content-type=\"proof\">. <proof> is a peer-level\nelement in both JATS and enscribe, not nested inside the\ntheorem it proves.\n",
    },
    "shorthand_examples": [
      {
        "source": "<theorem | The sum of two even integers is even.>\n\n<proof>\nLet $a = 2m$ and $b = 2n$. Then $a + b = 2(m + n)$, which is\neven. $\\square$\n</proof>\n",
        "layer1_html": "<theorem>The sum of two even integers is even.</theorem>\n<proof>Let $a = 2m$ and $b = 2n$. Then $a + b = 2(m + n)$, which is even. $\\square$</proof>\n",
        "notes": "The canonical pattern: <theorem> followed by sibling <proof>.\nThe proof is NOT nested inside the theorem.\n",
      },
      {
        "source": "<proof name=\"of Theorem 1.2\">\nThe argument follows from the preceding lemma.\n</proof>\n",
        "layer1_html": "<proof data-name=\"of Theorem 1.2\"><span class=\"proof-label\">Proof.</span><p>The argument follows from the preceding lemma.</p></proof>",
        "notes": "Optional `name` kwarg lets the proof identify what it proves\n(useful when the proof is separated from its theorem by\nintervening text).\n",
      },
    ],
    "interpreter_strategy": "handler",
    "handler_module": "./handlers/theorem.js",
    "_sourceFile": "proof.md",
  });

const _proposition = Object.freeze({
    "semantic_role": "proposition",
    "category": "theorem-family",
    "html_output": {
      "element": "proposition",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "name": {
          "maps_to": {
            "html": "data-name",
          },
          "notes": "Optional name suffix for the proposition's label.\n",
        },
      },
      "booleans": {
        "numbered": {
          "handled_by": "handler",
          "default": true,
          "notes": "Whether this proposition participates in the propositional\ntheorem-family shared counter. Default true.\n",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "block",
        ],
      },
      "becomes": "children",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "statement",
      "attributes": {
        "content-type": "proposition",
      },
      "notes": "JATS <statement content-type=\"proposition\">.\n",
    },
    "shorthand_examples": [
      {
        "source": "<proposition | The sum of two even integers is even.>\n",
        "layer1_html": "<proposition><span class=\"proposition-label\">Proposition 1.</span><p>The sum of two even integers is even.</p></proposition>",
      },
      {
        "source": "<proposition name=\"Cauchy-Schwarz\">\nFor any vectors $u$, $v$ in an inner-product space,\n$|\\langle u, v \\rangle| \\le \\|u\\| \\, \\|v\\|$.\n</proposition>\n",
        "layer1_html": "<proposition data-name=\"Cauchy-Schwarz\">For any vectors $u$, $v$ in an inner-product space, $|\\langle u, v \\rangle| \\le \\|u\\| \\, \\|v\\|$.</proposition>\n",
      },
    ],
    "interpreter_strategy": "handler",
    "handler_module": "./handlers/theorem.js",
    "_sourceFile": "proposition.md",
  });

const _publication_date = Object.freeze({
    "semantic_role": "publication-date",
    "category": "metadata",
    "html_output": {
      "element": "publication-date",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "format": {
          "maps_to": {
            "html": "data-date-format",
          },
          "values": [
            "iso",
            "ymd",
            "ymd-time",
            "mdy",
            "dmy",
            "custom",
          ],
          "notes": "Optional hint about how the date should be parsed and formatted.\nDefault is iso (YYYY-MM-DD). Same set as <date>'s format kwarg.\n",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
      "notes": "The publication date as text. ISO 8601 (YYYY-MM-DD) is preferred\nfor machine readability; free-form dates (\"March 15, 2024\",\n\"Spring 2024\") are accepted.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "pub-date",
      "notes": "JATS uses <pub-date> inside <article-meta> for the publication\ndate. The exporter parses ISO-format dates into structured\n<year>/<month>/<day> children; free-form dates pass through as\ntext content.\n",
    },
    "shorthand_examples": [
      {
        "source": "<meta>\n  <publication-date | 2024-03-15>\n</meta>\n",
        "layer1_html": "<meta>\n  <publication-date>2024-03-15</publication-date>\n</meta>\n",
        "notes": "ISO 8601 publication date — the preferred form.\n",
      },
      {
        "source": "<meta>\n  <publication-date | March 15, 2024>\n</meta>\n",
        "layer1_html": "<meta>\n  <publication-date>March 15, 2024</publication-date>\n</meta>\n",
        "notes": "Free-form publication date. Acceptable but ISO 8601 is preferred\nfor predictable JATS export and machine readability.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "publication-date.md",
  });

const _q = Object.freeze({
    "semantic_role": "q",
    "category": "inline-formatting",
    "html_output": {
      "element": "q",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "cite": {
          "maps_to": {
            "html": "cite",
          },
          "notes": "URL of the source being quoted. Same as <blockquote>'s cite\nattribute but for inline quotations.\n",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "inline-quote or just text with quotation marks",
      "notes": "JATS doesn't have a dedicated inline-quotation element. The exporter\ntypically emits the quoted text wrapped in literal quotation marks\n(Unicode left/right double quotes) rather than a JATS element.\n",
    },
    "shorthand_examples": [
      {
        "source": "She said <q | hello> in passing.",
        "layer1_html": "<p>She said <q>hello</q> in passing.</p>",
        "notes": "Browsers automatically render <q> with quotation marks. Authors\ndo not include quotation marks in the content.\n",
      },
      {
        "source": "The phrase <q cite=https://example.com | to be or not to be> is iconic.",
        "layer1_html": "<p>The phrase <q cite=\"https://example.com\">to be or not to be</q> is iconic.</p>",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "q.md",
  });

const _ref = Object.freeze({
    "semantic_role": "ref",
    "category": "citations-and-references",
    "html_output": {
      "element": "ref",
      "is_html_native": false,
      "default_attributes": {},
      "notes": "Enscribe's <ref> is a custom element for cross-references. Distinct\nfrom JATS's <ref> (which represents a bibliography reference; in\nenscribe, that's <bib-entry>). Renders as a link to the target with\nappropriate text generated by the resolver.\n",
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "target": {
          "handled_by": "handler",
          "notes": "The id of the element being referenced. The canonical form uses the\n@id prefix (@ is the reference sigil): <ref @eqn:model>. A #id prefix\non a <ref> declares an id ON THE <ref> ELEMENT ITSELF (not a target),\nso <ref #eqn:model> is a broken reference. A kwarg form is also\naccepted as legacy: <ref target=eqn:model>.\nIMPORTANT (current implementation): only colon-ids (ids containing\na colon, e.g., eqn:model, fig:scatter) are in the label index and\ncan be resolved. Non-colon ids produce an unresolved error marker.\nThis restriction may be relaxed in a future slice.\n",
        },
        "type": {
          "maps_to": {
            "html": "data-ref-type",
          },
          "values": [
            "auto",
            "figure",
            "table",
            "equation",
            "section",
            "sub-section",
            "note",
            "listing",
            "theorem",
            "other",
          ],
          "default": "auto",
          "notes": "Author-supplied hint about the intended kind of target. Flows\nthrough to a data-ref-type attribute on the rendered anchor,\navailable for CSS/JS to use. The resolver-generated display text\nis still computed from the id prefix and the DEFAULT_PREFIXES\ndictionary; this kwarg does not currently override that text.\n",
        },
        "format": {
          "maps_to": {
            "html": "data-ref-format",
          },
          "values": [
            "number",
            "name",
            "full",
            "label-only",
            "default",
          ],
          "default": "default",
          "notes": "Author-supplied formatting hint. Flows through to a\ndata-ref-format attribute on the rendered anchor, available for\nCSS/JS. The resolver-generated display text is still computed\nfrom the prefix dictionary; future enhancements may use this\nattribute to vary the rendered text.\n",
        },
      },
      "booleans": {
        "link": {
          "handled_by": "handler",
          "default": true,
          "notes": "Controls whether the rendered ref is a navigable hyperlink. Default\nis +link, producing <a href=\"#targetId\" class=\"ref\">...</a>. The\n-link form produces <span class=\"ref\">...</span> instead — useful\nwhen the author wants the ref's display text without making it a\nnavigable anchor (e.g. inside a passage that itself describes the\ncross-reference rather than invoking it).\n",
        },
        "preview": {
          "handled_by": "handler",
          "default": true,
          "notes": "Controls the hover preview that attaches to the rendered ref by\ndefault. Default +preview attaches a tippy tooltip showing the\ntarget element's content. -preview adds data-no-preview=\"true\"\nto the rendered anchor; the hover-preview script's attacher\nskips elements with that attribute.\n",
        },
        "title": {
          "handled_by": "handler",
          "default": true,
          "notes": "Reserved / unimplemented. The original intent has not been\nrecovered; deliberately set aside until that intent is\narticulated. Future work, not a current feature.\n",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
      "notes": "Optional override for the rendered cross-reference text. Most refs\nhave no content; the resolver generates the text automatically.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "xref ref-type=\"...\"",
      "notes": "JATS uses <xref> with ref-type indicating the kind of target\n(fig, table, sec, equation, fn, etc.). Enscribe's <ref> maps\nto <xref> with the appropriate ref-type derived from the target.\n",
    },
    "shorthand_examples": [
      {
        "source": "See <ref @fig:scatter> for details.",
        "html_output": "<p>See <a href=\"#fig:scatter\" class=\"ref\">figure 1</a> for details.</p>",
        "notes": "Canonical form: @id prefix (@ references; # would declare an id on the\n<ref> itself). The ref-resolution plugin replaces the\n<ref> node with a __ref-marker before hast conversion. The handler\nthen renders an <a> element with computed text. Prefix word is\nlowercase, from the DEFAULT_PREFIXES dictionary keyed by id prefix.\n",
      },
      {
        "source": "As shown in <ref @eqn:model>.",
        "html_output": "<p>As shown in <a href=\"#eqn:model\" class=\"ref\">equation 1</a>.</p>",
        "notes": "Equation references use the \"equation\" prefix word by default.\nConfig override: <config ref-prefix-eqn=\"Eq.\"> changes this to \"Eq.\".\n",
      },
      {
        "source": "<ref @eqn:missing>",
        "html_output": "<a href=\"#eqn:missing\" class=\"ref-error\">??ref: eqn:missing??</a>",
        "notes": "Unresolved target renders a visible error anchor.\n",
      },
    ],
    "interpreter_strategy": "handler",
    "handler_module": "./handlers/ref.js",
    "handler_responsibilities": [
      "ref-resolution plugin (runs before hast): resolve <ref> nodes against the shared label index; replace each with __ref-marker (resolved) or __ref-error (unresolved). Only colon-ids are referenceable.",
      "__ref-marker handler: render an anchor with href=\"#id\", class=\"ref\", and pre-computed text from node.kwargs.text. Text is produced by the ref-resolution plugin using DEFAULT_PREFIXES (\"equation N\", \"figure N\", etc.) or label-tail for unnumbered labeled targets.",
      "__ref-error handler: render an anchor with href=\"#id\", class=\"ref-error\", and text \"??ref: id??\".",
    ],
    "related_plugins": [
      {
        "name": "enscribeRefResolution",
        "runs_after": "enscribeArticleStructuring, numbering plugins",
        "purpose": "Resolves <ref> elements against the numbered-elements registry; generates link text. See notes/specs/pipeline.md for the full pipeline.",
      },
    ],
    "_sourceFile": "ref.md",
  });

const _remark = Object.freeze({
    "semantic_role": "remark",
    "category": "theorem-family",
    "html_output": {
      "element": "remark",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "name": {
          "maps_to": {
            "html": "data-name",
          },
          "notes": "Optional name suffix for the remark's label. Honored by the\nPhase-2 handler even though <remark> is unnumbered (a named\nremark may render as \"Remark (Name):\" without a number).\n",
        },
      },
      "booleans": {
        "numbered": {
          "handled_by": "handler",
          "default": false,
          "notes": "Whether this remark is numbered. Default false — <remark> is\nconventionally unnumbered (the \"remark\" theorem-style family\nin amsthm is unnumbered). An author who wants numbering can\nopt-in per instance with +numbered, but most usage relies on\nthe default.\n",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "block",
        ],
      },
      "becomes": "children",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "statement",
      "attributes": {
        "content-type": "remark",
      },
      "notes": "JATS <statement content-type=\"remark\">.\n",
    },
    "shorthand_examples": [
      {
        "source": "<remark | The converse does not hold in general.>\n",
        "layer1_html": "<remark><span class=\"remark-label\">Remark.</span><p>The converse does not hold in general.</p></remark>",
      },
      {
        "source": "<remark>\nThe hypothesis of compactness is essential here; without it\nthe conclusion fails (consider $f(x) = 1/x$ on $(0, 1]$).\n</remark>\n",
        "layer1_html": "<remark>The hypothesis of compactness is essential here; without it the conclusion fails (consider $f(x) = 1/x$ on $(0, 1]$).</remark>\n",
      },
    ],
    "interpreter_strategy": "handler",
    "handler_module": "./handlers/theorem.js",
    "_sourceFile": "remark.md",
  });

const _s = Object.freeze({
    "semantic_role": "s",
    "category": "inline-formatting",
    "html_output": {
      "element": "s",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "type": {
          "maps_to": {
            "html": "data-strikethrough-type",
          },
          "values": [
            "outdated",
            "retracted",
            "deleted",
            "other",
          ],
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "strike",
      "notes": "JATS uses <strike> for strikethrough text.\n",
    },
    "shorthand_examples": [
      {
        "source": "The price is ~~$50~~ now $40.",
        "layer1_html": "<p>The price is <s>$50</s> now $40.</p>",
        "notes": "GFM's tilde syntax produces <s> elements. The most common\nauthoring path for casual strikethrough.\n",
      },
      {
        "source": "The claim <s type=retracted | was unsupported> has been corrected.",
        "layer1_html": "<p>The claim <s data-strikethrough-type=\"retracted\">was unsupported</s> has been corrected.</p>",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "s.md",
  });

const _samp = Object.freeze({
    "semantic_role": "samp",
    "category": "inline-formatting",
    "html_output": {
      "element": "samp",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
      "notes": "The sample output as text — typically a literal value, message,\nor short fragment a program would produce.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "(no direct JATS counterpart; HTML-native)",
      "notes": "JATS has no dedicated element for sample output. The exporter\nemits the content as inline text with no special JATS markup.\nThe same situation as the other programming-related HTML-native\ninline elements (<kbd>, <var>, <output>); recorded honestly per\nthe <lang> precedent.\n",
    },
    "shorthand_examples": [
      {
        "source": "The command prints <samp | Hello, world!> to stdout.",
        "layer1_html": "<p>The command prints <samp>Hello, world!</samp> to stdout.</p>",
        "notes": "Sample output from a program. Browsers render <samp> in a\nmonospace font by default, distinguishing it from surrounding\nprose.\n",
      },
      {
        "source": "Set <var | threshold> to <samp | 0.05>.",
        "layer1_html": "<p>Set <var>threshold</var> to <samp>0.05</samp>.</p>",
        "notes": "<samp> for the sample value paired with <var> for the variable\nname — the natural pair for documenting configuration in\ntechnical writing.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "samp.md",
  });

const _section_subtitle = Object.freeze({
    "semantic_role": "section-subtitle",
    "category": "metadata",
    "authoring": "generated",
    "html_output": {
      "element": "section-subtitle",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
    },
    "content_handler": "default",
    "interpreter_strategy": "schema",
    "_sourceFile": "section-subtitle.md",
  });

const _section_title = Object.freeze({
    "semantic_role": "section-title",
    "category": "metadata",
    "authoring": "generated",
    "html_output": {
      "element": "section-title",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
    },
    "content_handler": "default",
    "interpreter_strategy": "schema",
    "_sourceFile": "section-title.md",
  });

const _section = Object.freeze({
    "semantic_role": "section",
    "category": "sections",
    "html_output": {
      "element": "section",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "sec-type": {
          "maps_to": {
            "html": "data-sec-type",
          },
          "values": [
            "intro",
            "methods",
            "results",
            "discussion",
            "conclusion",
            "supplementary",
            "materials",
            "references",
            "other",
          ],
          "notes": "Optional classification of the section's role. Maps to JATS sec-type\nattribute. Values match common JATS conventions for IMRaD-style papers.\n",
        },
        "numbering-style": {
          "maps_to": {
            "html": "data-numbering-style",
          },
          "values": [
            "arabic",
            "roman",
            "alpha",
            "none",
          ],
          "notes": "Override the inherited numbering style for this section.",
        },
      },
      "booleans": {
        "unlisted": {
          "maps_to": {
            "html": "unlisted",
          },
          "default": false,
          "notes": "Keep this section out of the generated table of contents, regardless of\ntoc-depth (#218). Display-only: the section still renders; it is only\nabsent from the contents listing. The ToC is config-driven\n(<config toc=true>); see notes/specs/toc-and-numbering.md. Authored as\n+unlisted (the boolean shorthand); renders to the HTML attribute unlisted.\n",
        },
        "unnumbered": {
          "maps_to": {
            "html": "unnumbered",
          },
          "default": false,
          "notes": "Skip this section's number, regardless of number-depth (#218). The heading\nis OUTSIDE the numbered sequence — it gets no number AND does not advance the\ncounter, so the next numbered sibling continues unbroken (the \\\\section* /\nQuarto .unnumbered behavior); its subtree is unnumbered too. Numbering is\nconfig-driven (<config number-sections=true>); see\nnotes/specs/toc-and-numbering.md. Authored as +unnumbered; the number stamp\nreads node.booleans.unnumbered in runSync, and the unnumbered attribute also\nrenders on the element.\n",
        },
      },
    },
    "content": {
      "shape": [
        {
          "element": "section-title",
          "required": false,
          "contains": [
            "inline",
          ],
        },
        {
          "element": "section-subtitle",
          "required": false,
          "contains": [
            "inline",
          ],
        },
        {
          "element": "body",
          "required": false,
          "contains": [
            "block",
            "section",
          ],
        },
      ],
    },
    "content_handler": "default",
    "title_extraction": true,
    "jats_counterpart": {
      "element": "sec",
      "attributes": {
        "sec-type": "from sec-type",
      },
      "notes": "JATS uses recursive <sec> for all section depths. Enscribe uses named\ndepth (<section>, <sub-section>, <sub-sub-section>) for explicit\nsemantic clarity. The JATS exporter maps enscribe's depth ladder to\nnested <sec> elements.\n",
    },
    "shorthand_examples": [
      {
        "source": "<section | Introduction>\nThe paper begins here.\n",
        "layer1_html": "<section>\n  <section-title>Introduction</section-title>\n  <p>The paper begins here.</p>\n</section>\n",
      },
      {
        "source": "<section #methods sec-type=methods | Methods>\n<section-subtitle | A description of our experimental approach>\nThe methods used in this study were as follows.\n",
        "layer1_html": "<section id=\"methods\" data-sec-type=\"methods\">\n  <section-title>Methods</section-title>\n  <section-subtitle>A description of our experimental approach</section-subtitle>\n  <p>The methods used in this study were as follows.</p>\n</section>\n",
      },
      {
        "source": "<section | Results>\nResults paragraph.\n\n<sub-section | Quantitative analysis>\nSub-section content.\n\n<sub-section | Qualitative observations>\nSub-section content.\n",
        "layer1_html": "<section>\n  <section-title>Results</section-title>\n  <p>Results paragraph.</p>\n  <sub-section>\n    <sub-section-title>Quantitative analysis</sub-section-title>\n    <p>Sub-section content.</p>\n  </sub-section>\n  <sub-section>\n    <sub-section-title>Qualitative observations</sub-section-title>\n    <p>Sub-section content.</p>\n  </sub-section>\n</section>\n",
      },
    ],
    "interpreter_strategy": "schema",
    "related_plugins": [
      {
        "name": "enscribeSectionNesting",
        "runs_before": "enscribeInterpreter",
        "purpose": "Phase 2 — implicit closing of peer sections. See notes/specs/pipeline.md for the full pipeline.",
      },
    ],
    "_sourceFile": "section.md",
  });

const _span = Object.freeze({
    "semantic_role": "span",
    "category": "inline-formatting",
    "html_output": {
      "element": "span",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "style": {
          "maps_to": {
            "html": "style",
          },
          "notes": "Inline CSS styles. Use sparingly; classes are usually preferable.\n",
        },
        "title": {
          "maps_to": {
            "html": "title",
          },
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "styled-content",
      "notes": "JATS uses <styled-content> for generic styled inline content.\nThe class attribute maps to JATS's style-type attribute.\n",
    },
    "shorthand_examples": [
      {
        "source": "Some text <span .highlight | with highlighting> here.",
        "layer1_html": "<p>Some text <span class=\"highlight\">with highlighting</span> here.</p>",
      },
      {
        "source": "Text with <span #key-phrase | a marked phrase> for reference.",
        "layer1_html": "<p>Text with <span id=\"key-phrase\">a marked phrase</span> for reference.</p>",
      },
      {
        "source": "A <span .gloss title=\"ancient Greek for word\" | logos> appears here.",
        "layer1_html": "<p>A <span class=\"gloss\" title=\"ancient Greek for word\">logos</span> appears here.</p>",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "span.md",
  });

const _strong = Object.freeze({
    "semantic_role": "strong",
    "category": "inline-formatting",
    "html_output": {
      "element": "strong",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "bold",
      "attributes": {
        "toggle": "yes",
      },
    },
    "shorthand_examples": [
      {
        "source": "This is **strongly emphasized** content.",
        "layer1_html": "<p>This is <b>strongly emphasized</b> content.</p>",
        "notes": "Plain markdown with double asterisks (or double underscores) produces\n<strong> elements.\n",
      },
      {
        "source": "<strong | important>",
        "layer1_html": "<strong>important</strong>",
      },
      {
        "source": "<strong #critical .warning | This is critical.>",
        "layer1_html": "<strong id=\"critical\" class=\"warning\">This is critical.</strong>",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "strong.md",
  });

const _sub_section_subtitle = Object.freeze({
    "semantic_role": "sub-section-subtitle",
    "category": "metadata",
    "authoring": "generated",
    "html_output": {
      "element": "sub-section-subtitle",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
    },
    "content_handler": "default",
    "interpreter_strategy": "schema",
    "_sourceFile": "sub-section-subtitle.md",
  });

const _sub_section_title = Object.freeze({
    "semantic_role": "sub-section-title",
    "category": "metadata",
    "authoring": "generated",
    "html_output": {
      "element": "sub-section-title",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
    },
    "content_handler": "default",
    "interpreter_strategy": "schema",
    "_sourceFile": "sub-section-title.md",
  });

const _sub_section = Object.freeze({
    "semantic_role": "sub-section",
    "category": "sections",
    "html_output": {
      "element": "sub-section",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "sec-type": {
          "maps_to": {
            "html": "data-sec-type",
          },
          "values": [
            "intro",
            "methods",
            "results",
            "discussion",
            "conclusion",
            "supplementary",
            "materials",
            "references",
            "other",
          ],
          "notes": "Same values as <section>. Optional classification of the sub-section role.",
        },
        "numbering-style": {
          "maps_to": {
            "html": "data-numbering-style",
          },
          "values": [
            "arabic",
            "roman",
            "alpha",
            "none",
          ],
        },
      },
      "booleans": {
        "unlisted": {
          "maps_to": {
            "html": "unlisted",
          },
          "default": false,
          "notes": "Keep this sub-section out of the generated table of contents, regardless\nof toc-depth (#218). Display-only: it still renders; it is only absent\nfrom the contents listing. See notes/specs/toc-and-numbering.md. Authored\nas +unlisted; renders to the HTML attribute unlisted.\n",
        },
        "unnumbered": {
          "maps_to": {
            "html": "unnumbered",
          },
          "default": false,
          "notes": "Skip this sub-section's number, regardless of number-depth (#218). Outside\nthe numbered sequence — no number, no counter advance, subtree unnumbered;\nthe next numbered sibling continues unbroken. See\nnotes/specs/toc-and-numbering.md. Authored as +unnumbered.\n",
        },
      },
    },
    "content": {
      "shape": [
        {
          "element": "sub-section-title",
          "required": false,
          "contains": [
            "inline",
          ],
        },
        {
          "element": "sub-section-subtitle",
          "required": false,
          "contains": [
            "inline",
          ],
        },
        {
          "element": "body",
          "required": false,
          "contains": [
            "block",
            "section",
          ],
        },
      ],
    },
    "content_handler": "default",
    "title_extraction": true,
    "jats_counterpart": {
      "element": "sec",
      "attributes": {
        "sec-type": "from sec-type",
      },
      "notes": "JATS uses recursive <sec>; enscribe's <sub-section> becomes a nested\n<sec> at depth 2 inside its parent <sec>.\n",
    },
    "shorthand_examples": [
      {
        "source": "<sub-section | Quantitative analysis>\nSub-section content.\n",
        "layer1_html": "<sub-section>\n  <sub-section-title>Quantitative analysis</sub-section-title>\n  <p>Sub-section content.</p>\n</sub-section>\n",
      },
      {
        "source": "<section | Results>\n<sub-section | Statistical methods>\nSub-section content.\n\n<sub-sub-section | Regression analysis>\nSub-sub-section content.\n\n<sub-section | Sensitivity analyses>\nSub-section content.\n",
        "layer1_html": "<section>\n  <section-title>Results</section-title>\n  <sub-section>\n    <sub-section-title>Statistical methods</sub-section-title>\n    <p>Sub-section content.</p>\n    <sub-sub-section>\n      <sub-sub-section-title>Regression analysis</sub-sub-section-title>\n      <p>Sub-sub-section content.</p>\n    </sub-sub-section>\n  </sub-section>\n  <sub-section>\n    <sub-section-title>Sensitivity analyses</sub-section-title>\n    <p>Sub-section content.</p>\n  </sub-section>\n</section>\n",
      },
    ],
    "interpreter_strategy": "schema",
    "related_plugins": [
      {
        "name": "enscribeSectionNesting",
        "runs_before": "enscribeInterpreter",
        "purpose": "Phase 2 — implicit closing of peer sub-sections. See notes/specs/pipeline.md for the full pipeline.",
      },
    ],
    "_sourceFile": "sub-section.md",
  });

const _sub_sub_section_subtitle = Object.freeze({
    "semantic_role": "sub-sub-section-subtitle",
    "category": "metadata",
    "authoring": "generated",
    "html_output": {
      "element": "sub-sub-section-subtitle",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
    },
    "content_handler": "default",
    "interpreter_strategy": "schema",
    "_sourceFile": "sub-sub-section-subtitle.md",
  });

const _sub_sub_section_title = Object.freeze({
    "semantic_role": "sub-sub-section-title",
    "category": "metadata",
    "authoring": "generated",
    "html_output": {
      "element": "sub-sub-section-title",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
    },
    "content_handler": "default",
    "interpreter_strategy": "schema",
    "_sourceFile": "sub-sub-section-title.md",
  });

const _sub_sub_section = Object.freeze({
    "semantic_role": "sub-sub-section",
    "category": "sections",
    "html_output": {
      "element": "sub-sub-section",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "sec-type": {
          "maps_to": {
            "html": "data-sec-type",
          },
          "values": [
            "intro",
            "methods",
            "results",
            "discussion",
            "conclusion",
            "supplementary",
            "materials",
            "references",
            "other",
          ],
        },
        "numbering-style": {
          "maps_to": {
            "html": "data-numbering-style",
          },
          "values": [
            "arabic",
            "roman",
            "alpha",
            "none",
          ],
        },
      },
      "booleans": {
        "unlisted": {
          "maps_to": {
            "html": "unlisted",
          },
          "default": false,
          "notes": "Keep this sub-sub-section out of the generated table of contents,\nregardless of toc-depth (#218). Display-only: it still renders; it is only\nabsent from the contents listing. See notes/specs/toc-and-numbering.md.\nAuthored as +unlisted; renders to the HTML attribute unlisted.\n",
        },
        "unnumbered": {
          "maps_to": {
            "html": "unnumbered",
          },
          "default": false,
          "notes": "Skip this sub-sub-section's number, regardless of number-depth (#218).\nOutside the numbered sequence — no number, no counter advance, subtree\nunnumbered; the next numbered sibling continues unbroken. See\nnotes/specs/toc-and-numbering.md. Authored as +unnumbered.\n",
        },
      },
    },
    "content": {
      "shape": [
        {
          "element": "sub-sub-section-title",
          "required": false,
          "contains": [
            "inline",
          ],
        },
        {
          "element": "sub-sub-section-subtitle",
          "required": false,
          "contains": [
            "inline",
          ],
        },
        {
          "element": "body",
          "required": false,
          "contains": [
            "block",
          ],
          "notes": "Sub-sub-sections do not contain further nested section levels. Depth\nbottoms out at three. Documents requiring deeper nesting should\nreorganize their structure or extend the depth ladder explicitly.\n",
        },
      ],
    },
    "content_handler": "default",
    "title_extraction": true,
    "jats_counterpart": {
      "element": "sec",
      "attributes": {
        "sec-type": "from sec-type",
      },
      "notes": "JATS uses recursive <sec>; enscribe's <sub-sub-section> becomes a nested\n<sec> at depth 3 inside its parent.\n",
    },
    "shorthand_examples": [
      {
        "source": "<sub-sub-section | Regression analysis>\nDetailed methods for the regression.\n",
        "layer1_html": "<sub-sub-section>\n  <sub-sub-section-title>Regression analysis</sub-sub-section-title>\n  <p>Detailed methods for the regression.</p>\n</sub-sub-section>\n",
      },
      {
        "source": "<section | Methods>\n<sub-section | Statistical methods>\n<sub-sub-section | Regression>\nLinear regression was performed.\n\n<sub-sub-section | Sensitivity testing>\nSensitivity tests were performed.\n",
        "layer1_html": "<section>\n  <section-title>Methods</section-title>\n  <sub-section>\n    <sub-section-title>Statistical methods</sub-section-title>\n    <sub-sub-section>\n      <sub-sub-section-title>Regression</sub-sub-section-title>\n      <p>Linear regression was performed.</p>\n    </sub-sub-section>\n    <sub-sub-section>\n      <sub-sub-section-title>Sensitivity testing</sub-sub-section-title>\n      <p>Sensitivity tests were performed.</p>\n    </sub-sub-section>\n  </sub-section>\n</section>\n",
      },
    ],
    "interpreter_strategy": "schema",
    "related_plugins": [
      {
        "name": "enscribeSectionNesting",
        "runs_before": "enscribeInterpreter",
        "purpose": "Phase 2 — implicit closing of peer sub-sub-sections. See notes/specs/pipeline.md for the full pipeline.",
      },
    ],
    "_sourceFile": "sub-sub-section.md",
  });

const _sub = Object.freeze({
    "semantic_role": "sub",
    "category": "inline-formatting",
    "html_output": {
      "element": "sub",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "sub",
    },
    "shorthand_examples": [
      {
        "source": "Water is H<sub | 2>O.",
        "layer1_html": "<p>Water is H<sub>2</sub>O.</p>",
      },
      {
        "source": "The vector x<sub | i> represents the i-th component.",
        "layer1_html": "<p>The vector x<sub>i</sub> represents the i-th component.</p>",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "sub.md",
  });

const _subject = Object.freeze({
    "semantic_role": "subject",
    "category": "metadata",
    "html_output": {
      "element": "subject",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "scheme": {
          "maps_to": {
            "html": "data-subject-scheme",
          },
          "notes": "Optional classification scheme this subject belongs to (e.g.\n\"MSC2020\" for the AMS Mathematics Subject Classification, \"ACM\"\nfor ACM Computing Classification, \"MeSH\" for biomedical\nsubjects). Identifies the controlled vocabulary the subject\nvalue is drawn from.\n",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
      "notes": "The subject classifier as text — either a free-form topic (\"ecology\nof large mammals\") or a controlled-vocabulary identifier (\"Q57.32\")\nwhen the scheme kwarg names the vocabulary.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "subject",
      "notes": "JATS uses <subj-group><subject>VALUE</subject></subj-group> inside\n<article-meta> to record document subjects. The exporter wraps\n<subject> in the appropriate <subj-group>, optionally setting\nsubj-group-type from the scheme kwarg. Multiple <subject> elements\nare allowed for documents with multiple subject classifications.\n",
    },
    "shorthand_examples": [
      {
        "source": "<meta>\n  <subject | Ecology of large mammals>\n</meta>\n",
        "layer1_html": "<meta>\n  <subject>Ecology of large mammals</subject>\n</meta>\n",
        "notes": "Free-form subject. Common for general-interest documents.\n",
      },
      {
        "source": "<meta>\n  <subject scheme=MSC2020 | 92D40>\n  <subject scheme=MSC2020 | 92D25>\n</meta>\n",
        "layer1_html": "<meta>\n  <subject data-subject-scheme=\"MSC2020\">92D40</subject>\n  <subject data-subject-scheme=\"MSC2020\">92D25</subject>\n</meta>\n",
        "notes": "Multiple subjects from a controlled vocabulary. The scheme\nidentifies the classification system; the JATS exporter\ngenerates the appropriate <subj-group subj-group-type=\"...\"> wrapper.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "subject.md",
  });

const _subtitle = Object.freeze({
    "semantic_role": "subtitle",
    "category": "metadata",
    "html_output": {
      "element": "subtitle",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "subtitle",
      "notes": "JATS uses <subtitle> inside <title-group> (for articles) or\n<book-title-group> (for books).\n",
    },
    "shorthand_examples": [
      {
        "source": "<meta>\n  <title | The Effect of Elephants on Climate>\n  <subtitle | A Multi-Year Field Study in Tanzania>\n</meta>\n",
        "layer1_html": "<article><article-front><meta><article-title>The Effect of Elephants on Climate</article-title><article-subtitle>A Multi-Year Field Study in Tanzania</article-subtitle></meta></article-front></article>",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "subtitle.md",
  });

const _summary = Object.freeze({
    "semantic_role": "summary",
    "category": "block-prose",
    "html_output": {
      "element": "summary",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
      "notes": "The visible heading of the parent <details> disclosure. Typically\nshort — a phrase — but may contain inline markup.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "(no direct JATS counterpart; HTML-native)",
      "notes": "Like its parent <details>, <summary> has no JATS counterpart. At\nJATS export the <summary>'s text typically becomes the heading\nportion of whatever flattened structure the exporter chooses for\nthe parent <details> (e.g., a <sec>'s <title>).\n",
    },
    "shorthand_examples": [
      {
        "source": "<summary | More background>",
        "layer1_html": "<summary>More background</summary>",
        "notes": "The visible heading of a <details> disclosure. Appears as a\nchild of <details>.\n",
      },
      {
        "source": "<summary | Click to reveal the <em | hidden> details>",
        "layer1_html": "<summary>Click to reveal the <em>hidden</em> details</summary>",
        "notes": "Inline markup in a summary. The recursive-content pass parses\nthe pipe content normally.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "summary.md",
  });

const _sup = Object.freeze({
    "semantic_role": "sup",
    "category": "inline-formatting",
    "html_output": {
      "element": "sup",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "sup",
    },
    "shorthand_examples": [
      {
        "source": "The 1<sup | st> edition of the work.",
        "layer1_html": "<p>The 1<sup>st</sup> edition of the work.</p>",
      },
      {
        "source": "The function f(x) = x<sup | 2>.",
        "layer1_html": "<p>The function f(x) = x<sup>2</sup>.</p>",
      },
      {
        "source": "The isotope <sup | 12>C is abundant.",
        "layer1_html": "<p>The isotope <sup>12</sup>C is abundant.</p>",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "sup.md",
  });

const _svg = Object.freeze({
    "semantic_role": "svg",
    "category": "frameables",
    "html_output": {
      "element": "svg",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "width": {
          "maps_to": {
            "html": "width",
          },
          "notes": "SVG width attribute. CSS length or unitless number. Maps directly\nto the rendered <svg> element's width attribute.\n",
        },
        "height": {
          "maps_to": {
            "html": "height",
          },
          "notes": "SVG height attribute. Same shape as width.\n",
        },
        "viewBox": {
          "maps_to": {
            "html": "viewBox",
          },
          "notes": "SVG viewBox attribute. Defines the coordinate system. Passes\nthrough to the rendered <svg> element.\n",
        },
        "caption": {
          "handled_by": "handler",
          "notes": "Optional caption text rendered in a sibling <figcaption>.\nThe caption= kwarg lifts to a <caption> child tag at the\nnormalize-to-canonical gate, matching the frameable convention.\n",
        },
      },
      "booleans": {
        "numbered": {
          "handled_by": "handler",
          "default": true,
          "notes": "Whether this SVG participates in the document-wide figure\nsequence (shares the `figure` counter with <fig>, <mermaid>,\n<abc>). Use +numbered (default) to number, -numbered to\nsuppress.\n",
        },
        "border": {
          "handled_by": "handler",
          "default": false,
          "notes": "The frameable surface. When +border is set, the rendered\n<svg> wrapper gains the `frameable-border` class.\n",
        },
      },
    },
    "content": {
      "becomes": "raw-svg-source",
      "notes": "The pipe content is the SVG source — pass-through to the rendered\n<svg> element. Treated as opaque (not re-parsed by the recursive\ncontent step) because SVG is its own XML language and the parser\nhas no business interpreting it.\n",
    },
    "content_handler": "opaque",
    "jats_counterpart": {
      "element": "graphic",
      "attributes": {},
      "notes": "JATS uses <graphic> for embedded images (raster or vector). Inline\nSVG has no external resource path, so enscribe embeds it as a base64\ndata URI on the graphic's xlink:href —\n<graphic xlink:href=\"data:image/svg+xml;base64,…\"/> — carrying the\nfull SVG losslessly in a single self-contained XML file (consistent\nwith the HTML path's embedResources). This is DTD-valid (xlink:href\nis CDATA) and needs no resource-packaging mechanism. A captioned or\nnumbered <svg> wraps in <fig>…</fig>, with the number as <label> and\nthe caption as <caption>. (#86.)\n",
    },
    "shorthand_examples": [
      {
        "source": "<svg -numbered viewBox=\"0 0 100 100\" width=200 height=200 |\n  <circle cx=\"50\" cy=\"50\" r=\"40\" fill=\"blue\" />\n>\n",
        "layer1_html": "<svg viewBox=\"0 0 100 100\" width=\"200\" height=\"200\">\n  <circle cx=\"50\" cy=\"50\" r=\"40\" fill=\"blue\" />\n</svg>\n",
        "notes": "A lone inline SVG. `<svg>` is numbered by default (it shares the\nfigure counter), so `-numbered` is what opts out of framing for a\npurely inline graphic. The source is opaque pipe content; the\nattributes pass through to the rendered <svg> element.\n",
      },
      {
        "source": "<svg #fig:diagram viewBox=\"0 0 100 100\" caption=\"A simple circle\" |\n  <circle cx=\"50\" cy=\"50\" r=\"40\" />\n>\n",
        "layer1_html": "<figure><svg id=\"fig:diagram\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"40\"></svg><figcaption><span class=\"figure-label\">Figure 1.</span> A simple circle</figcaption></figure>",
        "notes": "Captioned and numbered → framed by the ordinary frameable rule: the\nhandler wraps the <svg> in a <figure> with the <figcaption> as a\nsibling inside the wrapper (figcaption is not a valid child of <svg>).\nShares the figure counter with <fig>; `<ref @fig:diagram>` resolves\nto \"Figure N\".\n",
      },
    ],
    "interpreter_strategy": "handler",
    "handler_module": "./handlers/svg.js",
    "handler_responsibilities": [
      "Emit the <svg> element with the standard SVG attributes (width, height, viewBox).",
      "Preserve the pipe-content SVG source verbatim as the rendered <svg>'s inner content.",
      "When +border is set, add `frameable-border` to the class list.",
      "When captioned or numbered, frame the <svg> by wrapping it in a <figure> with the <figcaption> as a sibling inside the wrapper (figcaption is not a valid child of <svg>); the figcaption carries the \"Figure N.\" label prefix and any caption text. A bare <svg -numbered> with no caption renders as a lone <svg>.",
    ],
    "_sourceFile": "svg.md",
  });

const _table = Object.freeze({
    "semantic_role": "table",
    "category": "frameables",
    "html_output": {
      "element": "table",
      "is_html_native": true,
      "default_attributes": {},
    },
    "interpreter_strategy": "handler",
    "handler_module": "./handlers/table.js",
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "positional": [
        {
          "name": "format",
          "values": [
            "csv",
            "tsv",
            "json",
            "yaml",
            "md",
          ],
          "notes": "Format of inline pipe content. When absent, content is treated as\nraw HTML pass-through (escape-hatch form). Required for all\ndata-driven forms.\n",
        },
      ],
      "booleans": {
        "headers": {
          "handled_by": "handler",
          "default": true,
          "notes": "Whether the first row of the data is a header row. Default true.\nUse -headers to suppress thead generation; rows render as tbody only.\n",
        },
        "numbered": {
          "handled_by": "handler",
          "default": true,
          "notes": "Whether this table is counted in the numbered table sequence and\nreceives a \"Table N.\" label prefix in its caption.\n",
        },
        "parse-text": {
          "handled_by": "plugin",
          "default": false,
          "notes": "#21: whether ALL cells of a DATA-format table parse as Enscribe inline\nmarkup. Default false (data-format cells are literal — the safe baseline).\n+parse-text parses every cell; -parse-text forces literal, overriding a\ndocument-wide <config parse-data-tables=true> default. Markdown/pipe\ntables always parse and ignore this. Resolved by the table-cell-parse\nplugin (precedence: this attribute > config default > literal baseline).\n",
        },
      },
      "kwargs": {
        "parse-columns": {
          "notes": "#21: comma-separated list of column names (by header) whose cells parse\nas Enscribe inline markup, leaving the other columns literal — the common\nmixed case (a prose column among data columns). Adds the named columns on\ntop of the parse-text / config decision. Headerless tables can't match by\nname, so use +parse-text there. A parsed column parses in HTML AND JATS;\nthe stored data payload is never mutated (a display directive on the table).\n",
        },
        "caption": {
          "notes": "Short-form caption as a kwarg string. Renders as <caption> inside\nthe table element. When numbered, a \"Table N.\" label span is\nprepended. Long-form caption (<caption | ...> nested tag) is deferred.\n",
        },
        "src": {
          "notes": "Where the table's data comes from. Either a path to an external data\nfile (relative to the document's assets directory, configurable via the\nassetsDir interpreter option; read at interpretation time), OR an @id\nreference (#313 slice 2) that pulls a stored <dataset> declared in\n<data> — e.g. <table src=\"@sales\"> renders the <dataset #sales csv | …>\nas a grid (the dataset's format hint applies when the table names no\nformat word). The opaque bytes go straight from the store to the table\nparser. An unresolved/wrong-kind @id is a visible asset-error (never a\nsilently-empty table).\n",
        },
        "type": {
          "maps_to": {
            "html": "data-table-type",
          },
          "values": [
            "data",
            "layout",
            "comparison",
            "schedule",
            "results",
            "other",
          ],
          "notes": "Optional semantic classification. Affects styling and JATS export.\n",
        },
      },
    },
    "content": {
      "notes": "When a format positional is present (csv, tsv, json, yaml, md), pipe\ncontent is an opaque data string parsed by the corresponding parser.\nWhen no format is present, content is treated as raw HTML (escape-hatch).\nThe long-form structural path (<table>...<tr>...</table>) is handled by\nthe same handler with recursive cell content; this path is partially\nimplemented and may produce basic results.\nThe JATS importer reuses this no-format path for complex (colspan / rowspan /\nmulti-row-header) tables it can't express as a flat enscribe table (#106): it\nkeeps the grid as an HTML layout but stamps `_htmlTable` with each cell's\nconverted, resolvable inline (formula → math, xref → ref/cite, fn → note), so\nthe handler renders the grid with resolved cells rather than the raw passthrough.\n",
    },
    "content_handler": "table",
    "jats_counterpart": {
      "element": "table-wrap",
      "attributes": {
        "table-type": "from type",
      },
      "notes": "JATS uses <table-wrap> as the container, with <table> nested inside.\nThe enscribe <table> maps to JATS's nested <table>; the wrapping\n<table-wrap> is generated at export to provide JATS's expected structure.\n",
    },
    "shorthand_examples": [
      {
        "source": "| Name | Price |\n|------|-------|\n| foo  | 1     |\n| bar  | 2     |\n",
        "layer1_html": "<table><caption><span class=\"table-label\">Table 1.</span></caption><thead><tr><th>Name</th><th>Price</th></tr></thead><tbody><tr><td>foo</td><td>1</td></tr><tr><td>bar</td><td>2</td></tr></tbody></table>",
        "notes": "Plain markdown table syntax (via remark-gfm). The most common\nauthoring path for simple tables. No explicit enscribe tags needed.\n",
      },
      {
        "source": "<csv | name,price\nfoo,1\nbar,2\n>\n",
        "layer1_html": "<table><caption><span class=\"table-label\">Table 1.</span></caption><thead><tr><th>name</th><th>price</th></tr></thead><tbody><tr><td>foo</td><td>1</td></tr><tr><td>bar</td><td>2</td></tr></tbody></table>",
        "notes": "The `<csv>` shorthand lowers to `<table csv>` (the standalone `<csv>` /\n`<tsv>` tags were retired to these gate shorthands) and renders today —\nthe table above is its output, parsed from the CSV source by the table\nhandler's csv engine. `<csv | ... >` and the qualifying form\n`<table csv | ... >` converge to the same parsed table; only the authoring\nshorthand differs. JSON data uses the qualifying `<table json | ... >` form\n— there is no standalone `<json>` shorthand. See the `<csv>` vocabulary\nentry for engine attributes (header control, alignment, etc.).\n",
      },
      {
        "source": "<table #revenue type=results>\n  <caption | Quarterly revenue>\n  <tr><th>Quarter</th><th>Revenue</th></tr>\n  <tr><td>Q1</td><td>$100M</td></tr>\n  <tr><td>Q2</td><td>$120M</td></tr>\n</table>\n",
        "layer1_html": "<table id=\"revenue\"><caption><span class=\"table-label\">Table 1.</span></caption><tbody><tr><th>Quarter</th><th>Revenue</th></tr><tr><td>Q1</td><td>$100M</td></tr><tr><td>Q2</td><td>$120M</td></tr></tbody></table>",
        "notes": "Explicit table with cells, used when fine control over structure\nor attributes is needed.\n",
      },
    ],
    "_sourceFile": "table.md",
  });

const _term = Object.freeze({
    "semantic_role": "term",
    "category": "inline-formatting",
    "html_output": {
      "element": "term",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
        "notes": "Optional id, useful for cross-referencing the term-introduction\nfrom later prose (e.g. <ref @term:eigenvector>).\n",
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
      "notes": "The term being introduced — typically a noun phrase, italicized or\nvisually distinguished in the rendered output.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "named-content",
      "attributes": {
        "content-type": "term",
      },
      "notes": "JATS uses <named-content content-type=\"term\"> for marked\nterminology. The exporter constructs the named-content element\nwith the content-type attribute from enscribe's <term>.\n",
    },
    "shorthand_examples": [
      {
        "source": "An <term | eigenvector> is a non-zero vector that scales under a linear transformation.",
        "layer1_html": "<p>An <term>eigenvector</term> is a non-zero vector that scales under a linear transformation.</p>",
        "notes": "Standard term introduction. The element marks the word as\n\"this is a term being introduced,\" typically rendered in italic\nor bold by default CSS.\n",
      },
      {
        "source": "An <term #term:eigenvector | eigenvector> is a non-zero vector that scales under a linear transformation. Later we generalize <term | eigenvector>s to operators.",
        "layer1_html": "<p>An <term id=\"term:eigenvector\">eigenvector</term> is a non-zero vector that scales under a linear transformation. Later we generalize <term>eigenvector</term>s to operators.</p>",
        "notes": "First introduction carries an id so later references can link\nback to it. Subsequent uses of the same term (without an id)\nstill mark it as a term being referenced, distinct from running\nprose, without re-asserting the introduction.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "term.md",
  });

const _theorem = Object.freeze({
    "semantic_role": "theorem",
    "category": "theorem-family",
    "html_output": {
      "element": "theorem",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "name": {
          "maps_to": {
            "html": "data-name",
          },
          "notes": "Optional name suffix for the theorem's label (the\n\"(Pythagoras)\" half of \"Theorem 1.2 (Pythagoras)\"). Honored\nby the Phase-2 theorem handler at label-rendering time;\nuntil that handler lands, the kwarg flows through to the\nrendered HTML as `data-name=\"...\"` via schema dispatch.\nLaTeX amsthm precedent: `\\begin{theorem}[Pythagoras]`.\n",
        },
      },
      "booleans": {
        "numbered": {
          "handled_by": "handler",
          "default": true,
          "notes": "Whether this theorem participates in the theorem-family\nshared counter (see \"Numbering\" below). Use +numbered\n(default) to number; -numbered to suppress. Can also be\nwritten as numbered=true / numbered=false.\n",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "block",
        ],
      },
      "becomes": "children",
      "notes": "The theorem's body is paragraphs and inline content directly —\nno internal element parts (no <theorem-statement> wrapper). The\nLaTeX amsthm and JATS prior-art both place body content directly\ninside the theorem container.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "statement",
      "attributes": {
        "content-type": "theorem",
      },
      "notes": "JATS does not have a dedicated <theorem> element; all theorem-\nfamily elements (theorem, lemma, corollary, proposition,\ndefinition, example, remark, proof) map to <statement> with a\ncontent-type attribute identifying the rhetorical role. JATS\n<statement> contains <label> (the prefix string like\n\"Theorem 1.2:\"), optional <title> (the optional name from the\n`name` kwarg), then <p> paragraphs. The Phase-2 handler\nconstructs the <label> and <title> at export time; this slice\njust records the mapping.\n",
    },
    "shorthand_examples": [
      {
        "source": "<theorem | If $a^2 + b^2 = c^2$ then the triangle is right-angled.>\n",
        "layer1_html": "<theorem>If $a^2 + b^2 = c^2$ then the triangle is right-angled.</theorem>\n",
        "notes": "Short-form with pipe content. The body is parsed normally.\n",
      },
      {
        "source": "<theorem name=\"Pythagoras\" #thm:pyth>\nIf $a^2 + b^2 = c^2$, the triangle with sides $a$, $b$, $c$\nis right-angled.\n</theorem>\n",
        "layer1_html": "<theorem id=\"thm:pyth\" data-name=\"Pythagoras\">If $a^2 + b^2 = c^2$, the triangle with sides $a$, $b$, $c$ is right-angled.</theorem>\n",
        "notes": "Long-form with the optional name kwarg. Cross-referenceable\nvia id (the \"thm:\" colon-prefix convention is consistent with\n\"fig:\", \"eqn:\", \"sec:\" elsewhere in enscribe). The name\nkwarg lifts to `data-name`; the Phase-2 handler will render\nit as the \"(Pythagoras)\" suffix to the label \"Theorem N\".\n",
      },
    ],
    "interpreter_strategy": "handler",
    "handler_module": "./handlers/theorem.js",
    "_sourceFile": "theorem.md",
  });

const _title = Object.freeze({
    "semantic_role": "title",
    "category": "metadata",
    "html_output": {
      "element": "title",
      "is_html_native": false,
      "default_attributes": {},
      "notes": "Enscribe's <title> inside <meta> is a custom element distinct from\nHTML's <title> (which goes in <head> and represents the browser tab title).\nThe render-mode plugin maps enscribe's metadata <title> to HTML's\n<title> in the rendered <head>. The structural plugin promotes\nenscribe's metadata <title> to <article-title> or <book-title> at\nLayer 1 based on the surrounding container.\n",
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
      "notes": "The title text. Inline elements work normally: <em>, <strong>,\n<i> for foreign words, <math> for mathematical content in titles.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "article-title or book-title (inside title-group inside article-meta or book-meta)",
      "notes": "JATS represents document titles via <article-title> inside <title-group>\ninside <article-meta>, or via <book-title> inside <book-meta>. Enscribe's\nmetadata <title> gets promoted to the appropriate JATS structure at\nexport time based on the surrounding container.\n",
    },
    "shorthand_examples": [
      {
        "source": "<meta>\n  <title | The Effect of Elephants on Climate>\n</meta>\n",
        "layer1_html": "<article><article-front><meta><article-title>The Effect of Elephants on Climate</article-title></meta></article-front></article>",
        "notes": "Inside <article>, <title> in <meta> becomes <article-title>.\n",
      },
      {
        "source": "<book>\n  <meta>\n    <title | A Comprehensive Guide>\n  </meta>\n</book>\n",
        "layer1_html": "<book><meta><title>A Comprehensive Guide</title></meta></book>",
        "notes": "Inside <book>, <title> in <meta> becomes <book-title>.\n",
      },
      {
        "source": "<meta>\n  <title | The role of <i type=taxonomic | Loxodonta africana> in ecosystem dynamics>\n</meta>\n",
        "layer1_html": "<article><article-front><meta><article-title>The role of <i data-italic-type=\"taxonomic\">Loxodonta africana</i> in ecosystem dynamics</article-title></meta></article-front></article>",
        "notes": "Titles can contain inline elements. The recursive content parsing\nhandles nested constructs.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "title.md",
  });

const _u = Object.freeze({
    "semantic_role": "u",
    "category": "inline-formatting",
    "html_output": {
      "element": "u",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
      "kwargs": {
        "type": {
          "maps_to": {
            "html": "data-underline-type",
          },
          "values": [
            "misspelling",
            "proper-name",
            "editorial-correction",
            "other",
          ],
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "underline",
      "notes": "JATS uses <underline> for underlined text. The element exists but\nis rarely used in scholarly publishing because underline conventionally\nindicates hyperlinks in modern web rendering.\n",
    },
    "shorthand_examples": [
      {
        "source": "The author wrote <u type=misspelling | recieve> in the original.",
        "layer1_html": "<p>The author wrote <u data-underline-type=\"misspelling\">recieve</u> in the original.</p>",
      },
      {
        "source": "The Chinese name <u type=proper-name | 王明> appears here.",
        "layer1_html": "<p>The Chinese name <u data-underline-type=\"proper-name\">王明</u> appears here.</p>",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "u.md",
  });

const _var = Object.freeze({
    "semantic_role": "var",
    "category": "inline-formatting",
    "html_output": {
      "element": "var",
      "is_html_native": true,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
      "notes": "The variable name as text — typically a single short identifier\n(x, n, foo, threshold). Inline elements within <var> are permitted\nbut unusual.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "(no direct JATS counterpart; HTML-native)",
      "notes": "JATS has no dedicated element for variable names in prose — for\nmathematical variables, the typical JATS pattern is to use <italic>\nor to embed in <mml:math> for proper mathematics markup. For\nprogramming-language variable references, the exporter emits the\ncontent as inline text with no special JATS markup. This is a\nconscious tradeoff: <var> is an HTML / technical-prose convention,\nnot a scholarly-content concern JATS models.\n",
    },
    "shorthand_examples": [
      {
        "source": "The function takes a parameter <var | n> and returns <var | n>²+1.",
        "layer1_html": "<p>The function takes a parameter <var>n</var> and returns <var>n</var>²+1.</p>",
        "notes": "Variable names in prose. Browsers render <var> in italic by\ndefault, distinguishing it from surrounding prose.\n",
      },
      {
        "source": "Set <var | threshold> to <samp | 0.05>.",
        "layer1_html": "<p>Set <var>threshold</var> to <samp>0.05</samp>.</p>",
        "notes": "<var> for the variable name and <samp> for a sample value —\nthe natural pair for documenting configuration in technical writing.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "var.md",
  });

const _version = Object.freeze({
    "semantic_role": "version",
    "category": "metadata",
    "html_output": {
      "element": "version",
      "is_html_native": false,
      "default_attributes": {},
    },
    "enscribe_attributes": {
      "id": {
        "maps_to": {
          "html": "id",
        },
      },
      "classes": {
        "maps_to": {
          "html": "class",
        },
      },
    },
    "content": {
      "shape": {
        "contains": [
          "inline",
        ],
      },
      "becomes": "children",
      "notes": "The document's version, as a free-form string. Common forms:\nsemantic version (\"1.0.0\", \"2.3.1\"), date-based (\"2024.03.15\"),\nrevision label (\"v2\", \"rev 3\", \"draft\"), or any other versioning\nscheme the author uses.\n",
    },
    "content_handler": "default",
    "jats_counterpart": {
      "element": "(no direct standard element; uncertain — may map to article-version or custom-meta)",
      "notes": "JATS does not have a single canonical version element. JATS 1.3+\nintroduced <article-version> in some extensions (e.g. for preprint\nmetadata) but it is not universally present in the core schema. A\nsafe fallback is <custom-meta meta-name=\"version\">VALUE</custom-meta>\ninside <article-meta>. The exporter should prefer <article-version>\nwhen targeting a schema variant that supports it, and fall back to\n<custom-meta> otherwise. Uncertainty recorded here per the\napparatus-tag reconciliation slice's directive to not guess.\n",
    },
    "shorthand_examples": [
      {
        "source": "<meta>\n  <version | 1.0.0>\n</meta>\n",
        "layer1_html": "<meta>\n  <version>1.0.0</version>\n</meta>\n",
        "notes": "Semantic version. Other formats are equally valid as a free-form\nstring.\n",
      },
      {
        "source": "<meta version=\"draft-2\" />",
        "layer1_html": "<meta>\n  <version>draft-2</version>\n</meta>\n",
        "notes": "Kwarg-form authoring lifts to the child-tag form at the gate.\n",
      },
    ],
    "interpreter_strategy": "schema",
    "_sourceFile": "version.md",
  });

export const VOCABULARY = Object.freeze({
  "a": _a,
  "abbr": _abbr,
  "abstract": _abstract,
  "affiliation": _affiliation,
  "align": _align,
  "article-back": _article_back,
  "article-body": _article_body,
  "article-front": _article_front,
  "article-subtitle": _article_subtitle,
  "article-title": _article_title,
  "article": _article,
  "aside": _aside,
  "author": _author,
  "b": _b,
  "bib-entry": _bib_entry,
  "bibliography": _bibliography,
  "blockquote": _blockquote,
  "book-back": _book_back,
  "book-body": _book_body,
  "book-front": _book_front,
  "book-part-subtitle": _book_part_subtitle,
  "book-part-title": _book_part_title,
  "book-part": _book_part,
  "book-subtitle": _book_subtitle,
  "book-title": _book_title,
  "book": _book,
  "caption": _caption,
  "cases": _cases,
  "cite": _cite,
  "code-block": _code_block,
  "code": _code,
  "config": _config,
  "corollary": _corollary,
  "data": _data,
  "date": _date,
  "dd": _dd,
  "definition": _definition,
  "details": _details,
  "diagram": _diagram,
  "display-math": _display_math,
  "dl": _dl,
  "doi": _doi,
  "dt": _dt,
  "editor": _editor,
  "em": _em,
  "email": _email,
  "endnotes": _endnotes,
  "eqnarray": _eqnarray,
  "example": _example,
  "fig": _fig,
  "frame": _frame,
  "glossary-entry": _glossary_entry,
  "glossary": _glossary,
  "hr": _hr,
  "i": _i,
  "inline-code": _inline_code,
  "inline-math": _inline_math,
  "item": _item,
  "kbd": _kbd,
  "keywords": _keywords,
  "lang": _lang,
  "lemma": _lemma,
  "library": _library,
  "license": _license,
  "marginnote": _marginnote,
  "math": _math,
  "matrix": _matrix,
  "meta": _meta,
  "minipage": _minipage,
  "name": _name,
  "nav-group": _nav_group,
  "nav": _nav,
  "note-list": _note_list,
  "note": _note,
  "orcid": _orcid,
  "output": _output,
  "p": _p,
  "proof": _proof,
  "proposition": _proposition,
  "publication-date": _publication_date,
  "q": _q,
  "ref": _ref,
  "remark": _remark,
  "s": _s,
  "samp": _samp,
  "section-subtitle": _section_subtitle,
  "section-title": _section_title,
  "section": _section,
  "span": _span,
  "strong": _strong,
  "sub-section-subtitle": _sub_section_subtitle,
  "sub-section-title": _sub_section_title,
  "sub-section": _sub_section,
  "sub-sub-section-subtitle": _sub_sub_section_subtitle,
  "sub-sub-section-title": _sub_sub_section_title,
  "sub-sub-section": _sub_sub_section,
  "sub": _sub,
  "subject": _subject,
  "subtitle": _subtitle,
  "summary": _summary,
  "sup": _sup,
  "svg": _svg,
  "table": _table,
  "term": _term,
  "theorem": _theorem,
  "title": _title,
  "u": _u,
  "var": _var,
  "version": _version,
  "quote": _blockquote,  // alias
  "figure": _fig,  // alias
});

export const VOCABULARY_ERRORS = Object.freeze([
]);
