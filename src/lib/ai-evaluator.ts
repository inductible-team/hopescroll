import { getUnevaluatedStories, bulkUpdateStoryVerdicts, bulkRecordFeedSuccess, DBStory } from './db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { categories } from './categories';

const llmModel = 'gemini-3.1-flash-lite-preview';

interface BatchEvaluationResult {
  id: string;
  isPositive: boolean;
  category: typeof categories[keyof typeof categories] | string;
}

/**
 * Uses Google Gemini to evaluate a batch of stories.
 */
async function evaluatePositivityBatch(stories: DBStory[]): Promise<BatchEvaluationResult[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("No GEMINI_API_KEY found, using mock LLM evaluation.");
    return stories.map(s => ({ id: s.id, isPositive: Math.random() > 0.5, category: categories.GENERAL }));
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: llmModel });

    const categoriesStr = Object.values(categories).join(', ');
    const storiesJson = JSON.stringify(stories.map(s => ({ id: s.id, title: s.title, excerpt: s.excerpt })));

    const prompt = `
        You are the editorial classifier for “Hopescroll”, a news aggregator focused on constructive, hope-oriented journalism — the opposite of doomscrolling.

        Your task is to determine whether each news story in the provided JSON array belongs on Hopescroll.

        A story SHOULD be included if it substantially reflects one or more of the following:
        * Constructive journalism focused on credible solutions
        * Human cooperation or collective problem-solving
        * Scientific, medical, or technological progress
        * Institutional competence or effective governance
        * Environmental recovery or sustainability progress
        * Prosocial behavior, altruism, or community resilience
        * Human agency, empowerment, learning, or growth
        * Evidence that serious problems are being meaningfully addressed

        Core editorial heuristic:
        “Does this story increase the reader's sense that humans can successfully solve problems, improve society, or create a better future?”

        A story SHOULD NOT be included if it is primarily:
        * Standard negative or emotionally draining news
        * Political outrage, partisan conflict, or culture-war content
        * Disaster, war, crime, or tragedy reporting without meaningful constructive resolution
        * Fear-driven, cynical, or hopeless in tone
        * Celebrity gossip, clickbait, or trivial entertainment
        * Purely neutral informational reporting without constructive value
        * Corporate PR or marketing disguised as news
        * 'Feel-good' content lacking broader human significance

        Possible categories:
        ${categoriesStr}

        Instructions:
        1. Evaluate each story in the array.
        2. If the story does NOT belong on Hopescroll, set "isPositive" to false and "category" to "${categories.GENERAL}".
        3. If the story DOES belong, set "isPositive" to true and assign EXACTLY ONE category from the list above to "category".
        4. When uncertain, prefer setting "isPositive" to false.
        
        You must return a valid JSON array of objects. Each object must have exactly these keys: "id" (string, matching the input id), "isPositive" (boolean), and "category" (string).

        Stories to evaluate:
        ${storiesJson}
    `;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json"
        }
    });

    const responseText = result.response.text().trim();
    let evaluations: BatchEvaluationResult[] = [];
    try {
        evaluations = JSON.parse(responseText);
    } catch (e) {
        console.error("Failed to parse JSON response from Gemini:", responseText);
        throw e;
    }

    // Ensure we handle potentially hallucinated categories or missing fields gracefully
    return evaluations.map(ev => ({
        id: ev.id,
        isPositive: Boolean(ev.isPositive),
        category: Object.values(categories).includes(ev.category as any) ? ev.category : categories.GENERAL
    }));

  } catch (error) {
    console.error("Error evaluating positivity batch with Gemini:", error);
    // Return empty array so the cron can try again later
    return [];
  }
}

export async function evaluateBatchOfStories(batchSize = 10) {
  const stories = await getUnevaluatedStories(batchSize);

  if (!stories || stories.length === 0) {
    console.log("No unevaluated stories found in the DB. Nothing to do.");
    return;
  }

  console.log(`Evaluating batch of ${stories.length} stories...`);

  const results = await evaluatePositivityBatch(stories);

  if (results.length === 0) {
    console.log("No valid evaluations returned from AI. Skipping database updates.");
    return;
  }

  // Prepare database updates
  const dbUpdates = results.map(result => ({
    id: String(result.id), // Ensure string id
    verdict: result.isPositive ? 1 : 0,
    category: result.category as string
  }));

  // Update verdicts in bulk
  await bulkUpdateStoryVerdicts(dbUpdates);

  // Record feed successes
  const successfulUrls: string[] = [];
  results.forEach(result => {
      if (result.isPositive) {
          // Find the original story to get its feedUrl
          const originalStory = stories.find(s => String(s.id) === String(result.id));
          if (originalStory && originalStory.feedUrl) {
              successfulUrls.push(originalStory.feedUrl);
          }
      }
  });

  if (successfulUrls.length > 0) {
      await bulkRecordFeedSuccess(successfulUrls);
  }

  console.log(`Batch evaluation complete. Processed ${results.length} stories.`);
}
