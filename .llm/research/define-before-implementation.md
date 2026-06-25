# Define-now research

This note covers the decisions that are better made before backend implementation because they affect API shape, persistence, fairness, and client error handling.

## 1. Snapshot validation strategy

The game needs `POST /guesses` to prove that the user is betting against a server-issued visible price snapshot, without letting the client submit or alter the price.

### Option A: Signed snapshot token

`GET /state` returns an opaque signed token as `priceSnapshotId`. The token encodes the snapshot data needed to validate the bet, such as `priceUsd`, `observedAt`, and `expiresAt`, plus a server-side signature. `POST /guesses` verifies the signature and expiry, then stores the decoded `priceUsd` as `startPriceUsd`.

Pros:

- No DynamoDB write needed for every displayed price. Advantage size: high, because `GET /state` can happen often and should stay cheap.
- Works across Lambda cold starts and multiple Lambda instances. Advantage size: high, because this is required for a deployed serverless app.
- Protects the free price API better because cached snapshots can be reused without durable snapshot writes. Advantage size: medium, because the provider cache already helps, but avoiding snapshot writes keeps refreshes lightweight.
- Keeps the MVP simpler: only player state and active guesses need durable storage. Advantage size: high, because it reduces the amount of DynamoDB design needed before the main game logic exists.

Cons:

- Requires a signing secret in environment config.
- Token format and verification need careful implementation.
- Revoking a token before expiry is not practical, though the expiry window is short.
- The token may be larger than a simple id.

Mitigation plan:

- Store the signing secret in an environment variable for local/SAM use and AWS-managed configuration for deployment. Do not hard-code it or expose it to the client.
- Use a simple versioned token payload, for example `{ v, priceUsd, observedAt, expiresAt }`, signed with HMAC-SHA256 using Node's built-in `crypto` module.
- Use base64url encoding so the token is safe to pass as a JSON string.
- Validate signature, version, required fields, numeric price, ISO timestamps, and expiry before accepting a guess.
- Keep snapshot validity short, defaulting to 30 seconds, so the inability to revoke a token is not meaningful for this MVP.
- Treat malformed, tampered, or unsupported-version tokens as `PRICE_SNAPSHOT_INVALID`.
- Add tests for valid token, expired token, tampered token, malformed token, wrong secret, and unsupported version.

Best fit:

- MVP with low operational cost and short snapshot validity.

### Option B: DynamoDB snapshot records

`GET /state` stores each server-issued snapshot in DynamoDB and returns a snapshot id. `POST /guesses` looks up the id, validates expiry, and stores the snapshot price as `startPriceUsd`.

Pros:

- Very explicit and easy to reason about. Advantage size: medium, because it makes behavior concrete but adds more persistence work.
- Snapshot ids can be short and opaque. Advantage size: low, because token size is not a major problem for JSON requests.
- Debugging is easier because issued snapshots exist as records. Advantage size: medium, useful during development but less important for a short-lived game snapshot.
- Tokens do not need signing logic. Advantage size: medium, because it avoids crypto implementation mistakes but moves complexity into DynamoDB writes, reads, and TTL cleanup.

Cons:

- More DynamoDB writes, potentially one per state fetch/cache refresh.
- Needs TTL cleanup for old snapshots.
- More table design work before implementing the game.
- Adds persistence cost/complexity for data that only matters for around 30 seconds.

Mitigation plan:

- Store only one snapshot record per provider-cache window instead of one per user fetch. Reuse the same snapshot id while the 10-second provider cache is valid.
- Add DynamoDB TTL on `expiresAt` so old snapshot records are eventually removed automatically.
- Keep snapshot records minimal: snapshot id, price, observedAt, expiresAt.
- Use a dedicated snapshot partition/key pattern so lookup by id is direct and does not require querying by user.
- Make snapshot records user-independent unless there is a later product reason to bind them to a user.
- Add tests for snapshot lookup, expired snapshot rejection, TTL field creation, and missing snapshot handling.
- Accept the extra writes only if observability/debugging is considered more valuable than keeping the MVP smaller.

Best fit:

- Systems where auditability matters more than MVP simplicity.

