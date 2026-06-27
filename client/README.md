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

No mode argument uses `VITE_API_BASE_LOCAL`. Passing `--mode live` uses
`VITE_API_BASE_LIVE`.

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
pnpm --dir client build                 # build with the local API
pnpm --dir client build --mode live     # build with the deployed API
pnpm --dir client test                  # type-check and run client node:test tests
pnpm --dir client preview               # serve the production build locally
```

## Current scope

The client renders a responsive game view connected to the backend API. It currently includes:

- a market challenge header and live score;
- the latest BTC/USD price snapshot from `GET /state`;
- persistent anonymous browser identity via `localStorage`;
- `x-user-id` request headers for game API calls;
- up/down prediction controls backed by `POST /guesses`;
- optimistic pending-guess UI while a guess is submitted;
- a countdown before the active guess is checked automatically;
- automatic result checks through `GET /state`, with `POST /guesses/resolve` still available in the API;
- feedback for loading, API errors, result checks, unchanged prices, resolved score changes, and development-only behind-the-scenes refresh/cache status.

The client API layer uses the shared `@epilot/api-contract` package for request and response types. TanStack Query owns game-state fetching, mutation cache updates, retry behavior, stale-state handling, and background refetches.

Price snapshots are refreshed automatically when they expire, capped at five
expiry refreshes for the initial session and three after the user refreshes the
price or reloads into the reduced-refresh session. The full strategy is
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

Feature folders keep stateful, feature-owning components at the top level of
the feature boundary. Presentational components with no local state stay inside
that component's `components/` folder:

```text
src/features/myFeature/
├── MyFeature.tsx
├── myFeature.api.ts
├── myFeature.queries.ts
└── components/
    ├── MyFeatureHeader.tsx
    └── MyFeatureControls.tsx
```

Nested smart components follow the same rule:

```text
src/features/myFeature/myComponent/
├── MyComponent.tsx
└── components/
    └── MyComponentDetail.tsx
```

Avoid moving UI into `shared/components` just because it has no state. If a
component is tied to a specific feature or screen, keep it local to that feature
or smart component. This keeps state and presentation clearly separated while
making promotion simple: when a local presentational component becomes useful
outside its original UI, it can move from `myComponent/components/` to
`shared/components/` with a clear reason and a small import update.
