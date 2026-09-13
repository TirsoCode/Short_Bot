import { NextResponse } from 'next/server';
import { generateOneManualShort } from '@/lib/auto-generate';

export async function POST() {
  try {
    const result = await generateOneManualShort();
    if (!result) {
      return NextResponse.json({ success: false, error: 'No hay medios disponibles para generar un short' }, { status: 400 });
    }
    return NextResponse.json({ success: true, generated: 1, short: result });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}