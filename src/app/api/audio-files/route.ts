import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/sqlite-database';

interface Album {
  id: number;
  name: string;
  path: string;
  created_at: string;
  updated_at?: string;
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
    const audioFiles = db.get('audio_files', 'album_id = ?', [albumIdNum.toString()]) as unknown as AudioFile[];
    const albums = db.get('albums') as unknown as Album[];

    // 创建专辑名称映射
    const albumMap = new Map(albums.map((album: Album) => [album.id, album]));

    // 添加专辑名称到音频文件
    const audioFilesWithAlbumName = audioFiles.map((file: AudioFile) => {
      const album = albumMap.get(file.album_id);
      return {
        ...file,
        album_name: album ? album.name : '未知专辑'
      };
    }).sort((a, b) => {
      // 提取文件名中的数字部分进行排序
      const matchA = a.filename.match(/\d+/);
      const matchB = b.filename.match(/\d+/);
      const numA = parseInt(matchA ? matchA[0] : '0');
      const numB = parseInt(matchB ? matchB[0] : '0');

      // 如果都有数字，按数字排序
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }

      // 如果只有一个有数字，有数字的排在前面
      if (!isNaN(numA) && isNaN(numB)) return -1;
      if (isNaN(numA) && !isNaN(numB)) return 1;

      // 如果都没有数字，按字母顺序排序
      return a.filename.localeCompare(b.filename);
    });

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
