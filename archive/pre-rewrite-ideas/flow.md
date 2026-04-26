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
`<tag arg1 arg2 arg3>` or `<tag arg1 arg2>text</tag>`

## Allow lazy attributes. Examples:
Make assumptions to allow being lazy about attributes.
-  `<a https://google.com>` --> `<a href="https://google.com">https://google.com</a>`.
-  `<a https://arielbalter.com>My Website</a>` --> `<a href="https://arielbalter.com">My Website</a>`
-  `<img puppy_picture.jpg 240x240>` --> `<img src="puppy_picture.jpg width=240px height=240px>`

## Close tags and assume content
  - `<code print("hello")>` --> `<code>print("hello")</code>`

## Class and id
Interpret arguments starting with `#` as id and `.` as class:

`<tag arg1 #id-name .class-name>` equivalent to `<tag arg1 id="id-name" class="class-name">`

## Attributes anc custom parsers
Consider using `data-`. But probably just custom parser.

`<ref-fig @figname>` would somehow go to `<ref-fig target="#figname" preview="true">3</ref-fig>` which would get rendered like `<a href="#fig:figname" onmouseover=showThumbnail("#fig:figname")>3</a>`

Arguments, which might be custom arguments with `data-`, can be set as true/false with `+,-`. `<ref-sec @cust-elem +link +name +preview>` would somehow go to `<ref-sec data-target="#cust-elem" data-include_name="true" data-preview="true"></ref-sec>` which would get rendered as `<a href="#cust-elem" title="3: Custom Elements">3: Custom Elements</a>`. `<ref-fig @figname -preview>` would not have the `onmouseover` event: `<a href="#fig:figname">3</a>`.

`<cite @[asdfsafdsaf, asfdasdf, asdfasdf] +link +preview -abstract>` would be rendered as `<cite data-reflist=[asdfsafdsaf, asfdasdf, asdfasdf] data-link=true data-preview=true data-abstract=false></cite>` and the `innerHTML` would be created by [`citation.js`](https://citation.js.org/).

## Mathjax
- Consider moving away from `$` and `\(` etc. in favor of `<math-jax>` or `<latex>`
- Set tags to `<$>` and `<$$>`. `<$ \sqrt{2 \pi \sigma^2}>` --> `\(\sqrt{2 \pi \sigma^2}\)` or `$\sqrt{2 \pi \sigma^2}$` or `<math-jax display=inline>\sqrt{2 \pi \sigma^2}</math-jax>`
- Capture lables/tags as ids for referencing.

## Code
Use `{}` as the tag for code. Can put an engine in for display or execution. Gets translated to `<code>`. Used shorthand will get `class=inline`. Used full will get `class=block`. Including `output=true` will show the output in a `<samp>` tag. Valid question about formatting output. Maybe some use for template execution `{{code}}`?

### Inline
- Generic `<{} var a = 10>`
- Specify syntax `<{python} [x for x in range(10)]>`
- Specify engine `<{bash}! echo $(date)>`. Causes `execute=true engine=bash`.

### Block
- Generic
  ```
  <{}>
  var a = 10;
  const s = "hello";
  console.log(s + a);
  </{}>
  ```
- Etc.


