# DynamoDB Acceptance Criteria

## Infrastructure

- [ ] A SAM template defines a DynamoDB player-state table for the game backend.
- [ ] The table uses `userId` as the partition key.
- [ ] The table has no sort key.
- [ ] The backend receives the table name through runtime configuration.
- [ ] No secondary indexes are added for MVP-only access patterns.
- [ ] No DynamoDB table is added for price snapshots, resolved guess history, leaderboards, or analytics.

## Player item model

- [ ] Each anonymous player is stored as one item keyed by `userId`.
- [ ] New player items start with `score` set to `0`.
- [ ] Player items store `createdAt` and `updatedAt` timestamps.
- [ ] Player items store `activeGuess` only while a guess is pending.
- [ ] `activeGuess` is omitted, not set to `null`, when no guess is pending.
- [ ] Active guess data includes `id`, `direction`, `startPriceUsd`, `createdAt`, and `eligibleAt`.
- [ ] Active guess `startPriceUsd` is persisted from the verified signed snapshot token.

## State loading

- [ ] `GET /state` reads player state from DynamoDB.
- [ ] `GET /state` lazily creates a player item for a new `x-user-id`.
- [ ] Existing player score and active guess state are preserved on repeated `GET /state` calls.
- [ ] A missing player item on a mutating request is handled defensively without losing the request outcome.
- [ ] CoinGecko or price-provider failures never delete or overwrite the player item.

## Guess creation

- [ ] `POST /guesses` writes the active guess to DynamoDB.
- [ ] Guess creation uses an atomic DynamoDB conditional write.
- [ ] Guess creation succeeds only when the item has no `activeGuess` attribute.
- [ ] Guess creation updates `updatedAt`.
- [ ] Concurrent guess creation requests for the same `userId` result in exactly one active guess.
- [ ] Conditional write failure caused by an existing active guess maps to `409 ACTIVE_GUESS_EXISTS`.
- [ ] Invalid, tampered, or expired snapshot tokens do not write an active guess.

## Guess resolution

- [ ] `POST /guesses/resolve` reads the active guess from DynamoDB.
- [ ] Early resolution attempts before `eligibleAt` leave the DynamoDB item unchanged.
- [ ] Resolution attempts where the observed price equals `startPriceUsd` leave the active guess pending.
- [ ] Successful resolution uses an atomic DynamoDB conditional write.
- [ ] Successful resolution increments or decrements `score` by exactly `1`.
- [ ] Successful resolution removes the `activeGuess` attribute.
- [ ] Successful resolution updates `updatedAt`.
- [ ] Repeated or concurrent resolve requests cannot score the same guess more than once.
- [ ] Resolving without an active guess maps to `409 NO_ACTIVE_GUESS`.

## Local and deployed behavior

- [ ] Local development can run against a documented DynamoDB target or documented local store fallback.
- [ ] Deployed Lambda functions use DynamoDB rather than in-memory player state.
- [ ] Snapshot validation still works across Lambda cold starts and multiple Lambda instances.
- [ ] Server responses keep the existing API contract shapes after DynamoDB is introduced.
- [ ] CORS and environment configuration remain compatible with the deployed frontend.

## Verification

- [ ] Tests cover lazy player creation.
- [ ] Tests cover score and active guess persistence across state reloads.
- [ ] Tests cover conditional guess creation conflict mapping.
- [ ] Tests cover concurrent create requests.
- [ ] Tests cover successful conditional resolution and removal of `activeGuess`.
- [ ] Tests cover repeated or concurrent resolve requests.
- [ ] Tests cover provider failure without player-state loss.
- [ ] SAM template validation passes.
- [ ] Server contract tests pass.
- [ ] Project typecheck passes.
- [ ] Lint passes.
- [ ] Prettier format check passes.

## Out of scope

- Durable price snapshot records.
- Resolved guess history.
- Leaderboards.
- Analytics.
- Cross-device accounts or authentication.
- DynamoDB transactions for MVP behavior.
