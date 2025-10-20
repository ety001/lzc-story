import { beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// 确保测试数据目录存在
const testDataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
}

beforeAll(() => {
    console.log('开始数据库测试...');
});

afterAll(() => {
    console.log('数据库测试完成');
});
