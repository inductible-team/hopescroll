import { NextRequest, NextResponse } from 'next/server';
import { evaluateSingleStory } from '@/lib/ai-evaluator';

export const maxDuration = 60; // Allow maximum execution time on Vercel Hobby tier

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
    await evaluateSingleStory();
    return NextResponse.json({ success: true, message: 'AI evaluated one story successfully' });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
