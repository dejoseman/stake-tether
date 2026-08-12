/**
 * Two projects, because they have very different requirements.
 *
 * `unit` tests pure functions and needs nothing but Node — it runs anywhere,
 * instantly, including in a sandbox or CI runner with no outbound network.
 *
 * `integration` boots an in-memory MongoDB via mongodb-memory-server, which
 * downloads a mongod binary on first run. That download needs network access,
 * so these are the tests that fail in a locked-down environment.
 *
 * Run them separately with:
 *   npm run test:unit
 *   npm run test:integration
 */
module.exports = {
  testEnvironment: 'node',
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/backend/tests/unit/**/*.test.js'],
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/backend/tests/integration/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/backend/tests/setup.js'],
      // Integration tests share one in-memory database, so they must not run
      // concurrently against it.
      maxWorkers: 1,
      testTimeout: 30000,
    },
  ],
};
