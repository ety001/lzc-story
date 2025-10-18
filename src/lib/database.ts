import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'lzc-story.json');

// 确保数据目录存在
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 默认数据结构
const defaultData = {
  admin_config: [],
  albums: [],
  audio_files: [],
  play_history: []
};

// 初始化数据库（程序启动时调用）
function initializeDatabase() {
  try {
    if (!fs.existsSync(dbPath)) {
      console.log('数据库文件不存在，正在初始化...');
      writeDB(defaultData);
      console.log('数据库初始化完成');
    } else {
      console.log('数据库文件已存在');
    }
  } catch (error) {
    console.error('数据库初始化失败:', error);
  }
}

// 程序启动时立即初始化数据库
initializeDatabase();

// 读取数据库
function readDB() {
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取数据库失败:', error);
    return defaultData;
  }
}

// 写入数据库
function writeDB(data: any) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('写入数据库失败:', error);
  }
}

// 数据库操作类
class Database {
  private data: any;

  constructor() {
    this.data = readDB();
  }

  // 获取数据
  get(table: string, condition?: (item: any) => boolean) {
    if (!this.data[table]) {
      return [];
    }
    
    if (condition) {
      return this.data[table].filter(condition);
    }
    
    return this.data[table];
  }

  // 获取单条记录
  getOne(table: string, condition: (item: any) => boolean) {
    if (!this.data[table]) {
      return null;
    }
    
    return this.data[table].find(condition) || null;
  }

  // 插入数据
  insert(table: string, record: any) {
    if (!this.data[table]) {
      this.data[table] = [];
    }
    
    const id = this.data[table].length > 0 
      ? Math.max(...this.data[table].map((item: any) => item.id || 0)) + 1 
      : 1;
    
    const newRecord = {
      id,
      ...record,
      created_at: new Date().toISOString()
    };
    
    this.data[table].push(newRecord);
    writeDB(this.data);
    return newRecord;
  }

  // 更新数据
  update(table: string, id: number, updates: any) {
    if (!this.data[table]) {
      return false;
    }
    
    const index = this.data[table].findIndex((item: any) => item.id === id);
    if (index === -1) {
      return false;
    }
    
    this.data[table][index] = {
      ...this.data[table][index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    writeDB(this.data);
    return true;
  }

  // 删除数据
  delete(table: string, id: number) {
    if (!this.data[table]) {
      return false;
    }
    
    const index = this.data[table].findIndex((item: any) => item.id === id);
    if (index === -1) {
      return false;
    }
    
    this.data[table].splice(index, 1);
    writeDB(this.data);
    return true;
  }

  // 执行查询（模拟SQL查询）
  query(sql: string, params: any[] = []) {
    // 简单的SQL解析（仅支持基本查询）
    const lowerSQL = sql.toLowerCase().trim();
    
    if (lowerSQL.startsWith('select')) {
      // 解析SELECT查询
      const match = sql.match(/select\s+(.*?)\s+from\s+(\w+)(?:\s+where\s+(.*?))?(?:\s+order\s+by\s+(.*?))?(?:\s+limit\s+(\d+))?/i);
      if (!match) return [];
      
      const [, fields, table, whereClause, orderBy, limit] = match;
      let results = this.get(table);
      
      // 简单的WHERE条件处理
      if (whereClause && params.length > 0) {
        const condition = whereClause.replace(/\?/g, () => params.shift());
        // 这里简化处理，实际应用中需要更复杂的解析
        results = results.filter((item: any) => {
          // 简单的ID匹配
          if (condition.includes('id =')) {
            const id = parseInt(condition.split('id =')[1].trim());
            return item.id === id;
          }
          return true;
        });
      }
      
      // LIMIT处理
      if (limit) {
        results = results.slice(0, parseInt(limit));
      }
      
      return results;
    }
    
    return [];
  }

  // 执行SQL（模拟）
  exec(sql: string) {
    const lowerSQL = sql.toLowerCase().trim();
    
    if (lowerSQL.includes('create table')) {
      // 表已存在，无需创建
      return;
    }
    
    if (lowerSQL.includes('insert into')) {
      // 解析INSERT语句
      const match = sql.match(/insert\s+into\s+(\w+)\s+\((.*?)\)\s+values\s+\((.*?)\)/i);
      if (match) {
        const [, table, fields, values] = match;
        const fieldList = fields.split(',').map(f => f.trim());
        const valueList = values.split(',').map(v => v.trim().replace(/['"]/g, ''));
        
        const record: any = {};
        fieldList.forEach((field, index) => {
          record[field] = valueList[index];
        });
        
        this.insert(table, record);
      }
    }
    
    if (lowerSQL.includes('update')) {
      // 解析UPDATE语句
      const match = sql.match(/update\s+(\w+)\s+set\s+(.*?)\s+where\s+(.*?)/i);
      if (match) {
        const [, table, setClause, whereClause] = match;
        // 简化处理
        const idMatch = whereClause.match(/id\s*=\s*(\d+)/i);
        if (idMatch) {
          const id = parseInt(idMatch[1]);
          const updates: any = {};
          setClause.split(',').forEach(set => {
            const [field, value] = set.split('=').map(s => s.trim());
            updates[field] = value.replace(/['"]/g, '');
          });
          this.update(table, id, updates);
        }
      }
    }
    
    if (lowerSQL.includes('delete from')) {
      // 解析DELETE语句
      const match = sql.match(/delete\s+from\s+(\w+)\s+where\s+(.*?)/i);
      if (match) {
        const [, table, whereClause] = match;
        const idMatch = whereClause.match(/id\s*=\s*(\d+)/i);
        if (idMatch) {
          const id = parseInt(idMatch[1]);
          this.delete(table, id);
        }
      }
    }
  }
}

const db = new Database();

export default db;