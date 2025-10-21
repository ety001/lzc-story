import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/sqlite-database';

interface PlayHistory {
  id: number;
  album_id: number;
  audio_file_id: number;
  played_at: string;
  play_time?: number; // 播放时间（秒）
  created_at?: string;
  updated_at?: string;
}

interface PlayHistoryItem {
  id: number;
  album_id: number;
  album_name: string;
  audio_file_id: number;
  filename: string;
  filepath: string;
  played_at: string;
  play_time: number;
}

// 获取播放历史（按专辑聚合，每个专辑显示最新三条）
export async function GET() {
  try {
    // 使用 SQL 查询直接获取按专辑分组的最新三条记录
    const sql = `
      WITH ranked_history AS (
        SELECT 
          ph.id,
          ph.album_id,
          ph.audio_file_id,
          ph.played_at,
          ph.play_time,
          a.name as album_name,
          af.filename,
          af.filepath,
          ROW_NUMBER() OVER (
            PARTITION BY ph.album_id 
            ORDER BY ph.played_at DESC
          ) as rn
        FROM play_history ph
        JOIN albums a ON ph.album_id = a.id
        JOIN audio_files af ON ph.audio_file_id = af.id
      )
      SELECT 
        id,
        album_id,
        album_name,
        audio_file_id,
        filename,
        filepath,
        played_at,
        play_time
      FROM ranked_history
      WHERE rn <= 3
      ORDER BY 
        (SELECT MAX(played_at) FROM play_history ph2 WHERE ph2.album_id = ranked_history.album_id) DESC,
        played_at DESC
    `;

    const result = db.executeSQL(sql) as unknown as PlayHistoryItem[];

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
    const existingRecord = db.getOne('play_history', 'album_id = ? AND audio_file_id = ?', [albumId.toString(), audioFileId.toString()]) as unknown as PlayHistory | null;

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
