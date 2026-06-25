import {
  parseCreateGuessRequest,
  parseRequestBody,
  requireUserId,
} from './request.js';
import type { RouteContext } from './route-context.js';
import type { ApiGatewayEvent, Response } from '../types.js';

export const handleCreateGuess = async (
  event: ApiGatewayEvent,
  { game, http }: RouteContext,
): Promise<Response> => {
  const body = await game.createGuess(
    requireUserId(event),
    parseCreateGuessRequest(parseRequestBody<unknown>(event)),
  );

  return http.respond(201, body, event);
};

export const handleResolveGuess = async (
  event: ApiGatewayEvent,
  { game, http }: RouteContext,
): Promise<Response> =>
  http.respond(200, await game.resolveGuess(requireUserId(event)), event);
