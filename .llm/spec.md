# BTC Price Guessing Game — implementation specification

## 1. Purpose and scope

Build a small, deployed web application where an anonymous player predicts whether the BTC/USD market price will be higher or lower after at least one minute.

This is deliberately an MVP. Its purpose is to demonstrate product judgment, a polished React/TypeScript frontend, API-first backend design, serverless AWS familiarity, testable domain logic, and clear operational trade-offs. It is not intended to be a trading product, a leaderboard, or a complete identity system.

## 2. Success criteria

The deployed application must allow a player to:

- See the latest server-observed BTC/USD price snapshot and their current score.
- Submit exactly one active `UP` or `DOWN` guess.
- Be unable to submit a second guess while one is active.
- Have the guess resolved only after at least 60 seconds and only once the server observes a different BTC price.
- Receive `+1` for a correct direction and `-1` for an incorrect direction.
- Close and reopen the browser while retaining their score and active guess.
- Recover clearly from price-provider or API failures without losing persisted state.

## 3. Explicit non-goals

- Accounts, passwords, OAuth, Cognito, or cross-device identity.
- Real-money trading, financial advice, leaderboards, social features, notifications, or historical charts.
- Scheduled background resolution. A pending guess is checked when the client requests resolution; on a later browser session the player can continue the same guess.
- Microfrontends, GraphQL, a global state library, or complex CI/CD pipelines.
- Production-grade fraud prevention. A player can clear browser storage and receive a new anonymous identity; this is an accepted no-auth exercise trade-off.

## 4. Product behaviour

### Player identity and persistence

On first visit, the frontend generates a UUID using `crypto.randomUUID()` and stores it in `localStorage` under `btc-game.user-id`.

Every API request must include this value in the `x-user-id` header.

The backend creates the player record lazily on the first request associated with a new `x-user-id`. New players start with a score of `0`.

The backend database is the source of truth for:

- the player score
- the active guess
- any game state associated with the player

`localStorage` is used only to persist the anonymous player identifier. It must not be treated as authoritative for score, active guess, or game progress.

### Price and fairness

- The frontend never submits a price or determines a result.
- `GET /state` returns a server-issued BTC/USD price snapshot for display. The snapshot conceptually includes a `priceSnapshotId`, `priceUsd`, `observedAt`, and `expiresAt`.
- `POST /guesses` submits only the player’s `direction` and the `priceSnapshotId` they are betting against. It must never submit a raw price.
- When a guess is accepted, the backend stores the referenced snapshot price as `startPriceUsd`.
- The backend must validate `priceSnapshotId` before accepting a guess. Snapshot identifiers are server-owned and opaque to the client.
- `priceSnapshotId` is implemented as a short-lived signed snapshot token. The token contains the server-observed snapshot data needed to validate the bet, such as `priceUsd`, `observedAt`, and `expiresAt`, and is signed with a backend-only secret.
- Signed snapshot tokens are chosen to lower operational costs: the backend does not need to write a durable snapshot record every time it returns a displayed price.
- A displayed price snapshot is valid for submitting a guess only for a short window, defaulting to 30 seconds. If the player submits after the snapshot expires, the backend rejects the guess. The frontend must then refetch `GET /state`, show the new price, and require a new submission.
- This stale-snapshot rule prevents a player from leaving an old visible price on screen, checking the current market elsewhere, and betting with an unfair advantage.
- The backend fetches a fresh or cached price when resolution is requested and determines the result.
- A guess may resolve only when `now >= createdAt + 60 seconds` **and** the newly observed price differs from `startPriceUsd`.
- The price provider is CoinGecko’s BTC/USD endpoint. To protect the free API limit, the backend should maintain a short shared in-process BTC/USD snapshot cache, defaulting to 10 seconds.
- `GET /state`, manual refreshes, stale-snapshot recovery, and resolution requests may reuse this shared cached snapshot instead of calling CoinGecko every time.
- The provider cache TTL and the betting snapshot validity window are separate. A provider response may be cached for 10 seconds while a displayed snapshot remains valid for betting for up to 30 seconds.
- Resolution may use the shared provider cache as an API-limit trade-off. This can delay resolution when the cached observed price still equals `startPriceUsd`, but it must never resolve before 60 seconds or without an observed price change.
- The cache is an optimization only; durable score and active guess state remain in the backend database. Snapshot validation is handled by the signed token rather than durable snapshot records.

This establishes a fair result within the assignment’s constraints, while avoiding a costly polling worker or scheduled job.

### Resolution interaction

When the 60-second countdown ends, the frontend automatically attempts resolution and then retries at a modest interval (for example, every 10 seconds) while the price is unchanged. The user can also use a clearly labelled `Check result` control. Buttons for new guesses remain disabled while the guess is pending.

If the browser is closed, no background worker runs. On return, `GET /state` shows the existing pending guess and the frontend resumes the resolution checks. This is intentional and documented as an MVP trade-off.

## 5. API contract

