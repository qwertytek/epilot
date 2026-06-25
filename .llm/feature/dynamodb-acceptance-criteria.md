# DynamoDB Acceptance Criteria

## Infrastructure

- [x] A SAM template defines a DynamoDB player-state table for the game backend.
- [x] The table uses `userId` as the partition key.
- [x] The table has no sort key.
- [x] The backend receives the table name through runtime configuration.
- [x] No secondary indexes are added for MVP-only access patterns.
- [x] No DynamoDB table is added for price snapshots, resolved guess history, leaderboards, or analytics.

## Player item model

- [x] Each anonymous player is stored as one item keyed by `userId`.
- [x] New player items start with `score` set to `0`.
- [x] Player items store `createdAt` and `updatedAt` timestamps.
- [x] Player items store `activeGuess` only while a guess is pending.
- [x] `activeGuess` is omitted, not set to `null`, when no guess is pending.
- [x] Active guess data includes `id`, `direction`, `startPriceUsd`, `createdAt`, and `eligibleAt`.
- [x] Active guess `startPriceUsd` is persisted from the verified signed snapshot token.

## State loading

- [x] `GET /state` reads player state from DynamoDB.
- [x] `GET /state` lazily creates a player item for a new `x-user-id`.
- [x] Existing player score and active guess state are preserved on repeated `GET /state` calls.
- [x] A missing player item on a mutating request is handled defensively without losing the request outcome.
- [x] CoinGecko or price-provider failures never delete or overwrite the player item.

## Guess creation

- [x] `POST /guesses` writes the active guess to DynamoDB.
- [x] Guess creation uses an atomic DynamoDB conditional write.
- [x] Guess creation succeeds only when the item has no `activeGuess` attribute.
- [x] Guess creation updates `updatedAt`.
- [x] Concurrent guess creation requests for the same `userId` result in exactly one active guess.
- [x] Conditional write failure caused by an existing active guess maps to `409 ACTIVE_GUESS_EXISTS`.
- [x] Invalid, tampered, or expired snapshot tokens do not write an active guess.

## Guess resolution

- [x] `POST /guesses/resolve` reads the active guess from DynamoDB.
- [x] Early resolution attempts before `eligibleAt` leave the DynamoDB item unchanged.
- [x] Resolution attempts where the observed price equals `startPriceUsd` leave the active guess pending.
- [x] Successful resolution uses an atomic DynamoDB conditional write.
- [x] Successful resolution increments or decrements `score` by exactly `1`.
- [x] Successful resolution removes the `activeGuess` attribute.
- [x] Successful resolution updates `updatedAt`.
- [x] Repeated or concurrent resolve requests cannot score the same guess more than once.
- [x] Resolving without an active guess maps to `409 NO_ACTIVE_GUESS`.

## Local and deployed behavior

- [x] Local development can run against a documented DynamoDB target or documented local store fallback.
- [x] Deployed Lambda functions use DynamoDB rather than in-memory player state.
- [x] Snapshot validation still works across Lambda cold starts and multiple Lambda instances.
- [x] Server responses keep the existing API contract shapes after DynamoDB is introduced.
- [x] CORS and environment configuration remain compatible with the deployed frontend.

## Verification

- [x] Tests cover lazy player creation.
- [x] Tests cover score and active guess persistence across state reloads.
- [x] Tests cover conditional guess creation conflict mapping.
- [x] Tests cover concurrent create requests.
- [x] Tests cover successful conditional resolution and removal of `activeGuess`.
- [x] Tests cover repeated or concurrent resolve requests.
- [x] Tests cover provider failure without player-state loss.
- [x] SAM template validation passes.
- [x] Server contract tests pass.
- [x] Project typecheck passes.
- [x] Lint passes.
- [x] Prettier format check passes.

## Out of scope

- Durable price snapshot records.
- Resolved guess history.
- Leaderboards.
- Analytics.
- Cross-device accounts or authentication.
- DynamoDB transactions for MVP behavior.
