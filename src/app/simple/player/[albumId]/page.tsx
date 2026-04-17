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
              // 从 URL 获取参数
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
              
              // 对音频文件进行排序（按文件名中的数字）
              function sortAudioFiles(files) {
                return files.slice().sort(function(a, b) {
                  var matchA = a.filename.match(/\\d+/);
                  var matchB = b.filename.match(/\\d+/);
                  var numA = matchA ? parseInt(matchA[0], 10) : 0;
                  var numB = matchB ? parseInt(matchB[0], 10) : 0;
                  
                  if (!isNaN(numA) && !isNaN(numB)) {
                    return numA - numB;
                  }
                  
                  if (!isNaN(numA) && isNaN(numB)) return -1;
                  if (isNaN(numA) && !isNaN(numB)) return 1;
                  
                  return a.filename.localeCompare(b.filename);
                });
              }
              
              // 格式化时间
              function formatTime(seconds) {
                if (isNaN(seconds) || seconds < 0) return '00:00';
                var mins = Math.floor(seconds / 60);
                var secs = Math.floor(seconds % 60);
                return (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
              }
              
              // 全局状态
              var album = null;
              var audioFiles = [];
              var currentIndex = 0;
              var isPlaying = false;
              var currentTime = 0;
              var duration = 0;
              var volume = 1;
              var historyItem = null;
              var playTimeInterval = null;
              
              // DOM 元素
              var mainContainer = document.getElementById('mainContainer');
              var audioPlayer = null;
              var currentTrackEl = null;
              var playPauseBtn = null;
              var prevBtn = null;
              var nextBtn = null;
              var progressBar = null;
              var volumeBar = null;
              var timeInfo = null;
              var playlistItems = null;
              
              // 更新播放列表
              function updatePlaylist() {
                if (!playlistItems) return;
                
                playlistItems.innerHTML = '';
                for (var i = 0; i < audioFiles.length; i++) {
                  var item = document.createElement('div');
                  item.className = 'playlist-item' + (i === currentIndex ? ' active' : '');
                  item.innerHTML = '<div class="playlist-item-name">' + audioFiles[i].filename + '</div>';
                  item.onclick = (function(index) {
                    return function() {
                      currentIndex = index;
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
                  })(i);
                  playlistItems.appendChild(item);
                }
              }
              
              // 加载音频
              function loadTrack(restoreTime) {
                if (currentIndex < 0 || currentIndex >= audioFiles.length || !audioPlayer) return;
                
                var file = audioFiles[currentIndex];
                var audioUrl = '/api/audio-stream?path=' + encodeURIComponent(file.filepath);
                audioPlayer.src = audioUrl;
                audioPlayer.volume = volume;
                
                if (currentTrackEl) {
                  currentTrackEl.textContent = file.filename;
                }
                
                updatePlaylist();
                
                // 如果需要恢复播放位置
                if (restoreTime && restoreTime > 0) {
                  audioPlayer.addEventListener('loadedmetadata', function() {
                    audioPlayer.currentTime = restoreTime;
                  }, { once: true });
                }
                
                // 更新按钮状态
                if (prevBtn) prevBtn.disabled = currentIndex === 0;
                if (nextBtn) nextBtn.disabled = currentIndex === audioFiles.length - 1;
              }
              
              // 更新进度条
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
              
              // 保存播放历史
              function savePlayHistory() {
                if (audioFiles.length === 0 || !audioPlayer || !album) return;
                var currentFile = audioFiles[currentIndex];
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
              
              // 开始跟踪播放时间
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
              
              // 播放/暂停
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
                } else {
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
              }
              
              // 上一首
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
              
              // 下一首
              function handleNext() {
                if (currentIndex < audioFiles.length - 1) {
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
              
              // 渲染播放器 UI
              function renderPlayer() {
                if (!album || audioFiles.length === 0) {
                  mainContainer.innerHTML = '<div class="error"><p>该专辑没有音频文件</p><a href="/simple/list" class="back-link-btn">返回列表</a></div>';
                  return;
                }
                
                var html = '';
                html += '<div class="header">';
                html += '<a href="/simple/list" class="back-link">← 返回列表</a>';
                html += '<h1>' + album.name + '</h1>';
                html += '</div>';
                
                html += '<div class="player">';
                html += '<div class="current-track" id="currentTrack">加载中...</div>';
                html += '<div class="controls">';
                html += '<div class="control-buttons">';
                html += '<button class="btn" id="prevBtn" disabled>上一首</button>';
                html += '<button class="btn" id="playPauseBtn">播放</button>';
                html += '<button class="btn" id="nextBtn" disabled>下一首</button>';
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
                html += '<div class="playlist-header">播放列表</div>';
                html += '<div id="playlistItems"></div>';
                html += '</div>';
                
                mainContainer.innerHTML = html;
                
                // 获取 DOM 元素引用
                audioPlayer = document.getElementById('audioPlayer');
                currentTrackEl = document.getElementById('currentTrack');
                playPauseBtn = document.getElementById('playPauseBtn');
                prevBtn = document.getElementById('prevBtn');
                nextBtn = document.getElementById('nextBtn');
                progressBar = document.getElementById('progressBar');
                volumeBar = document.getElementById('volumeBar');
                timeInfo = document.getElementById('timeInfo');
                playlistItems = document.getElementById('playlistItems');
                
                // 绑定事件
                if (playPauseBtn) {
                  playPauseBtn.onclick = togglePlayPause;
                }
                if (prevBtn) {
                  prevBtn.onclick = handlePrev;
                }
                if (nextBtn) {
                  nextBtn.onclick = handleNext;
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
                if (audioPlayer) {
                  audioPlayer.addEventListener('timeupdate', updateProgress);
                  audioPlayer.addEventListener('loadedmetadata', function() {
                    duration = audioPlayer.duration;
                    updateProgress();
                  });
                  audioPlayer.addEventListener('ended', function() {
                    if (playTimeInterval) {
                      clearInterval(playTimeInterval);
                      playTimeInterval = null;
                    }
                    savePlayHistory();
                    // 自动播放下一首（先调用 handleNext，此时 isPlaying 仍为 true）
                    if (currentIndex < audioFiles.length - 1) {
                      handleNext();
                    } else {
                      isPlaying = false;
                      if (playPauseBtn) playPauseBtn.textContent = '播放';
                    }
                  });
                }
                
                // 初始化：如果有历史记录，找到对应的文件并恢复
                var restoreTime = 0;
                if (historyItem && historyItem.audio_file_id) {
                  for (var i = 0; i < audioFiles.length; i++) {
                    if (audioFiles[i].id === historyItem.audio_file_id) {
                      currentIndex = i;
                      restoreTime = historyItem.play_time || 0;
                      break;
                    }
                  }
                }
                
                loadTrack(restoreTime);

                // 从历史记录进入时自动播放
                if (historyItem) {
                  audioPlayer.addEventListener('loadedmetadata', function onLoaded() {
                    audioPlayer.removeEventListener('loadedmetadata', onLoaded);
                    var promise = audioPlayer.play();
                    if (promise !== undefined) {
                      promise.then(function() {
                        isPlaying = true;
                        if (playPauseBtn) playPauseBtn.textContent = '暂停';
                        startPlayTimeTracking();
                      }).catch(function(error) {
                        console.error('自动播放失败:', error);
                      });
                    }
                  });
                }
              }
              
              // 加载数据
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
              
              // 加载历史记录
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
              
              // 加载音频文件列表
              function loadAudioFiles(callback) {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', '/api/audio-files?albumId=' + albumIdNum, true);
                
                xhr.onreadystatechange = function() {
                  if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                      try {
                        var files = JSON.parse(xhr.responseText);
                        audioFiles = sortAudioFiles(Array.isArray(files) ? files : []);
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
              
              // 加载专辑信息
              var xhr = new XMLHttpRequest();
              xhr.open('GET', '/api/albums/' + albumIdNum, true);
              
              xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                  if (xhr.status === 200) {
                    try {
                      album = JSON.parse(xhr.responseText);
                      
                      // 加载音频文件列表
                      loadAudioFiles(function() {
                        if (audioFiles.length === 0) {
                          mainContainer.innerHTML = '<div class="error"><p>该专辑没有音频文件</p><a href="/simple/list" class="back-link-btn">返回列表</a></div>';
                        } else {
                          // 如果有历史记录，加载历史记录
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
