import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/sqlite-database';
import { MAX_BATCH_IDS } from '@/lib/audio-list';

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

interface AlbumRow {
  id: number;
  name: string;
}

/**
 * POST /api/audio-files/batch
 * 按 ID 批量查询音频详情，供虚拟列表按需补全。单次最多 MAX_BATCH_IDS 个。
 * 返回顺序不保证与请求一致，调用方按自持 audio_ids 重排。
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ids = Array.isArray(body?.ids) ? body.ids : null;

    if (!ids) {
      return NextResponse.json({ error: '请求参数错误' }, { status: 400 });
    }

    if (ids.length === 0) {
      return NextResponse.json({ items: [] });
    }

    if (ids.length > MAX_BATCH_IDS) {
      return NextResponse.json(
        { error: `单次最多查询 ${MAX_BATCH_IDS} 个音频文件` },
        { status: 400 }
      );
    }

    const normalizedIds: number[] = [];
    const seen = new Set<number>();
    for (const raw of ids) {
      const id = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
      if (!Number.isFinite(id) || seen.has(id)) continue;
      seen.add(id);
      normalizedIds.push(id);
    }

    if (normalizedIds.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const placeholders = normalizedIds.map(() => '?').join(',');
    const rows = db.executeSQL<AudioFileRow>(
      `SELECT * FROM audio_files WHERE id IN (${placeholders})`,
      normalizedIds.map(String)
    );

    const albumIds = Array.from(new Set(rows.map((r) => r.album_id)));
    const albumNameMap = new Map<number, string>();
    if (albumIds.length > 0) {
      const albumPlaceholders = albumIds.map(() => '?').join(',');
      const albums = db.executeSQL<AlbumRow>(
        `SELECT id, name FROM albums WHERE id IN (${albumPlaceholders})`,
        albumIds.map(String)
      );
      for (const album of albums) {
        albumNameMap.set(album.id, album.name);
      }
    }

    const items = rows.map((file) => ({
      ...file,
      album_name: albumNameMap.get(file.album_id) || '未知专辑',
      duration: file.duration ?? 0,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('批量获取音频文件失败:', error);
    return NextResponse.json({ error: '批量获取音频文件失败' }, { status: 500 });
  }
}
