# Javascript Library for Academic Writing in HTML
## Overview
Academic writing commonly inlcudes some elements that are formatted in particular and expected ways and also refer to or are displayed out of the general flow of the text. These include sources (citations, bibliographies, references lists), notes (footnotes, endnotes, section notes, chapter notes), and cross-references (links to other elements such as figures, sections, tables, or equations). This library will process html tags containing these three types of elements and will format them in a way that is expected by the academic writing community.

## Citations
Citations can be placed inside `<cite>` tags. The library will automatically format the citation based on the style and format specified. Parameters such as citation style (e.g. APA, Chicago) can be set globally or on each citation. Citations can be added to different collections which can be printed as individual lists. For instance, one might add citations to a collection for that section as well as a global "references_list". Then a list of citations can be printed at the end of the sectio as well as all references at the end of document. Features such as links to the lists, links to the sources, and previewing on hover (useful for especially for numbered style references such as [3-5]" ).

## Notes
Notes can be placed inside `<aside>` tags or non-canonical `<note>` tags. The library will automatically format the note based on the style and format specified. As with citations, notes can be added to different collections which can be printed as individual lists. For example, it is common in scientific writing to have footnotes in tables and complex figures which are rendered as part of the figure captions. These notes would not be part of the main text and would be formatted differently.

The library will need to keep track of the order in which notes are added to the document in order to apply appropriate symbols or numbers to them.

## Cross-references
While the original intention of `<a>` tags was to be both for "anchors" and cross-links within documents, they are basically synonimous now with outgoing links. Cross-reference targets can be placed inside `<a>` tags or simply by applying an `id` to an element. One can also add a `ref-label` attribute. Different types of cross-referencable items will be handled by adding a prefix to the id. Examples are: `#eq:maxwells-equation` for equations, `#fig:electric-field-lines` for figures, `#sec:faradays-contribution`. The reference links can be placed inside `<a>` tags or using a non-canonical `<ref>` tag.

The library will need to keep track of the order in which tags are added to the document as well as in which sections in order to apply appropriate symbols or numbers to them. The purpose of a `ref-label` attribute will be to be able do the following:

~~~
<figure id="fig:truck-finished" ref-label="The truck with all work completed."> .... </figure>
...
...
...
as shown in the picture taken last June (<ref show-label="true" target=”#fig:truck-finished">Figure</ref>).
~~~

With the reference rendered as 
~~~
...
as shown in the picture taken last June(<a href="#fig:truck-finished">Figure 3.7: The truck with all work completed.</a>)`.
~~~


## Funtions to Process Tags
These are convenience functions that process tags containing citations, notes, and cross-references directly. They will pass on many arguments directly to the lower level functions (although most of those can be set globally). These functions will be passed a reference to an html element and alter that element. For example, `processCiteTag` will extract the `innerText` of the the element `<cite>jones2023, p.23, smith2017<cite>` passed and replace it with the formatted citation. This may or may not include html, links, etc.


**Example:** `<cite>jones2023, p.23, smith2017<cite>`
~~~
processCiteTag(
  element, // [a <cite> element] : the element to be processed
  pandoc_style, // [true | false] * : Specifies whether to use Pandoc's citation style.
  csl_style,  // [apa | american-medical-association | chicago | etc.] * : Determines the citation style to be used.
  language,  // [en-US | es-ES | etc.] * : Language code for localization of the citation.
  add_to_collection,  // [List of collection names] * : Lists the collection(s) to which the citation should be added.
  preview_on_hover,  // [reference | citation | title | author | date | note] * : Specifies what information to display on hover.
  link_to_list,  // [true | false] * : Indicates whether the citation should link to a list.
  urls_as_links,  // [true | false] * : Determines whether URLs should be rendered as clickable links.
  doi_as_link,  // [true | false] * : Specifies if the DOI should be rendered as a clickable link.
  sort_by,  // [list to order by: title, author, date, note] * : Orders the citations based on the specified criteria.
  id,  // [id for citation element] : The unique identifier to be applied to the citation element.
  classes,  // [list of classes] : CSS classes to be added to the citation element.
  styles,  // [list of CSS styles] : Inline styles to be applied to the citation element.
  attributes  // [List of attributes to add to the citation element] : Additional attributes to include in the citation element.
)
~~~

**Example:** `<aside>This is a note and can be rendered as a footnote, endnote, or even a side note in an adjecent column at the appropriate height</aside>`

~~~
processNoteTag(
  element, // [a <cite> element] : the element to be processed
  process_as,  // [text | html | markdown] * : Specifies the format of the note input.
  render_as, // [text | html | markdown] * : Specifies the format of the note output.
  language,  // [en-US | es-ES | etc.] * : Language code for localization of the note.
  add_to_collection,  // [List of collection names] * : Lists the collection(s) to which the note should be added.
  preview_on_hover,  // [true | false] * : Indicates whether to preview the note on hover.
  link_to_list,  // [true | false] * : Determines whether the note should link to a list.
  marker,  // [numbered, <list of symbols>] * : Specifies the type of marker to be used for notes.
  id,  // [id for note element] : The unique identifier to be applied to the note element.
  classes,  // [list of classes] : CSS classes to be added to the note element.
  styles,  // [list of CSS styles] : Inline styles to be applied to the note element.
  attributes  // [List of attributes to add to the citation element] : Additional attributes to include in the note element.
)
~~~

**Example:** `see figures <ref>#fig:picture-of-elephant, #fig:picture-of-penguin</ref>`. Understanding that `<ref>` is not a canonical tag.

~~~
procesCrossrefTag(
  element, // [a <cite> element] : the element to be processed
  add_type, // [true | false] * : Specifies whether to add the reference type to the link text. E.g. "Figure", "Table", "Equation", etc.]
  preview_on_hover,  // [true | false] : Indicates whether to preview the note on hover.
  include_link,  // [true | false] : Indicates whether to include a link to the cross-referenced item.
  reference_numbering,  // [true | false] : Indicates whether to number the references.
  include_label,  // [true | false] : Indicates whether to include a label for the reference. 
  id,  // [id for note element] : The unique identifier to be applied to the note element.
  classes,  // [list of classes] : CSS classes to be added to the note element.
  styles,  // [list of CSS styles] : Inline styles to be applied to the note element.
  attributes  // [List of attributes to add to the citation element] : Additional attributes to include in the note element.
)
~~~


## Functions to Process Tag Content
These are lower-level functions and can be called directly to process the text of a citation, note, or cross-reference. They will return formatted text for display which may contain html elements etc.

~~~
formatCitation(
  // This is called by processCiteTag with the inner_text of the cite tag which it replaces with what it returns.
  raw_citation, // [string] : The raw citation data to be formatted.
  pandoc_style, // [true | false] * : Specifies whether to use Pandoc's citation style.
  render_as,  // [text | html | markdown] *  : Specifies the format of the citation output.
  csl_style,  // [apa | american-medical-association | chicago | etc.] * : Determines the citation style to be used.
  language,  // [en-US | es-ES | etc.] * : Language code for localization of the citation.
  add_to_collection,  // [List of collection names] * : Lists the collection(s) to which the citation should be added.
  preview_on_hover,  // [reference | citation | title | author | date | note] * : Specifies what information to display on hover.
  link_to_list,  // [true | false] * : Indicates whether the citation should link to a list.
  urls_as_links,  // [true | false] * : Determines whether URLs should be rendered as clickable links.
  doi_as_link,  // [true | false] * : Specifies if the DOI should be rendered as a clickable link.
  sort_by,  // [list to order by: title, author, date, note] * : Orders the citations based on the specified criteria.
)

formatNote(
  // This is called by processNoteTag with the inner_text of the cite tag which it replaces with what it returns.
  raw_note_text, // The raw text of the note.
  process_as,  // [text | html | markdown] * : Specifies the format of the note input.
  render_as, // [text | html | markdown] * : Specifies the format of the note output.
  language,  // [en-US | es-ES | etc.] * : Language code for localization of the note.
  add_to_collection,  // [List of collection names] * : Lists the collection(s) to which the note should be added.
  preview_on_hover,  // [true | false] * : Indicates whether to preview the note on hover.
  link_to_list,  // [true | false] * : Determines whether the note should link to a list.
  marker  // [numbered, <list of symbols>] * : Specifies the type of marker to be used for notes.
)

procesCrossrefTag(
  element, // [a <cite> element] : the element to be processed
  add_type, // [true | false] * : Specifies whether to add the reference type to the link text. E.g. "Figure", "Table", "Equation", etc.]
  preview_on_hover,  // [true | false] : Indicates whether to preview the note on hover.
  include_link,  // [true | false] : Indicates whether to include a link to the cross-referenced item.
  reference_numbering,  // [true | false] : Indicates whether to number the references. Include section number? Etc.
  include_label,  // [true | false] : Indicates whether to include a label for the reference. 
  id,  // [id for note element] : The unique identifier to be applied to the note element.
  classes,  // [list of classes] : CSS classes to be added to the note element.
  styles,  // [list of CSS styles] : Inline styles to be applied to the note element.
  attributes  // [List of attributes to add to the citation element] : Additional attributes to include in the note element.
)

formatCrossref(
  // This is called by processNoteTag with the inner_text of the cite tag which it replaces with what it returns.
  crossref_id, // id of cross-referenced element
  preview_on_hover,  // [true | false] : Indicates whether to preview the note on hover
  include_link,  // [true | false] : Indicates whether to include a link to the cross-referenced item.
  reference_numbering,  // [true | false] : Indicates whether to number the references. Include section number? Etc.
  include_label  // [true | false] : Indicates whether to include a label for the reference. 
)
~~~

## Functions to Create and Format Lists
Citations and Notes will be added to "collections". These collections can be formatted as lists to display. Examples are a Bibliography (list of all sources used during research), References List (list of cited soures), Notes List (list of notes), etc.

I will probably add creating lists of tables and figures. Those seem a bit archaic. But having a generic function to create a list of links to specific items in a document or website seems useful.

~~~
createReferencesList(
  collection,  // [name of collection] : The collection from which to generate the references list.
  as_list,  // [true | false] : Indicates whether to render the references as a list.
  include_back_link,  // [true | false] : Determines whether to include a backlink from the reference list to the citation.
  csl_style,  // [apa | american-medical-association | chicago | etc.] : Determines the citation style to be used.
  add_to_target,  // [id of target element] : The ID of the target element where the references list should be added.
  create_target_if_not_exist,  // [true | false] : Indicates whether to create the target element if it does not exist.
  id,  // [id for references list] : The unique identifier for the references list.
  classes,  // [list of classes] : CSS classes to be added to the references list.
  styles,  // [list of CSS styles] : Inline styles to be applied to the references list.
  title  // [Title for references list. For example: "References" or "Bibliography".] : The title to be displayed for the references list.
)

createNotesList(
  collection,  // [name of collection] : The collection from which to generate the notes list.
  as_list,  // [true | false] : Indicates whether to render the notes as a list.
  include_back_link,  // [true | false] : Determines whether to include a backlink from the notes list to the note marker.
  format_as,  // [footnotes | endnotes | sidenotes] : Specifies how to format the notes.
  add_to_target,  // [id of target element] : The ID of the target element where the notes list should be added.
  create_target_if_not_exist,  // [true | false] : Indicates whether to create the target element if it does not exist.
  id,  // [id for notes list] : The unique identifier for the notes list.
  classes,  // [list of classes] : CSS classes to be added to the notes list.
  styles,  // [list of CSS styles] : Inline styles to be applied to the notes list.
  title  // [Title for notes list. For example: "Notes".] : The title to be displayed for the notes list.
)

createGenericList(collection, ...)
~~~
