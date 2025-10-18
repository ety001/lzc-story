import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/database';

// 获取指定专辑的音频文件列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const albumId = searchParams.get('albumId');
    
    if (!albumId) {
      return NextResponse.json({ error: '专辑ID不能为空' }, { status: 400 });
    }

    const albumIdNum = parseInt(albumId);
    const audioFiles = db.get('audio_files', (file: any) => file.album_id === albumIdNum);
    const albums = db.get('albums');
    
    // 创建专辑名称映射
    const albumMap = new Map(albums.map(album => [album.id, album]));
    
    // 添加专辑名称到音频文件
    const audioFilesWithAlbumName = audioFiles.map(file => {
      const album = albumMap.get(file.album_id);
      return {
        ...file,
        album_name: album ? album.name : '未知专辑'
      };
    }).sort((a, b) => a.filename.localeCompare(b.filename));
    
    return NextResponse.json(audioFilesWithAlbumName);
  } catch (error) {
    console.error('获取音频文件列表失败:', error);
    return NextResponse.json({ error: '获取音频文件列表失败' }, { status: 500 });
  }
}
