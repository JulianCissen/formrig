/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  globalSetup: './jest.global-setup.js',
  globalTeardown: './jest.global-teardown.js',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
  moduleNameMapper: {
    '^@formrig/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@formrig/sdk$': '<rootDir>/../../packages/sdk/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
