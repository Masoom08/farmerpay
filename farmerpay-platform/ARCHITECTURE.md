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
| Digital Twin | **DRISHTI** | Scenario simulation engine — 6 what-if engines for farmers, Sathis, and bankers |
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
| DRISHTI | `/drishti` | Scenario simulation, templates, benchmarks, comparisons, household data, portfolio stress |

### 8.x DRISHTI API Endpoints (22 endpoints)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/drishti/scenarios/pre-loan` | Pre-Loan Scenario Modeling (3 climate variants) |
| POST | `/drishti/scenarios/household-portfolio` | Household & Activity Portfolio Optimizer |
| POST | `/drishti/scenarios/climate-stress` | Climate Stress Testing (deterministic + MC) |
| POST | `/drishti/scenarios/insurance` | Insurance Decision Engine (PMFBY/livestock/aqua) |
| POST | `/drishti/scenarios/market-timing` | Post-Harvest Market Timing (sell vs store) |
| POST | `/drishti/scenarios/banker-portfolio` | Banker Portfolio Simulation (async >50 farmers) |
| GET | `/drishti/scenarios/:runUuid` | Get scenario run result |
| GET | `/drishti/scenarios/:runUuid/share` | Generate shareable summary (WhatsApp/SMS) |
| GET | `/drishti/scenarios/farmer/:farmerId` | List farmer's scenario runs |
| POST | `/drishti/scenarios/compare` | Compare 2-4 scenarios with delta analysis |
| GET | `/drishti/scenarios/comparison/:compUuid` | Get stored comparison |
| GET | `/drishti/templates` | List all scenario templates |
| GET | `/drishti/templates/:engineType` | Templates for specific engine |
| GET | `/drishti/benchmarks/:districtId` | District-level benchmarks |
| GET | `/drishti/household/:farmerId/income` | Household income sources |
| POST | `/drishti/household/:farmerId/income` | Add/update income source |
| GET | `/drishti/household/:farmerId/expenses` | Household expenses |
| POST | `/drishti/household/:farmerId/expenses` | Add/update expense |
| GET | `/drishti/household/:farmerId/summary` | Complete household financial profile |
| GET | `/drishti/portfolio-runs/:runUuid` | Portfolio batch simulation status |
| GET | `/drishti/portfolio-runs/:runUuid/farmers` | Individual farmer results from portfolio sim |

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
| `drishtiBenchmarkRefreshJob` | Daily (after PULSE ingest) | Aggregate district-level benchmarks, warm Redis cache |

### 11.2 RabbitMQ Workers

| Worker | Queue | Purpose |
|--------|-------|---------|
| `auditConsumer` | audit_events | Async processing of audit trail entries |
| `mediaConsumer` | media_jobs | Async image/video processing (Sharp transcoding) |
| `portfolioSimulationConsumer` | drishti.portfolio.simulation | Async banker portfolio stress testing (>50 farmers) |

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
| Backend source files | ~750 JS/TS |
| Feature modules | 23 (includes DRISHTI) |
| Database migrations | 230 |
| Database seeders | 44+ |
| Sequelize models | 159 (9 new DRISHTI models) |
| Web dashboards | 3 (Admin, Farmer, Sathi) |
| Mobile apps | 2 (Farmer, Vendor) |
| Mobile screens | 78 (farmer-app, 6 new DRISHTI screens) |
| External integrations | 10 |
| Scheduled jobs | 8 |
| RabbitMQ workers | 3 |
| Supported languages | 11 |
| API endpoint groups | 22+ (DRISHTI adds 22 endpoints) |
| Backend tests | 230 (DRISHTI module) |
| npm packages | 540 |
| Existing documentation files | 9 |

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
11. **Digital Twin (DRISHTI)** — 6 scenario engines with Monte Carlo, household-first economics, snapshot-then-compute pattern, 230 tests

---

## Appendix A: Complete Data Model Reference

> Field-level schema for every table in the database. Organized by module. All tables include `created_at` and `updated_at` timestamps unless noted otherwise. `PK` = Primary Key, `FK` = Foreign Key, `UQ` = Unique.

---

### A.1 AUTH & USERS (9 tables)

#### `users`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| user_id | STRING(36) | NOT NULL, UQ |
| email | STRING(120) | UQ, nullable |
| mobile | STRING(13) | NOT NULL, UQ |
| password_hash | STRING(255) | NOT NULL |
| first_name | STRING(100) | NOT NULL |
| last_name | STRING(100) | nullable |
| profile_picture_url | STRING(500) | nullable |
| date_of_birth | DATEONLY | nullable |
| gender | ENUM | 'male', 'female', 'other' |
| is_email_verified | BOOLEAN | DEFAULT false |
| is_mobile_verified | BOOLEAN | DEFAULT false |
| last_login | DATE | nullable |
| failed_login_attempts | INTEGER | DEFAULT 0 |
| account_locked_until | DATE | nullable |
| is_active | BOOLEAN | DEFAULT true |

**Associations:** hasMany UserRole, UserPermission, UserSession, PasswordResetToken, FarmerProfile, FarmerAddress, FarmerBankAccount, NotificationV2

#### `roles`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| role_name | STRING(50) | UQ |
| display_name | STRING(100) | |
| description | TEXT | nullable |
| priority | INTEGER | DEFAULT 0 |
| is_active | BOOLEAN | DEFAULT true |

**Seed data:** FARMER, AGENT, VENDOR, VENDOR_AGENT, BANK_USER, BANK_ADMIN, SYSTEM_OPERATOR, ADMIN

#### `permissions`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| permission_code | STRING(100) | UQ |
| display_name | STRING(150) | |
| description | TEXT | nullable |
| category | STRING(50) | auth, farmer, loan, transaction, report, roots, vyapar, admin |
| is_active | BOOLEAN | DEFAULT true |

#### `user_roles`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| user_id | INTEGER | FK → users |
| role_id | INTEGER | FK → roles |
| assigned_at | DATE | |
| assigned_by | INTEGER | FK → users, nullable |
| is_active | BOOLEAN | DEFAULT true |

**Index:** UNIQUE(user_id, role_id)

#### `user_permissions`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| user_id | INTEGER | FK → users |
| permission_id | INTEGER | FK → permissions |
| granted_at | DATE | |
| granted_by | INTEGER | FK → users, nullable |
| is_active | BOOLEAN | DEFAULT true |

**Index:** UNIQUE(user_id, permission_id)

#### `role_permissions`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| role_id | INTEGER | FK → roles |
| permission_id | INTEGER | FK → permissions |

**Index:** UNIQUE(role_id, permission_id)

#### `user_sessions`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| user_id | INTEGER | FK → users |
| session_token | STRING(255) | UQ |
| refresh_token | STRING(255) | |
| device_info | STRING(255) | nullable |
| device_uuid | STRING(36) | nullable |
| ip_address | STRING(45) | nullable |
| user_agent | TEXT | nullable |
| expires_at | DATE | |
| refreshed_at | DATE | nullable |
| logged_out_at | DATE | nullable |
| is_active | BOOLEAN | DEFAULT true |

#### `otp_requests`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| otp_request_id | STRING(36) | UQ |
| mobile | STRING(13) | nullable |
| email | STRING(120) | nullable |
| otp_code | STRING(6) | |
| purpose | ENUM | 'register', 'login', 'reset_password', 'update_contact' |
| sent_via | ENUM | 'sms', 'email', 'both' |
| attempt_count | INTEGER | DEFAULT 0 |
| max_attempts | INTEGER | DEFAULT 3 |
| expires_at | DATE | |
| verified_at | DATE | nullable |
| request_timestamp | DATE | |

#### `password_reset_tokens`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| user_id | INTEGER | FK → users |
| token_hash | STRING(255) | UQ |
| expires_at | DATE | |
| used_at | DATE | nullable |
| ip_address | STRING(45) | nullable |

---

### A.2 FARMER PROFILE (16 tables)

#### `farmer_profiles`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| farmer_id | INTEGER | FK → users, UQ |
| profile_uuid | STRING(36) | UQ |
| full_name | STRING(120) | |
| alternate_phone | STRING(13) | nullable |
| contact_stale | BOOLEAN | DEFAULT false |
| contact_last_verified_at | DATE | nullable |
| aadhaar_number | STRING(255) | KMS-encrypted, Level 4 |
| aadhaar_encrypted_by_kms | BOOLEAN | DEFAULT false |
| aadhaar_audit_logged | BOOLEAN | DEFAULT false |
| aadhaar_last_verified | DATE | nullable |
| date_of_birth | DATEONLY | nullable |
| gender | ENUM | 'male', 'female', 'other' |
| father_name | STRING(120) | nullable |
| mother_name | STRING(120) | nullable |
| education_level | ENUM | 'illiterate', 'primary', 'secondary', 'higher_secondary', 'graduate', 'post_graduate' |
| marital_status | ENUM | 'single', 'married', 'divorced', 'widowed', 'prefer_not_to_say' |
| bank_account_verified | BOOLEAN | DEFAULT false |
| gst_registered | BOOLEAN | DEFAULT false |
| gst_number | STRING(15) | nullable |
| fpo_member | BOOLEAN | DEFAULT false |
| fpo_id | INTEGER | nullable |
| is_govt_land_owner | BOOLEAN | DEFAULT false |
| land_ownership_type | ENUM | 'owned', 'leased', 'shared', 'govt_allotted' |
| total_farm_size_hectares | DECIMAL(10,4) | nullable |
| primary_crop | STRING(50) | nullable |
| secondary_crops | TEXT | nullable |
| years_farming_experience | INTEGER | nullable |
| onboarding_status | ENUM | 'not_started', 'step1_personal', 'step2_contact', 'step3_location', 'step4_bank', 'completed' |
| onboarding_completed_at | DATE | nullable |
| profile_completeness_percentage | INTEGER | DEFAULT 0 |
| is_active | BOOLEAN | DEFAULT true |

**Associations:** belongsTo User, hasOne FarmerProfileDetail, hasMany FarmerAddress, FarmerBankAccount, hasOne FarmerActivityPreference

#### `farmer_profile_details`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| farmer_profile_id | INTEGER | FK → farmer_profiles |
| family_members | INTEGER | nullable |
| children_count | INTEGER | nullable |
| dependents_count | INTEGER | nullable |
| primary_income_source | ENUM | 'farming', 'labor', 'business', 'salary', 'other' |
| secondary_income_source_active | BOOLEAN | DEFAULT false |
| secondary_income_source | STRING(50) | nullable |
| avg_annual_income | DECIMAL(15,2) | nullable |
| has_irrigation | BOOLEAN | DEFAULT false |
| irrigation_type | STRING(50) | nullable |
| has_pesticides | BOOLEAN | DEFAULT false |
| has_seeds | BOOLEAN | DEFAULT false |
| is_active | BOOLEAN | DEFAULT true |

