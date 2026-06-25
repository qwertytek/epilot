# Server

AWS SAM Lambda backend for the Bitcoin price-direction game.

## Architecture

The server is split by responsibility, with `src/handler.ts` kept as the Lambda adapter and `src/app.ts` used as the composition root.

Request flow:

```txt
handler.ts
  -> app.ts
    -> routes/index.ts
      -> routes/*.route.ts
        -> domain/game.ts
          -> domain/player-store.ts
        -> infra/*
```

Start in `src/handler.ts` when reading the backend. It handles CORS preflight responses, wraps API errors, resolves the route from the method/path, and delegates matched requests to the route table. It should stay free of endpoint-specific behavior, game rules, provider setup, and persistence details.

`src/app.ts` wires the application together. It reads configuration, creates the HTTP responder, wraps the price provider with caching, creates signed snapshot helpers, builds the in-memory player store, and passes those dependencies into the game service and routes.

The route table lives in `src/routes/index.ts`. It maps each HTTP method and path to a route handler:

- `GET /health` -> `src/routes/health.route.ts`
- `GET /state` -> `src/routes/state.route.ts`
- `POST /guesses` -> `src/routes/guesses.route.ts`
- `POST /guesses/resolve` -> `src/routes/guesses.route.ts`

Route files are thin HTTP adapters. They read route-specific input, validate request shape through `src/routes/request.ts`, call the game service, and return HTTP responses through the shared responder.

Domain code lives under `src/domain/`. This layer owns game behavior and player state shape. It does not parse HTTP requests, know about CORS, or call CoinGecko directly.

Infrastructure code lives under `src/infra/`. This layer contains HTTP response helpers, signed price snapshots, the CoinGecko client, and provider caching. These modules are implementation details wired into the domain from `src/app.ts`.

## Boundaries

Use these boundaries when changing the server:

- Put Lambda/API Gateway concerns in `src/handler.ts`.
- Put dependency construction and environment-backed configuration in `src/app.ts` or `src/config.ts`.
- Put endpoint request parsing and response adaptation in `src/routes/`.
- Put game rules and player state transitions in `src/domain/`.
- Put external service clients, signed token mechanics, CORS, and HTTP helpers in `src/infra/`.
- Put cross-cutting server-local types in `src/types.ts`.

Avoid importing route or infrastructure modules from `src/domain/`. Dependencies should flow inward through `src/app.ts`, so game logic can be tested without HTTP or provider setup.

## File Guide

- `src/handler.ts`: Lambda entry point, CORS preflight handling, route dispatch, top-level error handling.
- `src/app.ts`: application composition root and dependency wiring.
- `src/routes/`: HTTP route handlers and the route table.
- `src/routes/request.ts`: route-level request helpers, such as user ID, JSON body parsing, and create-guess request validation.
- `src/routes/route-context.ts`: dependencies passed into every route handler.
- `src/domain/game.ts`: game rules and player state transitions.
- `src/domain/player-store.ts`: in-memory player creation and public player projection.
- `src/infra/price-provider.ts`: CoinGecko integration and price caching.
- `src/infra/snapshots.ts`: signed price snapshot creation and validation.
- `src/infra/http.ts`: response helpers, CORS headers, header lookup, and body parsing.
- `src/errors.ts`: shared API error type and messages.
- `src/config.ts`: environment parsing and defaults.
- `src/types.ts`: server-local types.

## Adding A Route

1. Create a new `src/routes/<name>.route.ts` file.
2. Export a handler that accepts `(event, context)`.
3. Register the method, path, and handler in `src/routes/index.ts`.
4. Keep business rules in `src/domain/` or a focused service, not inside `handler.ts` or the route file.

This keeps `handler.ts` stable and makes endpoint behavior discoverable from the route table.

## Quality Checks

From the workspace root:

```bash
pnpm --dir server test
pnpm --dir server typecheck
```
