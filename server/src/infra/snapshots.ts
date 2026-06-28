import { createHmac, timingSafeEqual } from 'node:crypto';

import type { PriceSnapshot } from '@epilot/api-contract';

import { ApiError } from '../errors.js';
import type {
  PriceProvider,
  PriceProviderOptions,
  PriceSnapshotFactory,
} from '../types.js';

type SnapshotPayload = {
  priceUsd: number;
  observedAt: string;
  expiresAt: string;
};

const encodeBase64Url = (value: string): string =>
  Buffer.from(value).toString('base64url');

const decodeBase64Url = (value: string): string =>
  Buffer.from(value, 'base64url').toString('utf8');

const sign = (payload: string, secret: string): string =>
  createHmac('sha256', secret).update(payload).digest('base64url');

const isValidSignature = (
  payload: string,
  signature: string,
  secret: string,
): boolean => {
  const expected = sign(payload, secret);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
};

const createSnapshotToken = (
  payload: SnapshotPayload,
  secret: string,
): string => {
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
};

export const parseSnapshotToken = (
  priceSnapshotId: string,
  secret: string,
  now: Date,
): SnapshotPayload => {
  const [encodedPayload, signature, extra] = priceSnapshotId.split('.');

  if (!encodedPayload || !signature || extra !== undefined) {
    throw new ApiError(422, 'PRICE_SNAPSHOT_INVALID');
  }

  if (!isValidSignature(encodedPayload, signature, secret)) {
    throw new ApiError(422, 'PRICE_SNAPSHOT_INVALID');
  }

  try {
    const payload = JSON.parse(
      decodeBase64Url(encodedPayload),
    ) as SnapshotPayload;

    if (
      typeof payload.priceUsd !== 'number' ||
      !Number.isFinite(payload.priceUsd) ||
      Number.isNaN(Date.parse(payload.observedAt)) ||
      Number.isNaN(Date.parse(payload.expiresAt))
    ) {
      throw new ApiError(422, 'PRICE_SNAPSHOT_INVALID');
    }

    if (Date.parse(payload.expiresAt) <= now.getTime()) {
      throw new ApiError(410, 'PRICE_SNAPSHOT_EXPIRED');
    }

    return payload;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(422, 'PRICE_SNAPSHOT_INVALID');
  }
};

export const createPriceSnapshotFactory = (
  getPrice: PriceProvider,
  now: () => Date,
  snapshotValidityMs: number,
  snapshotSigningSecret: string,
): PriceSnapshotFactory => {
  const createSnapshot = (priceUsd: number, fetchedAtMs?: number) => {
    const observedAt =
      fetchedAtMs === undefined ? now() : new Date(fetchedAtMs);
    const expiresAt = new Date(observedAt.getTime() + snapshotValidityMs);
    const payload: SnapshotPayload = {
      priceUsd,
      observedAt: observedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    return {
      ...payload,
      priceSnapshotId: createSnapshotToken(payload, snapshotSigningSecret),
    };
  };

  const createPriceSnapshot: PriceSnapshotFactory = async (
    options?: PriceProviderOptions,
  ): Promise<PriceSnapshot> => {
    const priceUsd = await getPrice({
      ...options,
      maxAgeMs:
        options?.allowStale === false ? snapshotValidityMs : options?.maxAgeMs,
    });
    const lastFetchedAtMs = getPrice.getLastFetchedAtMs?.();

    return createSnapshot(priceUsd, lastFetchedAtMs);
  };

  createPriceSnapshot.getCachedSnapshot = () => {
    const cachedPrice = getPrice.getCachedPrice?.();

    if (cachedPrice === undefined) {
      return undefined;
    }

    return createSnapshot(cachedPrice.priceUsd, cachedPrice.fetchedAtMs);
  };

  createPriceSnapshot.getRetryAfterMs = () => getPrice.getRetryAfterMs?.();

  return createPriceSnapshot;
};
