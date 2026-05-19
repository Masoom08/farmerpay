# FarmerPay Production Readiness Checklist

## Security

- [ ] All passwords hashed (bcrypt cost 12)
- [ ] JWT secrets rotated (not hardcoded) — use AWS Secrets Manager
- [ ] AWS KMS configured for data encryption (Aadhaar Level 4, bank accounts Level 3)
- [ ] SSL/TLS enabled (HTTPS via ALB/CloudFront)
- [ ] CORS allowlist configured (no wildcard origins)
- [ ] Rate limiting deployed (100 req/min default, 5 req/min OTP)
- [ ] Input validation (Joi) on every endpoint
- [ ] SQL injection prevented (Sequelize parameterized queries)
- [ ] XSS protection (Helmet middleware)
- [ ] PII encryption verified: Aadhaar, bank accounts, mobile in logs redacted
- [ ] API keys secured via AWS IAM, not in codebase
- [ ] `.env` excluded from git (`.gitignore` verified)
- [ ] Secrets rotation schedule: JWT (90 days), DB password (90 days), S3 keys (180 days)

## Database

- [ ] Production database created (MySQL 8.0+, RDS recommended)
- [ ] All migrations run: `npx sequelize-cli db:migrate --env production`
- [ ] Indexes verified on foreign keys and frequently queried columns
- [ ] Backup strategy: daily automated snapshots (RDS), 30-day retention
- [ ] Read replicas configured for reporting queries
- [ ] Connection pooling: min 5, max 20 connections
- [ ] Timezone: `+05:30` (IST) in Sequelize config
- [ ] Charset: `utf8mb4` for multi-language support
- [ ] Slow query log enabled (threshold: 1 second)
- [ ] Table count: 150+ tables across 10 modules

## Logging and Monitoring

- [ ] Winston logging configured (JSON format for production)
- [ ] Daily log rotation (winston-daily-rotate-file, 30-day retention)
- [ ] PII redacted from logs (no Aadhaar, bank accounts, passwords)
- [ ] CloudWatch or DataDog connected for centralized logging
- [ ] Alarms configured:
  - Database connection failures
  - Error rate > 5% over 5 minutes
  - Response time p95 > 1 second
  - Disk usage > 80%
  - Memory usage > 85%
- [ ] APM running (DataDog APM or AWS X-Ray)
- [ ] Error tracking (Sentry) configured with source maps

## APIs

- [ ] Swagger docs deployed at `/api-docs`
- [ ] OpenAPI 3.0 JSON exported: `node scripts/exportOpenApi.js`
- [ ] Postman collection shared with team (`docs/farmerpay-postman-collection.json`)
- [ ] API versioning: all routes under `/api/v1/`
- [ ] Response format standardized: `{ success, message, data, meta }`
- [ ] Error codes documented and consistent (AUTH_001, VAL_001, RES_001, etc.)
- [ ] Pagination: `limit`/`offset` on all list endpoints (max 100)
- [ ] Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`
- [ ] Language support: `X-Language` header for 11 Indian languages

## Infrastructure

- [ ] Node.js 18+ in production mode (`NODE_ENV=production`)
- [ ] PM2 configured: `pm2 start ecosystem.config.js`
- [ ] Graceful shutdown: 30-second timeout on SIGTERM
- [ ] Health check: `GET /health` returns uptime, timestamp, service name
- [ ] Load balancer configured (ALB with health check path `/health`)
- [ ] Environment variables via `.env` or AWS Parameter Store
- [ ] Docker image built and tested
- [ ] Docker registry: ECR or DockerHub
- [ ] Redis: ElastiCache (production), separate DB index for sessions

## Testing

- [ ] All 12 integration test suites passing: `npm test`
- [ ] Code coverage > 80% (lines/statements)
- [ ] Load testing: 1000 concurrent users (k6 or Artillery)
- [ ] Security testing: OWASP Top 10 scan
- [ ] Database migration rollback tested
- [ ] Seed data loaded for reference tables

## Data

- [ ] LGD location data: all states, districts, blocks, villages
- [ ] Master crop/variety/input data loaded (ROOTS)
- [ ] Advisory types seeded (SAGE): weather_alert, pest_disease_alert, etc.
- [ ] Roles and permissions seeded (RBAC)
- [ ] Loan provider types and sample products (DICE)
- [ ] Sample commodity and mandi data (PULSE)

---

## Module Table Count Summary

| Module | Tables | Status |
|--------|--------|--------|
| Shared Platform (Language, Document, Media, Audit, Notification) | 19 | Ready |
| Auth (User, Role, Permission, Session) | 9 | Ready |
| Location (LGD States, Districts, Blocks, Villages) | 8 | Ready |
| Farmer (Profile, Address, Bank, KYC, Onboarding) | 13 | Ready |
| Trust (Sections, Questions, Responses, Scores, Appeals) | 13 | Ready |
| DICE (Providers, Products, Applications, Repayments) | 19 | Ready |
| ROOTS Crop (Farms, Fields, Cycles, Tasks, Harvests) | 54 | Ready |
| ROOTS Dairy (Herds, Animals, Production, Quality) | 13 | Ready |
| ROOTS Fishery (Ponds, Species, Harvests, Water Quality) | 10 | Ready |
| Vyapar (Vendors, Shops, Catalogs, KYC) | 5+ | Ready |
| SATHI (Tasks, Evidence, Sync, Verifications, CRP) | 16 | Ready |
| Sentinel (Health, SMA, EWS, Recovery, Portfolio) | 19 | Ready |
| SAGE (Advisories, Weather, Crop Health, Feedback) | 7 | Ready |
| PULSE (Mandis, Commodities, Prices, Forecasts, MSP) | 9 | Ready |
| **Total** | **~214** | |
