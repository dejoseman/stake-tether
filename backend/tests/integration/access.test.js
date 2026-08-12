const { app, request, createUser, auth } = require('./helpers');
const User = require('../../models/User');

const makeAdmin = async (userId) => {
  await User.updateOne({ _id: userId }, { $set: { role: 'admin' } });
};

describe('KYC document access', () => {
  /*
   * The /uploads directory used to be mounted with express.static and no auth,
   * so every passport and ID on the platform was one URL away from the open
   * internet.
   */
  it('does not serve the uploads directory publicly', async () => {
    const res = await request(app).get('/uploads/anything.png');
    // Must not be a 200 file response. The SPA catch-all may serve index.html,
    // but it must never be the document itself.
    expect(res.headers['content-type']).not.toMatch(/image|application\/pdf/);
  });

  it('refuses document access to an unauthenticated caller', async () => {
    const { user } = await createUser();
    const res = await request(app).get(`/api/admin/kyc/${user._id}/document`);
    expect(res.statusCode).toBe(401);
  });

  it('refuses document access to a normal user', async () => {
    const { token, user } = await createUser();
    const res = await request(app)
      .get(`/api/admin/kyc/${user._id}/document`)
      .set(auth(token));

    // Admin-only, including for the user's own document.
    expect(res.statusCode).toBe(403);
  });

  it('allows an admin through', async () => {
    const target = await createUser({ username: 'subject', email: 'subject@example.com' });
    const adminUser = await createUser({ username: 'theadmin', email: 'admin@example.com' });
    await makeAdmin(adminUser.user._id);

    // Re-login so the token carries the admin role.
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'Password123' });

    const res = await request(app)
      .get(`/api/admin/kyc/${target.user._id}/document`)
      .set(auth(login.body.token));

    // 404 because this user has not uploaded anything — the point is that the
    // request was authorised rather than rejected with 401/403.
    expect(res.statusCode).toBe(404);
  });
});

describe('Admin route protection', () => {
  it('rejects unauthenticated access to admin endpoints', async () => {
    for (const url of ['/api/admin/users', '/api/admin/transactions', '/api/admin/stakes']) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app).get(url);
      expect(res.statusCode).toBe(401);
    }
  });

  it('rejects a normal user with 403, not 401', async () => {
    const { token } = await createUser();
    const res = await request(app).get('/api/admin/users').set(auth(token));

    // 403 matters: a 401 would trip the client's session-expiry interceptor
    // and log a legitimate user out.
    expect(res.statusCode).toBe(403);
  });

  it('never exposes credential hashes in the admin user list', async () => {
    await createUser({ username: 'plainuser', email: 'plain@example.com' });
    const adminUser = await createUser({ username: 'admin2', email: 'admin2@example.com' });
    await makeAdmin(adminUser.user._id);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin2@example.com', password: 'Password123' });

    const res = await request(app).get('/api/admin/users').set(auth(login.body.token));

    expect(res.statusCode).toBe(200);
    for (const u of res.body) {
      expect(u).not.toHaveProperty('password');
      expect(u).not.toHaveProperty('adminPin');
      expect(u).not.toHaveProperty('resetPasswordToken');
    }
  });
});

describe('API 404 handling', () => {
  it('returns JSON, not the SPA shell, for unknown API routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.statusCode).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
  });
});
