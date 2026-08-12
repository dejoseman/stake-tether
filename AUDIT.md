# stake-tether / GeneratingPro — Production Audit

Reviewed: backend (Express 5 + Mongoose), client (React 19 + Vite), Docker, CI.
Scope: ~5,600 LOC. Status: **deployed**.

Severity key: **P0** = fix now, live risk · **P1** = fix this week · **P2** = fix soon · **P3** = hygiene.

---

## P0 — Fix immediately

### 1. KYC documents are publicly downloadable, no auth
`server.js:70` — `app.use('/uploads', express.static(...))`

Passports, IDs and selfies are served to anyone with the URL. Filenames are
`<userId>-<Date.now()>-<Math.random()>.ext` (`backend/routes/kyc.js:19-20`) — the userId is
exposed in API responses, and `Math.random()` is not a security boundary. This is a
GDPR/CCPA-grade PII exposure on a financial site.

**Fix:** delete the static mount. Serve documents through an authenticated route:

```js
// backend/routes/kyc.js
router.get('/document/:userId', protect, admin, async (req, res) => {
  const user = await User.findById(req.params.userId).select('kycDocument');
  if (!user?.kycDocument) return res.status(404).json({ msg: 'Not found' });
  res.sendFile(path.join(UPLOAD_DIR, path.basename(user.kycDocument)));
});
```
Allow the owning user OR an admin. Better still: move to S3/R2 with short-lived signed URLs.

---

### 2. Password hashes returned in API responses
- `backend/routes/kyc.js:65` — `res.json({ ..., user })` returns the full Mongoose doc to the user
- `backend/routes/admin.js:86, 112, 280, 305` — same, to admins

The full document includes `password` (bcrypt hash) and `adminPin` (bcrypt hash). Any XSS,
log capture, browser extension, or proxy now has offline-crackable credentials.

**Fix:** add a schema-level guard so this can't recur:

```js
// backend/models/User.js
userSchema.set('toJSON', {
  transform: (doc, ret) => { delete ret.password; delete ret.adminPin; return ret; }
});
```
Also `GET /api/admin/users` (`admin.js:19`) uses `.select('-password')` but still leaks `adminPin`.

---

### 3. Hardcoded JWT secret fallback
`backend/middleware/auth.js:15` and `backend/controllers/authController.js:11`:
```js
process.env.JWT_SECRET || 'supersecretjwtkey123'
```
If `JWT_SECRET` is ever missing from the deploy environment (new host, typo, container
without env injection), the app silently signs tokens with a string that is now in your git
history. Anyone can forge `{ id: <any admin _id> }` and take over the admin panel.

**Fix:** fail fast at boot.
```js
// server.js, before anything else
['JWT_SECRET', 'MONGODB_URI'].forEach(k => {
  if (!process.env[k]) { console.error(`FATAL: ${k} is not set`); process.exit(1); }
});
```
Then remove both fallbacks. **Rotate `JWT_SECRET` now** — this invalidates all sessions, which
is the correct outcome.

---

### 4. Money-minting bug in `/api/transactions/transfer`
`backend/routes/transactions.js:38-39`

`amount` is taken straight from the request body with no type coercion. The UI sends a
`Number`, but the API is public:

```
sender.balance   -= "1"   →  100 - "1"  = 99      (numeric coercion)
receiver.balance += "1"   →   50 + "1"  = "501"   (string concat → cast to 501 on save)
```

A user with $100 sending `{"amount": "1"}` via curl turns a recipient's $50 into $501.
Repeatable, unbounded. **Verify your balances against deposit records before patching.**

**Fix:** coerce and validate every monetary input at the edge.
```js
const amount = Number(req.body.amount);
if (!Number.isFinite(amount) || amount <= 0) {
  return res.status(400).json({ msg: 'Invalid amount' });
}
```
Apply the same to `/deposit`, `/withdraw`, and `/stakes/purchase`. Best: an
`express-validator` chain — `body('amount').isFloat({ gt: 0 }).toFloat()`.

---

### 5. Server starts and serves traffic with no database
`backend/config/db.js:13` — `// process.exit(1);` is commented out.

On a connection failure the app logs a warning and keeps listening. Health checks pass, the
frontend loads, and every authenticated request 500s. Worse: `seedPlans` and the staking cron
also fail silently.

