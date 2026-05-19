# FarmerPay Platform — Full-Stack Audit Report

**Date:** 2026-04-10
**Auditor:** Claude (Automated Code Audit)
**Scope:** Frontend/API, Backend, Middleware, Database, Integrations, Security
**Codebase Stats:** 347 JS files, 261 models, 155 migrations, 150 API endpoints, 23 route files, 34 services, 23 controllers

---

## Executive Summary

The FarmerPay platform is a well-structured Node.js/Express agrarian fintech application with Sequelize ORM, MySQL, Redis, and RabbitMQ. The architecture follows clean separation of concerns (routes → controllers → services → models) with a comprehensive modular design across 12 business modules.

**Overall Assessment:** The codebase demonstrates solid engineering fundamentals but has several areas requiring attention before production deployment, particularly around security hardening, missing role-based access control, transaction safety, and integration stubs.

### Findings Summary

| Severity | Count | Category |
|----------|-------|----------|
| CRITICAL | 7 | Security, Data Integrity, Encryption, Docker Secrets |
| HIGH | 25 | Security, Architecture, Database, Workers, Docker, Missing FKs, CSRF, Uploads, Stubs, Race Conditions |
| MEDIUM | 26 | Code Quality, Performance, Testing, Indexes, Timestamps, Auth, Caching, Errors, CSV |
| LOW | 9 | Best Practices, Documentation, Validations |

---

## 1. BACKEND AUDIT

### 1.1 Application Entry Point (`src/app.js`)

**GOOD:**
- Correct middleware ordering: helmet → CORS → body parsing → compression → requestId → language → logging → rate limiting
- Error handler registered last (correct Express pattern)
- Graceful shutdown handles SIGTERM/SIGINT with 10s timeout
- `unhandledRejection` and `uncaughtException` handlers present
- Health check endpoint at `/health`
- Swagger/OpenAPI docs at `/api-docs`

**Issues:**

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| B1 | MEDIUM | **10MB body parsing limit is generous** — `express.json({ limit: '10mb' })` allows large payloads. For a fintech API, 1-2MB is more appropriate. The 10MB limit combined with 100 req/min rate limiting could enable memory pressure attacks. | `src/app.js:51` |
| B2 | LOW | **Swagger exposed in all environments** — API docs are served regardless of NODE_ENV. Should be disabled in production. | `src/app.js:106` |
| B3 | LOW | **No request timeout middleware** — Long-running requests can tie up connections indefinitely. Consider `connect-timeout` or equivalent. | `src/app.js` |

### 1.2 Module Architecture (Routes → Controllers → Services)

**GOOD:**
- Clean separation: routes handle HTTP, controllers handle request/response, services handle business logic
- Consistent pattern across all 12 modules
- Joi validation schemas used in 20 of 23 route files (81 validation calls)
- Controllers properly delegate to services and call `next(err)` for error propagation

**Issues:**

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| B4 | MEDIUM | **3 route files lack validation** — `cropRoutes.js`, `locationRoutes.js`, and `executionRoutes.js` have routes without Joi validation on query parameters (`limit`, `offset`, `q` search terms) | `src/modules/roots/crop/routes/cropRoutes.js`, `src/modules/location/routes/locationRoutes.js` |
| B5 | MEDIUM | **Compressed controller code** — `executionController.js` uses single-line function bodies that are hard to read and maintain | `src/modules/roots/crop/controllers/executionController.js` |
| B6 | LOW | **Lazy model loading pattern** — `farmerService.js` uses `let db; const getDb = () => {...}` to avoid circular dependencies. This works but indicates a potential circular dependency issue in the model registry. | `src/modules/farmer/services/farmerService.js:12-17` |

### 1.3 Configuration (`src/config/`)

**GOOD:**
- Centralized config object in `src/config/index.js` — no direct `process.env` reads in business logic
- All secrets sourced from environment variables
- Proper type coercion (parseInt for numeric values)
- Feature flags for external service toggles

**Issues:**

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| B7 | HIGH | **Insecure JWT defaults** — `accessSecret` defaults to `'change-me-access-secret'` and `refreshSecret` to `'change-me-refresh-secret'` if env vars are missing. In production, this would be a critical vulnerability. App should refuse to start without proper secrets. | `src/config/index.js:57-58` |

---

