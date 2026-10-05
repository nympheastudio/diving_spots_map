const path = require('path');

module.exports = {
  rootDir: __dirname,
  preset: path.join(__dirname, 'node_modules/jest-expo/node'),
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
  transformIgnorePatterns: [
    'node_modules/(?!(expo|expo-modules-core|react-native|react-native-maps|react-native-map-clustering|geolib)/)',
  ],
  setupFilesAfterEnv: [path.resolve(__dirname, 'jest.setup.js')],
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/utils/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
