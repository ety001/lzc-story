'use client';

import { useState, useEffect } from 'react';
import type { Album, AudioFile, PlayHistoryItem, AdminConfig, DatabaseTestResult } from '@/types';

export default function DatabaseTest() {
    const [result, setResult] = useState<DatabaseTestResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [customQuery, setCustomQuery] = useState('');
    const [customResult, setCustomResult] = useState<unknown>(null);

    const fetchDatabaseInfo = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/test');
            const data = await response.json();

            if (data.success) {
                setResult(data);
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '请求失败');
        } finally {
            setLoading(false);
        }
    };

    const executeCustomQuery = async () => {
        if (!customQuery.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'query',
                    sql: customQuery,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setCustomResult(data.result);
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '查询失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDatabaseInfo();
    }, []);

    if (loading && !result) {
        return (
            <div className="p-6">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">正在连接数据库...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">数据库测试工具</h1>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                    <p className="text-red-800">❌ {error}</p>
                </div>
            )}

            {result && (
                <div className="space-y-6">
                    {/* 数据库基本信息 */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold mb-4">📊 数据库信息</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">数据库路径:</p>
                                <p className="font-mono text-sm">{result.database.path}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">连接时间:</p>
                                <p className="text-sm">{new Date(result.timestamp).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* 表统计信息 */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold mb-4">📋 表统计</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {result.database.tables?.map(table => (
                                <div key={table} className="text-center p-3 bg-gray-50 rounded">
                                    <p className="font-semibold text-sm">{table}</p>
                                    <p className="text-lg font-bold text-indigo-600">
                                        {typeof result.database.stats?.[table] === 'number'
                                            ? result.database.stats[table]
                                            : 'N/A'
                                        }
                                    </p>
                                    <p className="text-xs text-gray-500">条记录</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 专辑数据示例 */}
                    {result.database.sampleAlbums && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold mb-4">🎵 专辑数据示例</h2>
                            <div className="space-y-2">
                                {result.database.sampleAlbums.map((album: Album) => (
                                    <div key={album.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                        <div>
                                            <span className="font-semibold">{album.name}</span>
                                            <span className="text-gray-500 ml-2">(ID: {album.id})</span>
                                        </div>
                                        <div className="text-sm text-gray-600 truncate max-w-md">
                                            {album.path}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 播放历史示例 */}
                    {result.database.samplePlayHistory && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold mb-4">📚 播放历史示例</h2>
                            <div className="space-y-2">
                                {result.database.samplePlayHistory.map((item: PlayHistoryItem, index: number) => (
                                    <div key={item.id || index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                        <div>
                                            <span className="font-semibold">文件ID: {item.audio_file_id}</span>
                                            <span className="text-gray-500 ml-2">专辑ID: {item.album_id}</span>
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            播放时间: {item.play_time ? `${Math.floor(item.play_time / 60)}:${(item.play_time % 60).toFixed(0).padStart(2, '0')}` : 'N/A'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 自定义查询 */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold mb-4">🔍 自定义查询</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    SQL 查询语句:
                                </label>
                                <textarea
                                    value={customQuery}
                                    onChange={(e) => setCustomQuery(e.target.value)}
                                    placeholder="例如: SELECT * FROM albums LIMIT 5"
                                    className="w-full p-3 border border-gray-300 rounded-md font-mono text-sm"
                                    rows={3}
                                />
                            </div>
                            <button
                                onClick={executeCustomQuery}
                                disabled={loading || !customQuery.trim()}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? '执行中...' : '执行查询'}
                            </button>

                            {customResult !== null && (
                                <div className="mt-4">
                                    <h3 className="font-semibold mb-2">查询结果:</h3>
                                    <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
                                        {JSON.stringify(customResult as Record<string, unknown>, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 刷新按钮 */}
                    <div className="text-center">
                        <button
                            onClick={fetchDatabaseInfo}
                            disabled={loading}
                            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? '刷新中...' : '刷新数据'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
