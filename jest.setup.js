/* global jest */
/**
 * Jest setup for Zephyr Weather.
 *
 * Registers the in-memory AsyncStorage mock. The mock module itself only
 * exports an implementation — the jest.mock call must happen in a setup file
 * so the real native module is never required.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
