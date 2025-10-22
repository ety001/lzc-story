'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import AudioPlayer from '@/components/AudioPlayer';
import { getApiUrl } from '@/lib/api';

interface Album {
  id: number;
  name: string;
  path: string;
  audio_count: number;
  created_at: string;
  updated_at: string;
}

interface AudioFile {
  id: number;
  album_id: number;
  filename: string;
  filepath: string;
  duration: number;
  album_name: string;
  created_at: string;
  updated_at: string;
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

interface AudioFileResponse {
  id: string | number;
  album_id: string | number;
  filename: string;
  filepath: string;
  file_size: number;
  duration: number | null;
  created_at: string | null;
}

interface PlayHistoryResponse {
  id: number;
  album_id: number;
  audio_file_id: number;
  play_time: number;
  played_at: string;
}

export default function AlbumPlayerPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const albumId = params.albumId as string;

  const [album, setAlbum] = useState<Album | null>(null);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<PlayHistoryItem | null>(null);

  const loadAlbumInfo = useCallback(async () => {
    try {
      const albumResponse = await fetch(getApiUrl(`/api/albums/${albumId}`));

      if (!albumResponse.ok) {
        throw new Error('专辑不存在');
      }

      const currentAlbum = await albumResponse.json();
      console.log('Current album:', currentAlbum);

      // 转换数据类型以匹配AudioPlayer组件的期望
      const convertedAlbum = {
        ...currentAlbum,
        id: parseInt(currentAlbum.id),
        audio_count: parseInt(currentAlbum.audio_count.toString())
      };
      setAlbum(convertedAlbum);
      return convertedAlbum;
    } catch (error) {
      console.error('加载专辑信息失败:', error);
      setAlbum(null);
      throw error;
    }
  }, [albumId]);

  const loadAudioFiles = useCallback(async (albumName: string) => {
    try {
      const filesResponse = await fetch(getApiUrl(`/api/audio-files?albumId=${albumId}`));
      const files = await filesResponse.json();

      if (Array.isArray(files)) {
        // 转换音频文件数据类型
        const convertedFiles = files.map((file: AudioFileResponse) => ({
          id: parseInt(String(file.id)),
          album_id: parseInt(String(file.album_id)),
          filename: file.filename,
          filepath: file.filepath,
          duration: file.duration || 0,
          album_name: albumName,
          created_at: file.created_at || '',
          updated_at: file.created_at || ''
        }));
        setAudioFiles(convertedFiles);
      } else {
        setAudioFiles([]);
      }
    } catch (error) {
      console.error('加载音频文件失败:', error);
      setAudioFiles([]);
      throw error;
    }
  }, [albumId]);

  const loadAlbumData = useCallback(async () => {
    console.log('loadAlbumData called');
    try {
      // 先加载专辑信息
      const albumInfo = await loadAlbumInfo();

      // 然后加载音频文件
      await loadAudioFiles(albumInfo.name);
    } catch (error) {
      console.error('加载专辑数据失败:', error);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  }, [loadAlbumInfo, loadAudioFiles]);

  const loadHistoryItem = useCallback(async (audioFileId: number) => {
    try {
      const response = await fetch(getApiUrl(`/api/play-history?audioFileId=${audioFileId}&albumId=${albumId}`));
      const historyItem = await response.json();

      if (historyItem) {
        // 转换历史记录数据类型
        const convertedHistoryItem = {
          ...historyItem,
          audio_file_id: parseInt(historyItem.audio_file_id),
          album_id: parseInt(historyItem.album_id)
        };
        setSelectedHistoryItem(convertedHistoryItem);
      } else {
        setSelectedHistoryItem(null);
      }
    } catch (error) {
      console.error('加载历史记录失败:', error);
      setSelectedHistoryItem(null);
    }
  }, [albumId]);

  useEffect(() => {
    loadAlbumData();
  }, []);

  useEffect(() => {
    // 检查是否有历史记录参数
    const historyItemId = searchParams.get('historyItem');
    if (historyItemId && albumId) {
      loadHistoryItem(parseInt(historyItemId));
    }
  }, [searchParams, albumId, loadHistoryItem]); // 只在搜索参数变化时执行

  const handleBack = () => {
    router.push('/player');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载专辑数据...</p>
        </div>
      </div>
    );
  }

  if (!album || audioFiles.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">专辑不存在或没有音频文件</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            返回播放器
          </button>
        </div>
      </div>
    );
  }

  return (
    <AudioPlayer
      album={album}
      audioFiles={audioFiles}
      onBack={handleBack}
      selectedHistoryItem={selectedHistoryItem}
    />
  );
}
