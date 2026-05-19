# Staging deploy runbook

Step-by-step to get the current `main` onto your staging environment,
apply the 7 new migrations, set the 5 new required env vars, and
confirm everything's green before cutting prod.

> **Assumption:** you already have a staging host somewhere (a VM, an
> EC2 instance, a Docker host). This repo ships Docker + PM2 configs
> but has **no deploy automation** in `.github/workflows/` — someone
> (you, your ops person, or an infra tool outside this repo) has to
> actually run these commands on the target host.

---

## 0. Pre-flight (on your laptop)

```bash
# Confirm main is clean and at the expected tip
git fetch origin main
git log --oneline origin/main -5
# Expected (today): 02752a4, b633e17, ae1f708, a8a8ab4, 25edfb4
```

Also sanity-check locally:

```bash
# Unit/service tests must be green before deploy
npm test                   # → 914/914
# Integration tests (optional, needs local MySQL + Redis)
npm run test:integration
```

---

## 1. Build the image

On the machine doing the deploy (laptop, CI runner, or the host itself):

```bash
# Tag with the short commit sha so rollback is trivial
SHA=$(git rev-parse --short origin/main)
docker build -t farmerpay-platform:$SHA -t farmerpay-platform:staging .
```

> ⚠️ **Known follow-up**: the `Dockerfile` pins `node:18-alpine` but
> CI runs Node 24 and CLAUDE.md calls for Node 20. Node 18 reached
> end-of-life (April 2025) and is deprecated. Bump to `node:20-alpine`
> or `node:24-alpine` in a separate PR before shipping to prod.

---

## 2. Push the image to your registry

If you use ECR / GCR / Docker Hub / internal registry:

```bash
docker tag farmerpay-platform:$SHA registry.example.com/farmerpay-platform:$SHA
docker tag farmerpay-platform:$SHA registry.example.com/farmerpay-platform:staging
docker push registry.example.com/farmerpay-platform:$SHA
docker push registry.example.com/farmerpay-platform:staging
```

---

## 3. Configure env vars on the staging host

Create or update `/etc/farmerpay/.env.staging` (or whatever your
platform uses — k8s Secret, ECS Task Definition, Vercel env, etc.).

### Required — app will not start without these in production

| Var | Purpose | Notes |
|-----|---------|-------|
| `NODE_ENV` | `production` | triggers the startup secret checks |
| `JWT_ACCESS_SECRET` | pre-existing; min 32 random chars | |
| `JWT_REFRESH_SECRET` | pre-existing; min 32 random chars | |
| `ENCRYPTION_KEY` | pre-existing; exactly 32 chars | |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | MySQL connection | |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | Redis connection | |
| **`FINACLE_WEBHOOK_SECRET`** | 🆕 HMAC secret for Finacle webhook verification | generate: `openssl rand -hex 32` |
| **`ADMIN_SESSION_SECRET`** | 🆕 Session cookie secret for admin UI | generate: `openssl rand -hex 32` |

### Required for gold-loan LTV endpoints (else 503)

| Var | Purpose | Notes |
|-----|---------|-------|
| **`IBJA_PRICE_22K`** | 🆕 22K gold spot price, ₹/g | must be 2000–20000 |
| **`IBJA_PRICE_24K`** | 🆕 24K gold spot price, ₹/g | must be 2000–20000 |
| `IBJA_PRICE_AS_OF` | optional; YYYY-MM-DD the prices were quoted | defaults to today; rejected if >2 days old |

### Optional

| Var | Purpose |
|-----|---------|
| `AA_STRICT_TIMESTAMP` | 🆕 set `true` in prod once every AA provider reliably sends a `x-event-timestamp` header |

### How to generate the secrets (openssl)

```bash
FINACLE_WEBHOOK_SECRET=$(openssl rand -hex 32)
ADMIN_SESSION_SECRET=$(openssl rand -hex 32)
```

