'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import PasswordSetup from '@/components/PasswordSetup';
import { getApiUrl } from '@/lib/api';

export default function PasswordSetupPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkPasswordExists = async () => {
      try {
        const response = await fetch(getApiUrl('/api/admin-password'));
        if (response.ok) {
          const data = await response.json();

          // 如果密码已经设置，重定向到管理页面
          if (data.hasPassword) {
            router.replace('/admin');
            return;
          }
        }
      } catch (error) {
        console.error('检查密码状态失败:', error);
        // 如果检查失败，允许继续设置密码
      } finally {
        setIsChecking(false);
      }
    };

    checkPasswordExists();
  }, [router]);

  const handlePasswordSetup = () => {
    router.push('/admin');
  };

  const handleBack = () => {
    router.push('/');
  };

  // 显示加载状态
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">检查密码状态中...</p>
        </div>
      </div>
    );
  }

  return (
    <PasswordSetup
      onPasswordSet={handlePasswordSetup}
      onBack={handleBack}
    />
  );
}
