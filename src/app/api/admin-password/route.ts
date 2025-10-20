import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/sqlite-database';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

interface AdminConfig {
  id: number;
  password_hash: string;
  created_at: string;
  updated_at?: string;
}

// 生成安全的会话 token
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// 计算会话过期时间
function getSessionExpiry(): string {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24); // 24小时后过期
  return expiry.toISOString();
}

// 检查管理员密码是否已设置
export async function GET() {
  try {
    const config = db.getOne('admin_config', '1=1') as AdminConfig | null;
    return NextResponse.json({
      hasPassword: !!config && config.password_hash && config.password_hash.trim() !== '',
      password_hash: config?.password_hash || '',
      message: config && config.password_hash && config.password_hash.trim() !== '' ? '密码已设置' : '密码未设置'
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('检查密码状态失败:', error);
    return NextResponse.json({ error: '检查密码状态失败' }, { status: 500 });
  }
}

// 设置管理员密码
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: '密码不能为空' }, { status: 400 });
    }

    // 检查是否已有密码（只有在密码不为空时才阻止重复设置）
    const existingConfig = db.getOne('admin_config', '1=1') as AdminConfig | null;
    if (existingConfig && existingConfig.password_hash && existingConfig.password_hash.trim() !== '') {
      return NextResponse.json({ error: '密码已设置，无法重复设置' }, { status: 400 });
    }

    // 加密密码
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 保存到数据库
    if (existingConfig) {
      // 如果配置记录已存在但password_hash为空，则更新
      db.update('admin_config', existingConfig.id, { password_hash: passwordHash });
    } else {
      // 如果配置记录不存在，则创建新记录
      db.insert('admin_config', { password_hash: passwordHash });
    }

    return NextResponse.json({ message: '密码设置成功' });
  } catch (error) {
    console.error('设置密码失败:', error);
    return NextResponse.json({ error: '设置密码失败' }, { status: 500 });
  }
}

// 验证管理员密码
export async function PUT(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: '密码不能为空' }, { status: 400 });
    }

    const config = db.getOne('admin_config', '1=1') as AdminConfig | null;
    if (!config) {
      return NextResponse.json({ error: '密码未设置' }, { status: 400 });
    }

    const isValid = await bcrypt.compare(password, config.password_hash);

    if (isValid) {
      // 验证通过，创建安全会话
      const sessionToken = generateSecureToken();
      const expiresAt = getSessionExpiry();

      // 清理过期会话
      db.cleanupExpiredSessions();

      // 在数据库中创建会话记录
      const sessionId = db.createSession(sessionToken, expiresAt);

      if (!sessionId) {
        return NextResponse.json({ error: '创建会话失败' }, { status: 500 });
      }

      // 设置会话 Cookie
      const response = NextResponse.json({ message: '密码验证成功' });
      response.cookies.set('admin_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 24 小时
        path: '/',
      });
      return response;
    } else {
      return NextResponse.json({ error: '密码错误' }, { status: 401 });
    }
  } catch (error) {
    console.error('验证密码失败:', error);
    return NextResponse.json({ error: '验证密码失败' }, { status: 500 });
  }
}

// 退出登录，清除会话
export async function DELETE(request: NextRequest) {
  try {
    // 获取当前会话 token
    const sessionToken = request.cookies.get('admin_session')?.value;

    if (sessionToken) {
      // 从数据库中删除会话记录
      db.deleteSession(sessionToken);
    }

    const response = NextResponse.json({ message: '退出成功' });

    // 清除会话 cookie
    response.cookies.set('admin_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('退出失败:', error);
    return NextResponse.json({ error: '退出失败' }, { status: 500 });
  }
}

// 验证会话有效性（用于 HEAD 请求）
export async function HEAD(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('admin_session')?.value;

    if (!sessionToken) {
      return new NextResponse(null, { status: 401 });
    }

    // 验证会话是否有效
    if (!db.validateSession(sessionToken)) {
      return new NextResponse(null, { status: 401 });
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('验证会话失败:', error);
    return new NextResponse(null, { status: 500 });
  }
}
