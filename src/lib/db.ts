import { MongoClient, ServerApiVersion } from 'mongodb';
import { categories } from './categories';

const uri = process.env.MONGODB_URI || '';

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (uri) {
  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
      });
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    clientPromise = client.connect();
  }
}

async function getCollection() {
  if (!clientPromise) {
    throw new Error('MONGODB_URI is missing in .env.local');
  }
  const dbClient = await clientPromise;
  const db = dbClient.db('hopescroll');
  return db.collection<DBStory>('stories');
}

export interface DBStory {
  id: string; // The URL hash or original ID
  title: string;
  excerpt: string;
  category: typeof categories[keyof typeof categories];
  source: string;
  url: string;
  date: string;
  clearedEditorialCheck: boolean;
  verdict: number; // 1 for positive, 0 for negative, -1 for undecided
  is_seed?: boolean;
}

export async function getDailyStories(): Promise<DBStory[]> {
  if (!process.env.MONGODB_URI) {
    console.warn("MONGODB_URI missing. Returning empty feed.");
    return [];
  }
  const collection = await getCollection();
  const stories = await collection
    .find({ clearedEditorialCheck: true, verdict: 1 })
    .sort({ date: -1 })
    .limit(15)
    .toArray();
    
  // Transform the MongoDB _id object back to a plain object string representation if needed,
  // but we can just map and return the plain data to avoid React Server Component serialization issues.
  return stories.map(story => ({
    id: story.id,
    title: story.title,
    excerpt: story.excerpt,
    category: story.category,
    source: story.source,
    url: story.url,
    date: story.date,
    clearedEditorialCheck: story.clearedEditorialCheck,
    verdict: story.verdict,
    is_seed: story.is_seed
  }));
}

export async function insertPotentialStories(stories: Omit<DBStory, 'clearedEditorialCheck' | 'verdict'>[]) {
  const collection = await getCollection();
  
  if (stories.length === 0) return;

  const operations = stories.map(story => ({
    updateOne: {
      filter: { id: story.id },
      update: { 
        $setOnInsert: { 
          ...story, 
          clearedEditorialCheck: false, 
          verdict: -1 
        } 
      },
      upsert: true
    }
  }));

  await collection.bulkWrite(operations);
}

export async function getUnevaluatedStory(): Promise<DBStory | null> {
  const collection = await getCollection();
  const story = await collection.findOne({ clearedEditorialCheck: false, verdict: -1 });
  return story as DBStory | null;
}

export async function updateStoryVerdict(id: string, verdict: number, category: DBStory['category']) {
  const collection = await getCollection();
  await collection.updateOne(
    { id: id },
    { $set: { clearedEditorialCheck: true, verdict: verdict, category: category } }
  );
}

export async function purgeOldAndNegativeStories() {
  const collection = await getCollection();
  
  // 48 hours ago
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  await collection.deleteMany({
    $or: [
      { date: { $lt: fortyEightHoursAgo } },
      { clearedEditorialCheck: true, verdict: 0 }
    ]
  });
}

export async function clearSeedData() {
  const collection = await getCollection();
  await collection.deleteMany({ is_seed: true });
}

// Seed function for development
export async function seedMockData() {
  if (!process.env.MONGODB_URI) return;

  const collection = await getCollection();
  const count = await collection.countDocuments();
  if (count > 0) return;

  console.log("Seeding MongoDB with initial mock data...");

  const mockStories = [
    {
      id: '1',
      title: 'New Solar Panel Technology Achieves Record Efficiency, Dropping Costs Further',
      excerpt: 'Researchers have developed a new perovskite solar cell that pushes energy conversion rates beyond 30%, making clean energy more accessible and affordable than ever.',
      category: categories.TECH,
      source: 'TechCrunch',
      url: '#',
      date: '2026-05-20T08:00:00Z',
      is_seed: true
    },
    {
      id: '2',
      title: 'Global Poverty Rates Hit All-Time Low Following Multilateral Agreements',
      excerpt: 'A comprehensive UN report shows that targeted micro-loans and education programs have lifted an additional 50 million people out of extreme poverty in the last year.',
      category: categories.POLITICS,
      source: 'Reuters',
      url: '#',
      date: '2026-05-19T14:30:00Z',
      is_seed: true
    },
    {
      id: '3',
      title: 'Breakthrough in Alzheimer’s Research Reverses Cognitive Decline in Early Trials',
      excerpt: 'Scientists report unprecedented success with a new neural-pathway restoring drug, giving hope to millions of families affected by the disease.',
      category: categories.SCIENCE,
      source: 'Science Daily',
      url: '#',
      date: '2026-05-20T10:15:00Z',
      is_seed: true
    },
    {
      id: '4',
      title: 'Community-Driven Movie Rescues Local Theater and Wins Independent Spirit Award',
      excerpt: 'A film produced entirely by volunteers not only saved their historic local cinema from bankruptcy but also garnered national acclaim.',
      category: categories.ENTERTAINMENT,
      source: 'Variety',
      url: '#',
      date: '2026-05-18T18:45:00Z',
      is_seed: true
    },
    {
      id: '5',
      title: 'Ocean Cleanup Project Successfully Removes 90% of Surface Plastics in the Great Pacific Garbage Patch',
      excerpt: 'Using autonomous drones and advanced netting, the largest cleanup operation in history has achieved a monumental milestone for marine life.',
      category: categories.TECH,
      source: 'Wired',
      url: '#',
      date: '2026-05-20T09:00:00Z',
      is_seed: true
    },
    {
      id: '6',
      title: 'Bipartisan Legislation Passes to Subsidize Mental Health Care for All Students',
      excerpt: 'In a rare unanimous vote, lawmakers have prioritized the well-being of the next generation with full funding for school counselors and therapists.',
      category: categories.POLITICS,
      source: 'The Guardian',
      url: '#',
      date: '2026-05-19T20:00:00Z',
      is_seed: true
    }
  ] as Omit<DBStory, 'clearedEditorialCheck' | 'verdict'>[];

  await insertPotentialStories(mockStories);
  
  // Set the seeds to verified so they show up
  await collection.updateMany(
    { is_seed: true },
    { $set: { clearedEditorialCheck: true, verdict: 1 } }
  );
  console.log("Seeding complete.");
}
