'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Play, Music } from 'lucide-react';
import AudioPlayer from './AudioPlayer';

interface Album {
  id: number;
  name: string;
  path: string;
  audio_count: number;
  created_at: string;
}

interface AudioFile {
  id: number;
  album_id: number;
  filename: string;
  filepath: string;
  duration: number;
  album_name: string;
}

interface PlayHistoryItem {
  album_id: number;
  album_name: string;
  audio_file_id: number;
  filename: string;
  filepath: string;
  played_at: string;
  play_time?: number;
}

interface PlayerInterfaceProps {
  onBack: () => void;
  selectedHistoryItem?: PlayHistoryItem | null;
}

export default function PlayerInterface({ onBack, selectedHistoryItem }: PlayerInterfaceProps) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlayer, setShowPlayer] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAlbums();
  }, []);

  // 处理从播放历史记录进入的情况
  useEffect(() => {
    if (selectedHistoryItem && albums.length > 0) {
      const album = albums.find(a => a.id === selectedHistoryItem.album_id);
      if (album) {
        setSelectedAlbum(album);
        loadAudioFiles(album.id);
      }
    }
  }, [selectedHistoryItem, albums]);

  const loadAlbums = async () => {
    try {
      const response = await fetch('/api/albums');
      const data = await response.json();
      // 确保data是数组
      setAlbums(Array.isArray(data) ? data : []);
    } catch (error) {
      setError('加载专辑列表失败');
      setAlbums([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAudioFiles = async (albumId: number) => {
    try {
      const response = await fetch(`/api/audio-files?albumId=${albumId}`);
      const data = await response.json();
      // 确保data是数组
      setAudioFiles(Array.isArray(data) ? data : []);
    } catch (error) {
      setError('加载音频文件失败');
      setAudioFiles([]);
    }
  };

  const handleSelectAlbum = async (album: Album) => {
    setSelectedAlbum(album);
    await loadAudioFiles(album.id);
    setShowPlayer(true);
  };

  const handleBackToAlbumList = () => {
    setShowPlayer(false);
    setSelectedAlbum(null);
    setAudioFiles([]);
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

  if (showPlayer && selectedAlbum && audioFiles.length > 0) {
    return (
      <AudioPlayer
        album={selectedAlbum}
        audioFiles={audioFiles}
        onBack={handleBackToAlbumList}
        selectedHistoryItem={selectedHistoryItem}
      />
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
          <h1 className="text-2xl font-bold text-gray-900">选择专辑</h1>
          <div></div>
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
                  <div className="flex-1">
                    <h3 
                      className="font-medium text-gray-900 mb-1 truncate max-w-xs" 
                      title={album.name}
                    >
                      {album.name}
                    </h3>
                    <p 
                      className="text-sm text-gray-600 mb-1 truncate max-w-xs" 
                      title={album.path}
                    >
                      {album.path}
                    </p>
                    <p className="text-xs text-gray-500">
                      {album.audio_count} 个音频文件
                    </p>
                  </div>
                  <button
                    onClick={() => handleSelectAlbum(album)}
                    disabled={album.audio_count === 0}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    播放
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
