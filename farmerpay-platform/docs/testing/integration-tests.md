# Backend integration tests

Integration tests under `tests/integration/` exercise full-stack flows
against a real MySQL + Redis. They're **excluded from the default
`npm test` run** because CI's default Test Backend matrix doesn't
reliably provide the DB — running them there produced 114 failures
(all `SequelizeAccessDeniedError`) that masked the real unit-test
signal.

## Default (unit + service) tests

```bash
npm test                # runs everything outside tests/integration/
npm run test:watch      # same, watch mode
```

Expected: **914 tests, all green, coverage report generated.**

## Integration tests

```bash
npm run test:integration
```

Requires MySQL 8 and Redis 7 running and reachable.

### Quick local setup (docker)

```bash
docker run -d --name farmerpay-mysql \
  -e MYSQL_ROOT_PASSWORD=test \
  -e MYSQL_DATABASE=farmerpay_test \
  -p 3306:3306 mysql:8

docker run -d --name farmerpay-redis \
  -p 6379:6379 redis:7

# Apply schema + seed reference data against the test DB
DB_USER=root DB_PASSWORD=test DB_NAME=farmerpay_test \
  npm run db:migrate

DB_USER=root DB_PASSWORD=test DB_NAME=farmerpay_test \
  npm run db:seed

# Run integration tests
DB_USER=root DB_PASSWORD=test DB_NAME=farmerpay_test \
REDIS_URL=redis://localhost:6379 \
  npm run test:integration
```

### Env cheatsheet

| Var | Default | CI value |
|-----|---------|----------|
| `DB_HOST` | `10.218.164.140` | `localhost` |
| `DB_PORT` | `3306` | `3306` |
| `DB_USER` | `farmerpay` | `root` |
| `DB_PASSWORD` | empty | `test` |
| `DB_NAME` | `farmerpay_dev` | `farmerpay_test` |
| `REDIS_URL` | `redis://localhost:6379` | `redis://localhost:6379` |
| `NODE_ENV` | `development` | `test` |

## Known outstanding work

- The `test-backend` job in `.github/workflows/ci.yml` still runs
  `npm test` (which is now unit-only) and *should* also run
  `npm run test:integration` against the in-workflow MySQL service
  once migrations are wired into the job.
- Today's CI run against the MySQL service was failing because
  migrations never ran — the DB had no tables. The integration
  tests will pass once `npm run db:migrate` is added to the
  `test-backend` steps before `npm run test:integration`.
- Coverage thresholds in `jest.config.js` are pinned to today's
  baseline (75/53/77/65) so CI catches regressions. Raise them as
  integration tests move into unit tier and new branches get covered.

## Why this split exists

| Concern | Default (`npm test`) | Integration (`npm run test:integration`) |
|---------|----------------------|------------------------------------------|
| Needs real DB | No | Yes |
| Needs Redis | No | Yes |
| Runs on every commit in CI | Yes | No (until CI is wired) |
| Can run on a laptop with no setup | Yes | No |
| Failure means | real regression | infra problem *or* regression |

The goal is that CI's green/red signal on `npm test` actually
reflects whether the code is broken, not whether a container is
running.
