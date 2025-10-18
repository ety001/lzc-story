#!/usr/bin/env node

// 数据库初始化脚本
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'lzc-story.db');

console.log('🗄️ 初始化SQLite数据库...');
console.log(`📁 数据库路径: ${dbPath}`);

// 确保数据目录存在
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('✅ 创建数据目录');
}

// 创建数据库连接
const db = new Database(dbPath);

try {
  // 创建表
  console.log('📋 创建数据库表...');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audio_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      album_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      duration INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (album_id) REFERENCES albums (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS play_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      album_id INTEGER NOT NULL,
      audio_file_id INTEGER NOT NULL,
      played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (album_id) REFERENCES albums (id) ON DELETE CASCADE,
      FOREIGN KEY (audio_file_id) REFERENCES audio_files (id) ON DELETE CASCADE
    );
  `);

  console.log('✅ 数据库表创建成功');

  // 检查表是否创建成功
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('📊 已创建的表:');
  tables.forEach(table => {
    console.log(`  - ${table.name}`);
  });

  console.log('🎉 数据库初始化完成！');
  
} catch (error) {
  console.error('❌ 数据库初始化失败:', error);
  process.exit(1);
} finally {
  db.close();
}
