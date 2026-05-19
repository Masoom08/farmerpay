# FarmerPay Deployment Guide

## Prerequisites

- Node.js 18+
- MySQL 8.0+ (RDS recommended)
- Redis 6+ (ElastiCache recommended)
- RabbitMQ 3.x (AmazonMQ or self-hosted)
- PM2 (process manager)
- Docker (optional, for containerized deployment)

## Environment Setup

```bash
# Clone repository
git clone <repo-url> farmerpay-platform
cd farmerpay-platform

# Install dependencies
npm ci --production

# Copy environment template
cp .env.example .env
# Edit .env with production values
```

### Required Environment Variables

```
NODE_ENV=production
PORT=3000
API_PREFIX=/api/v1

# Database
DB_HOST=<rds-endpoint>
DB_PORT=3306
DB_NAME=farmerpay_prod
DB_USER=<db-user>
DB_PASSWORD=<db-password>

# Redis
REDIS_HOST=<elasticache-endpoint>
REDIS_PORT=6379
REDIS_PASSWORD=<redis-auth-token>

# JWT
JWT_SECRET=<64-char-random-string>
JWT_REFRESH_SECRET=<64-char-random-string>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=<32-byte-key>

# AWS
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=<iam-key>
AWS_SECRET_ACCESS_KEY=<iam-secret>
S3_BUCKET=farmerpay-uploads

# RabbitMQ
RABBITMQ_URL=amqp://<user>:<pass>@<host>:5672

# CORS
CORS_ORIGINS=https://app.farmerpay.in,https://admin.farmerpay.in
```

## Pre-Deployment Checklist

```bash
# 1. Run all tests
npm test

# 2. Verify no hardcoded secrets
grep -r "password\|secret\|key" src/ --include="*.js" | grep -v node_modules

# 3. Check for .env in git
git status | grep .env   # Should show nothing

# 4. Export OpenAPI docs
node scripts/exportOpenApi.js

# 5. Tag release
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
```

## Database Migration

```bash
# Run all pending migrations
NODE_ENV=production npx sequelize-cli db:migrate

# Verify migration status
NODE_ENV=production npx sequelize-cli db:migrate:status

# Seed reference data
NODE_ENV=production npx sequelize-cli db:seed:all

# Rollback if needed (last migration only)
NODE_ENV=production npx sequelize-cli db:migrate:undo
```

## Deployment Steps

### Option A: PM2 (Direct Server)

```bash
# Start application
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs farmerpay-platform

# Restart
pm2 restart farmerpay-platform

# Graceful reload (zero-downtime)
pm2 reload farmerpay-platform
```

### Option B: Docker

```bash
# Build image
docker build -t farmerpay:1.0.0 .

# Run container
docker run -d \
  --name farmerpay \
  -p 3000:3000 \
  --env-file .env \
  farmerpay:1.0.0

# Health check
curl http://localhost:3000/health
```

### Option C: Docker Compose

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Post-Deployment Verification

```bash
# 1. Health check
curl -s https://api.farmerpay.in/health | jq .

# 2. Swagger docs accessible
curl -s https://api.farmerpay.in/api-docs/ -o /dev/null -w "%{http_code}"

# 3. Auth flow works
curl -s -X POST https://api.farmerpay.in/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9876543210","password":"Test@12345"}'

# 4. Check error rates (CloudWatch/DataDog)
# 5. Monitor response times for first 30 minutes
```

## Rollback Plan

```bash
# 1. Switch traffic back to previous version
# (ALB: change target group weights)

# 2. If database migration needs rollback:
NODE_ENV=production npx sequelize-cli db:migrate:undo

# 3. Restart previous version
pm2 restart farmerpay-platform-prev
```

## Monitoring Dashboard Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API response time (p95) | < 500ms | > 1000ms |
| Error rate | < 1% | > 5% |
| Database connections | 5-20 | > 18 |
| CPU usage | < 60% | > 85% |
| Memory usage | < 70% | > 85% |
| Disk usage | < 60% | > 80% |
| Active users (concurrent) | varies | > 10,000 |
| Failed login attempts | < 100/hr | > 500/hr |

## Runbook

### Restart Services
```bash
pm2 restart farmerpay-platform
# or
docker restart farmerpay
```

### View Logs
```bash
# PM2
pm2 logs farmerpay-platform --lines 100

# Docker
docker logs farmerpay --tail 100 -f

# Log files
tail -f logs/farmerpay-*.log
```

### Check Database
```bash
mysql -h <host> -u <user> -p farmerpay_prod -e "SELECT COUNT(*) FROM users;"
```

### Check Redis
```bash
redis-cli -h <host> -a <password> INFO keyspace
```

### Scale Workers
```bash
# PM2: increase instances
pm2 scale farmerpay-platform +2

# Add read replica for reporting queries
# (configure DB_READ_HOST in .env)
```

### Emergency Contacts

| Role | Contact | When to Call |
|------|---------|--------------|
| On-call engineer | Slack #oncall | Any P1 incident |
| Database admin | Slack #dba | DB connection issues, slow queries |
| DevOps | Slack #infra | Infrastructure, scaling, deployment |
| Product owner | Slack #product | Feature-related incidents |

## Performance Baselines

| Endpoint | Expected p50 | Expected p95 |
|----------|-------------|-------------|
| GET /health | 5ms | 15ms |
| POST /auth/login | 100ms | 300ms |
| GET /farmer/profile | 50ms | 200ms |
| GET /dice/products | 80ms | 250ms |
| GET /pulse/prices/latest | 60ms | 200ms |
| POST /sathi/tasks/:id/complete | 150ms | 500ms |
| GET /sentinel/loan/:id/health | 100ms | 350ms |
| POST /sage/crop-observation/:id | 120ms | 400ms |
