'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit, Trash2, Folder, Music, LogOut } from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface Album {
  id: number;
  name: string;
  path: string;
  audio_count: number;
  created_at: string;
}

interface FileSystemItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: string;
}

interface AdminInterfaceProps {
  onBack: () => void;
}

export default function AdminInterface({ onBack }: AdminInterfaceProps) {
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [formData, setFormData] = useState({ name: '', path: '' });
  const [fileSystemItems, setFileSystemItems] = useState<FileSystemItem[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  useEffect(() => {
    loadAlbums();
  }, []);

  // 消息自动消失
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const loadAlbums = async () => {
    try {
      const response = await fetch(getApiUrl('/api/albums'));
      const data = await response.json();
      // 确保data是数组
      setAlbums(Array.isArray(data) ? data : []);
    } catch {
      setError('加载专辑列表失败');
      setAlbums([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFileSystem = async (path: string) => {
    try {
      const response = await fetch(getApiUrl(`/api/filesystem?path=${encodeURIComponent(path)}`));
      const data = await response.json();
      setFileSystemItems(data.items);
      setCurrentPath(data.currentPath);
    } catch {
      setError('加载目录结构失败');
    }
  };

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/albums', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          albumPath: formData.path
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('专辑创建成功，正在扫描音频文件...');
        setFormData({ name: '', path: '' });
        setShowCreateForm(false);
        loadAlbums();
      } else {
        setError(data.error || '创建专辑失败');
      }
    } catch {
      setError('网络错误，请重试');
    }
  };

  const handleEditAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!editingAlbum) return;

    try {
      const response = await fetch('/api/albums', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingAlbum.id,
          name: formData.name,
          albumPath: formData.path,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('专辑更新成功');
        setFormData({ name: '', path: '' });
        setShowEditForm(false);
        setEditingAlbum(null);
        loadAlbums();
      } else {
        setError(data.error || '更新专辑失败');
      }
    } catch {
      setError('网络错误，请重试');
    }
  };

  const handleDeleteAlbum = async (id: number) => {
    if (!confirm('确定要删除这个专辑吗？这将删除所有相关的音频文件记录。')) {
      return;
    }

    try {
      const response = await fetch(`/api/albums?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('专辑删除成功');
        loadAlbums();
      } else {
        setError(data.error || '删除专辑失败');
      }
    } catch {
      setError('网络错误，请重试');
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch(getApiUrl('/api/admin-password'), {
        method: 'DELETE',
      });

      if (response.ok) {
        // 清除会话成功，重定向到首页
        router.push('/');
      } else {
        setError('退出失败，请重试');
      }
    } catch {
      setError('网络错误，请重试');
    }
  };

  const openFileBrowser = () => {
    setShowFileBrowser(true);
    loadFileSystem('/');
  };

  const selectPath = (path: string) => {
    setFormData({ ...formData, path });
    setShowFileBrowser(false);
  };

  const startEdit = (album: Album) => {
    setEditingAlbum(album);
    setFormData({ name: album.name, path: album.path });
    setShowEditForm(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-700">专辑管理</h1>
            <p className="text-sm text-gray-500 mt-1">
              当前专辑: {albums.length} / {process.env.MAX_ALBUMS || 10}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center"
              title="退出登录"
            >
              <LogOut className="w-4 h-4 mx-auto" />
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              disabled={albums.length >= parseInt(process.env.MAX_ALBUMS || '10')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              title={albums.length >= parseInt(process.env.MAX_ALBUMS || '10') ? '专辑数量已达到上限' : '创建专辑'}
            >
              <Plus className="w-4 h-4 mx-auto" />
            </button>
          </div>
        </div>

        {/* 消息提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-green-600 text-sm">{success}</p>
          </div>
        )}

        {/* 专辑列表 */}
        <div className="space-y-4">
          {albums.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">暂无专辑</p>
              <button
                onClick={() => setShowCreateForm(true)}
                disabled={albums.length >= parseInt(process.env.MAX_ALBUMS || '10')}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                创建第一个专辑
              </button>
            </div>
          ) : (
            albums.map((album) => (
              <div key={album.id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 pr-4">
                    <h3
                      className="font-medium text-gray-700 mb-1 max-w-xs"
                      title={album.name}
                    >
                      {album.name}
                    </h3>
                    <p
                      className="text-sm text-gray-600 mb-1 max-w-xs"
                      title={album.path}
                    >
                      {album.path}
                    </p>
                    <p className="text-xs text-gray-500">
                      {album.audio_count} 个音频文件 • 创建于 {new Date(album.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => startEdit(album)}
                      className="p-2 text-gray-400 hover:text-indigo-600"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAlbum(album.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 创建专辑表单 */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">创建专辑</h2>
              <form onSubmit={handleCreateAlbum} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    专辑名称
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="请输入专辑名称"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    专辑路径
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={formData.path}
                      onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="选择或输入路径"
                      required
                    />
                    <button
                      type="button"
                      onClick={openFileBrowser}
                      className="ml-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      <Folder className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700"
                  >
                    创建
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 编辑专辑表单 */}
        {showEditForm && editingAlbum && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">编辑专辑</h2>
              <form onSubmit={handleEditAlbum} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    专辑名称
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="请输入专辑名称"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    专辑路径
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={formData.path}
                      onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="选择或输入路径"
                      required
                    />
                    <button
                      type="button"
                      onClick={openFileBrowser}
                      className="ml-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      <Folder className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700"
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditForm(false);
                      setEditingAlbum(null);
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 文件浏览器 */}
        {showFileBrowser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-96 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">选择路径</h2>
                <button
                  onClick={() => setShowFileBrowser(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-2">
                  {fileSystemItems.map((item) => (
                    <div
                      key={item.path}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                      onClick={() => {
                        if (item.isDirectory) {
                          loadFileSystem(item.path);
                        } else {
                          selectPath(item.path);
                        }
                      }}
                    >
                      <div className="flex items-center">
                        <Folder className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      {item.isDirectory && (
                        <span className="text-xs text-gray-400">文件夹</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex space-x-3">
                  <button
                    onClick={() => selectPath(currentPath)}
                    className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700"
                  >
                    选择当前路径
                  </button>
                  <button
                    onClick={() => setShowFileBrowser(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
