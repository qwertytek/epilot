import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const liveApiBaseUrl = env.VITE_API_BASE_LIVE?.trim();
  const isLiveTarget = mode === 'live';

  if (
    isLiveTarget &&
    (liveApiBaseUrl === undefined ||
      liveApiBaseUrl === '' ||
      liveApiBaseUrl.includes('your-api-id'))
  ) {
    throw new Error(
      'Missing VITE_API_BASE_LIVE. Set it in client/.env or the build environment before using --mode live.',
    );
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      strictPort: true,
    },
  };
});
