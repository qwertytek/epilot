# Agent navigation guide

Use this file as the project-specific starting point for LLM work in this
repository. Prefer the concrete source files and package scripts over guesses,
and keep changes scoped to the layer that owns the behavior.

## First orientation

1. Read `README.md` for current project status and workspace commands.
2. Read `.llm/spec.md` when the task touches product behavior, API semantics,
   scoring, snapshot fairness, persistence, or MVP trade-offs.
3. Read `.llm/checklist.md` before implementation to understand what is already
   done and what remains.
4. Read the package README closest to the work:
   - `client/README.md` for React/Vite UI work.
   - `server/README.md` for Lambda/API/domain work.
5. Use `rg` and `rg --files` for navigation. Avoid broad manual browsing until
   the relevant package and layer are clear.

## Repository map

- `client/`: Vite, React 19, TypeScript, Tailwind CSS 4 frontend.
- `server/`: AWS SAM Lambda backend with route, domain, and infra layers.
- `packages/api-contract/`: shared TypeScript request and response types.
- `.llm/`: product specification, checklist, feature acceptance criteria, and
  research notes. Treat these as planning context, not runtime code.

This is a pnpm workspace. Run package-specific commands with `pnpm --dir <pkg>`
unless a root script already exists.

## Source-of-truth boundaries

The backend is the source of truth for score, active guesses, and game state.
The browser stores only the anonymous user id under `btc-game.user-id`.

The shared API contract lives in `packages/api-contract/src/index.ts`. If a
request or response shape changes, update this package first, then update the
server and client consumers in the same change.

The frontend must never submit raw prices or resolve game results locally. It
submits a direction plus `priceSnapshotId`; the backend validates snapshots and
scores guesses.

## Backend navigation

Start at `server/src/handler.ts` for request flow, then follow:

```text
handler.ts
  -> app.ts
    -> routes/index.ts
      -> routes/*.route.ts
        -> domain/game.ts
          -> domain/player-store.ts
        -> infra/*
```

Respect these ownership boundaries:

- `server/src/handler.ts`: Lambda/API Gateway adapter, CORS preflight, route
  dispatch, top-level error handling.
- `server/src/app.ts`: dependency wiring and composition root.
- `server/src/config.ts`: environment parsing and defaults.
- `server/src/routes/`: HTTP input parsing and response adaptation.
- `server/src/domain/`: game rules and player state transitions.
- `server/src/infra/`: HTTP helpers, signed snapshots, CoinGecko integration,
  provider caching, and other external implementation details.
- `server/src/types.ts`: server-local cross-cutting types.

Do not import route or infra modules into `server/src/domain/`. Push
dependencies inward through `app.ts` so domain behavior remains testable without
HTTP, Lambda, or provider setup.

## Frontend navigation

Start at `client/src/features/game/GamePage.tsx` for the current screen and
`client/src/features/game/game.api.ts` for API access.

Use this structure:

- `client/src/app/`: app entry point and app-level styles.
- `client/src/features/game/`: game-specific UI, types, API module, and styles.
- `client/src/features/game/components/`: focused game UI components.
- `client/src/shared/`: reusable components, global styles, and design tokens.

The current UI started as a static game screen. When wiring live behavior, keep
server state authoritative, handle recoverable API errors, and do not duplicate
score or active-guess truth in local storage.

## Common commands

From the workspace root:

```bash
pnpm lint
pnpm typecheck
pnpm format:check
pnpm --dir server test
pnpm --dir client test
```

Development servers:

```bash
pnpm --dir client dev
pnpm --dir server start
```

`server start` requires AWS SAM CLI and Docker. Local API defaults to
`http://127.0.0.1:3000`; the client defaults `VITE_API_BASE_URL` to that URL.

## Implementation habits

- Keep edits small and aligned with existing package boundaries.
- Prefer existing local helpers and types over creating parallel abstractions.
- Add or update tests near the changed behavior, especially for game rules,
  request validation, and API contract changes.
- When touching frontend behavior, test the API module separately from visual
  components where possible.
- When touching backend behavior, keep route tests and domain rules distinct.
- Do not change `.llm/spec.md` or `.llm/checklist.md` as a side effect unless
  the task is explicitly documentation or planning work.

## Product assumptions to preserve

- Anonymous identity is intentionally local-browser only.
- No accounts, leaderboards, historical charts, or background resolution in the
  MVP unless the spec is intentionally changed.
- One active guess per user.
- Guess resolution happens only after the eligibility time and only from a
  server-observed price.
- Price snapshot tokens are backend-owned and opaque to the client.
- CoinGecko calls should respect the provider cache trade-off described in the
  spec.

## Collaboration style

For simple mechanical tasks, execute directly.

For non-trivial design or architecture tasks, question assumptions before
committing to a direction. In particular, challenge changes that weaken the
backend-as-source-of-truth model, move business rules into React, couple the
domain layer to HTTP or infrastructure, or expand the MVP beyond the documented
scope without a clear reason.
