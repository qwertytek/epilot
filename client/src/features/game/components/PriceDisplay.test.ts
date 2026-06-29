import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { PriceDisplay } from './PriceDisplay.js';

test('stale price display renders refresh overlay', () => {
  const markup = renderToStaticMarkup(
    createElement(PriceDisplay, {
      isStale: true,
      lastBet: null,
      observedAt: '2026-06-29T00:00:00.000Z',
      onRefresh: () => {},
      pollIntervalMs: 10_000,
      price: '$123.00',
    }),
  );

  assert.match(markup, /price-stale-overlay/);
  assert.match(markup, /Refresh latest Bitcoin price/);
});
