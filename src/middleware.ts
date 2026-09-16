import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Cron endpoints: protegidos con CRON_SECRET (Bearer token) si está definido
  if (request.nextUrl.pathname.startsWith('/api/cron/')) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) return NextResponse.next();
    if (request.headers.get('authorization') === `Bearer ${cronSecret}`) return NextResponse.next();
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};