Store these in your secret manager (AWS Secrets Manager, GCP Secret
Manager, HashiCorp Vault, or at minimum a `chmod 600`'d file on the
staging host). **Never commit them.**

### How to source the IBJA gold prices

Option A (fastest — manual, until a daily feed is wired):

```bash
# Today's IBJA rate from https://ibjarates.com/ or your broker
IBJA_PRICE_22K=7350
IBJA_PRICE_24K=8020
IBJA_PRICE_AS_OF=2026-04-19
```

Option B (correct long-term): stand up a cron/airflow/lambda that
polls IBJA/MCX and rewrites these env vars nightly. Out of scope for
this runbook but tracked as a flagged follow-up in PR #2.

---

## 4. Run the 7 new migrations

**Before** starting the app. The new models will crash on boot if
the schema is stale.

```bash
# Either inside the container (if Docker):
docker run --rm \
  --env-file /etc/farmerpay/.env.staging \
  registry.example.com/farmerpay-platform:staging \
  npm run db:migrate

# Or directly on the host (if PM2/bare node):
cd /opt/farmerpay-platform
NODE_ENV=production npm run db:migrate
```

Expected output ends with:

```
== 20260419000007-tighten-otp-code-length: migrated
== 20260419000008-dice-disbursement-idempotency: migrated
== 20260419000009-extend-consent-records: migrated
== 20260419000010-bank-import-idempotency: migrated
== 20260419000011-trust-decision-hash: migrated
== 20260419000012-trust-liability-uniqueness: migrated
== 20260419000013-aa-pending-data-fetch: migrated
```

### Rollback (if needed)

```bash
# Undoes one migration; run 7 times to fully revert
npm run db:migrate:undo
```

---

## 5. Start / restart the app

### Docker

```bash
docker-compose -f docker-compose.prod.yml --env-file /etc/farmerpay/.env.staging up -d
docker-compose ps                  # all services healthy?
docker-compose logs -f app          # watch the boot
```

### PM2

```bash
cd /opt/farmerpay-platform
pm2 start ecosystem.config.js --env production
pm2 logs farmerpay-platform --lines 50
```

Healthy boot prints:

```
FarmerPay API running on port 3000 [production]
Swagger docs: http://localhost:3000/api-docs
Health check: http://localhost:3000/health
```

If you see `Refusing to start: missing required secrets in production:
FINACLE_WEBHOOK_SECRET, ADMIN_SESSION_SECRET`, step 3 wasn't applied.

---

## 6. Smoke test

Run the smoke-test script against the staging URL:

```bash
STAGING_URL=https://staging.farmerpay.in ./scripts/smoke-test.sh
```

See `scripts/smoke-test.sh` for what it checks. All checks must pass
before calling the deploy good.

---

## 7. Rollback plan

If any check fails:

```bash
# Stop the new version
docker-compose -f docker-compose.prod.yml down
# OR: pm2 stop farmerpay-platform

# Re-deploy the previous image tag (keep at least 3 around)
docker-compose -f docker-compose.prod.yml \
  --env-file /etc/farmerpay/.env.staging \
  up -d

# If a migration is the problem, undo before restarting:
npm run db:migrate:undo     # run N times to undo N migrations
```

The 7 migrations in this release are each reversible (they all define
`down()`), but **`20260419000008-dice-disbursement-idempotency.js`**
adds a unique index that will fail to drop if duplicate rows exist —
vet the data first if you're reversing it after disbursements ran.

---

## 8. Things NOT in this runbook

- **Cutting to prod.** Staging smoke-test green is the gate; prod cut
  is a separate runbook with its own approval.
- **Background jobs.** RabbitMQ, cron jobs, and scheduled reports start
  automatically inside the app process — no separate wiring needed.
- **CDN / load balancer** — infrastructure that sits in front of the
  app is unchanged by this release.
- **Frontend dashboards** (dashboard, dashboard-sathi, dashboard-farmer,
  farmer-app) — deploy independently; not coupled to this backend
  release beyond the API contract.
