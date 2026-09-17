import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/sqlite-database';

const LOOP_KEY = 'single_loop';

const noCacheHeaders = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

function readLoopSetting(): boolean {
  return db.getSetting(LOOP_KEY) === '1';
}

/** 获取播放器设置（单曲循环等） */
export async function GET() {
  try {
    return NextResponse.json(
      { loop: readLoopSetting() },
      { headers: noCacheHeaders }
    );
  } catch (error) {
    console.error('获取播放器设置失败:', error);
    return NextResponse.json({ error: '获取播放器设置失败' }, { status: 500 });
  }
}

/** 更新播放器设置 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (typeof body.loop !== 'boolean') {
      return NextResponse.json({ error: 'loop 必须为布尔值' }, { status: 400 });
    }

    db.setSetting(LOOP_KEY, body.loop ? '1' : '0');

    return NextResponse.json(
      { loop: body.loop },
      { headers: noCacheHeaders }
    );
  } catch (error) {
    console.error('更新播放器设置失败:', error);
    return NextResponse.json({ error: '更新播放器设置失败' }, { status: 500 });
  }
}
