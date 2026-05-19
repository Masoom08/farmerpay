# FarmerPay Platform

**Agrarian Fintech Platform for India**

FarmerPay is a full-stack fintech platform designed to empower Indian farmers, Farmer Producer Organizations (FPOs), and agricultural stakeholders with digital financial services, market intelligence, and AI-driven advisory.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express.js 4.x |
| ORM | Sequelize 6.x |
| Database | MySQL 8.0 |
| Cache | Redis 7.x |
| Message Queue | RabbitMQ 3.x |
| File Storage | AWS S3 + KMS encryption |
| Email | AWS SES / Nodemailer |
| Translation | Bhashini API (11 Indian languages) |
| Auth | JWT (HS256) — 30min access + 7day refresh |
| Validation | Joi |
| Logging | Winston + Daily Rotate |
| Process Manager | PM2 |
| API Docs | Swagger / OpenAPI 3.0 |

---

## Project Structure

```
farmerpay-platform/
├── src/
│   ├── config/              # Database, Redis, S3, RabbitMQ configs
│   ├── middleware/           # Auth, validation, rate limiting, etc.
│   ├── modules/             # Feature modules
│   │   ├── auth/            # Authentication & OTP
│   │   ├── farmer/          # Farmer management
│   │   ├── trust/           # Trust layer
│   │   ├── dice/            # Data, Intelligence, Compliance, Economics
│   │   ├── roots/           # Verticals: crop, dairy, fishery
│   │   ├── sage/            # AI advisory
│   │   ├── pulse/           # Market intelligence
│   │   ├── sentinel/        # Risk & compliance
│   │   ├── sathi/           # Field agent support
│   │   └── vyapar/          # Commerce
│   ├── shared/
│   │   ├── constants/       # Roles, status codes, error codes
│   │   ├── models/          # Shared Sequelize models
│   │   ├── services/        # S3, KMS, email, SMS, Bhashini
│   │   └── utils/           # Response, pagination, encryption helpers
│   └── app.js               # Express application entry point
├── migrations/              # Sequelize migrations
├── seeders/                 # Sequelize seed data
├── tests/                   # Jest test files
├── docs/                    # Documentation
├── scripts/                 # Utility scripts
├── .env.example             # Environment variable template
├── .sequelizerc             # Sequelize CLI config
├── docker-compose.yml       # Local dev services (MySQL, Redis, RabbitMQ)
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- Docker & Docker Compose (for local services)
- AWS account (for S3, KMS, SES in production)

### 1. Clone & Install

```bash
git clone https://github.com/basava-code/farmerpay-platform.git
cd farmerpay-platform
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your local configuration
```

### 3. Start Local Services

```bash
docker-compose up -d
```

This starts:
- **MySQL 8.0** on port 3306
- **Redis 7** on port 6379
- **RabbitMQ** on port 5672 (management UI: http://localhost:15672)

### 4. Run Migrations

```bash
npm run db:migrate
```

### 5. Start the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start

# With PM2
npm run start:pm2
```

### 6. Access

- **API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health

---

## API Response Format

All API responses follow this structure:

**Success:**
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "phone", "message": "phone is required" }],
  "errorCode": "VAL_001"
}
```

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm run start:pm2` | Start with PM2 process manager |
| `npm run db:migrate` | Run database migrations |
| `npm run db:migrate:undo` | Undo last migration |
| `npm run db:seed` | Seed the database |
| `npm test` | Run tests with coverage |
| `npm run lint` | Lint source code |

---

## Supported Languages

FarmerPay supports 11 Indian languages via Bhashini API:

English, Hindi, Bengali, Telugu, Marathi, Tamil, Gujarati, Kannada, Malayalam, Punjabi, Odia

Set the `X-Language` header on API requests (e.g. `X-Language: hi` for Hindi).

---

## License

ISC
