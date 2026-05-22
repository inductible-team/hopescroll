'use client';

import { useState } from 'react';
import { Header } from './Header';
import { StoryCard, Story } from './StoryCard';

interface FeedProps {
  initialStories: Story[];
}

export function Feed({ initialStories }: FeedProps) {
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredStories = initialStories.filter(story => 
    activeCategory === 'all' || story.category === activeCategory
  );

  return (
    <>
      <Header activeCategory={activeCategory} onSelectCategory={setActiveCategory} />
      
      <main className="container">       
        <section className="feed-grid">
          {filteredStories.length === 0 ? (
            <p className="text-center w-full mt-10">No stories found for this category today.</p>
          ) : (
            filteredStories.map((story, index) => (
              <StoryCard key={story.id} story={story} index={index} />
            ))
          )}
        </section>
      </main>
    </>
  );
}
