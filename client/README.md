# Client

The frontend for epilot's Bitcoin price-direction game. It is built with Vite, React 19, TypeScript, Tailwind CSS 4, and TanStack Query.

## Run locally

From the repository root:

```bash
pnpm install
pnpm --dir client dev
```

Vite prints the local URL when the development server starts.

The client calls `VITE_API_BASE_URL` when it is set and otherwise defaults to
`http://127.0.0.1:3000`.

## Available commands

```bash
pnpm --dir client dev      # start the development server
pnpm --dir client test     # type-check and run client node:test tests
pnpm --dir client build    # create a production build
pnpm --dir client preview  # serve the production build locally
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
- feedback for loading, background refresh, stale cached state, API errors, result checks, unchanged prices, and resolved score changes.

The client API layer uses the shared `@epilot/api-contract` package for request and response types. TanStack Query owns game-state fetching, mutation cache updates, retry behavior, stale-state handling, and background refetches.

## Structure

```text
src/
├── api/       HTTP client and anonymous browser identity
├── app/       Application entry point, query client, and app-level styles
├── features/  Feature-specific UI, API adapters, query hooks, and tests
├── hooks/     Shared React hooks
└── shared/    Reusable components, styles, utilities, and design tokens
```
