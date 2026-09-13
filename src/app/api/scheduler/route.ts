import { NextResponse } from 'next/server';
import { startScheduler, stopScheduler } from '@/lib/scheduler';

let schedulerStarted = false;

export async function GET() {
  return NextResponse.json({
    running: schedulerStarted,
    message: schedulerStarted ? 'Scheduler is running' : 'Scheduler is stopped',
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'start') {
      if (!schedulerStarted) {
        startScheduler();
        schedulerStarted = true;
      }
      return NextResponse.json({ success: true, message: 'Scheduler started' });
    }

    if (action === 'stop') {
      stopScheduler();
      schedulerStarted = false;
      return NextResponse.json({ success: true, message: 'Scheduler stopped' });
    }

    return NextResponse.json({ error: 'Invalid action. Use "start" or "stop"' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
