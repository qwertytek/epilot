export const defaultSnapshotValidityMs = 30_000;
export const defaultProviderCacheTtlMs = 10_000;
export const defaultGuessEligibilityMs = 60_000;
export const defaultCoinGeckoRequestTimeoutMs = 5_000;
export const defaultCoinGeckoPriceUrl =
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';
export const defaultCorsAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

export const getNumberEnv = (name: string, fallback: number): number => {
  const value = process.env[name];

  if (value === undefined) {
    return fallback;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

export const getArrayEnv = (name: string, fallback: string[]): string[] => {
  const value = process.env[name];

  if (value === undefined) {
    return fallback;
  }

  const values = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  return values.length > 0 ? values : fallback;
};
