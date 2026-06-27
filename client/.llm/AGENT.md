# Client Agent Instructions

Use these instructions when changing code under `client/`.

## First read

- Read `client/README.md` before changing architecture, data flow, commands, or folder placement.
- For UI work, read `client/.llm/style-guide/main.md` and any linked style-guide files relevant to the change.
- Check nearby files in the feature being changed before adding new patterns.

## Architecture boundaries

- Keep the frontend thin. Game rules, price fetching, snapshot signing, score changes, and player persistence belong on the server.
- Use `@epilot/api-contract` for API request and response types. Do not duplicate API shapes in the client.
- Keep HTTP transport concerns in `src/api/`.
- Keep app bootstrapping, environment handling, and QueryClient setup in `src/app/`.
- Keep reusable hooks in `src/hooks/`.
- Keep genuinely cross-feature components, utilities, styles, and tokens in `src/shared/`.
- Keep feature-specific UI, API adapters, query hooks, feedback mapping, types, styles, and tests inside that feature folder.

## Feature folder rules

- Put stateful, feature-owning components at the top level of the feature boundary.
- Put presentational components with no local state inside that feature's `components/` folder.
- Do not move UI into `src/shared/components` just because it is presentational. Promote to `shared` only when it is useful outside its original feature.
- For nested smart components, keep their own local `components/` folder beside the smart component.

Expected shape:

```text
src/features/myFeature/
├── MyFeature.tsx
├── myFeature.api.ts
├── myFeature.queries.ts
└── components/
    ├── MyFeatureHeader.tsx
    └── MyFeatureControls.tsx
```

## Data and state

- Let TanStack Query own server-state fetching, mutation cache updates, retries, stale-state handling, and background refetches.
- Keep query keys, query options, and feature mutations in `*.queries.ts` files.
- Keep feature API adapters in `*.api.ts` files and call the shared `requestApi` helper instead of using `fetch` directly in components.
- Preserve anonymous browser identity behavior through `localStorage` and the `x-user-id` API header.
- Prefer optimistic UI only when the server contract and rollback behavior are clear.

## UI and styling

- Follow the existing B2B SaaS visual direction in `client/.llm/style-guide/`.
- Prefer existing shared design tokens and utilities before introducing new colors, spacing scales, or one-off CSS.
- Keep feature-specific CSS with the feature unless the style is truly reusable.
- Maintain responsive behavior and development-only UI affordances documented in `client/README.md`.
- Do not expose development-only UI in production-mode behavior unless the README guidance is intentionally updated.

## Tests and verification

- Run focused checks after client changes:

```bash
pnpm --dir client test
```

- For build-sensitive changes, also run:

```bash
pnpm --dir client build
```

- If changing shared API contracts, also consider workspace-level checks from the root README.
- Add or update tests near the changed feature when behavior, API adaptation, query cache behavior, or error handling changes.

## Change discipline

- Keep edits scoped to the requested client behavior.
- Match the existing TypeScript, React, and import style.
- Prefer small, explicit helpers over broad abstractions unless a repeated local pattern already exists.
- Update `client/README.md` when commands, environment behavior, architecture, or user-visible scope changes.
- Question broad refactors or moves that cut across feature boundaries without a clear product or maintenance reason.
