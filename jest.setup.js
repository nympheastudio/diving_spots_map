// Jest setup file
import '@testing-library/jest-dom';

// Mock expo modules
jest.mock('expo-location', () => ({
  getCurrentPositionAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
}));

jest.mock('expo-constants', () => ({
  default: {
    manifest: {
      version: '1.0.0',
    },
  },
}));

jest.mock('expo-screen-orientation', () => ({
  addOrientationChangeListener: jest.fn(() => ({ remove: jest.fn() })),
  Orientation: {
    portrait: 'PORTRAIT',
  },
}));

// Suppress console warnings in tests
global.console.warn = jest.fn();
global.console.error = jest.fn();