#### `farmer_addresses`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| farmer_id | INTEGER | FK → users |
| address_type | ENUM | 'permanent', 'current', 'farm' |
| lgd_state_id | INTEGER | nullable |
| lgd_district_id | INTEGER | nullable |
| lgd_block_id | INTEGER | nullable |
| lgd_village_id | INTEGER | nullable |
| street_address | STRING(255) | nullable |
| postal_code | STRING(10) | nullable |
| latitude | DECIMAL(10,8) | nullable |
| longitude | DECIMAL(11,8) | nullable |
| is_primary_address | BOOLEAN | DEFAULT false |
| address_verified_by_agent | BOOLEAN | DEFAULT false |
| agent_verification_timestamp | DATE | nullable |
| verification_photo_url | TEXT | nullable |
| is_active | BOOLEAN | DEFAULT true |

**Index:** UNIQUE(farmer_id, address_type) WHERE is_active = true

#### `farmer_gps_locations`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| farmer_id | INTEGER | FK → users |
| field_id | INTEGER | nullable |
| latitude | DECIMAL(10,8) | |
| longitude | DECIMAL(11,8) | |
| accuracy_meters | INTEGER | nullable |
| recorded_at | DATE | |
| device_uuid | STRING(36) | nullable |
| is_field_boundary_point | BOOLEAN | DEFAULT false |
| is_active | BOOLEAN | DEFAULT true |

#### `farmer_bank_accounts`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| farmer_id | INTEGER | FK → users |
| account_holder_name | STRING(120) | |
| bank_name | STRING(100) | |
| account_number | STRING(255) | Encrypted, Level 3 |
| account_number_masked | STRING(20) | |
| ifsc_code | STRING(11) | |
| account_type | ENUM | 'savings', 'current', 'other' |
| is_primary_account | BOOLEAN | DEFAULT false |
| verified_at | DATE | nullable |
| verification_method | ENUM | 'micro_deposit', 'api', 'manual' |
| is_active | BOOLEAN | DEFAULT true |

#### `farmer_activity_preferences`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| farmer_id | INTEGER | FK → users, UQ |
| prefers_mobile_app | BOOLEAN | DEFAULT true |
| prefers_sms | BOOLEAN | DEFAULT true |
| prefers_call | BOOLEAN | DEFAULT false |
| prefers_email | BOOLEAN | DEFAULT false |
| notification_frequency | ENUM | 'real_time', 'daily', 'weekly', 'monthly', 'never' |
| preferred_language | STRING(10) | DEFAULT 'en' |
| preferred_time_window_start | STRING(5) | nullable |
| preferred_time_window_end | STRING(5) | nullable |
| is_active | BOOLEAN | DEFAULT true |

#### `farmer_language_preferences`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| farmer_id | INTEGER | FK → users |
| language_code | STRING(10) | |
| proficiency | ENUM | 'basic', 'intermediate', 'fluent', 'native' |
| preferred_order | INTEGER | DEFAULT 0 |
| is_active | BOOLEAN | DEFAULT true |

**Index:** UNIQUE(farmer_id, language_code)

#### `field_agent_profiles`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| agent_user_id | INTEGER | FK → users, UQ |
| agent_code | STRING(20) | UQ |
| field_agent_name | STRING(120) | |
| lgd_state_id | INTEGER | nullable |
| lgd_district_id | INTEGER | nullable |
| lgd_block_id | INTEGER | nullable |
| service_radius_km | INTEGER | nullable |
| mobile | STRING(13) | |
| is_active | BOOLEAN | DEFAULT true |

#### `field_agent_farmer_assignments`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| field_agent_profile_id | INTEGER | FK → field_agent_profiles |
| farmer_id | INTEGER | FK → users |
| lgd_village_id | INTEGER | nullable |
| assigned_at | DATE | |
| assigned_by | INTEGER | nullable |
| unassigned_at | DATE | nullable |
| unassigned_by | INTEGER | nullable |
| is_active | BOOLEAN | DEFAULT true |

#### `kyc_verification_logs`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| farmer_id | INTEGER | FK → users |
| kyc_document_type | ENUM | 'aadhaar', 'pan', 'drivers_license', 'voter_id', 'land_document' |
| document_number | STRING(50) | |
| document_image_url | STRING(255) | nullable |
| verified_at | DATE | nullable |
| verified_by_admin | INTEGER | nullable |
| verification_status | ENUM | 'pending', 'verified', 'rejected', 'expired' |
| rejection_reason | TEXT | nullable |
| is_active | BOOLEAN | DEFAULT true |

#### `onboarding_progress`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| farmer_id | INTEGER | FK → users |
| step_name | STRING(50) | |
| step_number | INTEGER | |
| is_completed | BOOLEAN | DEFAULT false |
| completed_at | DATE | nullable |
| data_snapshot | JSON | nullable |
| is_active | BOOLEAN | DEFAULT true |

**Index:** UNIQUE(farmer_id, step_number)

#### `profile_completeness_scores`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| farmer_id | INTEGER | FK → users |
| category | STRING(50) | |
| score_percentage | INTEGER | DEFAULT 0 |
| last_updated | DATE | |
| is_active | BOOLEAN | DEFAULT true |

**Index:** UNIQUE(farmer_id, category)

#### `farmer_scheme_enrollments`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| enrollment_uuid | STRING(36) | UQ |
| farmer_id | INTEGER | FK → users |
| scheme_code | STRING(20) | |
| scheme_name | STRING(100) | |
| scheme_category | ENUM | 'pm_kisan', 'pmfby', 'pmmsy', 'midh', 'smam', 'aif', 'nrlm', 'dbt_other' |
| enrollment_status | ENUM | 'active', 'expired', 'pending', 'rejected' |
| benefit_amount | DECIMAL(12,2) | nullable |
| last_benefit_date | DATEONLY | nullable |
| benefit_frequency | ENUM | 'annual', 'seasonal', 'one_time', 'monthly' |
| verification_source | STRING(50) | nullable |
| is_active | BOOLEAN | DEFAULT true |

#### `fpo_memberships`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| membership_uuid | STRING(36) | UQ |
| farmer_id | INTEGER | FK → users |
| fpo_name | STRING(100) | |
| fpo_registration_number | STRING(50) | nullable |
| membership_status | ENUM | 'active', 'inactive', 'suspended' |
| share_value | DECIMAL(10,2) | nullable |
| joined_date | DATEONLY | nullable |
| is_active | BOOLEAN | DEFAULT true |

#### `fpo_transactions`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| transaction_uuid | STRING(36) | UQ |
| fpo_membership_id | INTEGER | FK → fpo_memberships |
| farmer_id | INTEGER | FK → users |
| transaction_type | ENUM | 'commodity_pooling', 'input_purchase', 'payout', 'share_dividend' |
| commodity | STRING(50) | nullable |
| quantity | DECIMAL(12,2) | nullable |
| unit | STRING(20) | nullable |
| price_per_unit | DECIMAL(10,2) | nullable |
| total_amount | DECIMAL(12,2) | |
| fpo_margin_pct | DECIMAL(5,2) | nullable |
| farmer_payout | DECIMAL(12,2) | nullable |
| transaction_date | DATEONLY | |
| is_active | BOOLEAN | DEFAULT true |

#### `contract_farming_agreements`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| agreement_uuid | STRING(36) | UQ |
| farmer_id | INTEGER | FK → users |
| buyer_company_name | STRING(100) | |
| buyer_contact | STRING(100) | nullable |
| crop | STRING(50) | |
| variety | STRING(50) | nullable |
| agreed_price_per_unit | DECIMAL(10,2) | |
| quantity_commitment | DECIMAL(12,2) | |
| unit | STRING(20) | |
| delivery_start_date | DATEONLY | |
| delivery_end_date | DATEONLY | |
| penalty_clause_summary | TEXT | nullable |
| payment_terms | STRING(200) | nullable |
| agreement_status | ENUM | 'active', 'completed', 'terminated', 'expired' |
| document_url | STRING(500) | nullable |
| season | STRING(20) | nullable |
| is_active | BOOLEAN | DEFAULT true |

---

### A.3 LOCATION / LGD HIERARCHY (8 tables)

#### `lgd_states`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| state_code | STRING(10) | UQ |
| state_name | STRING(100) | |
| state_name_en | STRING(100) | |
| state_abbreviation | STRING(5) | nullable |
| region | STRING(50) | nullable |
| is_union_territory | BOOLEAN | DEFAULT false |
| gst_code | STRING(5) | nullable |
| longitude | DECIMAL(11,8) | nullable |
| latitude | DECIMAL(10,8) | nullable |
| is_active | BOOLEAN | DEFAULT true |

#### `lgd_state_translations`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| lgd_state_id | INTEGER | FK → lgd_states |
| language_code | STRING(10) | |
| state_name_translated | STRING(100) | |
| is_active | BOOLEAN | DEFAULT true |

**Index:** UNIQUE(lgd_state_id, language_code)

#### `lgd_districts`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| district_code | STRING(10) | UQ |
| state_id | INTEGER | FK → lgd_states |
| district_name | STRING(100) | |
| district_name_en | STRING(100) | |
| longitude | DECIMAL(11,8) | nullable |
| latitude | DECIMAL(10,8) | nullable |
| is_active | BOOLEAN | DEFAULT true |

#### `lgd_district_translations`
Same pattern as state translations. **Index:** UNIQUE(lgd_district_id, language_code)

#### `lgd_blocks`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| block_code | STRING(10) | UQ |
| district_id | INTEGER | FK → lgd_districts |
| block_name | STRING(100) | |
| block_name_en | STRING(100) | |
| longitude | DECIMAL(11,8) | nullable |
| latitude | DECIMAL(10,8) | nullable |
| is_active | BOOLEAN | DEFAULT true |

#### `lgd_block_translations`
Same pattern. **Index:** UNIQUE(lgd_block_id, language_code)

#### `lgd_villages`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| village_code | STRING(10) | UQ |
| block_id | INTEGER | FK → lgd_blocks |
| village_name | STRING(100) | |
| village_name_en | STRING(100) | |
| total_households | INTEGER | nullable |
| population | INTEGER | nullable |
| has_bank_branch | BOOLEAN | DEFAULT false |
| has_primary_school | BOOLEAN | DEFAULT false |
| has_secondary_school | BOOLEAN | DEFAULT false |
| longitude | DECIMAL(11,8) | nullable |
| latitude | DECIMAL(10,8) | nullable |
| is_active | BOOLEAN | DEFAULT true |

#### `lgd_village_translations`
Same pattern. **Index:** UNIQUE(lgd_village_id, language_code)

---

### A.4 DOCUMENTS, MEDIA, AUDIT & NOTIFICATIONS (19 tables)

#### `languages`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| language_code | STRING(10) | UQ |
| language_name | STRING(50) | |
| native_name | STRING(50) | |
| iso_639_1 | STRING(2) | |
| is_supported | BOOLEAN | DEFAULT true |
| is_rtl | BOOLEAN | DEFAULT false |
| is_active | BOOLEAN | DEFAULT true |

**Seed data:** en, hi, bn, te, mr, ta, gu, kn, ml, pa, or (11 languages)

#### `language_translations` (polymorphic)
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| translatable_type | STRING(100) | |
| translatable_id | INTEGER | |
| language_code | STRING(10) | |
| key_name | STRING(100) | |
| translated_value | TEXT | |
| is_active | BOOLEAN | DEFAULT true |

**Index:** UNIQUE(translatable_type, translatable_id, language_code, key_name)

