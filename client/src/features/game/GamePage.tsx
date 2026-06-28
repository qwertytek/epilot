import { GameHeader } from './components/GameHeader.js';
import { GameWarnings } from './components/GameWarnings.js';
import { GuessPanel } from './components/GuessPanel.js';
import { PriceDisplay } from './components/PriceDisplay.js';
import { DevWarnings } from './dev-warnings/DevWarnings.js';
import { useGamePageState } from './state/index.js';

import './game.css';

const GamePage = () => {
  const game = useGamePageState();

  return (
    <div className="app-shell flex items-center text-brand-navy">
      <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="rounded-3xl border border-brand-border bg-white p-6 shadow-sm sm:p-10">
          <GameHeader score={game.score} />

          <GameWarnings warnings={game.warnings} />

          <div className="game-content-grid mt-9 border-t border-brand-border pt-8">
            <PriceDisplay {...game.priceDisplayProps} />

            <GuessPanel {...game.guessPanelProps} />
          </div>

          <DevWarnings {...game.devWarningProps} />
        </div>
      </main>
    </div>
  );
};

export { GamePage };
