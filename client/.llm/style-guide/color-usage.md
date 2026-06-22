# Color usage

## `brand-primary`

Use for the most important actions.

Use it for:

- primary buttons
- main links
- active navigation items
- selected states
- important icons
- progress indicators

Example:

```tsx
<button className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90">
  Book a demo
</button>
```

Do not use `brand-primary` for large background sections unless the section needs strong visual impact.

---

## `brand-secondary`

Use as a purple accent.

Use it for:

- badges
- small labels
- innovation or AI-related highlights
- decorative accents
- secondary emphasis

Example:

```tsx
<p className="text-sm font-semibold uppercase tracking-wide text-brand-secondary">
  Vertical AI
</p>
```

Do not use purple as the main CTA color. Main CTAs should use `brand-primary`.

---

## `brand-navy`

Use as the main text color.

Use it for:

- headings
- card titles
- navigation text
- form labels
- important body text

Example:

```tsx
<h1 className="text-5xl font-bold tracking-tight text-brand-navy">
  The operating system for energy companies
</h1>
```

---

## `brand-muted`

Use for secondary text.

Use it for:

- descriptions
- helper text
- metadata
- supporting paragraphs
- captions

Example:

```tsx
<p className="mt-4 max-w-2xl text-lg leading-8 text-brand-muted">
  Manage customer journeys, operations, and service workflows from one platform.
</p>
```

---

## `brand-soft`

Use for large soft backgrounds.

Use it for:

- page backgrounds
- feature sections
- dashboard wrappers
- neutral content blocks

Example:

```tsx
<section className="bg-brand-soft px-6 py-20">...</section>
```

---

## `brand-blueSoft`

Use for soft blue highlights.

Use it for:

- secondary buttons
- icon containers
- low-priority selected states
- subtle CTA areas
- light info boxes

Example:

```tsx
<div className="flex size-12 items-center justify-center rounded-xl bg-brand-blueSoft text-brand-primary">
  ⚡
</div>
```

---

## `brand-border`

Use for subtle separation.

Use it for:

- card borders
- input borders
- dividers
- table rows
- dropdown borders

Example:

```tsx
<div className="rounded-2xl border border-brand-border bg-white p-6">...</div>
```

---

## `brand-dark`

Use for high-contrast dark sections.

Use it for:

- footer
- dark CTA sections
- premium or platform sections

Example:

```tsx
<section className="bg-brand-dark px-6 py-20 text-white">...</section>
```

Use dark sections sparingly.

---

## `brand-success`

Use only for positive states.

Use it for:

- success messages
- checkmarks
- completed states
- confirmation UI

Example:

```tsx
<span className="font-medium text-brand-success">Completed</span>
```

Do not use green as a general brand accent.
