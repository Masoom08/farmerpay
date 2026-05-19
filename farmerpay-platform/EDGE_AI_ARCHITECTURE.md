# FarmerPay Edge AI Architecture
# Offline-First Analytics for Farmer Mobile Application

**Date:** April 5, 2026
**Classification:** Internal — Architecture Decision Record

---

## The Problem

Rural India connectivity: 40% of farmers have 2G/3G only. Signal drops during field work. Data costs matter. But farmers need instant insights — "Am I on track?" cannot wait for a server round-trip.

## The Answer: Hybrid Edge + Cloud

**60% of FarmerPay's analytics can run directly on the farmer's phone with zero internet.** The remaining 40% needs cloud, but results can be pre-cached so the farmer almost never waits.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                    FARMER'S PHONE (EDGE)                        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  EDGE ANALYTICS ENGINE (runs offline)                    │   │
│  │                                                          │   │
│  │  1. PoP Compliance Scorer                                │   │
│  │     Farmer enters workband → instant score 0-100         │   │
│  │     "Touchpoint 5: 82/100 — On Track"                    │   │
│  │                                                          │   │
│  │  2. Input Cost Calculator                                │   │
│  │     Farmer selects inputs → instant loan calculation      │   │
│  │     "Recommended loan: ₹85,000 (as per DLTC norm)"      │   │
│  │                                                          │   │
│  │  3. Cost vs Budget Tracker                               │   │
│  │     "You have spent ₹41,000 of ₹85,000 budget"          │   │
│  │                                                          │   │
│  │  4. Sell vs Store Simulator                              │   │
│  │     3 scenarios calculated locally with cached prices     │   │
│  │     "Store 15 days: ₹12,000 more profit"                │   │
│  │                                                          │   │
│  │  5. TRUST Base Score                                     │   │
│  │     Questionnaire scoring (0-1000) runs entirely local    │   │
│  │                                                          │   │
│  │  6. Advisory Display + Crop Health Logging               │   │
│  │     Show cached advisories, log observations offline      │   │
│  │                                                          │   │
│  │  7. Crop Disease Detection (TFLite)                      │   │
│  │     Camera → on-device ML → "Leaf blight detected"       │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  LOCAL DATABASE (SQLite)                                  │   │
│  │                                                          │   │
│  │  Synced reference data (~5 MB):                          │   │
│  │  • PoP templates (10 workbands, 40 tasks, 80 inputs)     │   │
│  │  • Input catalogue + regional prices                      │   │
│  │  • Scale of Finance norms (district-crop-season)          │   │
│  │  • Commodity metadata + MSP rates                         │   │
│  │  • TRUST scoring rules (sections, questions, choices)     │   │
│  │  • Translations (11 languages)                            │   │
│  │                                                          │   │
│  │  Farmer data (~200 KB per cycle):                         │   │
│  │  • Execution records (workbands, tasks, inputs, labour)   │   │
│  │  • Compliance snapshots                                   │   │
│  │  • Loan application + EMI schedule                        │   │
│  │  • TRUST responses + score                                │   │
│  │  • Advisories + alerts (cached)                           │   │
│  │                                                          │   │
│  │  Cached cloud data (refreshed when online):               │   │
│  │  • PULSE price forecasts (7/15/30 day)                    │   │
│  │  • External TRUST signals (±80 points)                    │   │
│  │  • Latest sell recommendation                             │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  SYNC ENGINE (runs when internet available)              │   │
│  │                                                          │   │
│  │  Upload queue:                                            │   │
│  │  • New execution records → server                         │   │
│  │  • Photos → S3 (background, resumable)                    │   │
│  │  • Crop observations → server                             │   │
│  │  • TRUST responses → server                               │   │
│  │                                                          │   │
│  │  Download queue:                                           │   │
│  │  • Fresh PULSE forecasts                                  │   │
│  │  • Updated advisories/alerts                              │   │
│  │  • External TRUST signal adjustments                      │   │
│  │  • Updated input prices (weekly)                          │   │
│  │  • SoF norm updates (annual)                              │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
                              │
                    (sync when online)
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                    CLOUD SERVER                                  │
│                                                                  │
│  ┌────────────────────────┐  ┌─────────────────────────────┐  │
│  │  PULSE ML Pipeline      │  │  Banker Dashboard            │  │
│  │                          │  │                              │  │
│  │  Daily 2AM:              │  │  Portfolio overview           │  │
│  │  Agmarknet → XGBoost    │  │  Farmer risk list            │  │
│  │  → 7/15/30d forecasts   │  │  Early warnings              │  │
│  │  → Valkey cache         │  │  NPA prediction              │  │
│  │                          │  │  (cross-farmer analytics)    │  │
│  │  Weekly:                 │  │                              │  │
│  │  Sentinel-2 NDVI        │  │  Cannot run on phone —       │  │
│  │  → model retraining     │  │  needs entire portfolio      │  │
│  │                          │  │                              │  │
│  └────────────────────────┘  └─────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────┐  ┌─────────────────────────────┐  │
│  │  Harvest Event Bridge   │  │  External Signal Engine      │  │
│  │                          │  │                              │  │
│  │  Triggered on harvest:  │  │  PULSE risk (±50 pts)        │  │
│  │  PULSE × DICE × SAGE   │  │  DICE stress (±30 pts)       │  │
│  │  orchestration          │  │  PoP compliance (±40 pts)    │  │
│  │                          │  │                              │  │
│  │  Needs real-time data   │  │  Returns single number       │  │
│  │  from multiple modules  │  │  to phone: "+15 points"      │  │
│  │                          │  │                              │  │
│  └────────────────────────┘  └─────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────┐  ┌─────────────────────────────┐  │
│  │  CIBIL / UIDAI APIs     │  │  Weather / Satellite APIs    │  │
│  │  (future)               │  │  (future)                    │  │
│  └────────────────────────┘  └─────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

