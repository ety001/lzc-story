/**
 * 检测 WebView 版本并判断是否需要使用简单页面
 * @param userAgent User-Agent 字符串
 * @returns 如果是老版本 WebView 返回 true
 */
export function isOldWebView(userAgent: string | null): boolean {
    if (!userAgent) {
        return false;
    }

    // 检测 Chrome/WebView 版本
    // User-Agent 格式示例: "Mozilla/5.0 ... Chrome/74.0.3729.186 ..."
    const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
    if (chromeMatch) {
        const chromeVersion = parseInt(chromeMatch[1], 10);
        // Chrome 74 及更早版本使用简单页面
        if (chromeVersion <= 74) {
            return true;
        }
    }

    // 检测 WebView 版本
    // User-Agent 格式示例: "Mozilla/5.0 ... wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/74.0.3729.186 ..."
    const webViewMatch = userAgent.match(/wv.*Chrome\/(\d+)/);
    if (webViewMatch) {
        const webViewVersion = parseInt(webViewMatch[1], 10);
        if (webViewVersion <= 74) {
            return true;
        }
    }

    return false;
}

