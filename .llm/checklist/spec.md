# BTC price guessing game checklist

## Spec decisions

- [x] Anonymous user id stored only in `localStorage` as `btc-game.user-id`.
- [x] Backend is source of truth for score and active guess.
- [x] User bets against a visible server-issued BTC/USD price snapshot.
- [x] `priceSnapshotId` is a short-lived signed snapshot token.
- [x] Snapshot validity defaults to 30 seconds.
- [x] Shared CoinGecko provider cache defaults to 10 seconds.
- [x] DynamoDB uses one player table with `userId` partition key and no sort key.
- [x] Player item stores `score` and `activeGuess` together.
- [x] No resolved guess history, leaderboard, or analytics in the MVP.

## API contract

- [x] Define shared request/response TypeScript types for game API.
- [x] Implement `GET /health`.
- [x] Implement `GET /state`.
- [x] Implement `POST /guesses`.
- [x] Implement `POST /guesses/resolve`.
- [x] Require `x-user-id` on every game API request.
- [x] Return documented JSON error shape.
- [x] Map errors to documented HTTP status codes.
- [x] Return `NOT_READY` and `PRICE_UNCHANGED` as `200 OK` resolve responses.

## Backend domain logic

- [x] Generate and verify signed snapshot tokens.
- [x] Reject expired snapshot tokens with `410 PRICE_SNAPSHOT_EXPIRED`.
- [x] Reject malformed or tampered snapshot tokens with `422 PRICE_SNAPSHOT_INVALID`.
- [x] Fetch BTC/USD price from CoinGecko.
- [x] Reuse shared in-process provider cache within the 10-second TTL.
- [x] Preserve player state when CoinGecko is unavailable.
- [x] Create player records lazily for new `x-user-id` values.
- [x] Create guesses only when no active guess exists.
- [x] Store `startPriceUsd` from the verified snapshot token.
- [x] Resolve guesses only after `eligibleAt`.
- [x] Keep guesses pending when the observed price equals `startPriceUsd`.
- [x] Apply `+1` for correct direction and `-1` for incorrect direction.
- [x] Prevent repeated or concurrent resolution from scoring the same guess twice.

## DynamoDB

- [x] Add SAM/DynamoDB table resource for player state.
- [x] Use `userId` as the table partition key.
- [x] Store `score`, `activeGuess`, `createdAt`, and `updatedAt`.
- [x] Omit `activeGuess` when no guess is pending.
- [x] Use conditional update for guess creation.
- [x] Use conditional update for guess resolution.
- [x] Map conditional create failure to `409 ACTIVE_GUESS_EXISTS`.
- [x] Map missing active guess on resolve to `409 NO_ACTIVE_GUESS`.

## Frontend integration

- [x] Generate `crypto.randomUUID()` on first visit.
- [x] Persist anonymous id in `localStorage`.
- [x] Send `x-user-id` with all API requests.
- [x] Fetch `/state` on page load.
- [x] Render server score.
- [x] Render server price snapshot and timestamp.
- [x] Submit `direction` plus `priceSnapshotId`.
- [x] Disable new guess buttons while a guess is active.
- [x] Show pending guess and countdown/eligible time.
- [x] Automatically attempt resolution after countdown.
- [x] Retry resolution at a modest interval while price is unchanged.
- [x] Recover from expired snapshot by refetching `/state`.
- [x] Show recoverable API/provider errors without losing local user id.

## Tests

- [x] `GET /state` without `x-user-id` returns `401 MISSING_USER_ID`.
- [x] First `GET /state` for a new user returns score `0`, no active guess, and a price snapshot.
- [x] Repeated state calls within cache TTL avoid repeated provider calls.
- [x] Valid unexpired snapshot token can create a guess.
- [x] Expired snapshot token is rejected.
- [x] Tampered snapshot token is rejected.
- [x] User cannot submit a raw price.
- [x] User cannot create a second active guess.
- [x] Concurrent create requests result in exactly one active guess.
- [x] Guess cannot resolve before 60 seconds.
- [x] Guess remains pending when observed price is unchanged.
- [x] Correct guess increments score.
- [x] Incorrect guess decrements score.
- [x] Repeated resolve cannot score the same guess twice.
- [x] CoinGecko failure preserves player state and returns `503 PRICE_PROVIDER_UNAVAILABLE`.

## Deployment and configuration

- [x] Configure backend-only `SNAPSHOT_SIGNING_SECRET`.
- [x] Configure CoinGecko endpoint.
- [x] Configure snapshot validity window.
- [x] Configure provider cache TTL.
- [x] Configure frontend API base URL.
- [x] Configure CORS for the frontend origin.
- [x] Document local development setup.
- [x] Document deployment steps.
