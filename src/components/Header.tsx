'use client';
import React from 'react';
import { Sun } from 'lucide-react';
import { categories } from '../lib/categories';

// Capitalize helper
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const CATEGORIES = ['all', ...Object.values(categories)];
interface HeaderProps {
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
}

export function Header({ activeCategory, onSelectCategory }: HeaderProps) {
  return (
    <header className="header">
      <div className="container header-content">
        <div className="logo">
          <Sun className="text-accent" size={28} />
          Hopescroll
        </div>
        <nav className="category-filter">
          {CATEGORIES.map(cat => (
            <button 
              key={cat}
              className={`filter-btn ${activeCategory === cat.toLowerCase() ? 'active' : ''}`}
              onClick={() => onSelectCategory(cat.toLowerCase())}
            >
              {capitalize(cat)}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
