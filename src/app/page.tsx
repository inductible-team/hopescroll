import { Feed } from '../components/Feed';
import { getDailyStories, seedMockData, getDailyStats } from '../lib/db';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Ensure DB is seeded with mock data if empty (for development purposes)
  await seedMockData();

  // Fetch from MongoDB database
  const stories = await getDailyStories();
  const stats = await getDailyStats();

  return <Feed initialStories={stories} initialStats={stats} />;
}
