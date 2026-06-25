import type { HealthResponse } from '@epilot/api-contract';

import type { RouteContext } from './route-context.js';
import type { ApiGatewayEvent, Response } from '../types.js';

export const handleHealth = (
  event: ApiGatewayEvent,
  { http }: RouteContext,
): Response => {
  const body: HealthResponse = { status: 'ok' };

  return http.respond(200, body, event);
};
