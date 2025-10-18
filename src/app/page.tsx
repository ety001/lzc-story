'use client';

import { useState, useEffect } from 'react';
import { Music, Settings, Play, Clock } from 'lucide-react';
import PasswordSetup from '@/components/PasswordSetup';
import PasswordVerify from '@/components/PasswordVerify';
import AdminInterface from '@/components/AdminInterface';
import PlayerInterface from '@/components/PlayerInterface';
import AudioPlayer from '@/components/AudioPlayer';
import { getApiUrl } from '@/lib/api';

type AppState = 'password-setup' | 'password-verify' | 'home' | 'admin' | 'player';

interface PlayHistoryItem {
  album_id: number;
  album_name: string;
  audio_file_id: number;
  filename: string;
  filepath: string;
  played_at: string;
  play_time?: number;
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>('home');
  const [playHistory, setPlayHistory] = useState<PlayHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<PlayHistoryItem | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<any>(null);
  const [audioFiles, setAudioFiles] = useState<any[]>([]);

  useEffect(() => {
    loadPlayHistory();
    
    // 禁用浏览器后退功能
    const handlePopState = (event: PopStateEvent) => {
      // 阻止默认的后退行为
      event.preventDefault();
      // 推送当前状态到历史记录，防止后退
      window.history.pushState(null, '', window.location.href);
    };

    // 添加popstate事件监听器
    window.addEventListener('popstate', handlePopState);
    
    // 推送初始状态到历史记录
    window.history.pushState(null, '', window.location.href);

    // 清理函数
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const checkPasswordStatus = async () => {
    try {
      const response = await fetch(getApiUrl('/api/admin-password'));
      const data = await response.json();
      
      // 检查admin_config中的password_hash是否为空
      if (!data.password_hash || data.password_hash.trim() === '') {
        setAppState('password-setup');
      } else {
        setAppState('password-verify');
      }
    } catch (error) {
      console.error('检查密码状态失败:', error);
    }
  };

  const loadPlayHistory = async () => {
    try {
      const response = await fetch(getApiUrl('/api/play-history'));
      const data = await response.json();
      // 确保data是数组
      setPlayHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('加载播放历史失败:', error);
      setPlayHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlayHistory();
    
    // 禁用浏览器后退功能
    const handlePopState = (event: PopStateEvent) => {
      // 阻止默认的后退行为
      event.preventDefault();
      // 推送当前状态到历史记录，防止后退
      window.history.pushState(null, '', window.location.href);
    };

    // 添加popstate事件监听器
    window.addEventListener('popstate', handlePopState);
    
    // 推送初始状态到历史记录
    window.history.pushState(null, '', window.location.href);

    // 清理函数
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handlePasswordSet = () => {
    setAppState('admin');
  };

  const handlePasswordVerified = () => {
    setAppState('admin');
  };

  const handleNavigateToAdmin = async () => {
    await checkPasswordStatus();
  };

  const handleNavigateToPlayer = () => {
    setAppState('player');
  };

  const handlePlayHistoryClick = async (historyItem: PlayHistoryItem) => {
    setSelectedHistoryItem(historyItem);
    
    try {
      // 加载专辑信息
      const albumsResponse = await fetch(getApiUrl('/api/albums'));
      const albums = await albumsResponse.json();
      const album = albums.find((a: any) => a.id === historyItem.album_id);
      
      if (album) {
        setSelectedAlbum(album);
        
        // 加载音频文件
        const audioFilesResponse = await fetch(getApiUrl(`/api/audio-files?albumId=${album.id}`));
        const audioFiles = await audioFilesResponse.json();
        setAudioFiles(audioFiles);
        
        setAppState('player');
      } else {
        console.error('找不到对应的专辑');
      }
    } catch (error) {
      console.error('加载专辑数据失败:', error);
    }
  };

  const handleBackToHome = () => {
    setAppState('home');
    setSelectedHistoryItem(null);
    setSelectedAlbum(null);
    setAudioFiles([]);
    loadPlayHistory();
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

  if (appState === 'password-setup') {
    return <PasswordSetup onPasswordSet={handlePasswordSet} onBack={handleBackToHome} />;
  }

  if (appState === 'password-verify') {
    return <PasswordVerify onPasswordVerified={handlePasswordVerified} onBack={handleBackToHome} />;
  }

  if (appState === 'admin') {
    return <AdminInterface onBack={handleBackToHome} />;
  }

  if (appState === 'player') {
    // 如果是从播放历史记录进入，直接显示AudioPlayer
    if (selectedHistoryItem && selectedAlbum && audioFiles.length > 0) {
      return (
        <AudioPlayer
          album={selectedAlbum}
          audioFiles={audioFiles}
          onBack={handleBackToHome}
          selectedHistoryItem={selectedHistoryItem}
        />
      );
    }
    // 否则显示PlayerInterface
    return <PlayerInterface onBack={handleBackToHome} />;
  }

  // 首页
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* 头部 */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            <Music className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">懒猫故事机</h1>
          <p className="text-gray-600">简洁的音频播放器</p>
        </div>

        {/* 播放历史 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            播放历史
          </h2>
          
          {!Array.isArray(playHistory) || playHistory.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">暂无播放历史</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(
                playHistory.reduce((acc, item) => {
                  if (!acc[item.album_name]) {
                    acc[item.album_name] = [];
                  }
                  acc[item.album_name].push(item);
                  return acc;
                }, {} as Record<string, PlayHistoryItem[]>)
              ).map(([albumName, items]) => (
                <div key={albumName} className="bg-white rounded-lg shadow-sm p-4">
                  <h3 className="font-medium text-gray-900 mb-2">{albumName}</h3>
                  <div className="space-y-2">
                    {items.slice(0, 2).map((item) => (
                      <div 
                        key={`${item.audio_file_id}-${item.played_at}`} 
                        className="flex items-center justify-between text-sm text-gray-600 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                        onClick={() => handlePlayHistoryClick(item)}
                      >
                        <div className="flex-1">
                          <span className="block">{item.filename}</span>
                          {item.play_time !== undefined && (
                            <span className="text-xs text-gray-500">
                              {item.play_time > 0 
                                ? `播放至 ${Math.floor(item.play_time / 60)}:${(item.play_time % 60).toFixed(0).padStart(2, '0')}`
                                : ''
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleNavigateToAdmin}
            className="bg-white rounded-lg shadow-sm p-6 text-center hover:shadow-md transition-shadow"
          >
            <Settings className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
            <p className="font-medium text-gray-900">管理</p>
            <p className="text-sm text-gray-500">管理专辑</p>
          </button>
          
          <button
            onClick={handleNavigateToPlayer}
            className="bg-white rounded-lg shadow-sm p-6 text-center hover:shadow-md transition-shadow"
          >
            <Play className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
            <p className="font-medium text-gray-900">播放器</p>
            <p className="text-sm text-gray-500">开始播放</p>
          </button>
        </div>
      </div>
    </div>
  );
}
