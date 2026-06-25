# epilot

A pnpm workspace for a Bitcoin price-direction game.

## Current implementation

- `client`: a Vite + React 19 interface for the BTC/USD prediction game.
- `server`: minimal AWS SAM Lambda structure, exposed locally through API Gateway proxy integration.
- `packages/api-contract`: shared TypeScript request/response types for the game API.

The client currently renders a static game screen with a sample BTC/USD price, score, and up/down prediction controls. A typed API client exists, but the game screen is not yet wired to live API state.

## Getting started

Install workspace dependencies:

```bash
pnpm install
```

Start the client development server:

```bash
pnpm --dir client dev
```

Start the local API (requires the [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) and Docker):

```bash
pnpm --dir server start
```

The local API exposes:

- `GET http://127.0.0.1:3000/health`
- `GET http://127.0.0.1:3000/state`
- `POST http://127.0.0.1:3000/guesses`
- `POST http://127.0.0.1:3000/guesses/resolve`

Game API routes require an `x-user-id` header. The client uses `VITE_API_BASE_URL` and defaults to `http://127.0.0.1:3000`. Local CORS allows Vite origins `http://localhost:5173` and `http://127.0.0.1:5173`.

Backend configuration is read from `SNAPSHOT_SIGNING_SECRET`, `COINGECKO_PRICE_URL`, `SNAPSHOT_VALIDITY_MS`, `PROVIDER_CACHE_TTL_MS`, `GUESS_ELIGIBILITY_MS`, and `CORS_ALLOWED_ORIGINS`. Local SAM defaults are defined in `server/template.yaml`.

## Documentation

See the [client README](./client/README.md) for client-specific setup and structure.
See the [server README](./server/README.md) for server-specific setup and structure.

## Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm --dir server test
pnpm format:check
```
