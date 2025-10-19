'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Music, Settings, Play, Clock, PlayCircle } from 'lucide-react';
import LazyCatIcon from '@/components/LazyCatIcon';
import { getApiUrl } from '@/lib/api';

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
  const [playHistory, setPlayHistory] = useState<PlayHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlayHistory();
  }, []);

  const loadPlayHistory = async () => {
    try {
      const response = await fetch(getApiUrl('/api/play-history'));
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setPlayHistory(data);
      } else {
        setPlayHistory([]);
      }
    } catch (error) {
      console.error('加载播放历史失败:', error);
      setPlayHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleHistoryItemClick = (item: PlayHistoryItem) => {
    // 使用Next.js路由导航到播放器页面
    window.location.href = `/player/${item.album_id}?historyItem=${item.audio_file_id}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <LazyCatIcon size={40} />
              <h1 className="text-2xl font-bold text-gray-900">懒猫故事机</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 播放历史 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-indigo-600" />
            播放历史
          </h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">加载播放历史...</p>
            </div>
          ) : playHistory.length === 0 ? (
            <div className="text-center py-8">
              <Music className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">暂无播放历史</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(playHistory.reduce((acc: { [key: string]: PlayHistoryItem[] }, item) => {
                const key = item.album_name;
                if (!acc[key]) {
                  acc[key] = [];
                }
                acc[key].push(item);
                return acc;
              }, {})).map(([albumName, group], groupIndex) => (
                <div key={groupIndex} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <h3 className="font-medium text-gray-900 truncate" title={albumName}>
                      {albumName}
                    </h3>
                  </div>
                  
                  <div className="divide-y">
                    {group.map((item, index) => (
                      <div
                        key={`${item.audio_file_id}-${item.played_at}`}
                        onClick={() => handleHistoryItemClick(item)}
                        className="group px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            {/* 播放图标 */}
                            <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                              <PlayCircle className="w-5 h-5 text-indigo-600" />
                            </div>
                            
                            {/* 文件信息 */}
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-900 text-xs pr-2 flex-1 min-w-0">
                                  {item.filename}
                                </span>
                              </div>
                              
                              {/* 播放进度和时间 */}
                              <div className="flex items-center justify-between mt-1">
                                {item.play_time !== undefined && item.play_time > 0 ? (
                                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                                    <Clock className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                                    <span className="text-sm text-indigo-600 font-medium truncate">
                                      播放至 {Math.floor(item.play_time / 60)}:{(item.play_time % 60).toFixed(0).padStart(2, '0')}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                                    <Music className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                    <span className="text-sm text-gray-500 truncate">刚开始播放</span>
                                  </div>
                                )}
                                
                                <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                                  {new Date(item.played_at).toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* 悬停时的播放按钮 */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0 ml-2">
                            <Play className="w-5 h-5 text-indigo-600" />
                          </div>
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
          <Link
            href="/admin"
            className="bg-white rounded-lg shadow-sm p-6 text-center hover:shadow-md transition-shadow"
          >
            <Settings className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
            <p className="font-medium text-gray-700">管理专辑</p>
          </Link>
          
          <Link
            href="/player"
            className="bg-white rounded-lg shadow-sm p-6 text-center hover:shadow-md transition-shadow"
          >
            <Play className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
            <p className="font-medium text-gray-700">播放器</p>
          </Link>
        </div>
      </div>
    </div>
  );
}