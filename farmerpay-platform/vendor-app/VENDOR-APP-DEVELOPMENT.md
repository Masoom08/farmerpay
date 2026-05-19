# FarmerPay — Vendor App Development Plan

> **Last updated:** 2026-05-11
> **App path:** `vendor-app/`
> **Stack:** React Native 0.81.5 · Expo SDK 54 · Expo Router 6 · TypeScript
> **Backend module:** VYAPAR (`/api/v1/vyapar`)
> **Role:** `VENDOR` (RBAC)

---

## 1. What Exists Today (Current State)

### 1.1 Screens Built (8 screens)

| File | Screen | Status |
|------|--------|--------|
| `app/_layout.tsx` | Root layout with StatusBar | ✅ Done |
| `app/index.tsx` | Auth guard — redirects to login or tabs | ✅ Done |
| `app/login.tsx` | MPIN login (mobile + 4-digit MPIN) | ✅ Done |
| `app/(tabs)/_layout.tsx` | Bottom tab navigator (5 tabs) | ✅ Done |
| `app/(tabs)/index.tsx` | Home dashboard with KPI cards | ✅ Done |
| `app/(tabs)/record-sale.tsx` | Record a farmer sale (cash/credit) | ✅ Done |
| `app/(tabs)/farmers.tsx` | My Farmers list (from transactions + credit) | ✅ Done |
| `app/(tabs)/catalog.tsx` | Product catalog + inventory management | ✅ Done |
| `app/(tabs)/credit.tsx` | Credit ledger + record payment | ✅ Done |
| `app/add-farmer.tsx` | Register new farmer customer | ✅ Done |
| `app/give-credit.tsx` | Extend credit to a farmer | ✅ Done |

### 1.2 API Client (`lib/api.ts`)

- `getToken` / `setToken` / `clearToken` — AsyncStorage token management
- `setUser` / `getUser` — user profile storage
- `apiGet` / `apiPost` / `apiPut` — authenticated REST calls
- `formatRupees` — Indian rupee formatter
- Base URL: `http://10.0.2.2:3000/api/v1` (configurable via `app.json` extra)

### 1.3 Backend API Routes Used

| Method | Endpoint | Used by |
|--------|----------|---------|
| POST | `/auth/login` | login.tsx |
| GET | `/vyapar/performance` | Home dashboard |
| GET | `/vyapar/catalog` | catalog.tsx, record-sale.tsx |
| POST | `/vyapar/catalog` | catalog.tsx (add product) |
| PUT | `/vyapar/catalog/:id` | catalog.tsx (update stock) |
| POST | `/vyapar/transactions` | record-sale.tsx |
| GET | `/vyapar/credit-ledger` | credit.tsx, farmers.tsx |
| POST | `/vyapar/credit-ledger/:id/payment` | credit.tsx |
| GET | `/vyapar/transactions?limit=50` | farmers.tsx |
| POST | `/vyapar/farmer/register-farmer` | add-farmer.tsx |
| POST | `/vyapar/farmer/give-credit` | give-credit.tsx |

---

## 2. VYAPAR Backend — Full API Surface

The backend VYAPAR module has **35 endpoints** and **27 models**. The vendor app currently uses only ~11 of them. Below is the full backend capability:

### 2.1 Vendor Management (`/vyapar`)
- `GET /vyapar/profile` — vendor's own profile
- `PUT /vyapar/profile` — update profile
- `GET /vyapar/performance` — monthly KPIs ✅ used
- `GET /vyapar/analytics` — detailed analytics
- `GET /vyapar/service-areas` — coverage areas
- `POST /vyapar/service-areas` — add service area

### 2.2 Catalog & Inventory (`/vyapar/catalog`)
- `GET /vyapar/catalog` ✅ used
- `POST /vyapar/catalog` ✅ used
- `PUT /vyapar/catalog/:id` ✅ used
- `DELETE /vyapar/catalog/:id` — remove product
- `GET /vyapar/inventory` — stock levels
- `PUT /vyapar/inventory/:id` — bulk stock update

### 2.3 Transactions (`/vyapar/transactions`)
- `POST /vyapar/transactions` ✅ used
- `GET /vyapar/transactions` ✅ used
- `GET /vyapar/transactions/:id` — transaction detail
- `PUT /vyapar/transactions/:id/cancel` — cancel
- `POST /vyapar/transactions/:id/evidence` — upload receipt photo