#### `documents_v2`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| document_uuid | STRING(36) | UQ |
| owner_id | INTEGER | |
| document_type | ENUM | 'kyc', 'loan_application', 'land_proof', 'bank_statement', 'other_evidence', 'receipt', 'agreement' |
| document_name | STRING(255) | |
| file_extension | STRING(10) | |
| file_size_bytes | INTEGER | |
| mime_type | STRING(50) | |
| s3_key | STRING(255) | |
| s3_bucket | STRING(100) | |
| uploaded_at | DATE | |
| uploaded_by | INTEGER | |
| is_encrypted | BOOLEAN | DEFAULT false |
| encryption_key_id | STRING(100) | nullable |
| visibility | ENUM | 'private', 'shared', 'public' |
| expiry_date | DATE | nullable |
| is_active | BOOLEAN | DEFAULT true |

**Associations:** hasMany DocumentTranslation, DocumentAccessLog, DocumentApproval, DocumentVersion

#### `document_translations`
document_id (FK), language_code, document_name_translated, description_translated (TEXT). **Index:** UNIQUE(document_id, language_code)

#### `document_access_logs`
document_id (FK), accessed_by, access_type (ENUM: 'view', 'download', 'print', 'export'), accessed_at, ip_address, device_info (TEXT)

#### `document_approvals`
document_id (FK), approved_by, approval_status (ENUM: 'pending', 'approved', 'rejected'), approved_at, rejection_reason (TEXT)

#### `document_versions`
document_id (FK), version_number, s3_key, created_by. **Index:** UNIQUE(document_id, version_number)

#### `media_assets`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| asset_uuid | STRING(36) | UQ |
| asset_type | ENUM | 'image', 'video', 'audio', 'pdf' |
| owner_id | INTEGER | |
| original_filename | STRING(255) | |
| file_size_bytes | INTEGER | |
| mime_type | STRING(50) | |
| s3_key | STRING(255) | |
| s3_bucket | STRING(100) | |
| duration_seconds | INTEGER | nullable |
| width | INTEGER | nullable |
| height | INTEGER | nullable |
| is_public | BOOLEAN | DEFAULT false |
| uploaded_by | INTEGER | |
| uploaded_at | DATE | |
| is_active | BOOLEAN | DEFAULT true |

**Associations:** hasMany MediaTag, MediaAccessLog, MediaProcessingJob, MediaTranslation, MediaRendition

#### `media_tags`
media_asset_id (FK), tag_name. **Index:** UNIQUE(media_asset_id, tag_name)

#### `media_access_logs`
media_asset_id (FK), accessed_by, accessed_at, ip_address

#### `media_processing_jobs`
media_asset_id (FK), job_type (ENUM: 'thumbnail', 'compress', 'convert'), job_status (ENUM: 'pending', 'in_progress', 'completed', 'failed'), started_at, completed_at, error_message (TEXT)

#### `media_translations`
media_asset_id (FK), language_code, title_translated, description_translated (TEXT). **Index:** UNIQUE(media_asset_id, language_code)

#### `media_renditions`
media_asset_id (FK), rendition_type, file_size_bytes, dimensions, s3_key

#### `audit_logs_v2`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| audit_uuid | STRING(36) | UQ |
| entity_type | STRING(100) | |
| entity_id | INTEGER | |
| action | ENUM | 'create', 'read', 'update', 'delete', 'export', 'approve', 'reject' |
| action_by | INTEGER | |
| action_at | DATE | |
| changed_fields | JSON | nullable |
| old_values | JSON | nullable |
| new_values | JSON | nullable |
| ip_address | STRING(45) | nullable |
| user_agent | TEXT | nullable |
| sensitivity_level | ENUM | '1_public', '2_pii', '3_financial', '4_identity' |
| request_id | STRING(36) | nullable |
| is_active | BOOLEAN | DEFAULT true |

**Associations:** hasMany AuditTrail

#### `audit_trails`
audit_log_id (FK), change_sequence, field_name, old_value (TEXT), new_value (TEXT)

#### `audit_export_logs`
exported_by, entity_type, filter_criteria (JSON), row_count, exported_at, s3_export_key

#### `notification_templates`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| template_code | STRING(100) | UQ |
| template_name | STRING(255) | |
| category | STRING(50) | |
| subject_line | STRING(255) | |
| body_template | TEXT | |
| supported_channels | STRING(50) | |
| priority | ENUM | 'low', 'normal', 'high', 'urgent' |
| retry_count | INTEGER | DEFAULT 3 |
| is_active | BOOLEAN | DEFAULT true |

#### `notification_template_translations`
template_id (FK), language_code, subject_translated, body_translated (TEXT). **Index:** UNIQUE(template_id, language_code)

#### `notifications_v2`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| notification_uuid | STRING(36) | UQ |
| recipient_user_id | INTEGER | FK → users |
| template_id | INTEGER | FK → notification_templates |
| notification_type | ENUM | 'alert', 'info', 'warning', 'success', 'reminder' |
| channels_used | STRING(50) | |
| template_variables | JSON | nullable |
| sent_at | DATE | nullable |
| read_at | DATE | nullable |
| delivery_status | ENUM | 'pending', 'sent', 'failed', 'bounced' |
| error_message | TEXT | nullable |
| request_id | STRING(36) | nullable |
| is_active | BOOLEAN | DEFAULT true |

---

### A.5 TRUST SCORING (13 tables)

#### `trust_sections`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| section_uuid | STRING(36) | UQ |
| section_code | STRING(20) | UQ |
| section_name | STRING(100) | |
| section_description | TEXT | nullable |
| section_order | INTEGER | |
| weight_in_total_score | DECIMAL(5,2) | percentage |
| max_points | INTEGER | |
| is_active | BOOLEAN | DEFAULT true |

**Seed data sections:** Personal, Farm, Financial, Repayment, Collateral, Network

#### `trust_questions`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| question_uuid | STRING(36) | UQ |
| section_id | INTEGER | FK → trust_sections |
| question_text | TEXT | |
| question_type | ENUM | 'yes_no', 'numeric_input', 'multiple_choice', 'text_input' |
| required_answer_type | ENUM | 'boolean', 'number', 'choice', 'text' |
| min_value | DECIMAL | nullable |
| max_value | DECIMAL | nullable |
| unit_of_measurement | STRING(30) | nullable |
| conditional_logic | JSON | nullable |
| depends_on_question_id | INTEGER | FK → trust_questions (self-ref), nullable |
| is_active | BOOLEAN | DEFAULT true |

#### `trust_question_choices`
question_id (FK), choice_text, choice_value, choice_order, points_awarded

#### `trust_question_conditions`
question_id (FK), condition_type (ENUM: 'equals', 'greater_than', 'less_than', 'between', 'contains'), condition_value, resulting_points

#### `trust_text_input_scoring_ranges`
question_id (FK), input_min (DECIMAL), input_max (DECIMAL), points_awarded, description

#### `trust_responses`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| response_uuid | STRING(36) | UQ |
| farmer_id | INTEGER | FK → users |
| question_id | INTEGER | FK → trust_questions |
| response_timestamp | DATE | |
| is_active | BOOLEAN | DEFAULT true |

**Index:** UNIQUE(farmer_id, question_id)

#### `trust_response_choices`
trust_response_id (FK), choice_id (FK)

#### `trust_response_numeric`
trust_response_id (FK), numeric_value (DECIMAL)

#### `trust_section_progress`
farmer_id (FK), section_id (FK), responses_collected, questions_in_section, section_start_timestamp, section_complete_timestamp, section_status (ENUM: 'not_started', 'in_progress', 'completed'). **Index:** UNIQUE(farmer_id, section_id)

#### `trust_score_calculations`
calculation_uuid (UQ), farmer_id (FK), section_id (FK), raw_points, max_possible_points, normalized_score, contribution_to_total (DECIMAL), calculated_at, calculation_basis

#### `trust_score_history`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| score_history_uuid | STRING(36) | UQ |
| farmer_id | INTEGER | FK → users |
| total_trust_score | DECIMAL | |
| score_band | ENUM | 'poor', 'fair', 'good', 'excellent' |
| score_band_min | DECIMAL | |
| score_band_max | DECIMAL | |
| section_scores | JSON | breakdown by section |
| calculated_at | DATE | |
| is_active | BOOLEAN | DEFAULT true |

**Index:** UNIQUE(farmer_id, calculated_at)

#### `trust_question_version_history`
question_id (FK), version_number, question_text_old, question_text_new, changed_at, changed_by, change_reason (TEXT)

#### `trust_score_appeals`
appeal_uuid (UQ), farmer_id (FK), appeal_against_score, appeal_reason (TEXT), appeal_submitted_at, reviewed_by_admin, appeal_status (ENUM: 'pending', 'approved', 'rejected', 'under_review'), appeal_decision_at, decision_notes (TEXT)

---

### A.6 DICE — LOANS (20 tables)

#### `loan_provider_types`
provider_type_code (UQ), provider_type_name, description (TEXT). **Seed:** bank, microfinance, cooperative, government_scheme, private_lender

#### `loan_providers`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| provider_uuid | STRING(36) | UQ |
| provider_type_id | INTEGER | FK → loan_provider_types |
| provider_name | STRING(150) | |
| provider_code | STRING(50) | UQ |
| primary_contact_name | STRING(100) | nullable |
| primary_contact_phone | STRING(13) | nullable |
| primary_contact_email | STRING(120) | nullable |
| headquarters_state_id | INTEGER | nullable |
| is_rbi_regulated | BOOLEAN | DEFAULT false |
| rbi_license_number | STRING(50) | nullable |
| operates_in_states | TEXT | nullable |
| service_radius_km | INTEGER | nullable |
| website_url | STRING(255) | nullable |
| api_integration_status | ENUM | 'none', 'api', 'csv_upload' |
| is_active | BOOLEAN | DEFAULT true |

#### `loan_categories`
category_code (UQ), category_name, category_order. **Seed:** term_loan, working_capital, equipment_finance, input_credit

#### `loan_subcategories`
category_id (FK), subcategory_code, subcategory_name. **Index:** UNIQUE(category_id, subcategory_code)

#### `loan_products`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| product_uuid | STRING(36) | UQ |
| provider_id | INTEGER | FK → loan_providers |
| category_id | INTEGER | FK → loan_categories |
| subcategory_id | INTEGER | FK → loan_subcategories, nullable |
| product_name | STRING(150) | |
| product_code | STRING(50) | |
| product_description | TEXT | nullable |
| min_loan_amount | DECIMAL(15,2) | |
| max_loan_amount | DECIMAL(15,2) | |
| min_interest_rate | DECIMAL(5,3) | |
| max_interest_rate | DECIMAL(5,3) | |
| processing_fee_percent | DECIMAL(5,3) | nullable |
| is_floating_rate | BOOLEAN | DEFAULT false |
| tenure_months_min | INTEGER | |
| tenure_months_max | INTEGER | |
| repayment_frequency | ENUM | 'weekly', 'monthly', 'quarterly', 'seasonal', 'custom' |
| repayment_type | ENUM | 'emi', 'bullet', 'interest_only', 'flexible' |
| moratorium_period_months | INTEGER | DEFAULT 0 |
| collateral_type | ENUM | 'none', 'gold', 'land', 'crop_hypothecation', 'equipment', 'other' |
| is_gold_loan | BOOLEAN | DEFAULT false |
| ltv_cap_pct | DECIMAL(5,2) | nullable |
| max_bullet_tenure_months | INTEGER | nullable |
| psl_eligible | BOOLEAN | DEFAULT false |
| psl_category | ENUM | 'agriculture', 'small_marginal_farmer', 'allied_activities', 'msme', 'other' |
| is_active | BOOLEAN | DEFAULT true |

