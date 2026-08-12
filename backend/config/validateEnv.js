/**
 * Fail fast at boot if required configuration is missing.
 *
 * Previously the app fell back to a hardcoded JWT secret and would happily
 * serve traffic without a database. Both of those are silent, critical
 * failures in production, so we now refuse to start instead.
 */

const REQUIRED = ['JWT_SECRET', 'MONGODB_URI'];

// Anything shorter than this is not a credible signing key.
const MIN_SECRET_LENGTH = 32;

const KNOWN_BAD_SECRETS = [
  'supersecretjwtkey123',
  'your_super_secret_jwt_key_here',
  'secret',
  'changeme',
];

const validateEnv = () => {
  const problems = [];

  for (const key of REQUIRED) {
    if (!process.env[key] || !process.env[key].trim()) {
      problems.push(`${key} is not set`);
    }
  }

  const secret = process.env.JWT_SECRET;
  if (secret) {
    if (KNOWN_BAD_SECRETS.includes(secret.trim().toLowerCase())) {
      problems.push('JWT_SECRET is a known placeholder value and must be replaced');
    } else if (secret.length < MIN_SECRET_LENGTH) {
      problems.push(
        `JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters (currently ${secret.length}). ` +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
      );
    }
  }

  if (problems.length > 0) {
    console.error('\nFATAL: invalid environment configuration\n');
    problems.forEach((p) => console.error(`  - ${p}`));
    console.error('\nSee .env.example for the full list of required variables.\n');
    process.exit(1);
  }
};

module.exports = validateEnv;
