# API Contract Acceptance Criteria

## Shared contract

- [x] A shared TypeScript package exposes the game API request, response, and error types.
- [x] Client and server both compile against the shared contract.
- [x] Contract types cover:
  - [x] health response;
  - [x] price snapshot;
  - [x] active guess;
  - [x] game state response;
  - [x] create guess request and response;
  - [x] resolve guess response;
  - [x] documented API error response.

## API endpoints

- [x] `GET /health` returns `200` with `{ "status": "ok" }`.
- [x] `GET /state` requires `x-user-id`.
- [x] `GET /state` returns the server-owned score, optional active guess, and a BTC/USD price snapshot.
- [x] `POST /guesses` requires `x-user-id`.
- [ ] `POST /guesses` accepts only `direction` and `priceSnapshotId`.
- [x] `POST /guesses` creates a guess only when the user has no active guess.
- [x] `POST /guesses/resolve` requires `x-user-id`.
- [x] `POST /guesses/resolve` resolves only the active guess for that user.

## Snapshot and scoring behavior

- [x] Price snapshot tokens are opaque to the client.
- [x] Expired snapshot tokens return `410 PRICE_SNAPSHOT_EXPIRED`.
- [x] Malformed or tampered snapshot tokens return `422 PRICE_SNAPSHOT_INVALID`.
- [x] Guess start price comes from the verified snapshot token, not client-submitted raw price.
- [x] A guess cannot resolve before its `eligibleAt` timestamp.
- [x] Early resolve attempts return `200 NOT_READY`.
- [x] Eligible guesses remain pending when the observed price is unchanged.
- [x] Unchanged-price resolve attempts return `200 PRICE_UNCHANGED`.
- [x] Correct guesses add `1` point.
- [x] Incorrect guesses subtract `1` point.
- [x] A resolved guess cannot be scored more than once.

## Error behavior

- [x] Missing `x-user-id` returns `401 MISSING_USER_ID`.
- [x] Creating a second active guess returns `409 ACTIVE_GUESS_EXISTS`.
- [x] Resolving without an active guess returns `409 NO_ACTIVE_GUESS`.
- [x] Invalid request payloads return `422 INVALID_REQUEST`.
- [x] Provider failures return `503 PRICE_PROVIDER_UNAVAILABLE`.
- [x] Errors use the documented JSON shape with `code`, `message`, and optional `details`.

## Client API boundary

- [x] The client creates an anonymous user id with `crypto.randomUUID()` on first use.
- [x] The anonymous user id is stored in `localStorage` as `btc-game.user-id`.
- [x] All game API requests send `x-user-id`.
- [x] The client API submits `direction` and `priceSnapshotId`, never a raw price.
- [x] The frontend game screen may remain static for this feature; full UI integration is a separate feature.

## Verification

- [x] Server contract tests pass.
- [x] Project typecheck passes.
- [x] Lint passes.
- [x] Prettier format check passes.

## Out of scope

- DynamoDB persistence.
- Leaderboards, analytics, or resolved guess history.
- Full React game-state integration.
- Production deployment hardening.
