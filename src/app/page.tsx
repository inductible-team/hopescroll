import { Feed } from '../components/Feed';
import { getDailyStories, seedMockData } from '../lib/db';

export default async function Home() {
  // Ensure DB is seeded with mock data if empty (for development purposes)
  await seedMockData();

  // Fetch from MongoDB database
  const stories = await getDailyStories();

  return <Feed initialStories={stories} />;
}
