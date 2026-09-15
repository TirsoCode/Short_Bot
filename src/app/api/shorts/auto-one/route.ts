import { NextResponse } from 'next/server';
import { generateOneManualShort } from '@/lib/auto-shorts';

export async function POST() {
  try {
    const result = await generateOneManualShort();
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, hookText: result.hookText, shortId: result.shortId });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}