import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv, type Plugin, type ViteDevServer} from 'vite';
import OpenAI from 'openai';

interface EnvVars {
  GEMINI_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  APP_ID?: string;
}

function userDataPlugin(env: EnvVars): Plugin {
  const userFile = path.resolve(__dirname, 'data', 'user.json');
  const imagesDir = path.resolve(__dirname, 'data', 'images');
  const analysisDir = path.resolve(__dirname, 'data', 'analysis');

  return {
    name: 'user-data-api',
    configureServer(server: ViteDevServer) {
      // --- User API ---
      server.middlewares.use('/api/users', async (req, res, next) => {
        if (req.url !== '' && req.url !== '/') {
          next();
          return;
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method === 'GET') {
          try {
            const data = fs.existsSync(userFile) ? fs.readFileSync(userFile, 'utf-8') : '[]';
            res.end(data);
          } catch {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to read users' }));
          }
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              fs.writeFileSync(userFile, body, 'utf-8');
              res.end(JSON.stringify({ success: true }));
            } catch {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Failed to write users' }));
            }
          });
          return;
        }

        next();
      });

      // --- Image Upload API ---
      server.middlewares.use('/api/upload', async (req, res, next) => {
        if (req.url !== '' && req.url !== '/') {
          next();
          return;
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const { username, filename, data } = JSON.parse(body);
              if (!username || !filename || !data) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing fields' }));
                return;
              }

              const safeUsername = String(username).trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
              const userDir = path.join(imagesDir, safeUsername);
              if (!fs.existsSync(userDir)) {
                fs.mkdirSync(userDir, { recursive: true });
              }

              // Accept both raw base64 and data URLs (data:image/png;base64,...)
              let base64 = String(data);
              const commaIndex = base64.indexOf(',');
              if (base64.startsWith('data:') && commaIndex > -1) {
                base64 = base64.slice(commaIndex + 1);
              }

              const safeFilename = String(filename).replace(/[^a-zA-Z0-9._-]/g, '');
              const filePath = path.join(userDir, safeFilename);
              const buffer = Buffer.from(base64, 'base64');
              fs.writeFileSync(filePath, buffer);

              res.end(JSON.stringify({ success: true, path: `/uploads/${safeUsername}/${safeFilename}` }));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Failed to upload image: ' + err.message }));
            }
          });
          return;
        }

        next();
      });

      // --- List User Images API ---
      server.middlewares.use('/api/images', async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/')) {
          next();
          return;
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method === 'GET') {
          try {
            const rawUsername = req.url.slice(1).split('?')[0];
            const safeUsername = decodeURIComponent(rawUsername).trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
            const userDir = path.join(imagesDir, safeUsername);
            if (!fs.existsSync(userDir)) {
              res.end(JSON.stringify([]));
              return;
            }
            const files = fs.readdirSync(userDir).filter((f) => {
              const ext = path.extname(f).toLowerCase();
              return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);
            });
            res.end(JSON.stringify(files.map((f) => `/uploads/${safeUsername}/${f}`)));
          } catch {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to list images' }));
          }
          return;
        }

        next();
      });

      // --- Analyze API (Gemini OCR + DeepSeek analysis) ---
      server.middlewares.use('/api/analyze', async (req, res, next) => {
        if (req.url !== '' && req.url !== '/') {
          next();
          return;
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { userId, imagePath, question } = JSON.parse(body);
              if (!userId || !imagePath || !question) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing userId, imagePath, or question' }));
                return;
              }

              // Resolve image file path
              const relativePath = decodeURIComponent(imagePath).replace(/^\/uploads\//, '');
              const imageFilePath = path.join(imagesDir, relativePath);
              const resolvedImagePath = path.resolve(imageFilePath);
              const resolvedImagesDir = path.resolve(imagesDir);
              if (!resolvedImagePath.startsWith(resolvedImagesDir) || !fs.existsSync(resolvedImagePath)) {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'Image not found' }));
                return;
              }

              const imageBuffer = fs.readFileSync(resolvedImagePath);
              const imageBase64 = imageBuffer.toString('base64');
              const mimeType = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.bmp': 'image/bmp',
              }[path.extname(resolvedImagePath).toLowerCase()] || 'image/jpeg';

              // Step 1: Gemini OCR - extract ingredients and nutrients
              let extractedText = '';
              if (env.GEMINI_API_KEY) {
                const geminiRes = await fetch(
                  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      contents: [
                        {
                          parts: [
                            {
                              text: 'Extract all ingredients from this product ingredient-list image. List them clearly and completely. Also note any nutritional information if visible. If you cannot read something, note it as [unreadable].',
                            },
                            {
                              inlineData: {
                                mimeType: mimeType,
                                data: imageBase64,
                              },
                            },
                          ],
                        },
                      ],
                    }),
                  }
                );
                const geminiData = await geminiRes.json();
                extractedText =
                  geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
                  'No text could be extracted from the image.';
              } else {
                extractedText = 'Gemini API key not configured. Skipping OCR.';
              }

              // Step 2: DeepSeek analysis via Qianfan endpoint (see deepseek.py)
              let deepseekResult = '';
              let deepseekRaw = null;
              if (env.DEEPSEEK_API_KEY) {
                const client = new OpenAI({
                  apiKey: env.DEEPSEEK_API_KEY,
                  baseURL: 'https://qianfan.baidubce.com/v2',
                  defaultHeaders: env.APP_ID ? { appid: env.APP_ID } : undefined,
                });

                const completion = await client.chat.completions.create({
                  model: 'deepseek-v3.2',
                  messages: [
                    {
                      role: 'system',
                      content:
                        'You are a helpful ingredient-list analysis expert. You read product ingredient lists and answer questions about them accurately, concisely, and in plain language. Be honest when you are unsure.',
                    },
                    {
                      role: 'user',
                      content: `Ingredients extracted from the product label:\n${extractedText}\n\nUser question: ${question}\n\nPlease answer the question based only on the ingredient list above. If the list clearly supports the answer, say so confidently. If it does not, explain why. If you are unsure, say so. Keep your answer concise but informative.`,
                    },
                  ],
                  stream: false,
                });

                deepseekRaw = completion;
                deepseekResult =
                  completion.choices?.[0]?.message?.content ||
                  'No analysis available.';
              } else {
                deepseekResult = 'DeepSeek API key not configured. Skipping analysis.';
              }

              // Step 3: Save result to JSON
              const timestamp = new Date().toISOString();
              const safeUserId = String(userId).trim().replace(/[^a-zA-Z0-9_-]/g, '');
              const userAnalysisDir = path.join(analysisDir, safeUserId);
              if (!fs.existsSync(userAnalysisDir)) {
                fs.mkdirSync(userAnalysisDir, { recursive: true });
              }
              const analysisFileName = `${timestamp.replace(/[:.]/g, '-')}.json`;
              const analysisFilePath = path.join(userAnalysisDir, analysisFileName);
              const analysisRecord = {
                timestamp,
                imagePath,
                question,
                extractedText,
                deepseekResult,
                deepseekRaw,
              };
              fs.writeFileSync(analysisFilePath, JSON.stringify(analysisRecord, null, 2), 'utf-8');

              res.end(
                JSON.stringify({
                  success: true,
                  extractedText,
                  deepseekResult,
                  savedPath: `/analysis/${safeUserId}/${analysisFileName}`,
                })
              );
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Analysis failed: ' + err.message }));
            }
          });
          return;
        }

        next();
      });

      // --- Serve Uploaded Images Statically ---
      server.middlewares.use('/uploads', async (req, res, next) => {
        if (!req.url || req.url === '/') {
          res.statusCode = 404;
          res.end('Not found');
          return;
        }

        const filePath = path.join(imagesDir, decodeURIComponent(req.url));
        const resolvedPath = path.resolve(filePath);
        const resolvedImagesDir = path.resolve(imagesDir);
        if (!resolvedPath.startsWith(resolvedImagesDir)) {
          res.statusCode = 403;
          res.end('Forbidden');
          return;
        }

        if (!fs.existsSync(resolvedPath) || fs.statSync(resolvedPath).isDirectory()) {
          res.statusCode = 404;
          res.end('Not found');
          return;
        }

        const ext = path.extname(resolvedPath).toLowerCase();
        const mimeTypes: Record<string, string> = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          '.bmp': 'image/bmp',
        };
        res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
        res.end(fs.readFileSync(resolvedPath));
      });
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), userDataPlugin(env)],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.DEEPSEEK_API_KEY': JSON.stringify(env.DEEPSEEK_API_KEY),
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
