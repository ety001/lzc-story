/**
 * 媒体会话接入：让系统认到媒体会话，接收媒体硬件按键（方向盘/耳机线控/锁屏控制）。
 * 两条通道，优先懒猫 WebShell 桥：
 *   lzc-bridge — 懒猫客户端注入的全局 lzc_media_session（老车机 WebView 无
 *                标准 API 时仍能建立原生媒体会话），回调经 window 的
 *                lzc_media_session_event 事件派发，detail = { eventType, data }
 *   standard   — 浏览器原生 navigator.mediaSession
 *   none       — 均不可用，静默降级为无媒体按键
 */

export type MediaSessionMode = 'lzc-bridge' | 'standard' | 'none';

export interface MediaSessionCallbacks {
  play: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  seekBy: (delta: number) => void;
  seekTo: (time: number) => void;
}

export interface MediaSessionTrackMeta {
  title?: string;
  artist?: string;
  album?: string;
}

/** 懒猫 WebShell 注入的媒体会话桥（运行时可能不存在） */
interface LzcMediaSessionBridge {
  setActionHandler: (name: string) => void;
  setPlaybackState: (state: string) => void;
  setPositionState: (json: string) => void;
  setMetadata: (json: string) => void;
}

declare global {
  var lzc_media_session: LzcMediaSessionBridge | undefined;
}

type ActionHandler = (data?: { seekTime?: number }) => void;

function getLzcBridge(): LzcMediaSessionBridge | undefined {
  return typeof lzc_media_session !== 'undefined' ? lzc_media_session : undefined;
}

function msMode(): MediaSessionMode {
  if (getLzcBridge()) return 'lzc-bridge';
  if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) return 'standard';
  return 'none';
}

let handlers: Record<string, ActionHandler> = {};
let eventBound = false;

export function initMediaSession(callbacks: MediaSessionCallbacks): MediaSessionMode {
  const mode = msMode();
  if (mode === 'none') return mode;

  handlers = {
    play: callbacks.play,
    pause: callbacks.pause,
    nexttrack: callbacks.next,
    previoustrack: callbacks.prev,
    seekforward: () => callbacks.seekBy(10),
    seekbackward: () => callbacks.seekBy(-10),
    seekto: (data) => {
      if (data && typeof data.seekTime === 'number') callbacks.seekTo(data.seekTime);
    },
    stop: callbacks.pause,
  };

  if (!eventBound && typeof window !== 'undefined') {
    eventBound = true;
    window.addEventListener('lzc_media_session_event', ((e: CustomEvent<{ eventType?: string; data?: { seekTime?: number } }>) => {
      const detail = e.detail || {};
      const fn = handlers[detail.eventType || ''];
      if (fn) fn(detail.data);
    }) as EventListener);
  }

  const bridge = getLzcBridge();
  for (const [name, fn] of Object.entries(handlers)) {
    try {
      if (mode === 'lzc-bridge' && bridge) {
        bridge.setActionHandler(name);
      } else if (typeof navigator !== 'undefined' && navigator.mediaSession) {
        navigator.mediaSession.setActionHandler(
          name as MediaSessionAction,
          fn as MediaSessionActionHandler
        );
      }
    } catch {
      // 该 action 不被支持，跳过
    }
  }
  return mode;
}

export function msSetPlaybackState(state: MediaSessionPlaybackState | 'playing' | 'paused' | 'none'): void {
  try {
    const bridge = getLzcBridge();
    if (msMode() === 'lzc-bridge' && bridge) {
      bridge.setPlaybackState(state);
    } else if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = state as MediaSessionPlaybackState;
    }
  } catch {
    // 状态同步失败不影响播放
  }
}

export function msSetPositionState(duration: number, position: number, rate: number): void {
  try {
    const bridge = getLzcBridge();
    if (msMode() === 'lzc-bridge' && bridge) {
      bridge.setPositionState(JSON.stringify({ duration, position, playbackRate: rate }));
    } else if (
      typeof navigator !== 'undefined' &&
      'mediaSession' in navigator &&
      typeof navigator.mediaSession.setPositionState === 'function'
    ) {
      navigator.mediaSession.setPositionState({ duration, position, playbackRate: rate });
    }
  } catch {
    // 进度同步失败不影响播放
  }
}

/** 换歌时更新元信息（标题/专辑），供锁屏与系统媒体控制显示 */
export function msSetMetadata(track: MediaSessionTrackMeta | null | undefined): void {
  const mode = msMode();
  if (mode === 'none') return;

  const meta: MediaMetadataInit = {
    title: (track && track.title) || '未知故事',
    artist: (track && track.artist) || '',
    album: (track && track.album) || '懒猫故事机',
  };

  try {
    const bridge = getLzcBridge();
    if (mode === 'lzc-bridge' && bridge) {
      bridge.setMetadata(JSON.stringify(meta));
    } else if (typeof navigator !== 'undefined' && typeof MediaMetadata !== 'undefined') {
      navigator.mediaSession.metadata = new MediaMetadata(meta);
    }
  } catch {
    // 元信息设置失败不影响播放
  }
}
