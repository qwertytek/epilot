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

test('DynamoDB player store maps conditional create failure to active guess conflict', async () => {
  const existingPlayer: Player = {
    userId: 'user-1',
    score: 0,
    activeGuess: {
      id: 'guess-1',
      direction: 'up',
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
      direction: 'down',
      startPriceUsd: 101,
      createdAt: '2026-06-25T12:00:30.000Z',
      eligibleAt: '2026-06-25T12:01:30.000Z',
    }),
    /ACTIVE_GUESS_EXISTS/,
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
      direction: 'up',
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
