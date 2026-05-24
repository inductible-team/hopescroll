import Parser from 'rss-parser';
import { insertPotentialStories, clearSeedData, purgeOldAndNegativeStories, DBStory, getActiveFeeds, seedFeeds, bulkIncrementFeedFetches } from './db';
import crypto from 'crypto';
import { categories } from './categories';

const parser = new Parser();

// Base RSS feeds for neutral baseline news
const RSS_FEEDS = [
  'https://feeds.npr.org/1004/rss.xml', // NPR World News
  'http://feeds.bbci.co.uk/news/world/rss.xml', // BBC World
  'https://ourworldindata.org/atom.xml', // Our World in Data (data-driven progress stories)
  'https://feeds.npr.org/1007/rss.xml', // NPR Science
  'http://rss.sciam.com/basic-science', // Scientific American
  'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml', // The New York Times Science
  'https://www.csmonitor.com/feeds/all', // Christian Science Monitor (more solutions-oriented)
  'https://reasonstobecheerful.world/feed/', // Reasons to be Cheerful (positive news site)
  'https://www.optimistdaily.com/feed/', // The Optimist Daily (positive news)
];

export async function fetchRssFeeds() {
  // Clear any mock data so it doesn't mix with real fetched data
  await clearSeedData();
  
  // Ensure we have our baseline feeds seeded
  await seedFeeds(RSS_FEEDS);

  const activeFeeds = await getActiveFeeds();
  let newStoriesCount = 0;

  const allPotentialStories: Omit<DBStory, 'clearedEditorialCheck' | 'verdict'>[] = [];
  const feedFetchCounts: Record<string, number> = {};

  for (const feed of activeFeeds) {
    const feedUrl = feed.url;
    try {
      console.log(`Fetching RSS feed: ${feedUrl}`);
      const parsedFeed = await parser.parseURL(feedUrl);
      
      let feedStoriesCount = 0;

      for (const item of parsedFeed.items) {
        if (!item.title || !item.link) continue;

        const excerpt = item.contentSnippet || item.content || "No description available.";
        
        allPotentialStories.push({
          id: crypto.createHash('md5').update(item.link).digest('hex'),
          title: item.title,
          excerpt: excerpt.replace(/<[^>]*>?/gm, '').substring(0, 200).trim() + '...', 
          category: categories.GENERAL, // temporary fallback
          source: parsedFeed.title || 'News Source',
          url: item.link,
          date: item.isoDate || new Date().toISOString(),
          feedUrl: feedUrl
        });
        feedStoriesCount++;
      }

      if (feedStoriesCount > 0) {
        feedFetchCounts[feedUrl] = (feedFetchCounts[feedUrl] || 0) + feedStoriesCount;
      }
      
    } catch (error) {
      console.error(`Error fetching RSS feed ${feedUrl}:`, error);
    }
  }

  if (allPotentialStories.length > 0) {
    await insertPotentialStories(allPotentialStories);
    await bulkIncrementFeedFetches(feedFetchCounts);
    newStoriesCount = allPotentialStories.length;
  }

  // Purge any articles older than 48hrs and any audited negative articles
  await purgeOldAndNegativeStories();

  console.log(`Finished RSS Fetching. Inserted ${newStoriesCount} potential stories for AI auditing. Older stories purged.`);
}