**Fix:** uncomment `process.exit(1)` and let the orchestrator restart. Add a
`mongoose.connection.on('disconnected', ...)` handler.

---

### 6. No frontend route protection
`client/src/App.jsx:71-82` — dashboard and `/admin` routes are unguarded.
`DashboardLayout.jsx:17` does `if (!token) return` and renders the shell anyway.

The admin UI is reachable by anyone at `/admin`. Data is protected server-side (the API 401s),
so this is not a data breach — but it exposes your entire admin surface, and an expired token
leaves users on a broken dashboard with no redirect and no way to re-auth.

**Fix:** a `<RequireAuth>` wrapper plus a global 401 interceptor.
```jsx
// client/src/main.jsx
axios.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
  return Promise.reject(err);
});
```
Gate `/admin` on `role === 'admin'` from `/api/auth/profile`.

---

## P1 — This week

### 7. Balance updates are not atomic — double-spend window
Every balance mutation is read-modify-write:
`transactions.js:38-42`, `transactionController.js:112`, `stakes.js:65 / 104`,
`admin.js:137 / 170 / 241`, `cron/stakingProcessor.js:46`.

Two concurrent withdrawal requests both read `balance = 100`, both pass the check, both write
`balance = 0`. The user withdraws $200. This is trivially exploitable with two parallel
requests and is the single most common way custodial apps get drained.

**Fix:** use conditional atomic updates.
```js
const updated = await User.findOneAndUpdate(
  { _id: userId, balance: { $gte: amount } },
  { $inc: { balance: -amount } },
  { new: true }
);
if (!updated) return res.status(400).json({ msg: 'Insufficient balance' });
```
For transfer (two accounts) use a MongoDB transaction — requires a replica set, which Atlas
provides by default.

---

### 8. Staking cron double-pays if you ever run more than one instance
`backend/cron/stakingProcessor.js:10`

`node-cron` runs inside the app process. Two containers = two crons = every user credited
twice per minute. There is no lock, no idempotency key, and no `lastPayoutId`. If you are on a
single dyno today, this is a landmine for the day you scale or a deploy overlaps.

Additional defects in the same loop:
- **`completesAt: null` matures instantly.** `now >= null` coerces to `now >= 0` → `true`
  (`:40`). A stake that reaches `active` without `completesAt` is paid out on the next tick.
- **`lastProcessedAt: null` pays out an enormous reward.** `effectiveNow - null` is
  milliseconds since epoch (`:20`) → `hoursPassed` ≈ 490,000.
- **`accruedRewards` is not zeroed** after the payout at `:41-57`.
- **Unbounded scan.** `find({ status: 'active' })` + per-doc `save()` every 60s.

**Fix:** guard with `completesAt: { $ne: null }` in the query, claim each stake atomically
(`findOneAndUpdate({ _id, status: 'active' }, { $set: { status: 'completing' } })`) before
crediting, and move the job to a dedicated worker or an external scheduler.

---

### 9. Stake state machine is inconsistent — cash-out route is dead code
`stakes.js:96` requires `status === 'matured'`, but the cron sets `'completed'` directly
(`stakingProcessor.js:57`). Nothing ever writes `'matured'`. `POST /api/stakes/:id/cashout` is
therefore unreachable. The `Staking` enum also carries both `cancelled` and `failed`, only one
of which is used.

**Fix:** pick one flow — auto-credit or manual cash-out — and delete the other. Prune the enum.

---

### 10. `send-email` is an authenticated open relay
`backend/routes/admin.js:354` — takes arbitrary `to`, `subject`, `message`, wraps them in your
branded template, and sends from your verified domain. No `requireAdminPin` (unlike every
other admin write), no recipient allowlist, no rate limit beyond the global 100/15min.

A compromised admin account becomes a phishing platform on your own sending reputation.

**Fix:** add `requireAdminPin`, restrict `to` to registered user emails, add a tight rate limit,
log every send.

---

### 11. No brute-force protection on login
The rate limiter (`server.js:23`) is one global bucket: 100 requests / 15 min / IP across all
of `/api`. That permits ~9,600 password guesses per day per IP, and legitimate dashboard
polling eats the same budget.

**Fix:**
```js
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 5, skipSuccessfulRequests: true });
router.post('/login', authLimiter, ...);
```
Add per-account failed-attempt tracking with a temporary lock. Note `app.set('trust proxy', 1)`
is set — verify it matches your actual proxy depth or the limiter keys on the wrong IP.

