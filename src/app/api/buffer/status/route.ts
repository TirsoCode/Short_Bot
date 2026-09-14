import { NextRequest, NextResponse } from 'next/server';
import { settingsQueries } from '@/lib/db/queries';
import { BufferClient, getBufferApiKey, getBufferVideoBaseUrl } from '@/lib/buffer';

export async function GET(request: NextRequest) {
  try {
    const settings = await settingsQueries.find();
    const apiKey = request.nextUrl.searchParams.get('apiKey') || getBufferApiKey(settings);
    if (!apiKey) {
      return NextResponse.json({ configured: false, organizations: [], channels: [] });
    }

    const client = new BufferClient(apiKey);
    const orgs = await client.getOrganizations();
    const orgsAndChannels: any[] = [];

    for (const org of orgs) {
      try {
        const channels = await client.getChannels(org.id);
        orgsAndChannels.push({ ...org, channels });
      } catch {
        orgsAndChannels.push({ ...org, channels: [] });
      }
    }

    const allChannels = orgsAndChannels.flatMap((o: any) => o.channels);

    return NextResponse.json({
      configured: true,
      apiKey,
      selectedChannelId: settings?.buffer_channel_id || '',
      videoBaseUrl: getBufferVideoBaseUrl(settings),
      organizations: orgsAndChannels,
      channels: allChannels,
    });
  } catch (error: any) {
    return NextResponse.json({ configured: false, error: error.message }, { status: 200 });
  }
}