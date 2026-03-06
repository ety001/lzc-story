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

    const normalizeDir = (p: string) => path.resolve(p);
    const isPathInside = (rootDir: string, filePath: string) => {
      const rel = path.relative(rootDir, filePath);
      return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
    };
    const inferOldRootFromFilepaths = (filepaths: string[]) => {
      if (filepaths.length === 0) return null;
      const dirPartsList = filepaths.map(fp => {
        const dir = path.resolve(path.dirname(fp));
        return dir.split(path.sep).filter(Boolean);
      });
      let prefix = dirPartsList[0]!;
      for (const parts of dirPartsList.slice(1)) {
        const len = Math.min(prefix.length, parts.length);
        let i = 0;
        for (; i < len; i++) {
          if (prefix[i] !== parts[i]) break;
        }
        prefix = prefix.slice(0, i);
        if (prefix.length === 0) break;
      }
      const root = path.parse(path.resolve(filepaths[0]!)).root;
      const candidate = root + prefix.join(path.sep);
      const normalized = path.resolve(candidate);
      if (!path.isAbsolute(normalized)) return null;
      if (normalized === root) return null;
      return normalized;
    };

    // - 如果 albumPath 变化：用 album.path 作为 oldRoot 迁移
    // - 如果 albumPath 未变化但发现 audio_files 仍不在新路径下：从 audio_files.filepath 推断 oldRoot 后迁移
    // 迁移后仅补扫新增文件，避免破坏 play_history
    if (albumPath) {
      const newRoot = normalizeDir(albumPath);
      const currentAlbumRoot = normalizeDir(album.path);
      const audioFiles = db.get('audio_files', 'album_id = ?', [id.toString()]) as unknown as AudioFile[];
      const staleFiles = audioFiles.filter(file => {
        const fp = path.resolve(file.filepath);
        return !isPathInside(newRoot, fp);
      });

      let oldRoot: string | null = null;
      if (newRoot !== currentAlbumRoot) {
        oldRoot = currentAlbumRoot;
      } else if (staleFiles.length > 0) {
        oldRoot = inferOldRootFromFilepaths(staleFiles.map(f => f.filepath));
      }

      if (oldRoot && oldRoot !== newRoot) {
        for (const file of audioFiles) {
          const currentPath = path.resolve(file.filepath);
          if (isPathInside(newRoot, currentPath)) continue;
          const rel = path.relative(oldRoot, currentPath);
          if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) continue;
          const migrated = path.join(newRoot, rel);
          db.update('audio_files', file.id as number, { filepath: migrated });
        }
      } else if (staleFiles.length > 0) {
        console.warn(
          `[albums.put] detected stale audio_files but cannot infer oldRoot (albumId=${id}, albumPath=${newRoot})`
        );
      }

      await scanAudioFiles(id, newRoot, { onlyAddNew: true });
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

// 扫描音频文件的函数；onlyAddNew 为 true 时仅插入尚不存在的文件（用于专辑路径变更后补扫新文件）
async function scanAudioFiles(
  albumId: number,
  albumPath: string,
  options?: { onlyAddNew?: boolean }
) {
  try {
    const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg'];
    const scannedPaths: string[] = [];
    const onlyAddNew = options?.onlyAddNew ?? false;

    function scanDirectory(dirPath: string) {
      const files = fs.readdirSync(dirPath);

      const sortedFiles = files.sort((a, b) => {
        const matchA = a.match(/\d+/);
        const matchB = b.match(/\d+/);
        const numA = parseInt(matchA ? matchA[0] : '0');
        const numB = parseInt(matchB ? matchB[0] : '0');

        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        if (!isNaN(numA) && isNaN(numB)) return -1;
        if (isNaN(numA) && !isNaN(numB)) return 1;
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
            scannedPaths.push(fullPath);
          }
        }
      }
    }

    scanDirectory(albumPath);

    // onlyAddNew 时用规范化路径比较，避免 path.join/path.resolve 等差异导致重复插入
    let existingNormalizedPaths: Set<string> | null = null;
    if (onlyAddNew) {
      const existing = db.get('audio_files', 'album_id = ?', [albumId.toString()]) as unknown as AudioFile[];
      existingNormalizedPaths = new Set(existing.map(f => path.resolve(f.filepath)));
    }

    let addedCount = 0;
    const seenInThisScan = new Set<string>();
    for (const filePath of scannedPaths) {
      const normalizedPath = path.resolve(filePath);
      if (onlyAddNew) {
        if (existingNormalizedPaths!.has(normalizedPath) || seenInThisScan.has(normalizedPath)) continue;
        seenInThisScan.add(normalizedPath);
      }
      const filename = path.basename(filePath);
      db.insert('audio_files', {
        album_id: albumId,
        filename: filename,
        filepath: normalizedPath
      });
      addedCount += 1;
    }

    console.log(
      onlyAddNew
        ? `补扫完成，新增 ${addedCount} 个音频文件`
        : `扫描完成，找到 ${scannedPaths.length} 个音频文件`
    );
  } catch (error) {
    console.error('扫描音频文件失败:', error);
  }
}
