'use client';

import { useRouter } from 'next/navigation';
import AlbumSelector from './AlbumSelector';

interface Album {
  id: number;
  name: string;
  path: string;
  audio_count: number;
  created_at: string;
}

interface PlayerInterfaceProps {
  onBack: () => void;
}

export default function PlayerInterface({ onBack }: PlayerInterfaceProps) {
  const router = useRouter();

  const handleSelectAlbum = (album: Album) => {
    // 导航到独立的播放器页面
    router.push(`/player/${album.id}`);
  };

  return (
    <AlbumSelector
      onBack={onBack}
      onSelectAlbum={handleSelectAlbum}
    />
  );
}
