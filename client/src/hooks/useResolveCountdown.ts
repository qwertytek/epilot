import { useEffect, useState } from 'react';
import type { ActiveGuess } from '@epilot/api-contract';

const useResolveCountdown = (
  activeGuess: ActiveGuess | null,
  isBusy: boolean,
) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!activeGuess) {
      return undefined;
    }

    setNow(Date.now());

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [activeGuess?.eligibleAt, activeGuess?.id]);

  const resolveWaitMs = activeGuess
    ? Math.max(0, Date.parse(activeGuess.eligibleAt) - now)
    : 0;

  return {
    canResolve: activeGuess !== null && resolveWaitMs === 0 && !isBusy,
    resolveWaitSeconds: Math.ceil(resolveWaitMs / 1_000),
  };
};

export { useResolveCountdown };
