# Processing Flow
- Pre-process as text
  - Process shortcut tags
  - Auto close inline tags
  - Prepare for markdown processing
Process as markdown
  - Will create header tags
  - Lists
Process as parsed HTML
  - wrapAndNestSections
  - 
Render HTML
  - Processors for things
    - Citations
    - Displayed code
    - Executed code
    - Cross-references
   
Cross-references and citations have two parts: The generated text and a link.

Tags for cross-references: `<sec-ref @introduction +link>`, `<fig-ref @population-change>`, `<eqn-ref @final-summation +link -preview>`

`<cite @[asdfsafdsaf, asfdasdf, asdfasdf] +link +preview -abstract>`

