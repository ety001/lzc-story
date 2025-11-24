import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/sqlite-database';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type {
  AdminPasswordConfig,
  SetPasswordRequest,
  VerifyPasswordRequest,
  PasswordStatusResponse,
  PasswordOperationResponse,
  ErrorResponse,
} from '@/types';

// ==================== 常量配置 ====================
const SESSION_CONFIG = {
  TOKEN_BYTES: 32,
  EXPIRY_HOURS: 24,
  COOKIE_MAX_AGE: 60 * 60 * 24, // 24 小时（秒）
} as const;

const PASSWORD_SET_COOKIE_CONFIG = {
  MAX_AGE: 60 * 60 * 24 * 365, // 1 年（秒）
} as const;

const BCRYPT_CONFIG = {
  SALT_ROUNDS: 10,
} as const;

const CACHE_HEADERS = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
} as const;

// ==================== 工具函数 ====================
/**
 * 生成安全的会话 token
 */
function generateSecureToken(): string {
  return crypto.randomBytes(SESSION_CONFIG.TOKEN_BYTES).toString('hex');
}

/**
 * 计算会话过期时间
 */
function getSessionExpiry(): string {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + SESSION_CONFIG.EXPIRY_HOURS);
  return expiry.toISOString();
}

/**
 * 创建统一的错误响应
 */
function createErrorResponse(
  error: string,
  status: number = 500,
  logContext?: string
): NextResponse<ErrorResponse> {
  if (logContext) {
    console.error(`${logContext}:`, error);
  }
  return NextResponse.json({ error }, { status });
}

/**
 * 创建成功响应
 */
function createSuccessResponse<T extends Record<string, unknown>>(
  data: T,
  status: number = 200
): NextResponse<T> {
  return NextResponse.json(data, { status });
}

/**
 * 设置会话 Cookie
 */
function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_CONFIG.COOKIE_MAX_AGE,
    path: '/',
  });
}

/**
 * 设置密码已设置标记 Cookie
 */
function setPasswordSetCookie(response: NextResponse): void {
  response.cookies.set('admin_password_set', 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: PASSWORD_SET_COOKIE_CONFIG.MAX_AGE,
    path: '/',
  });
}

/**
 * 清除会话 Cookie
 */
function clearSessionCookie(response: NextResponse): void {
  response.cookies.set('admin_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
}

/**
 * 检查密码是否已设置
 */
function hasPasswordSet(config: AdminPasswordConfig | null): boolean {
  return !!(
    config &&
    config.password_hash &&
    config.password_hash.trim() !== ''
  );
}

// ==================== API 路由处理 ====================

/**
 * 检查管理员密码是否已设置
 */
export async function GET(): Promise<NextResponse<PasswordStatusResponse | ErrorResponse>> {
  try {
    const config = db.getOne('admin_config', '1=1') as AdminPasswordConfig | null;
    const hasPassword = hasPasswordSet(config);

    const response = createSuccessResponse<PasswordStatusResponse>({
      hasPassword,
      message: hasPassword ? '密码已设置' : '密码未设置',
    });

    // 设置缓存控制头
    Object.entries(CACHE_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch {
    return createErrorResponse('检查密码状态失败', 500, '检查密码状态失败');
  }
}

/**
 * 设置管理员密码
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<PasswordOperationResponse | ErrorResponse>> {
  try {
    const body = (await request.json()) as SetPasswordRequest;
    const { password } = body;

    if (!password || typeof password !== 'string' || password.trim() === '') {
      return createErrorResponse('密码不能为空', 400);
    }

    // 检查是否已有密码
    const existingConfig = db.getOne('admin_config', '1=1') as AdminPasswordConfig | null;
    if (hasPasswordSet(existingConfig)) {
      return createErrorResponse('密码已设置，无法重复设置', 400);
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, BCRYPT_CONFIG.SALT_ROUNDS);

    // 保存到数据库
    if (existingConfig) {
      // 如果配置记录已存在但 password_hash 为空，则更新
      db.update('admin_config', existingConfig.id, { password_hash: passwordHash });
    } else {
      // 如果配置记录不存在，则创建新记录
      db.insert('admin_config', { password_hash: passwordHash });
    }

    // 设置密码已设置的 Cookie 标记
    const response = createSuccessResponse<PasswordOperationResponse>({
      message: '密码设置成功',
    });
    setPasswordSetCookie(response);

    return response;
  } catch {
    return createErrorResponse('设置密码失败', 500, '设置密码失败');
  }
}

/**
 * 验证管理员密码
 */
export async function PUT(
  request: NextRequest
): Promise<NextResponse<PasswordOperationResponse | ErrorResponse>> {
  try {
    const body = (await request.json()) as VerifyPasswordRequest;
    const { password } = body;

    if (!password || typeof password !== 'string' || password.trim() === '') {
      return createErrorResponse('密码不能为空', 400);
    }

    const config = db.getOne('admin_config', '1=1') as AdminPasswordConfig | null;
    if (!config || !hasPasswordSet(config)) {
      return createErrorResponse('密码未设置', 400);
    }

    const isValid = await bcrypt.compare(password, config.password_hash);

    if (!isValid) {
      return createErrorResponse('密码错误', 401);
    }

    // 验证通过，创建安全会话
    const sessionToken = generateSecureToken();
    const expiresAt = getSessionExpiry();

    // 清理过期会话
    db.cleanupExpiredSessions();

    // 在数据库中创建会话记录
    const sessionId = db.createSession(sessionToken, expiresAt);

    if (!sessionId) {
      return createErrorResponse('创建会话失败', 500);
    }

    // 设置会话 Cookie 和密码已设置标记
    const response = createSuccessResponse<PasswordOperationResponse>({
      message: '密码验证成功',
    });
    setSessionCookie(response, sessionToken);
    setPasswordSetCookie(response);

    return response;
  } catch {
    return createErrorResponse('验证密码失败', 500, '验证密码失败');
  }
}

/**
 * 退出登录，清除会话
 */
export async function DELETE(
  request: NextRequest
): Promise<NextResponse<PasswordOperationResponse | ErrorResponse>> {
  try {
    // 获取当前会话 token
    const sessionToken = request.cookies.get('admin_session')?.value;

    if (sessionToken) {
      // 从数据库中删除会话记录
      db.deleteSession(sessionToken);
    }

    // 清除会话 cookie
    const response = createSuccessResponse<PasswordOperationResponse>({
      message: '退出成功',
    });
    clearSessionCookie(response);

    return response;
  } catch {
    return createErrorResponse('退出失败', 500, '退出失败');
  }
}

/**
 * 验证会话有效性（用于 HEAD 请求）
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
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
