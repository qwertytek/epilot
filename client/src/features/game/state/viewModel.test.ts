import assert from 'node:assert/strict';
import { test } from 'node:test';

import { toGamePageViewModel } from './viewModel.js';

test('display-only price shows stale refresh affordance', () => {
  let refetchCount = 0;

  const viewModel = toGamePageViewModel({
    guess: {
      canGuess: false,
      disabledReason: 'Price is temporarily unavailable.',
      pendingDirection: undefined,
      submitGuess: () => {},
    } as never,
    notifications: {
      error: null,
      warnings: [],
    } as never,
    price: {
      currentPrice: {
        observedAt: '2026-06-29T00:00:00.000Z',
        priceSnapshotId: 'display-only-price',
        priceUsd: 123,
      },
      isPriceUnavailable: true,
      priceStateQuery: {
        isFetching: false,
        refetch: () => {
          refetchCount += 1;
        },
      },
    } as never,
    priceAnimation: null,
    resolveWaitSeconds: 0,
    session: {
      activeGuess: null,
      gameState: null,
      gameStateQuery: {
        isFetching: false,
      },
      isGameStateKnown: true,
      resolvedPrice: null,
    } as never,
  });

  assert.equal(viewModel.priceDisplayProps.isStale, true);

  viewModel.priceDisplayProps.onRefresh();

  assert.equal(refetchCount, 1);
});

test('unavailable null price shows only refresh overlay and click refetches', () => {
  const calls: string[] = [];

  const viewModel = toGamePageViewModel({
    guess: {
      canGuess: false,
      disabledReason: null,
      pendingDirection: undefined,
      submitGuess: () => {},
    } as never,
    notifications: {
      error: null,
      warnings: [],
    } as never,
    price: {
      currentPrice: null,
      isPriceUnavailable: true,
      priceStateQuery: {
        isFetching: false,
        refetch: () => {
          calls.push('refetch');
        },
      },
    } as never,
    priceAnimation: null,
    resolveWaitSeconds: 0,
    session: {
      activeGuess: null,
      gameState: null,
      gameStateQuery: {
        isFetching: false,
      },
      isGameStateKnown: true,
      resolvedPrice: null,
    } as never,
  });

  assert.equal(viewModel.priceDisplayProps.price, null);
  assert.equal(viewModel.priceDisplayProps.isStale, true);
  assert.equal(viewModel.guessPanelProps.disabledReason, null);

  viewModel.priceDisplayProps.onRefresh();

  assert.deepEqual(calls, ['refetch']);
});

test('unavailable price does not show refresh overlay during an active bet', () => {
  const viewModel = toGamePageViewModel({
    guess: {
      canGuess: false,
      disabledReason: 'Your previous guess is still being resolved.',
      pendingDirection: undefined,
      submitGuess: () => {},
    } as never,
    notifications: {
      error: null,
      warnings: [],
    } as never,
    price: {
      currentPrice: {
        observedAt: '2026-06-29T00:00:00.000Z',
        priceSnapshotId: 'unavailable-price',
        priceUsd: 456,
      },
      isPriceUnavailable: true,
      priceStateQuery: {
        isFetching: false,
        refetch: () => {},
      },
    } as never,
    priceAnimation: null,
    resolveWaitSeconds: 30,
    session: {
      activeGuess: {
        createdAt: '2026-06-29T00:00:00.000Z',
        direction: 'UP',
        eligibleAt: '2026-06-29T00:01:00.000Z',
        id: 'active-guess',
        startPriceUsd: 456,
      },
      gameState: null,
      gameStateQuery: {
        isFetching: false,
      },
      isGameStateKnown: true,
      resolvedPrice: null,
    } as never,
  });

  assert.equal(viewModel.priceDisplayProps.isStale, false);
});
