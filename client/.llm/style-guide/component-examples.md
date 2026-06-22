# Component examples

## Primary button

```tsx
<button className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90">
  Primary action
</button>
```

Use for the main action on a page or section.

---

## Secondary button

```tsx
<button className="rounded-full bg-brand-blueSoft px-5 py-3 text-sm font-semibold text-brand-primary transition hover:opacity-90">
  Secondary action
</button>
```

Use for secondary actions that should still feel visible.

---

## Ghost button

```tsx
<button className="rounded-full px-5 py-3 text-sm font-semibold text-brand-primary transition hover:bg-brand-blueSoft">
  Learn more
</button>
```

Use for low-emphasis actions.

---

## Card

```tsx
<div className="rounded-2xl border border-brand-border bg-white p-6 shadow-sm">
  <h2 className="text-xl font-semibold text-brand-navy">Customer journeys</h2>

  <p className="mt-3 text-brand-muted">
    Build guided flows for sales, onboarding, support, and internal operations.
  </p>
</div>
```

Cards should usually be white with a subtle border.

---

## Feature card with icon

```tsx
<div className="rounded-2xl border border-brand-border bg-white p-6 shadow-sm">
  <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-brand-blueSoft text-brand-primary">
    ⚡
  </div>

  <h2 className="text-xl font-semibold text-brand-navy">Automate workflows</h2>

  <p className="mt-3 text-brand-muted">
    Create clean, guided processes for customers and internal teams.
  </p>
</div>
```

Use `brand-blueSoft` for icon backgrounds and `brand-primary` for the icon color.

---

## Form input

```tsx
<label className="block">
  <span className="text-sm font-medium text-brand-navy">Email address</span>

  <input
    type="email"
    className="mt-2 w-full rounded-xl border border-brand-border bg-white px-4 py-3 text-brand-navy outline-none transition placeholder:text-brand-muted focus:border-brand-primary focus:ring-2 focus:ring-brand-blueSoft"
    placeholder="you@example.com"
  />
</label>
```

Inputs should use subtle borders and blue focus states.

---

## Badge

```tsx
<span className="inline-flex rounded-full bg-brand-blueSoft px-3 py-1 text-xs font-semibold text-brand-primary">
  New
</span>
```

For purple accent badges:

```tsx
<span className="inline-flex rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-secondary">
  AI-powered
</span>
```

Use purple badges sparingly.

---

## Alert success

```tsx
<div className="rounded-2xl border border-brand-border bg-white p-4">
  <p className="font-medium text-brand-success">Changes saved successfully.</p>
</div>
```

Success states should use `brand-success`, but the container should stay neutral.
