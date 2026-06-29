import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getDisplayPrice } from './useGamePriceState.js';

const lastKnownPrice = {
  observedAt: '2026-06-29T01:39:42.889Z',
  priceSnapshotId: 'last-known-price',
  priceUsd: 59324,
};

test('display price keeps the last known price when latest price is unavailable', () => {
  assert.equal(getDisplayPrice(null, lastKnownPrice), lastKnownPrice);
});

test('display price prefers the latest non-null price', () => {
  const latestPrice = {
    observedAt: '2026-06-29T01:40:42.889Z',
    priceSnapshotId: 'latest-price',
    priceUsd: 59330,
  };

  assert.equal(getDisplayPrice(latestPrice, lastKnownPrice), latestPrice);
});
