# epilot

Bitcoin price-direction game built as a TypeScript pnpm workspace.

Players get the latest BTC/USD price, predict whether the next eligible price
check will be higher or lower, then receive a score update after the guess
window expires. The browser keeps an anonymous user ID in `localStorage` and
sends it to the API through the `x-user-id` header.

## Project Structure

- `client`: Vite, React 19, Tailwind CSS 4, and TanStack Query frontend.
- `server`: AWS SAM Lambda API using API Gateway HTTP API locally.
- `packages/api-contract`: shared TypeScript API request and response types.

The frontend is intentionally thin: it reads game state, fetches price
snapshots, submits guesses, shows pending guess countdowns, and reacts to API
feedback. Game rules, snapshot signing, price fetching, score changes, and
player persistence live on the server.

## Requirements

- Node.js and pnpm 11
- Docker, for DynamoDB Local
- AWS SAM CLI, for the local Lambda/API Gateway runtime

## Getting Started

Install dependencies:

```bash
pnpm install
```

Start DynamoDB Local and create the local player table once:

```bash
pnpm dynamodb:setup
```

If the table already exists, DynamoDB returns `ResourceInUseException`; that is
safe to ignore.

Start the full local app:

```bash
pnpm start
```

This starts DynamoDB Local, the SAM API on `http://127.0.0.1:3000`, and the
Vite client on `http://localhost:5173`.

The client reads `VITE_API_BASE_URL` when set and otherwise calls
`http://127.0.0.1:3000`.

## Local API

The API exposes:

- `GET /health`
- `GET /price`
- `GET /state`
- `POST /guesses`
- `POST /guesses/resolve`

Game routes require an `x-user-id` header. Local CORS allows
`http://localhost:5173` and `http://127.0.0.1:5173`.

Manual service commands are also available:

```bash
pnpm dynamodb:start
pnpm --dir client dev
pnpm --dir server start
```

To reset local player state:

```bash
pnpm dynamodb:delete-table
pnpm dynamodb:create-table
```

## Backend Configuration

Local SAM defaults are defined in `server/template.yaml`. The main environment
variables are:

- `COINGECKO_PRICE_URL`
- `COINGECKO_REQUEST_TIMEOUT_MS`
- `SNAPSHOT_SIGNING_SECRET`
- `SNAPSHOT_VALIDITY_MS`
- `PROVIDER_CACHE_TTL_MS`
- `GUESS_ELIGIBILITY_MS`
- `CORS_ALLOWED_ORIGINS`
- `PLAYER_TABLE_NAME`
- `DYNAMODB_ENDPOINT`

The local server start script points the Lambda container at DynamoDB Local via
`http://host.docker.internal:8000`.

## Quality Checks

```bash
pnpm lint
pnpm typecheck
pnpm --dir client test
pnpm --dir server test
pnpm format:check
```

## More Documentation

- [Client README](./client/README.md)
- [Server README](./server/README.md)