#### `scale_of_finances`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| sof_code | STRING(50) | UQ |
| sof_name | STRING(100) | |
| min_land_size_hectares | DECIMAL(10,4) | |
| max_land_size_hectares | DECIMAL(10,4) | |
| avg_investment_amount | DECIMAL(15,2) | |
| recommended_loan_amount | DECIMAL(15,2) | |
| is_active | BOOLEAN | DEFAULT true |

**Seed:** marginal_farmers (0-1 ha, ₹50K), small_farmers (1-2 ha, ₹1.5L), medium_farmers (2-10 ha, ₹5L), large_farmers (10+ ha, ₹15L)

#### `unit_economics`
ue_uuid (UQ), sof_id (FK nullable), crop_id, state_id, total_cost_per_hectare (DECIMAL), expected_yield_kg_per_hectare, expected_price_per_kg (DECIMAL), expected_gross_return (DECIMAL), expected_net_profit (DECIMAL), repayment_period_months, last_updated

#### `loan_product_eligibility_rules`
product_id (FK), rule_type (ENUM: 'min_trust_score', 'max_loan_amount', 'min_land_size', 'max_land_size', 'state_requirement', 'crop_requirement', 'age_requirement', 'fpo_requirement'), rule_value, applies_if_condition (JSON)

#### `loan_applications`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| application_uuid | STRING(36) | UQ |
| farmer_id | INTEGER | FK → users |
| loan_product_id | INTEGER | FK → loan_products |
| apply_for_amount | DECIMAL(15,2) | |
| apply_for_tenure_months | INTEGER | |
| intended_use | STRING(200) | nullable |
| existing_loan_balance | DECIMAL(15,2) | DEFAULT 0 |
| existing_loan_lender | STRING(100) | nullable |
| application_status | ENUM | 'draft', 'submitted', 'under_review', 'forwarded_to_bank', 'bank_review', 'approved', 'rejected', 'disbursed', 'active', 'closed', 'defaulted' |
| applied_at | DATE | |
| application_verified_by_agent | INTEGER | nullable |
| application_verified_at | DATE | nullable |
| rejected_reason | TEXT | nullable |
| approval_amount | DECIMAL(15,2) | nullable |
| approval_interest_rate | DECIMAL(5,3) | nullable |
| approval_tenure_months | INTEGER | nullable |
| approved_by_bank_user | INTEGER | nullable |
| approved_at | DATE | nullable |
| risk_score | DECIMAL(5,2) | nullable |
| collateral_type | ENUM | 'none', 'gold', 'land', 'crop_hypothecation', 'equipment', 'other' |
| is_gold_loan | BOOLEAN | DEFAULT false |
| repayment_type | ENUM | 'emi', 'bullet', 'interest_only', 'flexible' |
| psl_classification | ENUM | 'agriculture', 'small_marginal_farmer', 'allied_activities', 'non_agriculture', 'consumption' |
| end_use_declaration | TEXT | nullable |
| end_use_verified | BOOLEAN | DEFAULT false |
| is_active | BOOLEAN | DEFAULT true |

#### `loan_application_statuses`
application_id (FK), status (same ENUM as above), status_changed_at, changed_by, status_notes (TEXT)

#### `loan_application_status_history`
application_id (FK), from_status, to_status, transitioned_at, transitioned_by, transition_reason (TEXT)

#### `loan_application_documents`
application_id (FK), document_id, document_type (ENUM: 'kyc_aadhaar', 'land_document', 'bank_statement', 'income_proof', 'collateral_proof', 'other'), is_mandatory, verified, verified_by_bank_user, verified_at

#### `loan_application_bank_notes`
application_id (FK), bank_officer_id, note_text (TEXT), note_type (ENUM: 'internal_review', 'verification_needed', 'risk_flag', 'approval_comment'), noted_at

#### `loan_disbursements`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| disbursement_uuid | STRING(36) | UQ |
| application_id | INTEGER | FK → loan_applications |
| disbursement_amount | DECIMAL(15,2) | |
| disbursement_mode | ENUM | 'bank_transfer', 'upi', 'cheque', 'cash', 'demand_draft' |
| requested_at | DATE | |
| approved_at | DATE | nullable |
| approved_by | INTEGER | nullable |
| transferred_to_bank_account_id | INTEGER | nullable |
| transferred_at | DATE | nullable |
| utr_reference_number | STRING(50) | nullable |
| cash_amount | DECIMAL(15,2) | nullable |
| digital_amount | DECIMAL(15,2) | nullable |
| is_active | BOOLEAN | DEFAULT true |

#### `loan_repayment_schedules`
application_id (FK), schedule_number, due_date (DATEONLY), due_amount (DECIMAL), principal_amount (DECIMAL), interest_amount (DECIMAL), is_paid, paid_date, paid_amount, days_overdue, status (ENUM: 'pending', 'paid', 'overdue', 'forgiven')

#### `loan_repayments`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| repayment_uuid | STRING(36) | UQ |
| application_id | INTEGER | FK → loan_applications |
| schedule_id | INTEGER | FK → loan_repayment_schedules |
| repayment_date | DATEONLY | |
| repayment_amount | DECIMAL(15,2) | |
| payment_method | ENUM | 'bank_transfer', 'cash', 'check', 'digital_wallet' |
| utr_reference | STRING(50) | nullable |
| repaid_by_farmer | BOOLEAN | DEFAULT true |
| recorded_by_agent | INTEGER | nullable |
| is_subvention_eligible | BOOLEAN | DEFAULT false |
| subvention_rate_pct | DECIMAL(5,2) | nullable |
| subvention_amount | DECIMAL(15,2) | nullable |
| prompt_repayment_bonus | DECIMAL(15,2) | nullable |
| is_active | BOOLEAN | DEFAULT true |

#### `farmer_loan_bookmarks`
farmer_id (FK), product_id (FK), bookmarked_at, bookmark_notes. **Index:** UNIQUE(farmer_id, product_id)

#### `loan_integration_logs`
provider_id (FK nullable), integration_type (ENUM: 'product_sync', 'application_submit', 'disbursement_notify', 'repayment_sync'), request_payload (JSON), response_payload (JSON), integration_status (ENUM: 'pending', 'success', 'failed', 'partial'), error_message (TEXT), integrated_at

#### `loan_insurance_bundled`
application_id (FK), insurance_product_name, insurance_provider, premium_amount (DECIMAL), premium_is_bundled, coverage_amount (DECIMAL)

---

### A.7 ROOTS — CROP KNOWLEDGE BASE (24 tables)

#### `organizations`
org_code (UQ), org_name, org_type (ENUM: 'government', 'private', 'ngo', 'research_institute', 'cooperative'), headquarters_state_id, is_verified

#### `traits`
trait_code (UQ), trait_name, trait_category, trait_description (TEXT), measurement_unit, is_quantifiable

#### `soil_types`
soil_type_code (UQ), soil_type_name, parent_soil_type_id (self-ref FK nullable), texture_class, color_description, ph_range_min/max (DECIMAL), org_matter_range_min/max (DECIMAL), permeability_class

#### `soil_type_translations`
soil_type_id (FK), language_code, soil_type_name_translated. **Index:** UNIQUE(soil_type_id, language_code)

#### `climate_zones`
zone_code (UQ), zone_name, temperature_range_min/max, rainfall_range_min/max

#### `crop_masters`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| crop_id | STRING(36) | UQ |
| crop_code | STRING(20) | UQ |
| crop_name | STRING(100) | |
| crop_group | STRING(50) | |
| botanical_name | STRING(100) | nullable |
| crop_duration_days_min | INTEGER | |
| crop_duration_days_max | INTEGER | |
| is_annual | BOOLEAN | DEFAULT false |
| is_perennial | BOOLEAN | DEFAULT false |
| ideal_season | ENUM | 'kharif', 'rabi', 'summer', 'year_round', 'multiple' |
| water_requirement_mm | INTEGER | nullable |
| is_active | BOOLEAN | DEFAULT true |

**Associations:** hasMany CropTranslation, CropSeason, CropEstablishmentMethod, VarietyMaster

#### `crop_translations`
crop_id (FK), language_code, crop_name_translated

#### `crop_seasons`
crop_id (FK), season_name, sowing_start_month, sowing_end_month, harvest_start_month, harvest_end_month, region_specific

#### `crop_establishment_methods`
crop_id (FK), method_name (e.g., 'direct_sowing', 'transplanting'), method_description, recommended_for_season

#### `variety_masters`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| variety_id | STRING(36) | UQ |
| crop_id | INTEGER | FK → crop_masters |
| variety_name | STRING(100) | |
| variety_code | STRING(20) | |
| expected_yield_kg_per_hectare | DECIMAL(10,2) | nullable |
| duration_days_min | INTEGER | nullable |
| duration_days_max | INTEGER | nullable |
| seed_company | STRING(100) | nullable |
| seed_treatment_recommended | BOOLEAN | DEFAULT false |
| is_hybrid | BOOLEAN | DEFAULT false |
| is_active | BOOLEAN | DEFAULT true |

#### `variety_trait_assignments`
variety_id (FK), trait_id (FK), trait_value, trait_rating

#### `variety_soil_compatibilities`
variety_id (FK), soil_type_id (FK), compatibility_level (ENUM: 'ideal', 'suitable', 'marginal', 'unsuitable')

#### `variety_regional_suitabilities`
variety_id (FK), state_id, district_id (nullable), recommended_by_org_id (nullable), suitability_level

#### `input_units`
unit_code (UQ), unit_name, unit_abbreviation

#### `input_categories`
category_code (UQ), category_name (e.g., 'seeds', 'fertilizers', 'pesticides', 'equipment')

#### `input_items`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| item_uuid | STRING(36) | UQ |
| category_id | INTEGER | FK → input_categories |
| item_code | STRING(20) | |
| item_name | STRING(100) | |
| manufacturer | STRING(100) | nullable |
| active_ingredient | STRING(100) | nullable |
| is_organic | BOOLEAN | DEFAULT false |
| is_active | BOOLEAN | DEFAULT true |

#### `input_translations`
input_item_id (FK), language_code, item_name_translated

#### `input_packs`
item_id (FK), pack_uuid (UQ), pack_size_value, pack_size_unit_id (FK), pack_quantity, pack_price_rupees (DECIMAL), is_retail_pack, distributor_name (nullable)

#### `input_pack_prices`
input_pack_id (FK), effective_date, price_rupees, region_id (nullable)

