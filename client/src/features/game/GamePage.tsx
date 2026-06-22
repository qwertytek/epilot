import { GameHeader } from './components/GameHeader';
import { GuessControls } from './components/GuessControls';
import { PriceDisplay } from './components/PriceDisplay';

import './game.css';

const GamePage = () => (
  <div className="app-shell flex items-center text-brand-navy">
    <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <div className="rounded-3xl border border-brand-border bg-white p-6 shadow-sm sm:p-10">
        <GameHeader score={240} />

        <div className="game-content-grid mt-9 border-t border-brand-border pt-8">
          <PriceDisplay price="$67,482.15" updatedAt="just now" />
          <GuessControls label="Which way will it move?" />
        </div>
      </div>
    </main>
  </div>
);

export { GamePage };
