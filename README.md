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

During `sam deploy --guided`, choose an AWS region and stack name. This assumes
`aws configure` has already been run for the AWS account and region you want to
use. The stack creates:

- an API Gateway HTTP API for the game endpoints;
- a Lambda function running the TypeScript backend build;
- a DynamoDB table for persisted player score and active-guess state.

The DynamoDB table name is controlled by the `PlayerTableName` SAM parameter.
The Lambda receives that value through `PLAYER_TABLE_NAME`, so production state
is stored in DynamoDB rather than the in-memory fallback.

The deployment template also exposes these production-facing parameters:

- `FrontendOrigin`: the deployed frontend origin, for example
  `https://btc-game.example.com`.
- `SnapshotSigningSecret`: a strong random secret used to sign price snapshot
  tokens. The parameter is marked with `NoEcho: true` so CloudFormation does not
  display it in plain text in normal stack views.
- `PlayerTableName`: the DynamoDB table name for player state.

`FrontendOrigin` is used for both `GameApi.CorsConfiguration.AllowOrigins` and
the Lambda `CORS_ALLOWED_ORIGINS` environment variable. `SnapshotSigningSecret`
is used for the Lambda `SNAPSHOT_SIGNING_SECRET` environment variable.

For production, also review these Lambda environment values in
`server/template.yaml`:

- `COINGECKO_PRICE_URL`: the BTC/USD price endpoint. The default uses
  CoinGecko's simple price API.
- `COINGECKO_REQUEST_TIMEOUT_MS`: request timeout for the price provider.
- `PROVIDER_CACHE_TTL_MS`: backend price cache TTL. This limits third-party API
  calls while still serving the latest price available to the backend.
- `SNAPSHOT_VALIDITY_MS`: how long a displayed price snapshot can be used to
  create a guess.
- `GUESS_ELIGIBILITY_MS`: the minimum guess duration. The exercise value is
  `60000`.

For a temporary deployment, the first backend deploy can use the local default
frontend origin:

```text
FrontendOrigin=http://localhost:5173
```

After the frontend is deployed, redeploy the backend with `FrontendOrigin` set
to the real frontend URL so browser CORS checks allow API calls from the hosted
site. SAM prints the API Gateway URL through the `GameApiUrl` stack output. Use
that URL as the frontend API base URL.

#### Production note: secret management

For a production deployment, sensitive values such as `SNAPSHOT_SIGNING_SECRET`
should not be passed directly as plain CloudFormation parameters or stored
directly in Lambda environment variables.

A more production-suitable approach would be to store secrets in **AWS Secrets
Manager** and allow the Lambda function to retrieve them at runtime using an IAM
role with least-privilege access. Secrets Manager is designed for application
secrets such as API keys, database credentials, signing secrets, and third-party
tokens. It supports encryption using AWS KMS, IAM-based access control, secret
versioning, and automatic rotation where applicable.

For simpler configuration values, **AWS Systems Manager Parameter Store** can
also be used. Non-sensitive values can be stored as regular parameters, while
sensitive values can be stored as `SecureString` parameters encrypted with AWS
KMS.

In this project, using a `NoEcho` CloudFormation parameter is acceptable for a
lightweight coding-challenge deployment because it avoids hardcoding the secret
in the template or source code. However, for production, Secrets Manager or SSM
Parameter Store would provide better separation between infrastructure
configuration and secret lifecycle management.

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
