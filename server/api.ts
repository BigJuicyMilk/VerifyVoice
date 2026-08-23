import path from 'path';
import fs from 'fs';
import OpenAI from 'openai';
import { initDb, getAllUsers, upsertUsers, addImage, getImagesByUserId, updateImageRating } from './db';
import { initCos, isCosEnabled, uploadImage, downloadImage, extractCosKey } from './cos';

export interface EnvVars {
  DATABASE_URL?: string;
  COS_SECRET_ID?: string;
  COS_SECRET_KEY?: string;
  COS_BUCKET?: string;
  COS_REGION?: string;
  COS_PREFIX?: string;
  COS_CDN_URL?: string;
  AI_API_KEY?: string;
  AI_MODEL?: string;
  AI_BASE_URL?: string;
  AI_APP_ID?: string;
  // Legacy names kept for backward compatibility
  DEEPSEEK_API_KEY?: string;
  APP_ID?: string;
}

type ServerLang = 'en' | 'hi' | 'ar' | 'zh' | 'es';

const serverMessages: Record<ServerLang, Record<string, string>> = {
  en: {
    noApiKeyOcr: 'AI API key not configured. Skipping OCR.',
    noApiKeyAnalysis: 'AI API key not configured. Skipping analysis.',
    noTextExtracted: 'No text could be extracted from the image.',
    noAnalysis: 'No analysis available.',
    noIngredients: 'No ingredients could be extracted from the image.',
    noAnswer: 'I could not generate an answer. Please try again.',
    noApiKey: 'AI API key not configured.',
    noApiKeyLearn: 'AI API key is not configured, so I cannot answer right now. Please set AI_API_KEY in your environment.',
  },
  hi: {
    noApiKeyOcr: 'AI API कुंजी कॉन्फ़िगर नहीं है। OCR छोड़ा जा रहा है।',
    noApiKeyAnalysis: 'AI API कुंजी कॉन्फ़िगर नहीं है। विश्लेषण छोड़ा जा रहा है।',
    noTextExtracted: 'छवि से कोई टेक्स्ट निकाला नहीं जा सका।',
    noAnalysis: 'कोई विश्लेषण उपलब्ध नहीं है।',
    noIngredients: 'छवि से कोई सामग्री निकाली नहीं जा सकी।',
    noAnswer: 'मैं उत्तर जनरेट नहीं कर सका। कृपया पुनः प्रयास करें।',
    noApiKey: 'AI API कुंजी कॉन्फ़िगर नहीं है।',
    noApiKeyLearn: 'AI API कुंजी कॉन्फ़िगर नहीं है, इसलिए मैं अभी उत्तर नहीं दे सकता। कृपया अपने environment में AI_API_KEY सेट करें।',
  },
  ar: {
    noApiKeyOcr: 'مفتاح API للذكاء الاصطناعي غير مُكوّن. يتم تخطي التعرف الضوئي على الحروف.',
    noApiKeyAnalysis: 'مفتاح API للذكاء الاصطناعي غير مُكوّن. يتم تخطي التحليل.',
    noTextExtracted: 'تعذّر استخراج أي نص من الصورة.',
    noAnalysis: 'لا يوجد تحليل متاح.',
    noIngredients: 'تعذّر استخراج أي مكونات من الصورة.',
    noAnswer: 'لم أتمكن من إنشاء إجابة. يرجى المحاولة مرة أخرى.',
    noApiKey: 'مفتاح API للذكاء الاصطناعي غير مُكوّن.',
    noApiKeyLearn: 'مفتاح API للذكاء الاصطناعي غير مُكوّن، لذا لا يمكنني الإجابة الآن. يرجى ضبط AI_API_KEY في بيئتك.',
  },
  zh: {
    noApiKeyOcr: '未配置 AI API 密钥，跳过 OCR。',
    noApiKeyAnalysis: '未配置 AI API 密钥，跳过分析。',
    noTextExtracted: '无法从图片中提取文字。',
    noAnalysis: '暂无分析结果。',
    noIngredients: '无法从图片中提取配料。',
    noAnswer: '无法生成答案，请重试。',
    noApiKey: '未配置 AI API 密钥。',
    noApiKeyLearn: '未配置 AI API 密钥，因此我暂时无法回答。请在环境变量中设置 AI_API_KEY。',
  },
  es: {
    noApiKeyOcr: 'La clave de API de IA no está configurada. Omitiendo OCR.',
    noApiKeyAnalysis: 'La clave de API de IA no está configurada. Omitiendo análisis.',
    noTextExtracted: 'No se pudo extraer texto de la imagen.',
    noAnalysis: 'No hay análisis disponible.',
    noIngredients: 'No se pudieron extraer ingredientes de la imagen.',
    noAnswer: 'No pude generar una respuesta. Inténtalo de nuevo.',
    noApiKey: 'La clave de API de IA no está configurada.',
    noApiKeyLearn: 'La clave de API de IA no está configurada, así que no puedo responder ahora. Configura AI_API_KEY en tu entorno.',
  },
};

