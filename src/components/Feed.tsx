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
        <section className="hero">
          <h1 className="title animate-fade-in">Your Daily Dose of Hope.</h1>
          <p className="subtitle animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Empowering stories of human progress, scientific breakthroughs, and uplifting moments. No doom, just growth.
          </p>
        </section>

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
