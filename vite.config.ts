import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite';
import { registerApiMiddlewares, type EnvVars } from './server/api';

function userDataPlugin(env: EnvVars): Plugin {
  return {
    name: 'user-data-api',
    configureServer(server: ViteDevServer) {
      registerApiMiddlewares(
        (route, handler) => server.middlewares.use(route, handler),
        env,
        __dirname
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '') as EnvVars;
  return {
    plugins: [react(), tailwindcss(), userDataPlugin(env)],
    define: {
      'process.env.AI_API_KEY': JSON.stringify(env.AI_API_KEY),
      'process.env.AI_MODEL': JSON.stringify(env.AI_MODEL),
      'process.env.AI_BASE_URL': JSON.stringify(env.AI_BASE_URL),
      'process.env.AI_APP_ID': JSON.stringify(env.AI_APP_ID),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
