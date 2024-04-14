# Processing Flow
- Pre-process as text
  - Process shortcut tags
  - Auto close inline tags
  - Prepare for markdown processing
- Process as markdown
  - Will create header tags
  - Lists
- Process as parsed HTML
  - wrapAndNestSections
   
# Render HTML
  - Processors for things
    - Citations
    - Code
      - Displayed/Executed
      - Inline/Block
    - Math
      - Inline/Block
    - Cross-references
   
Cross-references and citations have two parts: The generated text and a link.

Tags for cross-references: `<ref-sec @introduction +link>`, `<ref-fig @population-change>`, `<ref-eqn @final-summation +link -preview>`

`<cite @[asdfsafdsaf, asfdasdf, asdfasdf] +link +preview -abstract>`

Role of using tmplateing vs html. `{{cite(asdf, asdf, asdf, asfd)}}` `see section {{getSecRef("introduction")}}`

# Shorthand tags
## Format
`<tag arg1 arg2 arg3>`

## Class and id
`<tag arg1 #id-name .class-name>` equivalent to `<tag arg1 id="id-name" class="class-name">`

## Arguments
Consider using `data-`. But probably just custom parser.

In the simplest cases, text would just become the most obvious argument.
- `<a google.com>` --> `<a href="https://google.com">google.com</a>`
- `<img images/puppy.jpg>` --> `<img src="images/puppy.jpg" />`

`<ref-fig @figname>` would somehow go to `<ref-fig target="#figname" preview="true">3</ref-fig>` which would get rendered like `<a href="#fig:figname" onmouseover=showThumbnail("#fig:figname")>3</a>`

Arguments, which might be custom arguments with `data-`, can be set as true/false with `+,-`. `<ref-sec @cust-elem +link +name +preview>` would somehow go to `<ref-sec data-target="#cust-elem" data-include_name="true" data-preview="true"></ref-sec>` which would get rendered as `<a href="#cust-elem" title="3: Custom Elements">3: Custom Elements</a>`. `<ref-fig @figname -preview>` would not have the `onmouseover` event: `<a href="#fig:figname">3</a>`.

`<cite @[asdfsafdsaf, asfdasdf, asdfasdf] +link +preview -abstract>` would be rendered as `<cite data-reflist=[asdfsafdsaf, asfdasdf, asdfasdf] data-link=true data-preview=true data-abstract=false></cite>` and the `innerHTML` would be created by [`citation.js`](https://citation.js.org/).

Other shorthand ideas:
- `<img images/puppy.jpg 180x240 left>` --> `<img src="images/puppy.jpg" width="180px" height="240px"/>` and float left.


# Mathjax
- Set tags
- Capture lables/tags as ids for referencing.


