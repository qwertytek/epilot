import { randomUUID } from 'node:crypto';

import type {
  CreateActiveGuessInput,
  Player,
  PlayerStore,
  ResolveActiveGuessInput,
  StoredActiveGuess,
} from '../domain/player-store.js';
import { toPublicPlayerState } from '../domain/player-store.js';

type DynamoCommand = unknown;

type DynamoDocumentClient = {
  send: <T>(command: DynamoCommand) => Promise<T>;
};

type DynamoDbModules = {
  DynamoDBClient: new (config: {
    endpoint?: string;
    region?: string;
  }) => unknown;
  DynamoDBDocumentClient: {
    from: (client: unknown) => DynamoDocumentClient;
  };
  GetCommand: new (input: unknown) => DynamoCommand;
  PutCommand: new (input: unknown) => DynamoCommand;
  UpdateCommand: new (input: unknown) => DynamoCommand;
};

type DynamoGetResponse = {
  Item?: Player;
};

type DynamoUpdateResponse = {
  Attributes?: Player;
};

export type DynamoDbPlayerStoreOptions = {
  tableName: string;
  endpoint?: string;
  region?: string;
  now: () => Date;
  documentClient?: DynamoDocumentClient;
  modules?: DynamoDbModules;
};

const conditionalFailureName = 'ConditionalCheckFailedException';

const isConditionalFailure = (error: unknown): boolean =>
  error instanceof Error && error.name === conditionalFailureName;

const loadDynamoDbModules = async (): Promise<DynamoDbModules> => {
  const dynamicImport = new Function(
    'specifier',
    'return import(specifier)',
  ) as (specifier: string) => Promise<Record<string, unknown>>;
  const clientModule = await dynamicImport('@aws-sdk/client-dynamodb');
  const documentModule = await dynamicImport('@aws-sdk/lib-dynamodb');

  return {
    DynamoDBClient:
      clientModule.DynamoDBClient as DynamoDbModules['DynamoDBClient'],
    DynamoDBDocumentClient:
      documentModule.DynamoDBDocumentClient as DynamoDbModules['DynamoDBDocumentClient'],
    GetCommand: documentModule.GetCommand as DynamoDbModules['GetCommand'],
    PutCommand: documentModule.PutCommand as DynamoDbModules['PutCommand'],
    UpdateCommand:
      documentModule.UpdateCommand as DynamoDbModules['UpdateCommand'],
  };
};

const createDocumentClient = async ({
  endpoint,
  region,
  documentClient,
  modules,
}: Pick<
  DynamoDbPlayerStoreOptions,
  'endpoint' | 'region' | 'documentClient' | 'modules'
>): Promise<{
  client: DynamoDocumentClient;
  modules: DynamoDbModules;
}> => {
  const loadedModules = modules ?? (await loadDynamoDbModules());

  if (documentClient !== undefined) {
    return { client: documentClient, modules: loadedModules };
  }

  const client = new loadedModules.DynamoDBClient({ endpoint, region });

  return {
    client: loadedModules.DynamoDBDocumentClient.from(client),
    modules: loadedModules,
  };
};

export const createDynamoDbPlayerStore = ({
  tableName,
  endpoint,
  region,
  now,
  documentClient,
  modules,
}: DynamoDbPlayerStoreOptions): PlayerStore => {
  const setup = createDocumentClient({
    endpoint,
    region,
    documentClient,
    modules,
  });

  const get = async (userId: string): Promise<Player | undefined> => {
    const { client, modules: dynamo } = await setup;
    const response = await client.send<DynamoGetResponse>(
      new dynamo.GetCommand({
        TableName: tableName,
        Key: { userId },
      }),
    );

    return response.Item;
  };

  const getOrCreate = async (userId: string): Promise<Player> => {
    const { client, modules: dynamo } = await setup;
    const existingPlayer = await get(userId);

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

    try {
      await client.send(
        new dynamo.PutCommand({
          TableName: tableName,
          Item: player,
          ConditionExpression: 'attribute_not_exists(userId)',
        }),
      );

      return player;
    } catch (error) {
      if (isConditionalFailure(error)) {
        const createdByConcurrentRequest = await get(userId);

        if (createdByConcurrentRequest !== undefined) {
          return createdByConcurrentRequest;
        }
      }

      throw error;
    }
  };

  const createGuess = async (
    userId: string,
    activeGuess: CreateActiveGuessInput,
  ): Promise<Player> => {
    const { client, modules: dynamo } = await setup;
    const existingPlayer = await getOrCreate(userId);
    const guess: StoredActiveGuess = {
      id: randomUUID(),
      ...activeGuess,
    };

    try {
      const response = await client.send<DynamoUpdateResponse>(
        new dynamo.UpdateCommand({
          TableName: tableName,
          Key: { userId },
          UpdateExpression: 'SET activeGuess = :guess, updatedAt = :updatedAt',
          ConditionExpression: 'attribute_not_exists(activeGuess)',
          ExpressionAttributeValues: {
            ':guess': guess,
            ':updatedAt': activeGuess.createdAt,
          },
          ReturnValues: 'ALL_NEW',
        }),
      );

      return response.Attributes ?? { ...existingPlayer, activeGuess: guess };
    } catch (error) {
      if (isConditionalFailure(error)) {
        throw new Error('ACTIVE_GUESS_EXISTS', { cause: error });
      }

      throw error;
    }
  };

  const resolveGuess = async (
    userId: string,
    { activeGuess, scoreDelta, updatedAt }: ResolveActiveGuessInput,
  ): Promise<Player> => {
    const { client, modules: dynamo } = await setup;
    const expressionAttributeValues: Record<string, unknown> = {
      ':guessId': activeGuess.id,
      ':scoreDelta': scoreDelta,
      ':updatedAt': updatedAt,
    };

    try {
      const response = await client.send<DynamoUpdateResponse>(
        new dynamo.UpdateCommand({
          TableName: tableName,
          Key: { userId },
          UpdateExpression:
            'SET score = score + :scoreDelta, updatedAt = :updatedAt REMOVE activeGuess',
          ConditionExpression: 'activeGuess.id = :guessId',
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW',
        }),
      );

      if (response.Attributes === undefined) {
        throw new Error('NO_ACTIVE_GUESS');
      }

      return response.Attributes;
    } catch (error) {
      if (isConditionalFailure(error)) {
        throw new Error('NO_ACTIVE_GUESS', { cause: error });
      }

      throw error;
    }
  };

  return {
    getOrCreate,
    createGuess,
    resolveGuess,
    toPublicState: toPublicPlayerState,
  };
};