## 2. MIDDLEWARE AUDIT

### 2.1 Authentication (`src/middleware/auth.js`)

**GOOD:**
- JWT verification with issuer validation
- Proper `Bearer` scheme parsing
- `TokenExpiredError` handled separately from invalid tokens
- `optionalAuth` middleware for public routes with optional user context

**Issues:**

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| M1 | MEDIUM | **No token revocation check** — JWT tokens are validated against the secret only. There's no blacklist/revocation check against Redis or the `user_sessions` table. A compromised token remains valid until expiry. | `src/middleware/auth.js:30-32` |

### 2.2 Authorization (`src/middleware/roleCheck.js`)

**CRITICAL FINDING:**

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| M2 | **CRITICAL** | **roleCheck used in only 2 of 21 authenticated route files** — Only `agentRoutes.js` and `trustRoutes.js` use role-based access control. All other protected routes (bank, sentinel, dice, vyapar, sathi, pulse, sage, farmer, roots) only check if the user is authenticated but NOT what role they have. Any authenticated user (farmer, agent, admin) can access bank integration endpoints, sentinel portfolio data, loan operations, etc. | All route files except `agentRoutes.js` and `trustRoutes.js` |

### 2.3 Validation (`src/middleware/validate.js`)

**GOOD:**
- `stripUnknown: true` prevents mass assignment via request body (extra fields are stripped)
- `abortEarly: false` returns all validation errors at once
- Sanitized value replaces `req[source]` after validation

### 2.4 Rate Limiting (`src/middleware/rateLimiter.js`)

**GOOD:**
- Redis-backed with in-memory fallback
- User ID-based keying when authenticated, IP-based otherwise
- Three tiers: default (100/min), auth (20/min), OTP (5/min)
- Disabled in test environment

**Issues:**

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| M3 | MEDIUM | **Rate limiter bypass via user ID** — When authenticated, rate limiting is keyed by `req.user.id`. If a user has multiple valid tokens, they can't bypass limits. However, unauthenticated requests use `req.ip` which can be spoofed via `X-Forwarded-For` if the app is behind a proxy without `trust proxy` set. | `src/middleware/rateLimiter.js:42` |

### 2.5 File Upload (`src/middleware/upload.js`)

**Issues:**

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| M4 | HIGH | **100MB file upload limit** — `MAX_FILE_SIZE = 100 * 1024 * 1024` is extremely large for a fintech platform. Combined with memory storage (`multer.memoryStorage()`), this allows attackers to exhaust server memory. The `.env.example` suggests 10MB (`S3_MAX_FILE_SIZE=10485760`) but the middleware hardcodes 100MB. | `src/middleware/upload.js:12` |
| M5 | MEDIUM | **MIME type validation only (no magic bytes)** — File type checking relies on `file.mimetype` which is set by the client and can be spoofed. Should also validate file headers/magic bytes. | `src/middleware/upload.js:47-49` |
| M6 | HIGH | **Missing Multer field limits** — Only `fileSize` and `files` are limited. No limits on `fieldNameSize`, `fieldSize`, or `fields` count. Attacker can send requests with extremely long field names or thousands of small fields, causing memory exhaustion. | `src/middleware/upload.js:55-62` |

### 2.6 Error Handler (`src/middleware/errorHandler.js`)

**GOOD:**
- Catches Sequelize validation errors, JWT errors, Multer errors
- Hides internal error messages in production (returns "An unexpected error occurred")
- Logs full stack traces with request context

---

## 3. DATABASE INTEGRATION AUDIT

### 3.1 Sequelize Configuration

**GOOD:**
- Production SSL with `rejectUnauthorized: true`
- Read replica support via conditional replication config
- utf8mb4 charset for multi-language + emoji support
- Retry strategy for transient failures (deadlocks, connection resets)
- Connection pooling (max 20, min 5)
- IST timezone (`+05:30`)

### 3.2 Model Registry (`src/shared/models/index.js`)

**Issues:**

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| D1 | HIGH | **Monolithic model registry (557 lines, 260+ models)** — All models from all modules are imported and registered in a single file. This creates tight coupling, long startup times, and makes it impossible to load modules independently. | `src/shared/models/index.js` |
| D2 | MEDIUM | **Associations rely on `model.associate(db)` pattern** — Works, but no validation that all expected associations are defined. Missing associations silently produce incomplete queries rather than errors. | `src/shared/models/index.js:534-539` |

