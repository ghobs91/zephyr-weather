/**
 * Jest config for Zephyr Weather.
 *
 * Uses the React Native preset (transformIgnorePatterns, haste platforms,
 * asset transformer, RN test environment). The preset's setupFiles entry is
 * re-declared here because project-level `setupFiles` replaces the preset's.
 * `jest.setup.js` registers the AsyncStorage in-memory mock after env setup.
 */
module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/node_modules/@react-native/jest-preset/jest/setup.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
