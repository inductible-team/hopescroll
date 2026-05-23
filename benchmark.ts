import { fetchRssFeeds } from './src/lib/rss-fetcher';

async function runBenchmark() {
  const start = Date.now();
  await fetchRssFeeds();
  const end = Date.now();
  console.log(`fetchRssFeeds took ${end - start} ms`);
}

runBenchmark().catch(console.error);
