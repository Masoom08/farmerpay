# FarmerPay Platform
# Information Security & Compliance Documentation
# For Bank Onboarding and Vendor Due Diligence

**Document Reference:** FP-SEC-2026-001
**Version:** 1.0
**Date:** April 5, 2026
**Classification:** Confidential — Restricted Distribution
**Prepared For:** Partner Bank IT Security, Risk Management, and Compliance Teams
**Prepared By:** FarmerPay Information Security Office

---

## Document Control

| Item | Detail |
|------|--------|
| Document Owner | Chief Information Security Officer, FarmerPay |
| Review Cycle | Quarterly |
| Next Review | July 2026 |
| Distribution | Bank CISO Office, IT Audit, Risk Management |
| Confidentiality | Not to be shared beyond intended recipients without written consent |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Data Flow and Data Classification](#3-data-flow-and-data-classification)
4. [Information Security Governance](#4-information-security-governance)
5. [Application Security Controls](#5-application-security-controls)
6. [Infrastructure Security](#6-infrastructure-security)
7. [Data Security and Privacy](#7-data-security-and-privacy)
8. [Secrets and Key Management](#8-secrets-and-key-management)
9. [Access Control and Identity Management](#9-access-control-and-identity-management)
10. [API Security Framework](#10-api-security-framework)
11. [Logging, Monitoring, and Alerting](#11-logging-monitoring-and-alerting)
12. [Incident Response and Breach Handling](#12-incident-response-and-breach-handling)
13. [Backup and Disaster Recovery](#13-backup-and-disaster-recovery)
14. [Vulnerability Management](#14-vulnerability-management)
15. [Business Logic Fraud Controls](#15-business-logic-fraud-controls)
16. [RBI Digital Lending Compliance](#16-rbi-digital-lending-compliance)
17. [ULI and AgriStack Alignment](#17-uli-and-agristack-alignment)
18. [Third-Party Risk Management](#18-third-party-risk-management)
19. [Compliance with Standards](#19-compliance-with-standards)
20. [Limitations and Risk Disclosure](#20-limitations-and-risk-disclosure)
21. [Future Security Roadmap](#21-future-security-roadmap)
22. [Declaration](#22-declaration)

---

# 1. Executive Summary

## 1.1 Organisation Overview

FarmerPay is an agri-fintech platform that provides data-driven decision support for agricultural lending. The platform operates as a Lending Service Provider (LSP) and Data Service Provider under the Reserve Bank of India's Digital Lending Guidelines framework.

## 1.2 Nature of Services

FarmerPay provides the following services to partner banks:

- **Repayment-as-a-Service:** Post-disbursal monitoring of crop loan utilisation, harvest tracking, mandi sale linkage, and automated repayment facilitation through verified sale proceeds.
- **Agricultural Credit Analytics:** Hyperlocal crop intelligence, price forecasting, and farmer credit risk assessment to support lending decisions.
- **Farmer Data Collection and Verification:** Structured collection of farmer profile, land, crop, and financial data through field agents and digital channels.

## 1.3 Role Classification

| Classification | Status |
|---------------|--------|
| Lending Service Provider (LSP) | Yes — facilitates loan origination and monitoring |
| Regulated Entity (RE) | No — FarmerPay is not a bank or NBFC |
| Data Service Provider | Yes — provides analytics to partner banks |
| Fund Custodian | No — FarmerPay does not hold, route, or disburse loan funds |

## 1.4 Security Philosophy

FarmerPay operates under the principle of defence in depth. Security is implemented at every layer of the technology stack: network, infrastructure, application, data, and operational processes. All design decisions prioritise the confidentiality, integrity, and availability of farmer and financial data.

## 1.5 Regulatory Commitment

FarmerPay commits to full compliance with:

- Reserve Bank of India Digital Lending Guidelines (September 2022)
- Information Technology Act, 2000 and Rules thereunder
- Digital Personal Data Protection Act, 2023
- UIDAI Aadhaar (Targeted Delivery of Financial and Other Subsidies, Benefits and Services) Act, 2016
- CERT-In Cyber Security Directions (April 2022)
- RBI Master Direction on KYC (as applicable to LSPs)

---

# 2. System Architecture Overview

## 2.1 High-Level Architecture

The FarmerPay platform comprises the following principal components:

- **Farmer-Facing Application:** Mobile-first interface for farmer onboarding, data submission, market intelligence viewing, and loan status tracking. Built as a React-based progressive web application.
- **Bank Dashboard:** Web interface for bank officers to review farmer data, loan applications, risk assessments, and portfolio analytics.
- **Backend API Services:** RESTful API layer built on Node.js (Express framework) handling business logic, data processing, and integration orchestration.
- **Relational Database:** MySQL 8.0 database storing structured farmer, loan, crop, and transaction data.
- **In-Memory Cache:** Redis 7 for session management, rate limiting, and performance-critical data caching.
- **Message Queue:** RabbitMQ for asynchronous processing of audit logs, notifications, and background computations.
- **Object Storage:** AWS S3 for secure storage of uploaded documents and media assets.

## 2.2 Deployment Model

| Aspect | Configuration |
|--------|--------------|
| Application Hosting | Cloud-based virtual private servers with containerised deployment |
| Database Hosting | Managed MySQL instance within private subnet |
| Cache and Queue | Redis and RabbitMQ in isolated containers, not exposed to public network |
| Static Assets | AWS S3 with server-side encryption |
| CDN | Planned for production (CloudFront) |

## 2.3 Integration Points

| Integration | Purpose | Status |
|------------|---------|--------|
| Partner Bank Core Banking System | Loan disbursement and repayment reconciliation | Integration-ready (API adapters built) |
| Unified Lending Interface (ULI) | Standardised data exchange with lenders | Architecture aligned; integration planned |
| AgriStack | Government agricultural data verification | API stubs created; awaiting production credentials |
| UIDAI e-KYC | Aadhaar-based identity verification | Encryption compliant; API integration planned |
| Agmarknet | Mandi price data ingestion | API ready; data pipeline built |

## 2.4 Data Flow (Textual Description)

1. Farmer registers on the platform via mobile application. Registration data (name, mobile number) is transmitted over HTTPS to the backend API.
2. During onboarding, farmer provides identity (Aadhaar), address, and bank account details. Aadhaar is encrypted using AES-256-GCM before storage. Bank account details are similarly encrypted.
3. Farm and crop data is collected by the farmer or verified by a field agent (Community Resource Person). Data is stored in the relational database.
4. When the farmer applies for a loan, the platform compiles a credit assessment package comprising: farmer profile, land details, crop details, TRUST credit score, PULSE market intelligence, and ROOTS cultivation data.
5. This package is made available to the partner bank's loan officer via the bank dashboard or API integration. The bank makes the final credit decision.
6. Upon bank approval and direct disbursement to the farmer's bank account (bank-to-borrower, no pass-through), the platform enables post-disbursal monitoring.
7. Harvest and sale data flows back through the platform, enabling repayment tracking and portfolio analytics for the bank.

At no point does FarmerPay hold, route, or process loan funds. All financial transactions occur directly between the bank and the borrower.

---

# 3. Data Flow and Data Classification

## 3.1 Data Types Handled

| Data Category | Examples | Sensitivity Level |
|--------------|---------|-------------------|
| Farmer Identity Data | Name, date of birth, gender, Aadhaar number | Restricted |
| Financial Data | Bank account details, IFSC code, loan amounts | Confidential |
| Contact Data | Mobile number, email address | Confidential |
| Farm Data | Land size, crop type, irrigation method | Internal |
| Transaction Data | Harvest quantities, sale records, mandi prices | Internal |
| Analytical Outputs | TRUST score, PULSE forecasts, sell recommendations | Internal |
| System Data | Audit logs, request IDs, session tokens | Internal |

## 3.2 Data Classification Framework

FarmerPay classifies data into four levels, each with prescribed handling requirements:

| Level | Description | Encryption at Rest | Encryption in Transit | Access Control |
|-------|------------|-------------------|----------------------|---------------|
| **Restricted** | Aadhaar, biometric data | AES-256-GCM with KMS | TLS 1.2+ | Named individuals only |
| **Confidential** | Bank accounts, loan details, PII | AES-256-GCM | TLS 1.2+ | Role-based, need-to-know |
| **Internal** | Farm data, crop data, analytics | Database-level encryption | TLS 1.2+ | Role-based |
| **Public** | Commodity prices, MSP rates | None required | TLS 1.2+ | Open |

## 3.3 Data Residency

All farmer data, financial data, and transaction records are stored within the territory of India. No data is transferred to servers outside India. Cloud infrastructure providers are required to demonstrate India-region data storage.

## 3.4 Data Retention

| Data Type | Retention Period | Post-Retention Action |
|-----------|-----------------|----------------------|
| Farmer PII | Duration of active relationship + 5 years | Anonymisation or deletion |
| Loan transaction records | 8 years (as per RBI guidelines) | Archival to immutable storage |
| Audit logs | 5 years | Archival to immutable storage |
| Session tokens | 30 days | Automatic expiry and deletion |
| OTP records | 24 hours | Automatic deletion |

---

# 4. Information Security Governance

## 4.1 Security Ownership

| Role | Responsibility |
|------|---------------|
| Chief Information Security Officer (CISO) | Overall security strategy, policy, and compliance |
| Engineering Lead | Secure development practices, code review, deployment security |
| DevOps Engineer | Infrastructure security, monitoring, patch management |
| Compliance Officer | Regulatory alignment, audit coordination, policy documentation |

## 4.2 Security Policies

The following policies govern FarmerPay's information security programme:

- Information Security Policy
- Acceptable Use Policy
- Access Control Policy
- Data Classification and Handling Policy
- Incident Response Policy
- Business Continuity and Disaster Recovery Policy
- Vendor and Third-Party Risk Management Policy
- Change Management Policy

## 4.3 Internal Controls

- Separation of duties between development, operations, and security functions.
- Principle of least privilege enforced across all systems.
- All code changes require peer review before deployment.
- Production access restricted to authorised operations personnel.
- Periodic access reviews conducted quarterly.

## 4.4 Audit Mechanisms

- Automated audit trail for all data modifications (field-level change tracking).
- Separate audit log for access to Restricted and Confidential data categories.
- Audit logs stored in append-only format with tamper detection.
- Quarterly internal security reviews.
- Annual third-party penetration testing (planned).

---

# 5. Application Security Controls

## 5.1 Authentication

| Control | Implementation |
|---------|---------------|
| Primary Authentication | JWT (JSON Web Token) with HS256 algorithm |
| Token Expiry | Access token: 30 minutes; Refresh token: 7 days |
| Algorithm Restriction | Explicit `algorithms: ['HS256']` on all token verification calls to prevent algorithm confusion attacks |
| Password Hashing | bcrypt with 12 salt rounds (adaptive cost function) |
| OTP Verification | 6-digit OTP, SHA-256 hashed before storage, constant-time comparison to prevent timing attacks |
| OTP Rate Limiting | Maximum 5 OTP requests per mobile number per 10-minute window |
| Account Lockout | Account locked after 5 consecutive failed login attempts |
| Session Management | Server-side session tracking with Redis; sessions invalidated on password change |
| Issuer Validation | JWT issuer claim verified on every request |

## 5.2 Authorisation

- Role-Based Access Control (RBAC) with 14 defined roles spanning farmer, agent, bank officer, and administrative functions.
- Middleware-enforced role checks on all protected endpoints.
- Resource ownership verification on all data-access endpoints (the authenticated user can only access their own data).

## 5.3 Input Validation

- All API request bodies validated using Joi schema validation middleware.
- Type checking, range validation, and format enforcement on all inputs.
- Parameterised queries via Sequelize ORM to prevent SQL injection.
- Numeric values in financial calculations validated for NaN, negative values, and unrealistic ranges.

## 5.4 Error Handling

- Global error handler catches all unhandled exceptions.
- Error responses return standardised error codes without exposing stack traces or internal details.
- Sequelize, JWT, and Multer errors mapped to safe, non-informative responses.

---

# 6. Infrastructure Security

## 6.1 Network Security

| Control | Implementation |
|---------|---------------|
| Database Access | MySQL bound to 127.0.0.1 (localhost only); not accessible from public network |
| Cache Access | Redis bound to 127.0.0.1 with password authentication (`requirepass`) |
| Message Queue | RabbitMQ bound to 127.0.0.1; management interface restricted to localhost |
| Application Port | Port 3000 served behind reverse proxy (Nginx) with HTTPS termination |
| Firewall | Host-level firewall (ufw/iptables) restricting inbound connections to ports 80 and 443 only |

## 6.2 Container Security

| Control | Implementation |
|---------|---------------|
| Base Image | Node.js 18 Alpine (minimal attack surface) |
| Runtime User | Non-root user (`nodejs:1001`) inside container |
| Build Process | Multi-stage Docker build; only production dependencies in final image |
| Secret Exclusion | `.dockerignore` prevents `.env`, `.git`, `node_modules`, logs, and test files from entering image |
| Health Checks | Docker HEALTHCHECK configured with 30-second interval |
| Credential Injection | Credentials passed via environment variables at runtime, never baked into images |

## 6.3 Server Hardening

For production deployment, the following hardening measures are mandated:

- SSH access via key-based authentication only; password authentication disabled.
- Root login disabled.
- Fail2ban or equivalent brute-force protection enabled.
- Automatic security updates enabled for operating system packages.
- Non-essential services and ports disabled.

---

# 7. Data Security and Privacy

## 7.1 Encryption in Transit

All data transmitted between the client application and backend services is encrypted using TLS 1.2 or higher. HTTPS is enforced for all API endpoints. HTTP requests are redirected to HTTPS at the reverse proxy layer.

## 7.2 Encryption at Rest

| Data | Encryption Method | Key Management |
|------|------------------|---------------|
| Aadhaar Numbers | AES-256-GCM with random IV and authentication tag | Environment-variable-based keys; KMS integration planned |
| Bank Account Details | AES-256-GCM with random IV and authentication tag | Separate encryption key from Aadhaar |
| Database at Rest | MySQL InnoDB tablespace encryption (when enabled at infrastructure level) | Managed by database provider |
| S3 Objects | AWS Server-Side Encryption (SSE-S3 or SSE-KMS) | AWS-managed keys |
| Backups | Encrypted at rest using infrastructure-level encryption | Backup encryption keys rotated quarterly |

## 7.3 Data Masking

- Aadhaar numbers are never displayed in API responses. The field is deleted from all profile response payloads.
- Only the last four digits of Aadhaar are logged in audit trails for reference.
- Bank account numbers are excluded from profile API responses.

## 7.4 Compliance with Data Protection Norms

FarmerPay is committed to compliance with the Digital Personal Data Protection Act, 2023. Implementation of the following controls is underway:

- Explicit, informed consent capture before data collection (consent management module in development).
- Purpose limitation: data collected only for stated and disclosed purposes.
- Right to erasure: data deletion mechanism under development.
- Consent withdrawal: mechanism under development.
- Data breach notification: process defined for notifying affected individuals and CERT-In within prescribed timelines.

---

# 8. Secrets and Key Management

## 8.1 Current Implementation

| Secret Type | Storage Method | Access Control |
|-------------|---------------|---------------|
| JWT Signing Keys | Environment variables | Application runtime only; not in source code |
| Database Credentials | Environment variables | Not committed to version control |
| AWS Access Keys | Environment variables | Scoped IAM policies with minimum required permissions |
| Encryption Keys (Aadhaar, Bank) | Environment variables | Separate keys per data category |
| OTP Secrets | Generated at runtime; hashed before storage | Ephemeral; expire after 10 minutes |

## 8.2 Secret Protection Controls

- The `.env` file containing secrets is excluded from version control via `.gitignore`.
- A `.env.example` template file is provided with placeholder values for onboarding.
- Docker images do not contain secrets; credentials are injected at container startup.
- Secrets are never logged, even at debug log level.

## 8.3 Planned Enhancements

- Migration to AWS Secrets Manager for all production secrets.
- AWS KMS integration for envelope encryption of Aadhaar and financial data.
- Automated key rotation on a 90-day cycle.
- Startup validation to reject application launch if critical secrets are missing or contain default values.

---

# 9. Access Control and Identity Management

## 9.1 User Roles

| Role | Description | Data Access |
|------|------------|------------|
| Farmer | Primary borrower; accesses own data only | Own profile, loans, advisories |
| FPO Admin | Farmer Producer Organisation administrator | Aggregated view of member farmers |
| Field Agent (CRP) | Community Resource Person; assists farmer onboarding | Assigned farmers' profiles |
| Trust Officer | Administers TRUST credit scoring questionnaires | Scoring metadata; no raw PII |
| DICE Analyst | Reviews loan applications and analytics | Anonymised portfolio data |
| System Admin | Platform administration and configuration | Full system access (audited) |

## 9.2 Privilege Control

- Every API endpoint enforces authentication via JWT middleware.
- Role-based middleware restricts access to authorised roles.
- Resource ownership is verified on all data-access endpoints: a farmer can access only their own advisories, loans, and profile data.
- Administrative endpoints are separated under distinct route prefixes with additional role checks.

## 9.3 Session Management

- Access tokens expire after 30 minutes, requiring refresh.
- Refresh tokens expire after 7 days.
- All active sessions are tracked server-side in the database.
- Sessions are invalidated upon password change, password reset, or explicit logout.
- Multiple concurrent sessions are permitted but auditable.

---

# 10. API Security Framework

## 10.1 API Authentication

All non-public API endpoints require a valid JWT Bearer token in the Authorization header. The token is verified against the server-side secret with explicit algorithm restriction (HS256 only) and issuer validation.

## 10.2 Rate Limiting

| Endpoint Category | Limit | Window | Backing Store |
|------------------|-------|--------|--------------|
| General API | 100 requests | 60 seconds | Redis (with in-memory fallback) |
| Authentication | 20 requests | 60 seconds | Redis |
| OTP Generation | 5 requests | 60 seconds | Redis |
| Loan Application | 5 applications | 30 days | Database |

## 10.3 Request Validation

- All request bodies validated against Joi schemas before reaching business logic.
- Path parameters validated for type and range.
- Query parameters validated for allowed values and ranges.
- File uploads restricted by MIME type, file size (maximum 10 MB), and file count (maximum 5).

## 10.4 API Logging

- Every API request is logged with: timestamp, method, URL, status code, response time, and request ID.
- Request IDs (X-Request-ID header) enable end-to-end tracing across services.
- Sensitive data (Authorization headers, request bodies containing PII) is not logged.

## 10.5 API Documentation

- OpenAPI 3.0 (Swagger) documentation is auto-generated from route annotations.
- Documentation is available at `/api-docs` in non-production environments.
- API documentation is disabled in production deployment.

---

# 11. Logging, Monitoring, and Alerting

## 11.1 Logging Strategy

| Log Type | Technology | Retention | Format |
|----------|-----------|-----------|--------|
| Application Logs | Winston with daily rotation | 14 days active; archived thereafter | JSON with timestamp, level, requestId |
| Access Logs | Morgan (HTTP request logging) | 14 days | Combined format |
| Error Logs | Winston (separate error file) | 30 days | JSON with full stack trace |
| Audit Logs | Database (AuditTrail model) | 5 years | Structured records with before/after values |
| Security Events | Database + file logs | 5 years | Structured with sensitivity classification |

## 11.2 Monitoring

- Application health endpoint (`/health`) reports service status, uptime, and timestamp.
- PM2 process manager monitors application restarts, memory usage, and CPU utilisation.
- Database connection health verified at startup and monitored continuously.
- Redis and RabbitMQ connection status tracked with automatic reconnection.

## 11.3 Alerting (Planned)

- Integration with monitoring services (Prometheus/Grafana or AWS CloudWatch) for production deployment.
- Alert triggers for: application errors exceeding threshold, database connection failures, Redis unavailability, and unusual API traffic patterns.

---

# 12. Incident Response and Breach Handling

## 12.1 Incident Classification

| Severity | Description | Response Time |
|----------|------------|---------------|
| Critical | Data breach, system compromise, fund misrouting | Immediate (within 1 hour) |
| High | Authentication bypass, unauthorised data access | Within 4 hours |
| Medium | Service degradation, failed controls | Within 24 hours |
| Low | Minor vulnerability, configuration issue | Within 72 hours |

## 12.2 Incident Response Procedure

1. **Detection:** Incident identified through monitoring alerts, user reports, or security audit.
2. **Containment:** Affected systems isolated. Compromised credentials rotated. Affected user sessions invalidated.
3. **Assessment:** Scope and impact determined. Data subjects affected identified.
4. **Notification:** Partner bank CISO office notified within 4 hours. CERT-In notified within 6 hours for qualifying incidents (as per CERT-In Direction of April 2022).
5. **Remediation:** Root cause identified and fixed. Controls strengthened. Post-incident review conducted.
6. **Documentation:** Incident report prepared with timeline, impact, root cause, and corrective actions.

## 12.3 Communication Protocol

| Stakeholder | Communication Channel | Timeline |
|------------|----------------------|----------|
| Partner Bank CISO | Secure email + phone call | Within 4 hours |
| CERT-In | Official reporting portal | Within 6 hours |
| Affected Data Subjects | SMS + in-app notification | Within 72 hours |
| RBI (if applicable) | Through partner bank | As directed by bank |

---

# 13. Backup and Disaster Recovery

## 13.1 Backup Strategy

| Data | Frequency | Retention | Storage |
|------|-----------|-----------|---------|
| MySQL Database | Daily full + hourly incremental | 30 days | Encrypted offsite storage |
| Redis Cache | Not backed up (ephemeral by design) | N/A | Reconstructed from database |
| Application Code | Version-controlled (Git) | Indefinite | GitHub private repository |
| Configuration | Version-controlled (excluding secrets) | Indefinite | GitHub private repository |
| Uploaded Documents | AWS S3 with versioning | Per retention policy | AWS S3 (India region) |

## 13.2 Recovery Objectives

| Metric | Target |
|--------|--------|
| Recovery Time Objective (RTO) | 4 hours |
| Recovery Point Objective (RPO) | 1 hour |

## 13.3 Disaster Recovery Testing

- Backup restoration tested quarterly.
- Failover procedures documented and rehearsed semi-annually.
- Results of DR tests documented and available for bank audit review.

---

# 14. Vulnerability Management

## 14.1 Security Audits Performed

A comprehensive pre-deployment security audit has been completed covering:

- **Application Security:** 8 vulnerabilities identified and remediated, including IDOR, JWT algorithm confusion, and timing attack vulnerabilities. All fixes verified through automated smoke testing.
- **Infrastructure Security:** 8 issues identified and remediated, including network exposure of database and cache services, credential hardening, and container security.
- **Business Logic:** 13 fraud scenarios identified with mitigation controls recommended.
- **Dependency Scanning:** `npm audit` performed; 2 advisories noted (aws-sdk region validation, nodemailer SMTP injection).

## 14.2 Code Review Practices

- All code changes submitted via pull requests with mandatory peer review.
- Security-sensitive changes (authentication, authorisation, encryption) require review by a senior engineer.
- Automated linting (ESLint) enforced on all commits.

## 14.3 Dependency Management

- All third-party dependencies declared in `package.json` with version pinning.
- `npm audit` run as part of the build process.
- Vulnerable dependencies tracked and upgraded on a monthly cycle.
- No post-install scripts in dependencies that could execute arbitrary code.

## 14.4 Patch Management

- Operating system security patches applied within 72 hours of release.
- Framework and library updates reviewed and applied within 14 days of security advisories.
- Emergency patches for critical vulnerabilities applied within 24 hours.

---

# 15. Business Logic Fraud Controls

This section is of particular relevance to bank risk management teams evaluating the platform for agricultural lending support.

## 15.1 Current Controls

| Control | Implementation | Status |
|---------|---------------|--------|
| Farmer Identity Verification | Aadhaar collection and encryption during onboarding | Implemented; UIDAI e-KYC API integration planned |
| Mobile Verification | OTP-based mobile verification at registration | Implemented |
| Loan Application Rate Limiting | Maximum 5 applications per farmer per 30-day period | Implemented |
| Audit Trail | Field-level change tracking on all sensitive data modifications | Implemented |
| Resource Ownership Checks | All API endpoints verify authenticated user owns requested data | Implemented |
| Financial Calculation Validation | Numeric inputs validated for NaN, negative values, and unrealistic ranges | Implemented |
| Loan-to-Value Enforcement | Post-harvest top-up loans capped at 70% of produce valuation | Implemented (per-loan) |

## 15.2 Controls Under Development

| Control | Purpose | Target Date |
|---------|---------|-------------|
| Mandatory KYC Gate | Block loan access until identity verified via UIDAI | Q2 2026 |
| Aggregate Debt Cap | Check total outstanding loans before new approval | Q2 2026 |
| Maker-Checker Workflow | Two-person approval for loan decisions | Q2 2026 |
| Warehouse Receipt Verification | Validate eNWR against warehouse database | Q3 2026 |
| Credit Bureau Integration | CIBIL/Experian check before loan approval | Q3 2026 |
| Mandi Transaction Verification | Cross-check sale records against mandi data | Q3 2026 |
| Satellite Yield Verification | Compare reported harvest against satellite estimates | Q4 2026 |

## 15.3 Fraud Detection Capabilities

- TRUST credit scoring engine with 13 input signals including PULSE price risk and DICE repayment stress indicators.
- Anomaly detection flags planned for: yield exceeding district averages, duplicate accounts, and unusual sale patterns.
- Complete audit trail enabling forensic investigation of data manipulation.

## 15.4 Risk Acknowledgement

FarmerPay acknowledges that certain data elements (farm size, crop yield, harvest quantity) are currently based on farmer self-reporting. Cross-verification against government databases, satellite imagery, and mandi transaction records is on the development roadmap. Until these integrations are operational, the partner bank's field verification processes serve as the primary validation control.

---

# 16. RBI Digital Lending Compliance

## 16.1 Fund Flow

FarmerPay does not hold, route, or disburse loan funds at any point in the lending lifecycle. All loan disbursements occur directly from the partner bank to the borrower's bank account. The platform tracks disbursement status via UTR (Unique Transaction Reference) numbers provided by the bank.

## 16.2 Fee Transparency

All fees, charges, and interest rates associated with loan products are stored in the platform database and are available for display to borrowers. A comprehensive fee disclosure mechanism with pre-acceptance acknowledgement is under development.

## 16.3 Borrower Protection

| RBI Requirement | Status | Implementation Plan |
|----------------|--------|-------------------|
| Explicit borrower consent | Under development | Consent management module with versioned T&C |
| Fee disclosure before acceptance | Under development | Fee schedule API with signed acknowledgement |
| Cooling-off period (loan cancellation) | Under development | 14-day withdrawal window post-approval |
| Grievance redressal system | Under development | Grievance filing, tracking, and escalation module |
| Data usage transparency | Partial | Privacy policy exists; granular consent planned |

## 16.4 Compliance Roadmap

- **Phase 1 (Q2 2026):** Consent management, fee disclosure, cooling-off period, grievance redressal.
- **Phase 2 (Q3 2026):** KYC gate enforcement, credit bureau integration, maker-checker workflow.
- **Phase 3 (Q4 2026):** End-use monitoring, satellite verification, advanced fraud controls.

---

# 17. ULI and AgriStack Alignment

## 17.1 ULI Architecture Alignment

| ULI Principle | FarmerPay Alignment |
|--------------|-------------------|
| API-First Design | All services exposed as RESTful APIs with OpenAPI 3.0 documentation |
| Data Interoperability | Standardised JSON response formats with consistent field naming |
| Multi-Lender Support | Loan products support multiple providers; lender-agnostic architecture |
| Consent-Based Data Sharing | Consent layer under development; architecture supports granular consent |
| Data Quality Indicators | TRUST score provides confidence levels; "verified vs self-reported" tagging planned |

## 17.2 AgriStack Integration

FarmerPay's data model is designed for interoperability with the AgriStack ecosystem:

- **LGD-Compliant Location Hierarchy:** States, districts, blocks, and villages stored using LGD (Local Government Directory) codes.
- **Crop Classification:** Commodities classified using standard agricultural taxonomy.
- **Farmer Identity:** Aadhaar-based identification aligned with AgriStack's Farmer ID framework.

API stubs for AgriStack data ingestion (land records, crop sown data, farmer registry) have been created and await production API credentials.

## 17.3 Integration Architecture

The platform uses an adapter pattern for external integrations, allowing partner-specific connectors to be developed without modifying core business logic. Integration logs are maintained for audit and reconciliation purposes.

---

# 18. Third-Party Risk Management

## 18.1 External Services

| Service Provider | Purpose | Data Shared | Risk Controls |
|-----------------|---------|------------|--------------|
| AWS (S3, KMS) | Document storage, encryption key management | Uploaded documents (encrypted) | IAM least-privilege policies; India-region storage |
| Agmarknet API | Mandi price data | None (data ingestion only) | API key authentication; rate limiting |
| Weather API | Weather data for crop advisories | Farmer location (district level) | Read-only access; no PII shared |
| SMTP/SES | Email delivery | Recipient email address | Transport encryption; no message body logging |
| SMS Provider | OTP delivery | Recipient mobile number | Transport encryption; OTP not logged in plaintext |

## 18.2 Dependency Risk

- All runtime dependencies are open-source, widely-used libraries with active maintenance.
- Dependency versions are pinned to prevent supply-chain attacks via automatic updates.
- `npm audit` scans are performed before each deployment.

## 18.3 Vendor Assessment

Third-party services are evaluated against the following criteria before adoption:

- Data residency (must support India region).
- Encryption capabilities (must support TLS 1.2+ and server-side encryption).
- Compliance certifications (SOC 2, ISO 27001 preferred).
- SLA commitments for availability.

---

# 19. Compliance with Standards

## 19.1 OWASP Top 10 Alignment

| OWASP Category | Mitigation |
|---------------|-----------|
| A01: Broken Access Control | RBAC middleware, resource ownership verification, IDOR fixes applied |
| A02: Cryptographic Failures | AES-256-GCM for Aadhaar and bank data, bcrypt for passwords, TLS in transit |
| A03: Injection | Sequelize ORM with parameterised queries; Joi input validation |
| A04: Insecure Design | Threat modelling performed; business logic fraud analysis completed |
| A05: Security Misconfiguration | Helmet headers, Docker non-root user, ports bound to localhost |
| A06: Vulnerable Components | npm audit scanning, dependency pinning, patch management |
| A07: Authentication Failures | JWT with algorithm restriction, rate limiting, account lockout, timing-safe OTP |
| A08: Data Integrity | Audit trail, status history tracking, soft delete pattern |
| A09: Logging Failures | Winston structured logging, audit trail, request ID tracing |
| A10: SSRF | No user-supplied URLs processed; outbound calls only to whitelisted APIs |

## 19.2 Secure Development Lifecycle

- Security requirements defined during feature planning.
- Peer code review mandatory for all changes.
- Security-focused testing included in pre-deployment checklist.
- Pre-deployment audit completed covering application, infrastructure, business logic, and compliance.

---

# 20. Limitations and Risk Disclosure

FarmerPay makes the following disclosures in the interest of transparency:

## 20.1 Known Limitations

| Area | Limitation | Mitigation |
|------|-----------|-----------|
| Farmer Data Verification | Farm size, crop yield, and harvest data are currently self-reported | Cross-verification integrations (satellite, land records, CIBIL) are on the roadmap |
| KYC Enforcement | KYC is collected but not enforced as a gate before loan access | KYC gate is the highest priority development item |
| Consent Management | Explicit consent capture and withdrawal mechanisms are under development | Consent module targeted for Q2 2026 |
| Grievance Redressal | Formal grievance system is under development | Targeted for Q2 2026 |
| Penetration Testing | Automated security audit completed; formal third-party penetration test not yet conducted | Planned for Q2 2026 |

## 20.2 Residual Risks

| Risk | Severity | Mitigation Status |
|------|----------|------------------|
| Self-reported data manipulation by farmer | Medium | Addressed through bank's field verification; platform verification planned |
| Collusion between field agent and farmer | Medium | Audit trail enables forensic detection; anomaly detection planned |
| Single-person loan approval (no maker-checker) | Medium | Maker-checker workflow targeted for Q2 2026 |

---

# 21. Future Security Roadmap

| Quarter | Initiative | Impact |
|---------|-----------|--------|
| Q2 2026 | Consent management module | RBI DLG compliance |
| Q2 2026 | Grievance redressal system | RBI DLG compliance |
| Q2 2026 | KYC enforcement gate | Fraud prevention |
| Q2 2026 | Maker-checker loan approval | Fraud prevention |
| Q2 2026 | Fee disclosure and cooling-off period | Borrower protection |
| Q3 2026 | AWS KMS integration for key management | Data security |
| Q3 2026 | Credit bureau (CIBIL) integration | Credit risk |
| Q3 2026 | Warehouse receipt verification | Collateral integrity |
| Q3 2026 | Third-party penetration test | Security validation |
| Q4 2026 | Satellite-based yield verification | Data integrity |
| Q4 2026 | Anomaly detection and fraud scoring | Fraud detection |
| Q4 2026 | SOC 2 Type II certification preparation | Compliance |

---

# 22. Declaration

FarmerPay hereby declares that:

1. The information contained in this document is accurate and complete to the best of our knowledge as of the date of preparation.

2. FarmerPay is committed to maintaining the highest standards of information security and data protection in accordance with the regulatory framework of the Reserve Bank of India and the laws of India.

3. FarmerPay does not, and will not, hold, route, or disburse loan funds. All financial transactions occur directly between the lending institution and the borrower.

4. FarmerPay welcomes security audits, penetration testing, and compliance assessments by partner banks and their appointed auditors. We commit to providing full cooperation and access as required.

5. FarmerPay acknowledges the areas under development identified in this document and commits to the remediation roadmap outlined herein.

6. This document will be updated on a quarterly basis or upon any material change to the security posture of the platform.

---

**Document End**

**For queries regarding this document, contact:**
FarmerPay Information Security Office
Email: security@farmerpay.in
