# epilot

A pnpm workspace for a Bitcoin price-direction game.

## Current implementation

- `client`: a Vite + React 19 interface for the BTC/USD prediction game.
- `server`: minimal AWS SAM Lambda structure, exposed locally through API Gateway proxy integration.

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

Start the local API (requires the [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) and Docker):

```bash
pnpm --dir server start
```

The smoke endpoint is available at `GET http://127.0.0.1:3000/health`.

## Documentation

See the [client README](./client/README.md) for client-specific setup and structure.

## Quality checks

```bash
pnpm lint
pnpm format:check
```
