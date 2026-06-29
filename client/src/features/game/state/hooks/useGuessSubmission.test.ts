import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getGuessDisabledReason } from './useGuessSubmission.js';

test('unavailable price disables betting without showing a guess-panel error', () => {
  assert.equal(
    getGuessDisabledReason({
      canUsePrice: false,
      hasActiveGuess: false,
      hasGameState: true,
      isInitialPriceLoading: false,
      isPriceUnavailable: true,
      isSubmitting: false,
    }),
    null,
  );
});
