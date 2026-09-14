export default function SimpleListPage() {
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
            margin-bottom: 20px;
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

        <div className="nav-links">
          <a href="/simple/history" className="nav-link" suppressHydrationWarning>播放历史</a>
        </div>

        {/* dangerouslySetInnerHTML：避免 React 对子节点做 hydration 比对 */}
        <div
          className="album-list"
          id="albumList"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: '<div class="loading">加载中...</div>' }}
        />
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var albumList = document.getElementById('albumList');
              var started = false;

              function loadAlbums() {
                if (started || !albumList) return;
                started = true;
                albumList.innerHTML = '<div class="loading">加载中...</div>';
                
                var xhr = new XMLHttpRequest();
                xhr.open('GET', '/api/albums', true);
                
                xhr.onreadystatechange = function() {
                  if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                      try {
                        var data = JSON.parse(xhr.responseText);
                        var albums = Array.isArray(data) ? data : [];
                        
                        if (albums.length === 0) {
                          albumList.innerHTML = '<div class="empty">暂无专辑</div>';
                        } else {
                          var html = '';
                          for (var i = 0; i < albums.length; i++) {
                            var album = albums[i];
                            html += '<a href="/simple/player/' + album.id + '" class="album-item">';
                            html += '<div class="album-name">' + album.name + '</div>';
                            html += '<div class="album-info">共 ' + album.audio_count + ' 个音频文件</div>';
                            html += '</a>';
                          }
                          albumList.innerHTML = html;
                        }
                      } catch (err) {
                        console.error('解析数据失败:', err);
                        albumList.innerHTML = '<div class="error">加载专辑列表失败</div>';
                      }
                    } else {
                      console.error('加载专辑列表失败:', xhr.status);
                      albumList.innerHTML = '<div class="error">加载专辑列表失败</div>';
                    }
                  }
                };
                
                xhr.onerror = function() {
                  console.error('加载专辑列表网络错误');
                  albumList.innerHTML = '<div class="error">加载专辑列表失败</div>';
                };
                
                xhr.send();
              }

              // 内联脚本在 HTML 解析时就会执行，早于 React hydration。
              // 若此时改 DOM，会触发 React #418，整树客户端重渲染后脚本不会再跑，列表永久停在「加载中」。
              function scheduleLoad() {
                setTimeout(loadAlbums, 0);
              }
              if (document.readyState === 'complete') {
                scheduleLoad();
              } else {
                window.addEventListener('load', scheduleLoad);
              }
            })();
          `,
        }}
      />
    </div>
  );
}