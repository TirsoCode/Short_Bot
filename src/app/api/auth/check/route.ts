import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const value = cookieStore.get('session')?.value;
  const expected = process.env.SESSION_SECRET || process.env.LOGIN_PASSWORD;
  return NextResponse.json({ authenticated: !!value && !!expected && value === expected });
}