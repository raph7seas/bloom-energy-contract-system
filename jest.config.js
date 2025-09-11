/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  roots: ['<rootDir>/src', '<rootDir>/server/src'],
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true }],
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@server/(.*)$': '<rootDir>/server/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'server/src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/test/**/*',
    '!server/src/**/*.d.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  testTimeout: 10000,
  verbose: true,
  projects: [
    {
      displayName: 'Frontend',
      testMatch: ['<rootDir>/src/**/*.(test|spec).(ts|tsx)'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
      extensionsToTreatAsEsm: ['.ts', '.tsx'],
      globals: {
        'ts-jest': {
          useESM: true
        }
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true }]
      }
    },
    {
      displayName: 'Backend',
      testMatch: ['<rootDir>/server/src/**/*.(test|spec).(ts|js)'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/server/src/test/setup.js'],
      transform: {
        '^.+\\.(js)$': 'babel-jest'
      }
    }
  ]
};