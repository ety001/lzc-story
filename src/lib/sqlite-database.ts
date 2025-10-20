import Database from 'better-sqlite3';
import * as path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'lzc-story.db');

// 确保数据目录存在
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 初始化数据库连接
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 初始化数据库
function initializeDatabase() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS admin_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        password_hash TEXT NOT NULL,
        created_at TEXT,
        updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS albums (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS audio_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        album_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        created_at TEXT,
        FOREIGN KEY (album_id) REFERENCES albums (id)
      );
      CREATE TABLE IF NOT EXISTS play_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        album_id INTEGER NOT NULL,
        audio_file_id INTEGER NOT NULL,
        played_at TEXT NOT NULL,
        play_time REAL,
        created_at TEXT,
        updated_at TEXT,
        FOREIGN KEY (album_id) REFERENCES albums (id),
        FOREIGN KEY (audio_file_id) REFERENCES audio_files (id)
      );
    `);
    console.log('SQLite数据库初始化完成');
  } catch (error) {
    console.error('SQLite数据库初始化失败:', error);
  }
}

// 执行SQL查询
function executeSQL<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
  try {
    const stmt = db.prepare(sql);
    return stmt.all(...params) as T[];
  } catch (error) {
    console.error('执行SQL查询失败:', error);
    return [];
  }
}

// 执行SQL语句（INSERT, UPDATE, DELETE）
function executeStatement(sql: string, params: unknown[] = []): { lastInsertRowid?: number; changes?: number } {
  try {
    const stmt = db.prepare(sql);
    const info = stmt.run(...params);
    return {
      lastInsertRowid: Number(info.lastInsertRowid) || undefined,
      changes: info.changes ?? 0
    };
  } catch (error) {
    console.error('执行SQL语句失败:', error);
    throw error;
  }
}

// 数据库操作类
class DatabaseManager {
  // 获取数据
  get(table: string, condition?: string, params?: unknown[]) {
    try {
      let sql = `SELECT * FROM ${table}`;
      if (condition) {
        sql += ` WHERE ${condition}`;
      }
      return executeSQL(sql, params || []);
    } catch (error) {
      console.error(`获取${table}数据失败:`, error);
      return [];
    }
  }

  // 获取单条记录
  getOne(table: string, condition: string, params?: unknown[]) {
    try {
      const sql = `SELECT * FROM ${table} WHERE ${condition} LIMIT 1`;
      const results = executeSQL(sql, params || []);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error(`获取${table}单条记录失败:`, error);
      return null;
    }
  }

  // 插入数据
  insert(table: string, record: Record<string, unknown>) {
    try {
      const fields = Object.keys(record);
      const placeholders = fields.map(() => '?').join(', ');
      const values = fields.map(field => record[field]);

      const sql = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`;
      const result = executeStatement(sql, values);

      return {
        id: result.lastInsertRowid,
        ...record,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error(`插入${table}数据失败:`, error);
      throw error;
    }
  }

  // 更新数据
  update(table: string, id: number, updates: Record<string, unknown>) {
    try {
      const fields = Object.keys(updates);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => updates[field]);

      const sql = `UPDATE ${table} SET ${setClause}, updated_at = ? WHERE id = ?`;
      const info = executeStatement(sql, [...values, new Date().toISOString(), id]);

      return !!info.changes && info.changes > 0;
    } catch (error) {
      console.error(`更新${table}数据失败:`, error);
      return false;
    }
  }

  // 删除数据
  delete(table: string, id: number) {
    try {
      const sql = `DELETE FROM ${table} WHERE id = ?`;
      const info = executeStatement(sql, [id]);
      return !!info.changes && info.changes > 0;
    } catch (error) {
      console.error(`删除${table}数据失败:`, error);
      return false;
    }
  }

  // 删除所有符合条件的记录
  deleteMany(table: string, condition: string, params?: unknown[]) {
    try {
      const sql = `DELETE FROM ${table} WHERE ${condition}`;
      const info = executeStatement(sql, params || []);
      return info.changes ?? 0;
    } catch (error) {
      console.error(`批量删除${table}数据失败:`, error);
      return 0;
    }
  }

  // 执行SQL查询（暴露给外部使用）
  executeSQL<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
    return executeSQL<T>(sql, params);
  }

  // 执行SQL语句（暴露给外部使用）
  executeStatement(sql: string, params: unknown[] = []): { lastInsertRowid?: number; changes?: number } {
    return executeStatement(sql, params);
  }
}

// 程序启动时立即初始化数据库
initializeDatabase();

const dbManager = new DatabaseManager();

export default dbManager;