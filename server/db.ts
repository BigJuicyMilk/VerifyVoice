import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

export interface ImageRecord {
  user_id: string;
  filename: string;
  cos_key: string;
  cos_url: string;
}

let db: Database.Database | null = null;

export function initDb(dbPath = path.resolve('data', 'verifyvoice.db')): Database.Database {
  if (db) return db;

  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      cos_key TEXT NOT NULL,
      cos_url TEXT NOT NULL,
      rating INTEGER,
      uploaded_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_images_user_id ON images(user_id);
  `);

  // Add rating column to databases created before this feature existed.
  const imageColumns = db.pragma(`table_info(images)`) as { name: string }[];
  if (!imageColumns.find((c) => c.name === 'rating')) {
    db.exec('ALTER TABLE images ADD COLUMN rating INTEGER');
  }

  migrateLegacyUsers(dbPath);

  return db;
}

function migrateLegacyUsers(dbPath: string) {
  if (!db) return;

  const existing = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (existing.count > 0) return;

  const legacyFile = path.resolve(path.dirname(dbPath), 'user.json');
  if (!fs.existsSync(legacyFile)) return;

  try {
    const raw = fs.readFileSync(legacyFile, 'utf-8');
    const users: User[] = JSON.parse(raw);
    if (Array.isArray(users) && users.length > 0) {
      upsertUsers(users);
      console.log(`[db] Migrated ${users.length} legacy users from user.json`);
    }
  } catch (err: any) {
    console.error('[db] Failed to migrate legacy users:', err.message);
  }
}

export function getAllUsers(): User[] {
  const database = initDb();
  const rows = database.prepare('SELECT id, name, email, password FROM users').all() as User[];
  return rows;
}

export function upsertUsers(users: User[]) {
  const database = initDb();
  const insert = database.prepare(
    `INSERT OR REPLACE INTO users (id, name, email, password) VALUES (?, ?, ?, ?)`
  );

  const transaction = database.transaction((list: User[]) => {
    for (const user of list) {
      insert.run(user.id, user.name, user.email, user.password);
    }
  });

  transaction(users);
}

export interface ImageWithRating {
  url: string;
  rating: number | null;
}

export function addImage(record: ImageRecord) {
  const database = initDb();
  const stmt = database.prepare(
    `INSERT INTO images (user_id, filename, cos_key, cos_url, rating) VALUES (?, ?, ?, ?, ?)`
  );
  stmt.run(record.user_id, record.filename, record.cos_key, record.cos_url, null);
}

export function getImagesByUserId(userId: string): ImageWithRating[] {
  const database = initDb();
  const rows = database
    .prepare('SELECT cos_url, rating FROM images WHERE user_id = ? ORDER BY uploaded_at DESC')
    .all(userId) as { cos_url: string; rating: number | null }[];
  return rows.map((r) => ({ url: r.cos_url, rating: r.rating }));
}

export function updateImageRating(imageUrl: string, rating: number) {
  const database = initDb();
  const stmt = database.prepare('UPDATE images SET rating = ? WHERE cos_url = ?');
  stmt.run(rating, imageUrl);
}
