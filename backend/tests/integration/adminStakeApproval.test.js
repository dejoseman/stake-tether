/**
 * Regression cover for the admin stake-approval flow.
 *
 * Two defects shipped to production here:
 *
 *   1. The approve route builds completesAt with an aggregation-pipeline
 *      update. Mongoose 9 stopped inferring a pipeline from an array argument
 *      and throws unless `updatePipeline: true` is passed, so every approval
 *      returned a 500 'Server error'.
 *
 *   2. requireAdminPin answered a bad PIN with 401. The client's axios
 *      interceptor reads any 401 as an expired session, so a mistyped PIN
 *      cleared the admin's token and bounced them to /login.
 */
const bcrypt = require('bcryptjs');
const { app, request, createUser, auth } = require('./helpers');
const User = require('../../models/User');
const Staking = require('../../models/Staking');

const PIN = '123456';

const makeAdmin = async () => {
  const { user, token } = await createUser({ email: 'admin@example.com', username: 'adminuser' });
  await User.updateOne(
    { _id: user._id },
    { $set: { role: 'admin', adminPin: await bcrypt.hash(PIN, 12) } }
  );
  return token;
};

const pendingStake = async (userId) => Staking.create({
  user: userId,
  planName: 'Gold',
  amount: 500,
  principal: 500,
  returnPercent: 10,
  durationHours: 48,
  status: 'pending',
});

const approve = (token, id, pin = PIN) => request(app)
  .put(`/api/admin/stakes/${id}/approve`)
  .set(auth(token))
  .set('x-admin-pin', pin)
  .send({});

describe('PUT /api/admin/stakes/:id/approve', () => {
  it('approves a pending stake and sets a non-null completesAt', async () => {
    const token = await makeAdmin();
    const { user: member } = await createUser({ email: 'm1@example.com', username: 'member1' });
    const stake = await pendingStake(member._id);

    const res = await approve(token, stake._id);

    expect(res.statusCode).toBe(200);
    expect(res.body.stake.status).toBe('active');

    // The whole point of the pipeline update: completesAt is derived from
    // durationHours. A null here makes the cron treat the stake as already
    // matured and pay it out immediately.
    const saved = await Staking.findById(stake._id);
    expect(saved.completesAt).not.toBeNull();
    expect(saved.startedAt).not.toBeNull();
    expect(saved.completesAt.getTime() - saved.startedAt.getTime())
      .toBe(48 * 60 * 60 * 1000);
  });

  it('approves a legacy document written before the Decimal128 migration', async () => {
    const token = await makeAdmin();
    const { user: member } = await createUser({ email: 'm2@example.com', username: 'member2' });

    // Raw insert bypasses the current schema, mimicking a pre-migration row
    // where amount is a plain double and the newer fields are absent.
    const { insertedId } = await Staking.collection.insertOne({
      user: member._id,
      planName: 'Gold',
      amount: 500,
      returnPercent: 10,
      durationHours: 48,
      status: 'pending',
      accruedRewards: 0,
      autoCompound: false,
      lastProcessedAt: null,
      startedAt: null,
      completesAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await approve(token, insertedId);

    expect(res.statusCode).toBe(200);
    const saved = await Staking.findById(insertedId);
    expect(saved.completesAt).not.toBeNull();
  });

  it('rejects a wrong PIN with 403 so the client does not log the admin out', async () => {
    const token = await makeAdmin();
    const { user: member } = await createUser({ email: 'm3@example.com', username: 'member3' });
    const stake = await pendingStake(member._id);

    const res = await approve(token, stake._id, 'wrong-pin');

    // 403, never 401 — see the interceptor in client/src/api/client.js.
    expect(res.statusCode).toBe(403);
    expect(res.body.msg).toBe('Invalid Admin Action PIN');

    // And the stake must be untouched.
    const saved = await Staking.findById(stake._id);
    expect(saved.status).toBe('pending');
  });

  it('requires a PIN header at all, also with 403', async () => {
    const token = await makeAdmin();
    const { user: member } = await createUser({ email: 'm4@example.com', username: 'member4' });
    const stake = await pendingStake(member._id);

    const res = await request(app)
      .put(`/api/admin/stakes/${stake._id}/approve`)
      .set(auth(token))
      .send({});

    expect(res.statusCode).toBe(403);
  });
});
