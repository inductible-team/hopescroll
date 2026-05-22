import { getUnevaluatedStory, updateStoryVerdict } from './db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { categories } from './categories';

const llmModel = 'gemini-3.5-flash'; 

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

export async function evaluateSingleStory() {
  const story = await getUnevaluatedStory();
  
  if (!story) {
    console.log("No unevaluated stories found in the DB. Nothing to do.");
    return;
  }

  console.log(`Evaluating story: "${story.title}"`);
  
  // Use Gemini to evaluate tone and category
  const { isPositive, category } = await evaluatePositivity(story.title, story.excerpt);

  const verdict = isPositive ? 1 : 0;
  
  // Update the database with the verdict and category
  await updateStoryVerdict(story.id, verdict, category);
  
  console.log(`Story evaluation complete. Verdict: ${verdict} | Category: ${category}`);
}
