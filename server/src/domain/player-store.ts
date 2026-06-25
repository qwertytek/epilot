import type { ActiveGuess } from '@epilot/api-contract';

export type Player = {
  userId: string;
  score: number;
  activeGuess?: ActiveGuess;
  createdAt: string;
  updatedAt: string;
};

export type PublicPlayerState = {
  userId: string;
  score: number;
  activeGuess?: ActiveGuess;
};

export type PlayerStore = ReturnType<typeof createPlayerStore>;

export const createPlayerStore = (
  players: Map<string, Player>,
  now: () => Date,
) => {
  const getOrCreate = (userId: string): Player => {
    const existingPlayer = players.get(userId);

    if (existingPlayer !== undefined) {
      return existingPlayer;
    }

    const timestamp = now().toISOString();
    const player: Player = {
      userId,
      score: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    players.set(userId, player);
    return player;
  };

  const toPublicState = (player: Player): PublicPlayerState => {
    const state: PublicPlayerState = {
      userId: player.userId,
      score: player.score,
    };

    if (player.activeGuess !== undefined) {
      state.activeGuess = player.activeGuess;
    }

    return state;
  };

  return { getOrCreate, toPublicState };
};
