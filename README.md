# Acadamark
A proposed system for harnessing HTML+CSS+JS for typesetting academic publications that combines the simplicity of markdown with the consistency and features of HTML and LaTeX. 

## Motto
>Not re-inventing the wheel. Re-discovering the wheel.

In this case I am considering HTML to be the wheel.

## Why?
### The issues with markdown
Markdown is simple and intuitive. It's beauty and power lie in the fact that it provides a simple syntax for enhancing text-based communication with semantic meaning that simultaneously:

- Is easy to type
- Is easy and effective read as plain text
- Translates perfectly into visual formatting through HTML+CSS+JS

These are the reasons why markdown has been so widely adopted and accepted.

I'm going to speculate that markdown now comprises the most common typesetting system used for quantitative academic work. I support this by the fact that so much quantiative work is done in computational notebooks which use markdown, that so much discussion takes place in github issues, slack/teams/etc. where markdown is used, and that markdown is used for many static site generators.

RMarkdown, Bookdown and now Quarto have sought to extend markdown with capabilities itneeded for academic work. The result is that they pollute the essential beauty and intention of markdown and create ad-hoc systems with no consistency. To extend or refine these systems requires re-inventing the wheel. Thus the invention of Qarto over extending RMarkdown. The pandoc project has also helped make markdown rigorous and universal.

Unfortunately, efforts to extend markdown, including generic 3rd party pandoc filters, suffer multiple problems:

1. There are now multiple enhanced markdown flavors each with their own parser.
2. There is no agreement or consistency between them for how to define or implement extensions.
3. It's not possible to combine extensions between these efforts.
4. Extending markdown by definition implies adding idioms, diacritics, symbols and other things that pollute the visual simplicity that is what makes markdown special.

### Latex
TeX/LaTeX is wonderful. It's powerful. Self-consistent. And can pretty much do anything. But it's also fragile due to being compiled. You can have zero output if you have a single problem. The syntax is somewhat arcane, has a high learning curve, is distracting to read, etc.

## Philosophy
Markdown is a beautiful thing in and of itself. Efforts to extend it into a full-fledged academic typesetting system create monsters. They also each re-invent the wheel becasue they do not build on each other (the way LaTeX and LaTeX additions build upon TeX). They are implemented in a technology of choice (R, python, lua, haskell, rust) that lies outside the typesetting domain.

Meanwhile, we already have a good wheel. HTML+CSS+JS comprises a typesetting system that powers the majority of written information that is consumed by humans, and possibly machines as well.

Pure HTML lacks features and specifications for academic writing. Pure, valid HTML is also typing heavy and distracting to read.

> We can leverage HTML+CSS+JS to build an academic publishing system that is simple to type, human readable, self-consistent, and easy to extend within its native ecosystem without re-inventing the wheel.
---Acadamark

## Solution
Acadamark proposes a solution with two components:

1. Rigorously define how to typeset academic publications in HTML
2. Create a shorthand for HTML that includes the most used features in a language that is as close to markdown as possible in terms of being simple, intuitive, human-typable, and human-readable.

### Rigorous definition
- List the essential semantic elements of academic publications
- Determine the best way to implement these using existing HTML tags
- As necessary, create custom HTML tags using the native system for doing so
- Define standard `data-` attributes to be used for academic publications.
- Define mime types to handle text-based (not encoded) domain specific languages commonly used in academic writing. Examples include: LaTex for math, ABC for music, Mermaid for flowcharts, and CSV for tables.
- Define how to incorporate executed source code (yes, this has crossover with the previous)
- Possibly include global or system variables which can be referred to. An example would be being able to grab the section number of the section that contains a particular image or the number of items in a particular list. A more practical example would be the current time, date, and location.

### Shorthand
To remove the overhead of typing opening and closing html tags Acadamark is experimenting with the following system which should be able to be mixed 100% with standard, valid HTML.

- A shorthand tag is an "empty" tag with the content contained inside the tag zone: `<tag content />` vs `<tag>content</tag>`. Shorthand tags somewhat resemble latex control code environments `\env{content}`.
- A shorthand tag can have the following arguments:
  - `#text` is equivalent to `id="text"`
  - `.text1 .text2` is equivalent to `class="text1 text2"
  - `attribute=value` is self-explanatory. Attributes can be implemented to replace nested tags.
  - Anything after a pipe `|` will be treated as the content. This can include nested shorthand tags.
  - `+text`, `-text1` set boolean arguments
- The first argument to a shorthand tag can be "special"
- Well defined rules will allow the interpreter to guess the purpose of arguments

## Status
### Overview
As of the time this file was last committed:

- I am working on the semantic definitions. I'm keeping a record of my notes and ideas in this repository.
- I have created experimental implementations of quite a few of the proposed features. My work is not well-documented, and I have not put together examples. I'm working on it. Most of this is in other repositories I have and needs to be brought together.
- Processing the shorthand tags properly will require writing a sophisticated parser. This is way beyond the level of computer science expertise I have any intention of developing. I'm a data person.
- I am setting a stopping point for myself of building a proof-of-principle system that includes a reasonable set of features and clear proposals for the rest. I hope that I can excite others enough to want to implement the hard stuff.

### Defining
I've been working hard to define the semantic elements. Permalinks to my most current notes are [Semantic Elements](https://github.com/abalter/academark/blob/b0d1e8944b9d568bc91006bf008bcce07664b760/notes/semantic_elements.md), [Minimal Set](https://github.com/abalter/academark/blob/b0d1e8944b9d568bc91006bf008bcce07664b760/notes/minimal_function_target.md), and [Shorthand Tags](https://github.com/abalter/academark/blob/b0d1e8944b9d568bc91006bf008bcce07664b760/notes/shorthand-tag-processing.md).

### Implemented
#### Defining the semantic elements
See above

#### Section nesting
I have code that will turn the following:

```html
<article #article> My Article
<section #intro> Introduction
Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.
<section #first-section  .numbered-section> First Section
 It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged.
