import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/database';
import fs from 'fs';
import path from 'path';

// 获取所有专辑
export async function GET() {
  try {
    const albums = db.get('albums');
    const audioFiles = db.get('audio_files');
    
    // 计算每个专辑的音频文件数量
    const albumsWithCount = albums.map(album => {
      const audioCount = audioFiles.filter(file => file.album_id === album.id).length;
      return {
        ...album,
        audio_count: audioCount
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return NextResponse.json(albumsWithCount);
  } catch (error) {
    console.error('获取专辑列表失败:', error);
    return NextResponse.json({ error: '获取专辑列表失败' }, { status: 500 });
  }
}

// 创建新专辑
export async function POST(request: NextRequest) {
  try {
    const { name, albumPath } = await request.json();
    
    if (!name || !albumPath) {
      return NextResponse.json({ error: '专辑名和路径不能为空' }, { status: 400 });
    }

    // 检查路径是否存在
    if (!fs.existsSync(albumPath)) {
      return NextResponse.json({ error: '指定的路径不存在' }, { status: 400 });
    }

    // 检查专辑名是否已存在
    const existingAlbum = db.getOne('albums', (album: any) => album.name === name);
    if (existingAlbum) {
      return NextResponse.json({ error: '专辑名已存在' }, { status: 400 });
    }

    // 插入专辑
    const newAlbum = db.insert('albums', { name, path: albumPath });
    const albumId = newAlbum.id;

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
    const { id, name, albumPath } = await request.json();
    
    if (!id || !name) {
      return NextResponse.json({ error: '专辑ID和名称不能为空' }, { status: 400 });
    }

    // 检查专辑是否存在
    const album = db.getOne('albums', (album: any) => album.id === id);
    if (!album) {
      return NextResponse.json({ error: '专辑不存在' }, { status: 404 });
    }

    // 如果路径改变，检查新路径是否存在
    if (albumPath && !fs.existsSync(albumPath)) {
      return NextResponse.json({ error: '指定的路径不存在' }, { status: 400 });
    }

    // 更新专辑信息
    const updates: any = { name };
    if (albumPath) {
      updates.path = albumPath;
    }
    db.update('albums', id, updates);

    // 如果路径改变，删除旧的音频文件记录并重新扫描
    if (albumPath && albumPath !== album.path) {
      const audioFiles = db.get('audio_files', (file: any) => file.album_id === id);
      audioFiles.forEach((file: any) => {
        db.delete('audio_files', file.id);
      });
      scanAudioFiles(id, albumPath);
    }

    return NextResponse.json({ message: '专辑更新成功' });
  } catch (error) {
    console.error('更新专辑失败:', error);
    return NextResponse.json({ error: '更新专辑失败' }, { status: 500 });
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
    const album = db.getOne('albums', (album: any) => album.id === albumId);
    if (!album) {
      return NextResponse.json({ error: '专辑不存在' }, { status: 404 });
    }

    // 删除相关的音频文件
    const audioFiles = db.get('audio_files', (file: any) => file.album_id === albumId);
    audioFiles.forEach((file: any) => {
      db.delete('audio_files', file.id);
    });

    // 删除相关的播放历史
    const playHistory = db.get('play_history', (record: any) => record.album_id === albumId);
    playHistory.forEach((record: any) => {
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
      
      for (const file of files) {
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
