import Parser from 'rss-parser';
import { insertStory, clearSeedData, DBStory } from './db';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';

const parser = new Parser();

// Base RSS feeds for neutral baseline news
const RSS_FEEDS = [
  'https://www.reutersagency.com/feed/?best-topics=world-news&post_type=best', // Reuters Agency Top News
  'http://feeds.bbci.co.uk/news/world/rss.xml', // BBC World
];

import { categories } from './categories';

/**
 * Uses Google Gemini to evaluate if a story is uplifting, 
 * empowering, and stimulates mental growth, without being patronising.
 * It also categorizes the story.
 */
async function evaluatePositivity(title: string, excerpt: string): Promise<{ isPositive: boolean, category: typeof categories[keyof typeof categories] }> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn("No GEMINI_API_KEY found, using mock LLM evaluation.");
    return { isPositive: Math.random() > 0.5, category: categories.GENERAL }; 
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use the fast and efficient flash model for high-volume text tasks
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });    

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
      
      for (const item of feed.items) {
        if (!item.title || !item.link) continue;

        const title = item.title;
        const excerpt = item.contentSnippet || item.content || "No description available.";
        
        // Use Gemini to evaluate tone and category
        const { isPositive, category } = await evaluatePositivity(title, excerpt);

        if (isPositive) {
          const story: Omit<DBStory, 'is_positive'> = {
            id: crypto.createHash('md5').update(item.link).digest('hex'),
            title: title,
            // Clean up excerpt and truncate if necessary
            excerpt: excerpt.replace(/<[^>]*>?/gm, '').substring(0, 200).trim() + '...', 
            category: category,
            source: feed.title || 'News Source',
            url: item.link,
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
