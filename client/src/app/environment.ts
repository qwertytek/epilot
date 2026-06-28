const frontendMode = import.meta.env?.MODE ?? 'development';
const apiBaseLiveUrl = import.meta.env?.VITE_API_BASE_LIVE;
const apiBaseLocalUrl = import.meta.env?.VITE_API_BASE_LOCAL;
const appEnvironment = import.meta.env?.VITE_APP_ENV ?? 'development';
const isProductionApp = appEnvironment === 'production';
const isDevelopmentApp = !isProductionApp;

export {
  apiBaseLiveUrl,
  apiBaseLocalUrl,
  appEnvironment,
  frontendMode,
  isDevelopmentApp,
};
