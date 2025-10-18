import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/database';

// 获取播放历史（按专辑聚合，每个专辑显示最后两条）
export async function GET() {
  try {
    const playHistory = db.get('play_history');
    const albums = db.get('albums');
    const audioFiles = db.get('audio_files');
    
    // 创建查找映射
    const albumMap = new Map(albums.map(album => [album.id, album]));
    const audioFileMap = new Map(audioFiles.map(file => [file.id, file]));
    
    // 处理播放历史数据
    const history = playHistory
      .map(record => {
        const album = albumMap.get(record.album_id);
        const audioFile = audioFileMap.get(record.audio_file_id);
        
        if (!album || !audioFile) return null;
        
        return {
          album_id: album.id,
          album_name: album.name,
          audio_file_id: audioFile.id,
          filename: audioFile.filename,
          filepath: audioFile.filepath,
          played_at: record.played_at
        };
      })
      .filter(Boolean)
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
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('获取播放历史失败:', error);
    return NextResponse.json({ error: '获取播放历史失败' }, { status: 500 });
  }
}

// 添加播放记录
export async function POST(request: NextRequest) {
  try {
    const { albumId, audioFileId } = await request.json();
    
    if (!albumId || !audioFileId) {
      return NextResponse.json({ error: '专辑ID和音频文件ID不能为空' }, { status: 400 });
    }

    // 插入播放记录
    db.insert('play_history', {
      album_id: albumId,
      audio_file_id: audioFileId,
      played_at: new Date().toISOString()
    });

    return NextResponse.json({ message: '播放记录添加成功' });
  } catch (error) {
    console.error('添加播放记录失败:', error);
    return NextResponse.json({ error: '添加播放记录失败' }, { status: 500 });
  }
}