### 2.4 Farmer-Vendor (`/vyapar/farmer`)
- `POST /vyapar/farmer/register-farmer` ✅ used
- `POST /vyapar/farmer/give-credit` ✅ used
- `GET /vyapar/farmer/my-farmers` — paginated farmer list
- `GET /vyapar/farmer/:farmerId/history` — purchase history
- `GET /vyapar/farmer/:farmerId/credit-status` — credit info

### 2.5 Credit Ledger (`/vyapar/credit-ledger`)
- `GET /vyapar/credit-ledger` ✅ used
- `POST /vyapar/credit-ledger/:farmerId/payment` ✅ used
- `GET /vyapar/credit-ledger/:farmerId/history` — payment history

### 2.6 Ecosystem / Discovery (`/vyapar/ecosystem`)
- `GET /vyapar/vendors` — vendor directory
- `GET /vyapar/vendors/:id` — vendor detail
- `POST /vyapar/vendors/:id/rate` — rate a vendor
- `GET /vyapar/market-prices` — live input prices

---

## 3. What Needs to Be Built (Complete Development Plan)

---

### PHASE 1 — Core App Completion (High Priority)

#### 3.1 Authentication Improvements

**File:** `app/login.tsx`

**Missing Features:**
- [ ] **OTP-based Registration** — New vendors can't register. Need a full registration flow:
  - Step 1: Mobile number → send OTP (`POST /auth/send-otp`)
  - Step 2: Verify OTP (`POST /auth/verify-otp`)
  - Step 3: Set MPIN (`POST /auth/set-mpin`)
  - Step 4: Complete vendor profile (name, shop, type)
- [ ] **Forgot MPIN** — `POST /auth/forgot-mpin` flow
- [ ] **Biometric unlock** — `expo-local-authentication` for fingerprint/face
- [ ] **Token auto-refresh** — On 401, call `POST /auth/refresh-token` and retry
- [ ] **Vendor profile check** — After login, verify the user has `VENDOR` role; redirect non-vendors

**New file:** `app/register.tsx` — Full registration wizard (4 steps)
**New file:** `app/forgot-mpin.tsx` — MPIN reset via OTP

---

#### 3.2 Home Dashboard Enhancements

**File:** `app/(tabs)/index.tsx`

**Missing Features:**
- [ ] **Real-time stock alerts** — Show products with low/out-of-stock status
- [ ] **Pending credit reminders** — Count of overdue credit entries
- [ ] **Recent transactions list** — Last 5 transactions inline on home
- [ ] **Monthly trend chart** — Revenue trend (last 6 months) using `react-native-chart-kit` or Victory Native
- [ ] **Pull-to-refresh** works but needs loading skeleton UI
- [ ] **Vendor profile banner** — Show shop name, vendor type, KYC status badge
- [ ] **Offline indicator** — Banner when no network detected

---

#### 3.3 Record Sale — Multi-Item Cart

**File:** `app/(tabs)/record-sale.tsx`

**Current:** Only supports 1 item per sale.

**Missing Features:**
- [ ] **Cart system** — Add multiple items before checkout
  - Cart state with `item + quantity + price`
  - `+` / `-` buttons per item
  - Cart total at bottom
- [ ] **Farmer search** — Search farmer by name/mobile instead of just typing mobile
  - `GET /vyapar/farmer/my-farmers?search=...`
- [ ] **Receipt upload** — Camera capture + upload to `POST /vyapar/transactions/:id/evidence`
- [ ] **Season auto-detect** — Auto-select kharif/rabi based on current month
- [ ] **Transaction success screen** — Full receipt view after recording (not just reset)
- [ ] **Cancel/edit** — Allow cancelling a recent transaction
- [ ] **Loan-linked sale** — Flag if sale is linked to a farmer's active loan (`loan_application_id`)

---

#### 3.4 Farmers Tab — Full Farmer Profiles

**File:** `app/(tabs)/farmers.tsx`

**Current:** Shows a computed list from transactions + credit only.

