'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

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
  created_at: string;
}

interface PlayHistoryItem {
  id: number;
  album_id: number;
  audio_file_id: number;
  played_at: string;
  play_time: number;
}

// 对音频文件进行排序（按文件名中的数字）
function sortAudioFiles(files: AudioFile[]): AudioFile[] {
  return files.slice().sort(function (a, b) {
    // eslint-disable-next-line no-var
    var matchA = a.filename.match(/\d+/);
    // eslint-disable-next-line no-var
    var matchB = b.filename.match(/\d+/);
    // eslint-disable-next-line no-var
    var numA = matchA ? parseInt(matchA[0], 10) : 0;
    // eslint-disable-next-line no-var
    var numB = matchB ? parseInt(matchB[0], 10) : 0;

    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }

    if (!isNaN(numA) && isNaN(numB)) return -1;
    if (isNaN(numA) && !isNaN(numB)) return 1;

    return a.filename.localeCompare(b.filename);
  });
}

export default function SimplePlayerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const albumId = params.albumId as string;
  const historyItemId = searchParams.get('historyItem');

  const [album, setAlbum] = useState<Album | null>(null);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [historyItem, setHistoryItem] = useState<PlayHistoryItem | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const playTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 加载专辑信息和音频文件
  useEffect(function () {
    if (!albumId) return;

    // eslint-disable-next-line no-var
    var albumIdNum = parseInt(albumId, 10);
    if (isNaN(albumIdNum)) {
      setError('无效的专辑ID');
      setLoading(false);
      return;
    }

    // 加载专辑信息
    fetch('/api/albums/' + albumIdNum)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('专辑不存在');
        }
        return response.json();
      })
      .then(function (albumData) {
        setAlbum(albumData);

        // 加载音频文件列表
        return fetch('/api/audio-files?albumId=' + albumIdNum);
      })
      .then(function (response) {
        return response.json();
      })
      .then(function (files) {
        // eslint-disable-next-line no-var
        var sortedFiles = sortAudioFiles(Array.isArray(files) ? files : []);
        setAudioFiles(sortedFiles);

        if (sortedFiles.length === 0) {
          setError('该专辑没有音频文件');
        } else {
          // 如果有历史记录，加载历史记录
          if (historyItemId) {
            // eslint-disable-next-line no-var
            var audioFileId = parseInt(historyItemId, 10);
            if (!isNaN(audioFileId)) {
              loadHistoryItem(albumIdNum, audioFileId, sortedFiles);
            } else {
              setLoading(false);
            }
          } else {
            setLoading(false);
          }
        }
      })
      .catch(function (err) {
        console.error('加载数据失败:', err);
        setError('加载数据失败');
        setLoading(false);
      });
  }, [albumId, historyItemId]);

  // 加载历史记录
  function loadHistoryItem(albumIdNum: number, audioFileId: number, sortedFiles: AudioFile[]) {
    fetch('/api/play-history?audioFileId=' + audioFileId + '&albumId=' + albumIdNum)
      .then(function (response) {
        return response.json();
      })
      .then(function (history) {
        if (history) {
          setHistoryItem(history);
          // 找到对应的文件索引
          // eslint-disable-next-line no-var
          var fileIndex = sortedFiles.findIndex(function (file) {
            return file.id === history.audio_file_id;
          });
          if (fileIndex >= 0) {
            setCurrentIndex(fileIndex);
          }
        }
        setLoading(false);
      })
      .catch(function (err) {
        console.error('加载历史记录失败:', err);
        setLoading(false);
      });
  }

  // 初始化播放器
  useEffect(function () {
    if (loading || audioFiles.length === 0 || !audioRef.current) return;

    // eslint-disable-next-line no-var
    var audio = audioRef.current;
    // eslint-disable-next-line no-var
    var currentFile = audioFiles[currentIndex];

    if (!currentFile) return;

    // eslint-disable-next-line no-var
    var audioUrl = '/api/audio-stream?path=' + encodeURIComponent(currentFile.filepath);
    audio.src = audioUrl;
    audio.volume = volume;

    // 如果有历史记录，恢复播放位置
    if (historyItem && historyItem.audio_file_id === currentFile.id && historyItem.play_time > 0) {
      audio.addEventListener('loadedmetadata', function () {
        audio.currentTime = historyItem.play_time;
      }, { once: true });
    }

    // 更新进度
    function updateProgress() {
      if (audio.duration) {
        setCurrentTime(audio.currentTime);
        setDuration(audio.duration);
      }
    }

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', function () {
      setDuration(audio.duration);
    });

    audio.addEventListener('ended', function () {
      setIsPlaying(false);
      if (playTimeIntervalRef.current) {
        clearInterval(playTimeIntervalRef.current);
        playTimeIntervalRef.current = null;
      }
      // 自动播放下一首
      if (currentIndex < audioFiles.length - 1) {
        handleNext();
      }
    });

    return function () {
      audio.removeEventListener('timeupdate', updateProgress);
    };
  }, [currentIndex, audioFiles, loading, historyItem, volume]);

  // 保存播放历史
  function savePlayHistory() {
    if (audioFiles.length === 0 || !audioRef.current) return;
    // eslint-disable-next-line no-var
    var currentFile = audioFiles[currentIndex];
    if (!currentFile || !album) return;

    // eslint-disable-next-line no-var
    var playTime = Math.floor(audioRef.current.currentTime);
    if (playTime <= 0) return;

    fetch('/api/play-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        albumId: album.id,
        audioFileId: currentFile.id,
        playTime: playTime,
      }),
    }).catch(function (err) {
      console.error('保存播放历史失败:', err);
    });
  }

  // 开始跟踪播放时间
  function startPlayTimeTracking() {
    if (playTimeIntervalRef.current) {
      clearInterval(playTimeIntervalRef.current);
    }
    playTimeIntervalRef.current = setInterval(function () {
      if (isPlaying && audioRef.current && audioRef.current.currentTime > 0) {
        savePlayHistory();
      }
    }, 5000);
  }

  // 格式化时间
  function formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    // eslint-disable-next-line no-var
    var mins = Math.floor(seconds / 60);
    // eslint-disable-next-line no-var
    var secs = Math.floor(seconds % 60);
    return (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
  }

  // 播放/暂停
  function togglePlayPause() {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (playTimeIntervalRef.current) {
        clearInterval(playTimeIntervalRef.current);
        playTimeIntervalRef.current = null;
        savePlayHistory();
      }
    } else {
      // eslint-disable-next-line no-var
      var promise = audioRef.current.play();
      if (promise !== undefined) {
        promise.then(function () {
          setIsPlaying(true);
          startPlayTimeTracking();
        }).catch(function (error) {
          console.error('播放失败:', error);
        });
      }
    }
  }

  // 上一首
  function handlePrev() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      if (isPlaying && audioRef.current) {
        setTimeout(function () {
          if (audioRef.current) {
            audioRef.current.play();
          }
        }, 100);
      }
    }
  }

  // 下一首
  function handleNext() {
    if (currentIndex < audioFiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
      if (isPlaying && audioRef.current) {
        setTimeout(function () {
          if (audioRef.current) {
            audioRef.current.play();
          }
        }, 100);
      }
    }
  }

  // 处理进度条
  function handleProgressChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!audioRef.current || !duration) return;
    // eslint-disable-next-line no-var
    var percent = parseFloat(e.target.value);
    audioRef.current.currentTime = (percent / 100) * duration;
  }

  // 处理音量
  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    // eslint-disable-next-line no-var
    var vol = parseFloat(e.target.value) / 100;
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  }

  // 选择播放列表项
  function handlePlaylistClick(index: number) {
    setCurrentIndex(index);
    if (isPlaying && audioRef.current) {
      setTimeout(function () {
        if (audioRef.current) {
          audioRef.current.play();
        }
      }, 100);
    }
  }

  if (loading) {
    return (
      <div>
        <style>{`
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .loading { text-align: center; padding: 40px; }
        `}</style>
        <div className="container">
          <div className="loading">加载中...</div>
        </div>
      </div>
    );
  }

  if (error || !album || audioFiles.length === 0) {
    return (
      <div>
        <style>{`
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .error { text-align: center; padding: 40px; background: #fff; margin: 20px 0; }
          .back-link { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #4a90e2; color: #fff; text-decoration: none; border-radius: 4px; }
        `}</style>
        <div className="container">
          <div className="error">
            <p>{error || '该专辑没有音频文件'}</p>
            <a href="/simple/list" className="back-link" suppressHydrationWarning>返回列表</a>
          </div>
        </div>
      </div>
    );
  }

  // eslint-disable-next-line no-var
  var currentFile = audioFiles[currentIndex];

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
        .player {
          background-color: #fff;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .current-track {
          margin-bottom: 15px;
          font-size: 16px;
          font-weight: bold;
        }
        .controls {
          margin-bottom: 15px;
        }
        .control-buttons {
          text-align: center;
          margin-bottom: 15px;
        }
        .btn {
          display: inline-block;
          padding: 8px 16px;
          margin: 0 5px;
          background-color: #4a90e2;
          color: #fff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        .btn:hover {
          background-color: #357abd;
        }
        .btn:active {
          background-color: #2a5f8f;
        }
        .btn:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
        .progress-container {
          margin-bottom: 15px;
        }
        .progress-label {
          display: block;
          margin-bottom: 5px;
          font-size: 12px;
          color: #666;
        }
        .progress-bar {
          width: 100%;
          height: 8px;
        }
        .time-info {
          display: block;
          text-align: center;
          font-size: 12px;
          color: #666;
          margin-top: 5px;
        }
        .volume-container {
          margin-bottom: 15px;
        }
        .volume-label {
          display: block;
          margin-bottom: 5px;
          font-size: 12px;
          color: #666;
        }
        .volume-bar {
          width: 100%;
          height: 8px;
        }
        .playlist {
          background-color: #fff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .playlist-header {
          padding: 15px 20px;
          border-bottom: 1px solid #eee;
          font-weight: bold;
        }
        .playlist-item {
          padding: 12px 20px;
          border-bottom: 1px solid #eee;
          cursor: pointer;
        }
        .playlist-item:hover {
          background-color: #f9f9f9;
        }
        .playlist-item.active {
          background-color: #e3f2fd;
        }
        .playlist-item:last-child {
          border-bottom: none;
        }
        .playlist-item-name {
          font-size: 14px;
        }
      `}</style>

      <div className="container">
        <div className="header">
          <a href="/simple/list" className="back-link" suppressHydrationWarning>← 返回列表</a>
          <h1>{album.name}</h1>
        </div>

        <div className="player">
          <div className="current-track">{currentFile ? currentFile.filename : '加载中...'}</div>

          <div className="controls">
            <div className="control-buttons">
              <button className="btn" onClick={handlePrev} disabled={currentIndex === 0}>上一首</button>
              <button className="btn" onClick={togglePlayPause}>{isPlaying ? '暂停' : '播放'}</button>
              <button className="btn" onClick={handleNext} disabled={currentIndex === audioFiles.length - 1}>下一首</button>
            </div>

            <div className="progress-container">
              <label className="progress-label">播放进度</label>
              <input
                type="range"
                className="progress-bar"
                min="0"
                max="100"
                value={duration ? (currentTime / duration) * 100 : 0}
                onChange={handleProgressChange}
              />
              <span className="time-info">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>

            <div className="volume-container">
              <label className="volume-label">音量</label>
              <input
                type="range"
                className="volume-bar"
                min="0"
                max="100"
                value={volume * 100}
                onChange={handleVolumeChange}
              />
            </div>
          </div>

          <audio ref={audioRef} preload="metadata"></audio>
        </div>

        <div className="playlist">
          <div className="playlist-header">播放列表</div>
          {audioFiles.map(function (file, index) {
            return (
              <div
                key={file.id}
                className={'playlist-item' + (index === currentIndex ? ' active' : '')}
                onClick={function () { handlePlaylistClick(index); }}
              >
                <div className="playlist-item-name">{file.filename}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
