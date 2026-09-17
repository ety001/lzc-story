'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, SkipBack, Play, Pause, SkipForward, List, X, Repeat1 } from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import { MAX_BATCH_IDS } from '@/lib/audio-list';
import {
  clearMediaSessionActions,
  initMediaSession,
  msSetMetadata,
  msSetPlaybackState,
  msSetPositionState,
} from '@/lib/media-session';
import type { AudioFile, AudioPlayerProps, AudioFilesBatchResponse, PlayerSettings } from '@/types';

const PLAYLIST_ROW_HEIGHT = 52;
const PLAYLIST_BUFFER = 8;
const PLAYLIST_WINDOW_SIZE = 40;

function seedCache(files: AudioFile[]): Record<number, AudioFile> {
  const cache: Record<number, AudioFile> = {};
  for (const file of files) {
    cache[file.id] = file;
  }
  return cache;
}

export default function AudioPlayer({
  album,
  audioIds,
  initialFiles,
  windowThreshold,
  onBack,
  autoPlay = false,
  selectedHistoryItem,
}: AudioPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const [hasDragged, setHasDragged] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [fileCache, setFileCache] = useState<Record<number, AudioFile>>(() => seedCache(initialFiles));
  const [windowStart, setWindowStart] = useState(0);
  const [windowEnd, setWindowEnd] = useState(() =>
    Math.min(audioIds.length, PLAYLIST_WINDOW_SIZE)
  );

  const audioRef = useRef<HTMLAudioElement>(null);
  const playTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(false);
  const isLoopingRef = useRef(false);
  const historyProcessedRef = useRef(false);
  const pendingIdsRef = useRef<Set<number>>(new Set());
  const fileCacheRef = useRef(fileCache);
  const playlistScrollRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 媒体会话动作回调（始终指向最新实现，避免闭包过期） */
  const msActionsRef = useRef<{
    play: () => void;
    pause: () => void;
    next: () => void;
    prev: () => void;
    seekBy: (delta: number) => void;
    seekTo: (time: number) => void;
  }>({
    play: () => {},
    pause: () => {},
    next: () => {},
    prev: () => {},
    seekBy: () => {},
    seekTo: () => {},
  });

  const totalCount = audioIds.length;
  const useVirtualPlaylist = totalCount > windowThreshold;
  const currentId = audioIds[currentIndex];
  const currentFile = currentId != null ? fileCache[currentId] : undefined;

  useEffect(() => {
    fileCacheRef.current = fileCache;
  }, [fileCache]);

  useEffect(() => {
    setFileCache(seedCache(initialFiles));
  }, [initialFiles]);

  const ensureFiles = useCallback(async (ids: number[]) => {
    const missing: number[] = [];
    for (const id of ids) {
      if (id == null) continue;
      if (fileCacheRef.current[id] || pendingIdsRef.current.has(id)) continue;
      missing.push(id);
    }
    if (missing.length === 0) return;

    for (const id of missing) {
      pendingIdsRef.current.add(id);
    }

    try {
      for (let i = 0; i < missing.length; i += MAX_BATCH_IDS) {
        const chunk = missing.slice(i, i + MAX_BATCH_IDS);
        const response = await fetch(getApiUrl('/api/audio-files/batch'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: chunk }),
        });
        if (!response.ok) {
          console.error('批量加载音频详情失败:', response.status);
          continue;
        }
        const data = (await response.json()) as AudioFilesBatchResponse;
        const items = Array.isArray(data.items) ? data.items : [];
        setFileCache((prev) => {
          const next = { ...prev };
          for (const raw of items) {
            const id = parseInt(String(raw.id), 10);
            next[id] = {
              id,
              album_id: parseInt(String(raw.album_id), 10),
              filename: raw.filename,
              filepath: raw.filepath,
              duration: raw.duration || 0,
              album_name: raw.album_name || album.name,
              created_at: raw.created_at || '',
              updated_at: raw.updated_at || raw.created_at || '',
            };
          }
          return next;
        });
      }
    } finally {
      for (const id of missing) {
        pendingIdsRef.current.delete(id);
      }
    }
  }, [album.name]);

  // 当前曲目及邻曲预加载
  useEffect(() => {
    if (totalCount === 0) return;
    const preload: number[] = [];
    for (let i = currentIndex - 3; i <= currentIndex + 3; i++) {
      if (i >= 0 && i < totalCount) {
        preload.push(audioIds[i]);
      }
    }
    void ensureFiles(preload);
  }, [currentIndex, audioIds, totalCount, ensureFiles]);

  const addToPlayHistory = useCallback(async (playTime?: number) => {
    if (!currentFile) return;
    const timeToRecord = playTime ?? 0;
    if (timeToRecord <= 0) return;

    try {
      const response = await fetch(getApiUrl('/api/play-history'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumId: album.id,
          audioFileId: currentFile.id,
          playTime: timeToRecord,
        }),
      });
      if (!response.ok) {
        console.error('播放历史更新失败:', response.status);
      }
    } catch (error) {
      console.error('添加播放记录失败:', error);
    }
  }, [currentFile, album.id]);

  const stopPlayTimeRecording = useCallback(() => {
    if (playTimeIntervalRef.current) {
      clearInterval(playTimeIntervalRef.current);
      playTimeIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isPlaying) {
      playTimeIntervalRef.current = setInterval(() => {
        if (isPlayingRef.current && audioRef.current) {
          addToPlayHistory(audioRef.current.currentTime);
        }
      }, 5000);
    } else {
      stopPlayTimeRecording();
    }
    return () => {
      stopPlayTimeRecording();
    };
  }, [isPlaying, addToPlayHistory, stopPlayTimeRecording]);

  // 从播放历史定位曲目
  useEffect(() => {
    if (selectedHistoryItem && totalCount > 0 && !historyProcessedRef.current) {
      const targetIndex = audioIds.findIndex((id) => id === selectedHistoryItem.audio_file_id);
      if (targetIndex !== -1 && targetIndex !== currentIndex) {
        setCurrentIndex(targetIndex);
      }
    }
  }, [selectedHistoryItem, audioIds, totalCount, currentIndex]);

  useEffect(() => {
    if (!selectedHistoryItem || historyProcessedRef.current) return;
    if (totalCount === 0) return;

    const targetIndex = audioIds.findIndex((id) => id === selectedHistoryItem.audio_file_id);
    if (targetIndex !== currentIndex) return;
    if (!currentFile) return;

    historyProcessedRef.current = true;

    const handleAudioReady = () => {
      if (audioRef.current && selectedHistoryItem.play_time && selectedHistoryItem.play_time > 0) {
        audioRef.current.currentTime = selectedHistoryItem.play_time;
        setCurrentTime(selectedHistoryItem.play_time);
      }
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          isPlayingRef.current = true;
        }).catch((error) => {
          if (error.name !== 'NotAllowedError') {
            console.error('自动播放失败:', error);
          }
        });
      }
    };

    if (audioRef.current) {
      const audio = audioRef.current;
      audio.addEventListener('canplay', handleAudioReady, { once: true });
      return () => {
        audio.removeEventListener('canplay', handleAudioReady);
      };
    }
  }, [selectedHistoryItem, audioIds, currentIndex, currentFile, totalCount]);

  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      if (isLoopingRef.current) {
        addToPlayHistory(audioRef.current?.currentTime || 0);
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
        return;
      }
      if (currentIndex < totalCount - 1) {
        addToPlayHistory(audioRef.current?.currentTime || 0);
        setCurrentIndex(currentIndex + 1);
      } else {
        addToPlayHistory(audioRef.current?.currentTime || 0);
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    };
    const handleSeeking = () => setIsSeeking(true);
    const handleSeeked = () => setIsSeeking(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('seeking', handleSeeking);
    audio.addEventListener('seeked', handleSeeked);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('seeking', handleSeeking);
      audio.removeEventListener('seeked', handleSeeked);
    };
  }, [currentIndex, totalCount, addToPlayHistory]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    isLoopingRef.current = isLooping;
    if (audioRef.current) {
      audioRef.current.loop = isLooping;
    }
  }, [isLooping]);

  // 从服务端恢复单曲循环偏好
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(getApiUrl('/api/player-settings'));
        if (!response.ok) return;
        const data = (await response.json()) as PlayerSettings;
        if (!cancelled && typeof data.loop === 'boolean') {
          setIsLooping(data.loop);
        }
      } catch (error) {
        console.error('加载单曲循环设置失败:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    // 切歌后详情尚未 batch 回来：先停住旧曲，避免序号已变但继续播上一首
    if (!currentFile) {
      audio.pause();
      setIsPlaying(false);
      isPlayingRef.current = false;
      return;
    }

    const audioUrl = `/api/audio-stream?path=${encodeURIComponent(currentFile.filepath)}`;

    audio.pause();
    setIsPlaying(false);
    isPlayingRef.current = false;
    audio.src = audioUrl;

    const handleCanPlay = () => {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsPlaying(true);
          isPlayingRef.current = true;
        }).catch((error) => {
          if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
            console.error('自动播放失败:', error);
          }
        });
      }
    };
    const handleError = (e: Event) => console.error('音频加载错误:', e);

    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [currentIndex, currentFile]);

  useEffect(() => {
    if (!audioRef.current || !currentFile || !autoPlay || currentIndex !== 0) return;
    const audio = audioRef.current;
    const handleCanPlay = () => {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsPlaying(true);
          isPlayingRef.current = true;
        }).catch((error) => {
          if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
            console.error('初始自动播放失败:', error);
          }
        });
      }
    };
    audio.addEventListener('canplay', handleCanPlay, { once: true });
    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [autoPlay, currentFile, currentIndex]);

  const updatePlaylistWindow = useCallback(() => {
    const el = playlistScrollRef.current;
    if (!el || !useVirtualPlaylist) return;

    const scrollTop = el.scrollTop;
    const startIndex = Math.max(0, Math.floor(scrollTop / PLAYLIST_ROW_HEIGHT) - PLAYLIST_BUFFER);
    const endIndex = Math.min(totalCount, startIndex + PLAYLIST_WINDOW_SIZE);
    setWindowStart(startIndex);
    setWindowEnd(endIndex);

    const needIds: number[] = [];
    for (let i = startIndex; i < endIndex; i++) {
      needIds.push(audioIds[i]);
    }
    void ensureFiles(needIds);
  }, [useVirtualPlaylist, totalCount, audioIds, ensureFiles]);

  useEffect(() => {
    if (!showPlaylist) return;
    if (useVirtualPlaylist) {
      // 打开列表时定位到当前曲附近
      requestAnimationFrame(() => {
        const el = playlistScrollRef.current;
        if (el) {
          el.scrollTop = Math.max(0, currentIndex * PLAYLIST_ROW_HEIGHT - PLAYLIST_ROW_HEIGHT * 2);
        }
        updatePlaylistWindow();
      });
    } else {
      void ensureFiles(audioIds);
      setWindowStart(0);
      setWindowEnd(totalCount);
    }
  }, [showPlaylist, useVirtualPlaylist, currentIndex, updatePlaylistWindow, ensureFiles, audioIds, totalCount]);

  // 媒体会话接入（方向盘/耳机线控/锁屏媒体按键）
  useEffect(() => {
    initMediaSession({
      play: () => msActionsRef.current.play(),
      pause: () => msActionsRef.current.pause(),
      next: () => msActionsRef.current.next(),
      prev: () => msActionsRef.current.prev(),
      seekBy: (delta) => msActionsRef.current.seekBy(delta),
      seekTo: (time) => msActionsRef.current.seekTo(time),
    });

    const posTimer = setInterval(() => {
      const audio = audioRef.current;
      if (audio && audio.duration && Number.isFinite(audio.duration)) {
        msSetPositionState(audio.duration, audio.currentTime, audio.playbackRate || 1);
      }
    }, 5000);

    return () => {
      clearInterval(posTimer);
      clearMediaSessionActions();
    };
  }, []);

  // 换歌时同步标题/专辑到系统媒体界面
  useEffect(() => {
    if (!currentFile) return;
    msSetMetadata({
      title: currentFile.filename,
      artist: currentFile.album_name || album.name,
      album: album.name || '懒猫故事机',
    });
  }, [currentFile, album.name]);

  // 播放状态同步到媒体会话
  useEffect(() => {
    msSetPlaybackState(isPlaying ? 'playing' : 'paused');
  }, [isPlaying]);

  const handlePlaylistScroll = () => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      updatePlaylistWindow();
    }, 50);
  };

  const pausePlayback = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
    isPlayingRef.current = false;
    msSetPlaybackState('paused');
  }, []);

  const resumePlayback = useCallback(async () => {
    if (!audioRef.current) return;
    try {
      await audioRef.current.play();
      setIsPlaying(true);
      isPlayingRef.current = true;
      msSetPlaybackState('playing');
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('播放失败:', error);
      }
    }
  }, []);

  const togglePlayPause = async () => {
    if (isPlaying) {
      pausePlayback();
    } else {
      await resumePlayback();
    }
  };

  const playPrevious = () => {
    if (currentIndex > 0) {
      addToPlayHistory(audioRef.current?.currentTime || 0);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const playNext = () => {
    if (currentIndex < totalCount - 1) {
      addToPlayHistory(audioRef.current?.currentTime || 0);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const seekBy = (delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      const max = Number.isFinite(audio.duration) ? audio.duration : audio.currentTime + delta;
      audio.currentTime = Math.max(0, Math.min(audio.currentTime + delta, max));
    } catch {
      // seek 失败不影响播放
    }
  };

  const seekTo = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      const max = Number.isFinite(audio.duration) ? audio.duration : time;
      audio.currentTime = Math.max(0, Math.min(time, max));
    } catch {
      // seek 失败不影响播放
    }
  };

  // 同步媒体会话动作到最新闭包
  msActionsRef.current = {
    play: () => {
      void resumePlayback();
    },
    pause: pausePlayback,
    next: playNext,
    prev: playPrevious,
    seekBy,
    seekTo,
  };

  const toggleLoop = () => {
    setIsLooping((prev) => {
      const next = !prev;
      fetch(getApiUrl('/api/player-settings'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loop: next }),
      }).catch((error) => {
        console.error('保存单曲循环设置失败:', error);
      });
      return next;
    });
  };

  const selectTrack = (index: number) => {
    addToPlayHistory(audioRef.current?.currentTime || 0);
    setCurrentIndex(index);
    setShowPlaylist(false);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlay = async () => {
    await togglePlayPause();
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration || hasDragged) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    setIsSeeking(true);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    setIsDragging(true);
    setHasDragged(false);
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    setDragTime(percentage * duration);
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !duration) return;
    setHasDragged(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    setDragTime(percentage * duration);
  };

  const handleProgressMouseUp = () => {
    if (isDragging && audioRef.current && hasDragged) {
      setIsSeeking(true);
      audioRef.current.currentTime = dragTime;
      setCurrentTime(dragTime);
    }
    setIsDragging(false);
    setTimeout(() => setHasDragged(false), 10);
  };

  const handleProgressMouseLeave = () => {
    if (isDragging) {
      handleProgressMouseUp();
    }
  };

  const handleProgressTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    setIsDragging(true);
    setHasDragged(false);
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, touchX / rect.width));
    setDragTime(percentage * duration);
  };

  const handleProgressTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || !duration) return;
    setHasDragged(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, touchX / rect.width));
    setDragTime(percentage * duration);
  };

  const handleProgressTouchEnd = () => {
    if (isDragging && audioRef.current && hasDragged) {
      setIsSeeking(true);
      audioRef.current.currentTime = dragTime;
      setCurrentTime(dragTime);
    }
    setIsDragging(false);
    setTimeout(() => setHasDragged(false), 10);
  };

  const visibleStart = useVirtualPlaylist ? windowStart : 0;
  const visibleEnd = useVirtualPlaylist ? windowEnd : totalCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-700 truncate max-w-xs" title={album.name}>
            {album.name}
          </h1>
          <button
            onClick={() => setShowPlaylist(true)}
            className="flex items-center text-gray-600 hover:text-gray-900"
            title="播放列表"
          >
            <List className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
          <div className="text-center mb-8">
            <div
              className={`w-32 h-32 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 transition-transform duration-300 ${
                isPlaying ? 'animate-spin' : ''
              }`}
              style={{
                animationDuration: '10s',
                animationPlayState: isPlaying ? 'running' : 'paused',
              }}
            >
              <span className="text-4xl">🎵</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-700 mb-1">
              {currentFile?.filename || (currentId != null ? '加载中...' : '未知文件')}
            </h2>
            <p className="text-sm text-gray-600">
              {currentIndex + 1} / {totalCount}
            </p>
          </div>

          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>{formatTime(isDragging ? dragTime : currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            <div
              className="w-full bg-gray-200 rounded-full h-2 cursor-pointer relative"
              onClick={handleProgressClick}
              onMouseDown={handleProgressMouseDown}
              onMouseMove={handleProgressMouseMove}
              onMouseUp={handleProgressMouseUp}
              onMouseLeave={handleProgressMouseLeave}
              onTouchStart={handleProgressTouchStart}
              onTouchMove={handleProgressTouchMove}
              onTouchEnd={handleProgressTouchEnd}
            >
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${duration ? ((isDragging ? dragTime : currentTime) / duration) * 100 : 0}%`,
                }}
              ></div>
              <div
                className={`absolute top-1/2 transform -translate-y-1/2 w-4 h-4 rounded-full shadow-lg cursor-pointer transition-colors ${
                  isSeeking ? 'bg-indigo-600 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
                style={{
                  left: `calc(${duration ? ((isDragging ? dragTime : currentTime) / duration) * 100 : 0}% - 8px)`,
                }}
              >
                {isSeeking && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-6 mb-6">
            <button
              onClick={playPrevious}
              disabled={currentIndex === 0}
              className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="上一首"
            >
              <SkipBack className="w-6 h-6 text-gray-700" />
            </button>

            <button
              onClick={handlePlay}
              className="p-4 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white"
              title={isPlaying ? '暂停' : '播放'}
            >
              {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
            </button>

            <button
              onClick={playNext}
              disabled={currentIndex === totalCount - 1}
              className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="下一首"
            >
              <SkipForward className="w-6 h-6 text-gray-700" />
            </button>

            <button
              onClick={toggleLoop}
              className={`p-3 rounded-full transition-colors ${
                isLooping
                  ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={isLooping ? '关闭单曲循环' : '开启单曲循环'}
              aria-pressed={isLooping}
            >
              <Repeat1 className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">音量</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm text-gray-600">{Math.round(volume * 100)}%</span>
          </div>
        </div>

        <audio ref={audioRef} preload="metadata" />

        {showPlaylist && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-96 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">播放列表</h2>
                <button
                  onClick={() => setShowPlaylist(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div
                ref={playlistScrollRef}
                className="flex-1 overflow-y-auto"
                onScroll={useVirtualPlaylist ? handlePlaylistScroll : undefined}
              >
                {useVirtualPlaylist ? (
                  <div
                    className="relative"
                    style={{ height: totalCount * PLAYLIST_ROW_HEIGHT }}
                  >
                    <div
                      className="absolute left-0 right-0"
                      style={{
                        transform: `translateY(${visibleStart * PLAYLIST_ROW_HEIGHT}px)`,
                      }}
                    >
                      {Array.from({ length: Math.max(0, visibleEnd - visibleStart) }, (_, i) => {
                        const index = visibleStart + i;
                        const id = audioIds[index];
                        const file = fileCache[id];
                        return (
                          <div
                            key={id}
                            className={`px-3 rounded-lg cursor-pointer transition-colors flex items-center ${
                              index === currentIndex
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'hover:bg-gray-50'
                            }`}
                            style={{ height: PLAYLIST_ROW_HEIGHT }}
                            onClick={() => selectTrack(index)}
                          >
                            <div className="flex items-center justify-between w-full min-w-0">
                              <span className="text-sm font-medium truncate">
                                {file?.filename || '加载中...'}
                              </span>
                              {index === currentIndex && isPlaying && (
                                <span className="text-xs text-indigo-600 ml-2 shrink-0">正在播放</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {audioIds.map((id, index) => {
                      const file = fileCache[id];
                      return (
                        <div
                          key={id}
                          className={`p-3 rounded-lg cursor-pointer transition-colors ${
                            index === currentIndex
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => selectTrack(index)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium truncate">
                              {file?.filename || '加载中...'}
                            </span>
                            {index === currentIndex && isPlaying && (
                              <span className="text-xs text-indigo-600">正在播放</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
