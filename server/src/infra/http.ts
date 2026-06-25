import type { ApiErrorCode, ApiErrorResponse } from '@epilot/api-contract';

import { errorMessages } from '../errors.js';
import type { ApiGatewayEvent, Response } from '../types.js';

const jsonHeaders = {
  'content-type': 'application/json',
};

export const getHeader = (
  headers: Record<string, string | undefined> | undefined,
  name: string,
): string | undefined => {
  const normalizedName = name.toLowerCase();
  const match = Object.entries(headers ?? {}).find(
    ([key]) => key.toLowerCase() === normalizedName,
  );

  return match?.[1];
};

export const parseBody = <T>(event: ApiGatewayEvent): T => {
  if (!event.body) {
    throw new Error('Missing request body');
  }

  return JSON.parse(event.body) as T;
};

export const createHttpResponder = (corsAllowedOrigins: string[]) => {
  const getCorsOrigin = (event: ApiGatewayEvent): string => {
    const origin = getHeader(event.headers, 'origin');

    if (origin !== undefined && corsAllowedOrigins.includes(origin)) {
      return origin;
    }

    return corsAllowedOrigins[0] ?? 'http://localhost:5173';
  };

  const createCorsHeaders = (
    event: ApiGatewayEvent,
  ): Record<string, string> => ({
    'access-control-allow-headers': 'content-type,x-user-id',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-origin': getCorsOrigin(event),
    vary: 'Origin',
  });

  const respond = <T>(
    statusCode: number,
    body: T,
    event: ApiGatewayEvent,
  ): Response => ({
    statusCode,
    headers: {
      ...jsonHeaders,
      ...createCorsHeaders(event),
    },
    body: JSON.stringify(body),
  });

  const respondError = (
    statusCode: number,
    code: ApiErrorCode,
    event: ApiGatewayEvent,
    details?: unknown,
  ): Response => {
    const body: ApiErrorResponse = {
      code,
      message: errorMessages[code],
      ...(details === undefined ? {} : { details }),
    };

    return respond(statusCode, body, event);
  };

  const respondNoContent = (event: ApiGatewayEvent): Response => ({
    statusCode: 204,
    headers: createCorsHeaders(event),
    body: '',
  });

  return { respond, respondError, respondNoContent };
};

export type HttpResponder = ReturnType<typeof createHttpResponder>;
