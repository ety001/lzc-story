import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
    const { pathname, origin } = request.nextUrl;

    // 仅允许 localhost 访问 /test
    if (pathname.startsWith('/test')) {
        const forwarded = request.headers.get('x-forwarded-for');
        const realIp = request.headers.get('x-real-ip');
        const clientIp = forwarded?.split(',')[0] || realIp || '127.0.0.1';

        if (clientIp !== '127.0.0.1' && clientIp !== '::1' && clientIp !== 'localhost') {
            return new NextResponse('Access denied. Only localhost access is allowed.', {
                status: 403,
                headers: { 'Content-Type': 'text/plain' },
            });
        }
    }

    // 保护 /admin 路由，但放行密码设置/验证页面
    if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/password')) {
        // 检查会话 Cookie
        const sessionToken = request.cookies.get('admin_session')?.value;
        if (!sessionToken) {
            return NextResponse.redirect(new URL('/admin/password/verify', origin));
        }

        // 注意：Edge Runtime 中无法直接验证数据库会话
        // 会话验证将在 API 路由中进行
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/test/:path*', '/admin/:path*'],
};
