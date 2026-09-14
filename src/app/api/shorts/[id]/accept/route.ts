import { NextRequest, NextResponse } from 'next/server';
import { shortQueries, settingsQueries } from '@/lib/db/queries';
import { renderQueue } from '@/lib/render-queue';
import { publishShortToBuffer } from '@/lib/buffer';

async function publishToBuffer(id: string) {
  try {
    const short = await shortQueries.findById(id);
    if (!short || !short.rendered_path) return;
    await shortQueries.updateStatus(id, 'uploading');
    const result = await publishShortToBuffer(id);
    await shortQueries.updateStatus(id, 'published', {
      youtubeUrl: `https://buffer.com`,
      youtubeVideoId: result.post?.id,
    });
  } catch (error: any) {
    await shortQueries.updateStatus(id, 'failed', { errorMessage: error.message });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const short = await shortQueries.findById(id);
  if (!short) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (short.status === 'draft' || (short.status === 'failed' && !short.rendered_path)) {
    await shortQueries.updateStatus(id, 'rendering');
    renderQueue.add(id).catch((e: any) => shortQueries.updateStatus(id, 'failed', { errorMessage: e.message }));
    return NextResponse.json({ success: true, status: 'rendering' });
  }

  if (short.status === 'rendered' || short.status === 'rejected' || short.status === 'failed') {
    await shortQueries.updateStatus(id, 'accepted');
    const settings = await settingsQueries.find();
    if (settings?.autoPublish) {
      void publishToBuffer(id);
    }
    return NextResponse.json({ success: true, status: 'accepted' });
  }

  if (short.status === 'accepted' || short.status === 'uploading') {
    return NextResponse.json({ success: true, status: short.status });
  }

  return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
}