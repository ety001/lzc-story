'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import AudioPlayer from '@/components/AudioPlayer';
import { getApiUrl } from '@/lib/api';
import type {
  Album,
  AudioFile,
  PlayHistoryItem,
  AudioFilesListResponse,
  AudioFileResponse,
} from '@/types';

function toAudioFile(file: AudioFileResponse, albumName: string): AudioFile {
  return {
    id: parseInt(String(file.id), 10),
    album_id: parseInt(String(file.album_id), 10),
    filename: file.filename,
    filepath: file.filepath,
    duration: file.duration || 0,
    album_name: file.album_name || albumName,
    created_at: file.created_at || '',
    updated_at: file.updated_at || file.created_at || '',
  };
}

export default function AlbumPlayerPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const albumId = params.albumId as string;

  const [album, setAlbum] = useState<Album | null>(null);
  const [audioIds, setAudioIds] = useState<number[]>([]);
  const [initialFiles, setInitialFiles] = useState<AudioFile[]>([]);
  const [windowThreshold, setWindowThreshold] = useState(50);
  const [loading, setLoading] = useState(true);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<PlayHistoryItem | null>(null);

  const loadAlbumInfo = useCallback(async () => {
    const albumResponse = await fetch(getApiUrl(`/api/albums/${albumId}`));
    if (!albumResponse.ok) {
      throw new Error('专辑不存在');
    }
    const currentAlbum = await albumResponse.json();
    const convertedAlbum = {
      ...currentAlbum,
      id: parseInt(currentAlbum.id),
      audio_count: parseInt(currentAlbum.audio_count.toString()),
    };
    setAlbum(convertedAlbum);
    return convertedAlbum as Album;
  }, [albumId]);

  const loadAudioFiles = useCallback(async (albumName: string) => {
    // 首屏按默认窗口阈值拉取；接口同时返回全量 audio_ids
    const filesResponse = await fetch(
      getApiUrl(`/api/audio-files?albumId=${albumId}&limit=50&offset=0`)
    );
    const data = (await filesResponse.json()) as AudioFilesListResponse;

    if (!data || !Array.isArray(data.audio_ids)) {
      setAudioIds([]);
      setInitialFiles([]);
      return;
    }

    setAudioIds(data.audio_ids.map((id) => parseInt(String(id), 10)));
    setWindowThreshold(
      typeof data.window_threshold === 'number' && data.window_threshold > 0
        ? data.window_threshold
        : 50
    );
    setInitialFiles(
      (Array.isArray(data.items) ? data.items : []).map((file) => toAudioFile(file, albumName))
    );
  }, [albumId]);

  const loadAlbumData = useCallback(async () => {
    try {
      const albumInfo = await loadAlbumInfo();
      await loadAudioFiles(albumInfo.name);
    } catch (error) {
      console.error('加载专辑数据失败:', error);
      setAlbum(null);
      setAudioIds([]);
      setInitialFiles([]);
    } finally {
      setLoading(false);
    }
  }, [loadAlbumInfo, loadAudioFiles]);

  const loadHistoryItem = useCallback(async (audioFileId: number) => {
    try {
      const response = await fetch(
        getApiUrl(`/api/play-history?audioFileId=${audioFileId}&albumId=${albumId}`)
      );
      const historyItem = await response.json();
      if (historyItem) {
        setSelectedHistoryItem({
          ...historyItem,
          audio_file_id: parseInt(historyItem.audio_file_id),
          album_id: parseInt(historyItem.album_id),
        });
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
  }, [loadAlbumData]);

  useEffect(() => {
    const historyItemId = searchParams.get('historyItem');
    if (historyItemId && albumId) {
      loadHistoryItem(parseInt(historyItemId));
    }
  }, [searchParams, albumId, loadHistoryItem]);

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

  if (!album || audioIds.length === 0) {
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
      audioIds={audioIds}
      initialFiles={initialFiles}
      windowThreshold={windowThreshold}
      onBack={handleBack}
      selectedHistoryItem={selectedHistoryItem}
    />
  );
}
