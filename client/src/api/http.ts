import type { ApiErrorResponse } from '@epilot/api-contract';

import { env, frontendMode } from '../app/environment.js';
import { getAnonymousUserId } from './identity.js';

const apiBaseUrl =
  frontendMode === 'live'
    ? env.VITE_API_BASE_LIVE
    : (env.VITE_API_BASE_LOCAL ?? 'http://127.0.0.1:3000');

if (apiBaseUrl === undefined || apiBaseUrl.trim() === '') {
  throw new Error('Missing API base URL for the selected frontend target.');
}

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly error: ApiErrorResponse,
  ) {
    super(error.error.message);
  }
}

const requestApi = async <T>(
  path: string,
  init: RequestInit = {},
): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-user-id': getAnonymousUserId(),
      ...init.headers,
    },
  });

  const body = (await response.json()) as T | ApiErrorResponse;

  if (!response.ok) {
    throw new ApiError(response.status, body as ApiErrorResponse);
  }

  return body as T;
};

export { ApiError, requestApi };
