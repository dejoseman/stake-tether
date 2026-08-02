module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./backend/tests/setup.js'],
  testMatch: ['**/backend/tests/**/*.test.js'],
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
