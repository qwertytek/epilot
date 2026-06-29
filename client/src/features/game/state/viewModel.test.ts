import assert from 'node:assert/strict';
import { test } from 'node:test';

import { toGamePageViewModel } from './viewModel.js';

test('display-only price is shown without refresh overlay props', () => {
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

  assert.equal(viewModel.priceDisplayProps.price, '$123.00');
  assert.equal('isStale' in viewModel.priceDisplayProps, false);
  assert.equal('onRefresh' in viewModel.priceDisplayProps, false);
  assert.equal(viewModel.priceDisplayProps.isResolutionAlmostReady, false);
});

test('active bet marks price display almost ready in final 20 seconds', () => {
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
        priceSnapshotId: 'display-price',
        priceUsd: 456,
      },
      isPriceUnavailable: false,
      priceStateQuery: {
        isFetching: false,
      },
    } as never,
    priceAnimation: null,
    resolveWaitSeconds: 20,
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

  assert.equal(viewModel.priceDisplayProps.isResolutionAlmostReady, true);
});

test('unavailable null price remains on automatic refresh path', () => {
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
  assert.equal(viewModel.guessPanelProps.disabledReason, null);
  assert.equal('isStale' in viewModel.priceDisplayProps, false);
  assert.equal('onRefresh' in viewModel.priceDisplayProps, false);
});

test('unavailable price during active bet has no refresh overlay props', () => {
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

  assert.equal('isStale' in viewModel.priceDisplayProps, false);
  assert.equal('onRefresh' in viewModel.priceDisplayProps, false);
});
