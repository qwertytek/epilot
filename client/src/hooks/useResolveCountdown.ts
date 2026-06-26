import { useEffect, useState } from 'react';
import type { ActiveGuess } from '@epilot/api-contract';

const useResolveCountdown = (activeGuess: ActiveGuess | null) => {
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
    resolveWaitSeconds: Math.ceil(resolveWaitMs / 1_000),
  };
};

export { useResolveCountdown };
