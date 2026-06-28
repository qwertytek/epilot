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

## Price Fetching Strategy

The client fetches the latest BTC/USD snapshot from `GET /price` whether or not
the player has an active guess. Each signed snapshot includes an `expiresAt`
value; TanStack Query keeps the snapshot fresh until that timestamp, then the
game view marks it stale.

When a displayed price expires, the client automatically calls `GET /price` for
a replacement snapshot, including while a pending guess is waiting to become
eligible for resolution. Refreshes during an active guess do not spend the
manual-session allowance, and the manual refresh button is hidden until the
guess has ended. Outside an active guess, automatic expiry refreshes are allowed
for one minute at a time. Once that window expires, the user must refresh the
price manually; clicking the refresh button resets the one-minute allowance.

The backend still applies `PROVIDER_CACHE_TTL_MS` around the upstream CoinGecko
provider. That means repeated `GET /price` calls can return a signed snapshot
from the backend cache while it is still valid for betting, limiting third-party
API traffic independently from the client-side expiry refresh cap. If CoinGecko
is unavailable after the cached snapshot expires, the API can return that stale
snapshot as read-only display data while guesses remain disabled. By default,
snapshots expire after thirty seconds while the provider cache is kept for
fifteen seconds, so normal refreshes have room to reuse cached provider data
without returning an expired bettable price.

## Requirements

- Node.js v24.18.0 and pnpm 11
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

The client reads both API endpoints from `client/.env`. `pnpm start` uses
`VITE_API_BASE_LOCAL`, while `pnpm --dir client start --mode live` uses
`VITE_API_BASE_LIVE`.

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

To use the deployed frontend against a local API, start SAM with the deployed
frontend origin allowed by CORS:

```bash
pnpm --dir server build
sam local start-api --parameter-overrides DynamoDbEndpoint=http://host.docker.internal:8000 SnapshotSigningSecret=local-dev-snapshot-signing-secret FrontendOrigin=https://your-frontend.example.com
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
- `PRICE_PROVIDER_FAILURE_COOLDOWN_MS`
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

### First-Time AWS Setup

To deploy the backend to AWS from a new machine or AWS account, install and
configure:

- Node.js and pnpm, matching the versions in the Requirements section.
- AWS CLI v2.
- AWS SAM CLI.
- An AWS account with permission to create CloudFormation stacks, IAM roles,
  Lambda functions, API Gateway HTTP APIs, DynamoDB tables, S3 deployment
  buckets, and CloudWatch log groups.

Configure AWS credentials before running SAM:

```bash
aws configure
aws sts get-caller-identity
```

`aws sts get-caller-identity` should print the AWS account and IAM identity that
will own the deployment. If it fails, fix AWS credentials before deploying.

Install project dependencies and run the checks:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm --dir client test
pnpm --dir server test
```

Generate a signing secret for the first backend deploy:

```bash
openssl rand -base64 32
```

Do not commit this value. SAM asks for it as `SnapshotSigningSecret`; the
CloudFormation parameter is marked `NoEcho`, so normal stack views do not show
it in plain text.

Run the guided backend deploy from the repository root:

```bash
pnpm --dir server build
sam deploy --guided --template-file server/.aws-sam/build/template.yaml
```

Recommended guided deploy answers:

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

SAM may ask the unauthenticated API question once per route. That is expected
because the same Lambda is attached to multiple public browser endpoints.

After the first successful deploy, SAM prints a `GameApiUrl` output. Use that
URL as the frontend API base URL.

Subsequent backend deploys can run from the repository root:

```bash
pnpm deploy:server
```

This script builds the server and deploys using `server/samconfig.toml`.

### Backend

The backend SAM stack creates:

- an API Gateway HTTP API for the game endpoints;
- a Lambda function running the TypeScript backend build;
- a DynamoDB table for persisted player score and active-guess state.

The DynamoDB table name is controlled by the `PlayerTableName` SAM parameter.
The Lambda receives that value through `PLAYER_TABLE_NAME`, so production state
is stored in DynamoDB rather than the in-memory fallback.

The table uses DynamoDB provisioned billing with `ReadCapacityUnits=1` and
`WriteCapacityUnits=1`. This is intentional for a low-traffic pet-project
deployment: provisioned capacity keeps the table inside the DynamoDB free-tier
capacity allowance as long as usage stays within the account's free-tier limits.
On-demand billing is easier for unpredictable production traffic, but it is
metered per request and can produce charges if the app is hit repeatedly or a
test loop makes many requests. This template optimizes for predictable free-tier
usage rather than burst capacity.

The deployment template also exposes these production-facing parameters:

- `FrontendOrigin`: the deployed frontend origin, for example
  `https://btc-game.example.com`.
- `SnapshotSigningSecret`: a strong random secret used to sign price snapshot
  tokens. The parameter is marked with `NoEcho: true` so CloudFormation does not
  display it in plain text in normal stack views.
- `PlayerTableName`: the DynamoDB table name for player state.

`FrontendOrigin` is used with `http://localhost:5173` for both
`GameApi.CorsConfiguration.AllowOrigins` and the Lambda
`CORS_ALLOWED_ORIGINS` environment variable, so the deployed API can be called
from the hosted frontend and the local dev frontend. `SnapshotSigningSecret` is
used for the Lambda `SNAPSHOT_SIGNING_SECRET` environment variable.

For production, also review these Lambda environment values in
`server/template.yaml`:

- `COINGECKO_PRICE_URL`: the BTC/USD price endpoint. The default uses
  CoinGecko's simple price API.
- `COINGECKO_REQUEST_TIMEOUT_MS`: request timeout for the price provider.
- `PROVIDER_CACHE_TTL_MS`: backend price cache TTL. This limits third-party API
  calls while still serving the latest price available to the backend.
- `PRICE_PROVIDER_FAILURE_COOLDOWN_MS`: how long the backend waits before
  retrying the upstream provider after a price request failure.
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
to the real frontend origin, such as
`https://main.d1cgb3966fmmq6.amplifyapp.com`, so browser CORS checks allow API
calls from the hosted site. SAM prints the API Gateway URL through the
`GameApiUrl` stack output. Use that URL as the frontend API base URL.

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

Build the frontend with the deployed API URL from an environment variable:

```bash
VITE_API_BASE_LIVE=https://your-api-id.execute-api.your-region.amazonaws.com pnpm --dir client build
```

Deploy the generated `client/dist` directory to the static host of your choice.
In hosted build environments such as AWS Amplify, configure
`VITE_API_BASE_LIVE` as a build environment variable. The production build fails
if this variable is missing or still uses the placeholder API URL.

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