---

## What Runs Where — Complete Mapping

### EDGE (Farmer's Phone) — Runs Offline, Instant Results

| Analytics | What Farmer Sees | Compute Time | Data Needed Locally |
|-----------|-----------------|-------------|-------------------|
| **PoP Compliance Scoring** | "Touchpoint 5: 82/100 — On Track. 3 deviations found." | <100ms | PoP template (~50 KB) + SoF norms (~5 KB) |
| **Input Cost Calculator** | Dropdown of inputs with prices → "Recommended loan: ₹85,000" | <100ms | Input catalogue + prices (~200 KB) + SoF (~5 KB) |
| **Cost vs Budget Tracker** | "Spent ₹41,000 of ₹85,000 budget. 52% remaining." | <10ms | Own execution data (~50 KB) |
| **Sell vs Store Simulator** | "Store 15 days: ₹12,000 more. Store 30 days: ₹18,000 more." | <50ms | Cached PULSE forecasts (~5 KB) |
| **TRUST Base Score** | "Your credit score: 720 — Good" | <20ms | Scoring rules (~30 KB) + own responses (~8 KB) |
| **Advisory Display** | "Apply DAP fertiliser this week per your PoP schedule" | <5ms | Cached advisories (~20 KB) |
| **Crop Health Logging** | "Pest detected. Advisory generated: Apply Cypermethrin." | <10ms | Advisory rules (~5 KB) |
| **Crop Disease Detection** | Camera photo → "Leaf blight detected (87% confidence)" | <2 sec | TFLite model (~10-20 MB) |

**Total edge compute: <2.5 seconds for all analytics combined.**
**Total local data: ~5-6 MB reference data + ~200 KB farmer data.**

### CLOUD — Requires Server, Results Cached on Phone

| Analytics | What It Produces | When It Runs | What Phone Receives |
|-----------|-----------------|-------------|-------------------|
| **PULSE Price Forecasts** | 7/15/30-day price predictions for 50+ crops | Daily 2 AM (batch) | 3 forecast numbers per crop (~500 bytes) |
| **External TRUST Signals** | ±80 point adjustment to credit score | On each sync | Single number: "+15 points" |
| **Harvest Event Bridge** | Sell recommendation + SAGE advisory | On harvest recording | 1 recommendation object (~500 bytes) |
| **Banker Dashboard** | Portfolio analytics for bank officers | On demand (web) | Never sent to farmer phone |
| **NPA Prediction Model** | "12 farmers are high-risk" | Weekly (batch) | Never sent to farmer phone |

**The farmer never waits for cloud.** Cloud results are pre-cached during background sync.

---

## Edge Application Tech Stack

### Option A: React Native + SQLite (Recommended)

```
┌──────────────────────────────────────────┐
│  React Native App                         │
│                                          │
│  ├── UI Layer (React components)          │
│  │   ├── PulseDashboard.jsx              │  ← Already built
│  │   ├── PriceRealisationSimulator.jsx   │  ← Already built
│  │   ├── TopupLoanCard.jsx               │  ← Already built
│  │   └── ... (10 components)             │
│  │                                        │
│  ├── Edge Analytics Engine               │
│  │   ├── popComplianceScorer.js          │  ← Port from Node service
│  │   ├── inputCostCalculator.js          │  ← Port from Node service
│  │   ├── realisationCalculator.js        │  ← Already built (client-side)
│  │   ├── trustBaseScorer.js              │  ← Port scoring logic
│  │   └── cropDiseaseDetector.js          │  ← TFLite wrapper
│  │                                        │
│  ├── Local Database (SQLite/WatermelonDB)│
│  │   ├── Reference tables (synced)       │
│  │   ├── Farmer execution data           │
│  │   └── Cached cloud results            │
│  │                                        │
│  ├── Sync Engine                          │
│  │   ├── backgroundSync.js              │
│  │   ├── uploadQueue.js                 │
│  │   ├── downloadQueue.js               │
│  │   └── conflictResolver.js            │
│  │                                        │
│  └── TFLite Runtime (crop disease)       │
│      └── crop_disease_model.tflite       │  ← 10-20 MB
└──────────────────────────────────────────┘
```