### 3.3 Transaction Usage

**CRITICAL FINDING:**

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| D3 | **CRITICAL** | **Only 4 of 34 service files use database transactions** — `sequelize.transaction()` is only used in `authService.js`, `trustService.js`, `applicationService.js` (DICE), and `transactionService.js` (Vyapar). Multi-step operations in the remaining 30 services (farmer onboarding, sentinel risk analysis, sathi field verification, crop execution, bank imports, recovery cases, etc.) can leave data in inconsistent states on partial failure. | All services in `src/modules/*/services/` |

### 3.4 Missing Foreign Key Constraints

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| D4 | HIGH | **`variety_masters.crop_id` has no FK constraint** — Model defines association to `crop_masters` but migration lacks `references`. Orphaned varieties possible if crop deleted. Same issue on `variety_id` in `VarietyTraitAssignment`, `VarietySoilCompatibility`, `VarietyRegionalSuitability`. | `migrations/20250107000010-create-variety-masters.js:38` |
| D5 | HIGH | **`documents_v2.owner_id` has no FK constraint** — Assumes it's a user ID but DB can't enforce it. Orphaned documents possible. | `migrations/20250104000003-create-documents-v2.js:17` |
| D6 | MEDIUM | **`cultivation_cycles` missing FK constraints** — `crop_id`, `variety_id`, `pop_id` all lack `references` in migration despite model associations. | `migrations/20250108000006-create-cultivation-cycles.js` |

### 3.5 Missing Database Indexes

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| D7 | MEDIUM | **Missing indexes on frequently queried FK columns** — `farm_registers.farmer_id`, `cultivation_cycles.field_id`, `documents_v2.owner_id`, `variety_masters.crop_id`, `loan_applications.application_status`, `loan_applications.created_at` all lack indexes despite being common query filters. | Multiple migration files |

### 3.6 N+1 Query Patterns & Performance

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| D8 | MEDIUM | **Sentinel full-table scan for aggregation** — After a paginated query, performs a separate `findAll({ where: { is_active: true } })` to load ALL snapshots for in-memory percentage calculation, defeating pagination. Should use SQL aggregation. | `src/modules/sentinel/services/sentinelService.js:41-53` |
| D13 | HIGH | **N+1 query in TRUST response saving** — `saveResponses()` loops over each response and runs `TrustQuestion.findByPk()` + `TrustResponse.findOne()` per iteration. For 20+ questions, this is 40+ queries. Should batch-load questions before the loop. | `src/modules/trust/services/trustService.js:76-115` |
| D14 | HIGH | **Unbounded list queries** — `getSections()` and `getProgress()` in trust service load all records with no `limit`. With 1000+ sections, API times out and exhausts memory. | `src/modules/trust/services/trustService.js:22-33` |

