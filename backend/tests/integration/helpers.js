const request = require('supertest');
const app = require('../../../server');
const User = require('../../models/User');

// Meets the validation rules on POST /api/auth/register.
const validRegistration = (overrides = {}) => ({
  username: 'testuser',
  email: 'test@example.com',
  password: 'Password123',
  country: 'Nigeria',
  tetherWalletId: 'TWalletAddress1234567890abcdef',
  ...overrides,
});

/**
 * Register a user and return { user, token }.
 */
const createUser = async (overrides = {}) => {
  const payload = validRegistration(overrides);
  const res = await request(app).post('/api/auth/register').send(payload);

  if (res.statusCode !== 201) {
    throw new Error(`createUser failed: ${res.statusCode} ${JSON.stringify(res.body)}`);
  }

  return {
    token: res.body.token,
    user: await User.findById(res.body._id),
    password: payload.password,
  };
};

/**
 * Set a balance directly, bypassing the deposit flow.
 */
const setBalance = async (userId, balance) => {
  await User.updateOne({ _id: userId }, { $set: { balance } });
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { app, request, validRegistration, createUser, setBalance, auth };
