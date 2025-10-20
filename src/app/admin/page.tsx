"use client";

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminInterface from '@/components/AdminInterface';

export default function AdminPage() {
  const router = useRouter();

  const handleBack = useCallback(() => {
    router.push('/');
  }, [router]);

  // 访问到这里，已通过中间件会话校验
  return <AdminInterface onBack={handleBack} />;
}
