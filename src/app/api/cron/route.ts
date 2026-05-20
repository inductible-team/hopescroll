import { NextRequest, NextResponse } from 'next/server';
import { fetchAndEvaluateNews } from '@/lib/fetcher';

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
    await fetchAndEvaluateNews();
    return NextResponse.json({ success: true, message: 'News fetched successfully' });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
