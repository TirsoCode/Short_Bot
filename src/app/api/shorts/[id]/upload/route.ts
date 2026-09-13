import { NextRequest, NextResponse } from 'next/server';
import { shortQueries } from '@/lib/db/queries';
import { YouTubeClient } from '@/lib/youtube';
import { youtubeTokenQueries } from '@/lib/db/queries';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const short = await shortQueries.findById(id);
    if (!short) {
      return NextResponse.json({ error: 'Short not found' }, { status: 404 });
    }

    if (!short.renderedPath) {
      return NextResponse.json({ error: 'Short not rendered yet' }, { status: 400 });
    }

    const tokens = await youtubeTokenQueries.find();
    if (!tokens) {
      return NextResponse.json({ error: 'YouTube not connected' }, { status: 400 });
    }

    await shortQueries.updateStatus(id, 'uploading');

    const youtube = await YouTubeClient.create(tokens);
    const url = await youtube.uploadShort(short, short.renderedPath);

    await shortQueries.updateStatus(id, 'published', {
      youtubeUrl: url,
      youtubeVideoId: url.split('v=')[1]?.split('&')[0],
    });

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error('Upload error:', error);
    const errMsg = error instanceof Error ? error.message : 'Upload failed';
    try {
      await shortQueries.updateStatus(
        (await params).id,
        'failed',
        { errorMessage: errMsg }
      );
    } catch {
      // ignore
    }
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}