'use client';

import { useRouter } from 'next/navigation';
import PasswordVerify from '@/components/PasswordVerify';

export default function PasswordVerifyPage() {
  const router = useRouter();

  const handlePasswordVerified = () => {
    router.replace('/admin');
  };

  const handleBack = () => {
    router.push('/');
  };

  return (
    <PasswordVerify
      onPasswordVerified={handlePasswordVerified}
      onBack={handleBack}
    />
  );
}