function serverT(language: string | undefined, key: keyof typeof serverMessages.en): string {
  const lang = (language || 'en') as ServerLang;
  return serverMessages[lang]?.[key] ?? serverMessages.en[key];
}

// Minimal connect/express-compatible middleware types.
type NextFn = () => void;
type Middleware = (req: any, res: any, next: NextFn) => void;
export type UseFn = (path: string, handler: Middleware) => unknown;

/**
 * Registers all /api/* and /uploads middlewares on a connect-compatible
 * server (Vite dev server or Express). Initializes the DB and COS.
 * `rootDir` is the project root (where `data/` and `.env` live).
 */
export function registerApiMiddlewares(use: UseFn, env: EnvVars, rootDir: string): void {
  const imagesDir = path.resolve(rootDir, 'data', 'images');
  const analysisDir = path.resolve(rootDir, 'data', 'analysis');
  const dbPath = env.DATABASE_URL
    ? path.resolve(env.DATABASE_URL)
    : path.resolve(rootDir, 'data', 'verifyvoice.db');

  initDb(dbPath);

  const cosReady = initCos({
    secretId: env.COS_SECRET_ID,
    secretKey: env.COS_SECRET_KEY,
    bucket: env.COS_BUCKET,
    region: env.COS_REGION,
    prefix: env.COS_PREFIX,
    cdnUrl: env.COS_CDN_URL,
  });

  if (!cosReady) {
    console.warn('[cos] COS not fully configured; image uploads will fall back to local disk.');
  }

  // --- User API ---
  use('/api/users', async (req, res, next) => {
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
        const users = getAllUsers();
        res.end(JSON.stringify(users));
      } catch (err: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Failed to read users: ' + err.message }));
      }
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: Buffer) => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          const users = Array.isArray(parsed)
            ? parsed
            : parsed && typeof parsed === 'object'
            ? [parsed]
            : null;

          if (!users) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Expected a user object or array of users' }));
            return;
          }

          upsertUsers(users);
          res.end(JSON.stringify({ success: true }));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Failed to write users: ' + err.message }));
        }
      });
      return;
    }

    next();
  });

  // --- Image Upload API ---
  use('/api/upload', async (req, res, next) => {
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
      req.on('data', (chunk: Buffer) => { body += chunk; });
      req.on('end', () => {
        (async () => {
          try {
            const { username, filename, data } = JSON.parse(body);
            if (!username || !filename || !data) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing fields' }));
              return;
            }

            const safeUsername = String(username).trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
            let safeFilename = String(filename).replace(/[^a-zA-Z0-9._-]/g, '');
            // Non-ASCII names (e.g. Chinese) can sanitize to "" or a dotfile like
            // ".jpg", which breaks serving and can even target the directory itself.
            if (!safeFilename || safeFilename.startsWith('.')) {
              const ext = path.extname(safeFilename) || '.jpg';
              safeFilename = `image_${Date.now()}${ext}`;
            }

            // Accept both raw base64 and data URLs (data:image/png;base64,...)
            let base64 = String(data);
            const commaIndex = base64.indexOf(',');
            if (base64.startsWith('data:') && commaIndex > -1) {
              base64 = base64.slice(commaIndex + 1);
            }

            const buffer = Buffer.from(base64, 'base64');
            let imageUrl: string;
            let cosKey: string;

            if (isCosEnabled()) {
              const result = await uploadImage(safeUsername, safeFilename, buffer);
              imageUrl = result.url;
              cosKey = result.key;
            } else {
              const userDir = path.join(imagesDir, safeUsername);
              if (!fs.existsSync(userDir)) {
                fs.mkdirSync(userDir, { recursive: true });
              }
              const filePath = path.join(userDir, safeFilename);
              fs.writeFileSync(filePath, buffer);
              imageUrl = `/uploads/${safeUsername}/${safeFilename}`;
              cosKey = filePath;
            }

            addImage({
              user_id: safeUsername,
              filename: safeFilename,
              cos_key: cosKey,
              cos_url: imageUrl,
            });

            res.end(JSON.stringify({ success: true, path: imageUrl }));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to upload image: ' + err.message }));
          }
        })();
      });
      return;
    }

    next();
  });

  // --- List User Images API ---
  use('/api/images', async (req, res, next) => {
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
        const images = getImagesByUserId(safeUsername);
        res.end(JSON.stringify(images));
      } catch (err: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Failed to list images: ' + err.message }));
      }
      return;
    }

    next();
  });

  // --- Rate Image API ---
  use('/api/rate', async (req, res, next) => {
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
      req.on('data', (chunk: Buffer) => { body += chunk; });
      req.on('end', () => {
        try {
          const { imageUrl, rating } = JSON.parse(body);
          if (!imageUrl || typeof rating !== 'number' || rating < 1 || rating > 5) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing or invalid imageUrl/rating. Rating must be 1-5.' }));
            return;
          }

          updateImageRating(imageUrl, rating);
          res.end(JSON.stringify({ success: true }));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Failed to save rating: ' + err.message }));
        }
      });
      return;
    }

    next();
  });

  // --- Analyze API (Gemini OCR + DeepSeek analysis) ---
  use('/api/analyze', async (req, res, next) => {
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
      req.on('data', (chunk: Buffer) => { body += chunk; });
      req.on('end', () => {
        (async () => {
          try {
            const { userId, imagePath, question, language, mode } = JSON.parse(body);
            if (!userId || !imagePath || !question) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing userId, imagePath, or question' }));
              return;
            }

            let imageBuffer: Buffer;
            let mimeType: string;

            const imagePathStr = decodeURIComponent(imagePath);
            const ext = path.extname(imagePathStr.split('?')[0]).toLowerCase();
            const extToMime: Record<string, string> = {
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.png': 'image/png',
              '.gif': 'image/gif',
              '.webp': 'image/webp',
              '.bmp': 'image/bmp',
            };
            mimeType = extToMime[ext] || 'image/jpeg';

            if (imagePathStr.startsWith('http://') || imagePathStr.startsWith('https://')) {
              const cosKey = extractCosKey(imagePathStr);
              if (cosKey && isCosEnabled()) {
                // Private COS buckets cannot be fetched by plain URL; download with credentials.
                imageBuffer = await downloadImage(cosKey);
              } else {
                const response = await fetch(imagePathStr);
                if (!response.ok) {
                  res.statusCode = 404;
                  res.end(JSON.stringify({ error: 'Image not found at remote URL' }));
                  return;
                }
                const contentType = response.headers.get('content-type');
                if (contentType) {
                  mimeType = contentType.split(';')[0].trim() || mimeType;
                }
                const arrayBuffer = await response.arrayBuffer();
                imageBuffer = Buffer.from(arrayBuffer);
              }
            } else {
              // Resolve image file path
              const relativePath = imagePathStr.replace(/^\/uploads\//, '');
              const imageFilePath = path.join(imagesDir, relativePath);
              const resolvedImagePath = path.resolve(imageFilePath);
              const resolvedImagesDir = path.resolve(imagesDir);
              if (!resolvedImagePath.startsWith(resolvedImagesDir) || !fs.existsSync(resolvedImagePath)) {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'Image not found' }));
                return;
              }
              imageBuffer = fs.readFileSync(resolvedImagePath);
            }

            const imageBase64 = imageBuffer.toString('base64');

            // Use the LLM configured in .env for both OCR and analysis.
            const llmApiKey = env.AI_API_KEY || env.DEEPSEEK_API_KEY;
            const llmModel = env.AI_MODEL || 'deepseek-v3.2';
            const llmBaseUrl = env.AI_BASE_URL || 'https://qianfan.baidubce.com/v2';
            const llmAppId = env.AI_APP_ID || env.APP_ID;

            let extractedText = '';
            let analysisResult = '';
            let analysisRaw = null;
            let healthScore: number | null = null;
            let healthReason = '';

            if (!llmApiKey) {
              extractedText = serverT(language, 'noApiKeyOcr');
              analysisResult = serverT(language, 'noApiKeyAnalysis');
            } else {
              const client = new OpenAI({
                apiKey: llmApiKey,
                baseURL: llmBaseUrl,
                defaultHeaders: llmAppId ? { appid: llmAppId } : undefined,
              });

              // Step 1: Extract ingredients from the image using the configured LLM.
              const extractCompletion = await client.chat.completions.create({
                model: llmModel,
                messages: [
                  {
                    role: 'system',
                    content:
                      'You extract ingredient lists from product label images. List every ingredient clearly, one per line, preserving the original language of the label. If you cannot read something, mark it as [unreadable].',
                  },
                  {
                    role: 'user',
                    content: [
                      {
                        type: 'text',
                        text: 'Extract all ingredients from this product ingredient-list image.',
                      },
                      {
                        type: 'image_url',
                        image_url: { url: `data:${mimeType};base64,${imageBase64}` },
                      },
                    ],
                  },
                ],
                stream: false,
              });

              extractedText =
                extractCompletion.choices?.[0]?.message?.content ||
                serverT(language, 'noTextExtracted');

              // Step 2: Answer the user's question based on the extracted ingredients.
              const answerInstruction =
                mode === 'short'
                  ? 'Answer in 1-2 short sentences only. Give the direct answer first (yes/no/it depends), then the key reason. No extra detail, no lists.'
                  : 'Keep your answer concise but informative.';
              const completion = await client.chat.completions.create({
                model: llmModel,
                messages: [
                  {
                    role: 'system',
                    content:
                      'You are a helpful ingredient-list analysis expert. You read product ingredient lists and answer questions about them accurately, concisely, and in plain language. Be honest when you are unsure.',
                  },
                  {
                    role: 'user',
                    content: `Ingredients extracted from the product label:\n${extractedText}\n\nUser question: ${question}\n\nPlease answer the question based only on the ingredient list above. If the list clearly supports the answer, say so confidently. If it does not, explain why. If you are unsure, say so. ${answerInstruction} Respond in ${language || 'English'}.`,
                  },
                ],
                stream: false,
              });

              analysisRaw = completion;
              analysisResult =
                completion.choices?.[0]?.message?.content ||
                serverT(language, 'noAnalysis');

              // Step 3: Rate overall health based on the extracted ingredients.
              let healthScore: number | null = null;
              let healthReason = '';
              try {
                const healthCompletion = await client.chat.completions.create({
                  model: llmModel,
                  messages: [
                    {
                      role: 'system',
                      content:
                        'You are a nutrition expert. Based on a product\'s ingredient list, return valid JSON only with healthScore (integer 1-10) and healthReason (one sentence explaining the score in the user\'s language). Base the score on whole/minimally processed ingredients, added sugars, sodium, fiber, protein, and healthy fats.',
                    },
                    {
                      role: 'user',
                      content: `Ingredients extracted from the product label:\n${extractedText}\n\nReturn JSON: {"healthScore": number, "healthReason": "..."}\n\nRespond in ${language || 'English'}.`,
                    },
                  ],
                  stream: false,
                });
                const rawHealth =
                  healthCompletion.choices?.[0]?.message?.content || '';
                const cleanedHealth = rawHealth
                  .replace(/^```(?:json)?\s*/, '')
                  .replace(/\s*```$/, '');
                const parsedHealth = JSON.parse(cleanedHealth);
                healthScore =
                  typeof parsedHealth.healthScore === 'number'
                    ? Math.max(1, Math.min(10, parsedHealth.healthScore))
                    : null;
                healthReason = parsedHealth.healthReason || '';
              } catch {
                // Health rating is optional; ignore errors here.
              }
            }

            // Step 4: Save result to JSON
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
              analysisResult,
              healthScore,
              healthReason,
              analysisRaw,
            };
            fs.writeFileSync(analysisFilePath, JSON.stringify(analysisRecord, null, 2), 'utf-8');

            res.end(
              JSON.stringify({
                success: true,
                extractedText,
                analysisResult,
                healthScore,
                healthReason,
                savedPath: `/analysis/${safeUserId}/${analysisFileName}`,
              })
            );
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Analysis failed: ' + err.message }));
          }
        })();
      });
      return;
    }

    next();
  });

  // --- History API ---
  use('/api/history', async (req, res, next) => {
    if (!req.url || !req.url.startsWith('/')) {
      next();
      return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method === 'GET') {
      try {
        const rawUserId = req.url.slice(1).split('?')[0];
        const safeUserId = decodeURIComponent(rawUserId).trim().replace(/[^a-zA-Z0-9_-]/g, '');
        const userDir = path.join(analysisDir, safeUserId);
        if (!fs.existsSync(userDir)) {
          res.end(JSON.stringify([]));
          return;
        }

        const files = fs.readdirSync(userDir)
          .filter((f) => f.endsWith('.json'))
          .sort((a, b) => b.localeCompare(a));

        const records = files.map((f) => {
          const filePath = path.join(userDir, f);
          let record: Record<string, any> = {};
          try {
            record = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          } catch {
            // ignore malformed record
          }
          return {
            ...record,
            savedPath: `/analysis/${safeUserId}/${f}`,
          };
        });

        res.end(JSON.stringify(records));
      } catch (err: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Failed to load history: ' + err.message }));
      }
      return;
    }

    next();
  });

  // --- Learn Q&A API ---
  use('/api/learn', async (req, res, next) => {
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
      req.on('data', (chunk: Buffer) => { body += chunk; });
      req.on('end', async () => {
        try {
          const { question, language } = JSON.parse(body);
          if (!question || typeof question !== 'string') {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing question' }));
            return;
          }

          const llmApiKey = env.AI_API_KEY || env.DEEPSEEK_API_KEY;
          const llmModel = env.AI_MODEL || 'deepseek-v3.2';
          const llmBaseUrl = env.AI_BASE_URL || 'https://qianfan.baidubce.com/v2';
          const llmAppId = env.AI_APP_ID || env.APP_ID;

          if (!llmApiKey) {
            res.end(JSON.stringify({
              success: true,
              answer: serverT(language, 'noApiKeyLearn'),
            }));
            return;
          }

          const client = new OpenAI({
            apiKey: llmApiKey,
            baseURL: llmBaseUrl,
            defaultHeaders: llmAppId ? { appid: llmAppId } : undefined,
          });

          const completion = await client.chat.completions.create({
            model: llmModel,
            messages: [
              {
                role: 'system',
                content:
                  'You are a friendly nutrition and food-label expert. Answer the user\'s question about food, ingredients, nutrition labels, healthy eating, and product quality clearly and concisely. If you are unsure, say so.',
              },
              { role: 'user', content: `${question}\n\nRespond in ${language || 'English'}.` },
            ],
            stream: false,
          });

          const answer =
            completion.choices?.[0]?.message?.content ||
            serverT(language, 'noAnswer');

          res.end(JSON.stringify({ success: true, answer }));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Failed to get answer: ' + err.message }));
        }
      });
      return;
    }

    next();
  });

  // --- Extract Ingredients API ---
  use('/api/extract', async (req, res, next) => {
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
      req.on('data', (chunk: Buffer) => { body += chunk; });
      req.on('end', async () => {
        try {
          const { imagePath, language } = JSON.parse(body);
          if (!imagePath) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing imagePath' }));
            return;
          }

          const llmApiKey = env.AI_API_KEY || env.DEEPSEEK_API_KEY;
          const llmModel = env.AI_MODEL || 'deepseek-v3.2';
          const llmBaseUrl = env.AI_BASE_URL || 'https://qianfan.baidubce.com/v2';
          const llmAppId = env.AI_APP_ID || env.APP_ID;

          if (!llmApiKey) {
            res.statusCode = 503;
            res.end(JSON.stringify({ error: serverT(language, 'noApiKey') }));
            return;
          }

          // Resolve image file path or fetch remote URL
          const imagePathStr = decodeURIComponent(imagePath);
          const ext = path.extname(imagePathStr.split('?')[0]).toLowerCase();
          const extToMime: Record<string, string> = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.bmp': 'image/bmp',
          };
          const mimeType = extToMime[ext] || 'image/jpeg';

          let imageBuffer: Buffer;
          if (imagePathStr.startsWith('http://') || imagePathStr.startsWith('https://')) {
            const cosKey = extractCosKey(imagePathStr);
            if (cosKey && isCosEnabled()) {
              // Private COS buckets cannot be fetched by plain URL; download with credentials.
              imageBuffer = await downloadImage(cosKey);
            } else {
              const response = await fetch(imagePathStr);
              if (!response.ok) {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'Image not found at remote URL' }));
                return;
              }
              const arrayBuffer = await response.arrayBuffer();
              imageBuffer = Buffer.from(arrayBuffer);
            }
          } else {
            const relativePath = imagePathStr.replace(/^\/uploads\//, '');
            const imageFilePath = path.join(imagesDir, relativePath);
            const resolvedImagePath = path.resolve(imageFilePath);
            const resolvedImagesDir = path.resolve(imagesDir);
            if (!resolvedImagePath.startsWith(resolvedImagesDir) || !fs.existsSync(resolvedImagePath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Image not found' }));
              return;
            }
            imageBuffer = fs.readFileSync(resolvedImagePath);
          }

          const imageBase64 = imageBuffer.toString('base64');

          const client = new OpenAI({
            apiKey: llmApiKey,
            baseURL: llmBaseUrl,
            defaultHeaders: llmAppId ? { appid: llmAppId } : undefined,
          });

          const completion = await client.chat.completions.create({
            model: llmModel,
            messages: [
              {
                role: 'system',
                content:
                  'You extract ingredient lists from product label images. List every ingredient clearly, one per line. If you cannot read something, mark it as [unreadable].',
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Extract all ingredients from this product ingredient-list image.',
                  },
                  {
                    type: 'image_url',
                    image_url: { url: `data:${mimeType};base64,${imageBase64}` },
                  },
                ],
              },
            ],
            stream: false,
          });

          const extractedText =
            completion.choices?.[0]?.message?.content ||
            serverT(language, 'noIngredients');

          res.end(JSON.stringify({ success: true, extractedText }));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Extraction failed: ' + err.message }));
        }
      });
      return;
    }

    next();
  });

  // --- Product Comparison API ---
  use('/api/compare', async (req, res, next) => {
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
      req.on('data', (chunk: Buffer) => { body += chunk; });
      req.on('end', async () => {
        try {
          const parsedBody = JSON.parse(body);
          const language = parsedBody.language;
          let products: { name?: string; ingredients?: string; nutrition?: string }[] = [];

          if (Array.isArray(parsedBody.products)) {
            products = parsedBody.products;
          } else if (parsedBody.productA && parsedBody.productB) {
            // Legacy two-product format
            products = [parsedBody.productA, parsedBody.productB];
          }

          if (products.length < 2 || products.some((p) => !p.name)) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Need at least 2 products with names' }));
            return;
          }

          const llmApiKey = env.AI_API_KEY || env.DEEPSEEK_API_KEY;
          const llmModel = env.AI_MODEL || 'deepseek-v3.2';
          const llmBaseUrl = env.AI_BASE_URL || 'https://qianfan.baidubce.com/v2';
          const llmAppId = env.AI_APP_ID || env.APP_ID;

          if (!llmApiKey) {
            res.statusCode = 503;
            res.end(JSON.stringify({ error: 'AI API key not configured' }));
            return;
          }

          const client = new OpenAI({
            apiKey: llmApiKey,
            baseURL: llmBaseUrl,
            defaultHeaders: llmAppId ? { appid: llmAppId } : undefined,
          });

          const productsText = products
            .map(
              (p, i) =>
                `Product ${i + 1}: ${p.name}\nIngredients: ${p.ingredients || 'Not provided'}\nNutrition: ${p.nutrition || 'Not provided'}`
            )
            .join('\n\n');

          const prompt = `Compare the healthiness of these ${products.length} food/products and respond with valid JSON only.\n\n${productsText}\n\nReturn JSON in this exact shape:\n{\n  "winner": number (0-based index of the winning product) or "tie",\n  "products": [\n    { "name": "...", "ingredients": "...", "nutrition": "...", "healthScore": number 1-10, "pros": ["..."], "cons": ["..."] }\n  ],\n  "explanation": "A short paragraph explaining which product is healthiest and why. Mention specific ingredients or nutrients that influenced the decision."\n}\n\nBase scores on whole/minimally processed ingredients, low added sugar and sodium, healthy fats, fiber, and protein. Be objective and concise. Respond in ${language || 'English'}.`;

          const completion = await client.chat.completions.create({
            model: llmModel,
            messages: [
              {
                role: 'system',
                content:
                  'You are a nutrition expert that compares food products. Always respond with the requested JSON and no extra text.',
              },
              { role: 'user', content: prompt },
            ],
            stream: false,
          });

          let raw = completion.choices?.[0]?.message?.content || '';
          // Strip markdown code fences if the model wraps JSON in them.
          raw = raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
          const parsed = JSON.parse(raw);

          res.end(JSON.stringify(parsed));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Comparison failed: ' + err.message }));
        }
      });
      return;
    }

    next();
  });

  // --- Serve Uploaded Images Statically (local fallback) ---
  use('/uploads', async (req, res, next) => {
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
}
