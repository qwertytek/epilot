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

- [ ] Define shared request/response TypeScript types for game API.
- [ ] Implement `GET /health`.
- [ ] Implement `GET /state`.
- [ ] Implement `POST /guesses`.
- [ ] Implement `POST /guesses/resolve`.
- [ ] Require `x-user-id` on every game API request.
- [ ] Return documented JSON error shape.
- [ ] Map errors to documented HTTP status codes.
- [ ] Return `NOT_READY` and `PRICE_UNCHANGED` as `200 OK` resolve responses.

## Backend domain logic

- [ ] Generate and verify signed snapshot tokens.
- [ ] Reject expired snapshot tokens with `410 PRICE_SNAPSHOT_EXPIRED`.
- [ ] Reject malformed or tampered snapshot tokens with `422 PRICE_SNAPSHOT_INVALID`.
- [ ] Fetch BTC/USD price from CoinGecko.
- [ ] Reuse shared in-process provider cache within the 10-second TTL.
- [ ] Preserve player state when CoinGecko is unavailable.
- [ ] Create player records lazily for new `x-user-id` values.
- [ ] Create guesses only when no active guess exists.
- [ ] Store `startPriceUsd` from the verified snapshot token.
- [ ] Resolve guesses only after `eligibleAt`.
- [ ] Keep guesses pending when the observed price equals `startPriceUsd`.
- [ ] Apply `+1` for correct direction and `-1` for incorrect direction.
- [ ] Prevent repeated or concurrent resolution from scoring the same guess twice.

## DynamoDB

- [ ] Add SAM/DynamoDB table resource for player state.
- [ ] Use `userId` as the table partition key.
- [ ] Store `score`, `activeGuess`, `createdAt`, and `updatedAt`.
- [ ] Omit `activeGuess` when no guess is pending.
- [ ] Use conditional update for guess creation.
- [ ] Use conditional update for guess resolution.
- [ ] Map conditional create failure to `409 ACTIVE_GUESS_EXISTS`.
- [ ] Map missing active guess on resolve to `409 NO_ACTIVE_GUESS`.

## Frontend integration

- [ ] Generate `crypto.randomUUID()` on first visit.
- [ ] Persist anonymous id in `localStorage`.
- [ ] Send `x-user-id` with all API requests.
- [ ] Fetch `/state` on page load.
- [ ] Render server score.
- [ ] Render server price snapshot and timestamp.
- [ ] Submit `direction` plus `priceSnapshotId`.
- [ ] Disable new guess buttons while a guess is active.
- [ ] Show pending guess and countdown/eligible time.
- [ ] Automatically attempt resolution after countdown.
- [ ] Retry resolution at a modest interval while price is unchanged.
- [ ] Provide manual `Check result` control.
- [ ] Recover from expired snapshot by refetching `/state`.
- [ ] Show recoverable API/provider errors without losing local user id.

## Tests

- [ ] `GET /state` without `x-user-id` returns `401 MISSING_USER_ID`.
- [ ] First `GET /state` for a new user returns score `0`, no active guess, and a price snapshot.
- [ ] Repeated state calls within cache TTL avoid repeated provider calls.
- [ ] Valid unexpired snapshot token can create a guess.
- [ ] Expired snapshot token is rejected.
- [ ] Tampered snapshot token is rejected.
- [ ] User cannot submit a raw price.
- [ ] User cannot create a second active guess.
- [ ] Concurrent create requests result in exactly one active guess.
- [ ] Guess cannot resolve before 60 seconds.
- [ ] Guess remains pending when observed price is unchanged.
- [ ] Correct guess increments score.
- [ ] Incorrect guess decrements score.
- [ ] Repeated resolve cannot score the same guess twice.
- [ ] CoinGecko failure preserves player state and returns `503 PRICE_PROVIDER_UNAVAILABLE`.

## Deployment and configuration

- [ ] Configure backend-only `SNAPSHOT_SIGNING_SECRET`.
- [ ] Configure CoinGecko endpoint.
- [ ] Configure snapshot validity window.
- [ ] Configure provider cache TTL.
- [ ] Configure frontend API base URL.
- [ ] Configure CORS for the frontend origin.
- [ ] Document local development setup.
- [ ] Document deployment steps.
