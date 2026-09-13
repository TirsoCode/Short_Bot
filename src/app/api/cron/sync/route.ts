import { NextResponse } from 'next/server';
import { syncLocalMedia } from '@/lib/local-media';
import { maybeRefillHooks, maybeRunAutoShorts } from '@/lib/auto-shorts';

export async function GET() {
  try {
    const sync = await syncLocalMedia();
    const refilled = await maybeRefillHooks();
    const autoShorts = await maybeRunAutoShorts();
    return NextResponse.json({ ...sync, refilledHooks: refilled, autoShortsGenerated: autoShorts });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}