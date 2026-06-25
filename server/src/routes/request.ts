import type { CreateGuessRequest, GuessDirection } from '@epilot/api-contract';

import { ApiError } from '../errors.js';
import { getHeader, parseBody } from '../infra/http.js';
import type { ApiGatewayEvent } from '../types.js';

export const requireUserId = (event: ApiGatewayEvent): string => {
  const userId = getHeader(event.headers, 'x-user-id')?.trim();

  if (!userId) {
    throw new ApiError(401, 'MISSING_USER_ID');
  }

  return userId;
};

export const parseRequestBody = <T>(event: ApiGatewayEvent): T => {
  try {
    return parseBody<T>(event);
  } catch {
    throw new ApiError(422, 'INVALID_REQUEST');
  }
};

const isGuessDirection = (value: unknown): value is GuessDirection =>
  value === 'up' || value === 'down';

export const parseCreateGuessRequest = (value: unknown): CreateGuessRequest => {
  if (value === null || typeof value !== 'object') {
    throw new ApiError(422, 'INVALID_REQUEST');
  }

  const request = value as Record<string, unknown>;

  if (
    !isGuessDirection(request.direction) ||
    typeof request.priceSnapshotId !== 'string'
  ) {
    throw new ApiError(422, 'INVALID_REQUEST');
  }

  return {
    direction: request.direction,
    priceSnapshotId: request.priceSnapshotId,
  };
};
