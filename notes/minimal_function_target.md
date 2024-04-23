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

### Highlighted elements
Displayed as text. Characters preserved but with special display.
- Source code
- Quotes/Blockquotes
- Foreign words

### Data
Non-textual information. 
- Tables entered as data. For instance

### Interpreted blocks
Written in a _domain specific language_ (DSL) which is interpreted and displayed. How
this is different from mime-encoded data I'm not sure.
- Math (LaTeX, mathjax)
- Music (abcjs)
- Diagrams (mermaid, dot, ...)
- Markdown tables

### Executed code
- Code sent to a language engine where it is run
- Output is collected and displayed

### Special text elements
Encoded as data through tags, json, etc. But displayed
as text.
- Glossary
- Definitions
- Bibliography
- Notes (foot|end|side)
- Affiliations
- Lists


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
- Chapter (numbered or titled)
- Abstract: A brief summary of the research, methods, results, and conclusions.
- Appendices: Supplementary material that is relevant but not integral to the main text.
- Glossary*
- Definitions*
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
