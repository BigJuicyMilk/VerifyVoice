import COS from 'cos-nodejs-sdk-v5';

export interface CosConfig {
  secretId?: string;
  secretKey?: string;
  bucket?: string;
  region?: string;
  prefix?: string;
  cdnUrl?: string;
}

export interface CosUploadResult {
  url: string;
  key: string;
}

let client: COS | null = null;
let config: CosConfig | null = null;

export function initCos(cfg: CosConfig): boolean {
  if (!cfg.secretId || !cfg.secretKey || !cfg.bucket || !cfg.region) {
    return false;
  }

  config = {
    prefix: 'verifyvoice/images',
    ...cfg,
  };

  client = new COS({
    SecretId: cfg.secretId,
    SecretKey: cfg.secretKey,
  });

  return true;
}

export function isCosEnabled(): boolean {
  return client !== null && config !== null;
}

function sanitizeFilename(filename: string): string {
  return String(filename)
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .replace(/\s+/g, '_');
}

function sanitizeUserId(userId: string): string {
  return String(userId)
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '');
}

export function uploadImage(userId: string, filename: string, buffer: Buffer): Promise<CosUploadResult> {
  return new Promise((resolve, reject) => {
    if (!client || !config) {
      reject(new Error('COS is not configured'));
      return;
    }

    const safeUserId = sanitizeUserId(userId);
    const safeFilename = sanitizeFilename(filename);
    const uniqueFilename = `${Date.now()}_${safeFilename}`;
    const key = `${config.prefix}/${safeUserId}/${uniqueFilename}`;

    client.putObject(
      {
        Bucket: config.bucket!,
        Region: config.region!,
        Key: key,
        Body: buffer,
        ContentLength: buffer.length,
      },
      (err, data) => {
        if (err) {
          reject(err);
          return;
        }

        const url = config!.cdnUrl
          ? `${config!.cdnUrl.replace(/\/$/, '')}/${key}`
          : `https://${config!.bucket}.cos.${config!.region}.myqcloud.com/${key}`;

        resolve({ url, key });
      }
    );
  });
}
