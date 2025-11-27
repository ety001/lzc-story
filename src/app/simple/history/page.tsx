export default function SimpleHistoryPage() {
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

        <div className="history-list" id="historyList" suppressHydrationWarning>
          <div className="loading" suppressHydrationWarning>加载中...</div>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var historyList = document.getElementById('historyList');
              
              // 格式化时间
              function formatDateTime(dateString) {
                try {
                  var date = new Date(dateString);
                  var year = date.getFullYear();
                  var month = String(date.getMonth() + 1);
                  if (month.length === 1) month = '0' + month;
                  var day = String(date.getDate());
                  if (day.length === 1) day = '0' + day;
                  var hours = String(date.getHours());
                  if (hours.length === 1) hours = '0' + hours;
                  var minutes = String(date.getMinutes());
                  if (minutes.length === 1) minutes = '0' + minutes;
                  return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes;
                } catch (e) {
                  return dateString;
                }
              }
              
              // 格式化播放时间（秒转分钟:秒）
              function formatPlayTime(seconds) {
                if (!seconds || seconds <= 0) return '00:00';
                var mins = Math.floor(seconds / 60);
                var secs = Math.floor(seconds % 60);
                var minsStr = String(mins);
                if (minsStr.length === 1) minsStr = '0' + minsStr;
                var secsStr = String(secs);
                if (secsStr.length === 1) secsStr = '0' + secsStr;
                return minsStr + ':' + secsStr;
              }
              
              // 根据专辑名称获取背景色索引
              function getAlbumColorIndex(albumName, albumNames) {
                var index = albumNames.indexOf(albumName);
                if (index === -1) {
                  return 0;
                }
                return index % 2;
              }
              
              function loadHistory() {
                historyList.innerHTML = '<div class="loading">加载中...</div>';
                
                var xhr = new XMLHttpRequest();
                xhr.open('GET', '/api/play-history', true);
                
                xhr.onreadystatechange = function() {
                  if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                      try {
                        var data = JSON.parse(xhr.responseText);
                        var items = Array.isArray(data) ? data : [];
                        
                        if (items.length === 0) {
                          historyList.innerHTML = '<div class="empty">暂无播放历史</div>';
                        } else {
                          // 获取所有唯一的专辑名称（按出现顺序）
                          var albumNames = [];
                          var seenAlbums = {};
                          for (var i = 0; i < items.length; i++) {
                            var albumName = items[i].album_name;
                            if (!seenAlbums[albumName]) {
                              albumNames.push(albumName);
                              seenAlbums[albumName] = true;
                            }
                          }
                          
                          var html = '';
                          for (var j = 0; j < items.length; j++) {
                            var item = items[j];
                            var colorIndex = getAlbumColorIndex(item.album_name, albumNames);
                            html += '<a href="/simple/player/' + item.album_id + '?historyItem=' + item.audio_file_id + '" class="history-item history-item-bg-' + colorIndex + '">';
                            html += '<span class="history-item-header">' + item.filename + '</span>';
                            html += '<div class="history-item-info">' + item.album_name + '</div>';
                            html += '<div class="history-item-info">播放至: ' + formatPlayTime(item.play_time) + '</div>';
                            html += '<div class="history-item-time">' + formatDateTime(item.played_at) + '</div>';
                            html += '</a>';
                          }
                          historyList.innerHTML = html;
                        }
                      } catch (err) {
                        console.error('解析数据失败:', err);
                        historyList.innerHTML = '<div class="error">加载播放历史失败</div>';
                      }
                    } else {
                      console.error('加载播放历史失败:', xhr.status);
                      historyList.innerHTML = '<div class="error">加载播放历史失败</div>';
                    }
                  }
                };
                
                xhr.onerror = function() {
                  console.error('加载播放历史网络错误');
                  historyList.innerHTML = '<div class="error">加载播放历史失败</div>';
                };
                
                xhr.send();
              }
              
              loadHistory();
            })();
          `,
        }}
      />
    </div>
  );
}
