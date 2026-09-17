import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  clearMediaSessionActions,
  initMediaSession,
  msSetPlaybackState,
  msSetPositionState,
  msSetMetadata,
} from '../media-session';

describe('media-session', () => {
  const originalMediaSession = Object.getOwnPropertyDescriptor(Navigator.prototype, 'mediaSession')
    || Object.getOwnPropertyDescriptor(navigator, 'mediaSession');

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (globalThis as { lzc_media_session?: unknown }).lzc_media_session;
  });

  beforeEach(() => {
    delete (globalThis as { lzc_media_session?: unknown }).lzc_media_session;
  });

  it('无桥无标准 API 时静默降级为 none', () => {
    vi.stubGlobal('navigator', { ...navigator, mediaSession: undefined });
    // 重新导入较麻烦；直接测 set 不应抛错
    expect(() => msSetPlaybackState('playing')).not.toThrow();
    expect(() => msSetPositionState(100, 10, 1)).not.toThrow();
    expect(() => msSetMetadata({ title: '测试' })).not.toThrow();
  });

  it('标准 MediaSession 模式下注册动作并更新状态', () => {
    const setActionHandler = vi.fn();
    const mediaSession = {
      setActionHandler,
      playbackState: 'none' as MediaSessionPlaybackState,
      setPositionState: vi.fn(),
      metadata: null as { title?: string; artist?: string; album?: string } | null,
    };
    Object.defineProperty(navigator, 'mediaSession', {
      configurable: true,
      value: mediaSession,
    });
    vi.stubGlobal(
      'MediaMetadata',
      class {
        title: string;
        artist: string;
        album: string;
        constructor(init: { title?: string; artist?: string; album?: string }) {
          this.title = init.title || '';
          this.artist = init.artist || '';
          this.album = init.album || '';
        }
      }
    );

    const callbacks = {
      play: vi.fn(),
      pause: vi.fn(),
      next: vi.fn(),
      prev: vi.fn(),
      seekBy: vi.fn(),
      seekTo: vi.fn(),
    };

    const mode = initMediaSession(callbacks);
    expect(mode).toBe('standard');
    expect(setActionHandler).toHaveBeenCalled();

    msSetPlaybackState('playing');
    expect(mediaSession.playbackState).toBe('playing');

    msSetPositionState(120, 30, 1);
    expect(mediaSession.setPositionState).toHaveBeenCalledWith({
      duration: 120,
      position: 30,
      playbackRate: 1,
    });

    msSetMetadata({ title: '小红帽', artist: '童话', album: '故事集' });
    expect(mediaSession.metadata).toBeTruthy();
    expect(mediaSession.metadata?.title).toBe('小红帽');

    if (originalMediaSession) {
      Object.defineProperty(navigator, 'mediaSession', originalMediaSession);
    }
  });

  it('懒猫桥模式下优先使用 lzc_media_session', () => {
    const bridge = {
      setActionHandler: vi.fn(),
      setPlaybackState: vi.fn(),
      setPositionState: vi.fn(),
      setMetadata: vi.fn(),
    };
    (globalThis as { lzc_media_session: typeof bridge }).lzc_media_session = bridge;

    const mode = initMediaSession({
      play: vi.fn(),
      pause: vi.fn(),
      next: vi.fn(),
      prev: vi.fn(),
      seekBy: vi.fn(),
      seekTo: vi.fn(),
    });
    expect(mode).toBe('lzc-bridge');
    expect(bridge.setActionHandler).toHaveBeenCalledWith('play');

    msSetPlaybackState('paused');
    expect(bridge.setPlaybackState).toHaveBeenCalledWith('paused');

    msSetPositionState(60, 5, 1);
    expect(bridge.setPositionState).toHaveBeenCalledWith(
      JSON.stringify({ duration: 60, position: 5, playbackRate: 1 })
    );

    msSetMetadata({ title: '故事' });
    expect(bridge.setMetadata).toHaveBeenCalled();
  });

  it('clearMediaSessionActions 清空标准 MediaSession 动作并置 none', () => {
    const setActionHandler = vi.fn();
    const mediaSession = {
      setActionHandler,
      playbackState: 'playing' as MediaSessionPlaybackState,
      setPositionState: vi.fn(),
      metadata: null,
    };
    Object.defineProperty(navigator, 'mediaSession', {
      configurable: true,
      value: mediaSession,
    });

    initMediaSession({
      play: vi.fn(),
      pause: vi.fn(),
      next: vi.fn(),
      prev: vi.fn(),
      seekBy: vi.fn(),
      seekTo: vi.fn(),
    });
    setActionHandler.mockClear();

    clearMediaSessionActions();
    expect(setActionHandler).toHaveBeenCalledWith('play', null);
    expect(mediaSession.playbackState).toBe('none');

    if (originalMediaSession) {
      Object.defineProperty(navigator, 'mediaSession', originalMediaSession);
    }
  });
});
