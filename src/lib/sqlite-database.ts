import Database, { type Database as DatabaseType } from 'better-sqlite3';
import * as path from 'path';
import fs from 'fs';
import type { AdminSession } from '@/types';

// 获取数据库路径，兼容不同运行时环境
function getDbPath(): string {
  try {
    // 尝试使用 process.cwd()（Node.js 运行时）
    return path.join(process.cwd(), 'data', 'lzc-story.db');
  } catch {
    // 如果失败，使用相对路径（Edge Runtime）
    return path.join('./data', 'lzc-story.db');
  }
}

const dbPath = getDbPath();

// 延迟初始化数据库连接（避免在构建时访问数据库）
let db: DatabaseType | null = null;
let dbInitialized = false;

function getDatabase(): DatabaseType {
  // 检查是否在构建阶段
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

  if (isBuildPhase) {
    // 在构建阶段抛出错误，由调用方处理
    throw new Error('Database access is not available during build phase');
  }

  if (!db) {
    // 确保数据目录存在
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // 初始化数据库连接
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

// 数据库迁移函数
function migrateDatabase() {
  try {
    const database = getDatabase();
    // 检查并添加 albums 表的缺失列
    const albumsColumns = database.pragma('table_info(albums)') as Array<{ name: string }>;
    const columnNames = albumsColumns.map(col => col.name);

    if (!columnNames.includes('audio_count')) {
      database.exec('ALTER TABLE albums ADD COLUMN audio_count INTEGER DEFAULT 0');
    }

    if (!columnNames.includes('updated_at')) {
      database.exec('ALTER TABLE albums ADD COLUMN updated_at TEXT');
    }

    if (!columnNames.includes('is_visible')) {
      database.exec('ALTER TABLE albums ADD COLUMN is_visible INTEGER DEFAULT 0');
    }

    // 检查并添加 audio_files 表的缺失列
    const audioFilesColumns = database.pragma('table_info(audio_files)') as Array<{ name: string }>;
    const audioFileColumnNames = audioFilesColumns.map(col => col.name);

    if (!audioFileColumnNames.includes('file_size')) {
      database.exec('ALTER TABLE audio_files ADD COLUMN file_size INTEGER DEFAULT 0');
    }

    if (!audioFileColumnNames.includes('duration')) {
      database.exec('ALTER TABLE audio_files ADD COLUMN duration REAL DEFAULT 0');
    }

    if (!audioFileColumnNames.includes('updated_at')) {
      database.exec('ALTER TABLE audio_files ADD COLUMN updated_at TEXT');
    }

    console.log('数据库迁移完成');
  } catch (error) {
    console.error('数据库迁移失败:', error);
  }
}

// 初始化数据库
function initializeDatabase() {
  try {
    const database = getDatabase();
    database.exec(`
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
        audio_count INTEGER DEFAULT 0,
        is_visible INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS audio_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        album_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        file_size INTEGER DEFAULT 0,
        duration REAL DEFAULT 0,
        created_at TEXT,
        updated_at TEXT,
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
      CREATE TABLE IF NOT EXISTS admin_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
    console.log('SQLite数据库初始化完成');

    // 执行数据库迁移
    migrateDatabase();
  } catch (error) {
    console.error('SQLite数据库初始化失败:', error);
  }
}

// 执行SQL查询
function executeSQL<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
  try {
    const database = getDatabase();
    const stmt = database.prepare(sql);
    return stmt.all(...params) as T[];
  } catch (error) {
    // 在构建阶段忽略数据库错误
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return [];
    }
    console.error('执行SQL查询失败:', error);
    return [];
  }
}

// ==================== 工具函数 ====================

/**
 * 获取当前时间戳（ISO 格式）
 */
function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

// 执行SQL语句（INSERT, UPDATE, DELETE）
function executeStatement(sql: string, params: unknown[] = []): { lastInsertRowid?: number; changes?: number } {
  try {
    const database = getDatabase();
    const stmt = database.prepare(sql);
    const info = stmt.run(...params);
    return {
      lastInsertRowid: Number(info.lastInsertRowid) || undefined,
      changes: info.changes ?? 0
    };
  } catch (error) {
    // 在构建阶段忽略数据库错误
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return { lastInsertRowid: undefined, changes: 0 };
    }
    console.error('执行SQL语句失败:', error);
    throw error;
  }
}

// 数据库操作类
class DatabaseManager {
  // 获取数据
  get(table: string, condition?: string, params?: unknown[]) {
    ensureDatabaseInitialized();
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
    ensureDatabaseInitialized();
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
    ensureDatabaseInitialized();
    try {
      // 添加 created_at 时间戳
      const recordWithTimestamp = {
        ...record,
        created_at: getCurrentTimestamp()
      };

      const fields = Object.keys(recordWithTimestamp);
      const placeholders = fields.map(() => '?').join(', ');
      const values = fields.map(field => recordWithTimestamp[field as keyof typeof recordWithTimestamp]);

      const sql = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`;
      const result = executeStatement(sql, values);

      return {
        id: result.lastInsertRowid,
        ...recordWithTimestamp
      };
    } catch (error) {
      console.error(`插入${table}数据失败:`, error);
      throw error;
    }
  }

  // 更新数据
  update(table: string, id: number, updates: Record<string, unknown>) {
    ensureDatabaseInitialized();
    try {
      const fields = Object.keys(updates);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => updates[field]);

      const sql = `UPDATE ${table} SET ${setClause}, updated_at = ? WHERE id = ?`;
      const info = executeStatement(sql, [...values, getCurrentTimestamp(), id]);

      return !!info.changes && info.changes > 0;
    } catch (error) {
      console.error(`更新${table}数据失败:`, error);
      return false;
    }
  }

  // 删除数据
  delete(table: string, id: number) {
    ensureDatabaseInitialized();
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
    ensureDatabaseInitialized();
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
    ensureDatabaseInitialized();
    return executeSQL<T>(sql, params);
  }

  // 执行SQL语句（暴露给外部使用）
  executeStatement(sql: string, params: unknown[] = []): { lastInsertRowid?: number; changes?: number } {
    ensureDatabaseInitialized();
    return executeStatement(sql, params);
  }

  // ==================== 会话管理方法 ====================

  /**
   * 创建新的管理员会话
   * @param token 会话 token
   * @param expiresAt 过期时间（ISO 格式字符串）
   * @returns 会话 ID，如果创建失败则返回 undefined
   */
  createSession(token: string, expiresAt: string): number | undefined {
    ensureDatabaseInitialized();
    try {
      const result = this.executeStatement(
        'INSERT INTO admin_sessions (token, expires_at, created_at) VALUES (?, ?, ?)',
        [token, expiresAt, getCurrentTimestamp()]
      );
      return result.lastInsertRowid;
    } catch (error) {
      console.error('创建会话失败:', error);
      return undefined;
    }
  }

  /**
   * 验证会话是否有效
   * @param token 会话 token
   * @returns 如果会话有效返回 true，否则返回 false
   */
  validateSession(token: string): boolean {
    ensureDatabaseInitialized();
    try {
      const sessions = this.executeSQL<AdminSession>(
        'SELECT * FROM admin_sessions WHERE token = ? LIMIT 1',
        [token]
      );

      if (sessions.length === 0) {
        return false;
      }

      const session = sessions[0];
      const expiresAt = new Date(session.expires_at);
      const now = new Date();

      if (expiresAt <= now) {
        // 会话已过期，删除它
        this.deleteSession(token);
        return false;
      }

      return true;
    } catch (error) {
      console.error('验证会话失败:', error);
      return false;
    }
  }

  /**
   * 删除会话
   * @param token 会话 token
   * @returns 如果删除成功返回 true，否则返回 false
   */
  deleteSession(token: string): boolean {
    ensureDatabaseInitialized();
    try {
      const result = this.executeStatement('DELETE FROM admin_sessions WHERE token = ?', [token]);
      return (result.changes ?? 0) > 0;
    } catch (error) {
      console.error('删除会话失败:', error);
      return false;
    }
  }

  /**
   * 清理所有过期的会话
   */
  cleanupExpiredSessions(): void {
    ensureDatabaseInitialized();
    try {
      const now = getCurrentTimestamp();
      this.executeStatement('DELETE FROM admin_sessions WHERE expires_at <= ?', [now]);
    } catch (error) {
      console.error('清理过期会话失败:', error);
    }
  }
}

// 延迟初始化数据库（只在运行时初始化，不在构建时初始化）
function ensureDatabaseInitialized() {
  if (!dbInitialized) {
    try {
      initializeDatabase();
      dbInitialized = true;
    } catch (error) {
      // 在构建阶段忽略数据库初始化错误
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        return;
      }
      console.error('数据库初始化失败:', error);
    }
  }
}

// 创建并导出数据库管理器实例
const dbManager = new DatabaseManager();

export default dbManager;