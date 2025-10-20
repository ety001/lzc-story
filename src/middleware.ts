import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
    // 只对 /test 路径进行检查
    if (request.nextUrl.pathname.startsWith('/test')) {
        // 检查是否来自 localhost
        const forwarded = request.headers.get('x-forwarded-for');
        const realIp = request.headers.get('x-real-ip');
        const clientIp = forwarded?.split(',')[0] || realIp || '127.0.0.1';

        if (clientIp !== '127.0.0.1' && clientIp !== '::1' && clientIp !== 'localhost') {
            return new NextResponse('Access denied. Only localhost access is allowed.', {
                status: 403,
                headers: {
                    'Content-Type': 'text/plain',
                },
            });
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/test/:path*',
};