#### `package_of_practices`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| pop_uuid | STRING(36) | UQ |
| pop_code | STRING(20) | |
| pop_name | STRING(100) | |
| crop_id | INTEGER | FK → crop_masters |
| variety_id | INTEGER | FK, nullable |
| soil_type_id | INTEGER | FK, nullable |
| climate_zone_id | INTEGER | FK, nullable |
| state_id | INTEGER | nullable |
| pop_description | TEXT | nullable |
| recommended_by_org_id | INTEGER | FK → organizations, nullable |
| version | INTEGER | DEFAULT 1 |
| is_certified | BOOLEAN | DEFAULT false |
| is_active | BOOLEAN | DEFAULT true |

**Associations:** hasMany PopWorkband, PopCostBenchmark

#### `pop_workbands`
pop_id (FK), workband_order, workband_name, days_from_sowing_start, days_from_sowing_end. **Associations:** hasMany PopTask

#### `pop_tasks`
workband_id (FK), task_order, task_name, task_description, estimated_labor_hours, labor_skill_required, machinery_required, is_optional. **Associations:** hasMany PopTaskInput

#### `pop_task_inputs`
task_id (FK), input_item_id (FK), recommended_quantity, unit_id (FK)

#### `pop_cost_benchmarks`
pop_id (FK), cost_category, estimated_cost_per_hectare (DECIMAL), notes

---

### A.8 ROOTS — FARM EXECUTION (30 tables)

#### `farm_registers`
register_uuid (UQ), farmer_id (FK → users), register_name, total_hectares_owned/cultivable/cultivated (DECIMAL)

#### `fields`
field_uuid (UQ), farm_register_id (FK), field_name, field_code, field_size_hectares (DECIMAL), lgd_village_id, latitude/longitude (DECIMAL). **Associations:** hasMany CultivationCycle, FieldSoilDetail, SoilHealthRecord

#### `field_soil_details`
field_id (FK), soil_type_id, ph_level (DECIMAL), nitrogen_level/phosphorus_level/potassium_level (DECIMAL), organic_carbon (DECIMAL), tested_at, tested_by

#### `field_ownership_statuses`
field_id (FK), ownership_type (ENUM: 'owned', 'leased', 'shared', 'govt_allotted'), ownership_since, document_id (nullable)

#### `field_land_document_associations`
field_id (FK), document_id (FK), document_type, verified

#### `cultivation_cycles`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| cycle_uuid | STRING(36) | UQ |
| field_id | INTEGER | FK → fields |
| crop_id | INTEGER | FK → crop_masters |
| variety_id | INTEGER | FK, nullable |
| pop_id | INTEGER | FK, nullable |
| cycle_season | ENUM | 'kharif', 'rabi', 'summer' |
| cycle_year | INTEGER | |
| cycle_sowing_date | DATEONLY | nullable |
| cycle_expected_harvest_date | DATEONLY | nullable |
| cycle_actual_harvest_date | DATEONLY | nullable |
| cycle_status | ENUM | 'planning', 'preparation', 'sowing', 'growing', 'monitoring', 'harvesting', 'post_harvest', 'closed' |
| linked_loan_id | INTEGER | nullable |
| linked_trust_score | DECIMAL | nullable |
| is_active | BOOLEAN | DEFAULT true |

**Associations:** hasMany WorkbandExecution, HarvestRecord; hasOne CultivationCyclePlanning, CultivationCycleExpenseSummary, CultivationCycleIncomeSummary, CultivationCycleProfitability, CultivationCycleHealthMonitoring, CultivationCycleInsuranceLinkage, CultivationCycleLoanLinkage

#### `cultivation_cycle_loan_linkages`
cycle_id (FK), loan_application_id (FK), linkage_purpose, linked_at

#### `cultivation_cycle_planning`
cycle_id (FK), expected_yield_kg, expected_total_cost (DECIMAL), expected_revenue (DECIMAL), planned_at

#### `workband_executions`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| execution_uuid | STRING(36) | UQ |
| cycle_id | INTEGER | FK → cultivation_cycles |
| pop_workband_id | INTEGER | FK |
| workband_start_date | DATEONLY | nullable |
| workband_end_date | DATEONLY | nullable |
| workband_status | ENUM | 'planned', 'in_progress', 'completed', 'delayed', 'skipped' |
| workband_completion_percentage | INTEGER | DEFAULT 0 |
| workband_notes | TEXT | nullable |
| is_active | BOOLEAN | DEFAULT true |

**Associations:** hasMany TaskExecution

#### `task_executions`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| execution_uuid | STRING(36) | UQ |
| workband_execution_id | INTEGER | FK → workband_executions |
| pop_task_id | INTEGER | FK |
| task_start_date | DATEONLY | nullable |
| task_end_date | DATEONLY | nullable |
| task_status | ENUM | 'planned', 'in_progress', 'completed', 'delayed', 'skipped' |
| task_completion_percentage | INTEGER | DEFAULT 0 |
| task_notes | TEXT | nullable |
| execution_photo_count | INTEGER | DEFAULT 0 |
| is_active | BOOLEAN | DEFAULT true |

**Associations:** hasMany TaskExecutionWeatherNote, TaskExecutionInputLog, TaskExecutionLaborLog, TaskExecutionMachineryLog, TaskExecutionPhoto, TaskExecutionExpense

#### `task_execution_input_logs`
task_execution_id (FK), input_item_id (FK), quantity_used, unit_id (FK), cost_rupees (DECIMAL), source_vendor_id (nullable)

#### `task_execution_labor_logs`
task_execution_id (FK), labor_type (ENUM: 'self', 'family', 'hired'), labor_count, hours_worked, cost_rupees (DECIMAL), skill_category (nullable)

#### `task_execution_machinery_logs`
task_execution_id (FK), machinery_type, hours_used, cost_rupees (DECIMAL), owned_or_rented (ENUM: 'owned', 'rented')

#### `task_execution_photos`
task_execution_id (FK), media_asset_id (FK), photo_type, captured_at, latitude/longitude (nullable)

#### `task_execution_weather_notes`
task_execution_id (FK), weather_condition, temperature_celsius, humidity_percent, rainfall_mm, recorded_at

#### `task_execution_expenses`
task_execution_id (FK), expense_category, expense_description, amount_rupees (DECIMAL), expense_date

#### `harvest_records`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| record_uuid | STRING(36) | UQ |
| cycle_id | INTEGER | FK → cultivation_cycles |
| harvest_start_date | DATEONLY | nullable |
| harvest_end_date | DATEONLY | nullable |
| total_harvest_quantity_kg | DECIMAL(12,2) | |
| harvest_quality_grade | STRING(20) | nullable |
| yield_per_hectare_kg | DECIMAL(10,2) | nullable |
| expected_yield_achieved_percent | DECIMAL(5,2) | nullable |
| loss_due_to_weather | DECIMAL(10,2) | nullable |
| loss_due_to_pest | DECIMAL(10,2) | nullable |
| loss_due_to_disease | DECIMAL(10,2) | nullable |
| post_harvest_loss_percent | DECIMAL(5,2) | nullable |
| harvest_notes | TEXT | nullable |
| is_active | BOOLEAN | DEFAULT true |

#### `harvest_sale_records`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| record_uuid | STRING(36) | UQ |
| harvest_record_id | INTEGER | FK → harvest_records |
| sale_date | DATEONLY | |
| quantity_sold_kg | DECIMAL(12,2) | |
| price_per_kg | DECIMAL(10,2) | |
| gross_sale_value | DECIMAL(15,2) | |
| transportation_cost | DECIMAL(10,2) | nullable |
| market_fees_cost | DECIMAL(10,2) | nullable |
| net_sale_value | DECIMAL(15,2) | |
| buyer_name | STRING(100) | nullable |
| buyer_type | ENUM | 'local_trader', 'mandi', 'fpo', 'company', 'broker' |
| sale_type | ENUM | 'mandi', 'msp_procurement', 'fpo_pooling', 'contract_buyback', 'direct_retail', 'export' |
| sale_contract_linked | BOOLEAN | DEFAULT false |
| transport_mode | STRING(30) | nullable |
| distance_to_market_km | DECIMAL(6,1) | nullable |
| is_active | BOOLEAN | DEFAULT true |

#### `cultivation_cycle_expense_summaries`
cycle_id (FK), total_input_cost, total_labor_cost, total_machinery_cost, total_other_cost, grand_total_cost (all DECIMAL), last_updated

#### `cultivation_cycle_income_summaries`
cycle_id (FK), total_sale_income, total_subsidy_income, total_insurance_payout, grand_total_income (all DECIMAL), last_updated

#### `cultivation_cycle_profitabilities`
cycle_id (FK), total_cost, total_income, net_profit (all DECIMAL), roi_percentage (DECIMAL), cost_per_kg, income_per_hectare, last_updated

#### `cultivation_cycle_health_monitoring`
cycle_id (FK), health_score, crop_condition, pest_risk_level, disease_risk_level, last_inspected_at, inspected_by

#### `cultivation_cycle_insurance_linkages`
cycle_id (FK), insurance_product_id, policy_number, premium_paid, coverage_amount, status

#### `soil_health_records`
field_id (FK), sample_date, ph_level, nitrogen/phosphorus/potassium/organic_carbon (DECIMAL), recommendations (TEXT), lab_name

#### `water_management_records`
field_id (FK), irrigation_date, water_source, water_quantity_liters, irrigation_method, duration_hours

#### `intercrop_records`
cycle_id (FK), intercrop_name, intercrop_variety, area_hectares, expected_yield, actual_yield

#### `livestock_integration_records`
cycle_id (FK), livestock_type, count, integration_purpose, manure_applied, value_added

#### `farmer_intervention_logs`
cycle_id (FK), farmer_id, agent_id, intervention_type, description (TEXT), intervention_date

#### `cultivation_cycle_benchmarking`
cycle_id (FK), benchmark_type, benchmark_value, actual_value, variance_pct, benchmark_source

---

### A.9 ROOTS — DAIRY (13 tables)

#### `dairy_herd_registers`
register_uuid (UQ), farmer_id (FK), register_name

#### `dairy_animals`
animal_id (UQ), herd_register_id (FK), animal_name, breed, age. **Associations:** hasMany DairyMilkProductionLog, DairyBreedingRecord, DairyHealthRecord

#### `dairy_milk_production_logs`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| animal_id | INTEGER | FK → dairy_animals |
| production_date | DATEONLY | |
| morning_milk_liters | DECIMAL(6,2) | |
| evening_milk_liters | DECIMAL(6,2) | |
| total_daily_milk | DECIMAL(6,2) | computed |
| milk_sold_liters | DECIMAL(6,2) | |
| milk_price_per_liter | DECIMAL(6,2) | |
| daily_income | DECIMAL(10,2) | |
| buyer_name | STRING(100) | nullable |
| cooperative_id | INTEGER | nullable |
| deduction_feed_advance | DECIMAL(10,2) | DEFAULT 0 |
| deduction_insurance | DECIMAL(10,2) | DEFAULT 0 |
| deduction_loan_recovery | DECIMAL(10,2) | DEFAULT 0 |
| gross_payout | DECIMAL(10,2) | |
| net_payout | DECIMAL(10,2) | |
| is_active | BOOLEAN | DEFAULT true |

