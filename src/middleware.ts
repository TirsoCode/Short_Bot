import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_API = ['/api/login', '/api/auth/check'];

function sessionSecret(): string | null {
  return process.env.SESSION_SECRET || process.env.LOGIN_PASSWORD || null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cron endpoints: protegidos con CRON_SECRET (Bearer token)
  if (pathname.startsWith('/api/cron/')) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) return NextResponse.next();
    if (request.headers.get('authorization') === `Bearer ${cronSecret}`) return NextResponse.next();
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rutas de autenticación públicas
  const isApi = pathname.startsWith('/api/');
  if (isApi && PUBLIC_API.some(p => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  // Proteger dashboard, settings y el resto de la API con la cookie de sesión
  const secret = sessionSecret();
  const cookie = request.cookies.get('session')?.value;
  if (secret && cookie && cookie === secret) {
    return NextResponse.next();
  }

  if (isApi) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*', '/settings/:path*'],
};