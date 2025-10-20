import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'lzc-story.db');

// 确保数据目录存在
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 初始化数据库
function initializeDatabase() {
  try {
    if (!fs.existsSync(dbPath)) {
      // 创建表结构
      const createTablesSQL = `
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
      `;

      execSync(`sqlite3 "${dbPath}" "${createTablesSQL}"`, { stdio: 'pipe' });
      console.log('SQLite数据库初始化完成');
    }
  } catch (error) {
    console.error('SQLite数据库初始化失败:', error);
  }
}

// 执行SQL查询
function executeSQL(sql: string, params: string[] = []): any[] {
  try {
    // 转义参数中的单引号
    const escapedParams = params.map(p => p.replace(/'/g, "''"));

    // 替换SQL中的占位符
    let finalSQL = sql;
    escapedParams.forEach((param) => {
      finalSQL = finalSQL.replace('?', `'${param}'`);
    });

    const result = execSync(`sqlite3 "${dbPath}" "${finalSQL}"`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    if (!result.trim()) {
      return [];
    }

    // 解析结果
    const lines = result.trim().split('\n');
    if (lines.length === 1 && !lines[0].includes('|')) {
      // 单值结果
      return [{ value: lines[0] }];
    }

    // 多行结果，需要获取列名
    const headerResult = execSync(`sqlite3 "${dbPath}" ".headers on" "${finalSQL}"`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    const headerLines = headerResult.trim().split('\n');
    if (headerLines.length < 2) {
      return [];
    }

    const headers = headerLines[0].split('|');
    const rows = headerLines.slice(1).map(line => {
      const values = line.split('|');
      const row: any = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() || '';
      });
      return row;
    });

    return rows;
  } catch (error) {
    console.error('执行SQL查询失败:', error);
    return [];
  }
}

// 执行SQL语句（INSERT, UPDATE, DELETE）
function executeStatement(sql: string, params: string[] = []): { lastInsertRowid?: number; changes?: number } {
  try {
    const escapedParams = params.map(p => p.replace(/'/g, "''"));
    let finalSQL = sql;
    escapedParams.forEach((param) => {
      finalSQL = finalSQL.replace('?', `'${param}'`);
    });

    // 使用临时文件来避免命令行参数长度限制
    const tempFile = path.join(process.cwd(), 'temp_sql.sql');

    // 写入SQL到临时文件
    fs.writeFileSync(tempFile, finalSQL);

    // 执行SQL
    execSync(`sqlite3 "${dbPath}" < "${tempFile}"`, { stdio: 'pipe' });

    // 删除临时文件
    fs.unlinkSync(tempFile);

    // 然后获取last_insert_rowid
    const idResult = execSync(`sqlite3 "${dbPath}" "SELECT last_insert_rowid();"`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    // 获取changes
    const changesResult = execSync(`sqlite3 "${dbPath}" "SELECT changes();"`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    return {
      lastInsertRowid: parseInt(idResult.trim()) || undefined,
      changes: parseInt(changesResult.trim()) || 0
    };
  } catch (error) {
    console.error('执行SQL语句失败:', error);
    throw error;
  }
}

// 数据库操作类
class DatabaseManager {
  // 获取数据
  get(table: string, condition?: string, params?: string[]) {
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
  getOne(table: string, condition: string, params?: string[]) {
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
  insert(table: string, record: any) {
    try {
      const fields = Object.keys(record);
      const placeholders = fields.map(() => '?').join(', ');
      const values = fields.map(field => record[field]?.toString() || '');

      const sql = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`;
      const result = executeStatement(sql, values);

      // 如果lastInsertRowid没有获取到，尝试查询最大ID
      let id = result.lastInsertRowid;
      if (!id) {
        const maxIdResult = execSync(`sqlite3 "${dbPath}" "SELECT MAX(id) FROM ${table};"`, {
          encoding: 'utf8',
          stdio: 'pipe'
        });
        id = parseInt(maxIdResult.trim()) || undefined;
      }

      return {
        id: id,
        ...record,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error(`插入${table}数据失败:`, error);
      throw error;
    }
  }

  // 更新数据
  update(table: string, id: number, updates: any) {
    try {
      const fields = Object.keys(updates);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => updates[field]?.toString() || '');

      const sql = `UPDATE ${table} SET ${setClause}, updated_at = ? WHERE id = ?`;
      const result = executeStatement(sql, [...values, new Date().toISOString(), id.toString()]);

      return result.changes ? result.changes > 0 : false;
    } catch (error) {
      console.error(`更新${table}数据失败:`, error);
      return false;
    }
  }

  // 删除数据
  delete(table: string, id: number) {
    try {
      const sql = `DELETE FROM ${table} WHERE id = ?`;
      const result = executeStatement(sql, [id.toString()]);

      return result.changes ? result.changes > 0 : false;
    } catch (error) {
      console.error(`删除${table}数据失败:`, error);
      return false;
    }
  }

  // 删除所有符合条件的记录
  deleteMany(table: string, condition: string, params?: string[]) {
    try {
      const sql = `DELETE FROM ${table} WHERE ${condition}`;
      const result = executeStatement(sql, params || []);

      return result.changes;
    } catch (error) {
      console.error(`批量删除${table}数据失败:`, error);
      return 0;
    }
  }
}

// 程序启动时立即初始化数据库
initializeDatabase();

const dbManager = new DatabaseManager();

export default dbManager;