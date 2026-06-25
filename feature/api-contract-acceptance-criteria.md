# API Contract Acceptance Criteria

## Shared contract

- A shared TypeScript package exposes the game API request, response, and error types.
- Client and server both compile against the shared contract.
- Contract types cover:
  - health response;
  - price snapshot;
  - active guess;
  - game state response;
  - create guess request and response;
  - resolve guess response;
  - documented API error response.

## API endpoints

- `GET /health` returns `200` with `{ "status": "ok" }`.
- `GET /state` requires `x-user-id`.
- `GET /state` returns the server-owned score, optional active guess, and a BTC/USD price snapshot.
- `POST /guesses` requires `x-user-id`.
- `POST /guesses` accepts only `direction` and `priceSnapshotId`.
- `POST /guesses` creates a guess only when the user has no active guess.
- `POST /guesses/resolve` requires `x-user-id`.
- `POST /guesses/resolve` resolves only the active guess for that user.

## Snapshot and scoring behavior

- Price snapshot tokens are opaque to the client.
- Expired snapshot tokens return `410 PRICE_SNAPSHOT_EXPIRED`.
- Malformed or tampered snapshot tokens return `422 PRICE_SNAPSHOT_INVALID`.
- Guess start price comes from the verified snapshot token, not client-submitted raw price.
- A guess cannot resolve before its `eligibleAt` timestamp.
- Early resolve attempts return `200 NOT_READY`.
- Eligible guesses remain pending when the observed price is unchanged.
- Unchanged-price resolve attempts return `200 PRICE_UNCHANGED`.
- Correct guesses add `1` point.
- Incorrect guesses subtract `1` point.
- A resolved guess cannot be scored more than once.

## Error behavior

- Missing `x-user-id` returns `401 MISSING_USER_ID`.
- Creating a second active guess returns `409 ACTIVE_GUESS_EXISTS`.
- Resolving without an active guess returns `409 NO_ACTIVE_GUESS`.
- Invalid request payloads return `422 INVALID_REQUEST`.
- Provider failures return `503 PRICE_PROVIDER_UNAVAILABLE`.
- Errors use the documented JSON shape with `code`, `message`, and optional `details`.

## Client API boundary

- The client creates an anonymous user id with `crypto.randomUUID()` on first use.
- The anonymous user id is stored in `localStorage` as `btc-game.user-id`.
- All game API requests send `x-user-id`.
- The client API submits `direction` and `priceSnapshotId`, never a raw price.
- The frontend game screen may remain static for this feature; full UI integration is a separate feature.

## Verification

- Server contract tests pass.
- Project typecheck passes.
- Lint passes.
- Prettier format check passes.

## Out of scope

- DynamoDB persistence.
- Leaderboards, analytics, or resolved guess history.
- Full React game-state integration.
- Production deployment hardening.
