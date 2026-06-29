import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ActiveGuess } from '@epilot/api-contract';

import { shouldPollLivePrice } from './index.js';

const activeGuess: ActiveGuess = {
  id: 'guess-1',
  direction: 'UP',
  startPriceUsd: 100,
  createdAt: '2026-06-29T00:00:00.000Z',
  eligibleAt: '2026-06-29T00:01:00.000Z',
};

test('live price polling runs without an active guess', () => {
  assert.equal(
    shouldPollLivePrice({
      activeGuess: null,
      resolveWaitSeconds: 0,
    }),
    true,
  );
});

test('live price polling continues while active guess has more than 20 seconds left', () => {
  assert.equal(
    shouldPollLivePrice({
      activeGuess,
      resolveWaitSeconds: 21,
    }),
    true,
  );
});

test('live price polling pauses during the final 20 seconds of an active guess', () => {
  assert.equal(
    shouldPollLivePrice({
      activeGuess,
      resolveWaitSeconds: 20,
    }),
    false,
  );
});
