# epilot

A pnpm workspace for a Bitcoin price-direction game.

## Current implementation

- `client`: a Vite + React 19 interface for the BTC/USD prediction game.
- `server`: reserved for the backend; no application code or scripts are implemented yet.

The client currently renders a static game screen with a sample BTC/USD price, score, and up/down prediction controls. It does not yet fetch live prices, persist guesses, calculate results, or connect to the server.

## Getting started

Install workspace dependencies:

```bash
pnpm install
```

Start the client development server:

```bash
pnpm --dir client dev
```

## Documentation

See the [client README](./client/README.md) for client-specific setup and structure.

## Quality checks

```bash
pnpm lint
pnpm format:check
```
