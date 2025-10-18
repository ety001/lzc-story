import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 获取目录结构
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dirPath = searchParams.get('path') || '/';
    
    // 安全检查：确保路径在允许的范围内
    if (!dirPath.startsWith('/')) {
      return NextResponse.json({ error: '无效的路径' }, { status: 400 });
    }

    if (!fs.existsSync(dirPath)) {
      return NextResponse.json({ error: '路径不存在' }, { status: 404 });
    }

    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: '不是有效的目录' }, { status: 400 });
    }

    const items = fs.readdirSync(dirPath)
      .map(item => {
        const fullPath = path.join(dirPath, item);
        const itemStat = fs.statSync(fullPath);
        
        return {
          name: item,
          path: fullPath,
          isDirectory: itemStat.isDirectory(),
          size: itemStat.size,
          modified: itemStat.mtime
        };
      })
      .filter(item => item.isDirectory) // 只返回目录
      .sort((a, b) => a.name.localeCompare(b.name)); // 按名称排序

    return NextResponse.json({
      currentPath: dirPath,
      parentPath: path.dirname(dirPath),
      items
    });
  } catch (error) {
    return NextResponse.json({ error: '获取目录结构失败' }, { status: 500 });
  }
}
