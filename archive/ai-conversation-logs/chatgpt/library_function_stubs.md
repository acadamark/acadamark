https://chatgpt.com/share/69ed3e30-d778-83e8-b6f6-07dc86668850

The uploaded spec file is no longer available to reload directly, so this is based on what we already reviewed and discussed in the chat. Re-upload the file later if you want a fresh pass against the original document.

````markdown
# Academark JavaScript Library Planning Notes

## Goal of the Chat

The goal was to review an early specification for a JavaScript library for academic writing in HTML and sketch a clean, maintainable architecture before implementing full functionality.

The proposed library, tentatively called `Academark`, is intended to process academic-writing-related HTML elements dynamically in the browser, including:

- Citations
- Notes
- Cross-references
- Reference lists
- Note lists
- Eventually, possibly lists of figures, tables, equations, or other document elements

The immediate goal was not to implement citation formatting, bibliography generation, or cross-reference resolution in full. The goal was to establish:

- Class structure
- Function interfaces
- Options handling
- Collection handling
- Basic processing flow
- A direction for future expansion

## Original Library Concept

The library is designed to process academic writing elements embedded in HTML.

Examples include:

```html
<cite>jones2023, p.23, smith2017</cite>
```

```html
<aside>This is a note.</aside>
```

```html
<ref target="#fig:truck-finished">Figure</ref>
```

The library should dynamically replace or enhance these tags with properly formatted academic output, such as:

- Inline citations
- Footnote/endnote markers
- Rendered note lists
- Cross-reference links
- Bibliography/reference lists
- Hover previews
- Links back and forth between references and source locations

## Design Direction Chosen

### 1. Optimize for Dynamic Client-Side Rendering

We decided that the first implementation should focus on dynamic rendering in the browser.

The current scope is:

- Current page only
- Sources, notes, and cross-references local to the page
- Dynamic DOM processing after the page loads

Multi-page document support was explicitly postponed.

Possible future multi-page modes may include:

- A set of pages treated as one document
- Static rendering from source files
- Router-aware cross-page references
- Ordered page lists to determine section numbering and reference numbering

But for now, the design should stay focused on one rendered HTML page.

## Key Architectural Decisions

### 1. Hybrid Function/Class Approach

We discussed whether low-level functions should exist independently of class instances.

The conclusion was yes.

The library should expose low-level formatting functions such as:

- `formatCitation`
- `formatNote`
- `formatCrossReference`
- `formatReferenceListItem`
- `formatNoteListItem`

These should be callable directly by someone who wants to use the library in a more functional or custom way.

At the same time, a higher-level `Academark` class should coordinate the normal workflow.

### 2. Avoid Excessive Design Pattern Overhead

We discussed the Strategy pattern, composition, and mixins.

The conclusion was that those patterns may be useful in larger or more complex systems, but they are probably more overhead than this project currently needs.

The preferred approach is:

- Simple class inheritance where it clearly reduces repetition
- Standalone functions for low-level operations
- No deep abstraction layers yet
- No premature Strategy pattern unless rendering/processing behavior becomes much more variable later

### 3. Use a Base `Collection` Class

We discussed whether separate classes like `CitationCollection`, `NoteCollection`, and `CrossReferenceCollection` should inherit from a shared `Collection` class.

The conclusion was yes.

This avoids repeating basic collection logic.

The base `Collection` should handle common behavior such as:

- Storing items
- Adding items
- Rendering a generic list
- Debug logging

Specialized collection classes should customize only what differs.

Proposed hierarchy:

```javascript
class Collection
class NotesCollection extends Collection
class CrossReferenceCollection extends Collection
class CitationCollection extends Collection
```

The specialized classes can call `super.renderList()` and then add custom behavior as needed.

### 4. Keep Options Separate from Collections

We discussed whether options should belong to collections.

The conclusion was that options should be separate from collections.

Reasoning:

- Collections are data containers.
- Options describe how that data should be rendered or processed.
- The same collection may need to be rendered differently in different contexts.

For example:

