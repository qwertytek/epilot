import type { RouteContext } from './route-context.js';
import type { ApiGatewayEvent, Response } from '../types.js';

export const handlePrice = async (
  event: ApiGatewayEvent,
  { game, http }: RouteContext,
): Promise<Response> => http.respond(200, await game.getPriceState(), event);
