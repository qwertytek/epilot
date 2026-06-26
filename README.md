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

## Production Deployment

The application is designed to deploy as a static frontend plus an AWS-backed
API. The backend uses AWS Lambda, API Gateway HTTP API, and DynamoDB through the
SAM template in `server/template.yaml`. The frontend can be hosted by any static
site host, such as AWS Amplify Hosting, S3 + CloudFront, Vercel, or Netlify.

Before deploying, run the quality checks:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm --dir client test
pnpm --dir server test
```

### Backend

Build and deploy the SAM application from the `server` package:

```bash
pnpm --dir server build
sam deploy --guided --template-file server/.aws-sam/build/template.yaml
```

During `sam deploy --guided`, choose an AWS region and stack name. The stack
creates:

- an API Gateway HTTP API for the game endpoints;
- a Lambda function running the TypeScript backend build;
- a DynamoDB table for persisted player score and active-guess state.

The DynamoDB table name is controlled by the `PlayerTableName` SAM parameter.
The Lambda receives that value through `PLAYER_TABLE_NAME`, so production state
is stored in DynamoDB rather than the in-memory fallback.

For production, do not keep the local defaults unchanged. Configure these values
for the deployed Lambda:

- `SNAPSHOT_SIGNING_SECRET`: a strong random secret used to sign price snapshot
  tokens. Treat it as a production secret and rotate it if it is exposed.
- `CORS_ALLOWED_ORIGINS`: the deployed frontend origin, for example
  `https://btc-game.example.com`.
- `COINGECKO_PRICE_URL`: the BTC/USD price endpoint. The default uses
  CoinGecko's simple price API.
- `COINGECKO_REQUEST_TIMEOUT_MS`: request timeout for the price provider.
- `PROVIDER_CACHE_TTL_MS`: backend price cache TTL. This limits third-party API
  calls while still serving the latest price available to the backend.
- `SNAPSHOT_VALIDITY_MS`: how long a displayed price snapshot can be used to
  create a guess.
- `GUESS_ELIGIBILITY_MS`: the minimum guess duration. The exercise value is
  `60000`.

Also update the `GameApi.CorsConfiguration.AllowOrigins` values in
`server/template.yaml` before a production deploy. The checked-in defaults are
for local development only:

```yaml
AllowOrigins:
  - https://your-frontend-domain.example
```

After deployment, SAM prints the API Gateway URL. Use that URL as the frontend
API base URL.

### Frontend

Build the frontend with the deployed API URL:

```bash
VITE_API_BASE_URL=https://your-api-id.execute-api.your-region.amazonaws.com pnpm --dir client build
```

Deploy the generated `client/dist` directory to the static host of your choice.
The same `VITE_API_BASE_URL` value must be configured in that host's build
environment so the browser calls the deployed backend instead of the local API.

After the frontend is live, verify the deployed app by:

- opening the frontend URL in a fresh browser session;
- confirming the score starts at `0`;
- confirming the BTC/USD price loads;
- submitting one `up` or `down` guess;
- confirming the controls are disabled while the guess is pending;
- waiting at least 60 seconds and confirming the score changes once the backend
  resolves the guess;
- closing and reopening the browser to confirm the same anonymous browser ID
  still sees its persisted score.

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
