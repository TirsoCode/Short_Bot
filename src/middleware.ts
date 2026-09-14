import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/cron/')) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return NextResponse.next();
    if (request.headers.get('authorization') === `Bearer ${secret}`) return NextResponse.next();
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*', '/settings/:path*'],
};