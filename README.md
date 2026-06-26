# epilot

A pnpm workspace for a Bitcoin price-direction game.

## Current implementation

- `client`: a Vite + React 19 interface for the BTC/USD prediction game, wired to the game API with TanStack Query.
- `server`: minimal AWS SAM Lambda structure, exposed locally through API Gateway proxy integration.
- `packages/api-contract`: shared TypeScript request/response types for the game API.

The client loads the current game state from the API, stores an anonymous browser user ID in `localStorage`, and sends it on game requests through the `x-user-id` header. Players can choose whether BTC/USD will move up or down, see an optimistic pending-guess state, and wait while the API automatically checks eligible guesses after 60 seconds. Feedback messages cover loading, background refreshes, stale cached data, API errors, created guesses, result checks, unchanged prices, and resolved score changes.

## Getting started

Install workspace dependencies:

```bash
pnpm install
```

Start the client development server:

```bash
pnpm --dir client dev
```

The client reads `VITE_API_BASE_URL` and defaults to `http://127.0.0.1:3000`.

Start the local API (requires the [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) and Docker):

```bash
pnpm dynamodb:setup
pnpm --dir server start
```

If the table already exists, the create-table command returns a
`ResourceInUseException`; continue with `pnpm --dir server start`.

To reset the local table, run `pnpm dynamodb:delete-table` and then
`pnpm dynamodb:create-table`.

The local API exposes:

- `GET http://127.0.0.1:3000/health`
- `GET http://127.0.0.1:3000/state`
- `POST http://127.0.0.1:3000/guesses`
- `POST http://127.0.0.1:3000/guesses/resolve`

Game API routes require an `x-user-id` header. Local CORS allows Vite origins `http://localhost:5173` and `http://127.0.0.1:5173`.

Backend configuration is read from `SNAPSHOT_SIGNING_SECRET`, `COINGECKO_PRICE_URL`, `SNAPSHOT_VALIDITY_MS`, `PROVIDER_CACHE_TTL_MS`, `GUESS_ELIGIBILITY_MS`, `CORS_ALLOWED_ORIGINS`, `PLAYER_TABLE_NAME`, and `DYNAMODB_ENDPOINT`. Local SAM defaults are defined in `server/template.yaml`; the local start script points the Lambda container at DynamoDB Local on `http://host.docker.internal:8000`.

## Documentation

See the [client README](./client/README.md) for client-specific setup and structure.
See the [server README](./server/README.md) for server-specific setup and structure.

## Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm --dir client test
pnpm --dir server test
pnpm format:check
```
