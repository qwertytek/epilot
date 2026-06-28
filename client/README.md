# Client

The frontend for epilot's Bitcoin price-direction game. It is built with Vite, React 19, TypeScript, Tailwind CSS 4, and TanStack Query.

## Run locally

From the repository root:

```bash
pnpm install
pnpm --dir client dev
```

Vite prints the local URL when the development server starts.

The client reads both API endpoints from `client/.env`:

```text
VITE_API_BASE_LOCAL=http://127.0.0.1:3000
VITE_API_BASE_LIVE=https://your-api-id.execute-api.your-region.amazonaws.com
VITE_APP_ENV=development
```

The dev server uses `VITE_API_BASE_LOCAL` by default. Passing `--mode live` or
building for production uses `VITE_API_BASE_LIVE`.

`VITE_APP_ENV` controls the product UI environment. It defaults to
`development`, including when the client runs with `--mode live` or is hosted
from a static deployment. Set `VITE_APP_ENV=production` only when the deployed
client should hide development-only UI such as the behind-the-scenes feedback
panel.

In development UI mode, the game shows a "Behind the scenes" toggle with
background refresh, cached price, and result-check status messages.
For this exercise, the shared live link is intentionally expected to use
`VITE_APP_ENV=development` so reviewers can inspect that behavior.

```bash
pnpm --dir client start
pnpm --dir client start --mode live
```

## Available commands

```bash
pnpm --dir client start                 # start with the local API
pnpm --dir client start --mode live     # start with the deployed API
pnpm --dir client build                 # build with the deployed API
pnpm --dir client build --mode live     # build with the deployed API
pnpm --dir client test                  # type-check and run client node:test tests
pnpm --dir client preview               # serve the production build locally
```

## Current scope

The client renders a responsive game view connected to the backend API. It currently includes:

- a market challenge header and live score;
- the latest BTC/USD price snapshot from `GET /price`;
- persistent anonymous browser identity via `localStorage`;
- `x-user-id` request headers for game API calls;
- up/down prediction controls backed by `POST /guesses`;
- optimistic pending-guess UI while a guess is submitted;
- a countdown before the active guess is checked automatically;
- automatic result checks through `GET /state`, with `POST /guesses/resolve` still available in the API;
- feedback for loading, API errors, result checks, unchanged prices, resolved score changes, and development-only behind-the-scenes refresh/cache status.

The client API layer uses the shared `@epilot/api-contract` package for request and response types. TanStack Query owns game-state fetching, mutation cache updates, retry behavior, stale-state handling, and background refetches.

Price snapshots are refreshed automatically when they expire, including during a
pending guess. Active-guess refreshes do not spend the manual-session allowance,
and the manual refresh button is hidden until the guess ends. Outside an active
guess, automatic expiry refreshes are allowed for one minute at a time; clicking
the refresh button resets that one-minute window. The full strategy is
documented in the root README.

## Structure

```text
src/
├── api/       HTTP client and anonymous browser identity
├── app/       Application entry point, query client, and app-level styles
├── features/  Feature-specific UI, API adapters, query hooks, and tests
├── hooks/     Shared React hooks
└── shared/    Reusable components, styles, utilities, and design tokens
```

Feature folders are organized around a one-way flow:

```text
data -> state/view model -> components
```

Use this structure for feature-owned screens:

```text
src/features/myFeature/
├── MyFeaturePage.tsx
├── myFeature.css
├── types.ts
├── data/
│   ├── api.ts
│   ├── api.test.ts
│   └── queries.ts
├── state/
│   ├── index.ts
│   ├── viewModel.ts
│   └── hooks/
│       ├── useMyFeatureSession.ts
│       └── useMyFeatureAction.ts
└── components/
    ├── MyFeatureHeader.tsx
    └── MyFeatureControls.tsx
```

`data/` owns the server-data boundary for the feature. It contains HTTP calls,
response normalization, TanStack Query keys, query options, mutations, cache
updates, invalidation, and optimistic updates. Code in this folder should stay
close to backend/API shapes and should not format data for display.

`state/` owns feature orchestration and screen state. It composes data queries,
local hooks, interaction rules, notifications, animation state, and other
derived behavior into a view model for the page. `state/index.ts` is the public
entry point for the page-level state hook. `state/viewModel.ts` maps feature
state into component props.

`components/` owns feature-local presentation. Components receive already-shaped
props from the state/view-model layer and should not call feature data queries
directly. Keep UI in the feature folder when it is tied to a specific screen or
workflow.

`types.ts` owns feature-level UI contracts that are shared across the feature,
such as component prop types. Keep API request/response types in the shared
`@epilot/api-contract` package or inside `data/` when they are truly
feature-local data shapes.

Avoid moving UI into `shared/components` just because it has no state. Promote a
component to `shared/components` only after it becomes genuinely reusable outside
its original feature.
