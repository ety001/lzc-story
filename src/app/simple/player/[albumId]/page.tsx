export default function SimplePlayerPage() {
  return (
    <div>
      <style>{`
        /* 强制性布局重置 - 修复 WebView 74 显示问题 */
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          height: auto !important;
          min-height: auto !important;
        }
        body > div {
          margin: 0 !important;
          padding: 0 !important;
          min-height: auto !important;
          height: auto !important;
          display: block !important;
          flex: none !important;
        }
        
        /* 原始样式 */
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
        .btn.active {
          background-color: #2a5f8f;
          box-shadow: inset 0 0 0 2px #1a3f5f;
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
        .playlist-scroll {
          max-height: 400px;
          overflow-y: auto;
          position: relative;
          -webkit-overflow-scrolling: touch;
        }
        .playlist-spacer {
          position: relative;
          width: 100%;
        }
        .playlist-window {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
        }
        .playlist-item {
          height: 48px;
          padding: 0 20px;
          border-bottom: 1px solid #eee;
          cursor: pointer;
          box-sizing: border-box;
          display: -webkit-box;
          display: -webkit-flex;
          display: flex;
          -webkit-box-align: center;
          -webkit-align-items: center;
          align-items: center;
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
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .loading {
          text-align: center;
          padding: 40px;
        }
        .error {
          text-align: center;
          padding: 40px;
          background: #fff;
          margin: 20px 0;
        }
        .back-link-btn {
          display: inline-block;
          margin-top: 20px;
          padding: 10px 20px;
          background: #4a90e2;
          color: #fff;
          text-decoration: none;
          border-radius: 4px;
        }
      `}</style>

      <div className="container" id="mainContainer" suppressHydrationWarning>
        <div className="loading" suppressHydrationWarning>加载中...</div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var ROW_HEIGHT = 48;
              var WINDOW_SIZE = 50;
              var BUFFER = 10;
              var MAX_BATCH = 100;

              function getUrlParams() {
                var path = window.location.pathname;
                var search = window.location.search;
                var albumIdMatch = path.match(/\\/simple\\/player\\/(\\d+)/);
                var albumId = albumIdMatch ? albumIdMatch[1] : null;
                
                var historyItemId = null;
                if (search) {
                  var params = search.substring(1).split('&');
                  for (var i = 0; i < params.length; i++) {
                    var pair = params[i].split('=');
                    if (pair[0] === 'historyItem') {
                      historyItemId = decodeURIComponent(pair[1]);
                    }
                  }
                }
                
                return {
                  albumId: albumId,
                  historyItemId: historyItemId
                };
              }
              
              function formatTime(seconds) {
                if (isNaN(seconds) || seconds < 0) return '00:00';
                var mins = Math.floor(seconds / 60);
                var secs = Math.floor(seconds % 60);
                return (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
              }

              function escapeHtml(text) {
                return String(text)
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;');
              }
              
              // 全局状态：全量 ID 骨架 + 详情缓存（对齐 multitune 车机窗口）
              var album = null;
              var audioIds = [];
              var fileCache = {};
              var pendingIds = {};
              var windowThreshold = 50;
              var currentIndex = 0;
              var isPlaying = false;
              var currentTime = 0;
              var duration = 0;
              var volume = 1;
              var isLooping = false;
              var historyItem = null;
              var playTimeInterval = null;
              var scrollTimer = null;
              
              var mainContainer = document.getElementById('mainContainer');
              var audioPlayer = null;
              var currentTrackEl = null;
              var playPauseBtn = null;
              var prevBtn = null;
              var nextBtn = null;
              var loopBtn = null;
              var progressBar = null;
              var volumeBar = null;
              var timeInfo = null;
              var playlistScroll = null;
              var playlistWindow = null;
              var msPosTimer = null;
              var msHandlers = {};
              var msEventBound = false;

              // 媒体会话通道：lzc-bridge = 懒猫 WebShell 原生桥；standard = 浏览器原生 API；none = 无
              function msMode() {
                if (typeof lzc_media_session !== 'undefined') { return 'lzc-bridge'; }
                if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) { return 'standard'; }
                return 'none';
              }

              function msSetPlaybackState(state) {
                try {
                  if (msMode() === 'lzc-bridge') {
                    lzc_media_session.setPlaybackState(state);
                  } else if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
                    navigator.mediaSession.playbackState = state;
                  }
                } catch (e) {}
              }

              function msSetPositionState(dur, pos, rate) {
                try {
                  if (msMode() === 'lzc-bridge') {
                    lzc_media_session.setPositionState(JSON.stringify({
                      duration: dur, position: pos, playbackRate: rate
                    }));
                  } else if (typeof navigator !== 'undefined' && 'mediaSession' in navigator &&
                    typeof navigator.mediaSession.setPositionState === 'function') {
                    navigator.mediaSession.setPositionState({
                      duration: dur, position: pos, playbackRate: rate
                    });
                  }
                } catch (e) {}
              }

              function msSetMetadata(file) {
                var mode = msMode();
                if (mode === 'none') { return; }
                var meta = {
                  title: (file && file.filename) || '未知故事',
                  artist: (file && file.album_name) || (album && album.name) || '',
                  album: (album && album.name) || '懒猫故事机'
                };
                try {
                  if (mode === 'lzc-bridge') {
                    lzc_media_session.setMetadata(JSON.stringify(meta));
                  } else if (typeof MediaMetadata !== 'undefined') {
                    navigator.mediaSession.metadata = new MediaMetadata(meta);
                  }
                } catch (e) {}
              }

              function seekBy(delta, absolute) {
                if (!audioPlayer) return;
                try {
                  if (typeof absolute === 'number') {
                    var maxA = audioPlayer.duration || absolute;
                    audioPlayer.currentTime = Math.max(0, Math.min(absolute, maxA));
                  } else {
                    var maxD = audioPlayer.duration || (audioPlayer.currentTime + delta);
                    audioPlayer.currentTime = Math.max(0, Math.min(audioPlayer.currentTime + delta, maxD));
                  }
                } catch (e) {}
              }

              function pauseOnly() {
                if (!audioPlayer) return;
                try {
                  audioPlayer.pause();
                  isPlaying = false;
                  if (playPauseBtn) playPauseBtn.textContent = '播放';
                  if (playTimeInterval) {
                    clearInterval(playTimeInterval);
                    playTimeInterval = null;
                    savePlayHistory();
                  }
                  msSetPlaybackState('paused');
                } catch (e) {}
              }

              // 媒体会话接入：优先懒猫桥，其次浏览器原生 MediaSession
              function initMediaSession() {
                var mode = msMode();
                if (mode === 'none') { return; }

                msHandlers = {
                  play: function() {
                    if (!isPlaying) { togglePlayPause(); }
                  },
                  pause: function() { pauseOnly(); },
                  nexttrack: function() { handleNext(); },
                  previoustrack: function() { handlePrev(); },
                  seekforward: function() { seekBy(10); },
                  seekbackward: function() { seekBy(-10); },
                  seekto: function(data) {
                    var t = data && typeof data.seekTime === 'number' ? data.seekTime : null;
                    if (t !== null) { seekBy(null, t); }
                  },
                  stop: function() { pauseOnly(); }
                };

                if (!msEventBound) {
                  msEventBound = true;
                  window.addEventListener('lzc_media_session_event', function(e) {
                    var detail = (e && e.detail) || {};
                    var fn = msHandlers[detail.eventType];
                    if (fn) { fn(detail.data); }
                  });
                }

                for (var name in msHandlers) {
                  if (Object.prototype.hasOwnProperty.call(msHandlers, name)) {
                    try {
                      if (mode === 'lzc-bridge') {
                        lzc_media_session.setActionHandler(name);
                      } else {
                        navigator.mediaSession.setActionHandler(name, msHandlers[name]);
                      }
                    } catch (err) {
                      // 该 action 不被支持，跳过
                    }
                  }
                }

                if (msPosTimer) { clearInterval(msPosTimer); }
                msPosTimer = setInterval(function() {
                  if (audioPlayer && audioPlayer.duration && !isNaN(audioPlayer.duration)) {
                    msSetPositionState(audioPlayer.duration, audioPlayer.currentTime, audioPlayer.playbackRate || 1);
                  }
                }, 5000);
              }

              function getFile(index) {
                if (index < 0 || index >= audioIds.length) return null;
                return fileCache[audioIds[index]] || null;
              }

              function ensureFiles(ids, callback) {
                var missing = [];
                for (var i = 0; i < ids.length; i++) {
                  var id = ids[i];
                  if (id && !fileCache[id] && !pendingIds[id]) {
                    missing.push(id);
                    pendingIds[id] = true;
                  }
                }
                if (missing.length === 0) {
                  if (callback) callback();
                  return;
                }

                var chunks = [];
                for (var c = 0; c < missing.length; c += MAX_BATCH) {
                  chunks.push(missing.slice(c, c + MAX_BATCH));
                }

                var done = 0;
                function finishOne() {
                  done++;
                  if (done >= chunks.length && callback) callback();
                }

                for (var ci = 0; ci < chunks.length; ci++) {
                  (function(chunk) {
                    var xhr = new XMLHttpRequest();
                    xhr.open('POST', '/api/audio-files/batch', true);
                    xhr.setRequestHeader('Content-Type', 'application/json');
                    xhr.onreadystatechange = function() {
                      if (xhr.readyState !== 4) return;
                      for (var j = 0; j < chunk.length; j++) {
                        delete pendingIds[chunk[j]];
                      }
                      if (xhr.status === 200) {
                        try {
                          var data = JSON.parse(xhr.responseText);
                          var items = (data && data.items) ? data.items : [];
                          for (var k = 0; k < items.length; k++) {
                            fileCache[items[k].id] = items[k];
                          }
                        } catch (err) {
                          console.error('解析批量音频失败:', err);
                        }
                      } else {
                        console.error('批量加载音频失败:', xhr.status);
                      }
                      finishOne();
                    };
                    xhr.onerror = function() {
                      for (var j = 0; j < chunk.length; j++) {
                        delete pendingIds[chunk[j]];
                      }
                      console.error('批量加载音频网络错误');
                      finishOne();
                    };
                    try {
                      xhr.send(JSON.stringify({ ids: chunk }));
                    } catch (err) {
                      for (var j = 0; j < chunk.length; j++) {
                        delete pendingIds[chunk[j]];
                      }
                      finishOne();
                    }
                  })(chunks[ci]);
                }
              }

              function useVirtualPlaylist() {
                return audioIds.length > windowThreshold;
              }

              function paintPlaylistWindow(startIndex, endIndex) {
                if (!playlistWindow) return;
                playlistWindow.style.webkitTransform = 'translateY(' + (startIndex * ROW_HEIGHT) + 'px)';
                playlistWindow.style.transform = 'translateY(' + (startIndex * ROW_HEIGHT) + 'px)';

                var html = '';
                for (var i = startIndex; i < endIndex; i++) {
                  var file = fileCache[audioIds[i]];
                  var name = file ? file.filename : '加载中...';
                  var activeClass = i === currentIndex ? ' active' : '';
                  html += '<div class="playlist-item' + activeClass + '" data-index="' + i + '">';
                  html += '<div class="playlist-item-name">' + escapeHtml(name) + '</div>';
                  html += '</div>';
                }
                playlistWindow.innerHTML = html;

                var items = playlistWindow.querySelectorAll('.playlist-item');
                for (var n = 0; n < items.length; n++) {
                  items[n].onclick = (function(el) {
                    return function() {
                      var idx = parseInt(el.getAttribute('data-index'), 10);
                      if (isNaN(idx)) return;
                      currentIndex = idx;
                      loadTrack(0);
                      if (audioPlayer) {
                        var promise = audioPlayer.play();
                        if (promise !== undefined) {
                          promise.then(function() {
                            isPlaying = true;
                            if (playPauseBtn) playPauseBtn.textContent = '暂停';
                            startPlayTimeTracking();
                          }).catch(function(error) {
                            console.error('播放失败:', error);
                          });
                        }
                      }
                    };
                  })(items[n]);
                }
              }

              function renderPlaylistWindow() {
                if (!playlistScroll || audioIds.length === 0) return;

                if (!useVirtualPlaylist()) {
                  ensureFiles(audioIds.slice(), function() {
                    paintPlaylistWindow(0, audioIds.length);
                    var spacer = document.getElementById('playlistSpacer');
                    if (spacer) {
                      spacer.style.height = (audioIds.length * ROW_HEIGHT) + 'px';
                    }
                  });
                  return;
                }

                var scrollTop = playlistScroll.scrollTop || 0;
                var total = audioIds.length;
                var startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER);
                var endIndex = Math.min(total, startIndex + WINDOW_SIZE);
                var needIds = [];
                for (var i = startIndex; i < endIndex; i++) {
                  needIds.push(audioIds[i]);
                }
                ensureFiles(needIds, function() {
                  paintPlaylistWindow(startIndex, endIndex);
                });
              }

              function updatePlaylist() {
                renderPlaylistWindow();
              }
              
              // autoPlayAfter：元数据就绪后自动播放（与 restoreTime 在同一回调，避免竞态）
              function loadTrack(restoreTime, autoPlayAfter) {
                if (currentIndex < 0 || currentIndex >= audioIds.length || !audioPlayer) return;

                // 详情未就绪前先暂停，避免切歌后仍播上一首
                audioPlayer.pause();

                var preload = [];
                for (var p = currentIndex - 3; p <= currentIndex + 3; p++) {
                  if (p >= 0 && p < audioIds.length) {
                    preload.push(audioIds[p]);
                  }
                }

                ensureFiles(preload, function() {
                  var file = getFile(currentIndex);
                  if (!file || !audioPlayer) return;

                  var audioUrl = '/api/audio-stream?path=' + encodeURIComponent(file.filepath);
                  audioPlayer.src = audioUrl;
                  audioPlayer.volume = volume;
                  
                  if (currentTrackEl) {
                    currentTrackEl.textContent = file.filename;
                  }

                  msSetMetadata(file);
                  
                  updatePlaylist();

                  function onMetadataReady() {
                    audioPlayer.removeEventListener('loadedmetadata', onMetadataReady);
                    if (restoreTime && restoreTime > 0) {
                      audioPlayer.currentTime = restoreTime;
                    }
                    if (autoPlayAfter) {
                      var promise = audioPlayer.play();
                      if (promise !== undefined) {
                        promise.then(function() {
                          isPlaying = true;
                          if (playPauseBtn) playPauseBtn.textContent = '暂停';
                          startPlayTimeTracking();
                          msSetPlaybackState('playing');
                        }).catch(function(error) {
                          console.error('自动播放失败:', error);
                        });
                      }
                    }
                  }
                  audioPlayer.addEventListener('loadedmetadata', onMetadataReady);
                  
                  if (prevBtn) prevBtn.disabled = currentIndex === 0;
                  if (nextBtn) nextBtn.disabled = currentIndex === audioIds.length - 1;
                  if (audioPlayer) audioPlayer.loop = isLooping;
                  updateLoopButton();
                });
              }
              
              function updateLoopButton() {
                if (!loopBtn) return;
                if (isLooping) {
                  loopBtn.className = 'btn active';
                  loopBtn.textContent = '单曲循环:开';
                } else {
                  loopBtn.className = 'btn';
                  loopBtn.textContent = '单曲循环';
                }
              }
              
              function toggleLoop() {
                isLooping = !isLooping;
                if (audioPlayer) {
                  audioPlayer.loop = isLooping;
                }
                updateLoopButton();
              }
              
              function updateProgress() {
                if (!audioPlayer || !duration) return;
                
                if (audioPlayer.duration) {
                  duration = audioPlayer.duration;
                }
                currentTime = audioPlayer.currentTime;
                
                if (progressBar) {
                  var percent = duration ? (currentTime / duration) * 100 : 0;
                  progressBar.value = percent;
                }
                
                if (timeInfo) {
                  timeInfo.textContent = formatTime(currentTime) + ' / ' + formatTime(duration);
                }
              }
              
              function savePlayHistory() {
                if (audioIds.length === 0 || !audioPlayer || !album) return;
                var currentFile = getFile(currentIndex);
                if (!currentFile) return;
                
                var playTime = Math.floor(audioPlayer.currentTime);
                if (playTime <= 0) return;
                
                var xhr = new XMLHttpRequest();
                xhr.open('POST', '/api/play-history', true);
                xhr.setRequestHeader('Content-Type', 'application/json');
                
                xhr.onerror = function() {
                  console.error('保存播放历史网络错误');
                };
                
                try {
                  xhr.send(JSON.stringify({
                    albumId: album.id,
                    audioFileId: currentFile.id,
                    playTime: playTime,
                  }));
                } catch (err) {
                  console.error('保存播放历史失败:', err);
                }
              }
              
              function startPlayTimeTracking() {
                if (playTimeInterval) {
                  clearInterval(playTimeInterval);
                }
                playTimeInterval = setInterval(function() {
                  if (isPlaying && audioPlayer && audioPlayer.currentTime > 0) {
                    savePlayHistory();
                  }
                }, 5000);
              }
              
              function togglePlayPause() {
                if (!audioPlayer) return;
                
                if (isPlaying) {
                  audioPlayer.pause();
                  isPlaying = false;
                  if (playPauseBtn) playPauseBtn.textContent = '播放';
                  if (playTimeInterval) {
                    clearInterval(playTimeInterval);
                    playTimeInterval = null;
                    savePlayHistory();
                  }
                  msSetPlaybackState('paused');
                } else {
                  var promise = audioPlayer.play();
                  if (promise !== undefined) {
                    promise.then(function() {
                      isPlaying = true;
                      if (playPauseBtn) playPauseBtn.textContent = '暂停';
                      startPlayTimeTracking();
                      msSetPlaybackState('playing');
                    }).catch(function(error) {
                      console.error('播放失败:', error);
                    });
                  }
                }
              }
              
              function handlePrev() {
                if (currentIndex > 0) {
                  currentIndex--;
                  loadTrack(0);
                  if (isPlaying && audioPlayer) {
                    setTimeout(function() {
                      if (audioPlayer) {
                        audioPlayer.play();
                      }
                    }, 100);
                  }
                }
              }
              
              function handleNext() {
                if (currentIndex < audioIds.length - 1) {
                  currentIndex++;
                  loadTrack(0);
                  if (isPlaying && audioPlayer) {
                    setTimeout(function() {
                      if (audioPlayer) {
                        audioPlayer.play();
                      }
                    }, 100);
                  }
                }
              }
              
              function renderPlayer() {
                if (!album || audioIds.length === 0) {
                  mainContainer.innerHTML = '<div class="error"><p>该专辑没有音频文件</p><a href="/simple/list" class="back-link-btn">返回列表</a></div>';
                  return;
                }
                
                var html = '';
                html += '<div class="header">';
                html += '<a href="/simple/list" class="back-link">← 返回列表</a>';
                html += '<h1>' + escapeHtml(album.name) + '</h1>';
                html += '</div>';
                
                html += '<div class="player">';
                html += '<div class="current-track" id="currentTrack">加载中...</div>';
                html += '<div class="controls">';
                html += '<div class="control-buttons">';
                html += '<button class="btn" id="prevBtn" disabled>上一首</button>';
                html += '<button class="btn" id="playPauseBtn">播放</button>';
                html += '<button class="btn" id="nextBtn" disabled>下一首</button>';
                html += '<button class="btn" id="loopBtn">单曲循环</button>';
                html += '</div>';
                html += '<div class="progress-container">';
                html += '<label class="progress-label">播放进度</label>';
                html += '<input type="range" class="progress-bar" id="progressBar" min="0" max="100" value="0" />';
                html += '<span class="time-info" id="timeInfo">00:00 / 00:00</span>';
                html += '</div>';
                html += '<div class="volume-container">';
                html += '<label class="volume-label">音量</label>';
                html += '<input type="range" class="volume-bar" id="volumeBar" min="0" max="100" value="100" />';
                html += '</div>';
                html += '</div>';
                html += '<audio id="audioPlayer" preload="metadata"></audio>';
                html += '</div>';
                
                html += '<div class="playlist">';
                html += '<div class="playlist-header">播放列表 (' + audioIds.length + ')</div>';
                html += '<div class="playlist-scroll" id="playlistScroll">';
                html += '<div class="playlist-spacer" id="playlistSpacer" style="height:' + (audioIds.length * ROW_HEIGHT) + 'px">';
                html += '<div class="playlist-window" id="playlistWindow"></div>';
                html += '</div></div></div>';
                
                mainContainer.innerHTML = html;
                
                audioPlayer = document.getElementById('audioPlayer');
                currentTrackEl = document.getElementById('currentTrack');
                playPauseBtn = document.getElementById('playPauseBtn');
                prevBtn = document.getElementById('prevBtn');
                nextBtn = document.getElementById('nextBtn');
                loopBtn = document.getElementById('loopBtn');
                progressBar = document.getElementById('progressBar');
                volumeBar = document.getElementById('volumeBar');
                timeInfo = document.getElementById('timeInfo');
                playlistScroll = document.getElementById('playlistScroll');
                playlistWindow = document.getElementById('playlistWindow');
                
                if (playPauseBtn) {
                  playPauseBtn.onclick = togglePlayPause;
                }
                if (prevBtn) {
                  prevBtn.onclick = handlePrev;
                }
                if (nextBtn) {
                  nextBtn.onclick = handleNext;
                }
                if (loopBtn) {
                  loopBtn.onclick = toggleLoop;
                }
                if (progressBar && audioPlayer) {
                  progressBar.oninput = function() {
                    if (audioPlayer.duration) {
                      audioPlayer.currentTime = (progressBar.value / 100) * audioPlayer.duration;
                    }
                  };
                }
                if (volumeBar && audioPlayer) {
                  volumeBar.oninput = function() {
                    volume = volumeBar.value / 100;
                    audioPlayer.volume = volume;
                  };
                }
                if (playlistScroll) {
                  playlistScroll.onscroll = function() {
                    if (scrollTimer) clearTimeout(scrollTimer);
                    scrollTimer = setTimeout(function() {
                      renderPlaylistWindow();
                    }, 50);
                  };
                }
                if (audioPlayer) {
                  audioPlayer.addEventListener('timeupdate', updateProgress);
                  audioPlayer.addEventListener('loadedmetadata', function() {
                    duration = audioPlayer.duration;
                    updateProgress();
                  });
                  audioPlayer.addEventListener('play', function() {
                    msSetPlaybackState('playing');
                  });
                  // loadTrack 换源会 pause，但 isPlaying 仍可能为 true；勿把媒体会话打成 paused
                  audioPlayer.addEventListener('pause', function() {
                    if (!isPlaying) {
                      msSetPlaybackState('paused');
                    }
                  });
                  audioPlayer.addEventListener('ended', function() {
                    if (playTimeInterval) {
                      clearInterval(playTimeInterval);
                      playTimeInterval = null;
                    }
                    savePlayHistory();
                    if (isLooping) {
                      audioPlayer.currentTime = 0;
                      var promise = audioPlayer.play();
                      if (promise !== undefined) {
                        promise.then(function() {
                          isPlaying = true;
                          if (playPauseBtn) playPauseBtn.textContent = '暂停';
                          startPlayTimeTracking();
                          msSetPlaybackState('playing');
                        }).catch(function(error) {
                          console.error('循环播放失败:', error);
                          isPlaying = false;
                          if (playPauseBtn) playPauseBtn.textContent = '播放';
                          msSetPlaybackState('paused');
                        });
                      }
                      return;
                    }
                    if (currentIndex < audioIds.length - 1) {
                      handleNext();
                    } else {
                      isPlaying = false;
                      if (playPauseBtn) playPauseBtn.textContent = '播放';
                      msSetPlaybackState('paused');
                    }
                  });
                }
                
                var restoreTime = 0;
                if (historyItem && historyItem.audio_file_id) {
                  for (var i = 0; i < audioIds.length; i++) {
                    if (audioIds[i] === historyItem.audio_file_id) {
                      currentIndex = i;
                      restoreTime = historyItem.play_time || 0;
                      break;
                    }
                  }
                  if (playlistScroll) {
                    playlistScroll.scrollTop = Math.max(0, currentIndex * ROW_HEIGHT - ROW_HEIGHT * 2);
                  }
                }
                
                // 历史进入时：seek 与自动播放合并在 loadTrack 的同一 loadedmetadata 回调
                loadTrack(restoreTime, !!historyItem);
                initMediaSession();
              }
              
              function loadHistoryItem(audioFileId, callback) {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', '/api/play-history?audioFileId=' + audioFileId + '&albumId=' + albumIdNum, true);
                
                xhr.onreadystatechange = function() {
                  if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                      try {
                        var history = JSON.parse(xhr.responseText);
                        if (history) {
                          historyItem = history;
                        }
                        callback();
                      } catch (err) {
                        console.error('解析历史记录失败:', err);
                        callback();
                      }
                    } else {
                      console.error('加载历史记录失败:', xhr.status);
                      callback();
                    }
                  }
                };
                
                xhr.onerror = function() {
                  console.error('加载历史记录网络错误');
                  callback();
                };
                
                xhr.send();
              }
              
              function loadAudioFiles(callback) {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', '/api/audio-files?albumId=' + albumIdNum + '&limit=50&offset=0', true);
                
                xhr.onreadystatechange = function() {
                  if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                      try {
                        var data = JSON.parse(xhr.responseText);
                        audioIds = (data && data.audio_ids) ? data.audio_ids : [];
                        windowThreshold = (data && data.window_threshold > 0) ? data.window_threshold : 50;
                        fileCache = {};
                        var items = (data && data.items) ? data.items : [];
                        for (var i = 0; i < items.length; i++) {
                          fileCache[items[i].id] = items[i];
                        }
                        callback();
                      } catch (err) {
                        console.error('解析音频文件失败:', err);
                        mainContainer.innerHTML = '<div class="error"><p>加载数据失败</p><a href="/simple/list" class="back-link-btn">返回列表</a></div>';
                      }
                    } else {
                      console.error('加载音频文件失败:', xhr.status);
                      mainContainer.innerHTML = '<div class="error"><p>加载数据失败</p><a href="/simple/list" class="back-link-btn">返回列表</a></div>';
                    }
                  }
                };
                
                xhr.onerror = function() {
                  console.error('加载音频文件网络错误');
                  mainContainer.innerHTML = '<div class="error"><p>加载数据失败</p><a href="/simple/list" class="back-link-btn">返回列表</a></div>';
                };
                
                xhr.send();
              }
              
              var params = getUrlParams();
              if (!params.albumId) {
                mainContainer.innerHTML = '<div class="error"><p>无效的专辑ID</p><a href="/simple/list" class="back-link-btn">返回列表</a></div>';
                return;
              }
              
              var albumIdNum = parseInt(params.albumId, 10);
              if (isNaN(albumIdNum)) {
                mainContainer.innerHTML = '<div class="error"><p>无效的专辑ID</p><a href="/simple/list" class="back-link-btn">返回列表</a></div>';
                return;
              }
              
              var xhr = new XMLHttpRequest();
              xhr.open('GET', '/api/albums/' + albumIdNum, true);
              
              xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                  if (xhr.status === 200) {
                    try {
                      album = JSON.parse(xhr.responseText);
                      
                      loadAudioFiles(function() {
                        if (audioIds.length === 0) {
                          mainContainer.innerHTML = '<div class="error"><p>该专辑没有音频文件</p><a href="/simple/list" class="back-link-btn">返回列表</a></div>';
                        } else {
                          if (params.historyItemId) {
                            var audioFileId = parseInt(params.historyItemId, 10);
                            if (!isNaN(audioFileId)) {
                              loadHistoryItem(audioFileId, function() {
                                renderPlayer();
                              });
                            } else {
                              renderPlayer();
                            }
                          } else {
                            renderPlayer();
                          }
                        }
                      });
                    } catch (err) {
                      console.error('解析专辑信息失败:', err);
                      mainContainer.innerHTML = '<div class="error"><p>加载数据失败</p><a href="/simple/list" class="back-link-btn">返回列表</a></div>';
                    }
                  } else {
                    console.error('加载专辑信息失败:', xhr.status);
                    mainContainer.innerHTML = '<div class="error"><p>专辑不存在</p><a href="/simple/list" class="back-link-btn">返回列表</a></div>';
                  }
                }
              };
              
              xhr.onerror = function() {
                console.error('加载专辑信息网络错误');
                mainContainer.innerHTML = '<div class="error"><p>加载数据失败</p><a href="/simple/list" class="back-link-btn">返回列表</a></div>';
              };
              
              xhr.send();
            })();
          `,
        }}
      />
    </div>
  );
}