**Missing Features:**
- [ ] **Dedicated API call** — Use `GET /vyapar/farmer/my-farmers` (proper paginated API)
- [ ] **Farmer detail screen** — Tap a farmer → full profile modal/screen
- [ ] **Search & filter** — Search by name, filter by credit status
- [ ] **Purchase history** — `GET /vyapar/farmer/:farmerId/history`
- [ ] **Credit status card** — Outstanding balance, due date, overdue badge
- [ ] **Quick actions** — Buttons: "Record Sale", "Give Credit", "View History"
- [ ] **Farmer GPS location** — Show village/district info from farmer profile
- [ ] **Sort options** — Sort by: most purchases, highest outstanding, last activity

**New file:** `app/farmer-detail.tsx` — Full farmer profile screen

---

#### 3.5 Catalog — Enhanced Inventory

**File:** `app/(tabs)/catalog.tsx`

**Missing Features:**
- [ ] **Category filter** — Filter by: Fertilizer, Pesticide, Seed, Equipment
- [ ] **Search** — Search products by name
- [ ] **Bulk stock update** — `PUT /vyapar/inventory/:id`
- [ ] **Low stock alert** — Red badge on items below `reorder_level`
- [ ] **Edit product** — Modal to edit price/MRP of existing item
- [ ] **Delete product** — Swipe-to-delete with confirmation
- [ ] **Price history** — When did price last change
- [ ] **Input item linkage** — Show if product is linked to an `input_item_id` (PoP system item)
- [ ] **Barcode scan** — Camera scan for quick product lookup (future)

---

#### 3.6 Credit Ledger — Full Payment Management

**File:** `app/(tabs)/credit.tsx`

**Missing Features:**
- [ ] **Payment history** — `GET /vyapar/credit-ledger/:farmerId/history`
- [ ] **Partial payment** — Allow partial amount (currently defaults to full balance)
- [ ] **Overdue filter** — Show only overdue entries
- [ ] **Send reminder** — SMS reminder to farmer (via backend notification)
- [ ] **Due date management** — Set/edit due date for credit entries
- [ ] **Credit limit enforcement** — Show if farmer is over their credit limit
- [ ] **Export** — Download credit ledger as CSV/PDF

---

### PHASE 2 — New Screens (Medium Priority)

#### 3.7 Vendor Profile Screen

**New file:** `app/profile.tsx`

- View/edit vendor profile (`GET/PUT /vyapar/profile`)
- Shop details: name, address, GPS location
- Business info: type, PAN, GST number
- KYC status display (`GET /vyapar/profile/kyc`)
- Service areas: which districts/blocks served
- Vendor code display (for sharing with farmers)
- Profile photo upload
- Change MPIN button → `POST /auth/change-mpin`
- Logout confirmation

---

#### 3.8 Transaction History Screen

**New file:** `app/transactions.tsx`

- Full transaction list with pagination (`GET /vyapar/transactions`)
- Filters: date range, transaction type (cash/credit), farmer
- Search by farmer name/mobile
- Each entry: farmer, items, amount, type badge, date
- Tap → transaction detail with items list + receipt photo
- Cancel transaction button (if within 24h)
- Monthly summary at top

---

#### 3.9 Analytics & Reports Screen

**New file:** `app/analytics.tsx`

- **Revenue chart** — Monthly revenue (6-month trend)
- **Top farmers** — Highest value customers
- **Top products** — Best-selling items from catalog
- **Credit health** — Total outstanding vs collected (pie chart)
- **Seasonal analysis** — Kharif vs Rabi vs Zaid sales breakdown
- Data from: `GET /vyapar/analytics`

---

#### 3.10 Notifications Screen

**New file:** `app/notifications.tsx`

- Credit overdue alerts
- Stock low alerts
- Payment received confirmations
- New farmer linked to vendor
- System notifications from platform

---

#### 3.11 Market Prices Screen

**New file:** `app/market-prices.tsx`

- Live input prices from mandi (PULSE module integration)
- `GET /vyapar/market-prices`
- Compare vendor prices vs mandi prices
- Price trend for key inputs (DAP, Urea, Seeds)
- Helps vendor price products competitively

---

### PHASE 3 — VYAPAR-ROOTS Integration (Important for Platform)

As described in `ROOTS-ERP-SYSTEM-DESIGN-AND-PROMPTS.md` Phase 3.4, the vendor app needs to participate in the **VYAPAR-ROOTS Bridge**:

