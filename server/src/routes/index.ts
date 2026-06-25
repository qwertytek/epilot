import { handleCreateGuess, handleResolveGuess } from './guesses.route.js';
import { handleHealth } from './health.route.js';
import type { RouteContext } from './route-context.js';
import { handleState } from './state.route.js';
import type { ApiGatewayEvent, Response } from '../types.js';

type RouteHandler = (
  event: ApiGatewayEvent,
  context: RouteContext,
) => Response | Promise<Response>;

type Route = {
  method: string;
  path: string;
  handle: RouteHandler;
};

const routes: Route[] = [
  { method: 'GET', path: '/health', handle: handleHealth },
  { method: 'GET', path: '/state', handle: handleState },
  { method: 'POST', path: '/guesses', handle: handleCreateGuess },
  { method: 'POST', path: '/guesses/resolve', handle: handleResolveGuess },
];

export const findRoute = (
  method: string,
  path: string,
): RouteHandler | undefined =>
  routes.find((route) => route.method === method && route.path === path)
    ?.handle;
