'use client';

import React, { useState, useRef } from 'react';
import { ThemeOption } from '@/lib/theme-options';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ThemeSelectorRowProps {
  label: string;
  options: ThemeOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

function ThemeSelectorRow({
  label,
  options,
  selectedId,
  onSelect,
  disabled = false,
}: ThemeSelectorRowProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const currentIndex = options.findIndex((opt) => opt.id === selectedId);
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
      onSelect(options[currentIndex + 1].id);
    }
    if (isRightSwipe && currentIndex > 0) {
      onSelect(options[currentIndex - 1].id);
    }
  };

  const handleClick = (id: string) => {
    if (!disabled) {
      onSelect(id);
    }
  };

  return (
    <div className="mb-8">
      <h3 className="text-lg font-bold text-neon-cyan mb-4 uppercase tracking-widest neon-text-cyan">
        {label}
      </h3>

      <div
        className={`relative glass-panel rounded-xl p-6 overflow-hidden transition-opacity duration-300 ${disabled ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        ref={rowRef}
      >
        {/* Navigation Arrows */}
        {currentIndex > 0 && !disabled && (
          <button
            onClick={() => onSelect(options[currentIndex - 1].id)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/20 text-neon-cyan hover:bg-neon-cyan/20 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {currentIndex < options.length - 1 && !disabled && (
          <button
            onClick={() => onSelect(options[currentIndex + 1].id)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/20 text-neon-cyan hover:bg-neon-cyan/20 transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        )}

        {/* Options Carousel */}
        <div className="flex justify-center items-center gap-6 min-h-[140px]">
          {options.map((option, index) => {
            const isSelected = option.id === selectedId;
            const distance = index - currentIndex;
            const isVisible = Math.abs(distance) <= 1;

            if (!isVisible) return null;

            return (
              <button
                key={option.id}
                onClick={() => handleClick(option.id)}
                disabled={disabled}
                className={`
                  flex flex-col items-center justify-center transition-all duration-500 ease-out
                  ${isSelected ? 'scale-110 z-10' : 'scale-75 opacity-40 grayscale'}
                  ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div
                  className={`
                    text-7xl mb-4 transition-all duration-300 transform
                    ${isSelected ? 'drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]' : ''}
                  `}
                >
                  {option.symbol}
                </div>
                <div
                  className={`
                    text-sm font-mono uppercase tracking-widest px-3 py-1 rounded-full transition-all duration-300
                    ${
                      isSelected
                        ? 'text-black bg-neon-cyan font-bold shadow-[0_0_15px_rgba(0,243,255,0.6)]'
                        : 'text-gray-400 border border-gray-700'
                    }
                  `}
                >
                  {option.name}
                </div>
              </button>
            );
          })}
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mt-6">
          {options.map((option, index) => (
            <div
              key={option.id}
              className={`
                h-1.5 rounded-full transition-all duration-300
                ${
                  index === currentIndex
                    ? 'bg-neon-cyan w-8 shadow-[0_0_10px_rgba(0,243,255,0.8)]'
                    : 'bg-gray-700 w-1.5'
                }
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
    <div className="theme-selector w-full max-w-2xl mx-auto">
      <ThemeSelectorRow
        label="Color Palette"
        options={row1Options}
        selectedId={selectedRow1}
        onSelect={onRow1Change}
        disabled={disabled}
      />
      <ThemeSelectorRow
        label="Light Pattern"
        options={row2Options}
        selectedId={selectedRow2}
        onSelect={onRow2Change}
        disabled={disabled}
      />
      <ThemeSelectorRow
        label="Special Effect"
        options={row3Options}
        selectedId={selectedRow3}
        onSelect={onRow3Change}
        disabled={disabled}
      />
    </div>
  );
}
