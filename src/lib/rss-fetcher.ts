import Parser from 'rss-parser';
import { insertPotentialStories, clearSeedData, purgeOldAndNegativeStories, DBStory } from './db';
import crypto from 'crypto';
import { categories } from './categories';

const parser = new Parser();

// Base RSS feeds for neutral baseline news
const RSS_FEEDS = [
  'https://feeds.npr.org/1004/rss.xml', // NPR World News
  'http://feeds.bbci.co.uk/news/world/rss.xml', // BBC World
];

export async function fetchRssFeeds() {
  // Clear any mock data so it doesn't mix with real fetched data
  await clearSeedData();
  
  let newStoriesCount = 0;

  for (const feedUrl of RSS_FEEDS) {
    try {
      console.log(`Fetching RSS feed: ${feedUrl}`);
      const feed = await parser.parseURL(feedUrl);
      
      const potentialStories: Omit<DBStory, 'clearedEditorialCheck' | 'verdict'>[] = [];

      for (const item of feed.items) {
        if (!item.title || !item.link) continue;

        const excerpt = item.contentSnippet || item.content || "No description available.";
        
        potentialStories.push({
          id: crypto.createHash('md5').update(item.link).digest('hex'),
          title: item.title,
          excerpt: excerpt.replace(/<[^>]*>?/gm, '').substring(0, 200).trim() + '...', 
          category: categories.GENERAL, // temporary fallback
          source: feed.title || 'News Source',
          url: item.link,
          date: item.isoDate || new Date().toISOString()
        });
      }

      await insertPotentialStories(potentialStories);
      newStoriesCount += potentialStories.length;
      
    } catch (error) {
      console.error(`Error fetching RSS feed ${feedUrl}:`, error);
    }
  }

  // Purge any articles older than 48hrs and any audited negative articles
  await purgeOldAndNegativeStories();

  console.log(`Finished RSS Fetching. Inserted ${newStoriesCount} potential stories for AI auditing. Older stories purged.`);
}