#### `dairy_breeding_records`
animal_id (FK), breeding_date, breeding_method, bull_breed, expected_calving_date, actual_calving_date, calf_gender, pregnancy_status

#### `dairy_health_records`
animal_id (FK), observation_date, symptoms (TEXT), diagnosis, treatment, veterinarian_name, treatment_cost

#### `dairy_feed_usage_logs`
herd_register_id (FK), feed_date, feed_type, quantity_kg, cost_rupees

#### `dairy_expense_summaries`
herd_register_id (FK), period_start/end, total_feed_cost, total_veterinary_cost, total_labor_cost, total_other_cost, grand_total

#### `dairy_income_summaries`
herd_register_id (FK), period_start/end, total_milk_income, total_calf_sale_income, total_manure_income, grand_total

#### `dairy_profitability_summaries`
herd_register_id (FK), period, total_cost, total_income, net_profit, roi_percentage

#### `dairy_quality_metrics`
herd_register_id (FK), test_date, fat_percentage, snf_percentage, adulteration_detected, grade

#### `dairy_market_linkages`
herd_register_id (FK), market_type, market_name, contract_details (TEXT), price_per_liter, status

#### `dairy_insurance_linkages`
herd_register_id (FK), policy_number, insured_animals_count, premium_amount, coverage_amount, claim_status

#### `dairy_linked_loan_utilizations`
herd_register_id (FK), loan_application_id (FK), utilization_amount, utilization_purpose, utilized_at

---

### A.10 ROOTS — FISHERY (10 tables)

#### `fishery_pond_registers`
register_uuid (UQ), farmer_id (FK), register_name

#### `fishery_ponds`
pond_uuid (UQ), register_id (FK), pond_name, area_hectares, depth_meters, water_source, pond_type

#### `fishery_species_stocked`
pond_id (FK), species_name, stocking_date, quantity, average_weight_grams

#### `fishery_feeding_logs`
pond_id (FK), feed_date, feed_type, quantity_kg, cost_rupees

#### `fishery_water_quality_logs`
pond_id (FK), test_date, ph_level, dissolved_oxygen, temperature_celsius, turbidity, ammonia_level

#### `fishery_health_monitoring`
pond_id (FK), observation_date, disease_detected, affected_percentage, treatment_applied, mortality_count

#### `fishery_harvest_records`
pond_id (FK), harvest_date, species, quantity_kg, average_weight_grams, mortality_during_harvest

#### `fishery_sale_records`
harvest_record_id (FK), sale_date, quantity_sold_kg, price_per_kg, gross_value, buyer_name, buyer_type, transportation_cost, net_value

#### `fishery_expense_summaries`
register_id (FK), period_start/end, total_feed_cost, total_seed_cost, total_medicine_cost, total_labor_cost, grand_total

#### `fishery_income_summaries`
register_id (FK), period_start/end, total_sale_income, total_subsidy, grand_total

---

### A.11 VYAPAR — VENDOR COMMERCE (23 tables)

#### `vendor_profiles`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| vendor_user_id | INTEGER | FK → users, UQ |
| vendor_uuid | STRING(36) | UQ |
| vendor_name | STRING(120) | |
| vendor_code | STRING(20) | UQ |
| vendor_type | ENUM | 'seeds_distributor', 'fertilizer_supplier', 'pesticide_dealer', 'equipment_supplier', 'multipurpose_dealer', 'aggregator' |
| business_registration_number | STRING(50) | nullable |
| business_pan | STRING(10) | nullable |
| shop_name | STRING(100) | nullable |
| shop_latitude | DECIMAL(10,8) | nullable |
| shop_longitude | DECIMAL(11,8) | nullable |
| is_active | BOOLEAN | DEFAULT true |

**Associations:** hasMany VendorShop, VendorServiceArea, VendorProductCatalog, VendorTransaction, VendorLoanMapping, VendorCreditLedger, VendorInventory, VendorFarmerLink, VendorPerformance, VendorRating; hasOne VendorKyc, VendorCreditSummary, VendorPurchaseBehaviorScore

#### `vendor_shops`
vendor_id (FK), shop_name, address (TEXT), lgd_village_id, latitude/longitude, operating_since, gst_number

#### `vendor_kyc`
vendor_id (FK), kyc_status (ENUM: 'pending', 'verified', 'rejected', 'expired'), kyc_verified_at, kyc_verified_by, shop_visited_by_agent, shop_visit_date, gst_certificate_verified, bank_account_verified

#### `vendor_service_areas`
vendor_id (FK), lgd_state_id, lgd_district_id, lgd_block_id, radius_km

#### `vendor_product_catalogs`
vendor_id (FK), input_item_id (FK nullable), product_name, category, price_rupees, stock_quantity, in_stock

#### `vendor_inventory`
vendor_id (FK), product_catalog_id (FK), stock_quantity, last_restocked_at, reorder_level

#### `vendor_transactions`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| transaction_uuid | STRING(36) | UQ |
| vendor_id | INTEGER | FK → vendor_profiles |
| farmer_id | INTEGER | FK → users |
| transaction_type | ENUM | 'cash_sale', 'credit_sale', 'return', 'exchange' |
| transaction_date | DATEONLY | |
| transaction_amount | DECIMAL(15,2) | |
| transaction_status | ENUM | 'completed', 'pending', 'cancelled' |
| payment_status | ENUM | 'paid', 'partial_paid', 'credit_given', 'pending' |
| agent_facilitated | BOOLEAN | DEFAULT false |
| agent_id | INTEGER | nullable |
| loan_application_id | INTEGER | nullable |
| is_insurance_proof | BOOLEAN | DEFAULT false |
| season | ENUM | 'kharif', 'rabi', 'zaid', 'year_round' |
| fpo_id | INTEGER | nullable |
| is_active | BOOLEAN | DEFAULT true |

**Associations:** hasMany VendorTransactionItem, VendorTransactionEvidence

#### `vendor_transaction_items`
transaction_id (FK), product_catalog_id (FK nullable), item_name, quantity, unit, price_per_unit (DECIMAL), total_price (DECIMAL)

#### `vendor_transaction_evidence`
transaction_id (FK), evidence_type, media_asset_id (FK), uploaded_at

#### `vendor_credit_ledger`
vendor_id (FK), farmer_id (FK), credit_extended (DECIMAL), credit_repaid (DECIMAL), outstanding_balance (DECIMAL), due_date, status (ENUM: 'current', 'overdue', 'settled')

#### `vendor_credit_summary`
vendor_id (FK), total_credit_extended, total_credit_recovered, total_outstanding, default_rate_pct, last_updated

#### `vendor_loan_mappings`
vendor_id (FK), loan_application_id (FK), mapped_amount, utilization_percentage, verified

#### `vendor_loan_utilizations`
loan_mapping_id (FK), utilization_amount, utilization_date, receipt_id (nullable)

#### `vendor_farmer_links`
vendor_id (FK), farmer_id (FK), relationship_type, first_transaction_date, transaction_count, last_transaction_date

#### `vendor_performance`
vendor_id (FK), period, total_transactions, total_revenue, avg_transaction_value, farmer_coverage, satisfaction_score

#### `vendor_ratings`
vendor_id (FK), farmer_id (FK), rating (1-5), review_text (TEXT), rated_at

#### `vendor_purchase_behavior_scores`
vendor_id (FK), score, scoring_factors (JSON), calculated_at

#### `vendor_commissions`
vendor_id (FK), transaction_id (FK), commission_amount, commission_type, paid_at

#### `vendor_crp_mappings`
vendor_id (FK), crp_agent_id (FK), mapped_at, is_active

#### `vendor_offline_queue`
vendor_id (FK), operation_type, payload (JSON), queued_at, synced_at, sync_status

#### `vendor_sentinel_feed`
vendor_id (FK), alert_type, alert_message, severity, created_at

#### `vendor_trust_feed`
vendor_id (FK), farmer_id (FK), trust_score_delta, reason, created_at

---

### A.12 SATHI — FIELD AGENTS (16 tables)

#### `sathi_tasks`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| task_uuid | STRING(36) | UQ |
| assigned_to_agent_id | INTEGER | FK → users |
| assigned_by_admin_id | INTEGER | FK → users |
| task_type | ENUM | 'farmer_kyc_verification', 'field_visit', 'loan_application_verification', 'transaction_verification', 'document_collection', 'farmer_feedback', 'soil_sample_collection' |
| task_entity_type | STRING(50) | nullable |
| task_entity_id | INTEGER | nullable |
| task_title | STRING(200) | |
| task_description | TEXT | nullable |
| task_priority | ENUM | 'low', 'medium', 'high', 'urgent' |
| task_status | ENUM | 'assigned', 'in_progress', 'completed', 'rejected', 'on_hold' |
| assigned_at | DATE | |
| due_date | DATEONLY | nullable |
| completed_at | DATE | nullable |
| is_active | BOOLEAN | DEFAULT true |

#### `sathi_task_executions`
task_id (FK), execution_uuid (UQ), execution_notes (TEXT), started_at, completed_at, outcome_status, gps_latitude/longitude

#### `sathi_field_verifications`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| verification_uuid | STRING(36) | UQ |
| farmer_id | INTEGER | FK → users |
| agent_id | INTEGER | FK → users |
| verification_type | ENUM | 'address', 'farm_boundary', 'field_size', 'crop_variety', 'ownership_status' |
| verification_date | DATEONLY | |
| verified_latitude | DECIMAL(10,8) | nullable |
| verified_longitude | DECIMAL(11,8) | nullable |
| verification_status | ENUM | 'verified', 'needs_clarification', 'rejected' |
| verification_comment | TEXT | nullable |
| photo_count | INTEGER | DEFAULT 0 |
| verification_confidence_pct | DECIMAL(5,2) | nullable |
| contradiction_detected | BOOLEAN | DEFAULT false |
| contradiction_notes | TEXT | nullable |
| is_active | BOOLEAN | DEFAULT true |

#### `sathi_field_visit_checklists`
verification_id (FK), checklist_item, is_checked, notes

#### `sathi_structured_visit_report`
verification_id (FK), report_json (JSON), summary (TEXT), recommendations (TEXT)

#### `sathi_evidence_bundles`
bundle_uuid (UQ), entity_type, entity_id, agent_id (FK), created_at

#### `sathi_evidence_items`
bundle_id (FK), evidence_type, media_asset_id (FK), description, captured_at, latitude/longitude

#### `sathi_farmer_consent`
farmer_id (FK), consent_type, consented_at, consent_reference, agent_id, consent_document_id (nullable)

#### `sathi_audit_logs`
agent_id (FK), action, entity_type, entity_id, details (JSON), ip_address, performed_at

#### `sathi_sync_queue`
agent_id (FK), operation_type, payload (JSON), queued_at, synced_at, sync_status (ENUM: 'pending', 'synced', 'failed', 'conflict')

#### `sathi_sync_conflicts`
sync_queue_id (FK), conflict_type, local_data (JSON), server_data (JSON), resolved, resolved_at

#### `choice_intermediaries`
intermediary_uuid (UQ), user_id (FK), intermediary_type (ENUM: 'sathi', 'vendor_agent', 'fpo_rep'), lgd_block_id, mobile, is_active

