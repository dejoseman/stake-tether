const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// The app validates this at boot; tests need it present before server.js loads.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET
  || 'test-only-secret-key-that-is-long-enough-to-pass-validation';

/*
 * Force sendEmail() down its mock branch.
 *
 * server.js calls dotenv.config(), which loads the real Resend credentials from
 * .env. Without this the suite opened live SMTP connections and delivered real
 * mail to the production support inbox on every run — which also made tests slow
 * and flaky, since each one waited on a network round trip. dotenv does not
 * overwrite keys that already exist in process.env, so setting them empty here
 * (this file runs before server.js is required) wins.
 */
process.env.EMAIL_USER = '';
process.env.EMAIL_PASS = '';

let mongoServer;

// The first run downloads a mongod binary, which comfortably exceeds Jest's
// default 5s hook timeout. This is also the step that fails outright in a
// sandbox or CI runner with no outbound network — if you see a timeout here,
// check network access to fastdl.mongodb.org before suspecting the tests.
const HOOK_TIMEOUT = 120000;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  // useNewUrlParser / useUnifiedTopology were removed in the Mongoose 6+
  // driver and now only emit deprecation warnings.
  await mongoose.connect(mongoServer.getUri());
}, HOOK_TIMEOUT);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) await mongoServer.stop();
}, HOOK_TIMEOUT);

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({}))
  );
});
