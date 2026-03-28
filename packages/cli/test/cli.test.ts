import { describe, expect, it } from 'vitest';
import { CLI_VERSION } from '../src/index.js';

describe('@obidot-kit/cli', () => {
  describe('CLI_VERSION', () => {
    it('should export a version string', () => {
      expect(CLI_VERSION).toBe('0.2.0');
    });

    it('should be a valid semver string', () => {
      const semverRegex = /^\d+\.\d+\.\d+$/;
      expect(CLI_VERSION).toMatch(semverRegex);
    });
  });
});
