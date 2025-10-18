/**
 * 为API请求添加随机时间戳参数，防止浏览器缓存
 * @param url API路径
 * @returns 带随机时间戳的完整URL
 */
export function addCacheBuster(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_t=${Date.now()}&_r=${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 获取带缓存破坏器的API URL
 * @param path API路径
 * @returns 带随机时间戳的完整URL
 */
export function getApiUrl(path: string): string {
  return addCacheBuster(path);
}