---

### 12. Missing `.dockerignore`
`Dockerfile:17` — `COPY . .` with no `.dockerignore` bakes your local `.env` (real SMTP
credentials, `MONGODB_URI`, `JWT_SECRET`), host `node_modules`, and `.git` into the image.
Anyone who can pull the image reads your production secrets.

**Fix:** create `.dockerignore`:
```
node_modules
client/node_modules
client/dist
.git
.env*
*.md
uploads
```

---

### 13. KYC uploads live on ephemeral container storage
`kyc.js:12` writes to `<project>/uploads`. The Dockerfile declares no volume. Every redeploy
destroys every KYC document already approved or awaiting review, while `kycStatus` stays
`verified` in Mongo — an unauditable compliance state.

**Fix:** mount a persistent volume, or move to S3/R2. Given finding #1, object storage with
signed URLs solves both at once.

---

### 14. No password reset — and the link is already live
`client/src/pages/Login.jsx:67` links to `/forgot-password`. That route does not exist in
`App.jsx`; users land on the 404 page. There is no reset endpoint at all. Any user who forgets
their password is permanently locked out of funds and must be handled manually.

Also missing: email verification (accounts are usable with unverified addresses), and 2FA —
`speakeasy` and `qrcode` are installed as production dependencies but imported nowhere.

---

## P2 — Soon

### 15. Money stored as JavaScript floats
`User.balance`, `Transaction.amount`, `Staking.amount/accruedRewards` are all `Number`
(IEEE-754). The cron adds a fractional `rewardSlice` every 60 seconds — after a 120-hour
Premium stake that is 7,200 float additions of drift. Ledgers will not reconcile to the cent.

**Fix:** store integer cents (`Number`, no decimals) or `mongoose.Schema.Types.Decimal128`.
This is a migration, so plan it — but the longer you wait the more rows need fixing.

### 16. Weak, collision-prone transaction reference IDs
`Transaction.js:34` — `Math.random().toString(36).substring(2, 15)` on a `unique` index. The
output is variable-length (trailing zeros are dropped), not uniformly random, and a collision
throws a duplicate-key error that surfaces to the user as a 500.
**Fix:** `default: () => crypto.randomUUID()` or `crypto.randomBytes(12).toString('hex')`.

### 17. CI is red and never deploys
- `jest`, `supertest`, and `cross-env` are in `node_modules` but **not declared in
  `package.json`**. `npm ci` in the workflow installs neither → `npm test` fails on every push.
- `backend/tests/auth.test.js` is stale: it omits `country` and `tetherWalletId`, which
  `routes/auth.js:13-14` now requires (→ 400, not 201), and asserts `res.body.user.username`
  which the controller never returns.
- The `deploy` job in `.github/workflows/deploy.yml:30-38` is entirely commented out. Whatever
  is in production did not come from this pipeline.
- `actions/checkout@v3` and `setup-node@v3` are two major versions behind.

**Fix:** `npm i -D jest supertest cross-env`, repair the three tests, uncomment or delete the
deploy job.

### 18. Helmet CSP disabled in production
`server.js:19` — `contentSecurityPolicy: false` with the comment *"Disabled for development,
enable in prod"*. It was never enabled. Combined with JWTs in `localStorage` (finding #21),
any injected script can exfiltrate every session token.

### 19. Mass assignment on staking plans
`admin.js:330` — `StakingPlan.create(req.body)`; `admin.js:343` — `findByIdAndUpdate(id,
req.body, { new: true })` **without `runValidators: true`**, so schema validation is skipped
entirely. An admin (or anyone with a stolen admin token) can set `returnPercent: 100000` or
`min: -1`. Whitelist the fields and add `runValidators`.

### 20. No admin audit trail
`PUT /api/admin/users/:id/balance` (`admin.js:96`) lets an admin set any balance to any value
with no record of who, when, or what the prior value was. For a custodial money app this is the
first thing an auditor — or a fraud investigation — will ask for. Add an append-only
`AdminAction` collection.

### 21. JWTs in `localStorage`, 30-day expiry, no revocation
`Login.jsx:16`. XSS-readable, no refresh rotation, and no way to invalidate a stolen token
short of rotating the global secret. A locked account still holds a valid token for 30 days —
`middleware/auth.js:22` re-checks `isLocked` on each request, which mitigates this, but only
for that one flag.
**Fix:** shorten to 24h with a refresh token in an `httpOnly` cookie, or add a `tokenVersion`
field on the user that the middleware compares against a claim.

