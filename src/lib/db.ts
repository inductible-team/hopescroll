import Database from 'better-sqlite3';
import path from 'path';
import { categories } from './categories';

// Using a local SQLite file in the project root
const dbPath = path.resolve(process.cwd(), 'hopescroll.db');
const db = new Database(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    category TEXT NOT NULL,
    source TEXT NOT NULL,
    url TEXT NOT NULL,
    date TEXT NOT NULL,
    is_positive INTEGER DEFAULT 1
  );
`);

export interface DBStory {
  id: string;
  title: string;
  excerpt: string;
  category: typeof categories[keyof typeof categories];
  source: string;
  url: string;
  date: string;
  is_positive: number;
}

export function getDailyStories(): DBStory[] {
  const stmt = db.prepare('SELECT * FROM stories WHERE is_positive = 1 ORDER BY date DESC LIMIT 15');
  return stmt.all() as DBStory[];
}

export function insertStory(story: Omit<DBStory, 'is_positive'>) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO stories (id, title, excerpt, category, source, url, date, is_positive)
    VALUES (@id, @title, @excerpt, @category, @source, @url, @date, 1)
  `);
  stmt.run(story);
}

// Seed function for development
export function seedMockData() {
  const count = db.prepare('SELECT COUNT(*) as count FROM stories').get() as { count: number };
  if (count.count > 0) return;

  const mockStories = [
    {
      id: '1',
      title: 'New Solar Panel Technology Achieves Record Efficiency, Dropping Costs Further',
      excerpt: 'Researchers have developed a new perovskite solar cell that pushes energy conversion rates beyond 30%, making clean energy more accessible and affordable than ever.',
      category: 'tech',
      source: 'TechCrunch',
      url: '#',
      date: '2026-05-20T08:00:00Z'
    },
    {
      id: '2',
      title: 'Global Poverty Rates Hit All-Time Low Following Multilateral Agreements',
      excerpt: 'A comprehensive UN report shows that targeted micro-loans and education programs have lifted an additional 50 million people out of extreme poverty in the last year.',
      category: 'politics',
      source: 'Reuters',
      url: '#',
      date: '2026-05-19T14:30:00Z'
    },
    {
      id: '3',
      title: 'Breakthrough in Alzheimer’s Research Reverses Cognitive Decline in Early Trials',
      excerpt: 'Scientists report unprecedented success with a new neural-pathway restoring drug, giving hope to millions of families affected by the disease.',
      category: 'science',
      source: 'Science Daily',
      url: '#',
      date: '2026-05-20T10:15:00Z'
    },
    {
      id: '4',
      title: 'Community-Driven Movie Rescues Local Theater and Wins Independent Spirit Award',
      excerpt: 'A film produced entirely by volunteers not only saved their historic local cinema from bankruptcy but also garnered national acclaim.',
      category: 'entertainment',
      source: 'Variety',
      url: '#',
      date: '2026-05-18T18:45:00Z'
    },
    {
      id: '5',
      title: 'Ocean Cleanup Project Successfully Removes 90% of Surface Plastics in the Great Pacific Garbage Patch',
      excerpt: 'Using autonomous drones and advanced netting, the largest cleanup operation in history has achieved a monumental milestone for marine life.',
      category: 'tech',
      source: 'Wired',
      url: '#',
      date: '2026-05-20T09:00:00Z'
    },
    {
      id: '6',
      title: 'Bipartisan Legislation Passes to Subsidize Mental Health Care for All Students',
      excerpt: 'In a rare unanimous vote, lawmakers have prioritized the well-being of the next generation with full funding for school counselors and therapists.',
      category: 'politics',
      source: 'The Guardian',
      url: '#',
      date: '2026-05-19T20:00:00Z'
    }
  ] as Omit<DBStory, 'is_positive'>[];

  mockStories.forEach(story => insertStory(story));
}
