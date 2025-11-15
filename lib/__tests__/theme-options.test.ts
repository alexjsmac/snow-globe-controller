import { colorOptions, patternOptions, effectOptions } from '../theme-options';

describe('ThemeOptions', () => {
  describe('colorOptions', () => {
    it('should have correct number of options', () => {
      expect(colorOptions).toHaveLength(3);
    });

    it('should have all required properties', () => {
      colorOptions.forEach((option) => {
        expect(option).toHaveProperty('id');
        expect(option).toHaveProperty('symbol');
        expect(option).toHaveProperty('name');
      });
    });

    it('should include red, green, and gold options', () => {
      const ids = colorOptions.map((opt) => opt.id);
      expect(ids).toContain('red');
      expect(ids).toContain('green');
      expect(ids).toContain('gold');
    });
  });

  describe('patternOptions', () => {
    it('should have correct number of options', () => {
      expect(patternOptions).toHaveLength(3);
    });

    it('should include snowflakes, stars, and lights options', () => {
      const ids = patternOptions.map((opt) => opt.id);
      expect(ids).toContain('snowflakes');
      expect(ids).toContain('stars');
      expect(ids).toContain('lights');
    });
  });

  describe('effectOptions', () => {
    it('should have correct number of options', () => {
      expect(effectOptions).toHaveLength(3);
    });

    it('should include sparkle, pulse, and wave options', () => {
      const ids = effectOptions.map((opt) => opt.id);
      expect(ids).toContain('sparkle');
      expect(ids).toContain('pulse');
      expect(ids).toContain('wave');
    });
  });

  describe('Option structure', () => {
    it('should have unique IDs across all options', () => {
      const allOptions = [...colorOptions, ...patternOptions, ...effectOptions];
      const ids = allOptions.map((opt) => opt.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have non-empty symbols', () => {
      const allOptions = [...colorOptions, ...patternOptions, ...effectOptions];
      allOptions.forEach((option) => {
        expect(option.symbol).toBeTruthy();
        expect(option.symbol.length).toBeGreaterThan(0);
      });
    });

    it('should have descriptive names', () => {
      const allOptions = [...colorOptions, ...patternOptions, ...effectOptions];
      allOptions.forEach((option) => {
        expect(option.name).toBeTruthy();
        expect(option.name.length).toBeGreaterThan(0);
      });
    });
  });
});
