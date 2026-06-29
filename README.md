# epilot

Bitcoin price-direction game built as a TypeScript pnpm workspace.

Players see the latest BTC/USD price, predict whether the next eligible price
check will be higher or lower, then receive a score update after the guess
window expires. The browser keeps an anonymous user ID in `localStorage` and
sends it to the API through the `x-user-id` header.

## Live Clients

- Main: https://main.d1cgb3966fmmq6.amplifyapp.com/
- Dev: https://dev.d1cgb3966fmmq6.amplifyapp.com/

## Workspace

- `client`: Vite, React 19, TypeScript, Tailwind CSS 4, and TanStack Query.
- `server`: AWS SAM Lambda backend for API Gateway HTTP API.
- `packages/api-contract`: shared TypeScript request and response types.

The frontend owns presentation, anonymous browser identity, TanStack Query
cache orchestration, price polling, pending-guess countdowns, and feedback UI.
The backend owns game rules, score changes, signed price snapshots, CoinGecko
fetching, provider caching, and player persistence.

## Game Flow

1. `GET /state` creates or loads the anonymous player's score and active guess.
2. `GET /price` returns a BTC/USD price snapshot plus `canCreateGuess`.
3. `POST /guesses` accepts an `UP` or `DOWN` prediction and a signed
   `priceSnapshotId`.
4. The guess becomes eligible after `GUESS_ELIGIBILITY_MS` milliseconds
   (`60000` by default).
5. `GET /state` automatically resolves eligible guesses. The API also exposes
   `POST /guesses/resolve`.

If the price is unchanged at resolution time, the guess remains unresolved and
the response returns `PRICE_UNCHANGED`. Correct guesses add `1` point and
incorrect guesses subtract `1` point.

## Price Snapshots

The client polls `GET /price` every ten seconds and keeps the last successful
response visible while a refresh is in flight. Each response includes a signed
`priceSnapshotId`; the server validates that token before creating a guess.

Default backend timing:

- `SNAPSHOT_VALIDITY_MS=10000`: signed snapshot tokens are valid for ten
  seconds.
- `PROVIDER_CACHE_TTL_MS=9000`: repeated backend price reads can reuse the
  CoinGecko value for nine seconds.
- `GUESS_ELIGIBILITY_MS=60000`: guesses can resolve after one minute.

The cache TTL is intentionally below the client polling interval and snapshot
validity window. Cached, stale, expired, or fallback prices can still be
displayed, but `canCreateGuess: false` disables betting until a valid snapshot
is available. If CoinGecko is unavailable and no cached value exists,
`GET /price` returns `price: null` and `canCreateGuess: false`.

## Requirements

- Node.js 24, matching the SAM runtime `nodejs24.x`
- pnpm 11.9.0, via the `packageManager` field
- Docker, for DynamoDB Local
- AWS SAM CLI, for the local Lambda/API Gateway runtime

Enable the pinned pnpm version with Corepack if needed:

```bash
corepack enable
corepack prepare pnpm@11.9.0 --activate
```

## Local Development

Install dependencies:

```bash
pnpm install
```

Start DynamoDB Local and create the player table once:

```bash
pnpm dynamodb:setup
```

If the table already exists, DynamoDB returns `ResourceInUseException`; that is
safe to ignore.

Start the full local app:

```bash
pnpm start
```

This starts:

- DynamoDB Local on `http://localhost:8000`
- SAM local API on `http://127.0.0.1:3000`
- Vite client on `http://localhost:5173`

Useful individual commands:

```bash
pnpm dynamodb:start
pnpm start:client
pnpm start:server
pnpm --dir client start:live
pnpm ports:clear
```

`client/src/api/http.ts` chooses the API base URL from Vite mode:

- default Vite modes use `VITE_API_BASE_LOCAL`, falling back to
  `http://127.0.0.1:3000`;
- `live` and `production` modes use `VITE_API_BASE_LIVE`.

Create `client/.env` when you need explicit local or live endpoints:

```text
VITE_API_BASE_LOCAL=http://127.0.0.1:3000
VITE_API_BASE_LIVE=https://your-api-id.execute-api.your-region.amazonaws.com
VITE_APP_ENV=development
```

`VITE_APP_ENV=production` hides development-only UI such as the
"Behind the scenes" panel. The Vite mode and product UI environment are
separate.

To reset local player state:

