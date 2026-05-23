'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Sun, ChevronDown, Filter } from 'lucide-react';
import { categories } from '../lib/categories';

// Capitalize helper
const formatCategoryName = (s: string) => {
  return s.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};
const CATEGORIES = ['all', ...Object.values(categories)];

interface HeaderProps {
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
}

export function Header({ activeCategory, onSelectCategory }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="header">
      <div className="container header-content">
        <div className="logo">
          <Sun className="text-accent" size={28} />
          Hopescroll
        </div>
        
        <div className="category-dropdown-container" ref={dropdownRef}>
          <button 
            className="dropdown-toggle glass" 
            onClick={() => setIsOpen(!isOpen)}
          >
            <Filter size={16} />
            <span>{formatCategoryName(activeCategory)}</span>
            <ChevronDown size={16} className={`dropdown-icon-spin ${isOpen ? 'open' : ''}`} />
          </button>
          
          {isOpen && (
            <div className="category-dropdown glass animate-fade-in">
              {CATEGORIES.map(cat => (
                <button 
                  key={cat}
                  className={`dropdown-item ${activeCategory === cat.toLowerCase() ? 'active' : ''}`}
                  onClick={() => {
                    onSelectCategory(cat.toLowerCase());
                    setIsOpen(false);
                  }}
                >
                  {formatCategoryName(cat)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
