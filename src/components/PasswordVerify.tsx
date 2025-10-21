'use client';

import { useState } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import LazyCatIcon from './LazyCatIcon';

interface PasswordVerifyProps {
  onPasswordVerified: () => void;
  onBack: () => void;
}

export default function PasswordVerify({ onPasswordVerified, onBack }: PasswordVerifyProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(getApiUrl('/api/admin-password'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        onPasswordVerified();
      } else {
        setError(data.error || '密码验证失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {/* 返回按钮 */}
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mx-auto" />
        </button>
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            <LazyCatIcon />
          </div>
          <h1 className="text-2xl font-bold text-gray-700 mb-2">懒猫故事机</h1>
          <p className="text-gray-500">请输入管理员密码</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              管理员密码
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-12"
                placeholder="请输入密码"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '验证中...' : '验证密码'}
          </button>

          {/* 忘记密码按钮 */}
          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className="w-full text-gray-500 hover:text-gray-700 text-sm py-2 transition-colors"
          >
            忘记密码？
          </button>
        </form>

        {/* 忘记密码提示弹窗 */}
        {showForgotPassword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">重置密码</h3>
              <p className="text-gray-600 mb-6">
                请停止服务后，将 <code className="bg-gray-100 px-2 py-1 rounded text-sm">data/lzc-story.db</code> 删除并重启服务，即可重置密码。
              </p>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  知道了
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
