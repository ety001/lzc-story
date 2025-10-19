'use client';

import { useState, useEffect } from 'react';
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

export default function AlbumPlayerPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const albumId = params.albumId as string;
  
  const [album, setAlbum] = useState<Album | null>(null);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<PlayHistoryItem | null>(null);

  useEffect(() => {
    if (albumId) {
      loadAlbumData();
      
      // 检查是否有历史记录参数
      const historyItemId = searchParams.get('historyItem');
      if (historyItemId) {
        loadHistoryItem(parseInt(historyItemId));
      }
    }
  }, [albumId, searchParams]);

  const loadAlbumData = async () => {
    console.log('loadAlbumData called');
    try {
      // 加载专辑信息
      const albumResponse = await fetch(getApiUrl('/api/albums'));
      const albums = await albumResponse.json();
      console.log('Albums:', albums);
      
      const currentAlbum = albums.find((a: any) => a.id === albumId);
      console.log('Current album:', currentAlbum);
      
      if (currentAlbum) {
        // 转换数据类型以匹配AudioPlayer组件的期望
        const convertedAlbum = {
          ...currentAlbum,
          id: parseInt(currentAlbum.id),
          audio_count: parseInt(currentAlbum.audio_count.toString())
        };
        setAlbum(convertedAlbum);
        
        // 加载音频文件
        const filesResponse = await fetch(getApiUrl(`/api/audio-files?albumId=${albumId}`));
        const files = await filesResponse.json();
        
        if (Array.isArray(files)) {
          // 转换音频文件数据类型
          const convertedFiles = files.map((file: any) => ({
            ...file,
            id: parseInt(file.id),
            album_id: parseInt(file.album_id)
          }));
          setAudioFiles(convertedFiles);
        } else {
          setAudioFiles([]);
        }
      }
    } catch (error) {
      console.error('加载专辑数据失败:', error);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const loadHistoryItem = async (audioFileId: number) => {
    try {
      const response = await fetch(getApiUrl('/api/play-history'));
      const history = await response.json();
      
      if (Array.isArray(history)) {
        const historyItem = history.find((item: any) => 
          item.audio_file_id === audioFileId.toString() && item.album_id === albumId
        );
        
        if (historyItem) {
          // 转换历史记录数据类型
          const convertedHistoryItem = {
            ...historyItem,
            audio_file_id: parseInt(historyItem.audio_file_id),
            album_id: parseInt(historyItem.album_id)
          };
          setSelectedHistoryItem(convertedHistoryItem);
        }
      }
    } catch (error) {
      console.error('加载历史记录失败:', error);
    }
  };

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
