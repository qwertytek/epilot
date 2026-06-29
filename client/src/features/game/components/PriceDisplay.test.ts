import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { PriceDisplay } from './PriceDisplay.js';

test('price display renders automatic refresh status without overlay', () => {
  const markup = renderToStaticMarkup(
    createElement(PriceDisplay, {
      lastBet: null,
      observedAt: '2026-06-29T00:00:00.000Z',
      pollIntervalMs: 10_000,
      price: '$123.00',
    }),
  );

  assert.match(markup, /updates every 10s/);
  assert.doesNotMatch(markup, /price-stale-overlay/);
});

test('price display shows almost-ready copy during the resolution window', () => {
  const markup = renderToStaticMarkup(
    createElement(PriceDisplay, {
      isResolutionAlmostReady: true,
      lastBet: null,
      observedAt: '2026-06-29T00:00:00.000Z',
      pollIntervalMs: 10_000,
      price: '$123.00',
    }),
  );

  assert.match(markup, /the results are almost ready/);
  assert.doesNotMatch(markup, /updates every 10s/);
});
