const { app, request, createUser, setBalance, auth } = require('./helpers');
const User = require('../../models/User');
const Transaction = require('../../models/Transaction');

describe('POST /api/transactions/transfer', () => {
  /*
   * Regression test for the money-minting bug.
   *
   * `receiver.balance += amount` string-concatenated when amount arrived as a
   * string: 50 + "1" === "501", which Mongoose then cast to the number 501.
   * Posting {"amount": "1"} turned a $50 balance into $501 while debiting the
   * sender only $1.
   */
  it('does not mint money when amount is sent as a string', async () => {
    const sender = await createUser({ username: 'sender', email: 'sender@example.com' });
    const receiver = await createUser({ username: 'receiver', email: 'receiver@example.com' });

    await setBalance(sender.user._id, 100);
    await setBalance(receiver.user._id, 50);

    await request(app)
      .post('/api/transactions/transfer')
      .set(auth(sender.token))
      .send({ recipient: 'receiver', amount: '1' });

    const senderAfter = await User.findById(sender.user._id);
    const receiverAfter = await User.findById(receiver.user._id);

    expect(senderAfter.balance).toBe(99);
    expect(receiverAfter.balance).toBe(51); // NOT 501
    // Total supply is conserved.
    expect(senderAfter.balance + receiverAfter.balance).toBe(150);
  });

  it('rejects non-numeric amounts', async () => {
    const sender = await createUser({ username: 'sender2', email: 's2@example.com' });
    await createUser({ username: 'receiver2', email: 'r2@example.com' });
    await setBalance(sender.user._id, 100);

    for (const amount of ['abc', [], {}, true, '1e400', null]) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app)
        .post('/api/transactions/transfer')
        .set(auth(sender.token))
        .send({ recipient: 'receiver2', amount });

      expect(res.statusCode).toBe(400);
    }

    const after = await User.findById(sender.user._id);
    expect(after.balance).toBe(100);
  });

  it('rejects negative amounts', async () => {
    const sender = await createUser({ username: 'sender3', email: 's3@example.com' });
    const receiver = await createUser({ username: 'receiver3', email: 'r3@example.com' });
    await setBalance(sender.user._id, 100);
    await setBalance(receiver.user._id, 100);

    // A negative amount would otherwise drain the recipient into the sender.
    const res = await request(app)
      .post('/api/transactions/transfer')
      .set(auth(sender.token))
      .send({ recipient: 'receiver3', amount: -50 });

    expect(res.statusCode).toBe(400);
    expect((await User.findById(receiver.user._id)).balance).toBe(100);
  });

  it('rejects a transfer larger than the balance', async () => {
    const sender = await createUser({ username: 'sender4', email: 's4@example.com' });
    await createUser({ username: 'receiver4', email: 'r4@example.com' });
    await setBalance(sender.user._id, 10);

    const res = await request(app)
      .post('/api/transactions/transfer')
      .set(auth(sender.token))
      .send({ recipient: 'receiver4', amount: 100 });

    expect(res.statusCode).toBe(400);
    expect(res.body.msg).toMatch(/insufficient/i);
  });

  it('writes a ledger row for both sides', async () => {
    const sender = await createUser({ username: 'sender5', email: 's5@example.com' });
    const receiver = await createUser({ username: 'receiver5', email: 'r5@example.com' });
    await setBalance(sender.user._id, 100);

    await request(app)
      .post('/api/transactions/transfer')
      .set(auth(sender.token))
      .send({ recipient: 'receiver5', amount: 25 });

    // Only the sender's row was written before, so incoming funds appeared in
    // the recipient's balance with nothing in their history.
    const out = await Transaction.findOne({ user: sender.user._id, type: 'transfer' });
    const incoming = await Transaction.findOne({ user: receiver.user._id, type: 'transfer_in' });

    expect(out).toBeTruthy();
    expect(incoming).toBeTruthy();
    expect(incoming.amount).toBe(25);
  });

  it('refuses a transfer to yourself', async () => {
    const sender = await createUser({ username: 'selfsend', email: 'self@example.com' });
    await setBalance(sender.user._id, 100);

    const res = await request(app)
      .post('/api/transactions/transfer')
      .set(auth(sender.token))
      .send({ recipient: 'selfsend', amount: 10 });

    expect(res.statusCode).toBe(400);
    expect((await User.findById(sender.user._id)).balance).toBe(100);
  });
});

describe('Concurrent withdrawals', () => {
  /*
   * Regression test for the double-spend window.
   *
   * The old read-modify-write pattern let two simultaneous requests both read
   * balance = 100, both pass the check, and both succeed — withdrawing 200
   * from a 100 balance. The atomic conditional $inc closes this.
   */
  it('cannot withdraw more than the balance across parallel requests', async () => {
    const { token, user } = await createUser({ username: 'racer', email: 'racer@example.com' });
    await setBalance(user._id, 100);
    await User.updateOne({ _id: user._id }, { $set: { dailyWithdrawalLimit: 10000 } });

    const withdraw = () => request(app)
      .post('/api/transactions/withdraw')
      .set(auth(token))
      .send({ amount: 100, address: 'TDestinationAddress1234567890', network: 'TRC20' });

    const results = await Promise.all([withdraw(), withdraw(), withdraw()]);
    const succeeded = results.filter((r) => r.statusCode === 201);

    expect(succeeded).toHaveLength(1);

    const after = await User.findById(user._id);
    expect(after.balance).toBe(0);
    expect(after.balance).toBeGreaterThanOrEqual(0);
  });
});

describe('Daily withdrawal limit', () => {
  it('does not count rejected withdrawals against the quota', async () => {
    const { token, user } = await createUser({ username: 'limiter', email: 'limit@example.com' });
    await setBalance(user._id, 5000);
    await User.updateOne({ _id: user._id }, { $set: { dailyWithdrawalLimit: 1000 } });

    const first = await request(app)
      .post('/api/transactions/withdraw')
      .set(auth(token))
      .send({ amount: 900, address: 'TDestinationAddress1234567890', network: 'TRC20' });

    expect(first.statusCode).toBe(201);

    // Mark it rejected+refunded, the way an admin rejection would.
    await Transaction.updateOne({ _id: first.body._id }, { $set: { status: 'failed' } });
    await User.updateOne({ _id: user._id }, { $inc: { balance: 900 } });

    // The old code summed all withdrawals regardless of status, so this was
    // blocked even though the first one never happened.
    const second = await request(app)
      .post('/api/transactions/withdraw')
      .set(auth(token))
      .send({ amount: 900, address: 'TDestinationAddress1234567890', network: 'TRC20' });

    expect(second.statusCode).toBe(201);
  });
});
