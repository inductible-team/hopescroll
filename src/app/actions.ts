'use server';

import { getDailyStories } from '../lib/db';
import { DBStory } from '../lib/db';

export async function fetchStoriesAction(page: number, category: string): Promise<DBStory[]> {
  const stories = await getDailyStories(page, 15, category);
  return stories;
}
