import type { ApiErrorResponse } from '@epilot/api-contract';

import {
  apiBaseLiveUrl,
  apiBaseLocalUrl,
  frontendMode,
} from '#src/app/environment';
import { defaultLocalApiBaseUrl } from '#src/shared/constants/api';
import { getAnonymousUserId } from './identity';

const configuredApiBaseUrl =
  frontendMode === 'live' || frontendMode === 'production'
    ? apiBaseLiveUrl
    : (apiBaseLocalUrl ?? defaultLocalApiBaseUrl);

if (configuredApiBaseUrl === undefined || configuredApiBaseUrl.trim() === '') {
  throw new Error('Missing API base URL for the selected frontend target.');
}

const apiBaseUrl = configuredApiBaseUrl.trim().replace(/\/+$/, '');

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
