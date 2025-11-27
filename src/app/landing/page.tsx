export default function LandingPage() {
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
        .loading-wrapper {
          position: relative;
          min-height: 100vh;
          width: 100%;
        }
        .loading-container {
          position: absolute;
          top: 50%;
          left: 50%;
          margin-top: -50px;
          margin-left: -100px;
          width: 200px;
          text-align: center;
        }
        .loading-text {
          font-size: 18px;
          color: #666;
          margin-bottom: 20px;
          display: block;
        }
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #4a90e2;
          border-radius: 50%;
          margin: 0 auto;
          display: block;
        }
        .simple-link {
          margin-top: 30px;
          display: block;
          color: #4a90e2;
          text-decoration: none;
          font-size: 14px;
        }
        .simple-link:hover {
          text-decoration: underline;
        }
      `}</style>
      <div className="loading-wrapper">
        <div className="loading-container">
          <span className="loading-text">加载中...</span>
          <div className="loading-spinner" suppressHydrationWarning></div>
          <a href="/simple/list" className="simple-link" suppressHydrationWarning>直接进入简单版</a>
        </div>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              // 检测浏览器版本（ES5 兼容）
              function detectBrowserVersion() {
                var userAgent = navigator.userAgent || navigator.vendor || window.opera;
                var chromeVersion = null;
                var webViewVersion = null;
                
                // 检测 Chrome 版本
                var chromeMatch = userAgent.match(/Chrome\\/(\\d+)/);
                if (chromeMatch) {
                  chromeVersion = parseInt(chromeMatch[1], 10);
                }
                
                // 检测 WebView 版本
                var webViewMatch = userAgent.match(/wv.*Chrome\\/(\\d+)/);
                if (webViewMatch) {
                  webViewVersion = parseInt(webViewMatch[1], 10);
                }
                
                return {
                  userAgent: userAgent,
                  chromeVersion: chromeVersion,
                  webViewVersion: webViewVersion,
                  isWebView: webViewMatch !== null,
                };
              }
              
              // 收集设备信息
              function collectDeviceInfo() {
                var browserInfo = detectBrowserVersion();
                var deviceInfo = {
                  userAgent: browserInfo.userAgent,
                  chromeVersion: browserInfo.chromeVersion,
                  webViewVersion: browserInfo.webViewVersion,
                  isWebView: browserInfo.isWebView,
                  screenWidth: window.screen ? window.screen.width : null,
                  screenHeight: window.screen ? window.screen.height : null,
                  windowWidth: window.innerWidth || document.documentElement.clientWidth,
                  windowHeight: window.innerHeight || document.documentElement.clientHeight,
                  language: navigator.language || navigator.userLanguage,
                  platform: navigator.platform || 'unknown',
                  cookieEnabled: navigator.cookieEnabled,
                  onLine: navigator.onLine,
                  timestamp: new Date().toISOString(),
                };
                
                return deviceInfo;
              }
              
              // 发送设备信息到服务器
              function sendDeviceInfo(deviceInfo, callback) {
                var xhr = new XMLHttpRequest();
                xhr.open('POST', '/api/device-info', true);
                xhr.setRequestHeader('Content-Type', 'application/json');
                
                xhr.onreadystatechange = function() {
                  if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                      callback(true);
                    } else {
                      console.error('提交设备信息失败:', xhr.status);
                      callback(false);
                    }
                  }
                };
                
                xhr.onerror = function() {
                  console.error('提交设备信息网络错误');
                  callback(false);
                };
                
                try {
                  xhr.send(JSON.stringify(deviceInfo));
                } catch (error) {
                  console.error('发送设备信息失败:', error);
                  callback(false);
                }
              }
              
              // 判断是否需要跳转到简单页面
              function shouldUseSimplePage(browserInfo) {
                // 如果是 WebView 且版本 <= 74，使用简单页面
                if (browserInfo.isWebView && browserInfo.webViewVersion !== null) {
                  if (browserInfo.webViewVersion <= 74) {
                    return true;
                  }
                }
                
                // 如果是 Chrome 且版本 <= 74，使用简单页面
                if (browserInfo.chromeVersion !== null) {
                  if (browserInfo.chromeVersion <= 74) {
                    return true;
                  }
                }
                
                return false;
              }
              
              // 简单的旋转动画（兼容早期浏览器）
              var spinner = document.querySelector('.loading-spinner');
              if (spinner) {
                var rotation = 0;
                setInterval(function() {
                  rotation += 10;
                  if (rotation >= 360) rotation = 0;
                  spinner.style.transform = 'rotate(' + rotation + 'deg)';
                  spinner.style.webkitTransform = 'rotate(' + rotation + 'deg)';
                }, 50);
              }
              
              // 收集设备信息
              var deviceInfo = collectDeviceInfo();
              var browserInfo = detectBrowserVersion();
              
              // 发送设备信息
              sendDeviceInfo(deviceInfo, function(success) {
                // 提交完成后，根据浏览器版本自动跳转
                var useSimple = shouldUseSimplePage(browserInfo);
                var redirectUrl = useSimple ? '/simple/list' : '/home';
                
                var loadingText = document.querySelector('.loading-text');
                if (loadingText) {
                  if (useSimple) {
                    loadingText.textContent = '检测到老版本浏览器，3秒后跳转到简单版...';
                  } else {
                    loadingText.textContent = '3秒后跳转到普通版...';
                  }
                }
                
                // 3秒后跳转
                setTimeout(function() {
                  window.location.href = redirectUrl;
                }, 3000);
              });
            })();
          `,
        }}
      />
    </div>
  );
}