<section #condluction  .numbered-section> Conclusion
<sub-section #first-subsection> Sub Section of First
 It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.
<sub-section #second-subsection> Second Sub Section of First
Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source.
<section #second-section .numbered-section> Second Section
Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of "de Finibus Bonorum et Malorum" (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of ethics, very popular during the Renaissance.
<section #conclusion> Conclusion
The first line of Lorem Ipsum, "Lorem ipsum dolor sit amet..", comes from a line in section 1.10.32.
```

into
```html
<article id="article=">
    <h0> My Article</h0>
    <section id="intro=">
        <h1>Introduction</h1>
        <p>Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.</p>
    </section>
    <section id="first-section="" class="numbered-section=">
        <h1>First Section</h1>
        <p>It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged.</p>
    </section>
    <section id="conclusion">
        <section id="first-subsection=">
            <h2>Sub Section of First</h2>
            <p>It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.</p>
        </section>
        <section id="second-subsection=">
            <h2> Second Sub Section of First</h2>
            <p>Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source.<p>
        </section>
    </section>
    <section id="second-section=" class="numbered-section=">
        <h1>Second Section</h1>
        <p>Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of "de Finibus Bonorum et Malorum" (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of ethics, very popular during the Renaissance.</p>
    </section>
    <section id="conclusion">
        <h1> Conclusion</h1>
        <p>The first line of Lorem Ipsum, "Lorem ipsum dolor sit amet..", comes from a line in section 1.10.32.</p>
    </section>
</article>
```

#### Processing of shorthand tags 
I've implemented a pretty general system for parsing them and processing them using a registration system. I'm using a regex approach which is not sustainable---a real parser is needed. For example, I have code that would parse the following in a text file

```html
<figure #adult-elephant +number align=right +wrap src=https://puppypictures.com/puppy.jpg width=100 height=100 | this is the caption for the figure />
```

And create the object

```js
{
    "tagname":"figure",
    "arguments":
    {
        "number":true,
        "align":"right",
        "wrap":true,
        "src":"https://puppypictures.com/puppy.jpg",
        "width":"width",
        "height":"height",
        "content":"This is the caption for the figure."
    },
    "id":"adult-elephant",
    "class":null
} 
```

Which can be rendered as

```html
<figure id="adult-elephant" data-wrap-text=true data-align=right data-include-figure-number=true>
  <img src="https://puppypictures.com/puppy.jpg" height=100 width=100 />
  <caption>Figure 3: This is the caption for the figure.</caption>
</figure>
```

#### Citations
Using the citation-js library I can turn 

```
<section> Introduction
This is a statement which I'm supporting with references <cite nkyad,anova_unbalanced_1993 />.
<section> Another Section
This is a bunch more text. It also has a citation <cite nd_neeman_pellicano" />
<section id="bibliography"> References
<references all>
```

Into
```html
<section>
    <h1>Introduction</h1>
    <p>This is a statement which I'm supporting with references <cite data-reflist="nkyad,anova_unbalanced_1993">(Cavna, 2013; Shaw &amp; Mitchell-Olds, 1993)</cite>.</p>
</section>
<section>
    <h1>Another Section</h1>
    <p>This is a bunch more text. It also has a citation <cite data-reflist="nd_neeman_pellicano">(Ne’eman &amp; Pellicano, 2022)</cite> .</p>
</section>
<section id="bibliography">
    <h1>References</h1>
    <section id="references-list">
        <div class="csl-bib-body">
            <div data-csl-entry-id="nkyad" class="csl-entry">Cavna, M. (2013, July 31). ‘NOBODY KNOWS YOU’RE A DOG’: As iconic Internet cartoon turns 20, creator Peter Steiner knows the idea is as relevant as ever. <i>The Washington Post</i>.</div>
            <div data-csl-entry-id="nd_neeman_pellicano" class="csl-entry">Ne’eman, A., &amp; Pellicano, E. (2022). Neurodiversity as Politics. <i>Human Development</i>, <i>66</i>(2), 149–157. https://doi.org/10.1159/000524277</div>
            <div data-csl-entry-id="anova_unbalanced_1993" class="csl-entry">Shaw, R. G., &amp; Mitchell-Olds, T. (1993). Anova for Unbalanced Data: An Overview. <i>Ecology</i>, <i>74</i>(6), 1638–1645. https://doi.org/10.2307/1939922</div>
        </div>
    </section>
</section>
```