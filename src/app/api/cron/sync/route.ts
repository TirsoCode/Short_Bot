import { NextResponse } from 'next/server';
import { syncLocalMedia } from '@/lib/local-media';

export async function GET() {
  try {
    const result = await syncLocalMedia();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}