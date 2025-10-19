import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/sqlite-database';

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

interface PlayHistory {
  id: number;
  album_id: number;
  audio_file_id: number;
  played_at: string;
  play_time?: number; // 播放时间（秒）
}

// 获取播放历史（按专辑聚合，每个专辑显示最后两条）
export async function GET() {
  try {
    const playHistory = db.get('play_history') as PlayHistory[];
    const albums = db.get('albums') as Album[];
    const audioFiles = db.get('audio_files') as AudioFile[];
    
    // 创建查找映射
    const albumMap = new Map(albums.map((album: Album) => [album.id, album]));
    const audioFileMap = new Map(audioFiles.map((file: AudioFile) => [file.id, file]));
    
    // 处理播放历史数据
    const history = playHistory
      .map((record: PlayHistory) => {
        const album = albumMap.get(record.album_id);
        const audioFile = audioFileMap.get(record.audio_file_id);
        
        if (!album || !audioFile) return null;
        
        return {
          album_id: album.id,
          album_name: album.name,
          audio_file_id: audioFile.id,
          filename: audioFile.filename,
          filepath: audioFile.filepath,
          played_at: record.played_at,
          play_time: record.play_time || 0
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime());
    
    // 按专辑分组，每个专辑最多显示2条
    const groupedHistory = history.reduce((acc, item) => {
      if (!acc[item.album_name]) {
        acc[item.album_name] = [];
      }
      if (acc[item.album_name].length < 2) {
        acc[item.album_name].push(item);
      }
      return acc;
    }, {} as Record<string, any[]>);
    
    // 展平结果
    const result = Object.values(groupedHistory).flat();
    
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('获取播放历史失败:', error);
    return NextResponse.json({ error: '获取播放历史失败' }, { status: 500 });
  }
}

// 添加播放记录
export async function POST(request: NextRequest) {
  try {
    const { albumId, audioFileId, playTime } = await request.json();
    
    if (!albumId || !audioFileId) {
      return NextResponse.json({ error: '专辑ID和音频文件ID不能为空' }, { status: 400 });
    }

    // 检查是否已存在相同的播放记录
    const existingRecord = db.getOne('play_history', 'album_id = ? AND audio_file_id = ?', [albumId.toString(), audioFileId.toString()]) as PlayHistory | null;

    if (existingRecord) {
      // 更新现有记录
      db.update('play_history', existingRecord.id, {
        played_at: new Date().toISOString(),
        play_time: playTime || 0
      });
    } else {
      // 插入新播放记录
      db.insert('play_history', {
        album_id: albumId,
        audio_file_id: audioFileId,
        played_at: new Date().toISOString(),
        play_time: playTime || 0
      });
    }

    return NextResponse.json({ message: '播放记录更新成功' });
  } catch (error) {
    console.error('添加播放记录失败:', error);
    return NextResponse.json({ error: '添加播放记录失败' }, { status: 500 });
  }
}