- Screen mode
- Print mode
- Small viewport mode
- Paginated mode
- Hover-preview-enabled mode
- Hover-preview-disabled mode

The `Academark` object should store the active options, because it coordinates rendering.

This allows a page to instantiate an `Academark` object appropriate to the current context, such as:

- User viewport
- User accessibility settings
- Print mode
- Reader mode
- User preference for hover previews

Alternatively, multiple `Academark` instances could exist with different options.

### 5. Use an Options Class Hierarchy

We proposed a base `Options` class and specialized subclasses.

Proposed hierarchy:

```javascript
class Options
class NotesOptions extends Options
class CrossReferenceOptions extends Options
class CitationOptions extends Options
```

The base `Options` class should provide shared functionality such as:

- Getting an option with a fallback default
- Setting an option
- Merging options
- Debug logging
- Possibly validating allowed values later

The specialized subclasses can later define defaults and validation for their own domains.

### 6. Use Singular Tag Processing Methods First

We discussed whether method names should be singular or plural, such as:

- `processCitationTag`
- `processCitationTags`

The conclusion was to start with singular tag-processing methods.

The higher-level looping can be handled separately, initially with maps or loops.

Later, `Academark` may include higher-level methods such as:

```javascript
renderPage()
renderPages()
renderDocument()
renderSite()
```

Those methods can decide how to loop through tags in an appropriate order.

For now, the core tag processors should process one element at a time.

## Proposed Class Structure

The agreed direction was approximately:

```javascript
class Options

class NotesOptions extends Options

class CrossReferenceOptions extends Options

class CitationOptions extends Options

class Collection
  renderList(){}

class NotesCollection extends Collection
  renderList(){}

class CrossReferenceCollection extends Collection
  renderList(){}

class CitationCollection extends Collection
  renderList(){}

class Academark
  addSources(library_name, file, type){}
  addCollection(type, name){}
  processNoteTag(){}
  processCrossReferenceTag(){}
  processCitationTag(){}

function formatCitation()
function formatCrossReference()
function formatNote()
function formatReferenceListItem()
function formatNoteListItem()
```

## Stub Code Produced

A first stub implementation was drafted.

It included:

### `Options`

Basic functionality:

- Store an options object
- Get an option by key
- Provide a default value
- Set an option
- Log options for debugging

### `NotesOptions`, `CrossReferenceOptions`, `CitationOptions`

Each subclass extended `Options`.

At this stage, they did not add custom behavior, but they establish clear places for future defaults and validation.

### `Collection`

Basic functionality:

- Store `items`
- Store options
- Add items with basic null checking
- Render items into a generic `div`
- Provide logging/debugging utility

### `NotesCollection`, `CrossReferenceCollection`, `CitationCollection`

Each subclass extended `Collection`.

At this stage, they mostly call `super.renderList()`, but they establish places for custom list rendering.

### `Academark`

Basic functionality:

- Store sources
- Store collections
- Store options
- Add sources
- Add named collections by type
- Process individual note, cross-reference, and citation tags
- Log the current internal state

### Standalone Formatting Functions

Stub functions were defined:

```javascript
formatCitation(citation)
formatCrossReference(ref)
formatNote(note)
formatReferenceListItem(reference)
formatNoteListItem(note)
```

Each function currently performs basic validation, logs what it is doing, and returns placeholder HTML.

## Main Accomplishments

By the end of the chat, we had established:

1. The project should focus first on dynamic, client-side rendering for the current page.

2. Multi-page and static-site rendering should be deferred.

3. Low-level formatting functions should remain independently callable.

4. A higher-level `Academark` class should coordinate normal page processing.

5. Collections and options should be separate concepts.

6. Collections should be represented with a shared base `Collection` class.

7. Options should be represented with a shared base `Options` class.

8. Specialized options and collection classes should exist, even if they are initially thin wrappers.

9. Processing methods should begin as singular methods that handle one tag at a time.

10. Higher-level rendering methods can be added later for processing whole pages, documents, or sites.

11. Advanced patterns like Strategy, mixins, and heavy composition were considered but deferred as probably unnecessary for the current scope.

