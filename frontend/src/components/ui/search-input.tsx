'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Search, TrendingUp, History, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onDebouncedChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  suggestions?: string[];
  showClearButton?: boolean;
  autoFocus?: boolean;
  className?: string;
  recentSearches?: string[];
  showSuggestions?: boolean;
  delay?: number;
}

export function SearchInput({
  placeholder = 'Search for products...',
  value,
  onChange,
  onDebouncedChange,
  onSearch,
  suggestions = [],
  showClearButton = true,
  autoFocus = false,
  className,
  recentSearches = [],
  showSuggestions = true,
  delay = 300,
}: SearchInputProps) {
  const router = useRouter();
  const [internalValue, setInternalValue] = useState(value ?? '');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentValue = value ?? internalValue;

  const handleChange = (text: string) => {
    setInternalValue(text);
    onChange?.(text);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onDebouncedChange?.(text);
      debounceRef.current = null;
    }, delay);
    setIsOpen(true);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleClear = () => {
    setInternalValue('');
    onChange?.('');
    inputRef.current?.focus();
  };

  const handleSubmit = (text: string) => {
    if (!text.trim()) return;
    setIsOpen(false);
    inputRef.current?.blur();
    onSearch?.(text);
    router.push(`/marketplace?q=${encodeURIComponent(text.trim())}`);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(currentValue);
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const displaySuggestions = suggestions.filter((suggestion) =>
    suggestion.toLowerCase().includes(currentValue.toLowerCase())
  );
  const displayRecent = recentSearches.filter((search) =>
    search.toLowerCase().includes(currentValue.toLowerCase())
  );

  const hasSuggestions = (displaySuggestions.length > 0 || displayRecent.length > 0) && showSuggestions;

  return (
    <div className={cn('relative w-full', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-400" />
        <input
          ref={inputRef}
          type="search"
          value={currentValue}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-label="Search"
          className={cn(
            'w-full rounded-full border border-charcoal-200 bg-white py-2.5 pl-11 pr-10 text-sm',
            'text-charcoal-900 placeholder:text-charcoal-400 shadow-sm',
            'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20'
          )}
        />
        {showClearButton && currentValue && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-charcoal-400 hover:bg-charcoal-100 hover:text-charcoal-600"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && hasSuggestions && (
        <div className="absolute top-full left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border border-charcoal-200 bg-white shadow-lg animate-slide-down">
          {displayRecent.length > 0 && (
            <div className="border-b border-charcoal-100 px-4 py-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-charcoal-500">
                <History className="h-3.5 w-3.5" />
                Recent
              </div>
              {displayRecent.slice(0, 4).map((recent) => (
                <button
                  key={recent}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSubmit(recent)}
                  className="block w-full truncate px-1 py-1.5 text-left text-sm text-charcoal-700 hover:text-primary-700"
                >
                  {recent}
                </button>
              ))}
            </div>
          )}
          {displaySuggestions.length > 0 && (
            <div className="px-4 py-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-charcoal-500">
                <TrendingUp className="h-3.5 w-3.5" />
                Popular
              </div>
              {displaySuggestions.slice(0, 6).map((suggestion) => (
                <button
                  key={suggestion}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSubmit(suggestion)}
                  className="block w-full truncate px-1 py-1.5 text-left text-sm text-charcoal-700 hover:text-primary-700"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}