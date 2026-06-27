# AWS Deployment Checklist

This checklist tracks what is still needed to deploy the application to AWS.
The backend is the focus. The frontend should stay as simple as possible: build
the Vite SPA and host the static files, preferably with AWS Amplify Hosting for
the first deployment.

## Deployment Direction

- [ ] Deploy the backend with AWS SAM.
- [x] Use Lambda, API Gateway HTTP API, and DynamoDB from `server/template.yaml`.
- [x] Use Node.js 24 for the Lambda runtime.
- [x] Host the frontend as a static SPA.
- [x] Prefer AWS Amplify Hosting for the frontend unless there is a clear reason
      to manage S3, CloudFront, cache behavior, and SPA fallbacks directly.
- [x] Keep backend configuration and deployment work higher priority than
      frontend hosting optimization.

## Backend Prerequisites

- [ ] Choose the AWS account and region.
- [ ] Configure local AWS credentials for the target account.
- [ ] Decide the production stack name.
- [ ] Decide the production DynamoDB table name.
- [ ] Generate a strong `SnapshotSigningSecret`.
- [ ] Decide the production frontend origin, even if it starts as a temporary
      Amplify URL.
- [x] Confirm the CoinGecko endpoint and timeout are acceptable for production.
- [x] Decide whether the exercise-level timings should stay unchanged:
      `GUESS_ELIGIBILITY_MS`, `SNAPSHOT_VALIDITY_MS`, and
      `PROVIDER_CACHE_TTL_MS`.

## Backend Template

- [x] Review `server/template.yaml` parameters:
      `PlayerTableName`, `FrontendOrigin`, `SnapshotSigningSecret`, and
      `DynamoDbEndpoint`.
- [x] Keep `DynamoDbEndpoint` empty in production.
- [x] Confirm API Gateway CORS allows only the deployed frontend origin.
- [x] Confirm Lambda `CORS_ALLOWED_ORIGINS` matches the same frontend origin.
- [x] Confirm DynamoDB provisioned capacity is intentional for low traffic.
- [x] Add or document a reason before changing DynamoDB to on-demand billing.
- [x] Decide whether `SnapshotSigningSecret` as a `NoEcho` CloudFormation
      parameter is acceptable for this deployment.
- [ ] If treating this as production beyond the challenge, move the signing
      secret to Secrets Manager or SSM Parameter Store.

## Backend Deployment Automation

- [ ] Add `samconfig.toml` after the first guided deploy so deploys are
      repeatable.
- [x] Document the final backend deploy command.
- [ ] Avoid relying on `sam deploy --guided` as the long-term deployment path.
- [ ] Add a backend deployment workflow only after the manual deploy path works.
- [x] If adding CI/CD, run these checks before deploying:
      `pnpm lint`, `pnpm typecheck`, `pnpm --dir server test`, and
      `pnpm --dir client test`.
- [ ] If adding CI/CD, use GitHub Actions OIDC or another short-lived credential
      flow instead of storing long-lived AWS keys.

## Backend Deployment Steps

- [ ] Install dependencies with `pnpm install`.
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm --dir server test`.
- [ ] Run `pnpm --dir client test`.
- [ ] Build the backend with `pnpm --dir server build`.
- [ ] Deploy the built SAM app.
- [ ] Capture the `GameApiUrl` stack output.
- [ ] Call `GET /health` on the deployed API.
- [ ] Verify Lambda logs show no startup/configuration errors.
- [ ] Verify the DynamoDB table exists and receives player-state records.

## Frontend SPA Deployment

- [ ] Create an Amplify Hosting app for the `client` package.
- [ ] Configure the frontend build to run from the workspace with pnpm.
- [ ] Set `VITE_API_BASE_URL` to the deployed `GameApiUrl`.
- [ ] Build the frontend with `pnpm --dir client build`.
- [ ] Deploy the generated SPA.
- [ ] Capture the deployed frontend origin.
- [ ] Redeploy the backend with `FrontendOrigin` set to the real frontend origin.
- [ ] Verify the browser can call the deployed API without CORS errors.

## Domain And HTTPS

- [ ] Decide whether the first deployment needs a custom domain.
- [ ] If using a custom frontend domain, create or update Route 53 DNS.
- [ ] If using a custom frontend domain, issue an ACM certificate.
- [ ] If using Amplify Hosting, attach the custom domain there.
- [ ] Decide whether the API needs a custom domain or can keep the API Gateway
      execute-api URL.

## Observability

- [ ] Confirm the Lambda log group retention period is acceptable.
- [ ] Add a CloudWatch alarm for Lambda errors.
- [ ] Add a CloudWatch alarm for Lambda throttles.
- [ ] Add a CloudWatch alarm for API Gateway 5xx responses.
- [ ] Add a CloudWatch alarm for DynamoDB throttling.
- [ ] Add a basic health check against `GET /health`.
- [ ] Document where to inspect logs when deployment or runtime behavior fails.

## Post-Deploy Validation

- [ ] Open the deployed frontend.
- [ ] Confirm `GET /price` succeeds through the browser.
- [ ] Confirm `GET /state` succeeds with the anonymous `x-user-id` header.
- [ ] Submit a guess.
- [ ] Wait until the guess is eligible for resolution.
- [ ] Resolve the guess.
- [ ] Confirm score and active-guess state persist after a page reload.
- [ ] Confirm direct API calls from an unapproved origin are blocked by CORS.
- [ ] Confirm no local defaults are accidentally used in production.

## Later Hardening

- [ ] Move sensitive configuration to Secrets Manager or SSM Parameter Store.
- [ ] Add a staging stack before automating production deploys.
- [ ] Add deployment rollback notes.
- [ ] Add budget alarms for the AWS account.
- [ ] Add API rate limiting or usage protection if the public endpoint becomes
      easy to abuse.
- [ ] Revisit DynamoDB billing mode if traffic is no longer predictably low.