### Recommendation (Snapshot validation strategy)

Use **signed snapshot tokens** for this exercise. They fit the short-lived snapshot model, avoid extra durable writes, work across Lambda instances, and keep DynamoDB focused on player state.

If using signed tokens, the spec should say `priceSnapshotId` is an opaque server-verifiable token. The client treats it as an id and never parses it.

## 2. DynamoDB concurrency rule

The spec says a player can have exactly one active guess. That must hold even if the user double-clicks, has two tabs open, or two requests arrive at nearly the same time.

### Required rule

Creating a guess must be an atomic conditional write:

- If the player has no active guess, write the active guess and keep the current score.
- If the player already has an active guess, reject with `ACTIVE_GUESS_EXISTS`.

Resolving a guess should also be conditional:

- Only resolve if the active guess id still matches the guess being resolved.
- Update score and clear the active guess in the same write.
- Repeated resolve requests after success must not score the same guess twice.

### Recommendation

Use a single DynamoDB player item per `x-user-id`, with score and active guess in the same item. This allows conditional updates on one item and avoids transaction complexity for the MVP.

## 3. HTTP status codes

Defining status codes now prevents inconsistent client behavior later.

Recommended map:

- `200 OK`: successful `GET /state`, successful `POST /guesses/resolve`, including not-ready or price-unchanged outcomes.
- `201 Created`: successful `POST /guesses`.
- `400 Bad Request`: invalid JSON, invalid direction, malformed request body.
- `401 Unauthorized`: missing or invalid `x-user-id`. This is not login auth, but the request lacks the required anonymous identity.
- `404 Not Found`: route not found.
- `409 Conflict`: active guess already exists, no active guess to resolve, or conditional write conflict.
- `410 Gone`: price snapshot expired.
- `422 Unprocessable Entity`: price snapshot token/id is invalid or not server-verifiable.
- `503 Service Unavailable`: CoinGecko unavailable and no usable cached price exists.
- `500 Internal Server Error`: unexpected backend failure.

Notes:

- `POST /guesses/resolve` should return `200 OK` for normal game states like `NOT_READY` or `PRICE_UNCHANGED`; those are not transport errors.
- Expired and invalid snapshots are separated because the client can recover from expiry by refreshing, while invalid snapshots may indicate stale code, tampering, or corrupted local state.

## 4. Acceptance-test checklist

These tests should guide backend implementation before UI polish.

### State and identity

- `GET /state` without `x-user-id` returns `401` and `MISSING_USER_ID`.
- First `GET /state` for a new valid user returns score `0`, no active guess, and a server-issued price snapshot.
- Repeated `GET /state` calls within the provider cache TTL do not require repeated CoinGecko calls.

### Snapshot fairness

- `POST /guesses` accepts a valid unexpired server-issued snapshot token/id.
- `POST /guesses` rejects a request that includes a raw price instead of a valid snapshot reference.
- `POST /guesses` rejects an expired snapshot with `410` and `PRICE_SNAPSHOT_EXPIRED`.
- `POST /guesses` rejects a tampered or invalid snapshot with `422` and `PRICE_SNAPSHOT_INVALID`.

### Active guess rules

- A user with an active guess cannot create another one.
- Two concurrent create-guess requests for the same user result in exactly one active guess.
- A user can close and reopen the browser and still see the active guess from `GET /state`.

### Resolution rules

- A guess cannot resolve before 60 seconds.
- A guess remains pending when the observed price equals `startPriceUsd`.
- A correct `UP` or `DOWN` guess increments score by `1`.
- An incorrect guess decrements score by `1`.
- Repeated resolve requests cannot score the same guess twice.
- If CoinGecko fails and no valid cached price exists, state is preserved and the API returns `503` with `PRICE_PROVIDER_UNAVAILABLE`.

## Decision summary

Recommended defaults:

- Snapshot validation: signed snapshot tokens.
- Player persistence: one DynamoDB item per anonymous user.
- Guess creation and resolution: conditional updates.
- Expired snapshots: `410 Gone`.
- Invalid snapshots: `422 Unprocessable Entity`.
- Provider unavailable: `503 Service Unavailable`.
