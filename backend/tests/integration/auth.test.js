const { app, request, validRegistration, createUser, auth } = require('./helpers');
const User = require('../../models/User');

/*
 * The previous version of this file could never pass: it omitted `country` and
 * `tetherWalletId` (both required by the register route, so every request 400d
 * instead of 201) and asserted on `res.body.user.username`, which the
 * controller has never returned.
 */

describe('POST /api/auth/register', () => {
  it('registers a new user and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(validRegistration());

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('username', 'testuser');
    // The password hash must never appear in a response body.
    expect(res.body).not.toHaveProperty('password');
  });

  it('rejects a duplicate email', async () => {
    await createUser({ email: 'duplicate@example.com', username: 'firstuser' });

    const res = await request(app)
      .post('/api/auth/register')
      .send(validRegistration({ email: 'duplicate@example.com', username: 'seconduser' }));

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('msg', 'User already exists');
  });

  it('rejects a weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(validRegistration({ password: 'short' }));

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('stores the password as a hash, not plaintext', async () => {
    await createUser();
    const user = await User.findOne({ email: 'test@example.com' }).select('+password');

    expect(user.password).not.toBe('Password123');
    expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with the correct credentials', async () => {
    await createUser({ email: 'login@example.com', username: 'loginuser' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'Password123' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('logs in by username as well as email', async () => {
    await createUser({ email: 'byname@example.com', username: 'byname' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'byname', password: 'Password123' });

    expect(res.statusCode).toBe(200);
  });

  it('rejects a wrong password', async () => {
    await createUser();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'WrongPassword1' });

    expect(res.statusCode).toBe(401);
  });

  it('gives the same error for an unknown account as for a wrong password', async () => {
    await createUser();

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'WrongPassword1' });

    const noSuchUser = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'WrongPassword1' });

    // Otherwise the endpoint is an account-enumeration oracle.
    expect(noSuchUser.statusCode).toBe(wrongPassword.statusCode);
    expect(noSuchUser.body.msg).toBe(wrongPassword.body.msg);
  });
});

describe('GET /api/auth/profile', () => {
  it('requires a token', async () => {
    const res = await request(app).get('/api/auth/profile');
    expect(res.statusCode).toBe(401);
  });

  it('rejects a forged token', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set(auth('not.a.real.token'));

    expect(res.statusCode).toBe(401);
  });

  it('returns the profile without any credential fields', async () => {
    const { token } = await createUser();

    const res = await request(app).get('/api/auth/profile').set(auth(token));

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('username', 'testuser');
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).not.toHaveProperty('adminPin');
  });

  it('rejects a token belonging to a deleted user', async () => {
    const { token, user } = await createUser();
    await User.deleteOne({ _id: user._id });

    // The old middleware called next() with req.user null, and the route then
    // threw on req.user._id.
    const res = await request(app).get('/api/auth/profile').set(auth(token));
    expect(res.statusCode).toBe(401);
  });
});

describe('Password reset', () => {
  it('returns the same response whether or not the email is registered', async () => {
    await createUser({ email: 'real@example.com', username: 'realuser' });

    const known = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'real@example.com' });

    const unknown = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'ghost@example.com' });

    expect(known.statusCode).toBe(200);
    expect(unknown.statusCode).toBe(200);
    expect(known.body.msg).toBe(unknown.body.msg);
  });

  it('rejects an invalid reset token', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password/bogustoken')
      .send({ password: 'BrandNewPass1' });

    expect(res.statusCode).toBe(400);
  });

  it('stores only a hash of the reset token', async () => {
    const { user } = await createUser();
    await request(app).post('/api/auth/forgot-password').send({ email: user.email });

    const updated = await User.findById(user._id).select('+resetPasswordToken');
    expect(updated.resetPasswordToken).toMatch(/^[a-f0-9]{64}$/); // sha256
  });
});
