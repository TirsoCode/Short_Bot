import { NextResponse } from 'next/server';
import { generateWeeklyHooks, analyzePerformanceAndGenerate, getAnalyticsDashboard } from '@/lib/hook-generator';

export async function GET() {
  try {
    const analytics = await getAnalyticsDashboard();
    return NextResponse.json(analytics);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'generate-weekly') {
      const result = await generateWeeklyHooks();
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'analyze-and-generate') {
      const result = await analyzePerformanceAndGenerate();
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
