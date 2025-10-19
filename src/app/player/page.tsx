'use client';

import { useRouter } from 'next/navigation';
import PlayerInterface from '@/components/PlayerInterface';

export default function PlayerPage() {
  const router = useRouter();

  const handleBack = () => {
    router.push('/');
  };

  return (
    <PlayerInterface 
      onBack={handleBack}
    />
  );
}