import { createHmac, timingSafeEqual } from 'node:crypto';

import { ApiError } from '../errors.js';
import type { PriceProvider, PriceSnapshotFactory } from '../types.js';

type SnapshotPayload = {
  priceUsd: number;
  observedAt: string;
  expiresAt: string;
  canCreateGuess: boolean;
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
      typeof payload.canCreateGuess !== 'boolean' ||
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
  const createSnapshot = (
    priceUsd: number,
    fetchedAtMs: number | undefined,
    isStaleFallback: boolean,
  ) => {
    const observedAt =
      fetchedAtMs === undefined ? now() : new Date(fetchedAtMs);
    const expiresAt = new Date(observedAt.getTime() + snapshotValidityMs);
    const canCreateGuess =
      !isStaleFallback && expiresAt.getTime() > now().getTime();
    const payload: SnapshotPayload = {
      priceUsd,
      observedAt: observedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      canCreateGuess,
    };

    return {
      priceUsd: payload.priceUsd,
      observedAt: payload.observedAt,
      priceSnapshotId: createSnapshotToken(payload, snapshotSigningSecret),
      canCreateGuess,
      isStaleFallback,
    };
  };

  const createPriceSnapshot: PriceSnapshotFactory = async () => {
    const priceUsd = await getPrice();
    const lastFetchedAtMs = getPrice.getLastFetchedAtMs?.();
    const isStaleFallback =
      getPrice.getLastReturnedWasStaleFallback?.() ?? false;

    return createSnapshot(priceUsd, lastFetchedAtMs, isStaleFallback);
  };

  createPriceSnapshot.createFreshSnapshot = async () => {
    const priceUsd =
      getPrice.getFreshPrice === undefined
        ? await getPrice()
        : await getPrice.getFreshPrice();
    const lastFetchedAtMs = getPrice.getLastFetchedAtMs?.();
    const isStaleFallback =
      getPrice.getLastReturnedWasStaleFallback?.() ?? false;

    return createSnapshot(priceUsd, lastFetchedAtMs, isStaleFallback);
  };

  createPriceSnapshot.getCachedSnapshot = () => {
    const cachedPrice = getPrice.getCachedPrice?.();

    if (cachedPrice === undefined) {
      return undefined;
    }

    return createSnapshot(cachedPrice.priceUsd, cachedPrice.fetchedAtMs, false);
  };

  return createPriceSnapshot;
};