#### 3.12 Purchase-to-ROOTS Auto-Linking

When a vendor records a sale to a farmer:
- The backend `vyaparRootsBridgeService` auto-maps the purchase to the farmer's active crop/dairy/fishery cost entries
- The vendor app should show:
  - [ ] **Linked to farm badge** — "This sale was linked to Ramesh's Paddy crop"
  - [ ] **ROOTS-aware product categories** — Product category selector should map to ROOTS categories (Fertilizer → fertilizer, Pesticide → pesticide, etc.)
  - [ ] **Farmer's active crop info** — When selecting a farmer in Record Sale, show their active crop/activity name

**Impact:** The `vendor_transaction_items` table has a `source` field. When creating transactions, the vendor app should pass the correct product `category` that maps to the ROOTS bridge.

---

### PHASE 4 — Offline Support

From ARCHITECTURE.md: The farmer app has an "Offline-First" edge sync engine. The vendor app needs similar support since vendors operate in rural areas.

The backend already has `vendor_offline_queue` table and `offlineQueueService.js`.

#### 3.13 Offline Queue Implementation

- [ ] **Detect network** — Use `@react-native-community/netinfo`
- [ ] **Queue actions** — When offline, queue: `record-sale`, `give-credit`, `update-stock`
- [ ] **Offline indicator** — Red banner at top when offline
- [ ] **Sync on reconnect** — Auto-sync queue when connectivity restored
- [ ] **Conflict resolution** — Handle sync errors gracefully
- [ ] **Local storage** — Use `expo-sqlite` or AsyncStorage for offline queue

---

### PHASE 5 — Advanced Features

#### 3.14 KYC & Onboarding

The backend has `vendor_kyc` table with full KYC workflow.

- [ ] **KYC status screen** — Show pending/verified/rejected status
- [ ] **Document upload** — GST certificate, shop photo, bank details
- [ ] **Shop location** — GPS capture for shop location
- [ ] **Bank account** — Add bank account for commission payouts

#### 3.15 Commission Tracking

The backend has `vendor_commissions` table.

- [ ] **Commission screen** — Show earned commissions per transaction
- [ ] **Commission summary** — Monthly commission total
- [ ] **Payout history** — When commissions were paid

#### 3.16 Ratings & Feedback

Backend has `vendor_ratings` table.

- [ ] **My ratings** — Show average rating + reviews from farmers
- [ ] **Respond to reviews** — Vendor response to farmer review

#### 3.17 Vendor Discovery (Ecosystem)

- [ ] **Nearby vendors** — `GET /vyapar/vendors` with location filter
- [ ] **Vendor detail** — View another vendor's profile/products
- [ ] **Rate vendors** — `POST /vyapar/vendors/:id/rate`

---

## 4. Technical Debt & Fixes

### 4.1 Dependency Issues (Fixed ✅)
- [x] Missing `react-native-screens` — installed
- [x] Missing `react-native-safe-area-context` — installed
- [x] Missing `expo-font` — installed
- [x] Version mismatch `expo@54.0.33` → `~54.0.34` — fixed
- [x] Version mismatch `expo-linking@8.0.11` → `~8.0.12` — fixed

### 4.2 Still Needed
- [ ] **Add `app.json` extra fields** for environment-specific API URLs (staging/prod)
- [ ] **Token refresh logic** in `lib/api.ts` — On 401, auto-refresh token and retry
- [ ] **Error boundary** — Wrap screens in error boundary for graceful crash recovery
- [ ] **Loading states** — Skeleton loaders instead of blank screens
- [ ] **TypeScript strict** — Define proper types for API responses (not `any`)
- [ ] **Environment config** — `APP_ENV=development|staging|production` flag
- [ ] **App icon & splash screen** — Add proper vendor-branded icon and splash
- [ ] **Duplicate `expo` in root `package.json`** — Root has `expo: ^55.0.15` but vendor-app uses `~54.0.34`

### 4.3 Missing Libraries to Add
```json
{
  "react-native-chart-kit": "^6.12.0",
  "@react-native-community/netinfo": "^11.3.1",
  "expo-camera": "~16.0.18",
  "expo-location": "~18.0.10",
  "expo-image-picker": "~16.0.6"
}
```

---

## 5. Screen Navigation Map (Complete)

