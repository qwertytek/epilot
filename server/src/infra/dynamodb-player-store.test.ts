import assert from 'node:assert/strict';
import test from 'node:test';

import type { Player } from '../domain/player-store.js';
import {
  createDynamoDbPlayerStore,
  type DynamoDbPlayerStoreOptions,
} from './dynamodb-player-store.js';

type CommandInput = Record<string, unknown>;

class FakeCommand {
  readonly input: CommandInput;

  constructor(input: unknown) {
    this.input = input as CommandInput;
  }
}

class FakeGetCommand extends FakeCommand {}

class FakePutCommand extends FakeCommand {}

class FakeUpdateCommand extends FakeCommand {}

const modules: NonNullable<DynamoDbPlayerStoreOptions['modules']> = {
  DynamoDBClient: class {},
  DynamoDBDocumentClient: {
    from: () => {
      throw new Error('document client should be provided by the test');
    },
  },
  GetCommand: FakeGetCommand,
  PutCommand: FakePutCommand,
  UpdateCommand: FakeUpdateCommand,
};

const createConditionalFailure = (): Error => {
  const error = new Error('conditional failure');
  error.name = 'ConditionalCheckFailedException';
  return error;
};

const createStore = (
  send: (command: FakeCommand) => Promise<unknown>,
  now = () => new Date('2026-06-25T12:00:00.000Z'),
) =>
  createDynamoDbPlayerStore({
    tableName: 'players',
    now,
    modules,
    documentClient: {
      send: async <T>(command: unknown): Promise<T> =>
        (await send(command as FakeCommand)) as T,
    },
  });

test('DynamoDB player store lazily creates a player item', async () => {
  const commands: FakeCommand[] = [];
  const store = createStore(async (command) => {
    commands.push(command);

    if (commands.length === 1) {
      return {};
    }

    return {};
  });

  const player = await store.getOrCreate('user-1');

  assert.deepEqual(player, {
    userId: 'user-1',
    score: 0,
    createdAt: '2026-06-25T12:00:00.000Z',
    updatedAt: '2026-06-25T12:00:00.000Z',
  });
  assert.equal(commands[0]?.input.TableName, 'players');
  assert.deepEqual(commands[0]?.input.Key, { userId: 'user-1' });
  assert.equal(
    commands[1]?.input.ConditionExpression,
    'attribute_not_exists(userId)',
  );
  assert.equal(
    (commands[1]?.input.Item as Player | undefined)?.activeGuess,
    undefined,
  );
});

test('DynamoDB player store preserves existing score and active guess', async () => {
  const existingPlayer: Player = {
    userId: 'user-1',
    score: 3,
    activeGuess: {
      id: 'guess-1',
      direction: 'DOWN',
      startPriceUsd: 100,
      createdAt: '2026-06-25T12:00:00.000Z',
      eligibleAt: '2026-06-25T12:01:00.000Z',
    },
    createdAt: '2026-06-25T11:00:00.000Z',
    updatedAt: '2026-06-25T12:00:00.000Z',
  };
  const commands: FakeCommand[] = [];
  const store = createStore(async (command) => {
    commands.push(command);
    return { Item: existingPlayer };
  });

  const player = await store.getOrCreate('user-1');

  assert.deepEqual(player, existingPlayer);
  assert.equal(commands.length, 1);
  assert.ok(commands[0] instanceof FakeGetCommand);
});

test('DynamoDB player store persists active guess with generated id', async () => {
  const commands: FakeCommand[] = [];
  const store = createStore(async (command) => {
    commands.push(command);

    if (command instanceof FakeGetCommand) {
      return {
        Item: {
          userId: 'user-1',
          score: 0,
          createdAt: '2026-06-25T12:00:00.000Z',
          updatedAt: '2026-06-25T12:00:00.000Z',
        },
      };
    }

    if (command instanceof FakeUpdateCommand) {
      const guess = (
        command.input.ExpressionAttributeValues as Record<string, unknown>
      )[':guess'] as Player['activeGuess'];

      return {
        Attributes: {
          userId: 'user-1',
          score: 0,
          activeGuess: guess,
          createdAt: '2026-06-25T12:00:00.000Z',
          updatedAt: '2026-06-25T12:00:10.000Z',
        },
      };
    }

    throw new Error('unexpected command');
  });

  const player = await store.createGuess('user-1', {
    direction: 'UP',
    startPriceUsd: 101,
    createdAt: '2026-06-25T12:00:10.000Z',
    eligibleAt: '2026-06-25T12:01:10.000Z',
  });

  assert.equal(player.activeGuess?.direction, 'UP');
  assert.equal(player.activeGuess?.startPriceUsd, 101);
  assert.equal(typeof player.activeGuess?.id, 'string');
  assert.equal(
    commands.find((command) => command instanceof FakeUpdateCommand)?.input
      .ConditionExpression,
    'attribute_not_exists(activeGuess)',
  );
});

