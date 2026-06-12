/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@hamster-note/document-parser$':
      '<rootDir>/node_modules/@hamster-note/document-parser/dist/index.js',
    '^@hamster-note/types$':
      '<rootDir>/node_modules/@hamster-note/types/dist/index.js'
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          ...require('./tsconfig.jest.json').compilerOptions,
          allowJs: true,
          checkJs: false
        },
        isolatedModules: false,
        useESM: true
      }
    ],
    'node_modules/@hamster-note/.+\\.js$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.jest.json',
        isolatedModules: true,
        useESM: true
      }
    ]
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  transformIgnorePatterns: ['/node_modules/(?!(@hamster-note)/)']
}
