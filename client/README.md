# Client

The frontend for epilot's Bitcoin price-direction game. It is built with Vite, React 19, TypeScript, and Tailwind CSS 4.

## Run locally

From the repository root:

```bash
pnpm install
pnpm --dir client dev
```

Vite prints the local URL when the development server starts.

## Available commands

```bash
pnpm --dir client dev      # start the development server
pnpm --dir client build    # create a production build
pnpm --dir client preview  # serve the production build locally
```

## Current scope

The client renders a responsive static game view containing:

- a market challenge header and score;
- a BTC/USD price snapshot;
- up/down prediction buttons.

Reusable feedback and pending-guess components exist, but they are not yet connected to client state. The price, score, and timestamp are currently hard-coded. A typed API module exists for the game contract, anonymous user id, and request headers, but no game-result UI flow has been implemented.

## Structure

```text
src/
├── app/       Application entry point and app-level styles
├── features/  Feature-specific UI, including the game screen
└── shared/    Reusable components and design tokens
```
