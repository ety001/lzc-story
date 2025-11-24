import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/sqlite-database';
import fs from 'fs';
import path from 'path';

interface Album {
  id: number;
  name: string;
  path: string;
  is_visible?: number;
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

// 获取所有专辑
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isAdmin = searchParams.get('admin') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || process.env.ADMIN_ALBUMS_PER_PAGE || '10');

    const audioFiles = db.get('audio_files') as unknown as AudioFile[];

    let albums: Album[];

    if (isAdmin) {
      // 管理界面：返回所有专辑，支持分页
      albums = db.get('albums') as unknown as Album[];
    } else {
      // 前台：只返回可见的专辑，且限制数量为 MAX_ALBUMS
      const maxAlbums = parseInt(process.env.MAX_ALBUMS || '10');
      albums = db.executeSQL<Album>(
        'SELECT * FROM albums WHERE is_visible = 1 ORDER BY created_at DESC LIMIT ?',
        [maxAlbums]
      );
    }

    // 计算每个专辑的音频文件数量
    const albumsWithCount = albums.map((album: Album) => {
      const audioCount = audioFiles.filter((file: AudioFile) => file.album_id === album.id).length;
      return {
        ...album,
        audio_count: audioCount,
        is_visible: album.is_visible ?? 0
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // 如果是管理界面且需要分页
    if (isAdmin) {
      const total = albumsWithCount.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedAlbums = albumsWithCount.slice(startIndex, endIndex);

      return NextResponse.json(
        {
          albums: paginatedAlbums,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        },
        {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
    }

    return NextResponse.json(albumsWithCount, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('获取专辑列表失败:', error);
    return NextResponse.json({ error: '获取专辑列表失败' }, { status: 500 });
  }
}

// 创建新专辑
export async function POST(request: NextRequest) {
  try {
    const { name, albumPath, is_visible } = await request.json();

    if (!name || !albumPath) {
      return NextResponse.json({ error: '专辑名和路径不能为空' }, { status: 400 });
    }

    // 检查路径是否存在
    if (!fs.existsSync(albumPath)) {
      return NextResponse.json({ error: '指定的路径不存在' }, { status: 400 });
    }

    // 检查专辑名是否已存在
    const existingAlbum = db.getOne('albums', 'name = ?', [name]);
    if (existingAlbum) {
      return NextResponse.json({ error: '专辑名已存在' }, { status: 400 });
    }

    // 如果设置为显示，检查当前显示的专辑数量是否已达到上限
    if (is_visible) {
      const maxAlbums = parseInt(process.env.MAX_ALBUMS || '10');
      const visibleAlbums = db.executeSQL<{ count: number }>(
        'SELECT COUNT(*) as count FROM albums WHERE is_visible = 1'
      );
      const currentVisibleCount = visibleAlbums[0]?.count || 0;

      if (currentVisibleCount >= maxAlbums) {
        return NextResponse.json({
          error: `前台显示的专辑数量已达到上限（${maxAlbums}个），请先隐藏一些专辑再设置此专辑为显示`
        }, { status: 400 });
      }
    }

    // 插入专辑（is_visible 默认为 0，即不显示）
    const newAlbum = db.insert('albums', {
      name,
      path: albumPath,
      is_visible: is_visible ? 1 : 0
    });
    const albumId = newAlbum.id;

    if (!albumId) {
      return NextResponse.json({ error: '创建专辑失败' }, { status: 500 });
    }

    // 启动扫描任务（异步）
    scanAudioFiles(albumId, albumPath);

    return NextResponse.json({
      message: '专辑创建成功，正在扫描音频文件...',
      albumId
    });
  } catch (error) {
    console.error('创建专辑失败:', error);
    return NextResponse.json({ error: '创建专辑失败' }, { status: 500 });
  }
}

// 更新专辑
export async function PUT(request: NextRequest) {
  try {
    const { id, name, albumPath, is_visible } = await request.json();

    if (!id || !name) {
      return NextResponse.json({ error: '专辑ID和名称不能为空' }, { status: 400 });
    }

    // 检查专辑是否存在
    const album = db.getOne('albums', 'id = ?', [id.toString()]) as Album | null;
    if (!album) {
      return NextResponse.json({ error: '专辑不存在' }, { status: 404 });
    }

    // 如果路径改变，检查新路径是否存在
    if (albumPath && !fs.existsSync(albumPath)) {
      return NextResponse.json({ error: '指定的路径不存在' }, { status: 400 });
    }

    // 如果设置为显示，且当前专辑不是显示状态，检查当前显示的专辑数量是否已达到上限
    if (is_visible !== undefined && is_visible && (album.is_visible ?? 0) !== 1) {
      const maxAlbums = parseInt(process.env.MAX_ALBUMS || '10');
      const visibleAlbums = db.executeSQL<{ count: number }>(
        'SELECT COUNT(*) as count FROM albums WHERE is_visible = 1'
      );
      const currentVisibleCount = visibleAlbums[0]?.count || 0;

      if (currentVisibleCount >= maxAlbums) {
        return NextResponse.json({
          error: `前台显示的专辑数量已达到上限（${maxAlbums}个），请先隐藏一些专辑再设置此专辑为显示`
        }, { status: 400 });
      }
    }

    // 更新专辑信息
    const updates: Record<string, unknown> = { name };
    if (albumPath) {
      updates.path = albumPath;
    }
    if (is_visible !== undefined) {
      updates.is_visible = is_visible ? 1 : 0;
    }
    db.update('albums', id, updates);

    // 如果路径改变，删除旧的音频文件记录并重新扫描
    if (albumPath && albumPath !== album.path) {
      const audioFiles = db.get('audio_files', 'album_id = ?', [id.toString()]) as unknown as AudioFile[];
      audioFiles.forEach((file: AudioFile) => {
        db.delete('audio_files', file.id as number);
      });
      scanAudioFiles(id, albumPath);
    }

    return NextResponse.json({ message: '专辑更新成功' });
  } catch (error) {
    console.error('更新专辑失败:', error);
    return NextResponse.json({ error: '更新专辑失败' }, { status: 500 });
  }
}

// 批量更新专辑显示状态
export async function PATCH(request: NextRequest) {
  try {
    const { albumIds, is_visible } = await request.json();

    if (!Array.isArray(albumIds) || albumIds.length === 0) {
      return NextResponse.json({ error: '专辑ID列表不能为空' }, { status: 400 });
    }

    if (is_visible === undefined) {
      return NextResponse.json({ error: '显示状态不能为空' }, { status: 400 });
    }

    const visibleValue = is_visible ? 1 : 0;

    // 如果批量设置为显示，检查当前显示的专辑数量是否会超过上限
    if (is_visible) {
      const maxAlbums = parseInt(process.env.MAX_ALBUMS || '10');

      // 获取当前已显示的专辑数量（不包括要设置为显示的专辑）
      const currentVisibleAlbums = db.executeSQL<Album>(
        'SELECT * FROM albums WHERE is_visible = 1'
      );
      const albumsToShow = currentVisibleAlbums.filter(album => !albumIds.includes(album.id));
      const newVisibleCount = albumsToShow.length + albumIds.length;

      if (newVisibleCount > maxAlbums) {
        return NextResponse.json({
          error: `批量设置为显示后，前台显示的专辑数量将超过上限（${maxAlbums}个），当前已显示 ${albumsToShow.length} 个，本次将新增 ${albumIds.length} 个`
        }, { status: 400 });
      }
    }

    // 批量更新专辑的显示状态
    for (const albumId of albumIds) {
      const album = db.getOne('albums', 'id = ?', [albumId.toString()]);
      if (album) {
        db.update('albums', albumId, { is_visible: visibleValue });
      }
    }

    return NextResponse.json({ message: '批量更新成功' });
  } catch (error) {
    console.error('批量更新失败:', error);
    return NextResponse.json({ error: '批量更新失败' }, { status: 500 });
  }
}

// 删除专辑
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '专辑ID不能为空' }, { status: 400 });
    }

    const albumId = parseInt(id);

    // 检查专辑是否存在
    const album = db.getOne('albums', 'id = ?', [albumId.toString()]);
    if (!album) {
      return NextResponse.json({ error: '专辑不存在' }, { status: 404 });
    }

    // 删除相关的音频文件
    const audioFiles = db.get('audio_files', 'album_id = ?', [albumId.toString()]) as unknown as AudioFile[];
    audioFiles.forEach((file: AudioFile) => {
      db.delete('audio_files', file.id as number);
    });

    // 删除相关的播放历史
    const playHistory = db.get('play_history', 'album_id = ?', [albumId.toString()]) as unknown as Array<{ id: number }>;
    playHistory.forEach((record: { id: number }) => {
      db.delete('play_history', record.id);
    });

    // 删除专辑
    db.delete('albums', albumId);

    return NextResponse.json({ message: '专辑删除成功' });
  } catch (error) {
    console.error('删除专辑失败:', error);
    return NextResponse.json({ error: '删除专辑失败' }, { status: 500 });
  }
}

// 扫描音频文件的函数
async function scanAudioFiles(albumId: number, albumPath: string) {
  try {
    const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg'];
    const audioFiles: string[] = [];

    function scanDirectory(dirPath: string) {
      const files = fs.readdirSync(dirPath);

      // 对文件名进行数字排序
      const sortedFiles = files.sort((a, b) => {
        // 提取文件名中的数字部分进行排序
        const matchA = a.match(/\d+/);
        const matchB = b.match(/\d+/);
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
        return a.localeCompare(b);
      });

      for (const file of sortedFiles) {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (stat.isFile()) {
          const ext = path.extname(file).toLowerCase();
          if (audioExtensions.includes(ext)) {
            audioFiles.push(fullPath);
          }
        }
      }
    }

    scanDirectory(albumPath);

    // 将音频文件信息保存到数据库
    for (const filePath of audioFiles) {
      const filename = path.basename(filePath);
      db.insert('audio_files', {
        album_id: albumId,
        filename: filename,
        filepath: filePath
      });
    }

    console.log(`扫描完成，找到 ${audioFiles.length} 个音频文件`);
  } catch (error) {
    console.error('扫描音频文件失败:', error);
  }
}
