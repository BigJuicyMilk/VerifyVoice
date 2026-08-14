import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import { registerApiMiddlewares, type EnvVars } from './api';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(rootDir, 'dist');

// Match Vite's env-file priority: .env.local overrides .env.
// dotenv does not override vars already set, and the first file wins per key,
// so load .env.local first, then .env.
dotenv.config({ path: path.join(rootDir, '.env.local') });
dotenv.config({ path: path.join(rootDir, '.env') });

const env = process.env as unknown as EnvVars;

const app = express();

// All /api/* and /uploads endpoints (shared with the Vite dev server).
registerApiMiddlewares((route, handler) => app.use(route, handler), env, rootDir);

// Unknown API routes should 404 as JSON, not fall through to the SPA.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Static frontend build + SPA fallback.
app.use(express.static(distDir));
app.get('*', (_req, res) => {
  const indexFile = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexFile)) {
    res.status(503).send('Frontend not built. Run `npm run build` first.');
    return;
  }
  res.sendFile(indexFile);
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`[server] Ingrecheck listening on http://0.0.0.0:${port}`);
});
