import { getUnevaluatedStory, updateStoryVerdict, recordFeedSuccess } from './db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { categories } from './categories';

const llmModel = 'gemini-3.1-flash-lite-preview'; //'gemini-3.5-flash';

// 1) run /api/cron/curate-feeds once daily (purges 'useless' rss feeds)
// 2) run /api/cron/rss once daily (pulls many articles from RSS feeds into DB) - takes a while, ignore 'time out'
// 3) run /api/cron/ai for 8 hrs daily, once per minute (=480 invocations, < 500 daily limit) - populates audited stories in the DB

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
        You are the editorial classifier for “Hopescroll”, a news aggregator focused on constructive, hope-oriented journalism — the opposite of doomscrolling.

        Your task is to determine whether a news story belongs on Hopescroll.

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

        Important distinctions:

        * The story must contain meaningful progress, agency, cooperation, or solutions — not merely positivity.
        * Incremental but real progress is acceptable.
        * Stories about difficult problems ARE acceptable if the emphasis is on credible solutions, recovery, innovation, or effective action.
        * Scientific or social breakthroughs should generally be included if they are substantive and credible.

        News Item:
        Title: “${title}”

        Excerpt:
        “${excerpt}”

        Possible categories:
        ${categoriesStr}

        Instructions:

        * If the story does NOT belong on Hopescroll, reply with exactly: NO
        * If the story DOES belong, reply with EXACTLY ONE category that fits the story, from the category list.
        * When uncertain, prefer NO
        * Do not explain your reasoning.
        * Do not output punctuation.
        * Do not output additional words.
        * Output must contain only a single token/string.
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

  if (isPositive && story.feedUrl) {
    await recordFeedSuccess(story.feedUrl);
  }

  console.log(`Story evaluation complete. Verdict: ${verdict} | Category: ${category}`);
}
