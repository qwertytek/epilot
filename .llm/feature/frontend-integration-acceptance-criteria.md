# Frontend Integration Acceptance Criteria

## Initial state loading

- [x] The frontend generates an anonymous user id with `crypto.randomUUID()` on first visit.
- [x] The anonymous user id is stored in `localStorage` as `btc-game.user-id`.
- [x] Existing anonymous user ids are reused on later visits.
- [ ] The frontend fetches `GET /state` on page load.
- [x] All game API requests include the `x-user-id` header.
- [ ] Loading state is shown while initial game state is being fetched.
- [ ] Initial load errors are shown as recoverable UI errors without deleting the local user id.

## Server-owned game state

- [ ] The rendered score comes from the server response.
- [ ] The rendered active guess comes from the server response.
- [ ] The rendered BTC/USD price comes from the server-issued `latestPrice`.
- [ ] The rendered price timestamp uses the server-issued `observedAt`.
- [ ] The client does not store score, active guess, or game progress as source-of-truth local state.
- [ ] Refreshing or reopening the browser restores score and active guess from `GET /state`.

## Guess submission

- [ ] The UI offers clear `UP` and `DOWN` guess actions when no guess is active.
- [x] Guess submission sends only `direction` and `priceSnapshotId`.
- [x] Guess submission never sends a raw price.
- [ ] Guess buttons are disabled while a submit request is in flight.
- [ ] Guess buttons are disabled while an active guess exists.
- [ ] Successful guess creation updates the UI from the server response.
- [ ] Attempting to submit with an expired snapshot recovers by refetching `GET /state`.

## Active guess display

- [ ] When a guess is active, the UI shows the pending direction.
- [ ] When a guess is active, the UI shows the start price.
- [ ] When a guess is active, the UI shows the eligible time or countdown.
- [ ] The countdown is derived from the server-issued `eligibleAt`.
- [ ] The UI remains stable when the countdown reaches zero.
- [ ] New guess actions remain unavailable until the active guess resolves.

## Resolution flow

- [ ] The frontend automatically attempts `POST /guesses/resolve` when the active guess reaches `eligibleAt`.
- [ ] The user can manually trigger resolution with a `Check result` control.
- [ ] Resolve controls are disabled while a resolve request is in flight.
- [ ] `NOT_READY` responses keep the active guess pending and do not show an error state.
- [ ] `PRICE_UNCHANGED` responses keep the active guess pending and do not show an error state.
- [ ] The frontend retries resolution at a modest interval while the price is unchanged.
- [ ] Successful resolution updates score, clears active guess, and shows result feedback from the server response.
- [ ] Repeated manual clicks cannot create duplicate resolve requests.

## Error handling

- [ ] `PRICE_SNAPSHOT_EXPIRED` prompts a state refresh and lets the user submit against a new displayed price.
- [ ] `PRICE_PROVIDER_UNAVAILABLE` is shown as a recoverable error.
- [ ] `ACTIVE_GUESS_EXISTS` refreshes state instead of allowing local UI drift.
- [ ] `NO_ACTIVE_GUESS` refreshes state instead of allowing local UI drift.
- [ ] `INVALID_REQUEST` and unexpected API errors are displayed without clearing local identity.
- [ ] Network failures are displayed with a retry path.
- [ ] Error messages do not expose internal implementation details or signed token contents.

## Configuration

- [x] The frontend API base URL is read from runtime or build-time configuration.
- [x] Local development works against the documented local backend URL.
- [ ] Deployed frontend configuration points at the deployed API URL.
- [ ] CORS-compatible requests are used for the deployed frontend origin.

## User experience

- [ ] The first screen is the playable game experience, not a landing page.
- [x] Primary game controls are visible without navigating away.
- [ ] The score, price, active guess, and available actions are scannable on desktop.
- [ ] The score, price, active guess, and available actions fit without overlap on mobile.
- [x] Buttons and status text have accessible labels or text.
- [ ] Pending, success, and error states are visually distinct.
- [x] The UI does not imply financial advice or real-money trading.

## Verification

- [x] Frontend tests cover first-visit user id creation.
- [x] Frontend tests cover reuse of an existing local user id.
- [ ] Frontend tests cover `GET /state` on page load.
- [x] Frontend tests cover submitting `direction` and `priceSnapshotId`.
- [ ] Frontend tests cover disabling guess controls while active guess exists.
- [ ] Frontend tests cover countdown or eligible-time rendering.
- [ ] Frontend tests cover automatic resolution after `eligibleAt`.
- [ ] Frontend tests cover manual `Check result`.
- [ ] Frontend tests cover `PRICE_UNCHANGED` retry behavior.
- [ ] Frontend tests cover expired snapshot recovery.
- [ ] Frontend tests cover recoverable provider or network errors.
- [x] Project typecheck passes.
- [x] Lint passes.
- [x] Prettier format check passes.

## Out of scope

- Accounts, passwords, OAuth, or cross-device identity.
- Leaderboards, analytics, or resolved guess history.
- Historical BTC charts.
- Push notifications or background resolution workers.
- Client-side scoring or result determination.
