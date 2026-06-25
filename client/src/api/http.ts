import type { ApiErrorResponse } from '@epilot/api-contract';

import { getAnonymousUserId } from './identity.js';

const apiBaseUrl =
  (import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env
    ?.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000';

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
