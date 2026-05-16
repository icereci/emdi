---
title: Smoke Test
tags: [smoke, demo]
---

# emdi smoke test

A document that exercises every renderer in the pipeline.

## Paragraphs and emphasis

Normal **bold**, _italic_, and `inline code`. Autolink: https://example.com .

## Lists

- bullet one
- bullet two
  - nested
- bullet three

1. ordered
2. items
3. here

## Task list

- [ ] todo
- [x] done

## Table

| col a | col b |
| ----- | ----- |
| 1     | 2     |
| 3     | 4     |

## Code block

```ts
function hello(name: string): string {
  return `hi, ${name}`;
}
```

## Math

Inline: $a^2 + b^2 = c^2$

Block:

$$
\int_0^\infty e^{-x^2} \, dx = \frac{\sqrt{\pi}}{2}
$$

## Footnote

Here's a claim[^claim].

[^claim]: ...and here's the supporting footnote.

## Admonitions

:::note
A neutral note for context.
:::

:::warning Watch out
This is a warning admonition with a custom title.
:::

:::tip
A handy tip.
:::

## Wikilinks

See [[other-note]] or [[notes/index|home]].

## Blockquote

> The best way to predict the future is to invent it.

## Horizontal rule

---

Done.