### 22. Transfers create only one transaction record
`transactions.js:44` writes a single row against the sender. The recipient's balance changes
with no corresponding history entry — from their side, money appears from nowhere. Write two
records (or one with both `from` and `to`), and add `'transfer_in'` to the type enum.

### 23. Daily withdrawal limit counts rejected withdrawals
`transactionController.js:89-93` sums *all* withdrawals since midnight regardless of `status`.
A rejected withdrawal is refunded (`admin.js:170`) but still consumes the user's daily quota.
Add `status: { $ne: 'failed' }`. The window is also server-local midnight, not the user's.

### 24. `protect` does not verify the user still exists
`middleware/auth.js:19` — if the user was deleted, `req.user` is `null` and `next()` is still
called. Downstream `req.user._id` throws. Express 5 catches the async rejection, so it's a 500
rather than a crash, but the check belongs in the middleware. Also: the control flow reaches
`if (!token)` after a successful `next()` on some paths — restructure with early `return`s.

### 25. No pagination on admin list endpoints
`admin.js:19, 32, 45` — `find({})` over users, transactions, and stakes with a `.populate()`.
Fine at 200 users, a timeout at 20,000. Add `?page`/`?limit` and indexes on
`Transaction.user`, `Transaction.createdAt`, `Staking.user`, `Staking.status`.

---

## P3 — Hygiene

- **`sendAdminAlert` ignores `ADMIN_EMAIL`.** `utils/sendEmail.js:128` hardcodes
  `generatingpro.support@gmail.com`, while `authController.js:64` correctly uses the env var.
  Inconsistent, and one of them is wrong.
- **Admin email on every single login** (`authController.js:104`). At any real volume this is
  self-inflicted spam and will hurt your sender reputation. Alert on anomalies instead.
- **CORS allows `http://localhost:3000` in production** (`server.js:31`).
- **`multer` `fileFilter` trusts the client-supplied MIME type** (`kyc.js:30`). Verify magic
  bytes; a `.pdf` here is an arbitrary blob.
- **No global error handler or 404 handler.** Responses are inconsistent —
  `res.status(500).send('Server Error')` (plain text) in the controllers vs
  `res.json({ msg })` in the routes. The client's `err.response?.data?.msg` is `undefined` for
  the former, so users see a generic fallback.
- **`console.error(err)` everywhere.** No structured logging, no request IDs, no aggregation.
  Add `pino` and an error tracker (Sentry).
- **Node 18 is EOL** (April 2025) — `Dockerfile:2,10`. Move to `node:22-alpine`.
- **Dockerfile:** `npm install --production` should be `npm ci --omit=dev`; the container runs
  as root (add `USER node`); no `HEALTHCHECK`.
- **`speakeasy` + `qrcode`** are unused production dependencies — either wire up 2FA or drop
  them.
- **`.env.example` is out of date** — it lists 3 variables; the app reads 10.
- **`MONGO_URI` and `MONGODB_URI`** both appear in `.env`; only `MONGODB_URI` is read.
- **KYC approval doesn't check a document was submitted** (`admin.js:266`) — an admin can
  verify a user who never uploaded anything.
- **No `/api/health` endpoint** for load-balancer checks.
- **No terms/risk disclosure or unsubscribe link** — the plans advertise 10–50% returns in
  24–120 hours. Whatever the business model, fixed-return investment offerings carry
  jurisdiction-specific registration and disclosure obligations. Worth a lawyer's eye, not
  mine.

---

## Suggested order

1. Rotate `JWT_SECRET` and all SMTP credentials.
2. Patch #4 (transfer coercion) and #2 (hash leak) — one-line fixes, live exploits.
3. Take `/uploads` offline (#1), then rebuild it behind auth.
4. Audit `User.balance` against `Transaction` history for evidence of #4 or #7.
5. Add `.dockerignore` (#12), boot-time env validation (#3), `process.exit(1)` on DB failure (#5).
6. Frontend auth guard + 401 interceptor (#6).
7. Atomic balance updates (#7), then the cron hardening (#8).
8. Everything else.

Items 1–6 are a day's work and close every exploitable path.