**Why React Native:**
- The pulse-farmer frontend components are already built in React (JSX)
- Can reuse 90% of component code
- SQLite/WatermelonDB for offline database
- TFLite integration via react-native-tflite
- Background sync via react-native-background-fetch
- Camera integration for crop disease detection

### Option B: Progressive Web App (PWA)

```
┌──────────────────────────────────────────┐
│  PWA (Service Worker + IndexedDB)         │
│                                          │
│  ├── Service Worker                       │
│  │   ├── Offline cache strategy          │
│  │   ├── Background sync API             │
│  │   └── Push notifications              │
│  │                                        │
│  ├── IndexedDB                            │
│  │   ├── Reference data store            │
│  │   ├── Farmer data store               │
│  │   └── Sync queue store                │
│  │                                        │
│  └── Edge compute (same JS as server)    │
│      ├── realisationCalculator.js        │  ← Already built
│      ├── popComplianceScorer.js          │  ← Port from Node
│      └── inputCostCalculator.js          │  ← Port from Node
└──────────────────────────────────────────┘
```

**Why PWA might work:**
- No app store approval needed
- Instant updates (no farmer action required)
- Same JavaScript as backend — can share calculation code
- Works on any phone with Chrome/Firefox
- BUT: No TFLite support, limited background processing

### Recommendation: React Native for Full Feature Set

PWA works for basic analytics but cannot do on-device ML (crop disease detection) or reliable background sync. React Native gives full access to camera, background tasks, and TFLite.

---

## Crop Disease Detection — Edge ML Model

This is the one ML model that SHOULD run on the phone:

```
Farmer takes photo of crop leaf
        │
        ▼
┌─────────────────────────────────────┐
│  On-Device TFLite Model              │
│                                     │
│  Input: 224×224 RGB image            │
│  Model: MobileNetV2 fine-tuned       │
│  Size: 10-20 MB (quantized INT8)     │
│  Inference: 500ms-2s on budget phone │
│                                     │
│  Output:                             │
│  • Disease name: "Leaf Blight"       │
│  • Confidence: 87%                   │
│  • Recommended action: text          │
│  • Linked to SAGE advisory           │
└─────────────────────────────────────┘
        │
        ▼
Auto-creates SageCropHealthObservation
+ generates advisory for farmer
```

**Training data source:** PlantVillage dataset (54,000 leaf images, 38 disease classes) + Indian crop-specific data from ICAR.

**Why on-device:**
- Farmer is in the field with poor connectivity
- Needs instant answer ("Is this a disease?")
- Photo stays on phone (privacy)
- Model is small enough (10-20 MB compressed)

**Why NOT on cloud:**
- Upload 500KB photo on 2G = 30+ seconds
- Farmer waiting in the sun with phone raised
- Connectivity may not exist in the field

---

## Sync Strategy — How Edge and Cloud Stay in Harmony

### Sync Tiers

| Tier | What | Direction | Frequency | Size per Sync |
|------|------|-----------|-----------|--------------|
| **Tier 1: Critical** | Farmer execution data (workbands, tasks, inputs) | Phone → Cloud | Immediate when online | ~2-5 KB per entry |
| **Tier 2: Important** | PULSE forecasts, advisories, TRUST signal | Cloud → Phone | Every 4 hours | ~10 KB |
| **Tier 3: Reference** | PoP templates, input prices, SoF norms | Cloud → Phone | Daily | ~50-200 KB |
| **Tier 4: Heavy** | Photos | Phone → Cloud (S3) | Background, resumable | 200-500 KB per photo |
| **Tier 5: Rare** | Translations, commodity catalogue, mandi list | Cloud → Phone | Weekly | ~100 KB |

### Conflict Resolution

```
If farmer edits data offline and server has newer version:
  → FARMER WINS (farmer's field observations are ground truth)
  → Server version archived in conflict_log table

If server pushes updated PoP template:
  → SERVER WINS (PoP is authority-managed)
  → Farmer notified: "Your PoP has been updated"

If price data conflicts:
  → LATEST TIMESTAMP WINS
  → Farmer always sees most recent price
```