All API requests except `GET /health` require an `x-user-id` header containing the anonymous user id generated by the frontend. Responses use JSON.

### `GET /state`

Returns the current server-owned game state for the anonymous player.

Response:

```json
{
  "score": 0,
  "latestPrice": {
    "priceSnapshotId": "opaque-signed-snapshot-token",
    "priceUsd": 67482.15,
    "observedAt": "2026-06-25T12:00:00.000Z",
    "expiresAt": "2026-06-25T12:00:30.000Z"
  },
  "activeGuess": null,
  "feedback": {
    "type": "NONE"
  }
}
```

When a guess is active, `activeGuess` contains:

```json
{
  "id": "guess-id",
  "direction": "UP",
  "startPriceUsd": 67482.15,
  "createdAt": "2026-06-25T12:00:10.000Z",
  "eligibleAt": "2026-06-25T12:01:10.000Z"
}
```

### `POST /guesses`

Creates a new active guess from a fresh server-issued price snapshot.

Request:

```json
{
  "direction": "UP",
  "priceSnapshotId": "opaque-signed-snapshot-token"
}
```

`direction` must be `UP` or `DOWN`. The backend rejects the request if the user already has an active guess, the snapshot id is unknown or invalid, or the snapshot has expired.

Response: same shape as `GET /state`, with `activeGuess` populated and `feedback.type` set to `GUESS_CREATED`.

### `POST /guesses/resolve`

Attempts to resolve the active guess.

Request body: empty JSON object or no body.

Response: same shape as `GET /state`. If the guess is not ready or the observed price is unchanged, the active guess remains present and feedback explains when to retry. If the guess resolves, `activeGuess` becomes `null`, score is updated, and feedback includes the outcome and score delta.

### Error response

Error responses use this shape:

```json
{
  "error": {
    "code": "PRICE_SNAPSHOT_EXPIRED",
    "message": "The displayed price is no longer valid. Refresh the price and try again."
  }
}
```

Initial error codes:

- `MISSING_USER_ID`
- `INVALID_USER_ID`
- `INVALID_REQUEST`
- `ACTIVE_GUESS_EXISTS`
- `NO_ACTIVE_GUESS`
- `PRICE_SNAPSHOT_INVALID`
- `PRICE_SNAPSHOT_EXPIRED`
- `PRICE_PROVIDER_UNAVAILABLE`
- `INTERNAL_ERROR`

### HTTP status codes

- `200 OK`: successful `GET /state`, successful `POST /guesses/resolve`, including not-ready or price-unchanged outcomes.
- `201 Created`: successful `POST /guesses`.
- `400 Bad Request`: invalid JSON, invalid direction, or malformed request body.
- `401 Unauthorized`: missing or invalid `x-user-id`. This is not login authentication; it means the request lacks the required anonymous identity.
- `404 Not Found`: route not found.
- `409 Conflict`: active guess already exists, no active guess exists to resolve, or a conditional write conflict occurred.
- `410 Gone`: price snapshot expired.
- `422 Unprocessable Entity`: price snapshot token is invalid, tampered with, malformed, or not server-verifiable.
- `503 Service Unavailable`: CoinGecko is unavailable and no usable cached price exists.
- `500 Internal Server Error`: unexpected backend failure.

Normal game states such as `NOT_READY` and `PRICE_UNCHANGED` are returned as `200 OK` from `POST /guesses/resolve`; they are not transport errors.

## 6. Persistence and operational assumptions

The deployed persistence layer is DynamoDB. The MVP uses one player table with `userId` as the partition key and no sort key. Each item represents one anonymous player.

The player item stores score and active guess in the same item. This allows conditional updates on one item and avoids transaction complexity for the MVP. When there is no active guess, the `activeGuess` attribute should be omitted.

The MVP does not store resolved guess history, leaderboard records, or cross-user analytics. This is intentional because those features are non-goals. If future features require history or leaderboards, they should be added with a separate history/projection table or index going forward. Old resolved guesses cannot be backfilled because the MVP does not store them.

Creating a guess must use an atomic conditional update: if the player has no active guess, write the active guess; if the player already has an active guess, reject with `ACTIVE_GUESS_EXISTS`. Resolving a guess must also be conditional so repeated or concurrent resolution requests cannot score the same guess twice.

Snapshot validation uses signed snapshot tokens and must work across Lambda cold starts and multiple Lambda instances. A purely in-memory snapshot id is acceptable only for local scaffolding, not for the deployed application.

The snapshot signing secret must be backend-only runtime configuration. It must not be committed to source control or exposed to the frontend.

CoinGecko failures must not erase player state or active guesses. If the backend cannot fetch or reuse a valid BTC/USD snapshot, it should return `PRICE_PROVIDER_UNAVAILABLE` and the frontend should show a recoverable error.

The deployed API must allow the frontend origin through CORS. Runtime configuration should include the CoinGecko endpoint, snapshot validity window, provider cache TTL, and frontend API base URL.
