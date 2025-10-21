'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Play, Music } from 'lucide-react';
import { getApiUrl } from '@/lib/api';

interface Album {
    id: number;
    name: string;
    path: string;
    audio_count: number;
    created_at: string;
}

interface AlbumSelectorProps {
    onBack: () => void;
    onSelectAlbum: (album: Album) => void;
}

export default function AlbumSelector({ onBack, onSelectAlbum }: AlbumSelectorProps) {
    const [albums, setAlbums] = useState<Album[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadAlbums();
    }, []);

    const loadAlbums = async () => {
        try {
            const response = await fetch(getApiUrl('/api/albums'));
            const data = await response.json();
            // 确保data是数组
            setAlbums(Array.isArray(data) ? data : []);
        } catch {
            setError('加载专辑列表失败');
            setAlbums([]);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">加载中...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="container mx-auto px-4 py-8">
                {/* 头部 */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={onBack}
                        className="flex items-center text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-700 truncate max-w-xs" title="选择专辑">选择专辑</h1>
                    <div className="w-5"></div>
                </div>

                {/* 错误提示 */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                )}

                {/* 专辑列表 */}
                <div className="space-y-4">
                    {albums.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                            <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500 mb-4">暂无专辑</p>
                            <p className="text-sm text-gray-400">请先在管理界面创建专辑</p>
                        </div>
                    ) : (
                        albums.map((album) => (
                            <div key={album.id} className="bg-white rounded-lg shadow-sm p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 pr-4">
                                        <h3
                                            className="font-medium text-gray-700 mb-1 max-w-xs"
                                            title={album.name}
                                        >
                                            {album.name}
                                        </h3>
                                        <p className="text-xs text-gray-500">
                                            {album.audio_count} 个音频文件
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => onSelectAlbum(album)}
                                        disabled={album.audio_count === 0}
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                    >
                                        <Play className="w-4 h-4 mx-auto" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
