/**
 * Christmas theme options for the installation
 * Each row has 3 options that users can swipe between
 */

export interface ThemeOption {
  id: string;
  symbol: string;
  name: string;
}

export interface ThemeSelection {
  row1: string; // ID of selected option from row 1
  row2: string; // ID of selected option from row 2
  row3: string; // ID of selected option from row 3
}

// Row 1: Colors
export const colorOptions: ThemeOption[] = [
  { id: 'red', symbol: '🔴', name: 'Red' },
  { id: 'green', symbol: '🟢', name: 'Green' },
  { id: 'gold', symbol: '🟡', name: 'Gold' },
];

// Row 2: Patterns
export const patternOptions: ThemeOption[] = [
  { id: 'snowflakes', symbol: '❄️', name: 'Snowflakes' },
  { id: 'stars', symbol: '⭐', name: 'Stars' },
  { id: 'lights', symbol: '💡', name: 'Lights' },
];

// Row 3: Effects
export const effectOptions: ThemeOption[] = [
  { id: 'sparkle', symbol: '✨', name: 'Sparkle' },
  { id: 'pulse', symbol: '💫', name: 'Pulse' },
  { id: 'wave', symbol: '🌊', name: 'Wave' },
];

export const defaultThemeSelection: ThemeSelection = {
  row1: 'red',
  row2: 'snowflakes',
  row3: 'sparkle',
};
