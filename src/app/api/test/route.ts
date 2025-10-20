import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
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
        // 连接数据库
        const db = new Database(dbPath);

        const result = {
            success: true,
            message: '数据库连接成功',
            timestamp: new Date().toISOString(),
            database: {
                path: dbPath,
                tables: [] as string[],
                stats: {} as Record<string, number | string>,
                sampleAlbums: undefined as any,
                sampleAudioFiles: undefined as any,
                samplePlayHistory: undefined as any,
                adminConfig: undefined as any
            }
        };

        // 获取所有表
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
        result.database.tables = tables.map(table => table.name);

        // 获取各表的记录数
        for (const table of tables) {
            try {
                const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as { count: number };
                result.database.stats[table.name] = count.count;
            } catch (error) {
                result.database.stats[table.name] = `查询失败: ${error instanceof Error ? error.message : '未知错误'}`;
            }
        }

        // 获取专辑数据示例
        try {
            const albums = db.prepare('SELECT * FROM albums LIMIT 3').all() as Array<{ id: number, name: string, path: string }>;
            result.database.sampleAlbums = albums;
        } catch (error) {
            result.database.sampleAlbums = `查询失败: ${error instanceof Error ? error.message : '未知错误'}`;
        }

        // 获取音频文件数据示例
        try {
            const audioFiles = db.prepare('SELECT * FROM audio_files LIMIT 3').all() as Array<{ id: number, filename: string, album_id: number }>;
            result.database.sampleAudioFiles = audioFiles;
        } catch (error) {
            result.database.sampleAudioFiles = `查询失败: ${error instanceof Error ? error.message : '未知错误'}`;
        }

        // 获取播放历史示例
        try {
            const history = db.prepare('SELECT * FROM play_history ORDER BY played_at DESC LIMIT 3').all() as Array<{ id: number, audio_file_id: number, play_time: number, played_at: string }>;
            result.database.samplePlayHistory = history;
        } catch (error) {
            result.database.samplePlayHistory = `查询失败: ${error instanceof Error ? error.message : '未知错误'}`;
        }

        // 获取管理员配置
        try {
            const adminConfig = db.prepare('SELECT * FROM admin_config').all() as Array<{ id: number, password_hash: string }>;
            result.database.adminConfig = adminConfig.map(config => ({
                id: config.id,
                passwordSet: !!config.password_hash
            }));
        } catch (error) {
            result.database.adminConfig = `查询失败: ${error instanceof Error ? error.message : '未知错误'}`;
        }

        // 关闭数据库连接
        db.close();

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

    if (clientIp !== '127.0.0.1' && clientIp !== '::1' && !clientIp.startsWith('192.168.') && !clientIp.startsWith('10.') && clientIp !== 'localhost') {
        return NextResponse.json({
            success: false,
            message: 'Access denied. Only localhost access is allowed.'
        }, { status: 403 });
    }

    const dbPath = path.join(process.cwd(), 'data', 'lzc-story.db');

    try {
        const body = await request.json();
        const { action, sql, params = [] } = body;

        if (!action || !sql) {
            return NextResponse.json({
                success: false,
                message: '缺少必要参数: action 和 sql'
            }, { status: 400 });
        }

        const db = new Database(dbPath);

        let result;

        switch (action) {
            case 'query':
                // 执行查询
                const queryStmt = db.prepare(sql);
                result = queryStmt.all(params);
                break;

            case 'queryOne':
                // 执行单行查询
                const queryOneStmt = db.prepare(sql);
                result = queryOneStmt.get(params);
                break;

            case 'execute':
                // 执行插入/更新/删除
                const executeStmt = db.prepare(sql);
                result = executeStmt.run(params);
                break;

            default:
                db.close();
                return NextResponse.json({
                    success: false,
                    message: '不支持的操作类型'
                }, { status: 400 });
        }

        db.close();

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
