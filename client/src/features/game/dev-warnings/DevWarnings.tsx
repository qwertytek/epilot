import { useState } from 'react';

import { isDevelopmentApp } from '../../../app/environment';
import { BehindTheScenesCard } from './components/BehindTheScenesCard';

type DevWarningsProps = {
  hasGameState: boolean;
  hasLatestPrice: boolean;
  isCheckingResults: boolean;
  isGameStateFetching: boolean;
  isPriceFetching: boolean;
  isPriceStale: boolean;
};

const getBehindTheScenesFeedback = ({
  hasGameState,
  hasLatestPrice,
  isCheckingResults,
  isGameStateFetching,
  isPriceFetching,
  isPriceStale,
}: DevWarningsProps) =>
  [
    hasGameState && isGameStateFetching
      ? 'Refreshing game state in the background...'
      : null,
    hasLatestPrice && isPriceFetching
      ? 'Refreshing live price in the background...'
      : null,
    isCheckingResults ? 'Checking for results...' : null,
    hasLatestPrice && isPriceStale && !isPriceFetching
      ? 'Showing cached price while the latest price refreshes.'
      : null,
  ].filter((message): message is string => message !== null);

export const DevWarnings = (props: DevWarningsProps) => {
  const [showBehindTheScenes, setShowBehindTheScenes] = useState(false);

  if (!isDevelopmentApp) {
    return null;
  }

  const behindTheScenesFeedback = getBehindTheScenesFeedback(props);

  return (
    <>
      <div className="mt-8 border-t border-brand-border pt-5">
        <label className="behind-scenes-toggle">
          <span className="grid gap-1">
            <span className="text-sm font-semibold text-brand-navy">
              Behind the scenes
            </span>
            <span className="behind-scenes-warning">
              <span className="behind-scenes-warning-icon" aria-hidden="true">
                !
              </span>
              <span>Disabled in production using env production.</span>
            </span>
          </span>
          <input
            checked={showBehindTheScenes}
            className="sr-only"
            onChange={(event) => setShowBehindTheScenes(event.target.checked)}
            type="checkbox"
          />
          <span className="behind-scenes-switch" aria-hidden="true" />
        </label>
      </div>

      {showBehindTheScenes ? (
        <BehindTheScenesCard feedbackMessages={behindTheScenesFeedback} />
      ) : null}
    </>
  );
};
