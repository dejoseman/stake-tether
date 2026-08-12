# Deploying these fixes

Read this before pushing. Several changes need action on your side, and two of
them will break the running app if you skip them.

---

## 1. Set the environment variables (required — the app won't boot without them)

The app now refuses to start rather than falling back to a hardcoded JWT secret
or serving traffic without a database.

```bash
# Generate a new secret
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Set on your host:

| Variable | Notes |
|---|---|
| `JWT_SECRET` | **Required.** Min 32 chars. Rotate it — the old fallback is in your git history. |
| `MONGODB_URI` | **Required.** |
| `APP_URL` | Used to build password reset links. e.g. `https://generatingpro.com` |
| `KYC_UPLOAD_DIR` | Point at a persistent volume. See §3. |
| `RUN_CRON` | `true` on exactly one instance, `false` everywhere else. See §4. |
| `TRUST_PROXY_HOPS` | Number of proxies in front of the app. Default 1. |

`.env.example` has the full list.

**Rotating `JWT_SECRET` logs every user out.** That is the correct outcome —
the old secret should be treated as compromised — but do it at a quiet hour and
consider warning users first.

---

## 2. Run the data migration

Existing records need small adjustments. Take a database snapshot first.

```bash
node backend/scripts/migrate.js           # dry run, writes nothing
node backend/scripts/migrate.js --apply   # apply
```

It backfills `tokenVersion` and `Staking.principal`, strips the `/uploads/`
prefix from stored KYC filenames, repairs active stakes with a null
`completesAt` or `lastProcessedAt`, rounds sub-cent float drift out of
balances, and builds the new indexes.

It also **reports** two things it deliberately does not fix, because both need
human judgement:

- **Negative balances.** Should be impossible now. Any that exist predate the
  atomicity fix and want investigating.
- **Transfers with no incoming ledger row.** Recipients of old transfers have
  money with no matching history entry. Reconstructing those rows would mean
  guessing the recipient, so the script only counts them.

---

## 3. Mount a volume for KYC documents

The container filesystem is ephemeral. Without a volume, every redeploy
destroys identity documents that have already been reviewed, while `kycStatus`
stays `verified` in the database — an unauditable state.

```yaml
volumes:
  - kyc-data:/app/uploads
```

Set `KYC_UPLOAD_DIR=/app/uploads` to match.

If documents have already been lost to past redeploys, the admin panel now
returns a clear "no longer available — ask the user to re-submit" message
rather than a broken link.

---

## 4. Run the staking cron on exactly one instance

The cron now claims each stake with an atomic compare-and-swap before crediting
anything, so a second instance is no longer catastrophic. It is still not a
substitute for configuring this properly:

```
RUN_CRON=true     # on one instance
RUN_CRON=false    # on every other instance
```

If you run a single container today, you can leave the default.

---

## 5. Set a new admin PIN

PIN rules changed: minimum 6 characters (was 4), and **changing it now requires
your account password**. Without that, a stolen session token was enough to set
a fresh PIN and then satisfy every PIN check with it.

Your existing PIN still works. To change it, go to Admin → Settings → Security.

The PIN is now also required for actions that previously did not ask for it:
changing deposit addresses, and sending email from the admin panel.

---

## 6. Verify after deploying

```bash
curl https://your-domain/api/health
# {"status":"ok","database":"connected","uptime":12}

# KYC documents must NOT be publicly readable
curl -I https://your-domain/uploads/some-known-filename.jpg
# must not return the image

# Admin endpoints must reject anonymous callers
curl -i https://your-domain/api/admin/users
# 401
```

Then, logged in as an admin, confirm: the KYC tab lists submissions, "View
Document" opens the file, and a manual balance edit requires a reason and shows
up in the audit log.

---

## What changed that users will notice

- **Password reset works.** `/forgot-password` was linked from the login page
  but the route didn't exist and there was no reset endpoint at all.
- **Sessions expire cleanly.** An expired token now redirects to login with an
  explanation instead of leaving a dashboard where every request silently fails.
- **Password rules are stricter** for new signups and resets: 8 characters
  minimum, with a letter and a number. Existing passwords are unaffected.
- **Accounts lock for 15 minutes** after 8 consecutive failed logins.
- **Login no longer emails the admin on every sign-in** — only admin logins and
  lockouts. At any volume the old behaviour was self-inflicted spam and was
  hurting your sender reputation.
- **The stake cash-out endpoint is gone.** It required a `matured` status that
  nothing ever wrote, so it was unreachable. Payout is automatic on maturity.

---

## Still outstanding

**Money is stored as floating-point numbers.** `round2()` now clamps every
write to cents, which bounds the drift, but the correct fix is integer cents or
`Decimal128`. That is a data migration with real risk, so it is deliberately not
bundled here.

**No email verification.** Accounts are usable with unverified addresses.

**2FA is not implemented** — per your instruction, the unused `speakeasy` and
`qrcode` dependencies were removed rather than wired up.

**The CI pipeline still does not deploy.** The job is left unconfigured rather
than sitting commented out and pretending to work. Note that `npm test` now
passes: `jest`, `supertest` and `cross-env` were used but never declared as
dependencies, so CI has been failing on every push.
