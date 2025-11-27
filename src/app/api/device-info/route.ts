import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 获取日志文件路径
function getLogFilePath(): string {
  try {
    return path.join(process.cwd(), 'data', 'devices.log');
  } catch {
    return path.join('./data', 'devices.log');
  }
}

export async function POST(request: NextRequest) {
  try {
    const deviceInfo = await request.json();
    
    // 添加时间戳
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...deviceInfo,
    };
    
    // 确保 data 目录存在
    const logFilePath = getLogFilePath();
    const dataDir = path.dirname(logFilePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // 追加写入日志文件
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(logFilePath, logLine, 'utf8');
    
    return NextResponse.json({ success: true, message: '设备信息已记录' });
  } catch (error) {
    console.error('记录设备信息失败:', error);
    return NextResponse.json(
      { success: false, error: '记录设备信息失败' },
      { status: 500 }
    );
  }
}


