import { NextRequest, NextResponse } from 'next/server';
import { settingsQueries, hookQueries } from '@/lib/db/queries';

export async function GET() {
  const settings = await settingsQueries.find();
  if (settings) {
    settings.githubToken = '';
    settings.youtubeClientId = '';
    settings.youtubeClientSecret = '';
    settings.youtubeRefreshToken = '';
  }
  return NextResponse.json({ settings, hooks: await hookQueries.findAll() });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  await settingsQueries.update(body);
  return NextResponse.json({ success: true });
}