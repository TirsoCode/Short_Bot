import { NextResponse } from 'next/server';
import { syncAndGenerate } from '@/lib/auto-generate';

export async function POST() {
  try {
    const result = await syncAndGenerate();
    return NextResponse.json({
      success: result.errors.length === 0,
      synced: result.synced,
      generated: result.generated,
      errors: result.errors,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await syncAndGenerate();
    return NextResponse.json({
      success: result.errors.length === 0,
      synced: result.synced,
      generated: result.generated,
      errors: result.errors,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
