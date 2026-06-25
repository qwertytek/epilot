import type { ApiErrorCode } from '@epilot/api-contract';

export const errorMessages: Record<ApiErrorCode, string> = {
  MISSING_USER_ID: 'Missing x-user-id header.',
  INVALID_USER_ID: 'The x-user-id header is invalid.',
  ACTIVE_GUESS_EXISTS: 'An active guess already exists for this user.',
  NO_ACTIVE_GUESS: 'No active guess exists for this user.',
  PRICE_SNAPSHOT_EXPIRED: 'The price snapshot has expired.',
  INVALID_REQUEST: 'The request payload is invalid.',
  PRICE_SNAPSHOT_INVALID: 'The price snapshot is invalid.',
  PRICE_PROVIDER_UNAVAILABLE: 'The price provider is unavailable.',
  INTERNAL_ERROR: 'An unexpected error occurred.',
};

export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ApiErrorCode,
    readonly details?: unknown,
  ) {
    super(errorMessages[code]);
  }
}
