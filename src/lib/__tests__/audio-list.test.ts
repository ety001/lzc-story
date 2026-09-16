import { describe, it, expect } from 'vitest';
import {
  clampOffset,
  clampPageLimit,
  compareAudioFilename,
  DEFAULT_AUDIO_PAGE_LIMIT,
  MAX_AUDIO_PAGE_LIMIT,
  sortAudioFiles,
} from '@/lib/audio-list';

describe('audio-list', () => {
  it('按文件名数字排序', () => {
    const files = [
      { id: 1, filename: '故事10.mp3' },
      { id: 2, filename: '故事2.mp3' },
      { id: 3, filename: '故事1.mp3' },
      { id: 4, filename: '前言.mp3' }, // 无数字视为 0，排在最前（忽略扩展名中的数字）
    ];
    const sorted = sortAudioFiles(files);
    expect(sorted.map((f) => f.id)).toEqual([4, 3, 2, 1]);
  });

  it('compareAudioFilename 数字优先且忽略扩展名', () => {
    expect(compareAudioFilename('a2.mp3', 'a10.mp3')).toBeLessThan(0);
    expect(compareAudioFilename('前言.mp3', 'a1.mp3')).toBeLessThan(0);
    expect(compareAudioFilename('intro.flac', 'track3.flac')).toBeLessThan(0);
  });

  it('clampPageLimit 限制范围', () => {
    expect(clampPageLimit(NaN)).toBe(DEFAULT_AUDIO_PAGE_LIMIT);
    expect(clampPageLimit(0)).toBe(DEFAULT_AUDIO_PAGE_LIMIT);
    expect(clampPageLimit(999)).toBe(MAX_AUDIO_PAGE_LIMIT);
    expect(clampPageLimit(30)).toBe(30);
  });

  it('clampOffset 非负整数', () => {
    expect(clampOffset(-1)).toBe(0);
    expect(clampOffset(NaN)).toBe(0);
    expect(clampOffset(12.7)).toBe(12);
  });
});
