# BTC Price Guessing Game — implementation specification

## 1. Purpose and scope

Build a small, deployed web application where an anonymous player predicts whether the BTC/USD market price will be higher or lower after at least one minute.

This is deliberately an MVP. Its purpose is to demonstrate product judgment, a polished React/TypeScript frontend, API-first backend design, serverless AWS familiarity, testable domain logic, and clear operational trade-offs. It is not intended to be a trading product, a leaderboard, or a complete identity system.

## 2. Success criteria

The deployed application must allow a player to:

- See the latest available BTC/USD price and their current score.
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
- The backend fetches the price when a guess is created and stores it as `startPriceUsd`.
- The backend fetches a fresh price when resolution is requested and determines the result.
- A guess may resolve only when `now >= createdAt + 60 seconds` **and** the newly fetched price differs from `startPriceUsd`.
- The price provider is CoinGecko’s BTC/USD endpoint. A short in-process cache (for example 10 seconds) may reduce duplicate API calls but must never be treated as durable state.

This establishes a fair result within the assignment’s constraints, while avoiding a costly polling worker or scheduled job.

### Resolution interaction

When the 60-second countdown ends, the frontend automatically attempts resolution and then retries at a modest interval (for example, every 10 seconds) while the price is unchanged. The user can also use a clearly labelled `Check result` control. Buttons for new guesses remain disabled while the guess is pending.

If the browser is closed, no background worker runs. On return, `GET /state` shows the existing pending guess and the frontend resumes the resolution checks. This is intentional and documented as an MVP trade-off.
