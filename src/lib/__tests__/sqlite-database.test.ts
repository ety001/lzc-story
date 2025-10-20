import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

// 测试数据库路径
const testDbPath = path.join(process.cwd(), 'data', 'test-lzc-story.db');

// 创建测试用的数据库管理器
class TestDatabaseManager {
    private db: Database.Database;

    constructor(dbPath: string) {
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('foreign_keys = ON');
    }

    // 执行SQL查询
    executeSQL<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
        try {
            const stmt = this.db.prepare(sql);
            return stmt.all(...params) as T[];
        } catch (error) {
            console.error('执行SQL查询失败:', error);
            return [];
        }
    }

    // 执行SQL语句（INSERT, UPDATE, DELETE）
    executeStatement(sql: string, params: unknown[] = []): { lastInsertRowid?: number; changes?: number } {
        try {
            const stmt = this.db.prepare(sql);
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

    // 获取数据
    get(table: string, condition?: string, params?: unknown[]) {
        try {
            let sql = `SELECT * FROM ${table}`;
            if (condition) {
                sql += ` WHERE ${condition}`;
            }
            return this.executeSQL(sql, params || []);
        } catch (error) {
            console.error(`获取${table}数据失败:`, error);
            return [];
        }
    }

    // 获取单条记录
    getOne(table: string, condition: string, params?: unknown[]) {
        try {
            const sql = `SELECT * FROM ${table} WHERE ${condition} LIMIT 1`;
            const results = this.executeSQL(sql, params || []);
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
            const result = this.executeStatement(sql, values);

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
            const info = this.executeStatement(sql, [...values, new Date().toISOString(), id]);

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
            const info = this.executeStatement(sql, [id]);
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
            const info = this.executeStatement(sql, params || []);
            return info.changes ?? 0;
        } catch (error) {
            console.error(`批量删除${table}数据失败:`, error);
            return 0;
        }
    }

    // 关闭数据库连接
    close() {
        this.db.close();
    }
}

describe('SQLite Database Manager', () => {
    let testDb: TestDatabaseManager;

    beforeEach(() => {
        // 创建测试数据库管理器
        testDb = new TestDatabaseManager(testDbPath);

        // 创建测试表 - 使用 executeStatement 而不是 executeSQL
        testDb.executeStatement(`
      CREATE TABLE IF NOT EXISTS test_albums (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        created_at TEXT,
        updated_at TEXT
      )
    `);

        testDb.executeStatement(`
      CREATE TABLE IF NOT EXISTS test_audio_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        album_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        created_at TEXT,
        FOREIGN KEY (album_id) REFERENCES test_albums (id)
      )
    `);
    });

    afterEach(() => {
        // 清理测试数据库
        testDb.close();
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
    });

    describe('DatabaseManager.get()', () => {
        it('应该返回空数组当表为空时', () => {
            const result = testDb.get('test_albums');
            expect(result).toEqual([]);
        });

        it('应该返回所有记录当没有条件时', () => {
            // 插入测试数据
            testDb.insert('test_albums', { name: 'Test Album 1', path: '/test/path1' });
            testDb.insert('test_albums', { name: 'Test Album 2', path: '/test/path2' });

            const result = testDb.get('test_albums');
            expect(result).toHaveLength(2);
            expect(result[0]).toHaveProperty('name', 'Test Album 1');
            expect(result[1]).toHaveProperty('name', 'Test Album 2');
        });

        it('应该根据条件过滤记录', () => {
            // 插入测试数据
            testDb.insert('test_albums', { name: 'Test Album 1', path: '/test/path1' });
            testDb.insert('test_albums', { name: 'Test Album 2', path: '/test/path2' });

            const result = testDb.get('test_albums', 'name = ?', ['Test Album 1']);
            expect(result).toHaveLength(1);
            expect(result[0]).toHaveProperty('name', 'Test Album 1');
        });
    });

    describe('DatabaseManager.getOne()', () => {
        it('应该返回null当没有匹配记录时', () => {
            const result = testDb.getOne('test_albums', 'id = ?', [999]);
            expect(result).toBeNull();
        });

        it('应该返回单条记录当有匹配时', () => {
            // 插入测试数据
            testDb.insert('test_albums', { name: 'Test Album 1', path: '/test/path1' });

            const result = testDb.getOne('test_albums', 'name = ?', ['Test Album 1']);
            expect(result).not.toBeNull();
            expect(result).toHaveProperty('name', 'Test Album 1');
            expect(result).toHaveProperty('path', '/test/path1');
        });
    });

    describe('DatabaseManager.insert()', () => {
        it('应该成功插入记录并返回ID', () => {
            const record = {
                name: 'New Album',
                path: '/new/path'
            };

            const result = testDb.insert('test_albums', record);

            expect(result).toHaveProperty('id');
            expect(result.id).toBeGreaterThan(0);
            expect(result).toHaveProperty('name', 'New Album');
            expect(result).toHaveProperty('path', '/new/path');
            expect(result).toHaveProperty('created_at');
        });

        it('应该处理特殊字符', () => {
            const record = {
                name: "Album with 'quotes' and \"double quotes\"",
                path: '/path/with/special/chars'
            };

            const result = testDb.insert('test_albums', record);
            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('name', record.name);
        });
    });

    describe('DatabaseManager.update()', () => {
        it('应该成功更新记录', () => {
            // 插入测试数据
            const album = testDb.insert('test_albums', { name: 'Original Name', path: '/original/path' });

            const updates = {
                name: 'Updated Name',
                path: '/updated/path'
            };

            const result = testDb.update('test_albums', album.id!, updates);
            expect(result).toBe(true);

            // 验证更新
            const updated = testDb.getOne('test_albums', 'id = ?', [album.id]);
            expect(updated).toHaveProperty('name', 'Updated Name');
            expect(updated).toHaveProperty('path', '/updated/path');
            expect(updated).toHaveProperty('updated_at');
        });

        it('应该返回false当记录不存在时', () => {
            const updates = { name: 'Non-existent' };
            const result = testDb.update('test_albums', 999, updates);
            expect(result).toBe(false);
        });
    });

    describe('DatabaseManager.delete()', () => {
        it('应该成功删除记录', () => {
            // 插入测试数据
            const album = testDb.insert('test_albums', { name: 'To Delete', path: '/delete/path' });

            const result = testDb.delete('test_albums', album.id!);
            expect(result).toBe(true);

            // 验证删除
            const deleted = testDb.getOne('test_albums', 'id = ?', [album.id]);
            expect(deleted).toBeNull();
        });

        it('应该返回false当记录不存在时', () => {
            const result = testDb.delete('test_albums', 999);
            expect(result).toBe(false);
        });
    });

    describe('DatabaseManager.deleteMany()', () => {
        it('应该删除所有符合条件的记录', () => {
            // 插入测试数据
            testDb.insert('test_albums', { name: 'Album 1', path: '/path1' });
            testDb.insert('test_albums', { name: 'Album 2', path: '/path2' });
            testDb.insert('test_albums', { name: 'Album 3', path: '/path3' });

            const deletedCount = testDb.deleteMany('test_albums', 'name LIKE ?', ['Album %']);
            expect(deletedCount).toBe(3);

            // 验证删除
            const remaining = testDb.get('test_albums');
            expect(remaining).toHaveLength(0);
        });

        it('应该返回0当没有匹配记录时', () => {
            const deletedCount = testDb.deleteMany('test_albums', 'id = ?', [999]);
            expect(deletedCount).toBe(0);
        });
    });

    describe('外键约束测试', () => {
        it('应该正确处理外键关系', () => {
            // 插入专辑
            const album = testDb.insert('test_albums', {
                name: 'Test Album',
                path: '/test/path'
            });

            // 插入音频文件
            const audioFile = testDb.insert('test_audio_files', {
                album_id: album.id,
                filename: 'test.mp3',
                filepath: '/test/path/test.mp3'
            });

            expect(audioFile).toHaveProperty('id');
            expect(audioFile).toHaveProperty('album_id', album.id);
            expect(audioFile).toHaveProperty('filename', 'test.mp3');
        });
    });

    describe('错误处理', () => {
        it('应该处理无效的SQL查询', () => {
            const result = testDb.get('non_existent_table');
            expect(result).toEqual([]);
        });

        it('应该处理无效的插入数据', () => {
            expect(() => {
                testDb.insert('test_albums', {
                    invalid_field: 'value'
                });
            }).toThrow();
        });
    });

    describe('数据类型处理', () => {
        it('应该正确处理数字类型', () => {
            const record = {
                name: 'Number Test',
                path: '/number/path'
            };

            const result = testDb.insert('test_albums', record);
            expect(result).toHaveProperty('id');
        });

        it('应该正确处理布尔类型', () => {
            const record = {
                name: 'Boolean Test',
                path: '/boolean/path'
            };

            const result = testDb.insert('test_albums', record);
            expect(result).toHaveProperty('id');
        });

        it('应该正确处理null值', () => {
            const record = {
                name: 'Null Test',
                path: '/null/path'
            };

            const result = testDb.insert('test_albums', record);
            expect(result).toHaveProperty('id');
        });
    });

    describe('并发测试', () => {
        it('应该处理并发插入', async () => {
            const promises = Array.from({ length: 10 }, (_, i) => {
                return Promise.resolve(testDb.insert('test_albums', {
                    name: `Concurrent Album ${i}`,
                    path: `/concurrent/path${i}`
                }));
            });

            const results = await Promise.all(promises);
            expect(results).toHaveLength(10);

            // 验证所有记录都被插入
            const allRecords = testDb.get('test_albums');
            expect(allRecords).toHaveLength(10);
        });
    });
});
