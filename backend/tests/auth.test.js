const request = require('supertest');
const app = require('../../server'); // The exported express app
const User = require('../models/User');

describe('Auth API Endpoints', () => {
  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('username', 'testuser');
  });

  it('should fail to register with existing email', async () => {
    // Create initial user
    await User.create({
      username: 'firstuser',
      email: 'duplicate@example.com',
      password: 'Password123!'
    });

    // Attempt duplicate
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'seconduser',
        email: 'duplicate@example.com',
        password: 'Password123!',
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('msg', 'User already exists');
  });

  it('should login an existing user successfully', async () => {
    // We register a user first
    await request(app)
      .post('/api/auth/register')
      .send({
        username: 'loginuser',
        email: 'login@example.com',
        password: 'Password123!',
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@example.com',
        password: 'Password123!',
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
  });
});
