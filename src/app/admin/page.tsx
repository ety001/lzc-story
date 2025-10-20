"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminInterface from '@/components/AdminInterface';
import { getApiUrl } from '@/lib/api';

export default function AdminPage() {
  const router = useRouter();
  const [isValidating, setIsValidating] = useState(true);

  const handleBack = useCallback(() => {
    router.push('/');
  }, [router]);

  // 验证会话有效性
  useEffect(() => {
    const validateSession = async () => {
      try {
        // 调用 API 验证会话
        const response = await fetch(getApiUrl('/api/admin-password'), {
          method: 'HEAD', // 使用 HEAD 请求只检查状态
        });

        if (!response.ok) {
          // 会话无效，重定向到验证页面
          router.replace('/admin/password/verify');
          return;
        }

        setIsValidating(false);
      } catch (error) {
        console.error('会话验证失败:', error);
        router.replace('/admin/password/verify');
      }
    };

    validateSession();
  }, [router]);

  if (isValidating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">验证会话中...</p>
        </div>
      </div>
    );
  }

  // 访问到这里，会话已验证有效
  return <AdminInterface onBack={handleBack} />;
}