## Suggested Next Steps

### 1. Refine the Stub API

Before implementing full functionality, tighten the method signatures.

For example, decide whether methods should consistently accept:

```javascript
(element, options = {})
```

or whether they should rely mostly on the active options stored in the `Academark` instance.

Recommended direction:

```javascript
processCitationTag(element, options = {})
processNoteTag(element, options = {})
processCrossReferenceTag(element, options = {})
```

where `options` overrides the instance-level defaults.

### 2. Define Default Options

Add default values to each options subclass.

Examples:

```javascript
CitationOptions:
- render_as
- csl_style
- language
- preview_on_hover
- link_to_list
- urls_as_links
- doi_as_link
- add_to_collection

NotesOptions:
- process_as
- render_as
- marker
- preview_on_hover
- link_to_list
- add_to_collection

CrossReferenceOptions:
- include_link
- include_label
- include_type
- reference_numbering
- preview_on_hover
```

### 3. Decide Internal Item Shape

Collections should probably not store raw strings or raw DOM elements only.

A collection item may need a consistent internal shape such as:

```javascript
{
  id,
  type,
  raw,
  rendered,
  source_element,
  collections,
  metadata
}
```

This will make rendering lists, backlinks, sorting, and debugging easier later.

### 4. Add Option Merging

The library will need a clear option precedence model.

Likely order:

1. Library defaults
2. `Academark` instance options
3. Collection-specific options, if ever added
4. Tag attributes
5. Direct function-call options

This should be handled by a utility method such as:

```javascript
mergeOptions(defaults, instanceOptions, tagOptions, callOptions)
```

or by methods on the `Options` class.

### 5. Implement Tag Attribute Reading

The tag processors should eventually read attributes such as:

```html
<cite csl-style="apa" add-to-collection="references"></cite>
<aside marker="symbols"></aside>
<ref target="#fig:truck-finished" include-label="true"></ref>
```

This should probably be done in helper functions so the processors remain clean.

### 6. Implement Minimal Real Rendering

Start with simple non-CSL placeholder rendering before integrating `citation-js` or `citeproc-js`.

For example:

- Replace `<cite>jones2023</cite>` with `<span class="academark-citation">(jones2023)</span>`
- Replace `<note>...</note>` with a numbered marker
- Replace `<ref target="#fig:x">Figure</ref>` with a link to the target

This will prove the architecture before adding complex formatting.

### 7. Add Debug Mode

The initial stubs included logging.

A next step would be to make logging conditional:

```javascript
debug: true
```

Then use a method like:

```javascript
this.debugLog(...)
```

instead of direct `console.log(...)`.

### 8. Add a Page-Level Render Method

Once singular tag processors work, add something like:

```javascript
renderPage(root = document)
```

This method can:

1. Find citation tags
2. Find note tags
3. Find cross-reference targets
4. Process cross-reference tags
5. Render requested lists

This keeps the singular methods intact while giving users a convenient high-level API.

### 9. Add Tests or Demo HTML

Create a very small test page with:

- Two citations
- Two notes
- One figure
- One cross-reference to that figure
- One references-list target
- One notes-list target

This will let the architecture be tested incrementally.

## Open Questions

1. Should `Collection` store DOM elements, rendered strings, or normalized item objects?

2. Should `processCitationTag()` automatically add the citation to a collection?

3. Should collection names be strings only, or should there be default collections such as:
   - `references`
   - `bibliography`
   - `notes`
   - `figures`
   - `tables`

4. Should options be plain objects internally, or should all options always be wrapped in `Options` subclasses?

5. Should the library mutate the original tags, replace them, or wrap them?

6. Should custom tags like `<note>` and `<ref>` be supported directly, or should canonical HTML with data attributes also be supported?

Possible canonical alternatives:

```html
<aside data-academark-note>...</aside>
<a data-academark-ref target="#fig:x">Figure</a>
```

7. Should rendering functions return strings, DOM nodes, or support both?

A likely practical direction:

- Low-level formatters return strings by default.
- DOM processors handle inserting those strings or nodes into the page.
````
