import { NextRequest, NextResponse } from 'next/server';
import { shortQueries, settingsQueries } from '@/lib/db/queries';
import { publishShortToBuffer } from '@/lib/buffer';

export async function POST(request: NextRequest) {
  let shortId = '';
  try {
    const body = await request.json();
    shortId = body.shortId || '';

    if (!shortId) {
      return NextResponse.json({ error: 'Short ID required' }, { status: 400 });
    }

    const short = await shortQueries.findById(shortId);
    if (!short) {
      return NextResponse.json({ error: 'Short not found' }, { status: 404 });
    }

    if (!short.rendered_path) {
      return NextResponse.json({ error: 'Short not rendered yet' }, { status: 400 });
    }

    await shortQueries.updateStatus(shortId, 'uploading');

    const result = await publishShortToBuffer(shortId, {
      videoUrl: body.videoUrl,
      scheduledAt: body.scheduledAt,
    });

    await shortQueries.updateStatus(shortId, 'published', {
      youtubeUrl: `https://buffer.com`,
      youtubeVideoId: result.post?.id,
    });

    return NextResponse.json({
      success: true,
      postId: result.post?.id,
      dueAt: result.post?.dueAt,
    });
  } catch (error) {
    console.error('Buffer publish error:', error);
    if (shortId) {
      await shortQueries.updateStatus(shortId, 'failed', {
        errorMessage: error instanceof Error ? error.message : 'Buffer publish failed',
      });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Buffer publish failed' }, { status: 500 });
  }
}