#### `choice_assignments`
intermediary_id (FK), farmer_id (FK), assigned_at, assignment_type

#### `choice_interaction_logs`
intermediary_id (FK), farmer_id (FK), interaction_type, interaction_date, notes (TEXT), outcome

#### `choice_ratings`
intermediary_id (FK), farmer_id (FK), rating (1-5), feedback (TEXT), rated_at

#### `choice_badges`
intermediary_id (FK), badge_type, badge_name, earned_at, criteria_met (JSON)

#### `choice_performance_kpis`
intermediary_id (FK), period, farmers_active, tasks_completed, avg_rating, commission_earned

---

### A.13 SENTINEL — RISK MONITORING (24 tables)

#### `loan_health_snapshots`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| snapshot_uuid | STRING(36) | UQ |
| application_id | INTEGER | FK → loan_applications |
| snapshot_date | DATEONLY | |
| days_overdue | INTEGER | DEFAULT 0 |
| principal_outstanding | DECIMAL(15,2) | |
| interest_outstanding | DECIMAL(15,2) | |
| total_outstanding | DECIMAL(15,2) | |
| next_emi_due_date | DATEONLY | nullable |
| next_emi_amount | DECIMAL(15,2) | nullable |
| health_status | ENUM | 'good', 'watch', 'stressed', 'npa' |
| health_score | DECIMAL(5,2) | nullable |
| is_active | BOOLEAN | DEFAULT true |

#### `sma_classification_logs`
application_id (FK), classification_date, sma_classification (ENUM: 'standard', 'sma_0_30', 'sma_30_60', 'sma_60_90', 'sma_90_plus'), days_past_due, previous_classification, reclassification_reason

#### `bullet_maturity_trackers`
application_id (FK), maturity_date, days_to_maturity, principal_outstanding, interest_outstanding, total_due, customer_notified, notification_date, renewal_requested

#### `repayment_behavior_indexes`
application_id (FK), index_date, rbi_score (DECIMAL), on_time_payments, late_payments, missed_payments, avg_days_late, trend (ENUM: 'improving', 'stable', 'declining')

#### `vendor_registries` (Sentinel version)
vendor_id, vendor_name, vendor_type, verification_status, risk_rating, last_verified_at

#### `expense_classifications`
application_id (FK), transaction_id, expense_category (ENUM: 'agri_input', 'labor', 'machinery', 'transport', 'personal', 'medical', 'education', 'unclassified'), amount, confidence_score, classified_at

#### `end_use_score_logs`
application_id (FK), score_date, agri_spend_pct, non_agri_spend_pct, unclassified_pct, end_use_score (0-100), compliance_status (ENUM: 'compliant', 'warning', 'non_compliant')

#### `diversion_risk_assessments`
application_id (FK), assessment_date, risk_level (ENUM: 'low', 'medium', 'high', 'critical'), risk_factors (JSON), recommended_action, assessed_by

#### `red_flag_events`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| event_uuid | STRING(36) | UQ |
| application_id | INTEGER | FK → loan_applications |
| red_flag_type | ENUM | 'unusual_withdrawal', 'vendor_default', 'missed_payment', 'location_change', 'contact_lost', 'legal_notice', 'insurance_claim' |
| severity | ENUM | 'low', 'medium', 'high', 'critical' |
| description | TEXT | |
| detected_at | DATE | |
| resolved | BOOLEAN | DEFAULT false |
| resolved_at | DATE | nullable |
| resolution_notes | TEXT | nullable |
| is_active | BOOLEAN | DEFAULT true |

#### `farmer_income_streams`
farmer_id (FK), source_type (ENUM: 'crop', 'dairy', 'fishery', 'labor', 'govt_transfer', 'other'), estimated_annual (DECIMAL), verified, last_updated

#### `cash_flow_projections`
farmer_id (FK), projection_date, month, expected_inflow, expected_outflow, projected_surplus, confidence_level

#### `rss_score_histories`
application_id (FK), score_date, rss_score (DECIMAL), score_components (JSON)

#### `ews_signals`
application_id (FK), signal_uuid (UQ), signal_type, signal_source, signal_value, severity, detected_at, acknowledged, acknowledged_by

#### `ews_alerts`
application_id (FK), alert_uuid (UQ), alert_type, alert_message (TEXT), severity, triggered_at, acknowledged, action_taken (TEXT)

#### `branch_action_queues`
application_id (FK), action_type, priority, assigned_to, due_date, status, notes (TEXT)

#### `action_suggestions`
application_id (FK), suggestion_type, suggestion_text (TEXT), confidence, suggested_at, accepted, accepted_by

#### `portfolio_snapshots`
snapshot_date, total_loans, total_outstanding (DECIMAL), total_npa (DECIMAL), npa_percentage, avg_health_score, risk_distribution (JSON)

#### `recovery_cases`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| case_uuid | STRING(36) | UQ |
| application_id | INTEGER | FK → loan_applications |
| recovery_case_stage | ENUM | 'early_recovery', 'intensive_recovery', 'legal_recovery', 'writeoff' |
| recovery_case_opened_date | DATEONLY | |
| recovery_case_opened_by | INTEGER | |
| last_recovery_attempt_date | DATE | nullable |
| total_recovery_amount | DECIMAL(15,2) | |
| remaining_recovery_amount | DECIMAL(15,2) | |
| recovery_probability_percent | DECIMAL(5,2) | nullable |
| is_active | BOOLEAN | DEFAULT true |

**Associations:** hasMany RecoveryActionLog

#### `recovery_action_logs`
case_id (FK), action_type, action_description (TEXT), action_date, action_by, outcome, next_action_date

#### `aa_bank_statement_summaries`
farmer_id (FK), account_id, period_start/end, avg_balance, total_credits, total_debits, salary_detected, loan_emi_detected

#### `aa_consents`
farmer_id (FK), consent_id (UQ), consent_status, consented_at, expires_at, fi_types (JSON)

#### `credit_bureau_reports`
farmer_id (FK), bureau_name, report_date, credit_score, active_loans_count, total_outstanding, report_data (JSON)

#### `income_adequacy_assessments`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| application_id | INTEGER | FK → loan_applications |
| crop_income | DECIMAL(15,2) | DEFAULT 0 |
| dairy_income | DECIMAL(15,2) | DEFAULT 0 |
| allied_income | DECIMAL(15,2) | DEFAULT 0 |
| non_farm_income | DECIMAL(15,2) | DEFAULT 0 |
| govt_transfer_income | DECIMAL(15,2) | DEFAULT 0 |
| loan_to_income_ratio | DECIMAL(5,2) | |
| emi_to_income_ratio | DECIMAL(5,2) | |
| income_adequacy_status | ENUM | 'strong', 'adequate', 'marginal', 'inadequate', 'failed' |
| shortfall_amount | DECIMAL(15,2) | nullable |
| income_verified_by_sathi | BOOLEAN | DEFAULT false |
| income_verified_by_vyapar | BOOLEAN | DEFAULT false |
| is_active | BOOLEAN | DEFAULT true |

---

### A.14 SAGE — ADVISORY (7 tables)

#### `sage_advisory_types`
type_code (UQ), type_name, description

#### `sage_advisories`
advisory_uuid (UQ), advisory_type_id (FK), title, content (TEXT), target_crop_id (nullable), target_region_id (nullable), severity, published_at, expires_at

#### `sage_weather_events`
event_uuid (UQ), event_type, location_id, temperature_celsius, humidity_percent, rainfall_mm, wind_speed_kmph, alert_level (ENUM: 'info', 'watch', 'warning', 'severe'), recorded_at

#### `sage_crop_health_observations`
observation_uuid (UQ), farmer_id (FK), cycle_id (FK nullable), observation_type, severity, description (TEXT), photo_id (nullable), observed_at, recommendations (TEXT)

#### `sage_farmer_interactions`
farmer_id (FK), interaction_type, advisory_id (FK nullable), query_text (TEXT), response_text (TEXT), channel, interaction_at

#### `sage_feedback`
advisory_id (FK), farmer_id (FK), rating (1-5), feedback_text (TEXT), submitted_at

#### `sage_alerts`
alert_uuid (UQ), alert_type, target_audience (JSON), message (TEXT), severity, broadcast_at, expires_at

---

### A.15 PULSE — MARKET INTELLIGENCE (9 tables)

#### `pulse_mandis`
mandi_uuid (UQ), mandi_name, lgd_state_id, lgd_district_id, mandi_code, latitude/longitude, is_regulated, market_type

#### `pulse_commodities`
commodity_uuid (UQ), commodity_code (UQ), commodity_name, crop_id (FK nullable), commodity_group, default_unit

**Associations:** hasMany PulseCommodityTranslation

#### `pulse_commodity_translations`
commodity_id (FK), language_code, commodity_name_translated. **Index:** UNIQUE(commodity_id, language_code)

#### `pulse_price_records`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| record_uuid | STRING(36) | UQ |
| mandi_id | INTEGER | FK → pulse_mandis |
| commodity_id | INTEGER | FK → pulse_commodities |
| record_date | DATEONLY | |
| opening_price | DECIMAL(10,2) | |
| closing_price | DECIMAL(10,2) | |
| highest_price | DECIMAL(10,2) | |
| lowest_price | DECIMAL(10,2) | |
| quantity_traded_quintals | DECIMAL(12,2) | nullable |
| price_trend | ENUM | 'rising', 'stable', 'falling' |
| is_active | BOOLEAN | DEFAULT true |

#### `pulse_price_forecasts`
commodity_id (FK), mandi_id (FK nullable), forecast_date, predicted_price (DECIMAL), confidence_level, model_version, forecast_horizon_days

#### `pulse_msps` (Minimum Support Price)
commodity_id (FK), season, year, msp_price_per_quintal (DECIMAL), announced_date, effective_from

#### `pulse_market_alerts`
alert_uuid (UQ), commodity_id (FK), mandi_id (FK nullable), alert_type, message (TEXT), severity, triggered_at

#### `pulse_farmer_price_alerts`
farmer_id (FK), commodity_id (FK), mandi_id (FK nullable), target_price (DECIMAL), alert_direction (ENUM: 'above', 'below'), is_triggered, triggered_at

#### `pulse_sell_recommendations`
farmer_id (FK), commodity_id (FK), cycle_id (FK nullable), recommended_action (ENUM: 'sell_now', 'hold', 'sell_partial'), recommended_price, recommendation_reason (TEXT), confidence, recommended_at

---

### A.16 BANK INTEGRATION (5 tables)

#### `bank_portfolio_imports`
import_uuid (UQ), imported_by (FK), import_type (ENUM: 'csv', 'xlsx', 'finacle_api'), file_name, records_total, records_imported, records_failed, import_status, imported_at

#### `bank_loan_accounts`
account_uuid (UQ), import_id (FK nullable), finacle_account_number, finacle_cif_id, farmer_id (FK nullable), account_holder_name, product_type, sanctioned_amount, outstanding_balance, interest_rate, disbursement_date, maturity_date, account_status, linked_to_farmer, linked_at

