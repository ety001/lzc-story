import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Session管理API
export async function GET() {
  try {
    const cookieStore = cookies();
    const sessionToken = (await cookieStore).get('admin_session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({ authenticated: false });
    }
    
    // 这里可以添加更复杂的session验证逻辑
    // 比如检查session是否过期、是否有效等
    return NextResponse.json({ authenticated: true });
  } catch (error) {
    console.error('检查session失败:', error);
    return NextResponse.json({ authenticated: false });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    if (!password) {
      return NextResponse.json({ error: '密码不能为空' }, { status: 400 });
    }
    
    // 验证密码
    const response = await fetch(`${request.nextUrl.origin}/api/admin-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({ error: error.error }, { status: 401 });
    }
    
    // 密码验证成功，创建session
    const sessionToken = generateSessionToken();
    const response_obj = NextResponse.json({ success: true });
    
    // 设置session cookie
    response_obj.cookies.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24小时
      path: '/',
    });
    
    return response_obj;
  } catch (error) {
    console.error('创建session失败:', error);
    return NextResponse.json({ error: '创建session失败' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const response = NextResponse.json({ success: true });
    
    // 清除session cookie
    response.cookies.set('admin_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('清除session失败:', error);
    return NextResponse.json({ error: '清除session失败' }, { status: 500 });
  }
}

// 生成简单的session token
function generateSessionToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