```
/                          (index.tsx — auth guard)
├── /login                 (login.tsx) ✅
├── /register              (register.tsx) 🔲 NEW
├── /forgot-mpin           (forgot-mpin.tsx) 🔲 NEW
└── /(tabs)/
    ├── index              (Home Dashboard) ✅ — enhance
    ├── record-sale        (Record Sale) ✅ — enhance
    ├── farmers            (My Farmers) ✅ — enhance
    ├── catalog            (Catalog) ✅ — enhance
    └── credit             (Credit Ledger) ✅ — enhance

/add-farmer                (add-farmer.tsx) ✅
/give-credit               (give-credit.tsx) ✅
/farmer-detail             (farmer-detail.tsx) 🔲 NEW
/transactions              (transactions.tsx) 🔲 NEW
/analytics                 (analytics.tsx) 🔲 NEW
/market-prices             (market-prices.tsx) 🔲 NEW
/notifications             (notifications.tsx) 🔲 NEW
/profile                   (profile.tsx) 🔲 NEW
```

---

## 6. Backend API — Endpoints Not Yet Used in App

These VYAPAR backend endpoints exist but are NOT yet connected to the vendor app:

| Endpoint | Purpose | Priority |
|----------|---------|----------|
| `GET /vyapar/profile` | Vendor own profile | High |
| `PUT /vyapar/profile` | Update profile | High |
| `GET /vyapar/analytics` | Analytics data | Medium |
| `GET /vyapar/farmer/my-farmers` | Proper farmer list | High |
| `GET /vyapar/farmer/:id/history` | Farmer purchase history | High |
| `GET /vyapar/farmer/:id/credit-status` | Credit info | Medium |
| `GET /vyapar/transactions/:id` | Transaction detail | Medium |
| `PUT /vyapar/transactions/:id/cancel` | Cancel transaction | Medium |
| `POST /vyapar/transactions/:id/evidence` | Upload receipt | Medium |
| `GET /vyapar/credit-ledger/:id/history` | Payment history | Medium |
| `GET /vyapar/inventory` | Inventory levels | Medium |
| `DELETE /vyapar/catalog/:id` | Remove product | Low |
| `GET /vyapar/service-areas` | Coverage areas | Low |
| `GET /vyapar/market-prices` | Input market prices | Low |
| `GET /vyapar/vendors` | Vendor directory | Low |
| `POST /auth/send-otp` | Registration OTP | High |
| `POST /auth/verify-otp` | Verify OTP | High |
| `POST /auth/set-mpin` | Set MPIN | High |
| `POST /auth/forgot-mpin` | Reset MPIN | Medium |
| `POST /auth/change-mpin` | Change MPIN | Medium |
| `POST /auth/refresh-token` | Token refresh | High |

---

## 7. Data Models the App Reads/Writes

### 7.1 Current (Already Used)
- `vendor_profiles` — vendor identity
- `vendor_product_catalogs` — product listing
- `vendor_transactions` — sales records
- `vendor_transaction_items` — line items per sale
- `vendor_credit_ledger` — farmer credit balances
- `vendor_farmer_links` — vendor-farmer relationships
- `vendor_performance` — KPI aggregates

### 7.2 Planned (To Be Connected)
- `vendor_inventory` — per-product stock tracking
- `vendor_kyc` — KYC status and documents
- `vendor_ratings` — farmer-given ratings
- `vendor_commissions` — commission tracking
- `vendor_service_areas` — geographic coverage
- `vendor_offline_queue` — offline operation queue
- `vendor_sentinel_feed` — risk alerts from SENTINEL
- `vendor_trust_feed` — trust score deltas from TRUST
- `vendor_purchase_behavior_score` — vendor credit scoring

---

## 8. ROOTS Integration Requirements

As per `ROOTS-ERP-SYSTEM-DESIGN-AND-PROMPTS.md` (Phase 3.4 — VYAPAR-ROOTS Bridge):

### What the Vendor App Must Do
1. **Tag product categories** when recording a sale. The `vendor_transaction_items` need the correct `category` field to enable auto-mapping:

   | Vendor product category | Maps to ROOTS |
   |------------------------|---------------|
   | FERTILIZER | Task input log (fertilizer) |
   | PESTICIDE / INSECTICIDE / FUNGICIDE | Task input log (pesticide) |
   | SEED | Task input log (seed) |
   | ANIMAL_FEED | Dairy cost event (feed) |
   | VETERINARY | Dairy/Goatery treatment event |
   | MACHINERY_HIRE | Machinery log |

