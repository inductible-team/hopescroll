import { NextRequest, NextResponse } from 'next/server';
import { fetchRssFeeds } from '@/lib/rss-fetcher';

export const maxDuration = 60; // Allow maximum execution time on Vercel Hobby tier

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  // Secure the endpoint so only Cloud Scheduler can hit it
  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await fetchRssFeeds();
    return NextResponse.json({ success: true, message: 'RSS Feeds fetched and DB updated successfully' });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