```bash
pnpm dynamodb:delete-table
pnpm dynamodb:create-table
```

## API

Routes:

- `GET /health`
- `GET /price`
- `GET /state`
- `POST /guesses`
- `POST /guesses/resolve`

Game routes require `x-user-id`. Local CORS allows `http://localhost:5173` and
`http://127.0.0.1:5173`.

The shared contract in `packages/api-contract/src/index.ts` defines response
and request types for the client and server. Public feedback codes include
`NONE`, `GUESS_CREATED`, `NOT_READY`, `PRICE_UNCHANGED`,
`RESOLUTION_PENDING`, and `RESOLVED`.

## Backend Configuration

Local SAM defaults are defined in `server/template.yaml`. Main environment
variables:

- `COINGECKO_PRICE_URL`
- `COINGECKO_REQUEST_TIMEOUT_MS`
- `SNAPSHOT_SIGNING_SECRET`
- `SNAPSHOT_VALIDITY_MS`
- `PROVIDER_CACHE_TTL_MS`
- `GUESS_ELIGIBILITY_MS`
- `CORS_ALLOWED_ORIGINS`
- `PLAYER_TABLE_NAME`
- `DYNAMODB_ENDPOINT`

`pnpm start:server` runs `sam build` and starts the local API with
`DynamoDbEndpoint=http://host.docker.internal:8000` so the Lambda container can
reach DynamoDB Local.

Without `PLAYER_TABLE_NAME`, the app composition root falls back to the
in-memory player store. With `PLAYER_TABLE_NAME`, it uses DynamoDB.

## Deployment

The production shape is a static frontend plus an AWS-backed API. The backend
SAM template creates:

- API Gateway HTTP API
- Lambda function running Node.js 24
- DynamoDB table for player score and active-guess state
- CloudWatch log group with seven-day retention

The DynamoDB table uses provisioned billing with
`ReadCapacityUnits=1` and `WriteCapacityUnits=1`, which is appropriate for this
low-traffic coding exercise but should be revisited for unpredictable traffic.

### First Backend Deploy

Install and configure AWS CLI v2 and AWS SAM CLI, then verify credentials:

```bash
aws sts get-caller-identity
```

Run checks before deploying:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Generate a signing secret:

```bash
openssl rand -base64 32
```

Do not commit this value. `SnapshotSigningSecret` is a `NoEcho`
CloudFormation parameter, which is acceptable for this exercise. For a
production system, store secrets in AWS Secrets Manager or SSM Parameter Store
and grant the Lambda least-privilege read access.

Build and run the guided deploy:

```bash
pnpm --dir server build
sam deploy --guided --template-file server/.aws-sam/build/template.yaml
```

Recommended guided values:

```text
Stack Name: epilot-btc-game
AWS Region: eu-central-1
Parameter PlayerTableName: epilot-btc-guess-players
Parameter FrontendOrigin: https://main.d1cgb3966fmmq6.amplifyapp.com
Parameter SnapshotSigningSecret: <paste generated secret>
Parameter DynamoDbEndpoint: <leave blank>
Confirm changes before deploy: y
Allow SAM CLI IAM role creation: Y
Disable rollback: N
ApiFunction has no authentication: y
Save arguments to configuration file: Y
SAM configuration file: server/samconfig.toml
SAM configuration environment: default
```

SAM may ask the unauthenticated API question once per route because the same
Lambda is attached to multiple public browser endpoints.

After the first deploy, SAM prints `GameApiUrl`. Use that value as
`VITE_API_BASE_LIVE`.

Subsequent backend deploys:

```bash
pnpm deploy:server
```

### Frontend Deploy

Build the frontend with the deployed API URL:

```bash
VITE_API_BASE_LIVE=https://your-api-id.execute-api.your-region.amazonaws.com pnpm --dir client build:live
```

Deploy `client/dist` to a static host. The included `amplify.yml` installs with
pnpm, runs `pnpm --dir client run build`, and publishes `client/dist`.

After the frontend URL is known, redeploy the backend with `FrontendOrigin`
set to that browser origin so CORS allows hosted calls. The template always
also allows local development and the dev Amplify origin.

## Quality Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
```

Package-specific checks:

```bash
pnpm --dir client test
pnpm --dir server test
pnpm --dir server typecheck
```

## More Documentation

- [Client README](./client/README.md)
- [Server README](./server/README.md)
