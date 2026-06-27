type FrontendEnv = {
  MODE?: string;
  VITE_API_BASE_LIVE?: string;
  VITE_API_BASE_LOCAL?: string;
  VITE_APP_ENV?: string;
};

const env = (import.meta as ImportMeta & { env?: FrontendEnv }).env;

const frontendMode = env?.MODE ?? 'development';
const appEnvironment = env?.VITE_APP_ENV ?? 'development';
const isProductionApp = appEnvironment === 'production';
const isDevelopmentApp = !isProductionApp;

export { appEnvironment, env, frontendMode, isDevelopmentApp };
