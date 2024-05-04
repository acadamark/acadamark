# Numbering
Automatic

# Alignment
left, center, right

# Wrap
global only?

# Caption location
left, right, top, bottom

# Id (label)


Look at some journal articles.

```
<figure #adult-elephant +number align=right +wrap src="whatever" caption="this is the caption for the figure" />
```

```
<figure 
    #adult-elephant 
    +number 
    align=right 
    +wrap 
    src=whatever
    caption="this is the caption for the figure" 
/>
```

```
<figure #adult-elephant +number align=right +wrap
<img src="whatever" />
<caption | This is the caption for the figure />
/>
```

```
<figure 
    id="adult-elephant"
    data-number="true" 
    data-align="right"
    data-wrap="true"
>
    <img src="whatever" />
    <caption>This is the caption for the figure</caption>
</figure>
```