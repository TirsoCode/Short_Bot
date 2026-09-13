import { NextResponse } from 'next/server';
import { syncAndGenerate } from '@/lib/auto-generate';

export async function GET() {
  try {
    const result = await syncAndGenerate();
    return NextResponse.json({
      success: result.errors.length === 0,
      synced: result.synced,
      generated: result.generated,
      errors: result.errors,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}