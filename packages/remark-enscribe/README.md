# @enscribejs/remark

Remark plugin for the [enscribe](https://github.com/enscribejs/enscribe)
shorthand authoring syntax.

Hybrid architecture: a micromark extension finds tag boundaries in the source
stream, and a Peggy grammar parses the internals of each tag. Produces
`enscribeTag` mdast nodes for downstream interpretation.

```sh
npm install @enscribejs/remark
```

This is a placeholder README. See the
[main repository](https://github.com/enscribejs/enscribe) for full
documentation.
