import { createAppContext } from './app.js';
import { ApiError } from './errors.js';
import { findRoute } from './routes/index.js';
import type { ApiGatewayEvent, HandlerOptions, Response } from './types.js';

const createHandler = (options: HandlerOptions = {}) => {
  const routeContext = createAppContext(options);
  const { http } = routeContext;

  return async (event: ApiGatewayEvent = {}): Promise<Response> => {
    const method = event.requestContext?.http?.method ?? 'GET';
    const path = event.rawPath ?? event.requestContext?.http?.path ?? '/health';

    try {
      if (method === 'OPTIONS') {
        return http.respondNoContent(event);
      }

      const route = findRoute(method, path);

      if (route !== undefined) {
        return await route(event, routeContext);
      }

      return http.respondError(404, 'INVALID_REQUEST', event, { method, path });
    } catch (error) {
      if (error instanceof ApiError) {
        return http.respondError(
          error.statusCode,
          error.code,
          event,
          error.details,
        );
      }

      return http.respondError(500, 'INTERNAL_ERROR', event);
    }
  };
};

export const handler = createHandler();

export { createHandler };
