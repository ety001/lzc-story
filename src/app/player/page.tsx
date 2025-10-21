'use client';

import { useRouter } from 'next/navigation';
import AlbumSelector from '@/components/AlbumSelector';

interface Album {
  id: number;
  name: string;
  path: string;
  audio_count: number;
  created_at: string;
}

export default function PlayerPage() {
  const router = useRouter();

  const handleBack = () => {
    router.push('/');
  };

  const handleSelectAlbum = (album: Album) => {
    // 导航到独立的播放器页面
    router.push(`/player/${album.id}`);
  };

  return (
    <AlbumSelector
      onBack={handleBack}
      onSelectAlbum={handleSelectAlbum}
    />
  );
}