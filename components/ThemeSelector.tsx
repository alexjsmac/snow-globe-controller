'use client';

import React, { useState } from 'react';
import { ThemeOption } from '@/lib/theme-options';

interface ThemeSelectorRowProps {
  label: string;
  options: ThemeOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

function ThemeSelectorRow({ label, options, selectedId, onSelect, disabled = false }: ThemeSelectorRowProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const currentIndex = options.findIndex(opt => opt.id === selectedId);
  
  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || disabled) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < options.length - 1) {
      // Swipe left, go to next
      onSelect(options[currentIndex + 1].id);
    }
    if (isRightSwipe && currentIndex > 0) {
      // Swipe right, go to previous
      onSelect(options[currentIndex - 1].id);
    }
  };

  const handleClick = (id: string) => {
    if (!disabled) {
      onSelect(id);
    }
  };

  return (
    <div className="mb-6">
      <h3 className="text-center text-lg font-bold text-red-100 mb-3 uppercase tracking-wider">
        {label}
      </h3>
      <div 
        className={`relative bg-red-950/50 border-2 border-red-500/50 rounded-lg p-6 ${
          disabled ? 'opacity-50' : ''
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Swipe indicators */}
        {currentIndex > 0 && !disabled && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-red-300/50 text-2xl animate-pulse">
            ‹
          </div>
        )}
        {currentIndex < options.length - 1 && !disabled && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-red-300/50 text-2xl animate-pulse">
            ›
          </div>
        )}

        {/* Options display */}
        <div className="flex justify-center items-center gap-4">
          {options.map((option, index) => {
            const isSelected = option.id === selectedId;
            const isAdjacent = Math.abs(index - currentIndex) === 1;
            const isHidden = Math.abs(index - currentIndex) > 1;

            return (
              <button
                key={option.id}
                onClick={() => handleClick(option.id)}
                disabled={disabled}
                className={`
                  flex flex-col items-center justify-center transition-all duration-300
                  ${isHidden ? 'hidden' : ''}
                  ${isSelected ? 'scale-125' : 'scale-90 opacity-40'}
                  ${isAdjacent ? 'scale-75 opacity-30' : ''}
                  ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110'}
                `}
                style={{ minWidth: '80px' }}
              >
                <div className={`
                  text-6xl mb-2 transition-all
                  ${isSelected ? 'filter drop-shadow-lg' : ''}
                `}>
                  {option.symbol}
                </div>
                <div className={`
                  text-sm font-mono uppercase tracking-wider
                  ${isSelected ? 'text-green-300 font-bold' : 'text-red-200'}
                `}>
                  {option.name}
                </div>
              </button>
            );
          })}
        </div>

        {/* Indicator dots */}
        <div className="flex justify-center gap-2 mt-4">
          {options.map((option, index) => (
            <div
              key={option.id}
              className={`
                w-2 h-2 rounded-full transition-all
                ${index === currentIndex ? 'bg-green-400 w-6' : 'bg-red-300/30'}
              `}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ThemeSelectorProps {
  row1Options: ThemeOption[];
  row2Options: ThemeOption[];
  row3Options: ThemeOption[];
  selectedRow1: string;
  selectedRow2: string;
  selectedRow3: string;
  onRow1Change: (id: string) => void;
  onRow2Change: (id: string) => void;
  onRow3Change: (id: string) => void;
  disabled?: boolean;
}

export function ThemeSelector({
  row1Options,
  row2Options,
  row3Options,
  selectedRow1,
  selectedRow2,
  selectedRow3,
  onRow1Change,
  onRow2Change,
  onRow3Change,
  disabled = false,
}: ThemeSelectorProps) {
  return (
    <div className="theme-selector">
      <ThemeSelectorRow
        label="🎨 Color"
        options={row1Options}
        selectedId={selectedRow1}
        onSelect={onRow1Change}
        disabled={disabled}
      />
      <ThemeSelectorRow
        label="✨ Pattern"
        options={row2Options}
        selectedId={selectedRow2}
        onSelect={onRow2Change}
        disabled={disabled}
      />
      <ThemeSelectorRow
        label="🎭 Effect"
        options={row3Options}
        selectedId={selectedRow3}
        onSelect={onRow3Change}
        disabled={disabled}
      />
    </div>
  );
}
