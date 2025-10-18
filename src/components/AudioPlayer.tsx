'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, SkipBack, Play, Pause, SkipForward, List, X } from 'lucide-react';
import { getApiUrl } from '@/lib/api';

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

interface AudioPlayerProps {
  album: Album;
  audioFiles: AudioFile[];
  onBack: () => void;
  autoPlay?: boolean;
  selectedHistoryItem?: {
    audio_file_id: number;
    play_time?: number;
  } | null;
}

export default function AudioPlayer({ album, audioFiles, onBack, autoPlay = false, selectedHistoryItem }: AudioPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const [hasDragged, setHasDragged] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentFile = audioFiles[currentIndex];

  // 禁用浏览器后退功能和清理定时器
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();
      window.history.pushState(null, '', window.location.href);
    };

    window.addEventListener('popstate', handlePopState);
    window.history.pushState(null, '', window.location.href);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      stopPlayTimeRecording();
    };
  }, []);

  // 处理从播放历史记录进入的情况
  useEffect(() => {
    if (selectedHistoryItem && audioFiles.length > 0) {
      const targetIndex = audioFiles.findIndex(file => file.id === selectedHistoryItem.audio_file_id);
      if (targetIndex !== -1) {
        setCurrentIndex(targetIndex);
        // 如果有播放时间，设置到指定时间并自动播放
        if (selectedHistoryItem.play_time && selectedHistoryItem.play_time > 0) {
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.currentTime = selectedHistoryItem.play_time!;
              setCurrentTime(selectedHistoryItem.play_time!);
              // 自动开始播放
              audioRef.current.play().then(() => {
                setIsPlaying(true);
                startPlayTimeRecording();
              }).catch((error) => {
                console.error('自动播放失败:', error);
              });
            }
          }, 1000); // 延迟1秒确保音频加载完成
        } else {
          // 如果没有播放时间，也自动开始播放
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.play().then(() => {
                setIsPlaying(true);
                startPlayTimeRecording();
              }).catch((error) => {
                console.error('自动播放失败:', error);
              });
            }
          }, 1000);
        }
      }
    }
  }, [selectedHistoryItem, audioFiles]);

  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      
      const updateTime = () => setCurrentTime(audio.currentTime);
      const updateDuration = () => setDuration(audio.duration);
      const handleEnded = () => {
        if (currentIndex < audioFiles.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          setIsPlaying(false);
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
    }
  }, [currentIndex, audioFiles.length]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current && currentFile) {
      audioRef.current.src = `/api/audio-stream?path=${encodeURIComponent(currentFile.filepath)}`;
      if (isPlaying) {
        audioRef.current.play();
      } else if (autoPlay) {
        // 延迟1秒后自动播放
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play().then(() => {
              setIsPlaying(true);
              startPlayTimeRecording();
            }).catch((error) => {
              console.error('自动播放失败:', error);
            });
          }
        }, 1000);
      }
    }
  }, [currentIndex, currentFile, autoPlay]);

  const togglePlayPause = async () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.error('播放失败:', error);
        }
      }
    }
  };

  const playPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const playNext = () => {
    if (currentIndex < audioFiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const selectTrack = (index: number) => {
    setCurrentIndex(index);
    setShowPlaylist(false);
  };

  const addToPlayHistory = async (playTime?: number) => {
    if (currentFile) {
      const timeToRecord = playTime || currentTime;
      // 只有当播放时间大于0时才记录
      if (timeToRecord > 0) {
        try {
          await fetch(getApiUrl('/api/play-history'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              albumId: album.id,
              audioFileId: currentFile.id,
              playTime: timeToRecord,
            }),
          });
        } catch (error) {
          console.error('添加播放记录失败:', error);
        }
      }
    }
  };

  // 开始定时记录播放时间
  const startPlayTimeRecording = () => {
    if (playTimeIntervalRef.current) {
      clearInterval(playTimeIntervalRef.current);
    }
    
    playTimeIntervalRef.current = setInterval(() => {
      if (isPlaying && audioRef.current) {
        addToPlayHistory(audioRef.current.currentTime);
      }
    }, 5000); // 每5秒记录一次
  };

  // 停止定时记录播放时间
  const stopPlayTimeRecording = () => {
    if (playTimeIntervalRef.current) {
      clearInterval(playTimeIntervalRef.current);
      playTimeIntervalRef.current = null;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlay = async () => {
    const wasPlaying = isPlaying;
    await togglePlayPause();
    
    if (!wasPlaying) {
      // 开始播放时，记录当前播放时间并启动定时记录
      addToPlayHistory(audioRef.current?.currentTime || 0);
      startPlayTimeRecording();
    } else {
      // 暂停时，记录当前播放时间并停止定时记录
      addToPlayHistory(audioRef.current?.currentTime || 0);
      stopPlayTimeRecording();
    }
  };

  // 进度条拖拽处理
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
    setIsDragging(true);
    setHasDragged(false);
    handleProgressClick(e);
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !duration) return;
    
    setHasDragged(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const moveX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, moveX / rect.width));
    const newTime = percentage * duration;
    
    setDragTime(newTime);
  };

  const handleProgressMouseUp = () => {
    if (isDragging && audioRef.current) {
      setIsSeeking(true);
      audioRef.current.currentTime = dragTime;
      setCurrentTime(dragTime);
    }
    setIsDragging(false);
    // 延迟重置拖拽标志，避免立即触发点击事件
    setTimeout(() => setHasDragged(false), 100);
  };

  const handleProgressMouseLeave = () => {
    setIsDragging(false);
  };

  // 触摸事件处理（移动设备支持）
  const handleProgressTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setHasDragged(false);
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const percentage = touchX / rect.width;
    const newTime = percentage * duration;
    
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleProgressTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || !duration) return;
    
    setHasDragged(true);
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, touchX / rect.width));
    const newTime = percentage * duration;
    
    setDragTime(newTime);
  };

  const handleProgressTouchEnd = () => {
    if (isDragging && audioRef.current) {
      setIsSeeking(true);
      audioRef.current.currentTime = dragTime;
      setCurrentTime(dragTime);
    }
    setIsDragging(false);
    // 延迟重置拖拽标志，避免立即触发点击事件
    setTimeout(() => setHasDragged(false), 100);
  };

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
          <h1 
            className="text-xl font-bold text-gray-700 truncate max-w-xs" 
            title={album.name}
          >
            {album.name}
          </h1>
          <button
            onClick={() => setShowPlaylist(true)}
            className="p-2 text-gray-600 hover:text-gray-900"
          >
            <List className="w-5 h-5" />
          </button>
        </div>

        {/* 播放器主体 */}
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
          {/* 专辑信息 */}
          <div className="text-center mb-8">
            <div className="w-32 h-32 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🎵</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-700 mb-1">
              {currentFile?.filename || '未知文件'}
            </h2>
            <p className="text-sm text-gray-600">
              {currentIndex + 1} / {audioFiles.length}
            </p>
          </div>

          {/* 进度条 */}
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
                  width: `${duration ? ((isDragging ? dragTime : currentTime) / duration) * 100 : 0}%` 
                }}
              ></div>
              {/* 拖拽指示器 - 合并loading效果 */}
              <div
                className={`absolute top-1/2 transform -translate-y-1/2 w-4 h-4 rounded-full shadow-lg cursor-pointer transition-colors ${
                  isSeeking 
                    ? 'bg-indigo-600 animate-pulse' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
                style={{ 
                  left: `calc(${duration ? ((isDragging ? dragTime : currentTime) / duration) * 100 : 0}% - 8px)` 
                }}
              >
                {/* 在seeking时显示旋转效果 */}
                {isSeeking && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center justify-center space-x-6 mb-6">
            <button
              onClick={playPrevious}
              disabled={currentIndex === 0}
              className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SkipBack className="w-6 h-6 text-gray-700" />
            </button>
            
            <button
              onClick={handlePlay}
              className="p-4 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
            </button>
            
            <button
              onClick={playNext}
              disabled={currentIndex === audioFiles.length - 1}
              className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SkipForward className="w-6 h-6 text-gray-700" />
            </button>
          </div>

          {/* 音量控制 */}
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

        {/* 隐藏的音频元素 */}
        <audio ref={audioRef} preload="metadata" />

        {/* 播放列表 */}
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
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-2">
                  {audioFiles.map((file, index) => (
                    <div
                      key={file.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        index === currentIndex
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => selectTrack(index)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">
                          {file.filename}
                        </span>
                        {index === currentIndex && isPlaying && (
                          <span className="text-xs text-indigo-600">正在播放</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
