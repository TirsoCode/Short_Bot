import { NextRequest, NextResponse } from 'next/server';
import { shortQueries } from '@/lib/db/queries';
import { publishShortToBuffer } from '@/lib/buffer';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const short = await shortQueries.findById(id);
    if (!short) {
      return NextResponse.json({ error: 'Short not found' }, { status: 404 });
    }

    if (!short.rendered_path) {
      return NextResponse.json({ error: 'Short not rendered yet' }, { status: 400 });
    }

    await shortQueries.updateStatus(id, 'uploading');

    const result = await publishShortToBuffer(id, {
      videoUrl: body.videoUrl,
      scheduledAt: body.scheduledAt,
    });

    await shortQueries.updateStatus(id, 'published', {
      youtubeUrl: `https://buffer.com`,
      youtubeVideoId: result.post?.id,
    });

    return NextResponse.json({ success: true, postId: result.post?.id });
  } catch (error) {
    console.error('Buffer publish error:', error);
    const errMsg = error instanceof Error ? error.message : 'Buffer publish failed';
    try {
      const { id } = await params;
      await shortQueries.updateStatus(id, 'failed', { errorMessage: errMsg });
    } catch {
      // ignore
    }
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}