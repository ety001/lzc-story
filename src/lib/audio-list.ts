/**
 * 音频列表窗口化相关工具。
 * 对齐 multitune：全量 ID 骨架 + 分页/批量详情 + 前端虚拟窗口阈值。
 */

/** 超过该数量时，前端应切换为虚拟滚动（默认与 multitune 车机 WINDOW_SIZE 一致） */
export const DEFAULT_AUDIO_WINDOW_THRESHOLD = 50;

/** 列表首屏 / 分页默认条数 */
export const DEFAULT_AUDIO_PAGE_LIMIT = 50;

/** 单次分页上限 */
export const MAX_AUDIO_PAGE_LIMIT = 200;

/** 批量查询 ID 上限 */
export const MAX_BATCH_IDS = 100;

export function getAudioWindowThreshold(): number {
  const raw = parseInt(process.env.AUDIO_WINDOW_THRESHOLD || '', 10);
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_AUDIO_WINDOW_THRESHOLD;
  }
  return raw;
}

/** 去掉扩展名，避免 .mp3 中的数字干扰排序 */
function filenameStem(name: string): string {
  const lastDot = name.lastIndexOf('.');
  return lastDot > 0 ? name.slice(0, lastDot) : name;
}

/** 按文件名中的数字优先排序（故事序号），与历史前端逻辑一致 */
export function compareAudioFilename(a: string, b: string): number {
  const stemA = filenameStem(a);
  const stemB = filenameStem(b);
  const matchA = stemA.match(/\d+/);
  const matchB = stemB.match(/\d+/);
  // 无数字时按 0 处理
  const numA = parseInt(matchA ? matchA[0] : '0', 10);
  const numB = parseInt(matchB ? matchB[0] : '0', 10);

  if (!isNaN(numA) && !isNaN(numB) && (matchA || matchB)) {
    // 一侧有数字、一侧无数字：有数字的排后面（无数字视为序 0）
    if (!matchA && matchB) return -1;
    if (matchA && !matchB) return 1;
    if (numA !== numB) return numA - numB;
  }
  return stemA.localeCompare(stemB, 'zh');
}

export function sortAudioFiles<T extends { filename: string }>(files: T[]): T[] {
  return files.slice().sort((a, b) => compareAudioFilename(a.filename, b.filename));
}

export function clampPageLimit(raw: number | undefined | null): number {
  let limit = raw ?? DEFAULT_AUDIO_PAGE_LIMIT;
  if (!Number.isFinite(limit) || limit <= 0) {
    limit = DEFAULT_AUDIO_PAGE_LIMIT;
  }
  if (limit > MAX_AUDIO_PAGE_LIMIT) {
    limit = MAX_AUDIO_PAGE_LIMIT;
  }
  return Math.floor(limit);
}

export function clampOffset(raw: number | undefined | null): number {
  if (!Number.isFinite(raw as number) || (raw as number) < 0) {
    return 0;
  }
  return Math.floor(raw as number);
}
