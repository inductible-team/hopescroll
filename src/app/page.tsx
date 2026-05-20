import { Feed } from '../components/Feed';
import { getDailyStories, seedMockData } from '../lib/db';

export default async function Home() {
  // Ensure DB is seeded with mock data if empty (for development purposes)
  seedMockData();

  // Fetch from SQLite database
  const stories = getDailyStories();

  return <Feed initialStories={stories} />;
}
