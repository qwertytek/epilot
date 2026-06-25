type Response = {
  statusCode: number;
  body: string;
};

export const handler = async (): Promise<Response> => ({
  statusCode: 200,
  body: JSON.stringify({ status: 'ok' }),
});
