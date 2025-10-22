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

// 获取单个专辑
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const albumId = parseInt(id);

        if (isNaN(albumId)) {
            return NextResponse.json({ error: '无效的专辑ID' }, { status: 400 });
        }

        // 查询专辑信息
        const album = db.getOne('albums', 'id = ?', [albumId]) as unknown as Album;

        if (!album) {
            return NextResponse.json({ error: '专辑不存在' }, { status: 404 });
        }

        // 查询该专辑的音频文件数量
        const audioFiles = db.get('audio_files', 'album_id = ?', [albumId]) as unknown as AudioFile[];
        const audioCount = audioFiles.length;

        // 返回包含音频文件数量的专辑信息
        const albumWithCount = {
            ...album,
            audio_count: audioCount
        };

        return NextResponse.json(albumWithCount, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    } catch (error) {
        console.error('获取专辑失败:', error);
        return NextResponse.json({ error: '获取专辑失败' }, { status: 500 });
    }
}
