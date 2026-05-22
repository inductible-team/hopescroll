import { NextRequest, NextResponse } from 'next/server';
import { curateFeeds } from '@/lib/db';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  // Secure the endpoint so only external cron can hit it
  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const disabledCount = await curateFeeds();
    return NextResponse.json({ success: true, message: `Curated feeds successfully. Disabled ${disabledCount} feeds.` });
  } catch (error: any) {
    console.error('Cron job error (curate-feeds):', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