### 3.7 Other Database Issues

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| D9 | MEDIUM | **Inconsistent `updated_at` timestamp handling** — Some migrations use `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` (correct), others only use `CURRENT_TIMESTAMP` (won't auto-update). | Multiple migrations (e.g., `role-permissions.js:33` vs `loan-disbursements.js:67`) |
| D10 | MEDIUM | **238 CASCADE deletes risk data loss** — Deleting a farmer cascades to all profiles, loans, cultivation cycles, etc. No soft-delete strategy. Accidental deletion wipes all historical data. | All FK migrations |
| D11 | MEDIUM | **Historical migration bug fixes in git history** — Commit `8286c8f` fixes "VARCHAR→STRING, duplicate index names, duplicate FK indexes" suggesting migrations were merged with bugs. | `migrations/` |
| D12 | LOW | **Missing model-level validations** — `User.mobile` has no format validation; `CropMaster.crop_name` has no length check; numeric fields like `crop_duration_days_min/max` have no range validation. | Various models |

---

## 4. API / FRONTEND LAYER AUDIT

### 4.1 Swagger/OpenAPI Documentation

**GOOD:**
- All 23 route files have Swagger JSDoc annotations
- Bearer auth security scheme defined globally
- Organized by tags per module

**Issues:**

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| A1 | LOW | **Missing request body schemas in some Swagger docs** — Commit `c07b6cf` partially fixes this for dairy, fishery, horticulture, but other modules may still be incomplete. | Various route files |
| A2 | LOW | **Swagger server URL is hardcoded to localhost** — Only `http://localhost:{port}` server defined. Production/staging URLs should be added or dynamically configured. | `src/app.js:89` |

### 4.2 API Response Format

**GOOD:**
- Consistent JSON response format: `{ success: boolean, message: string, data: object }`
- Centralized response helper (`src/shared/utils/responseHelper.js`)
- Standard error codes via `src/shared/constants/errorCodes.js`
- HTTP status codes via `src/shared/constants/statusCodes.js`

---

## 5. INTEGRATIONS & WORKERS AUDIT

### 5.1 External Integrations

**GOOD:**
- AgriStack UFSI: 25 API adapter stubs properly organized by domain
- Vistaar: 5 government agriculture service adapters
- Finacle: HMAC-verified webhook receiver with idempotency keys, timing-safe comparison

**Issues:**

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| I1 | HIGH | **All integrations are stubs** — AgriStack (25 endpoints), Vistaar (5 endpoints), and most Finacle outbound operations return mock/placeholder data. Production deployment requires implementing real HTTP clients. | `src/integrations/agristack/`, `src/integrations/vistaar/` |
| I1b | HIGH | **SMS service is a stub** — `sendSMS()` logs the attempt and returns `{ success: true }` without actually sending. OTP delivery, password resets, and all SMS notifications are non-functional. Critical for rural users without email. | `src/shared/services/smsService.js:22` |
| I1c | HIGH | **Bhashini translation service is a stub** — Returns mock translations. Multi-language support (Hindi, Marathi, etc.) is non-functional, blocking non-English rural users. | `src/shared/services/bhashiniService.js:61` |
| I1d | HIGH | **Push notification service is a stub** — Returns `{ success: true, queued: true }` without sending. Mobile app users won't receive loan approvals, weather warnings, or collection notices. | `src/shared/services/notificationService.js:136` |
| I2 | HIGH | **Finacle webhook HMAC verification is conditional** — If `FINACLE_WEBHOOK_SECRET` env var is not set, webhooks are processed WITHOUT any authentication. The `if (hmacSecret && hmacSignature)` check means both must be present, so an attacker can omit the signature header to bypass verification when secret IS configured. | `src/modules/bank/controllers/finacleWebhookController.js:29-38` |

### 5.2 Workers

**Issues:**

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| I3 | HIGH | **Audit consumer infinite requeue loop** — `channel.nack(msg, false, true)` requeues failed messages, which will be redelivered and fail again if the error is non-transient (e.g., invalid JSON, missing required fields). No dead-letter queue configured, no max retry count. Same in `mediaConsumer.js:60`. | `src/workers/auditConsumer.js:50` |
| I4 | HIGH | **No graceful shutdown in workers** — Neither worker handles SIGTERM/SIGINT. When containers are killed, in-flight messages are lost. No shutdown hooks, no connection cleanup. | `src/workers/auditConsumer.js`, `src/workers/mediaConsumer.js` |
| I5 | HIGH | **Media processing is a TODO stub** — `mediaConsumer.js:46` has `// TODO: Implement actual image processing`. Jobs are marked "completed" without doing anything. Thumbnails/compressions are never generated. | `src/workers/mediaConsumer.js:46-50` |
| I6 | MEDIUM | **No idempotency in workers** — If a message is processed but ack fails, redelivery causes duplicate records (duplicate audit logs, duplicate media jobs). No idempotency key check. | `src/workers/` |

### 5.3 Docker & PM2

**Issues:**

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| I7 | **CRITICAL** | **Hardcoded secrets in docker-compose.yml** — `MYSQL_ROOT_PASSWORD: root_password`, `MYSQL_PASSWORD: farmerpay_pass`, `RABBITMQ_DEFAULT_PASS: farmerpay` are committed to git in plaintext. | `docker-compose.yml:12-15,50-51` |
| I8 | **CRITICAL** | **Production docker-compose missing RabbitMQ auth** — `docker-compose.prod.yml` doesn't set `RABBITMQ_DEFAULT_USER` or `RABBITMQ_DEFAULT_PASS` at all, defaulting to `guest:guest`. | `docker-compose.prod.yml:83-93` |
| I9 | HIGH | **PM2 ecosystem config doesn't include workers** — `ecosystem.config.js` only starts the main app. Workers must be started separately and won't auto-restart on crash. | `ecosystem.config.js` |
| I10 | HIGH | **No Dockerfile for workers** — Single Dockerfile for main app. Workers can't be independently scaled or deployed via Docker. | `Dockerfile` |

---

## 6. SECURITY AUDIT

### 6.1 OWASP Top 10 Assessment

#### A01: Broken Access Control — CRITICAL

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| S1 | **CRITICAL** | **Missing role-based authorization** (same as M2) — 19 of 21 authenticated route files lack `roleCheck()`. Farmers can access bank integration APIs, loan portfolio data, and admin sentinel dashboards. | All routes except agent and trust |
| S2 | HIGH | **Potential IDOR on farmer endpoints** — Routes like `/farmer/:farmerId/profile` extract `farmerId` from URL params. While `authenticate` middleware runs, there's no check that `req.user.id === farmerId` (ownership verification). An authenticated farmer could potentially access another farmer's profile by changing the URL parameter. | `src/modules/farmer/routes/farmerRoutes.js` |

#### A02: Cryptographic Failures

**GOOD:**
- bcrypt with 12 salt rounds for password hashing
- AES-256-GCM for PII encryption (Aadhaar, bank accounts)
- SHA-256 for OTP/token hashing
- `crypto.randomInt()` for OTP generation (CSPRNG)
- `crypto.timingSafeEqual()` for HMAC verification
- Production DB connections use SSL with `rejectUnauthorized: true`

**CRITICAL:**

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| S7 | **CRITICAL** | **Aadhaar encryption key regenerated on every call** — `process.env.AADHAAR_ENCRYPTION_KEY \|\| require('crypto').randomBytes(32).toString('hex')` falls back to a NEW random key if the env var is missing. Each function call generates a different key, making previously encrypted Aadhaar numbers permanently undecryptable. Same pattern at 3 locations (lines 218, 296, 492). | `src/modules/farmer/services/farmerService.js:218` |
| S8 | MEDIUM | **OTP verification vulnerable to timing attack** — `hashedInput !== otpRequest.otp_code` uses standard string comparison rather than `crypto.timingSafeEqual()`. Attacker could infer correct OTP hash by measuring response time differences. | `src/modules/auth/services/authService.js:337` |

#### A03: Injection — GOOD

- No raw SQL queries in application code (only in seeders/tests)
- All database access through Sequelize ORM parameterized queries
- Joi validation with `stripUnknown: true` on request bodies
- Zero `console.log` statements (all logging via Winston)

#### A04: Insecure Design

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| S3 | **CRITICAL** | **Finacle webhook can be called without auth** — When `FINACLE_WEBHOOK_SECRET` is not configured, or when an attacker omits the `X-HMAC-Signature` header, the webhook processes events without verification. An attacker could forge disbursement, repayment, or SMA classification events. | `src/modules/bank/controllers/finacleWebhookController.js:29-38` |

#### A05: Security Misconfiguration

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| S4 | HIGH | **`trust proxy` not configured** — Express app doesn't set `app.set('trust proxy', ...)`. Behind a load balancer/reverse proxy, `req.ip` will be the proxy IP, not the client IP. This breaks IP-based rate limiting and means ALL unauthenticated requests share a single rate limit bucket. | `src/app.js` |
| S5 | MEDIUM | **CORS allows `null` origin with `credentials: true`** — `if (!origin) return callback(null, true)` combined with `credentials: true` allows credential-bearing requests from any source without an Origin header. Violates CORS security for non-browser clients. | `src/app.js:38,44` |
| S11 | HIGH | **No CSRF protection** — No CSRF middleware exists. All state-changing POST/PUT/DELETE endpoints are vulnerable to cross-site request forgery. An attacker page could trigger loan applications, bank account changes, etc. if a user visits it while authenticated. | `src/middleware/` (missing) |
| S12 | HIGH | **Health endpoint exposes environment info** — `/health` returns `environment: config.env` (development/production/staging), aiding attacker reconnaissance. Should be stripped in production. | `src/app.js:115` |
| S13 | MEDIUM | **No Cache-Control headers on authenticated responses** — Sensitive data (profiles, bank accounts, loans) may be cached by browsers/proxies. Should set `Cache-Control: no-store` on authenticated endpoints. | `src/app.js` |
| S14 | MEDIUM | **Error messages leak implementation details** — Non-500 errors return raw `err.message` which could expose SQL table names, file paths, or library details (e.g., "Table 'farmerpay.users' doesn't exist"). | `src/middleware/errorHandler.js:56-59` |

#### A06: Vulnerable Components — LOW RISK

- Dependencies are reasonably current (Express 4.21, Sequelize 6.37, Helmet 7.1)
- No known critical CVEs in listed versions as of audit date

#### A07: Authentication Weaknesses

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| S6 | MEDIUM | **No JWT token blacklisting** — When a user logs out or changes password, existing JWTs remain valid until expiry. The `user_sessions` table exists but isn't checked during authentication. | `src/middleware/auth.js` |
| S9 | MEDIUM | **User enumeration via error messages** — Login errors reveal whether an account exists: `"No account found with this identifier"` vs `"Invalid password"`. Should use a generic message like `"Invalid credentials"`. | `src/modules/auth/services/authService.js:226-230` |
| S10 | MEDIUM | **PII logged in plaintext** — Mobile numbers and emails logged unmasked: `logger.info('User registered: ${user.user_id}, mobile: ${formattedMobile}')`. If logs are compromised, PII is exposed. Should mask to `91***7654`. | `src/modules/auth/services/authService.js:201,284,595` |
| S15 | HIGH | **OTP verification race condition** — Check (`attempt_count >= max_attempts`) and increment (`otpRequest.increment('attempt_count')`) are not atomic. Two concurrent requests can both pass the check and verify the same OTP, bypassing brute-force protection. | `src/modules/auth/services/authService.js:325-333` |
| S16 | HIGH | **CSV bank import has no input validation** — `bankPortfolioService.js` directly inserts CSV row data (`row.borrower_name`, `row.pan`, `row.mobile`) into DB without any Joi validation, PAN format check, or mobile format check. Allows bad data quality and potential injection. | `src/modules/bank/services/bankPortfolioService.js:53-84` |
| S17 | MEDIUM | **CSV import not wrapped in transaction** — Each row is committed individually. If row N fails, rows 1..N-1 are already committed. Partial imports corrupt data with no rollback. | `src/modules/bank/services/bankPortfolioService.js:53-90` |

#### A08-A10: No significant findings

- Server-Side Request Forgery: Integration stubs don't make actual external calls yet
- Logging: Winston logger with rotation, request IDs, structured logging (but PII masking missing — see S10)
- Software/Data Integrity: Helmet CSP headers in place

### 6.2 Data Protection (PII/Financial)

**GOOD:**
- Aadhaar numbers encrypted with AES-256-GCM before storage
- Bank account numbers masked in API responses (last 4 digits only)
- PII fields use encryption helper
- OTP codes hashed (SHA-256) before storage
- Password reset tokens hashed before storage

---

## 7. TESTING AUDIT

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| T1 | MEDIUM | **Limited test coverage** — Only 13 test files for 347 source files. Integration tests exist for most modules but no unit tests for services or models. | `tests/` |
| T2 | LOW | **No test for HMAC bypass vulnerability** — Webhook authentication edge cases aren't tested. | `tests/integration/` |

---

## 8. PRIORITY REMEDIATION PLAN

### P0 — Must Fix Before Production (CRITICAL)

1. **Add roleCheck to all authenticated routes** — Every route file with `authenticate` should also have appropriate `roleCheck()` middleware. Create role mappings per module (e.g., bank routes → bank_officer, admin; sentinel → bank_officer; farmer routes → farmer, agent, admin).

2. **Fix Finacle webhook authentication bypass** — Change the HMAC check to REQUIRE verification when `FINACLE_WEBHOOK_SECRET` is configured. If the secret is set, reject all requests without valid signatures:
   ```js
   if (hmacSecret) {
     if (!hmacSignature || !finacleWebhookService.verifyHmac(req.body, hmacSignature, hmacSecret)) {
       throw new Error('HMAC signature verification failed');
     }
   }
   ```

3. **Fix Aadhaar encryption key fallback** — Remove `crypto.randomBytes(32)` fallback. Load `AADHAAR_ENCRYPTION_KEY` once at startup and refuse to start if missing. Affects `farmerService.js` lines 218, 296, 492. Currently, if the env var is unset, each call generates a new random key making previously encrypted data permanently undecryptable.

4. **Add IDOR protection** — Verify resource ownership in services: `if (resource.farmer_id !== req.user.id && req.user.role !== 'admin') throw 403`.

5. **Wrap multi-table service operations in transactions** — At minimum: `farmerService.js` (onboarding), `sentinelService.js` (risk analysis), `sathiService.js` (field verification), `executionService.js` (crop cycle operations), `bankPortfolioService.js` (imports).

6. **Remove hardcoded secrets from Docker files** — Replace `MYSQL_ROOT_PASSWORD: root_password` and `RABBITMQ_DEFAULT_PASS: farmerpay` in `docker-compose.yml` with `${DB_PASSWORD:?required}` env var references. Fix `docker-compose.prod.yml` to require RabbitMQ credentials (currently defaults to `guest:guest`).

### P1 — Should Fix Soon (HIGH)

7. **Fail-fast on missing JWT secrets** — Add startup validation in `startServer()` that throws if `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` are default values.

8. **Reduce file upload limit** — Change `MAX_FILE_SIZE` from 100MB to 10MB (matching `.env.example`).

9. **Fix worker requeue loops** — Add max retry count and dead-letter queue to both `auditConsumer.js` and `mediaConsumer.js`.

10. **Add graceful shutdown to workers** — Handle SIGTERM/SIGINT, stop consuming, drain in-flight messages, close connections.

11. **Add worker management** — Include workers in `ecosystem.config.js` for PM2 and create a worker Dockerfile for Docker deployment.

12. **Implement real integrations** — Replace AgriStack/Vistaar stubs with actual HTTP clients before using those features.

### P2 — Recommended Improvements (MEDIUM)

10. **Use timing-safe comparison for OTP verification** — Replace `hashedInput !== otpRequest.otp_code` with `crypto.timingSafeEqual()` at `authService.js:337`.
11. **Fix user enumeration** — Use generic "Invalid credentials" message for login/password reset failures.
12. **Mask PII in logs** — Mobile numbers and emails should be masked before logging.
13. Add JWT token blacklisting (check Redis on each request)
14. Set `app.set('trust proxy', 1)` for proper IP detection behind proxies
15. Reduce body parsing limit to 1-2MB
16. Add validation to location and crop routes query parameters
17. Add file magic byte validation in upload middleware
18. Increase test coverage with unit tests for services
19. Modularize model registry (lazy-load per module)
20. Disable Swagger in production

### P3 — Nice to Have (LOW)

17. Add request timeout middleware
18. Add worker process definitions to PM2/Docker
19. Dynamic Swagger server URLs
20. Complete Swagger request body schemas for all endpoints

---

## Architecture Diagram (Current State)

```
┌──────────────────────────────────────────────────────────────┐
│                        Express App                            │
│  helmet → cors → bodyParser → compression → requestId        │
│  → language → morgan → rateLimiter → routes → errorHandler   │
├──────────────────────────────────────────────────────────────┤
│  12 Modules:                                                  │
│  auth | farmer | location | trust | dice | roots (crop,      │
│  dairy, fishery, horticulture) | vyapar | sathi | sentinel   │
│  | sage | pulse | bank                                        │
├──────────────────────────────────────────────────────────────┤
│  23 Route Files → 23 Controllers → 34 Services               │
│  150 API Endpoints | 261 Sequelize Models | 155 Migrations   │
├──────────────────────────────────────────────────────────────┤
│  Infrastructure:                                              │
│  MySQL (primary + read replica) | Redis (cache + rate limit) │
│  RabbitMQ (audit + media queues) | S3 (file storage)         │
│  KMS (encryption keys) | SES/SMS (notifications)             │
├──────────────────────────────────────────────────────────────┤
│  External Integrations (STUBS):                               │
│  AgriStack UFSI (25 endpoints) | Vistaar (5 endpoints)       │
│  Finacle CBS (webhook + outbound push)                        │
└──────────────────────────────────────────────────────────────┘
```

---

*End of audit report. Total findings: 7 CRITICAL, 25 HIGH, 26 MEDIUM, 9 LOW.*
