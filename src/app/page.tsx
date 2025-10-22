import Link from 'next/link';
import { Settings, Play, Clock } from 'lucide-react';
import LazyCatIcon from '@/components/LazyCatIcon';
import ClientOnly from '@/components/ClientOnly';
import PlayHistory from '@/components/PlayHistory';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <LazyCatIcon size={40} />
              <h1 className="text-2xl font-bold text-gray-900">懒猫故事机</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 播放历史 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-indigo-600" />
            播放历史
          </h2>

          <ClientOnly fallback={
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">加载中...</p>
            </div>
          }>
            <PlayHistory />
          </ClientOnly>
        </div>

        {/* 操作按钮 */}
        <ClientOnly fallback={
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <Settings className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
              <p className="font-medium text-gray-700">管理专辑</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <Play className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
              <p className="font-medium text-gray-700">播放器</p>
            </div>
          </div>
        }>
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/admin"
              className="bg-white rounded-lg shadow-sm p-6 text-center hover:shadow-md transition-shadow"
            >
              <Settings className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
              <p className="font-medium text-gray-700">管理专辑</p>
            </Link>

            <Link
              href="/player"
              className="bg-white rounded-lg shadow-sm p-6 text-center hover:shadow-md transition-shadow"
            >
              <Play className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
              <p className="font-medium text-gray-700">播放器</p>
            </Link>
          </div>
        </ClientOnly>
      </div>
    </div>
  );
}