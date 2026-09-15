import { NextResponse } from 'next/server';
import { startScheduler } from '@/lib/scheduler';

// Endpoint protegido por CRON_SECRET (middleware /api/cron/*).
// Lo invoca start-server.sh justo después de levantar el servidor.
export async function POST() {
  startScheduler();
  return NextResponse.json({ success: true, message: 'Scheduler started' });
}

export async function GET() {
  return POST();
}