### Offline Behaviour

| Scenario | What Happens |
|----------|-------------|
| Farmer enters workband data offline | Saved to SQLite. Compliance scored locally. Synced when online. |
| Farmer opens price dashboard offline | Shows cached prices with "Last updated: 2 days ago" label |
| Farmer applies for loan offline | Input calculator works locally. Application queued for sync. |
| Farmer takes crop disease photo offline | TFLite runs locally. Result shown. Photo queued for S3 upload. |
| Farmer checks TRUST score offline | Base score (0-1000) shown. External signals show "last synced" values. |

---

## Data Budget Per Farmer

### Storage on Phone

| Component | Size | Persistence |
|-----------|------|------------|
| App binary (React Native) | 30-50 MB | Permanent |
| TFLite model (crop disease) | 10-20 MB | Permanent (updated quarterly) |
| Reference data (PoP, prices, SoF) | 3-5 MB | Refreshed daily/weekly |
| Farmer data (1 cycle) | 200 KB | Grows per cycle |
| Photos (15 per cycle) | 3.7 MB | Uploaded + deleted locally |
| Cached cloud results | 50-100 KB | Refreshed on sync |
| **Total** | **~50-80 MB** | |

### Network Usage Per Month

| Activity | Uploads | Downloads | Total |
|----------|---------|-----------|-------|
| Daily execution sync (10 entries/month) | 50 KB | — | 50 KB |
| Photo uploads (5 photos/month) | 1.5 MB | — | 1.5 MB |
| Price forecast refresh (30 syncs) | — | 300 KB | 300 KB |
| Advisory refresh (30 syncs) | — | 150 KB | 150 KB |
| Reference data refresh (4 weekly) | — | 400 KB | 400 KB |
| **Monthly total** | **~1.6 MB** | **~850 KB** | **~2.5 MB** |

At ₹10-20 per GB data cost, this is **less than ₹0.05 per month** in data charges.

---

## What Already Exists vs What Needs to Be Built

### Already Built (Reusable)

| Component | Location | Reuse Strategy |
|-----------|----------|---------------|
| 10 React UI components | `src/modules/pulse-farmer/components/` | Port to React Native (90% reusable) |
| realisationCalculator.js | `src/modules/pulse-farmer/services/` | Use directly (pure JS, no Node deps) |
| formatPrice.js | `src/modules/pulse-farmer/utils/` | Use directly |
| trendIndicator.js | `src/modules/pulse-farmer/utils/` | Use directly |
| translations.js (en + hi) | `src/modules/pulse-farmer/utils/` | Use directly |
| PoP compliance scoring logic | `src/modules/roots/crop/services/popComplianceService.js` | Port to edge (replace DB calls with SQLite) |
| Input cost calculator logic | `src/modules/dice/services/inputCostCalculatorService.js` | Port to edge (replace DB calls with SQLite) |
| Trust scoring logic | `src/modules/trust/services/scoringEngine.js` | Port base scorer (exclude external signals) |

### Needs to Be Built

| Component | Effort | Priority |
|-----------|--------|----------|
| React Native app shell + navigation | 2 weeks | P0 |
| SQLite database layer + schema | 1 week | P0 |
| Sync engine (upload/download queues) | 2 weeks | P0 |
| Edge compliance scorer (SQLite version) | 3 days | P0 |
| Edge input cost calculator (SQLite version) | 3 days | P1 |
| Edge TRUST base scorer (SQLite version) | 2 days | P1 |
| TFLite crop disease model integration | 1 week | P2 |
| Background sync + conflict resolution | 1 week | P1 |
| Offline indicator UI | 2 days | P1 |
| Photo upload manager (resumable) | 3 days | P1 |

**Total estimated effort: 6-8 weeks for a 2-developer team.**

---

## Summary

| Question | Answer |
|----------|--------|
| Can we build edge analytics? | **Yes — 60% of analytics can run on-device** |
| Will it work offline? | **Yes — core farmer insights work with zero internet** |
| How much storage? | **~50-80 MB total (including TFLite model)** |
| How much data per month? | **~2.5 MB — costs farmer less than ₹0.05/month** |
| Can it run on a ₹5,000 phone? | **Yes — 2 GB RAM, Android 8+ is sufficient** |
| What CANNOT run on phone? | Banker dashboard, PULSE ML pipeline, harvest bridge, cross-farmer analytics |
| What existing code can we reuse? | **10 React components + 3 calculation services + translations** |
| How long to build? | **6-8 weeks for 2 developers** |

---

*This architecture ensures farmers get instant insights in the field — no waiting for servers, no data charges, no connectivity dependency.*
