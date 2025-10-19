'use client';

import { useRouter } from 'next/navigation';
import PasswordSetup from '@/components/PasswordSetup';

export default function PasswordSetupPage() {
  const router = useRouter();

  const handlePasswordSetup = () => {
    router.push('/admin');
  };

  const handleBack = () => {
    router.push('/');
  };

  return (
    <PasswordSetup 
      onPasswordSet={handlePasswordSetup}
      onBack={handleBack}
    />
  );
}
