# UI Style Guide

## Design direction

The application should follow a clean B2B SaaS style inspired by epilot.cloud.

The UI should feel:

- modern
- trustworthy
- technical
- clear
- enterprise-ready
- cloud-platform oriented

Use strong blue CTAs, dark navy text, white cards, soft blue-gray sections, subtle borders, and generous spacing.

---

## Tailwind 4 theme tokens

Brand colors are defined in `src/style.css` using Tailwind 4 `@theme`.

```css
@import 'tailwindcss';

@theme {
  --color-brand-primary: #005eb4;
  --color-brand-secondary: #913997;

  --color-brand-navy: #071a2c;
  --color-brand-muted: #5f6f7f;

  --color-brand-soft: #f5f8fc;
  --color-brand-blueSoft: #eaf4ff;
  --color-brand-border: #dde7f0;

  --color-brand-dark: #03182e;
  --color-brand-success: #39b54a;
}
```

For additional guides and rules:

- general rules => 'epilot/client/.llm/style-guide/general-rules.md'
- color usage => 'epilot/client/.llm/style-guide/color-usage.md'
- examples on how to apply styles to components => 'epilot/client/.llm/style-guide/component-examples.md'
- code generation instructions => 'epilot/client/.llm/style-guide/codegen-instructions.md'
- layout examples => 'epilot/client/.llm/style-guide/layout-examples.md'
