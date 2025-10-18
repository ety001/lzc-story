import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/database';

interface Album {
  id: number;
  name: string;
  path: string;
  created_at: string;
  updated_at: string;
}

interface AudioFile {
  id: number;
  album_id: number;
  filename: string;
  filepath: string;
  created_at: string;
}

// 获取指定专辑的音频文件列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const albumId = searchParams.get('albumId');
    
    if (!albumId) {
      return NextResponse.json({ error: '专辑ID不能为空' }, { status: 400 });
    }

    const albumIdNum = parseInt(albumId);
    const audioFiles = db.get('audio_files', (file: AudioFile) => file.album_id === albumIdNum) as AudioFile[];
    const albums = db.get('albums') as Album[];
    
    // 创建专辑名称映射
    const albumMap = new Map(albums.map((album: Album) => [album.id, album]));
    
    // 添加专辑名称到音频文件
    const audioFilesWithAlbumName = audioFiles.map((file: AudioFile) => {
      const album = albumMap.get(file.album_id);
      return {
        ...file,
        album_name: album ? album.name : '未知专辑'
      };
    }).sort((a, b) => a.filename.localeCompare(b.filename));
    
    return NextResponse.json(audioFilesWithAlbumName, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('获取音频文件列表失败:', error);
    return NextResponse.json({ error: '获取音频文件列表失败' }, { status: 500 });
  }
}
