# Shorthand Tag Processing

```js
const anchor_arguments:
{
  required_arguments: ["link_target"],
  ordered_arguments: ["required_arguments", "text"],
  argumnet_prefixes =
  {
    "@": "link_target"
  }
};

const cite_arguments: 
{
  required_arguments: ["reference_id"],
  ordered_arguments: ["required_arguments"],
  argument_prefixes =
  {
    "@": "reference_id",
    ["+", "-"]: ["link", "preview", "summary"]
  }
};

const list_arguments:
{
  ordered_arguments: ["ordered", "type", "start"]
  ["+", "-"]: ["ordered", "reversed", "compact"]
  kw_args = ["type", "start", "margin", "list-style-image", "list-style-type", "list-style-position"]
}

aside_arguments:
{
  
}
```
