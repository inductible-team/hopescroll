import Parser from 'rss-parser';
import { insertStory, clearSeedData, DBStory } from './db';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';

const parser = new Parser();

// Base RSS feeds for neutral baseline news
const RSS_FEEDS = [
  'https://feeds.npr.org/1004/rss.xml', // NPR World News
  'http://feeds.bbci.co.uk/news/world/rss.xml', // BBC World
];

const llmModel = 'gemini-2.5-flash';
const disarmAI = true;

import { categories } from './categories';

/**
 * Uses Google Gemini to evaluate if a story is uplifting, 
 * empowering, and stimulates mental growth, without being patronising.
 * It also categorizes the story.
 */
async function evaluatePositivity(title: string, excerpt: string): Promise<{ isPositive: boolean, category: typeof categories[keyof typeof categories] }> {

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || disarmAI) {
    console.warn("No GEMINI_API_KEY found or AI disarmed :: using mock LLM evaluation.");
    return { isPositive: false, category: categories.GENERAL };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use the latest, highly efficient flash model
    const model = genAI.getGenerativeModel({ model: llmModel });

    const categoriesStr = Object.values(categories).join(', ');

    const prompt = `
You are a highly discerning editor for "Hopescroll", a news aggregator dedicated to the opposite of doomscrolling. 
Your job is to read a news headline and excerpt, and determine if it belongs on the site.

Criteria for inclusion:
- It MUST be positive in tone.
- It should represent humanity progressively solving problems, getting steadily better, or empowering the individual.
- The tone should be uplifting but NEVER patronising.
- Items that stimulate mental growth, showcase scientific breakthroughs, or highlight genuine human progress are highly encouraged.
- It MUST NOT be standard neutral/depressing news, political bickering, disaster reporting, or trivial celebrity gossip.

News Item:
Title: "${title}"
Excerpt: "${excerpt}"

Does this story meet all criteria for inclusion on Hopescroll? 
If NO, reply with exactly one word: NO
If YES, categorize it into exactly one of the following: ${categoriesStr}. Reply with ONLY the category word.
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim().toUpperCase();

    if (responseText === 'NO' || responseText.includes('NO')) {
      return { isPositive: false, category: categories.GENERAL };
    }

    return { isPositive: true, category: categories[responseText as keyof typeof categories] || categories.GENERAL };

  } catch (error) {
    console.error("Error evaluating positivity with Gemini:", error);
    // If the API fails (rate limits, etc.), default to false so we don't accidentally let bad news in
    return { isPositive: false, category: categories.GENERAL };
  }
}

export async function fetchAndEvaluateNews() {
  // Clear any mock data so it doesn't mix with real fetched data
  await clearSeedData();

  let newStoriesCount = 0;

  for (const feedUrl of RSS_FEEDS) {
    try {
      console.log(`Fetching RSS feed: ${feedUrl}`);
      const feed = await parser.parseURL(feedUrl);

      // Only process the top 15 newest items per feed to avoid Vercel 60s timeouts
      const recentItems = feed.items.slice(0, 15);

      for (const item of recentItems) {
        if (!item.title || !item.link) continue;

        if (newStoriesCount >= 15) {
          console.log("Reached 15 new positive stories! Stopping early to save execution time.");
          return;
        }

        const title = item.title;
        const excerpt = item.contentSnippet || item.content || "No description available.";

        // Use Gemini to evaluate tone and category
        const { isPositive, category } = await evaluatePositivity(title, excerpt);

        if (isPositive || disarmAI) {
          const story: Omit<DBStory, 'is_positive'> = {
            id: crypto.createHash('md5').update(item.link).digest('hex'),
            title: title,
            // Clean up excerpt and truncate if necessary
            excerpt: excerpt.replace(/<[^>]*>?/gm, '').substring(0, 200).trim() + '...',
            category: category,
            source: feed.title || 'News Source',
            url: item.link,
            is_seed: disarmAI, // if AI is disarmed, allow subsequent runs to replace with real data by marking these as seed
            date: item.isoDate || new Date().toISOString()
          };

          await insertStory(story);
          newStoriesCount++;
        }      
      }
    } catch (error) {
      console.error(`Error fetching RSS feed ${feedUrl}:`, error);
    }
  }

  console.log(`Finished fetching. Added/Updated ${newStoriesCount} positive stories.`);
}