#### `finacle_integration_events`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| direction | ENUM | 'inbound', 'outbound' |
| event_type | ENUM | 16 types including 'disbursement', 'repayment', 'status_change', 'loan_origination', 'insurance_si', 'end_use_verification', 'psl_classification', 'pre_delinquency_alert', 'gold_return_reminder', etc. |
| finacle_account_number | STRING(20) | nullable |
| finacle_cif_id | STRING(20) | nullable |
| finacle_menu_code | STRING(50) | nullable |
| bank_loan_account_id | INTEGER | FK, nullable |
| request_payload | JSON | nullable |
| response_payload | JSON | nullable |
| idempotency_key | STRING(100) | UQ |
| processing_status | ENUM | 'received', 'processing', 'processed', 'failed', 'ignored' |
| failure_reason | TEXT | nullable |
| retry_count | INTEGER | DEFAULT 0 |
| processed_at | DATE | nullable |
| hmac_signature | STRING(255) | nullable |
| hmac_verified | BOOLEAN | DEFAULT false |
| source_ip | STRING(45) | nullable |
| is_active | BOOLEAN | DEFAULT true |

#### `finacle_field_mappings`
bank_code, finacle_entity, finacle_field_name, farmerpay_table, farmerpay_column, transformation_rule, is_required

#### `insurance_enrollments`
enrollment_uuid (UQ), farmer_id (FK), loan_application_id (FK nullable), product_type, provider, policy_number, premium_amount, sum_insured, enrolled_at, policy_start/end_date, claim_status

---

### A.17 GOLD LOAN — SPECIAL TABLES (3 tables)

#### `gold_loan_collaterals`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| application_id | INTEGER | FK → loan_applications |
| ornament_description | TEXT | |
| gross_weight_grams | DECIMAL(8,3) | |
| net_weight_grams | DECIMAL(8,3) | |
| purity_carat | DECIMAL(4,1) | |
| stone_deduction_grams | DECIMAL(6,3) | DEFAULT 0 |
| ibja_price_per_gram | DECIMAL(10,2) | |
| valuation_price_used | DECIMAL(10,2) | |
| total_gold_value | DECIMAL(15,2) | |
| valuation_date | DATEONLY | |
| appraiser_name | STRING(100) | |
| borrower_present_at_valuation | BOOLEAN | DEFAULT true |
| ownership_proof_type | ENUM | 'purchase_receipt', 'family_declaration', 'affidavit', 'inheritance_doc', 'other' |
| ltv_at_sanction_pct | DECIMAL(5,2) | |
| ltv_compliant | BOOLEAN | |
| vault_location | STRING(100) | nullable |
| vault_packet_id | STRING(50) | nullable |
| gold_returned_date | DATEONLY | nullable |
| gold_return_within_7days | BOOLEAN | nullable |
| is_active | BOOLEAN | DEFAULT true |

#### `gold_loan_ltv_monitors`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| application_id | INTEGER | FK → loan_applications |
| monitor_date | DATEONLY | |
| loan_amount_slab | ENUM | 'upto_2_5_lakh', '2_5_to_5_lakh', 'above_5_lakh' |
| sanctioned_amount | DECIMAL(15,2) | |
| principal_outstanding | DECIMAL(15,2) | |
| accrued_interest | DECIMAL(15,2) | |
| total_exposure | DECIMAL(15,2) | |
| current_gold_value | DECIMAL(15,2) | |
| current_ltv_pct | DECIMAL(5,2) | |
| maturity_adjusted_ltv_pct | DECIMAL(5,2) | nullable |
| is_bullet_loan | BOOLEAN | DEFAULT false |
| ltv_breach | BOOLEAN | DEFAULT false |
| ltv_breach_amount | DECIMAL(15,2) | nullable |
| margin_call_triggered | BOOLEAN | DEFAULT false |
| is_active | BOOLEAN | DEFAULT true |

#### `psl_compliance_trackers`
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AutoIncrement |
| application_id | INTEGER | FK → loan_applications |
| psl_eligible | BOOLEAN | |
| psl_category | ENUM | 'agriculture', 'small_marginal_farmer', 'allied_activities', 'non_agriculture', 'consumption' |
| original_classification | STRING(50) | |
| current_classification | STRING(50) | |
| reclassified | BOOLEAN | DEFAULT false |
| reclassification_date | DATEONLY | nullable |
| reclassification_reason | TEXT | nullable |
| end_use_verified | BOOLEAN | DEFAULT false |
| end_use_score | DECIMAL(5,2) | nullable |
| agri_spend_percentage | DECIMAL(5,2) | nullable |
| diversion_risk_level | ENUM | 'low', 'medium', 'high', 'critical' |
| documentation_complete | BOOLEAN | DEFAULT false |
| last_audit_date | DATEONLY | nullable |
| audit_finding | TEXT | nullable |
| is_active | BOOLEAN | DEFAULT true |

---

### A.18 DATA MODEL STATISTICS

| Category | Table Count |
|----------|------------|
| Auth & Users | 9 |
| Farmer Profile | 16 |
| Location (LGD) | 8 |
| Documents, Media, Audit, Notifications | 19 |
| Trust Scoring | 13 |
| DICE Loans | 20 |
| Roots — Crop Knowledge | 24 |
| Roots — Farm Execution | 30 |
| Roots — Dairy | 13 |
| Roots — Fishery | 10 |
| Vyapar Vendor Commerce | 23 |
| Sathi Field Agents | 16 |
| Sentinel Risk Monitoring | 24 |
| Sage Advisory | 7 |
| Pulse Market Intelligence | 9 |
| Bank Integration | 5 |
| Gold Loan Special | 3 |
| **Total** | **~249 tables** |

### A.19 KEY ENUM REFERENCE

| Domain | ENUM | Values |
|--------|------|--------|
| **Loan Status** | application_status | draft, submitted, under_review, forwarded_to_bank, bank_review, approved, rejected, disbursed, active, closed, defaulted |
| **Cultivation** | cycle_status | planning, preparation, sowing, growing, monitoring, harvesting, post_harvest, closed |
| **Season** | cycle_season | kharif, rabi, summer |
| **Crop Season** | ideal_season | kharif, rabi, summer, year_round, multiple |
| **Trust Band** | score_band | poor, fair, good, excellent |
| **Loan Health** | health_status | good, watch, stressed, npa |
| **SMA** | sma_classification | standard, sma_0_30, sma_30_60, sma_60_90, sma_90_plus |
| **Red Flag** | red_flag_type | unusual_withdrawal, vendor_default, missed_payment, location_change, contact_lost, legal_notice, insurance_claim |
| **Repayment** | repayment_frequency | weekly, monthly, quarterly, seasonal, custom |
| **Repayment Type** | repayment_type | emi, bullet, interest_only, flexible |
| **Collateral** | collateral_type | none, gold, land, crop_hypothecation, equipment, other |
| **PSL** | psl_category | agriculture, small_marginal_farmer, allied_activities, msme, other |
| **Vendor Type** | vendor_type | seeds_distributor, fertilizer_supplier, pesticide_dealer, equipment_supplier, multipurpose_dealer, aggregator |
| **Task Type** | task_type | farmer_kyc_verification, field_visit, loan_application_verification, transaction_verification, document_collection, farmer_feedback, soil_sample_collection |
| **Diversion Risk** | diversion_risk_level | low, medium, high, critical |
| **Income Adequacy** | income_adequacy_status | strong, adequate, marginal, inadequate, failed |
| **Payment Method** | payment_method | bank_transfer, cash, check, digital_wallet |
| **Disbursement** | disbursement_mode | bank_transfer, upi, cheque, cash, demand_draft |
| **Education** | education_level | illiterate, primary, secondary, higher_secondary, graduate, post_graduate |
| **Gender** | gender | male, female, other |
| **Buyer Type** | buyer_type | local_trader, mandi, fpo, company, broker |
| **Sale Type** | sale_type | mandi, msp_procurement, fpo_pooling, contract_buyback, direct_retail, export |
| **Sensitivity** | sensitivity_level | 1_public, 2_pii, 3_financial, 4_identity |

### A.20 CROSS-MODULE RELATIONSHIPS

```
User (users)
 ├── FarmerProfile ──── FarmerAddress, FarmerBankAccount, FarmerProfileDetail
 │    ├── FarmRegister ── Field ── CultivationCycle
 │    │                              ├── WorkbandExecution ── TaskExecution
 │    │                              │                         ├── InputLog, LaborLog, MachineryLog, Photos
 │    │                              ├── HarvestRecord ── HarvestSaleRecord
 │    │                              ├── Profitability, Expenses, Income summaries
 │    │                              └── InsuranceLinkage, LoanLinkage
 │    ├── DairyHerdRegister ── DairyAnimal ── MilkLog, BreedingRecord, HealthRecord
 │    ├── FisheryPondRegister ── FisheryPond ── SpeciesStocked, FeedingLog, HarvestRecord
 │    └── TrustResponse ── TrustScoreHistory
 │
 ├── LoanApplication (DICE)
 │    ├── LoanProduct ── LoanProvider ── LoanProviderType
 │    ├── LoanApplicationStatus, StatusHistory, Documents, BankNotes
 │    ├── LoanDisbursement
 │    ├── LoanRepaymentSchedule ── LoanRepayment
 │    ├── LoanInsuranceBundled
 │    ├── GoldLoanCollateral, GoldLoanLtvMonitor (if gold loan)
 │    ├── PslComplianceTracker
 │    └── SENTINEL: LoanHealthSnapshot, SmaClassification, EwsSignal, RedFlagEvent
 │                  RecoveryCase ── RecoveryActionLog
 │
 ├── VendorProfile (VYAPAR)
 │    ├── VendorShop, VendorKyc, VendorServiceArea
 │    ├── VendorTransaction ── VendorTransactionItem, VendorTransactionEvidence
 │    ├── VendorCreditLedger, VendorCreditSummary
 │    └── VendorLoanMapping ── VendorLoanUtilization
 │
 ├── FieldAgentProfile (SATHI)
 │    ├── FieldAgentFarmerAssignment
 │    ├── SathiTask ── SathiTaskExecution
 │    └── SathiFieldVerification ── SathiEvidenceBundle ── SathiEvidenceItem
 │
 └── ChoiceIntermediary ── ChoiceAssignment, ChoiceInteractionLog, ChoiceRating
```

**Key Cross-Module Links:**
- `loan_applications.farmer_id` → `users.id` (farmer who applied)
- `cultivation_cycles.linked_loan_id` → `loan_applications.id` (loan funding the crop)
- `vendor_transactions.loan_application_id` → `loan_applications.id` (loan-funded purchase)
- `vendor_transactions.farmer_id` → `users.id` (farmer buying from vendor)
- `loan_health_snapshots.application_id` → `loan_applications.id` (SENTINEL monitoring)
- `recovery_cases.application_id` → `loan_applications.id` (recovery tracking)
- `trust_score_history.farmer_id` → `users.id` (creditworthiness)
- `pulse_sell_recommendations.farmer_id` → `users.id` + `cycle_id` → `cultivation_cycles.id`
- `sathi_tasks.assigned_to_agent_id` → `users.id` (agent performing task)
- `finacle_integration_events.bank_loan_account_id` → `bank_loan_accounts.id` (bank sync)
