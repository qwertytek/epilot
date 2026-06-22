# AI/codegen instruction

When generating UI, always use the project brand tokens.

Prefer:

```tsx
className = 'bg-brand-primary text-white';
```

Avoid:

```tsx
className = 'bg-blue-600 text-white';
```

Prefer:

```tsx
className = 'text-brand-navy';
```

Avoid:

```tsx
className = 'text-slate-900';
```

Prefer:

```tsx
className = 'border-brand-border';
```

Avoid:

```tsx
className = 'border-gray-200';
```

The goal is to keep the product visually consistent with the epilot-inspired brand palette.
