# Shorthand Tag Processing



```js
const anchor_arguments = 
{
  // <a http://example.com | example website> --> <a href="http://example.com">example website</a>
  // <a example.com .normal-link> --> <a href="http://example.com" class="normal-link">example.com</a>
  required_arguments: ["link_target"],
  includes_content: true;
};

const cite_arguments = 
{
  // <cite jones2001>, <cite [perez1975, Noori1992]> --> the citation text in whatever format is specified.
  // <cite [perez1975, Noori1992] +link=bib +preview=abstract> --> 
  // <cite><a 
  //   href="#id-of-bibliography-item-for-perez1975"
  //   onmouseover=showPreview("abstract")
  // >citation text for perez1975</a>,
  // <a 
  //   href="#id-of-bibliography-item-for-Noori1992"
  //   onmouseover=showPreview("abstract")
  // >citation text for Noori1992</a></cite>

  required_arguments: ["reflist"],
  boolean_arguments: ["link", "preview"],
  kw_arguments: ["link", "preview"]
};

const list_arguments = 
{
  // <list +ordered A 3 #item-list .basic-list
  // - First Item
  // - 2nd item
  // - third item
  // >
  // or 
  // <ol A 3 #item-list .basic-list
  // - First Item
  // - 2nd item
  // - third item
  // >
  // or 
  // <ol A 3 #item-list .basic-list
  // C. First Item
  // D. 2nd item
  // E. third item
  // >
  // renders as
  // <ol type="A" start=3 id="item-list" class="basic-list">
  //   <li>First Item</li>
  //   <li>2nd item</li>
  //   <li>third item</li>
  // </ol>
  positional_arguments: ["ordered", "type", "start"],
  boolean_arguments: ["ordered", "reversed", "compact"],
};

note_arguments = 
// <note margin +preview .footnote | text of the note> --> 
// <aside class="footnote" data-placement="margin" data-preview="true">text of the note</aside>
{
  includes_content: true,
  positional_arguments: ["placement"],
  boolean_arguments: ["preview"]
};

reference_arguments:
// <ref #fig:body-cross-section +link +preview +title> -->
// <a href="#fig:body-cross-section" onmouseover=showThumbnail()>3: <em>Cross section of main body</em></a>
// 
// <ref #fig:body-cross-section +link> -->
// <a href="fig:#body-cross-section">3</a>
// 
// <ref-table #table:population-change +title> --> 2: <em>Change in Population</em>
// 
// <ref #sec:intro +title +link> --> <a href="#sec:intro"><em>General Introduction</em></a>
{
  required_arguments: ["target"],
  boolean_arguments: ["link", "preview", "title"],
};
```
