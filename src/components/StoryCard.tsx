import React from 'react';
import { ExternalLink } from 'lucide-react';

import { categories } from '../lib/categories';

export interface Story {
  id: string;
  title: string;
  excerpt: string;
  category: typeof categories[keyof typeof categories] | string;
  source: string;
  url: string;
  date: string;
}

export function StoryCard({ story, index }: { story: Story; index: number }) {
  const dateObj = new Date(story.date);
  const formattedDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(dateObj);

  const trimmedUrl = story.url.trim();
  const safeUrl = trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://') ? trimmedUrl : '#';

  return (
    <a 
      href={safeUrl}
      target="_blank" 
      rel="noopener noreferrer" 
      className="story-card glass animate-fade-in"
      style={{ 
        animationDelay: `${index * 0.05}s`,
        '--card-border': `var(--cat-${story.category})`
      } as React.CSSProperties}
    >
      <div className="story-meta">
        <span className={`category-tag tag-${story.category}`}>
          {story.category}
        </span>
        <span className="story-date">{formattedDate}</span>
      </div>
      
      <h3 className="story-title">{story.title}</h3>
      <p className="story-excerpt">{story.excerpt}</p>
      
      <div className="story-footer">
        <div className="source">
          <span className="source-icon"></span>
          {story.source}
        </div>
        <div className="read-more">
          Read article <ExternalLink size={16} />
        </div>
      </div>
    </a>
  );
}
