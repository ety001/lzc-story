'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminInterface from '@/components/AdminInterface';
import { getApiUrl } from '@/lib/api';

export default function AdminPage() {
  const router = useRouter();
  const [passwordStatus, setPasswordStatus] = useState<'checking' | 'needs-setup' | 'needs-verify' | 'verified' | 'error'>('checking');

  useEffect(() => {
    checkSessionStatus();
  }, []);

  const checkSessionStatus = async () => {
    try {
      // 首先检查是否有有效的session
      const sessionResponse = await fetch(getApiUrl('/api/session'));
      const sessionData = await sessionResponse.json();
      
      if (sessionData.authenticated) {
        setPasswordStatus('verified');
        return;
      }
      
      // 如果没有session，检查密码状态
      checkPasswordStatus();
    } catch (error) {
      console.error('检查session状态失败:', error);
      setPasswordStatus('error');
    }
  };

  const checkPasswordStatus = async () => {
    try {
      const response = await fetch(getApiUrl('/api/admin-password'));
      const data = await response.json();
      
      // 检查admin_config中的password_hash是否为空
      if (!data.password_hash || data.password_hash.trim() === '') {
        setPasswordStatus('needs-setup');
        router.push('/admin/password/setup');
      } else {
        // 密码存在，需要用户输入密码验证
        setPasswordStatus('needs-verify');
        router.push('/admin/password/verify');
      }
    } catch (error) {
      console.error('检查密码状态失败:', error);
      // API调用失败时，显示错误信息而不是重定向
      setPasswordStatus('error');
    }
  };

  const handleBack = () => {
    router.push('/');
  };

  if (passwordStatus === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">检查密码状态...</p>
        </div>
      </div>
    );
  }

  if (passwordStatus === 'verified') {
    return <AdminInterface onBack={handleBack} />;
  }

  if (passwordStatus === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">连接失败</h2>
          <p className="text-gray-600 mb-4">无法连接到服务器，请检查网络连接</p>
          <div className="space-x-4">
            <button
              onClick={() => {
                setPasswordStatus('checking');
                checkPasswordStatus();
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              重试
            </button>
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
