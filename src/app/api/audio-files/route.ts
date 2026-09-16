import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/sqlite-database';
import {
  clampOffset,
  clampPageLimit,
  getAudioWindowThreshold,
  sortAudioFiles,
} from '@/lib/audio-list';

interface AlbumRow {
  id: number;
  name: string;
}

interface AudioFileRow {
  id: number;
  album_id: number;
  filename: string;
  filepath: string;
  duration?: number | null;
  file_size?: number | null;
  created_at: string;
  updated_at?: string;
}

const noCacheHeaders = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

/**
 * GET /api/audio-files?albumId=&limit=&offset=
 * 超长列表窗口化：返回全量有序 audio_ids + 当前页 items，供前端虚拟列表骨架与首屏渲染。
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const albumId = searchParams.get('albumId');

    if (!albumId) {
      return NextResponse.json({ error: '专辑ID不能为空' }, { status: 400 });
    }

    const albumIdNum = parseInt(albumId, 10);
    if (isNaN(albumIdNum)) {
      return NextResponse.json({ error: '专辑ID无效' }, { status: 400 });
    }

    const limit = clampPageLimit(parseInt(searchParams.get('limit') || '', 10));
    const offset = clampOffset(parseInt(searchParams.get('offset') || '', 10));

    const album = db.getOne('albums', 'id = ?', [albumIdNum.toString()]) as AlbumRow | null;
    const albumName = album ? album.name : '未知专辑';

    const audioFiles = db.get('audio_files', 'album_id = ?', [
      albumIdNum.toString(),
    ]) as unknown as AudioFileRow[];

    const sorted = sortAudioFiles(audioFiles);
    const audioIds = sorted.map((file) => file.id);
    const total = sorted.length;
    const pageRows = sorted.slice(offset, offset + limit);

    const items = pageRows.map((file) => ({
      ...file,
      album_name: albumName,
      duration: file.duration ?? 0,
    }));

    return NextResponse.json(
      {
        items,
        total,
        audio_ids: audioIds,
        offset,
        limit,
        window_threshold: getAudioWindowThreshold(),
      },
      { headers: noCacheHeaders }
    );
  } catch (error) {
    console.error('获取音频文件列表失败:', error);
    return NextResponse.json({ error: '获取音频文件列表失败' }, { status: 500 });
  }
}
