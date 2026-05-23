'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './Header';
import { StoryCard, Story } from './StoryCard';
import { fetchStoriesAction } from '../app/actions';

interface FeedProps {
  initialStories: Story[];
}

export function Feed({ initialStories }: FeedProps) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialStories.length === 15);
  const [isLoading, setIsLoading] = useState(false);

  const observerTarget = useRef<HTMLDivElement>(null);
  const isFirstMount = useRef(true);

  // Handle category changes
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    let isMounted = true;
    
    async function fetchCategory() {
      setIsLoading(true);
      const newStories = await fetchStoriesAction(1, activeCategory);
      if (isMounted) {
        setStories(newStories as any);
        setPage(1);
        setHasMore(newStories.length === 15);
        setIsLoading(false);
      }
    }
    
    fetchCategory();
    
    return () => {
      isMounted = false;
    };
  }, [activeCategory]);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    const nextPage = page + 1;
    const newStories = await fetchStoriesAction(nextPage, activeCategory);
    
    setStories(prev => [...prev, ...(newStories as any)]);
    setPage(nextPage);
    setHasMore(newStories.length === 15);
    setIsLoading(false);
  }, [page, activeCategory, isLoading, hasMore]);

  // Intersection Observer for infinite scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '100px' }
    );

    const target = observerTarget.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [loadMore]);

  return (
    <>
      <Header activeCategory={activeCategory} onSelectCategory={setActiveCategory} />
      
      <main className="container">       
        <section className="feed-grid">
          {stories.length === 0 && !isLoading ? (
            <p className="text-center w-full mt-10">No stories found for this category today.</p>
          ) : (
            stories.map((story, index) => (
              <StoryCard key={`${story.id}-${index}`} story={story} index={index} />
            ))
          )}
        </section>
        
        {/* Loading indicator and observer target */}
        <div ref={observerTarget} className="flex justify-center w-full p-4 mt-8 min-h-[50px]">
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
              <span>Loading more stories...</span>
            </div>
          )}
          {!hasMore && stories.length > 0 && (
            <p className="text-gray-500 text-sm">You've reached the end of the feed.</p>
          )}
        </div>
      </main>
    </>
  );
}
