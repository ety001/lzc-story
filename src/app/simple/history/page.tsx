'use client';

import { useState, useEffect } from 'react';

interface PlayHistoryItem {
  id: number;
  album_id: number;
  album_name: string;
  audio_file_id: number;
  filename: string;
  filepath: string;
  played_at: string;
  play_time: number;
}

// 格式化时间
function formatDateTime(dateString: string): string {
  try {
    // eslint-disable-next-line no-var
    var date = new Date(dateString);
    // eslint-disable-next-line no-var
    var year = date.getFullYear();
    // eslint-disable-next-line no-var
    var month = String(date.getMonth() + 1);
    if (month.length === 1) month = '0' + month;
    // eslint-disable-next-line no-var
    var day = String(date.getDate());
    if (day.length === 1) day = '0' + day;
    // eslint-disable-next-line no-var
    var hours = String(date.getHours());
    if (hours.length === 1) hours = '0' + hours;
    // eslint-disable-next-line no-var
    var minutes = String(date.getMinutes());
    if (minutes.length === 1) minutes = '0' + minutes;
    return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes;
  } catch {
    return dateString;
  }
}

// 格式化播放时间（秒转分钟:秒）
function formatPlayTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '00:00';
  // eslint-disable-next-line no-var
  var mins = Math.floor(seconds / 60);
  // eslint-disable-next-line no-var
  var secs = Math.floor(seconds % 60);
  // eslint-disable-next-line no-var
  var minsStr = String(mins);
  if (minsStr.length === 1) minsStr = '0' + minsStr;
  // eslint-disable-next-line no-var
  var secsStr = String(secs);
  if (secsStr.length === 1) secsStr = '0' + secsStr;
  return minsStr + ':' + secsStr;
}

// 根据专辑名称获取背景色索引
function getAlbumColorIndex(albumName: string, albumNames: string[]): number {
  // eslint-disable-next-line no-var
  var index = albumNames.indexOf(albumName);
  if (index === -1) {
    return 0;
  }
  return index % 2; // 使用2种不同的背景色循环（白色和中灰）
}

export default function SimpleHistoryPage() {
  const [historyItems, setHistoryItems] = useState<PlayHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(function () {
    loadHistory();
  }, []);

  function loadHistory() {
    setLoading(true);
    setError('');

    fetch('/api/play-history')
      .then(function (response) {
        if (!response.ok) {
          throw new Error('加载失败');
        }
        return response.json();
      })
      .then(function (data) {
        // eslint-disable-next-line no-var
        var items = Array.isArray(data) ? data : [];
        setHistoryItems(items);
      })
      .catch(function (err) {
        console.error('加载播放历史失败:', err);
        setError('加载播放历史失败');
        setHistoryItems([]);
      })
      .finally(function () {
        setLoading(false);
      });
  }

  // 获取所有唯一的专辑名称（按出现顺序）
  // eslint-disable-next-line no-var
  var albumNames: string[] = [];
  // eslint-disable-next-line no-var
  var seenAlbums: { [key: string]: boolean } = {};
  historyItems.forEach(function (item) {
    if (!seenAlbums[item.album_name]) {
      albumNames.push(item.album_name);
      seenAlbums[item.album_name] = true;
    }
  });

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
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #fff;
          padding: 15px 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header h1 {
          font-size: 20px;
          margin-bottom: 5px;
        }
        .back-link {
          color: #4a90e2;
          text-decoration: none;
          font-size: 14px;
        }
        .back-link:hover {
          text-decoration: underline;
        }
        .history-list {
          background-color: #fff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .history-item {
          display: block;
          padding: 15px 20px;
          border-bottom: 1px solid #eee;
          text-decoration: none;
          color: #333;
          transition: background-color 0.2s;
        }
        .history-item:hover {
          opacity: 0.8;
        }
        .history-item:last-child {
          border-bottom: none;
        }
        .history-item-bg-0 {
          background-color: #ffffff;
        }
        .history-item-bg-1 {
          background-color: #eef2f5;
        }
        .history-item-header {
          display: block;
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .history-item-info {
          font-size: 14px;
          color: #666;
          margin-bottom: 3px;
        }
        .history-item-time {
          font-size: 12px;
          color: #999;
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
      `}</style>

      <div className="container">
        <div className="header">
          <a href="/simple/list" className="back-link" suppressHydrationWarning>← 返回列表</a>
          <h1>播放历史</h1>
        </div>

        <div className="history-list">
          {loading ? (
            <div className="loading">加载中...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : historyItems.length === 0 ? (
            <div className="empty">暂无播放历史</div>
          ) : (
            historyItems.map(function (item) {
              // eslint-disable-next-line no-var
              var colorIndex = getAlbumColorIndex(item.album_name, albumNames);
              return (
                <a
                  key={item.id}
                  href={'/simple/player/' + item.album_id + '?historyItem=' + item.audio_file_id}
                  className={'history-item history-item-bg-' + colorIndex}
                  suppressHydrationWarning
                >
                  <span className="history-item-header">{item.filename}</span>
                  <div className="history-item-info">
                    {item.album_name}
                  </div>
                  <div className="history-item-info">
                    播放至: {formatPlayTime(item.play_time)}
                  </div>
                  <div className="history-item-time">
                    {formatDateTime(item.played_at)}
                  </div>
                </a>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
