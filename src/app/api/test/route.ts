import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/sqlite-database';
import * as path from 'path';

export async function GET(request: NextRequest) {
    // 检查是否来自 localhost
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = forwarded?.split(',')[0] || realIp || '127.0.0.1';

    if (clientIp !== '127.0.0.1' && clientIp !== '::1' && clientIp !== 'localhost') {
        return NextResponse.json({
            success: false,
            message: 'Access denied. Only localhost access is allowed.'
        }, { status: 403 });
    }

    const dbPath = path.join(process.cwd(), 'data', 'lzc-story.db');

    try {
        const result = {
            success: true,
            message: '数据库连接成功',
            timestamp: new Date().toISOString(),
            database: {
                path: dbPath,
                tables: [] as string[],
                stats: {} as Record<string, number | string>,
                sampleAlbums: undefined as unknown,
                sampleAudioFiles: undefined as unknown,
                samplePlayHistory: undefined as unknown,
                adminConfig: undefined as unknown
            }
        };

        // 获取所有表 - 使用 sqlite-database 的方法
        const tables = db.executeSQL<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table'");
        result.database.tables = tables.map(table => table.name);

        // 获取各表的记录数
        for (const table of tables) {
            try {
                const count = db.executeSQL<{ count: number }>(`SELECT COUNT(*) as count FROM ${table.name}`);
                result.database.stats[table.name] = count[0]?.count || 0;
            } catch (error) {
                result.database.stats[table.name] = `查询失败: ${error instanceof Error ? error.message : '未知错误'}`;
            }
        }

        // 获取专辑数据示例
        try {
            const albums = db.get('albums') as unknown as Array<{ id: number, name: string, path: string }>;
            result.database.sampleAlbums = albums.slice(0, 3);
        } catch (error) {
            result.database.sampleAlbums = `查询失败: ${error instanceof Error ? error.message : '未知错误'}`;
        }

        // 获取音频文件数据示例
        try {
            const audioFiles = db.get('audio_files') as unknown as Array<{ id: number, filename: string, album_id: number }>;
            result.database.sampleAudioFiles = audioFiles.slice(0, 3);
        } catch (error) {
            result.database.sampleAudioFiles = `查询失败: ${error instanceof Error ? error.message : '未知错误'}`;
        }

        // 获取播放历史示例
        try {
            const history = db.executeSQL<{ id: number, audio_file_id: number, play_time: number, played_at: string }>('SELECT * FROM play_history ORDER BY played_at DESC LIMIT 3');
            result.database.samplePlayHistory = history;
        } catch (error) {
            result.database.samplePlayHistory = `查询失败: ${error instanceof Error ? error.message : '未知错误'}`;
        }

        // 获取管理员配置
        try {
            const adminConfig = db.get('admin_config') as unknown as Array<{ id: number, password_hash: string }>;
            result.database.adminConfig = adminConfig.map(config => ({
                id: config.id,
                passwordSet: !!config.password_hash
            }));
        } catch (error) {
            result.database.adminConfig = `查询失败: ${error instanceof Error ? error.message : '未知错误'}`;
        }

        return NextResponse.json(result);

    } catch (error) {
        return NextResponse.json({
            success: false,
            message: '数据库连接失败',
            error: error instanceof Error ? error.message : '未知错误',
            timestamp: new Date().toISOString(),
            database: {
                path: dbPath
            }
        }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    // 检查是否来自 localhost
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = forwarded?.split(',')[0] || realIp || '127.0.0.1';

    if (clientIp !== '127.0.0.1' && clientIp !== '::1' && clientIp !== 'localhost') {
        return NextResponse.json({
            success: false,
            message: 'Access denied. Only localhost access is allowed.'
        }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { action, sql, params = [] } = body;

        if (!action || !sql) {
            return NextResponse.json({
                success: false,
                message: '缺少必要参数: action 和 sql'
            }, { status: 400 });
        }

        let result;

        switch (action) {
            case 'query':
                // 执行查询 - 使用 sqlite-database 的方法
                result = db.executeSQL(sql, params);
                break;

            case 'queryOne':
                // 执行单行查询 - 使用 sqlite-database 的方法
                const results = db.executeSQL(sql, params);
                result = results.length > 0 ? results[0] : null;
                break;

            case 'execute':
                // 执行插入/更新/删除 - 使用 sqlite-database 的方法
                result = db.executeStatement(sql, params);
                break;

            default:
                return NextResponse.json({
                    success: false,
                    message: '不支持的操作类型'
                }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: '操作执行成功',
            result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        return NextResponse.json({
            success: false,
            message: '操作执行失败',
            error: error instanceof Error ? error.message : '未知错误',
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}
