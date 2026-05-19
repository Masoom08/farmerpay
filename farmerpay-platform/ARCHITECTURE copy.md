# FarmerPay Platform — Architecture Document

> Last updated: 2026-04-12

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Repository Structure](#4-repository-structure)
5. [Backend Architecture](#5-backend-architecture)
6. [Database Layer](#6-database-layer)
7. [Frontend Applications](#7-frontend-applications)
8. [API Structure](#8-api-structure)
9. [External Integrations](#9-external-integrations)
10. [Authentication & Authorization](#10-authentication--authorization)
11. [Background Jobs & Message Queue](#11-background-jobs--message-queue)
12. [Infrastructure & Deployment](#12-infrastructure--deployment)
13. [Key Statistics](#13-key-statistics)

---

## 1. Platform Overview

**FarmerPay** is a full-stack agrarian fintech platform built for the Indian market. It is a **bank-linked lending platform** — not a general-purpose farmer app — designed to digitize the agricultural credit lifecycle from farmer onboarding through loan origination, disbursement, monitoring, and recovery.

### User Personas

| Persona | Interface | Description |
|---------|-----------|-------------|
| **Farmer** | Mobile app (React Native) + Web dashboard | Primary user — applies for loans, tracks farm activities, receives advisories |
| **Banker** | Admin web dashboard | Reviews loan applications, monitors portfolio health, manages disbursements |
| **Sathi (Field Agent)** | Web dashboard | Extension agent who onboards farmers, verifies activities, provides ground support |
| **Vendor** | Mobile app (React Native) | Input supplier who sells to farmers on credit or cash |
| **Admin** | Admin web dashboard | System administrator with full access |

### Business Phases

- **Phase 1:** Existing bank loan customers — profiles pre-filled from Finacle (bank CBS)
- **Phase 2:** Digital lending to new farmers via the platform

### Core Domain Modules

| Module | Code Name | Purpose |
|--------|-----------|---------|
| Farmer Onboarding | **FARMER** | Profile, KYC, address, bank accounts, activity preferences |
| Activity Tracking | **ROOTS** | Crop, dairy, fishery, horticulture cultivation cycles & financial logbooks |
| Loan Engine | **DICE** | Digital Inclusive Credit Engine — loan discovery, application, disbursement, repayment |
| Market Intelligence | **PULSE** | Mandi prices, forecasting, sell-or-store advisor |
| Advisory System | **SAGE** | Weather, crop health, pest alerts, AI-driven recommendations |
| Risk Monitoring | **SENTINEL** | Loan health, SMA classification, early warning signals, NPA prediction |
| Credit Scoring | **TRUST** | Borrower creditworthiness questionnaire & scoring |
| Agent Network | **SATHI** | Field agent assignment, task management, KPI tracking |
| Marketplace | **VYAPAR** | Vendor registry, purchase orders, farmer-vendor transactions |
| Package of Practice | **POP** | ICAR-aligned workband schedules for crop/dairy/fishery activities |
| Insurance | **INSURANCE** | PMFBY, livestock, and bundled insurance enrollment & claims |
| Bank Integration | **BANK** | Finacle loan import, bi-directional sync |
| Compliance | **COMPLIANCE** | Audit trails, document approval workflows, regulatory mandates |
| Land Registry | **AGRISTACK** | Government land record verification via AgriStack/CERSAI |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                  │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  Farmer App  │  │  Vendor App  │  │   Dashboard  │  │ Dashboard  │ │
│  │ React Native │  │ React Native │  │   (Banker)   │  │  (Farmer)  │ │
│  │   Expo 54    │  │   Expo 54    │  │  Next.js 16  │  │ Next.js 16 │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │
│         │                  │                  │                │        │
│  ┌──────┴──────────────────┴──────────────────┴────────────────┘        │
│  │                                                                      │
│  │  ┌──────────────┐                                                    │
│  │  │  Dashboard   │                                                    │
│  │  │   (Sathi)    │                                                    │
│  │  │  Next.js 16  │                                                    │
│  │  └──────┬───────┘                                                    │
│  │         │                                                            │
└──┼─────────┼────────────────────────────────────────────────────────────┘
   │         │
   ▼         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY LAYER                                │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    Express.js Middleware Stack                      │ │
│  │  Helmet → CORS → Morgan → RequestID → Language → RateLimiter      │ │
│  │  → JWT Auth → Role Check → Aadhaar Step-Up → Joi Validation       │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  Base URL: /api/v1/{module}/{resource}                                  │
│  Docs: /api-docs (Swagger UI)                                          │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       SERVICE / MODULE LAYER                            │
│                                                                         │
│  ┌────────┐ ┌──────┐ ┌───────┐ ┌──────────┐ ┌──────┐ ┌─────────────┐ │
│  │  AUTH   │ │FARMER│ │ ROOTS │ │   DICE   │ │PULSE │ │    SAGE     │ │
│  └────────┘ └──────┘ └───────┘ └──────────┘ └──────┘ └─────────────┘ │
│  ┌────────┐ ┌──────┐ ┌───────┐ ┌──────────┐ ┌──────┐ ┌─────────────┐ │
│  │SENTINEL│ │TRUST │ │ SATHI │ │  VYAPAR  │ │ BANK │ │  INSURANCE  │ │
│  └────────┘ └──────┘ └───────┘ └──────────┘ └──────┘ └─────────────┘ │
│  ┌────────┐ ┌──────┐ ┌───────┐ ┌──────────┐ ┌──────┐ ┌─────────────┐ │
│  │BANKER  │ │ADMIN │ │  POP  │ │COMPLIANCE│ │CHOICE│ │  AGRISTACK  │ │
│  └────────┘ └──────┘ └───────┘ └──────────┘ └──────┘ └─────────────┘ │
│  ┌──────────────┐ ┌──────────────┐                                     │
│  │PULSE-FARMER  │ │   LOCATION   │                                     │
│  └──────────────┘ └──────────────┘                                     │
└─────────────┬──────────────┬────────────────────────────────────────────┘
              │              │
              ▼              ▼
┌─────────────────────┐  ┌────────────────────────────────────────────────┐
│   DATA LAYER        │  │         EXTERNAL INTEGRATIONS                  │
│                     │  │                                                │
│  ┌───────────────┐  │  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │  MySQL 8.0    │  │  │  │ Finacle  │ │AgriStack │ │   Aadhaar    │  │
│  │  (Sequelize)  │  │  │  │ (Bank)   │ │ (Land)   │ │  (Identity)  │  │
│  └───────────────┘  │  │  └──────────┘ └──────────┘ └──────────────┘  │
│  ┌───────────────┐  │  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │  Redis 7.x    │  │  │  │ Bhashini │ │Agmarknet │ │     IMD      │  │
│  │  (Cache)      │  │  │  │(Translate)│ │ (Mandi)  │ │  (Weather)   │  │
│  └───────────────┘  │  │  └──────────┘ └──────────┘ └──────────────┘  │
│  ┌───────────────┐  │  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │  RabbitMQ 3.x │  │  │  │ Vistaar  │ │  eNAM    │ │  AWS (S3,    │  │
│  │  (Queue)      │  │  │  │ (Beckn)  │ │(Market)  │ │  KMS, SES)   │  │
│  └───────────────┘  │  │  └──────────┘ └──────────┘ └──────────────┘  │
│  ┌───────────────┐  │  │  ┌──────────┐ ┌──────────┐                   │
│  │  AWS S3       │  │  │  │  Twilio  │ │  Google  │                   │
│  │  (Files)      │  │  │  │  (SMS)   │ │ (CropID) │                   │
│  └───────────────┘  │  │  └──────────┘ └──────────┘                   │
└─────────────────────┘  └────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

### Backend

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 18+ |
| Framework | Express.js | 4.21 |
| ORM | Sequelize | 6.37 |
| Database | MySQL | 8.0 |
| Cache | Redis (ioredis) | 7.x |
| Message Queue | RabbitMQ (amqplib) | 3.x |
| Auth | JWT (jsonwebtoken) | 9.0 |
| Validation | Joi | 17.13 |
| File Storage | AWS S3 (multer-s3) | — |
| Encryption | AWS KMS | — |
| Email | AWS SES / Nodemailer | 6.9 |
| SMS | Twilio | — |
| Translation | Bhashini API | 11 languages |
| Logging | Winston + daily-rotate-file | 3.14 |
| API Docs | Swagger (swagger-jsdoc + swagger-ui-express) | OpenAPI 3.0 |
| Scheduler | node-cron | 4.2 |
| Process Manager | PM2 | — |
| Image Processing | Sharp | 0.34 |
| Testing | Jest | 29.7 |

### Frontend (Web Dashboards)

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 16.2.2 |
| React | React | 19.2.4 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS | 4 |
| Component Library | shadcn/ui + @base-ui/react | 1.3 |
| Charts | Recharts | 3.8 |
| Icons | Lucide React | 1.7 |
| Linting | ESLint | 9 |

### Frontend (Mobile Apps)

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React Native | 0.81.5 |
| Platform | Expo | 54.0 |
| Router | Expo Router | 6.0 |
| Storage | AsyncStorage + SecureStore | — |
| Location | expo-location | 19.0 |
| Biometrics | expo-local-authentication | 17.0 |
| Camera | expo-image-picker | 17.0 |
| OCR | Tesseract.js | 7.0 |

### Infrastructure

| Component | Technology |
|-----------|-----------|
| Containerization | Docker (multi-stage Alpine) |
| Orchestration | Docker Compose (dev), K8s-ready (prod) |
| Cloud Provider | AWS (S3, KMS, SES) |
| CI/CD | PM2 + ecosystem.config.js |

---

## 4. Repository Structure

```
farmerpay-platform/
│
├── src/                            # Backend (Express.js API)
│   ├── app.js                      # Entry point
│   ├── config/                     # DB, Redis, RabbitMQ, S3 config
│   ├── middleware/                  # Auth, validation, rate limiting, uploads
│   ├── modules/                    # 22 feature modules (MVC pattern)
│   │   ├── auth/                   # Authentication & OTP
│   │   ├── farmer/                 # Farmer profile & KYC
│   │   ├── roots/                  # Crop, dairy, fishery, horticulture
│   │   ├── dice/                   # Loan engine
│   │   ├── pulse/                  # Market intelligence
│   │   ├── pulse-farmer/           # Farmer-level market views
│   │   ├── sage/                   # Advisory system
│   │   ├── sentinel/               # Risk monitoring
│   │   ├── trust/                  # Credit scoring
│   │   ├── sathi/                  # Field agent platform
│   │   ├── vyapar/                 # Vendor marketplace
│   │   ├── bank/                   # Bank (Finacle) integration
│   │   ├── banker/                 # Banker dashboard backend
│   │   ├── insurance/              # Insurance products
│   │   ├── compliance/             # Regulatory compliance
│   │   ├── pop/                    # Package of Practice
│   │   ├── admin/                  # Admin panel
│   │   ├── agristack/              # Land registry
│   │   ├── location/               # Geographic data (LGD)
│   │   └── choice/                 # Farmer preferences
│   ├── integrations/               # External API clients
│   │   ├── agristack/              # CERSAI land records
│   │   ├── vistaar/                # Beckn/Vistaar advisories
│   │   ├── agmarknet/              # Mandi price data
│   │   ├── imd/                    # IMD weather
│   │   ├── enam/                   # e-NAM marketplace
│   │   └── google/                 # Google Crop ID
│   ├── jobs/                       # Scheduled background jobs (7)
│   ├── workers/                    # RabbitMQ consumers
│   └── shared/                     # Shared models, services, utils
│       ├── models/                 # 24 cross-module models
│       ├── services/               # KMS, audit, email, SMS, media, Bhashini
│       ├── utils/                  # Response helpers, pagination, encryption
│       └── constants/              # Roles, error codes, status codes
│
├── migrations/                     # 229 Sequelize migrations
├── seeders/                        # 42+ seed files
├── tests/                          # Jest test suite
├── scripts/                        # Utility scripts (14 files)
│
├── dashboard/                      # Admin/Banker dashboard (Next.js 16)
│   └── src/app/                    # App Router pages
│       ├── dashboard/              # Analytics, portfolio, loan inbox
│       ├── farmer/                 # Farmer management views
│       └── login/                  # Authentication
│
├── dashboard-farmer/               # Farmer web portal (Next.js 16)
│   └── src/app/                    # Farmer-facing views
│
├── dashboard-sathi/                # Field agent portal (Next.js 16)
│   └── src/app/                    # Agent task management views
│
├── farmer-app/                     # Farmer mobile app (Expo 54)
│   └── app/                        # 72 screens (Expo Router)
│       ├── (tabs)/                 # Bottom nav: home, farm, money, loans
│       ├── activity-*.tsx          # Crop, dairy, fishery tracking
│       ├── loan-*.tsx              # Loan application flow
│       ├── sage*.tsx               # Advisory screens
│       └── roots-*.tsx             # Onboarding flows
│
├── vendor-app/                     # Vendor mobile app (Expo 54)
│   └── app/                        # Vendor screens
│
├── docs/                           # Documentation
├── logs/                           # Winston log files
├── uploads/                        # Local file uploads
├── Dockerfile                      # Multi-stage Docker build
├── docker-compose.yml              # Dev services (MySQL, Redis, RabbitMQ)
├── docker-compose.prod.yml         # Production compose
├── ecosystem.config.js             # PM2 process config
└── package.json                    # Root dependencies
```

---

## 5. Backend Architecture

### 5.1 Module Structure (MVC + Service Layer)

Each of the 22 modules follows this pattern:

```
modules/{module-name}/
├── routes/          # Express route definitions with Swagger JSDoc
├── controllers/     # Request handling, input extraction, response formatting
├── services/        # Business logic, database operations, external calls
├── models/          # Sequelize model definitions
└── validators/      # Joi validation schemas
```

### 5.2 Request Pipeline

```
Incoming HTTP Request
        │
        ▼
┌─ Helmet (security headers) ─────────────────────────────────┐
├─ CORS ───────────────────────────────────────────────────────┤
├─ Morgan (HTTP logging) ──────────────────────────────────────┤
├─ RequestID (X-Request-ID tracking) ──────────────────────────┤
├─ Language detection (X-Language header) ──────────────────────┤
├─ Rate limiter (Redis-backed, per IP/user) ───────────────────┤
├─ JWT Auth (authenticate / optionalAuth) ─────────────────────┤
├─ Role Check (RBAC — farmer, banker, admin, sathi, vendor) ───┤
├─ Aadhaar Step-Up (Tier-2 financial endpoints only) ──────────┤
├─ Joi Validation (request body/params/query) ─────────────────┤
├─ Multer (file upload to S3, if applicable) ──────────────────┤
│                                                               │
│   Controller → Service → Model (Sequelize) → MySQL           │
│                                                               │
├─ Error Handler (centralized, formatted JSON) ────────────────┤
└──────────────────────────────────────────────────────────────┘
        │
        ▼
   JSON Response
```

### 5.3 Standardized API Response Format

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

### 5.4 Shared Services

| Service | File | Purpose |
|---------|------|---------|
| Audit | `auditService.js` | Records all write operations with user/timestamp/delta |
| KMS | `kmsService.js` | AWS KMS encryption/decryption for sensitive fields |
| Media | `mediaService.js` | S3 file upload, presigned URLs, transcoding |
| Email | `emailService.js` | Transactional email via AWS SES or SMTP |
| SMS | `smsService.js` | OTP and notification SMS via Twilio |
| Notifications | `notificationService.js` | Push/email/SMS orchestration |
| Translation | `bhashiniService.js` | 11 Indian language translation via Bhashini API |
| Documents | `documentService.js` | Document versioning, approval workflows |

### 5.5 Shared Utilities

| Utility | Purpose |
|---------|---------|
| `responseHelper.js` | Standardized JSON response formatter |
| `paginationHelper.js` | Cursor-based pagination |
| `encryptionHelper.js` | Data encryption/decryption wrappers |
| `logger.js` | Winston logger with daily rotation |
| `dateHelper.js` | Timezone-aware date utilities |
| `csvParser.js` / `xlsxParser.js` | File import parsing |

---

## 6. Database Layer

### 6.1 Overview

- **Engine:** MySQL 8.0 with utf8mb4 charset
- **ORM:** Sequelize 6.37
- **Connection Pool:** 5–20 connections (configurable)
- **Read Replicas:** Supported in production
- **Migrations:** 229 versioned migration files
- **Seeders:** 42+ seed files (roles, LGD geography, loan categories, PoP templates)

### 6.2 Key Model Groups

#### Auth & Users
User, Role, Permission, UserRole, UserPermission, RolePermission, UserSession, OtpRequest, AadhaarVerification

#### Farmer Profile
FarmerProfile, FarmerProfileDetails, FarmerAddress, FarmerGpsLocation, FarmerBankAccount, FarmerActivityPreferences, FarmerLanguagePreference, OnboardingProgress, ProfileCompletenessScore, KycVerificationLog

#### Location (LGD Master Data)
LgdState, LgdDistrict, LgdBlock, LgdVillage, LgdPanchayat, LgdVillagePanchayatMap, PacsRegistry (all with translation tables)

#### ROOTS — Crop
- **Masters:** CropMaster, CropSeason, VarietyMaster, InputCategory, InputItem, InputPack
- **Package of Practice:** PackageOfPractice, PopWorkband, PopTask, PopTaskInput, PopCostBenchmark
- **Execution:** FarmRegister, Field, CultivationCycle, WorkbandExecution, TaskExecution, TaskExecutionInputLog, TaskExecutionLaborLog, TaskExecutionMachineryLog, HarvestRecord, HarvestSaleRecord, CultivationCycleProfitability, SoilHealthRecord

#### ROOTS — Dairy
- **V1 (Herd):** DairyHerdRegister, DairyAnimal, DairyAnimalHealthRecord, DairyBreedingRecord, DairyMilkProductionLog, DairyFeedUsageLog
- **V2 (Logbook):** FarmerDairyProfile, DairyCostEvent, DairyRevenueEvent, DairyBreedingEvent, DairyTreatmentEvent, DairyRecurringTemplate, DairyWeeklySummary

#### ROOTS — Fishery
- **V1 (Pond):** FisheryPondRegister, FisheryPond, FisherySpeciesStocked, FisheryFeedingLog, FisheryWaterQualityLog, FisheryHarvestRecord
- **V2 (Logbook):** FarmerFisheryProfile, FisheryCostEvent, FisheryRevenueEvent, FisheryTripLog, FisheryVesselMaintenanceLog, FisheryWeeklySummary

#### DICE — Loans
LoanCategory, LoanProduct, ScaleOfFinance, LoanApplication, LoanApplicationStatus, LoanApplicationDocument, LoanDisbursement, LoanRepaymentSchedule, LoanRepayment, FarmerLoanBookmark, DiceWarehouseRegistry, DicePostharvestTopupLoan, InsuranceEnrollment

#### TRUST — Credit Scoring
TrustSection, TrustQuestion, TrustQuestionChoice, TrustResponse, TrustScoreCalculation, TrustScoreHistory, TrustScoreAppeal

#### PULSE — Market Data
PulseMandi, PulseCommodity, PulsePriceRecord, PulsePriceForecast, PulseMsp, PulseFarmerPriceAlert, PulseSellRecommendation

#### SAGE — Advisories
SageAdvisory, SageWeatherEvent, SageCropHealthObservation, SageFarmerInteraction, SageFeedback, SageAlert, RegionalPestAlert

#### SENTINEL — Risk
SentinelLoanHealth, SentinelRedFlag, SentinelEwsSignal, SentinelRiskScore, SentinelAlert, SentinelRecoveryCase, SentinelPortfolioMetric

#### Shared Cross-Module
AuditLogV2, AuditTrail, MediaAsset, MediaTag, Document, DocumentVersion, NotificationTemplate, NotificationV2, Language, LanguageTranslation

### 6.3 Data Patterns

- **Multi-tenant isolation:** All data scoped by `farmer_id` / `user_id`
- **Soft deletes:** `deleted_at` timestamps across all major models
- **Audit trails:** All write operations logged with before/after delta
- **Encryption at rest:** Sensitive fields (Aadhaar, bank account numbers) encrypted via KMS
- **Temporal versioning:** Documents and farmer records maintain version history
- **Translation tables:** Most master data has `*Translation` companion tables for 11 languages

---

## 7. Frontend Applications

### 7.1 Admin/Banker Dashboard

| Property | Value |
|----------|-------|
| Path | `/dashboard` |
| Framework | Next.js 16.2.2 (App Router) |
| Port | 3000 |
| UI | Tailwind CSS 4 + shadcn/ui + Recharts |

**Key Pages:**
- Dashboard home — KPI summaries (originations, disbursements, collections)
- Asset quality — NPA tracking, SMA classification
- Ecosystem overview — Platform-wide metrics
- Roots activity — Crop/dairy/fishery activity monitoring
- Farmer performance — Individual farmer analytics
- Loan inbox — Pending approvals, sanctions, disbursals
- Gold loan management
- Insurance portfolio
- Market intelligence (PULSE)
- Sathi network management
- Compliance dashboard
- Farmer detail view (`/farmer/[id]`)

### 7.2 Farmer Web Dashboard

| Property | Value |
|----------|-------|
| Path | `/dashboard-farmer` |
| Framework | Next.js 16.2.2 (App Router) |
| Port | 3003 |
| UI | Tailwind CSS 4 + shadcn/ui + Recharts |

**Key Pages:**
- Loan application and tracking
- Crop/dairy/fishery activity views
- Market prices and advisory
- TRUST score dashboard

### 7.3 Sathi (Field Agent) Dashboard

| Property | Value |
|----------|-------|
| Path | `/dashboard-sathi` |
| Framework | Next.js 16.2.2 (App Router) |
| Port | 3002 |
| UI | Tailwind CSS 4 + shadcn/ui + Recharts |

**Key Pages:**
- Farmer assignments and task queue
- PoP execution verification
- Document and photo upload
- Agent KPI dashboard

### 7.4 Farmer Mobile App

| Property | Value |
|----------|-------|
| Path | `/farmer-app` |
| Framework | React Native 0.81.5 + Expo 54 |
| Router | Expo Router 6 (file-based) |
| Screens | 72 |

**Screen Groups:**
- **Tabs (bottom nav):** Home, Farm, Money, Loans
- **Auth:** Login, Register, Forgot Password, MPIN setup
- **Onboarding:** Crop, dairy, fishery, horticulture, soil health
- **Activity tracking:** Crop/dairy/fishery daily logs, P&L, logbook, animals/ponds
- **Loans (DICE):** Apply, journey tracker, bank loan detail, repayments, post-harvest
- **Market (PULSE):** Krishi Bazaar, sell-or-store advisor
- **Advisory (SAGE):** Advisories list, weather, crop health
- **Identity:** Aadhaar verification, trust profile, land records

**Offline-First:** Edge sync engine queues operations locally, syncs when connectivity is available.

### 7.5 Vendor Mobile App

| Property | Value |
|----------|-------|
| Path | `/vendor-app` |
| Framework | React Native 0.81.5 + Expo 54 |
| Router | Expo Router 6 |

**Key Screens:**
- Login, Home, Add Farmer, Give Credit

### 7.6 API Client Pattern (All Frontends)

All frontend apps use a shared API client pattern:
- **Base URL:** `http://localhost:3000/api/v1`
- **Auth:** Bearer token (JWT) in Authorization header
- **Token storage:** AsyncStorage (mobile) / cookie (web)
- **Auto-refresh:** On 401, automatically refreshes token and retries
- **Tier-2 step-up:** DICE endpoints use `x-aadhaar-token` header; `StepUpRequiredError` thrown on 403

---

## 8. API Structure

All routes are prefixed with `/api/v1`. Swagger docs at `/api-docs`.

### 8.1 Auth (`/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register (phone + OTP) |
| POST | `/auth/send-otp` | Request OTP |
| POST | `/auth/verify-otp` | Verify OTP |
| POST | `/auth/set-mpin` | Set 4-digit MPIN |
| POST | `/auth/login` | Login (phone + MPIN) |
| POST | `/auth/refresh-token` | Refresh JWT |
| POST | `/auth/forgot-mpin` | Initiate MPIN reset |
| POST | `/auth/change-mpin` | Change MPIN |
| POST | `/auth/logout` | Revoke tokens |
| GET | `/auth/me` | Current user profile |

### 8.2 Farmer (`/farmer`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/farmer/onboarding/step1-4` | 4-step onboarding flow |
| GET/PUT | `/farmer/profile` | Profile CRUD |
| CRUD | `/farmer/addresses` | Address management |
| CRUD | `/farmer/bank-accounts` | Bank account management |
| CRUD | `/farmer/subscriptions` | Activity subscriptions (crop/dairy/fishery) |
| GET/POST | `/farmer/soil-health-card` | Soil health data |
| GET | `/farmer/pop` | Package of Practice list |
| POST | `/farmer/pop/:id/subscribe` | Subscribe to PoP |

### 8.3 DICE — Loans (`/dice`)

**Tier-1 (Browse — JWT only):**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dice/products` | Loan product catalog |
| GET | `/dice/products/:id/eligibility` | Eligibility check |
| GET | `/dice/scale-of-finance` | SOF lookup by crop/size |
| POST | `/dice/input-calculator/calculate` | Loan amount calculator |
| GET | `/dice/applications` | Own applications |
| GET | `/dice/loans/me` | Unified loan feed (FarmerPay + bank-imported) |
| GET | `/dice/gold-loan/ibja-price` | Gold price reference |
| POST | `/dice/gold-loan/calculate-value` | Gold loan calculator |
| GET | `/dice/insurance/products` | Insurance catalog |
| GET | `/dice/warehouses` | Post-harvest warehouse registry |

**Tier-2 (Aadhaar step-up required):**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/dice/apply` | Apply for loan |
| PUT | `/dice/applications/:id/withdraw` | Withdraw application |
| POST | `/dice/consent` | Give consent to bank |
| POST | `/dice/repayment` | Record repayment |
| POST | `/dice/insurance/enroll` | Enroll in insurance |
| POST | `/dice/insurance/claim` | File insurance claim |
| POST | `/dice/los/initiate` | Initiate Loan Origination System |
| POST | `/dice/postharvest-topup/apply` | Apply post-harvest topup |

### 8.4 ROOTS — Activities (`/roots`)

**Crop:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/roots/crops` | Crop master list |
| GET | `/roots/varieties/:cropId` | Varieties by crop |
| GET | `/roots/pop` | Package of Practice list |
| POST | `/roots/farm-register` | Register farm/fields |
| POST | `/roots/cultivation-cycle` | Start cultivation cycle |
| POST | `/roots/cultivation-cycle/:id/execute-task` | Log task (inputs, labor, machinery) |
| POST | `/roots/cultivation-cycle/:id/harvest` | Record harvest |
| POST | `/roots/cultivation-cycle/:id/sale-record` | Record sale |
| GET | `/roots/cultivation-cycle/:id/profitability` | P&L summary |

**Dairy (`/roots/dairy`):**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/roots/dairy/profile` | Create dairy profile |
| POST | `/roots/dairy/cost-event` | Log cost (feed, medicine, labor) |
| POST | `/roots/dairy/revenue-event` | Log revenue (milk sales) |
| POST | `/roots/dairy/breeding-event` | Breeding event |
| POST | `/roots/dairy/treatment-event` | Health/treatment event |
| POST | `/roots/dairy/recurring-template` | Setup recurring costs |
| GET | `/roots/dairy/weekly-summary/:farmerId` | Weekly P&L |

**Fishery (`/roots/fishery`):**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/roots/fishery/profile` | Create fishery profile |
| POST | `/roots/fishery/cost-event` | Log cost |
| POST | `/roots/fishery/revenue-event` | Log revenue |
| POST | `/roots/fishery/trip-log` | Fishing trip log |
| POST | `/roots/fishery/vessel-maintenance` | Vessel maintenance |
| GET | `/roots/fishery/weekly-summary/:farmerId` | Weekly summary |

### 8.5 PULSE — Market Intelligence (`/pulse`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/pulse/commodities` | Commodity list |
| GET | `/pulse/mandis` | Mandi list by location |
| GET | `/pulse/prices/latest` | Latest mandi prices |
| GET | `/pulse/prices/chart` | Historical price chart |
| GET | `/pulse/price-forecast/:id` | 30-day price forecast |
| GET | `/pulse/msp/:id` | Minimum Support Price |
| POST | `/pulse/farmer-price-alert` | Set price alert |
| GET | `/pulse/sell-recommendations/:farmerId` | Sell recommendations |
| POST | `/pulse/sell-store-advisor` | 5-scenario sell/store analysis |

### 8.6 SAGE — Advisory (`/sage`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sage/advisories` | Recent advisories |
| GET | `/sage/weather-events` | Weather alerts |
| GET | `/sage/crop-health-observations` | Crop health from imagery |
| GET | `/sage/regional-pest-alerts` | Pest surveillance |
| POST | `/sage/farmer-interaction` | Log interaction |
| POST | `/sage/feedback` | Advisory feedback |

### 8.7 SENTINEL — Risk (`/sentinel`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sentinel/loan/:id/health` | Loan health & SMA classification |
| GET | `/sentinel/loan/:id/risk` | Risk score & EWS signals |
| GET | `/sentinel/loan/:id/cashflow` | Cash flow projections |
| GET | `/sentinel/portfolio` | Banker portfolio overview |
| GET | `/sentinel/portfolio/cohort-analytics` | Cohort-level metrics |
| GET | `/sentinel/alerts` | Early warning alerts |
| POST | `/sentinel/recovery/initiate/:id` | Start recovery process |

### 8.8 Banker (`/banker`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/banker/dashboard` | KPI summaries |
| GET | `/banker/portfolio` | Loan portfolio list |
| GET | `/banker/loan-inbox` | Pending actions |
| POST | `/banker/loan-inbox/:id/approve` | Approve application |
| POST | `/banker/loan-inbox/:id/reject` | Reject application |
| POST | `/banker/loan-inbox/:id/disburse` | Mark disbursed |
| POST | `/banker/loan-inbox/:id/sanction` | Issue sanction letter |

### 8.9 Bank Integration (`/bank`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/bank/portfolio/import` | Import CSV from Finacle |
| POST | `/bank/portfolio/bulk-import` | Import 3-tab XLSX |
| GET | `/bank/loan-accounts` | List imported accounts |
| POST | `/bank/loan-accounts/:id/link-farmer` | Link to farmer profile |
| POST | `/bank/finacle/sync` | Bi-directional Finacle sync |

### 8.10 Other Modules

| Module | Base Path | Key Operations |
|--------|-----------|---------------|
| Trust | `/trust` | Questionnaire sections, submit responses, get score |
| Location | `/location` | LGD states/districts/blocks/villages, PACS registry, GPS verify |
| Sathi | `/sathi` | Task queue, task completion, farmer relationship history |
| Vyapar | `/vyapar` | Vendor list, products, transactions, farmer purchase history |
| AgriStack | `/agristack` | Land lookup, consent, geo-maps, identity verification |
| Insurance | `/insurance` | Product catalog, POS referral |
| Compliance | `/compliance` | Document approval, audit export |
| Admin | `/admin` | Dashboard, audit log viewer |

---

## 9. External Integrations

### 9.1 Finacle (Bank Core Banking System)

| Direction | Flow | Purpose |
|-----------|------|---------|
| Outbound | FarmerPay → Finacle | Loan origination, insurance SI, end-use verification, PSL classification, pre-delinquency alerts, gold return reminders |
| Inbound | Finacle → FarmerPay | Webhook events (disbursement, repayment, status changes) |
| Import | CSV/XLSX Upload | Bulk import of existing gold loans from Finacle |

**Implementation:** `src/modules/bank/services/finacleOutboundService.js`, `finacleWebhookController.js`

### 9.2 AgriStack (Government Land Registry)

| Feature | Description |
|---------|-------------|
| Land lookup | Survey number resolution, area in hectares |
| Ownership verification | Ownership type, co-owner details |
| Geo-maps | Plot boundary visualization |
| Consent management | Digital consent workflow |

**Modes:** Live API (`AGRISTACK_LIVE=true`) or mock for development
**Implementation:** `src/integrations/agristack/`

### 9.3 Aadhaar (UIDAI Identity)

| Feature | Description |
|---------|-------------|
| OTP authentication | 6-digit OTP to registered mobile |
| Step-up session | 15-minute elevated session for Tier-2 operations |
| Identity verification | Name, DOB, address confirmation |

**Implementation:** `src/modules/auth/services/aadhaarAuthService.js`

### 9.4 Bhashini (Language Translation)

| Feature | Description |
|---------|-------------|
| Languages | 11 Indian languages (Hindi, Bengali, Telugu, Marathi, Tamil, Gujarati, Kannada, Malayalam, Punjabi, Odia, English) |
| ULCA pipeline | Automatic model discovery and caching (24h Redis TTL) |
| Fallback | English if translation fails |

**Implementation:** `src/shared/services/bhashiniService.js`

### 9.5 Vistaar (Beckn Open Network)

| Service | Status | Mapping |
|---------|--------|---------|
| Crop Advisory | Stub | → SAGE module |
| Weather Alerts | Stub | → SAGE module |
| Mandi Prices | Stub | → PULSE module |
| Pest Surveillance | Stub | → SAGE module |
| Scheme Eligibility | Stub | → DICE module |
| ICAR PoP | Stub | → ROOTS module |

**Note:** Vistaar = Beckn open network (like ONDC). Integration requires sandbox certification + DPDP compliance. Feature flags currently disabled.

**Implementation:** `src/integrations/vistaar/`

### 9.6 Agmarknet (Mandi Price Data)

| Feature | Description |
|---------|-------------|
| Price ingestion | Daily mandi prices from data.gov.in API |
| Forecasting | SMA-SEASONAL-v1 model for 30-day price prediction |
| Modes | Live API or mock data |

**Implementation:** `src/integrations/agmarknet/agmarknetClient.js`

### 9.7 IMD (Weather)

| Feature | Description |
|---------|-------------|
| Weather data | Real-time weather via OpenWeatherMap API |
| Station mapping | IMD station grid for farmer locations |
| Alerts | Weather alert generation for SAGE module |

**Implementation:** `src/integrations/imd/`

### 9.8 AWS Services

| Service | Usage |
|---------|-------|
| S3 | File storage (documents, photos, media) with presigned URLs |
| KMS | Encryption of sensitive data (Aadhaar, bank accounts) |
| SES | Transactional email delivery |

### 9.9 Twilio

| Feature | Description |
|---------|-------------|
| SMS | OTP delivery, notification messages |
| DLT compliance | Indian telecom DLT template ID support |

### 9.10 Google

| Feature | Description |
|---------|-------------|
| Crop ID | Crop identification from satellite/field imagery |

---

## 10. Authentication & Authorization

### 10.1 Two-Tier Authentication

```
┌──────────────────────────────────────────────────────┐
│                    TIER 1 — MPIN                      │
│                                                       │
│  Registration:  Phone → OTP → Verify → Set MPIN      │
│  Login:         Phone + 4-digit MPIN → JWT tokens     │
│                                                       │
│  Access Token:  30 minutes (HS256 JWT)                │
│  Refresh Token: 7 days                                │
│                                                       │
│  Allows: Browse, profile, subscriptions, read ops     │
│  Cannot: Apply for loans, give consent, repay         │
└──────────────────────────────────────────────────────┘
                        │
                        ▼ (for financial operations)
┌──────────────────────────────────────────────────────┐
│               TIER 2 — AADHAAR STEP-UP               │
│                                                       │
│  Flow:  Consent → UIDAI OTP → Verify → Session token  │
│  Session: 15-minute elevated access                   │
│  Header: x-aadhaar-token                              │
│                                                       │
│  Allows: Loan apply, consent, repay, insurance,       │
│          LOS submission, post-harvest topup            │
└──────────────────────────────────────────────────────┘
```

### 10.2 Security Measures

| Measure | Configuration |
|---------|--------------|
| OTP | 6 digits, 10-minute expiry |
| Rate limiting | Auth: 20 req/min, OTP: 5 req/min |
| Login lockout | 5 failures → 15-minute lockout |
| JWT issuer | `farmerpay-platform` |
| Device tracking | Device info logged for suspicious login detection |
| Biometrics | Fingerprint/face unlock on mobile (expo-local-authentication) |

### 10.3 Role-Based Access Control (RBAC)

| Role | Access Scope |
|------|-------------|
| `farmer` | Own profile, activities, loans, market data |
| `banker` | Portfolio management, loan approval, analytics |
| `sathi` (field agent) | Assigned farmers, task execution, verification |
| `vendor` | Product listing, transactions, credit |
| `dice_analyst` | Loan analysis tools |
| `system_admin` | Full platform access |

**Association chain:** User → UserRole → Role → RolePermission → Permission

---

## 11. Background Jobs & Message Queue

### 11.1 Scheduled Jobs (node-cron)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `cropAdvisoryJob` | Daily | Generate crop advisories from weather + pest data |
| `imdWeatherFetchJob` | Periodic | Ingest weather data from IMD |
| `pulseDailyIngestJob` | Daily | Ingest mandi prices from Agmarknet, regenerate forecasts |
| `pulseSentinelScanJob` | Daily | Scan loan portfolio for risk signals (EWS) |
| `bankNpaRecalcJob` | Daily | Recalculate NPA classifications across loan book |
| `dairyRecurringJob` | Daily | Process recurring dairy cost templates |
| `fisheryRecurringJob` | Daily | Process recurring fishery cost templates |

### 11.2 RabbitMQ Workers

| Worker | Queue | Purpose |
|--------|-------|---------|
| `auditConsumer` | audit_events | Async processing of audit trail entries |
| `mediaConsumer` | media_jobs | Async image/video processing (Sharp transcoding) |

**Configuration:**
- Exchange: `farmerpay_exchange`
- Prefetch: 10 messages per worker
- Connection: `RABBITMQ_URL` environment variable

---

## 12. Infrastructure & Deployment

### 12.1 Docker

**Multi-stage build:**
```
Stage 1 (Builder):  Node 18 Alpine → npm ci → build
Stage 2 (Runtime):  Node 18 Alpine → copy artifacts → non-root user (nodejs:1001)
```

**Health check:** `/health` endpoint, polled every 30 seconds

### 12.2 Docker Compose

**Development (`docker-compose.yml`):**
- MySQL 8.0 (port 3306)
- Redis 7.x (port 6379)
- RabbitMQ 3.x (port 5672 + management UI on 15672)

**Production (`docker-compose.prod.yml`):**
- Same services with production-tuned configs
- Volume mounts for persistent data

### 12.3 PM2 Process Management

Configured in `ecosystem.config.js`:
- Cluster mode for multi-core utilization
- Auto-restart on crashes
- Log management
- Memory limits

### 12.4 Local Development

```bash
# Start infrastructure
docker-compose up -d

# Install dependencies
npm install

# Run database migrations & seeds
npm run db:migrate
npm run db:seed

# Start backend (nodemon hot-reload)
npm run dev

# Start dashboards (separate terminals)
cd dashboard && npm run dev        # port 3000
cd dashboard-farmer && npm run dev # port 3003
cd dashboard-sathi && npm run dev  # port 3002

# Start mobile app
cd farmer-app && npm start         # Expo DevTools
cd vendor-app && npm start         # Expo DevTools
```

### 12.5 Key Environment Variables

```bash
# Database
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_READ_HOST

# Cache & Queue
REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
RABBITMQ_URL

# Auth
JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
JWT_ACCESS_EXPIRY=30m, JWT_REFRESH_EXPIRY=7d
OTP_LENGTH=6, OTP_EXPIRY_MINUTES=10

# AWS
AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
S3_BUCKET_NAME, KMS_KEY_ID

# External APIs
BHASHINI_API_URL, BHASHINI_USER_ID, BHASHINI_API_KEY
WEATHER_API_URL, WEATHER_API_KEY
PULSE_AGMARKNET_API_KEY

# Feature Flags
FEATURE_BHASHINI_TRANSLATION=true
FEATURE_WEATHER_ALERTS=true
FEATURE_MANDI_PRICES=true
PULSE_FORECAST_ENABLED=true
PULSE_SENTINEL_SCAN_ENABLED=true
```

---

## 13. Key Statistics

| Metric | Value |
|--------|-------|
| Backend source files | ~660 JS/TS |
| Feature modules | 22 |
| Database migrations | 229 |
| Database seeders | 42+ |
| Sequelize models | 150+ |
| Web dashboards | 3 (Admin, Farmer, Sathi) |
| Mobile apps | 2 (Farmer, Vendor) |
| Mobile screens | 72 (farmer-app) |
| External integrations | 10 |
| Scheduled jobs | 7 |
| RabbitMQ workers | 2 |
| Supported languages | 11 |
| API endpoint groups | 20+ |
| npm packages | 538 |
| Existing documentation files | 8 |

---

## Architectural Highlights

1. **Bank-linked lending platform** — Not a general farmer app; core value is digitizing agricultural credit
2. **Two-tier auth** — MPIN for browsing, Aadhaar step-up for financial commitments (UPI-style pattern)
3. **Modular monolith** — 22 independent feature modules with clear boundaries, MVC + service layer
4. **Offline-first mobile** — Edge sync engine on React Native for low-connectivity rural India
5. **Multi-language** — 11 Indian languages via Bhashini API with translation tables across models
6. **Comprehensive audit** — Every write operation logged with user, timestamp, and change delta
7. **Encryption** — Sensitive fields (Aadhaar, bank accounts) encrypted with AWS KMS
8. **Hybrid data** — Real-time mandi prices + ML forecasting + government data (AgriStack, IMD)
9. **Cross-module orchestration** — DICE loans link to ROOTS activities, PULSE prices, SENTINEL risk scores
10. **Government integration ready** — AgriStack (land), Vistaar/Beckn (advisory), Agmarknet (prices), IMD (weather)
