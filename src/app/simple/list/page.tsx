'use client';

import { useState, useEffect } from 'react';

interface Album {
  id: number;
  name: string;
  path: string;
  audio_count: number;
  is_visible?: number;
  created_at: string;
  updated_at?: string;
}

export default function SimpleListPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(function () {
    loadAlbums();
  }, []);

  function loadAlbums() {
    setLoading(true);
    setError('');

    fetch('/api/albums')
      .then(function (response) {
        if (!response.ok) {
          throw new Error('加载失败');
        }
        return response.json();
      })
      .then(function (data) {
        // eslint-disable-next-line no-var
        var albumsList = Array.isArray(data) ? data : [];
        setAlbums(albumsList);
      })
      .catch(function (err) {
        console.error('加载专辑列表失败:', err);
        setError('加载专辑列表失败');
        setAlbums([]);
      })
      .finally(function () {
        setLoading(false);
      });
  }

  return (
    <div>
      <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            color: #333;
            line-height: 1.6;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #fff;
            padding: 20px;
            margin-bottom: 20px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header h1 {
            font-size: 24px;
            color: #333;
          }
          .album-list {
            background-color: #fff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .album-item {
            display: block;
            padding: 15px 20px;
            border-bottom: 1px solid #eee;
            text-decoration: none;
            color: #333;
            transition: background-color 0.2s;
          }
          .album-item:hover {
            background-color: #f9f9f9;
          }
          .album-item:last-child {
            border-bottom: none;
          }
          .album-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .album-info {
            font-size: 14px;
            color: #666;
          }
          .empty {
            text-align: center;
            padding: 40px 20px;
            color: #999;
          }
          .loading {
            text-align: center;
            padding: 40px 20px;
            color: #666;
          }
          .error {
            text-align: center;
            padding: 40px 20px;
            color: #d32f2f;
          }
          .nav-links {
            margin-top: 20px;
            text-align: center;
          }
          .nav-link {
            display: inline-block;
            margin: 0 10px;
            padding: 10px 20px;
            background-color: #4a90e2;
            color: #fff;
            text-decoration: none;
            border-radius: 4px;
          }
          .nav-link:hover {
            background-color: #357abd;
          }
        `}</style>
      <div className="container">
        <div className="header">
          <h1>懒猫故事机</h1>
        </div>

        <div className="album-list">
          {loading ? (
            <div className="loading">加载中...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : albums.length === 0 ? (
            <div className="empty">暂无专辑</div>
          ) : (
            albums.map(function (album) {
              return (
                <a
                  key={album.id}
                  href={'/simple/player/' + album.id}
                  className="album-item"
                  suppressHydrationWarning
                >
                  <div className="album-name">{album.name}</div>
                  <div className="album-info">
                    共 {album.audio_count} 个音频文件
                  </div>
                </a>
              );
            })
          )}
        </div>

        <div className="nav-links">
          <a href="/simple/history" className="nav-link" suppressHydrationWarning>播放历史</a>
        </div>
      </div>
    </div>
  );
}
