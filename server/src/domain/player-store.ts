import type { ActiveGuess, GuessDirection } from '@epilot/api-contract';

export type StoredActiveGuess = ActiveGuess & {
  id?: string;
};

export type Player = {
  userId: string;
  score: number;
  activeGuess?: StoredActiveGuess;
  createdAt: string;
  updatedAt: string;
};

export type PublicPlayerState = {
  userId: string;
  score: number;
  activeGuess?: ActiveGuess;
};

export type CreateActiveGuessInput = {
  direction: GuessDirection;
  startPriceUsd: number;
  createdAt: string;
  eligibleAt: string;
};

export type ResolveActiveGuessInput = {
  activeGuess: StoredActiveGuess;
  scoreDelta: 1 | -1;
  updatedAt: string;
};

export type PlayerStore = {
  getOrCreate: (userId: string) => Promise<Player>;
  createGuess: (
    userId: string,
    activeGuess: CreateActiveGuessInput,
  ) => Promise<Player>;
  resolveGuess: (
    userId: string,
    input: ResolveActiveGuessInput,
  ) => Promise<Player>;
  toPublicState: (player: Player) => PublicPlayerState;
};

export const toPublicPlayerState = (player: Player): PublicPlayerState => {
  const state: PublicPlayerState = {
    userId: player.userId,
    score: player.score,
  };

  if (player.activeGuess !== undefined) {
    state.activeGuess = {
      direction: player.activeGuess.direction,
      startPriceUsd: player.activeGuess.startPriceUsd,
      createdAt: player.activeGuess.createdAt,
      eligibleAt: player.activeGuess.eligibleAt,
    };
  }

  return state;
};

export const createPlayerStore = (
  players: Map<string, Player>,
  now: () => Date,
): PlayerStore => {
  const getOrCreate = async (userId: string): Promise<Player> => {
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

  const createGuess = async (
    userId: string,
    activeGuess: CreateActiveGuessInput,
  ): Promise<Player> => {
    const player = await getOrCreate(userId);

    if (player.activeGuess !== undefined) {
      throw new Error('ACTIVE_GUESS_EXISTS');
    }

    player.activeGuess = activeGuess;
    player.updatedAt = activeGuess.createdAt;

    return player;
  };

  const resolveGuess = async (
    userId: string,
    { activeGuess, scoreDelta, updatedAt }: ResolveActiveGuessInput,
  ): Promise<Player> => {
    const player = await getOrCreate(userId);

    if (
      player.activeGuess === undefined ||
      player.activeGuess.createdAt !== activeGuess.createdAt
    ) {
      throw new Error('NO_ACTIVE_GUESS');
    }

    player.score += scoreDelta;
    delete player.activeGuess;
    player.updatedAt = updatedAt;

    return player;
  };

  return {
    getOrCreate,
    createGuess,
    resolveGuess,
    toPublicState: toPublicPlayerState,
  };
};