test('DynamoDB player store maps conditional create failure to active guess conflict', async () => {
  const existingPlayer: Player = {
    userId: 'user-1',
    score: 0,
    activeGuess: {
      id: 'guess-1',
      direction: 'UP',
      startPriceUsd: 100,
      createdAt: '2026-06-25T12:00:00.000Z',
      eligibleAt: '2026-06-25T12:01:00.000Z',
    },
    createdAt: '2026-06-25T12:00:00.000Z',
    updatedAt: '2026-06-25T12:00:00.000Z',
  };
  const store = createStore(async (command) => {
    if (command instanceof FakeGetCommand) {
      return { Item: existingPlayer };
    }

    throw createConditionalFailure();
  });

  await assert.rejects(
    store.createGuess('user-1', {
      direction: 'DOWN',
      startPriceUsd: 101,
      createdAt: '2026-06-25T12:00:30.000Z',
      eligibleAt: '2026-06-25T12:01:30.000Z',
    }),
    /ACTIVE_GUESS_EXISTS/,
  );
});

test('DynamoDB player store maps conditional resolve failure to no active guess', async () => {
  const store = createStore(async (command) => {
    if (command instanceof FakeUpdateCommand) {
      throw createConditionalFailure();
    }

    throw new Error('unexpected command');
  });

  await assert.rejects(
    store.resolveGuess('user-1', {
      activeGuess: {
        id: 'guess-1',
        direction: 'UP',
        startPriceUsd: 100,
        createdAt: '2026-06-25T12:00:00.000Z',
        eligibleAt: '2026-06-25T12:01:00.000Z',
      },
      scoreDelta: 1,
      updatedAt: '2026-06-25T12:01:00.000Z',
    }),
    /NO_ACTIVE_GUESS/,
  );
});

test('DynamoDB player store conditionally resolves and removes activeGuess', async () => {
  const commands: FakeCommand[] = [];
  const resolvedPlayer: Player = {
    userId: 'user-1',
    score: 1,
    createdAt: '2026-06-25T12:00:00.000Z',
    updatedAt: '2026-06-25T12:01:00.000Z',
  };
  const store = createStore(async (command) => {
    commands.push(command);
    return { Attributes: resolvedPlayer };
  });

  const player = await store.resolveGuess('user-1', {
    activeGuess: {
      id: 'guess-1',
      direction: 'UP',
      startPriceUsd: 100,
      createdAt: '2026-06-25T12:00:00.000Z',
      eligibleAt: '2026-06-25T12:01:00.000Z',
    },
    scoreDelta: 1,
    updatedAt: '2026-06-25T12:01:00.000Z',
  });

  assert.equal(player.activeGuess, undefined);
  assert.equal(player.score, 1);
  assert.match(
    String(commands[0]?.input.UpdateExpression),
    /REMOVE activeGuess/,
  );
  assert.equal(
    commands[0]?.input.ConditionExpression,
    'activeGuess.id = :guessId',
  );
});

test('DynamoDB player store repeated resolve cannot score twice', async () => {
  let resolveAttempts = 0;
  const resolvedPlayer: Player = {
    userId: 'user-1',
    score: 1,
    createdAt: '2026-06-25T12:00:00.000Z',
    updatedAt: '2026-06-25T12:01:00.000Z',
  };
  const store = createStore(async (command) => {
    if (command instanceof FakeUpdateCommand) {
      resolveAttempts += 1;

      if (resolveAttempts === 1) {
        return { Attributes: resolvedPlayer };
      }

      throw createConditionalFailure();
    }

    throw new Error('unexpected command');
  });
  const input = {
    activeGuess: {
      id: 'guess-1',
      direction: 'UP' as const,
      startPriceUsd: 100,
      createdAt: '2026-06-25T12:00:00.000Z',
      eligibleAt: '2026-06-25T12:01:00.000Z',
    },
    scoreDelta: 1 as const,
    updatedAt: '2026-06-25T12:01:00.000Z',
  };

  const first = await store.resolveGuess('user-1', input);
  await assert.rejects(store.resolveGuess('user-1', input), /NO_ACTIVE_GUESS/);

  assert.equal(first.score, 1);
  assert.equal(resolveAttempts, 2);
});
