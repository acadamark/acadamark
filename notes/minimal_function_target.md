# Target for Minimal Functionality

## Document Types
- Article

## Structural Elements
### Section
- Arbitrary container of text that goes together
- Can be numbered and/or titled
- Hierarchical
- Sequential

### Header Group
- Contains heading and subheading
```
<section id="past-accomplishments"> Past Accomplishments | We've come a long way
...
...
```

```
<section id="past-accomplishments">
  <hgroup>
    <h1>Past Accomplishments</h1>
    <span role=doc-subtitle>We've come a long way</span>
  </hgroup>
  ...
  ...
</section>
```

### Styped elements
Displayed as text. Characters preserved but with special display.
- Source code
- Quotes/Blockquotes
- Foreign words
- Verse

### Pre-Processed blocks
Encoded as data through tags, json, etc. and formatted into text, or written in a 
_domain specific language_ (DSL) which is interpreted and displayed. 
Is this different from mime-encoded data?
- Math (DSL): LaTeX, mathjax
- Music (DSL): abcjs
- Diagrams | Networks | Flowcharts (DSL): mermaid, dot, ...
- Markdown (DSL)
- Markdown tables (DSL)
- Executed source code
- Tables entered as data (csv, for instance)
- References/Bibliography (from CSL-JSON, etc.)
- Notes (tags) (foot|end|side)
- Author list (tags, json)
- Keywords and metadata (tags, json)
- Affiliations (tags, json)
- Lists (tags)
- Blockquotes (tags)
- Formula languages | Math | Chemical | Logic (DSL)
- Figures



### Nestable text eleemnts
- List
- Paragraph
  Probably will have rule that paragraphs only nested in other paragraphs if also nested
  in another block element. So a list might be nested in a paragraph, and a list item
  could contain a paragraph.
- Blockquote

## Section Types
Rendered precisely as written but displayed according to style, which tells the reader
how to understand it. Semantic, the section has a purpose that
determines how it should be read and understood. Starred types may be generated from data.
- General (numbered and/or titled)
- Abstract: A brief summary of the research, methods, results, and conclusions.
- Blockquote
- References/Bibliography: A list of all the sources cited in the document.*
- Endnotes: Additional information or explanations provided at the document's end.*
- Keywords: A list of relevant terms that reflect the main topics of the document.*
- Affiliations*
- Ordered list*
- Unordered list*

## Asynchronous/Floating
Sections or Environments that can be outside of the document flow. Information in the document
can be used to generate them. There may be a choice of where they are displayed.
- Footnotes/margin notes: Additional information or explanations provided at the bottom or side of the page.*
- Sidebar

## Special Syntax
- Cross-references
- Citations
- Formula
- Styling
- Foreign
- Basic alignment
- Basic spacing

## Variables
- Numbering to continue lists?
- Current section number?

Edit these....

# Included Objects/Elements
Non-text-based elements
- Graphs and charts
- Diagrams
- Illustrations
- Photographs

# Functional Elements, Directives
No semantic meaning. Not displayed. Used for displaying processed semantic elements.
- Variable definitions
- Data (table, list, references, etc.)
- Anchor (label)
- Numbering indicators