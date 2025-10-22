'use client';

interface LazyCatIconProps {
  className?: string;
  size?: number;
}

export default function LazyCatIcon({ className = "w-16 h-16", size = 48 }: LazyCatIconProps) {
  // 根据尺寸选择合适的PNG文件
  const getLogoSrc = (size: number) => {
    if (size <= 16) return '/lzc-story-logo-16.png';
    if (size <= 32) return '/lzc-story-logo-32.png';
    if (size <= 48) return '/lzc-story-logo-48.png';
    if (size <= 64) return '/lzc-story-logo-64.png';
    if (size <= 128) return '/lzc-story-logo-128.png';
    if (size <= 256) return '/lzc-story-logo-256.png';
    return '/lzc-story-logo.png';
  };

  return (
    <img
      src={getLogoSrc(size)}
      alt="懒猫故事机"
      width={size}
      height={size}
      className={className}
    />
  );
}
