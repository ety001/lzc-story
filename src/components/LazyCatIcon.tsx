'use client';

import Image from 'next/image';

interface LazyCatIconProps {
  className?: string;
  size?: number;
}

export default function LazyCatIcon({ className = "w-16 h-16", size = 48 }: LazyCatIconProps) {
  return (
    <Image
      src={'/lzc-story-logo.png'}
      alt="懒猫故事机"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