2. **Show linked status** — After sale, show if the purchase was auto-linked to a farmer's crop/dairy activity

3. **Unlink option** — If farmer disputes auto-link, `POST /roots/vyapar-link/unlink`

4. **Suggested links** — For unmapped items, `GET /roots/vyapar-link/suggestions?transactionId=X`

---

## 9. Development Priority Order

```
SPRINT 1 — Fix & Foundation
  ✅ Fix missing dependencies (done)
  🔲 Token refresh in api.ts
  🔲 Registration flow (app/register.tsx)
  🔲 Proper farmer list (GET /vyapar/farmer/my-farmers)
  🔲 Farmer detail screen

SPRINT 2 — Core Flow Polish
  🔲 Multi-item cart in record-sale
  🔲 Transaction history screen
  🔲 Vendor profile screen
  🔲 Catalog: edit + delete + search

SPRINT 3 — Credit & Analytics
  🔲 Credit ledger: payment history + due dates
  🔲 Analytics screen with charts
  🔲 Notifications screen

SPRINT 4 — Integration
  🔲 ROOTS category tagging in sales
  🔲 Receipt photo upload
  🔲 Market prices screen
  🔲 Offline queue basic implementation

SPRINT 5 — Advanced
  🔲 KYC flow
  🔲 Commission tracking
  🔲 Biometric auth
  🔲 Full offline support
  🔲 App icon + splash screen
```

---

## 10. App Configuration Needed

### `app.json` Updates Required
```json
{
  "expo": {
    "name": "FarmerPay Vendor",
    "slug": "farmerpay-vendor",
    "version": "1.0.0",
    "scheme": "farmerpay-vendor",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "backgroundColor": "#d97706"
    },
    "plugins": [
      "expo-router",
      "expo-font",
      ["expo-camera", { "cameraPermission": "Allow FarmerPay Vendor to access your camera for receipts." }],
      ["expo-location", { "locationAlwaysAndWhenInUsePermission": "Allow FarmerPay Vendor to access location for shop GPS." }]
    ],
    "extra": {
      "apiBaseUrl": "http://10.0.2.2:3000/api/v1",
      "apiBaseUrlStaging": "https://api-staging.farmerpay.in/api/v1",
      "apiBaseUrlProd": "https://api.farmerpay.in/api/v1"
    },
    "android": {
      "package": "com.farmerpay.vendor",
      "permissions": ["CAMERA", "ACCESS_FINE_LOCATION", "INTERNET"]
    },
    "ios": {
      "bundleIdentifier": "com.farmerpay.vendor",
      "infoPlist": {
        "NSCameraUsageDescription": "Required for receipt capture",
        "NSLocationWhenInUseUsageDescription": "Required for shop GPS"
      }
    }
  }
}
```

---

## 11. Auth Flow (Complete)

```
New Vendor:
  /register → send-otp → verify-otp → set-mpin → complete-profile → /(tabs)

Returning Vendor:
  /login → mobile + MPIN → /(tabs)

Forgot MPIN:
  /forgot-mpin → send-otp → verify-otp → set-new-mpin → /login

Session expired:
  Any screen → 401 → auto-refresh-token → retry
  Refresh expired → clear storage → /login

Biometric (future):
  App open → face/fingerprint → /(tabs) (if token still valid)
```

---

## 12. Key Design Patterns to Follow

1. **Auth:** 4-digit MPIN only — no passwords (platform-wide rule)
2. **API:** All calls via `lib/api.ts` helpers — never raw fetch
3. **Token storage:** `AsyncStorage` with keys `vendor_token`, `vendor_user`
4. **Colors:** Primary `#d97706` (amber), background `#fffbeb`, success `#16a34a`
5. **Navigation:** Expo Router file-based routing — no React Navigation manually
6. **Forms:** No external form library — use `useState` + `TextInput`
7. **Offline:** Queue in AsyncStorage, sync on reconnect
8. **Language:** English-only for now (Bhashini multi-language planned for future)
9. **Role guard:** After login, verify `user.role === 'VENDOR'` before entering tabs
