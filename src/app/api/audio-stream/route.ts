import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ error: '文件路径不能为空' }, { status: 400 });
    }

    // 安全检查：确保路径在允许的范围内
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      return NextResponse.json({ error: '不是有效的文件' }, { status: 400 });
    }

    // 获取文件扩展名
    const ext = path.extname(filePath).toLowerCase();
    const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg'];

    if (!audioExtensions.includes(ext)) {
      return NextResponse.json({ error: '不支持的文件格式' }, { status: 400 });
    }

    // 设置适当的Content-Type
    let contentType = 'audio/mpeg';
    switch (ext) {
      case '.wav':
        contentType = 'audio/wav';
        break;
      case '.m4a':
        contentType = 'audio/mp4';
        break;
      case '.aac':
        contentType = 'audio/aac';
        break;
      case '.flac':
        contentType = 'audio/flac';
        break;
      case '.ogg':
        contentType = 'audio/ogg';
        break;
      default:
        contentType = 'audio/mpeg';
    }

    const fileSize = stat.size;
    const range = request.headers.get('range');

    if (range) {
      // 处理 Range 请求
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;

      // 创建文件流
      const stream = fs.createReadStream(filePath, { start, end });

      return new NextResponse(stream as unknown as ReadableStream, {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Length': chunkSize.toString(),
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } else {
      // 处理完整文件请求
      const fileBuffer = fs.readFileSync(filePath);

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Length': fileBuffer.length.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
  } catch (error) {
    console.error('音频流服务错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
