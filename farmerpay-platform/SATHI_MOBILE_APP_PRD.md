# Sathi Mobile App — Product Requirements Document

**Version:** 1.1  
**Platform:** React Native (Expo 54) — Android + iOS  
**Audience:** Sathi field agents (Business Correspondents, FPO Agents, Bank Mitras, etc.)  
**Language:** Hindi primary, English secondary (toggle on all screens)  
**Auth Pattern:** Phone + OTP → 4-digit MPIN (same as farmer app, no passwords)

---

## Compliance Boundaries — DPDP Act & RBI AA Framework

> **These rules are non-negotiable and must be enforced at every layer (UI, API, backend).**

### What Sathi CANNOT see or do

| Prohibited | Reason |
|-----------|--------|
| Farmer's bank statement data (transactions, balances, income breakdown) | DPDP Act §4 — personal financial data requires explicit consent from the data principal (farmer) to a licensed FIU, not an intermediary |
| AA consent initiation on behalf of farmer | RBI AA Master Direction 2021 — only the farmer (data principal) can initiate consent via their own AA app; Sathi is not an FIU |
| AA Financial Health Score (0–100) or its components | Derived from bank statements — same prohibition as above |
| Numeric TRUST score (e.g., "72 / 100") | TRUST score is a credit proxy; sharing with intermediaries violates RBI Fair Practices Code |
| Full Aadhaar number | Aadhaar Act §29 — only last 4 digits may be displayed |
| Full PAN, bank account number | Masked display only; no tap-to-reveal for intermediaries |

### What Sathi CAN see

| Permitted | Reason |
|----------|--------|
| TRUST Band label only (Strong / Building / Low) | Aggregated label, not raw score — analogous to a credit tier label, permissible for field use |
| Loan Readiness State (Ready / Almost Ready / Not Ready / Needs Data) | Operational field guidance, not financial data |
| Coaching Priority (High / Medium / Low) — feature-flag gated | Derived workflow signal, not PII |
| Gap Areas (field name + status label, no scores) | Operational checklist item, not financial data |
| Farmer's own consent status (has farmer given ROOTS/location/photo consent) | Sathi collected these consents themselves |

### Submit Toast Rule
Every task completion toast must say **"जानकारी सहेजी गई"** or **"डेटा सफलतापूर्वक जमा हुआ"**.  
**Never:** "Score updated", "Score improved by X", "Creditworthiness changed". This is enforced in SENTINEL privacy mode.

---

## Screen Inventory

| # | Screen | Route | Access |
|---|--------|-------|--------|
| S1 | Splash | `/splash` | Public |
| S2 | Phone Login | `/login` | Public |
| S3 | OTP Verify | `/otp` | Public |
| S4 | MPIN Setup | `/mpin-setup` | New Sathi only |
| S5 | MPIN Login | `/mpin` | Returning Sathi |
| S6 | Profile Onboarding | `/onboard/profile` | New Sathi only |
| S7 | KYC Document Upload | `/onboard/kyc` | New Sathi only |
| S8 | Onboarding Success | `/onboard/success` | New Sathi only |
| S9 | Home Dashboard | `/(tabs)/home` | Auth |
| S10 | Schedule / Visits | `/(tabs)/schedule` | Auth |
| S11 | Sathi Profile | `/(tabs)/profile` | Auth |
| S12 | My Farmers List | `/farmers` | Auth |
| S13 | Farmer Detail | `/farmers/[farmerId]` | Auth |
| S14 | Add Farmer — Step 1 (Personal) | `/add-farmer/personal` | Auth |
| S15 | Add Farmer — Step 2 (Farm) | `/add-farmer/farm` | Auth |
| S16 | Add Farmer — Step 3 (Crops) | `/add-farmer/crops` | Auth |
| S17 | Add Farmer — Step 4 (Documents) | `/add-farmer/documents` | Auth |
| S18 | Add Farmer — Step 5 (Consent) | `/add-farmer/consent` | Auth |
| S19 | Add Farmer — Success | `/add-farmer/success` | Auth |
| S20 | Task Detail / Visit | `/tasks/[taskId]` | Auth |
| S21 | Start Visit (GPS) | `/tasks/[taskId]/start` | Auth |
| S22 | Visit Checklist | `/tasks/[taskId]/checklist` | Auth |
| S23 | Upload Evidence | `/tasks/[taskId]/evidence` | Auth |
| S24 | Complete Visit | `/tasks/[taskId]/complete` | Auth |
| S25 | Assist Loan Discovery | `/assist/loan/[farmerId]` | Auth |
| S26 | Assist ROOTS Entry | `/assist/roots/[farmerId]` | Auth |
| S27 | Assist KYC | `/assist/kyc/[farmerId]` | Auth |
| S28 | Commissions | `/commissions` | Auth |
| S29 | Incentive Progress | `/incentives` | Auth |
| S30 | Issues List | `/issues` | Auth |
| S31 | Raise Issue | `/issues/new` | Auth |
| S32 | Nudges | `/nudges` | Auth |
| S33 | Schedule Nudge | `/nudges/new` | Auth |
| S34 | Notifications | `/notifications` | Auth |
| S35 | Offline Queue Status | `/sync-status` | Auth |
| S36 | ROOTS Field Verification | `/roots-verify/[taskId]` | Auth |

---

## Navigation Structure

```
Bottom Tab Bar (3 tabs):
  [Home]       → S9  Home Dashboard
  [Schedule]   → S10 Today's Visits / Calendar
  [Profile]    → S11 Sathi Profile

Global Header (all auth screens):
  - Language Toggle (HI / EN)
  - Notification Bell (badge count)
  - Offline Indicator dot (red = offline, green = synced)
```

---

---

# ONBOARDING FLOW

---

## S1 — Splash Screen

**Route:** `/splash`

### Layout
- Full screen: FarmerPay brand gradient (purple → deep purple)
- Center: FarmerPay logo + wordmark
- Below logo: "Sathi by FarmerPay" subtitle
- Bottom: Version number

### Behaviour
- Auto-navigates after 2s:
  - If JWT token valid → S9 Home
  - If MPIN set but JWT expired → S5 MPIN Login
  - If no session → S2 Phone Login

### API
- None (reads AsyncStorage for token)

---

## S2 — Phone Login

**Route:** `/login`

### Layout
```
[FarmerPay Logo]
[Title] "Sathi Login"
[Subtitle] "अपना मोबाइल नंबर दर्ज करें"

[Phone Input]
  - +91 prefix (fixed)
  - 10-digit number field
  - Numeric keyboard

[CTA Button] "OTP भेजें" (Send OTP)

[Footer] "क्या आप किसान हैं? किसान ऐप डाउनलोड करें"
```

### Validation
- 10 digits exactly
- No letters/special chars
- Button disabled until valid

### Empty / Error States
- Invalid number → inline error: "सही मोबाइल नंबर दर्ज करें"
- Network error → toast: "नेटवर्क समस्या, पुनः प्रयास करें"
- Unregistered number → error: "यह नंबर Sathi के रूप में पंजीकृत नहीं है। बैंक से संपर्क करें।"

### API
```
POST /api/v1/auth/otp/send
Body: { mobile: "9876543210", role: "AGENT" }
Response: { otpSent: true, expiresIn: 300 }
```

---

## S3 — OTP Verification

**Route:** `/otp`

### Layout
```
[Back Arrow]
[Title] "OTP दर्ज करें"
[Subtitle] "+91 98765 43210 पर OTP भेजा गया"

[6-box OTP Input] (auto-focus, auto-advance)

[Resend Timer] "60 सेकंड में पुनः भेजें" → becomes "पुनः भेजें" link after 60s

[CTA Button] "सत्यापित करें" (Verify)
```

### Behaviour
- Auto-submits when all 6 digits entered
- On success:
  - New Sathi (no MPIN) → S4 MPIN Setup
  - MPIN exists, first login → S5 MPIN Login
  - Returning session → S9 Home

### Error States
- Wrong OTP → "गलत OTP, पुनः प्रयास करें" + shake animation
- Expired OTP → "OTP समय सीमा समाप्त, पुनः भेजें"
- Max retries (3) → 30-min lockout screen

### API
```
POST /api/v1/auth/otp/verify
Body: { mobile, otp, role: "AGENT" }
Response: { verified: true, isNewUser: boolean, tempToken: string }
```

---

## S4 — MPIN Setup

**Route:** `/mpin-setup`  
**Shown:** New Sathi only (first login after OTP)

### Layout
```
[Title] "अपना 4-अंकीय MPIN बनाएं"
[Subtitle] "यह आपका सुरक्षित लॉगिन PIN है"

[Step 1] "MPIN दर्ज करें"
  [4-dot PIN pad] (obscured circles)
  [Numeric keypad]

[Step 2 — after Step 1] "MPIN की पुष्टि करें"
  [4-dot PIN pad]

[Note] "⚠ अपना MPIN किसी के साथ साझा न करें"
```

### Error States
- Mismatch → "MPIN मेल नहीं खाता, पुनः प्रयास करें"
- Sequential digits (1234, 4321) → "सरल MPIN उपयोग न करें"
- Same digit (1111) → "सरल MPIN उपयोग न करें"

### On Success → S6 Profile Onboarding

### API
```
POST /api/v1/auth/mpin/set
Headers: { Authorization: Bearer <tempToken> }
Body: { mpin: "****" }
Response: { mpinSet: true }
```

---

## S5 — MPIN Login

**Route:** `/mpin`

### Layout
```
[Avatar/Initials circle]
[Name] "नमस्ते, Shivam"
[Subtitle] "अपना MPIN दर्ज करें"

[4-dot PIN pad]
[Numeric keypad]

[Link] "MPIN भूल गए?" → OTP flow
[Link] "दूसरे अकाउंट से लॉगिन करें"
```

### Biometric (if enabled)
- Fingerprint/Face ID prompt on screen open
- Falls back to MPIN on biometric fail

### Error States
- Wrong MPIN → "गलत MPIN" + remaining attempts shown
- 5 wrong attempts → 30-min lockout: "बहुत सारी गलत कोशिशें। 30 मिनट बाद प्रयास करें"

### API
```
POST /api/v1/auth/mpin/verify
Body: { mobile, mpin }
Response: { token: JWT, sathiProfile: {...} }
```

---

## S6 — Profile Onboarding

**Route:** `/onboard/profile`  
**Shown:** New Sathi only

### Layout
```
[Progress Bar] Step 1 of 3

[Title] "अपनी प्रोफ़ाइल बनाएं"

[Photo Upload] Circle avatar + "फ़ोटो अपलोड करें"

[Full Name*] Text input
[Mobile] Pre-filled, read-only
[Date of Birth*] Date picker
[Gender*] Radio: पुरुष / महिला / अन्य

[Sathi Type*] Dropdown:
  - Business Correspondent
  - Bank Mitra / Bank Sakhi
  - FPO Agent / FPO Secretary
  - Agri Entrepreneur
  - Input Seller
  - Insurance Sakhi
  - PACS Secretary
  - Commission Agent (Adathiya)

[Services Offered*] Multi-select chips:
  - ऋण सहायता (Loan Assist)
  - बीमा (Insurance)
  - डेटा एंट्री (Data Entry)
  - नज (Nudges/Reminders)

[Experience] "कितने वर्षों का अनुभव है?" — Number stepper
[Languages] Multi-select chips: Hindi, English, Marathi, Telugu, Tamil, Kannada, Bengali, Gujarati, Odia, Punjabi
[Service Radius] Slider: 5–50 km (default 10 km)

[Village / Block / District / State*]
  - LGD cascade dropdowns (State → District → Block → Village)

[Bio] Textarea (optional), max 200 chars

[CTA] "अगला — दस्तावेज़" →  S7
```

### Validation
- All * fields required
- Name: min 2, max 100 chars
- DOB: must be 18+

### API (save on Next)
```
POST /api/v1/sathi/profile/create
Body: { name, dob, gender, type, servicesOffered[], languages[], serviceRadiusKm, villageId, blockId, districtId, stateId, bio, yearsOfExperience }

GET /api/v1/location/states
GET /api/v1/location/districts?stateId=
GET /api/v1/location/blocks?districtId=
GET /api/v1/location/villages?blockId=
```

---

## S7 — KYC Document Upload

**Route:** `/onboard/kyc`  
**Shown:** New Sathi only

### Layout
```
[Progress Bar] Step 2 of 3

[Title] "KYC दस्तावेज़ अपलोड करें"
[Subtitle] "सत्यापन के लिए आवश्यक"

[Aadhaar Card*]
  [Upload Box] Camera icon + "अपलोड करें"
  [Aadhaar Number*] 12-digit masked input (XXXX-XXXX-XXXX)
  [Status] Pending / Uploaded / Verified

[PAN Card*]
  [Upload Box]
  [PAN Number*] AAAAA9999A format

[Bank Account (Commission Payout)*]
  [Account Number*]
  [IFSC Code*]
  [Bank Name] Auto-fetched from IFSC

[CTA] "जमा करें" → S8
[Note] "🔒 आपके दस्तावेज़ सुरक्षित रखे जाते हैं"
```

### Document Upload States
- Default: Upload box (dashed border, camera icon)
- Uploading: Spinner + "अपलोड हो रहा है..."
- Uploaded: Thumbnail + green tick + "पुनः अपलोड"
- Error: Red border + "अपलोड विफल, पुनः प्रयास करें"

### API
```
POST /api/v1/auth/documents/upload (multipart)
Body: { documentType: "aadhaar_front", file }
Response: { documentId, url }

POST /api/v1/sathi/kyc/submit
Body: { aadhaarNumber, panNumber, bankAccountNumber, ifscCode, documentIds[] }
```

---

## S8 — Onboarding Success

**Route:** `/onboard/success`

### Layout
```
[Success Animation] Checkmark lottie

[Title] "प्रोफ़ाइल जमा हो गई!"
[Body] "आपकी KYC समीक्षा में है। बैंक अधिकारी 24–48 घंटों में सत्यापित करेंगे।
       अभी आप अपने डैशबोर्ड का उपयोग शुरू कर सकते हैं।"

[Status Card]
  - KYC Status: समीक्षा में (Review) — amber badge
  - Sathi ID: FP-SATHI-XXXXX

[CTA] "डैशबोर्ड पर जाएं" → S9
```

### API
- None (data from previous calls)

---
---

# MAIN APP — TAB 1: HOME DASHBOARD

---

## S9 — Home Dashboard

**Route:** `/(tabs)/home`

### Layout (scroll view, top → bottom)

#### 1. Hero Banner
```
[Full-width card with background photo — farming landscape]
[Top-left] FarmerPay logo + "FarmerPay"
[Top-right] Language toggle button (अ/A)
[Bottom-left]
  "Good Morning," / "शुभ प्रभात,"     ← time-based: Morning/Afternoon/Evening
  "[Sathi Name]" in gold/amber bold
  "आज के किसान विज़िट और ऋण कार्य देखें"
```

Time-based greeting logic:
- 05:00–11:59 → Good Morning / शुभ प्रभात
- 12:00–16:59 → Good Afternoon / शुभ दोपहर
- 17:00–20:59 → Good Evening / शुभ संध्या
- 21:00–04:59 → Good Night / शुभ रात्रि

#### 2. Earnings KPI Strip (3 cards, horizontal scroll)
```
Card 1: [Wallet icon]
  "Today's Earnings" / "आज की कमाई"
  ₹450 (amber, bold)

Card 2: [Calendar icon]
  "This Month" / "इस महीने"
  ₹8,250 (purple, bold)

Card 3: [Gift icon]
  "Pending Incentives" / "लंबित प्रोत्साहन"
  ₹1,200 (amber, bold)
```

**Data source:** `GET /api/v1/sathi/dashboard/overview`

**Empty state:** ₹0 for all (new Sathi with no commissions)

#### 3. My Farmers Card
```
[Row] "My Farmers" + ">" arrow (→ S12)
[3-column stats]
  124          18              7
Total Farmers  New This Month  Need Follow-up
```

**Data source:** `GET /api/v1/sathi/dashboard/overview`
- `totalFarmers`
- `newFarmersThisMonth`
- `needFollowUp` (farmers with `coaching_priority = high`)

**Empty state:**
```
[Farmer icon, grey]
"अभी कोई किसान नहीं जोड़ा"
[Button] "+ पहला किसान जोड़ें" → S14
```

#### 4. Today's Visits (from Schedule tab preview)
```
[Header] "आज की विज़िट" + "सभी देखें >" (→ S10)

[Visit card] per task due today:
  [Purple avatar] Farmer Name
  [Location] Village, District
  [Task type chip] Mid-cycle Monitoring | Farm Cycle Initiation
  [Commission] ₹50/Lakh (amber)
  [Status chips] Due Today | Routes Updated
  [Buttons] [Start Visit] [Call Farmer] [Upload Data]
```

Max 2 cards shown; "सभी देखें" reveals rest.

**Empty state:**
```
[Calendar icon, grey]
"आज कोई विज़िट निर्धारित नहीं है"
```

#### 5. Action Required Card
```
[Header row] ⚠ "Action Required" + ">" (→ full action list)

[Row item] [Farmer icon] "Farm Creation Pending"     [badge] 3
[Row item] [Clock icon]  "Mid-cycle Monitoring"       [badge] 2
[Row item] [Doc icon]    "Document Upload Pending"    [badge] 1  (if any)
[Row item] [Shield icon] "KYC Pending"                [badge] N  (if any)
```

Items sorted by urgency. Max 4 shown.

**Empty state:**
```
[Green checkmark]
"कोई लंबित कार्य नहीं!"
"सब कुछ अप-टू-डेट है"
```

**Data source:** `GET /api/v1/sathi/agent/:agentId/tasks?status=assigned&priority=urgent,high`

#### 6. Loan Pipeline Strip
```
[Header] "Loan Pipeline"

[Horizontal chip row — scrollable]
  [Initiated 5]    — grey chip
  [Verification 2] — amber chip
  [Disbursed 9]    — green chip
  [Active 14]      — purple chip
```

Tap on chip → navigates to filtered farmer list.

**Data source:** `GET /api/v1/sathi/dashboard/loans`

#### 7. Products Summary (2-column card)
```
[Card — white]
[Left column] Loans Facilitated
  Sanctioned:  9
  Disbursed:   7
  Repaid:      3

[Right column] Insurance
  Total Policies: 14
  PMFBY:          8
  Livestock:      4
  Health:         2
```

**Data source:** `GET /api/v1/sathi/dashboard/loans` + `GET /api/v1/sathi/dashboard/insurance`

**Empty state:** All counts show 0 with "अभी शुरू करें" chip.

#### 8. Growth Trend Chart
```
[Card]
[Title] "6-माह का ट्रेंड"

[Line chart — dual axis]
  X-axis: Last 6 months (Nov, Dec, Jan, Feb, Mar, Apr)
  Left Y-axis: Beneficiaries count (purple line)
  Right Y-axis: Commissions ₹ (amber line)
  Tooltip on tap: month, beneficiaries, ₹ commission
```

**Empty state (< 2 months data):** "डेटा उपलब्ध होने पर ट्रेंड दिखेगा"

#### 9. Services Breakdown Pie Chart
```
[Card]
[Title] "सेवाएं"

[Pie chart — 4 segments]
  Loan Assist    — purple
  Insurance      — green
  Data Entry     — amber
  Nudges         — blue

[Legend below chart]
  Each segment: label + % + count
```

**Empty state:** "किसानों की सहायता करने के बाद यहाँ दिखेगा"

**Data source:** `GET /api/v1/sathi/dashboard/overview` → `serviceBreakdown`

#### 10. Incentive Progress Banner
```
[Card — purple gradient]
"इस तिमाही में [X] किसान सक्रिय"
[Progress bar] X / 100
"₹[bonus] का बोनस अनलॉक करें — [N] और किसान चाहिए"
[Button] "विवरण देखें" → S29
```

**Data source:** `GET /api/v1/sathi/incentives` → current quarter milestone progress

**Empty state (no farmers yet):**
```
"100 किसानों का लक्ष्य पूरा करें और अतिरिक्त 10% कमाएं"
[Progress bar: 0/100]
```

---

### API Map — S9 Home

| Data Section | API Endpoint |
|---|---|
| Sathi name + greeting | AsyncStorage (JWT payload) |
| Today's earnings, this month, pending incentives | `GET /api/v1/sathi/dashboard/overview` |
| Total farmers, new, follow-up | `GET /api/v1/sathi/dashboard/overview` |
| Today's visits | `GET /api/v1/sathi/agent/:agentId/tasks?dueDate=today` |
| Action required counts | `GET /api/v1/sathi/agent/:agentId/tasks?status=assigned` |
| Loan pipeline | `GET /api/v1/sathi/dashboard/loans` |
| Products summary (loans) | `GET /api/v1/sathi/dashboard/loans` |
| Products summary (insurance) | `GET /api/v1/sathi/dashboard/insurance` |
| Growth trend + services breakdown | `GET /api/v1/sathi/dashboard/overview` |
| Incentive progress | `GET /api/v1/sathi/incentives` |

---
---

# MAIN APP — TAB 2: SCHEDULE

---

## S10 — Schedule / Today's Visits

**Route:** `/(tabs)/schedule`

### Layout

#### Header
```
[Title] "मेरा शेड्यूल"
[Subtitle] "आज · N कार्य · M गाँव"   ← dynamic count
           or "आज कोई कार्य नहीं। बहुत अच्छे!" ← if empty

[Date strip — horizontal scroll]
  Mon  Tue  [Wed ←today]  Thu  Fri  Sat  Sun
   3    4      5           6    7    8    9
```

Tap on date → filters task list to that date.

#### ROOTS Alerts Banner (shown only if ROOTS verification tasks exist)
```
[Amber-bordered card]
🌾 "ROOTS फ़ील्ड सत्यापन (N)"

[Row per ROOTS task]
  Farmer name · Village
  [Urgent badge — red] or [In Progress badge — blue]
  [कार्य शुरू करें ▶] → S36 ROOTS Field Verification
```

ROOTS tasks are separated from regular tasks because they use a different, specialized screen (S36) with split-view verification workflow.

#### Route Planner Strip
```
[Emerald strip — horizontal scroll]
"मार्ग: "
  [Kheda (3)] → [Mandvi (2)] → [Dahod (1)]
```

Villages sorted by **pending task count descending** (most work first = optimal routing).
Each chip: Village name + pending count badge.

#### Filter Bar
```
[All] [Pending] [In Progress] [Completed]   ← filter chips
[Village: All ▼]   ← village dropdown filter
```

#### Visit Cards (full list)
```
[Farmer avatar — purple circle with initials]
[Farmer Name]  [Village]

[Task type]                        [₹50/Lakh]
[Status chip 1] [Status chip 2]

[Start Visit]  [Call Farmer]  [Upload Data]
```

**Status chips:**
- Due Today (red)
- Scheduled (grey)
- In Progress (blue)
- Completed (green)
- Overdue (dark red)
- Routes Updated (green)
- Documents Ready (green)
- Pending Docs (amber)

**Task types shown as chips:**
- Mid-cycle Monitoring
- Farm Cycle Initiation
- KYC Verification
- Loan Application Check
- Document Collection
- ROOTS Verification
- Soil Sample

#### Quick Actions Grid (2×2)
```
[Add Farmer]     [Create Farm]
[Upload Docs]    [Update Costs]
```

Each navigates to respective flow.

#### Filter Bar (top of list)
```
[All] [Pending] [In Progress] [Completed]   ← filter chips
[Sort by: Due Date ▼]
```

### Empty State
```
[Calendar illustration]
"इस दिन कोई विज़िट नहीं"
"नई विज़िट शेड्यूल करें"
[Button] "विज़िट जोड़ें"
```

### API
```
GET /api/v1/sathi/agent/:agentId/tasks
  ?dueDate=2026-05-06
  &status=assigned,in_progress
  &limit=20&offset=0
```

---
---

# MAIN APP — TAB 3: PROFILE

---

## S11 — Sathi Profile

**Route:** `/(tabs)/profile`

### Layout
```
[Avatar photo / initials]
[Name] Shivam Yadav
[Sathi Type chip] Business Correspondent
[Location] Kashi, Varanasi, UP
[Sathi ID] FP-SATHI-00123

[KYC Status card]
  Aadhaar: ✅ Verified
  PAN:     ✅ Verified
  Bank:    ✅ Linked

[Stats row]
  Rating: 4.8★  |  Farmers: 124  |  Experience: 3 yrs

[Menu list]
  → My Commissions (→ S28)
  → My Incentives (→ S29)
  → Issues Raised (→ S30)
  → Nudges Sent (→ S32)
  → Offline Sync Status (→ S35)
  → Change MPIN
  → Language Settings
  → Help & Support
  → Logout
```

### API
```
GET /api/v1/choice/intermediaries/:choiceId/profile
Response: { name, type, rating, totalFarmersServed, kycStatus, badges[], villageId, ... }
```

### Empty/Pending State
```
KYC Status: "समीक्षा में" (amber badge)
Note: "KYC सत्यापित होने के बाद सभी सुविधाएं उपलब्ध होंगी"
```

---
---

# MY FARMERS FLOW

---

## S12 — My Farmers List

**Route:** `/farmers`  
**Access:** Home "My Farmers >" or bottom tab

### Layout
```
[Header] "मेरे किसान" ←back

[Search bar] "किसान खोजें" (name, mobile, village)

[Subtitle] "124 किसान ऑनबोर्ड किए गए"

[Filter tabs — horizontal scroll]
  [सभी किसान ●]  [सत्यापित किया गया]  [लंबित है]  [फॉलो-अप चाहिए]

[Sort] "क्रमबद्ध करें: ▼" — dropdown options:
  - अंतिम सक्रिय (Last Active) — default
  - नाम A→Z
  - नाम Z→A
  - Coaching Priority: High First ↑
  - Coaching Priority: Low First ↓
  - Onboarding Date (Newest)
  - Onboarding Date (Oldest)

[Farmer Card] (repeat per farmer)
  [Avatar circle — grey initials]
  [Name]              [Type badge] Farmer / Horticulturist
  [Verification badge] ✅ सत्यापित / ⏳ लंबित
  [Village, District]
  [Crops icon] Wheat, Rice • 5.5 acres
  [Loan icon]  ऋण: Active [Active badge — green]
               ऋण: None   [None badge — grey]
               ऋण: Closed [Closed badge — blue]
               ऋण: Overdue [Overdue badge — red]
  [Onboarding date] ऑनबोर्ड किया: 15 Nov 2024 • अंतिम सक्रिय: 2 hours ago
  [Arrow →] (→ S13 Farmer Detail)
```

**Badge color map:**
| Status | Color |
|--------|-------|
| Verified / सत्यापित | Green |
| Pending / लंबित | Amber |
| Active loan | Green |
| None | Grey |
| Closed | Blue |
| Overdue | Red |

### Empty State (No Farmers)
```
[Illustration: empty field]
"अभी कोई किसान नहीं जोड़ा गया"
"अपना पहला किसान जोड़ें और अपनी यात्रा शुरू करें"
[Button] "+ पहला किसान जोड़ें" → S14
```

### Empty State (Search No Results)
```
[Search icon, grey]
"'[query]' के लिए कोई किसान नहीं मिला"
"नाम, मोबाइल या गाँव से खोजें"
```

### Empty State (Filter No Results)
```
"इस श्रेणी में कोई किसान नहीं"
[Clear filter button]
```

### API
```
GET /api/v1/choice/intermediaries/:choiceId/assigned-farmers
  ?search=ramesh
  &status=verified   (verified | pending | followup)
  &limit=20&offset=0

Response: {
  farmers: [{
    farmerId, name, type, verificationStatus, village, district,
    crops[], landAcres, loanStatus, loanAmount,
    onboardedAt, lastActiveAt
  }],
  total, newThisMonth, needFollowUp
}
```

---

## S13 — Farmer Detail

**Route:** `/farmers/[farmerId]`

### Layout (scrollable)

#### 1. Header
```
[← back]  "किसान विवरण"  [✏ Edit]
```

#### 2. Profile Card
```
[Avatar circle — large]
[Name]           [Type badge] Farmer
[Verification badge] ✅ सत्यापित किया गया
[Village, District]
[Phone: +91 98765 43210]

[Call करें button]    [WhatsApp button]
(calls device dialer)  (opens WhatsApp wa.me/91...)
```

#### 3. Secure Information (सुरक्षित जानकारी)
```
2×3 grid of masked info cards:
  [आधार]        ****-****-8765
  [पैन]         ABCDE****F
  [बैंक खाता]   SBI **** 4321
  [भूमि क्षेत्र] 5.5 acres
  [फसल का प्रकार] Wheat, Rice
  [जॉइन में सवार] 15 नवंबर 2024
```

Tap-to-reveal: holding card 2s reveals full value (biometric confirm on first reveal).

#### 4. Pending Tasks (लंबित कार्य)
```
[Header] "Pending Tasks (3)"

[Task row]
  [Red ⚠] "भूमि अभिलेख अपलोड करें"     [Due: Today — red]
  Description: "ऋण प्रसंस्करण के लिए..."

  [Amber ⚠] "फसल का आँकड़ा दर्ज करें"   [Due: 2 days — amber]
  Description: "रूट्स प्रणाली में..."

  [Amber ⚠] "केसीसी नवीनीकरण"            [Due: 1 week — grey]
  Description: "किसान क्रेडिट कार्ड..."

[View All Tasks →] (→ filtered task list for this farmer)
```

Due badge color logic:
- Overdue / Today → red
- 1–3 days → amber
- 4–7 days → grey/amber
- 7+ days → grey

#### 5. Quick Actions (त्वरित कार्यवाई)
```
[List of action rows with icon + title + subtitle]

[📋] उपयुक्त ऋण खोजें           → S25
     "किसान प्रोफाइल से मेल खाने वाले ऋण विकल्पों को देखें"

[💼] रूट्स डेटा के साथ सहायता   → S26
     "फसल की कटाई और आय के आँकड़ों में सहायता"

[🛡] पूर्ण KYC सत्यापन           → S27
     "पहचान दस्तावेजों को अपडेट या सत्यापित करें"

[📅] प्रशिक्षण और सहायता         → external link / in-app guide
     "कृषि गाइड और ट्यूटोरियल तक पहुँच"

[🔔] नज शेड्यूल करें            → S33
     "भुगतान या नवीनीकरण के लिए रिमाइंडर भेजें"

[⚠]  समस्या उठाएं               → S31
     "बैंकर के हस्तक्षेप के लिए फ्लैग करें"
```

#### 6. Loan Readiness Card (ऋण तैयारी)

> **Compliance note:** This card shows operational guidance only. Numeric TRUST score is never shown. Bank statement data is never shown.

```
[Card — green/amber/red left border based on state]

[Row 1]
  Loan Readiness State:    [Ready] / [Almost Ready] / [Not Ready] / [Needs Data]
  (badge color: green / amber / orange / grey)

[Row 2]
  TRUST Band:   [Strong] / [Building] / [Low]
  (badge color: green / amber / red)

[Coaching Priority]  High ● / Medium ● / Low ●   (feature-flag gated — hidden if flag off)
```

**State → badge map:**

| State | Hindi | Color |
|-------|-------|-------|
| Ready | तैयार है | Green |
| Almost Ready | लगभग तैयार | Amber |
| Not Ready | तैयार नहीं | Orange |
| Needs Data | डेटा चाहिए | Grey |

#### 7. Gap Areas Card (कमियां)

Shown only when Readiness State ≠ Ready.

```
[Card — amber border]
[Header] "इन क्षेत्रों में मदद करें"

[Gap row]  🌾 ROOTS Data         ○ Incomplete
[Gap row]  📄 KYC Documents      ✅ Complete
[Gap row]  📍 Land Record        ○ Missing
[Gap row]  🏦 Bank Account       ✅ Linked
[Gap row]  📸 Farm Photos        ○ Pending

Each incomplete gap row has a [सहायता करें →] quick-action link.
```

**Rules:**
- Each gap shows field name + status label only (no scores, no financial data)
- Tap [सहायता करें →] on a gap → routes to the relevant assist screen (S26 for ROOTS, S27 for KYC/docs, S21 for farm photos via task)
- "No gaps" state: green card with "✅ सभी जानकारी पूरी है — ऋण के लिए तैयार"

**Data source:** `GET /api/v1/readiness/:farmerId`

#### 8. ROOTS Data Status (रूट्स डेटा स्थिति)
```
[Card]
  अंतिम बार अपडेट किया गया  |  10 दिसंबर 2024
  बोई गई फसलें              |  3
  फसल अभिलेख               |  2
  दर्ज की गई आय             |  हाँ ✅
```

Color indicators:
- Last updated < 30 days → green
- Last updated 30–60 days → amber
- Last updated > 60 days → red

#### 9. Loan & Financial Summary
```
[Card]
  Active Loans: 1
  Total Sanctioned: ₹1,50,000
  Outstanding: ₹98,000
  Next EMI: ₹5,200 on 15 Jun 2026
  Loan Health: ✅ On Track (green)
```

#### 10. Commission Earned from this Farmer
```
[Card]
  Lifetime Commission: ₹450
  This Month: ₹120
```

### Empty States
- No tasks pending: "✅ कोई लंबित कार्य नहीं"
- No ROOTS data: "फसल डेटा अभी तक दर्ज नहीं। सहायता करें →"
- No loans: "कोई सक्रिय ऋण नहीं। उपयुक्त ऋण खोजें →"

### API
```
GET /api/v1/choice/intermediaries/:choiceId/farmers/:farmerId
  → farmer profile, masked PII, verification status

GET /api/v1/sathi/agent/:agentId/tasks?farmerId=:farmerId&status=assigned,in_progress

GET /api/v1/readiness/:farmerId
  → { readinessState, trustBand, coachingPriority (feature-flag gated), gapAreas[] }
  ⚠ Returns band label only — numeric score never included in response

GET /api/v1/sathi/dashboard/farmers (filtered to farmerId)
  → ROOTS data status

GET /api/v1/dice/loans/me?farmerId=:farmerId
  → loan summary

GET /api/v1/choice/intermediaries/:choiceId/commission?farmerId=:farmerId
  → commission earned from this farmer
```

---
---

# ADD FARMER FLOW (5 Steps)

---

## S14 — Add Farmer: Step 1 — Personal Info

**Route:** `/add-farmer/personal`

### Layout
```
[← back]  "किसान जोड़ें"
[Progress] ●●○○○  Step 1 of 5

[Title] "व्यक्तिगत जानकारी"

[Full Name*]       Text input (Hindi/English)
[Mobile Number*]   +91 + 10 digits (check existing farmer)
[Date of Birth]    Date picker
[Gender*]          Radio: पुरुष / महिला / अन्य
[Farmer Type*]     Dropdown: Farmer / Horticulturist / Dairy / Fishery / Livestock

[Village*]         LGD cascade: State → District → Block → Village
[Address]          Textarea (optional)

[CTA] "अगला →"
```

### Duplicate Phone Check
- On mobile blur: `GET /api/v1/farmer/check?mobile=` 
- If exists and assigned to me → show existing farmer card, offer "View Farmer"
- If exists and assigned to other Sathi → "यह किसान पहले से पंजीकृत है"
- If not exists → proceed

### API
```
(Draft saved in local state; submitted at Step 5)
GET /api/v1/farmer/check?mobile=9876543210
GET /api/v1/location/... (LGD cascade)
```

---

## S15 — Add Farmer: Step 2 — Farm Details

**Route:** `/add-farmer/farm`

### Layout
```
[Progress] ●●●○○  Step 2 of 5
[Title] "खेत की जानकारी"

[Total Land Area*]  Number + unit toggle (acres / hectares / bigha)
[Owned / Leased]    Radio

[Add Farm Field button] → mini form:
  Field Name, Area, Survey Number (optional), GPS (tap to capture)

[Fields list] (added fields shown as chips)

[Irrigation Type]  Multi-select: Canal / Borewell / Rain-fed / Drip / Sprinkler

[Soil Type]        Dropdown: Alluvial / Black / Red / Laterite / Sandy / Clay

[CTA] "अगला →"
```

### GPS Capture
- "अपना खेत चिह्नित करें" → opens map, drops pin at current GPS
- Shows lat/lng below map

### API
```
(Draft local state)
POST /api/v1/farmer/farms (submitted at step 5)
```

---

## S16 — Add Farmer: Step 3 — Crop Selection

**Route:** `/add-farmer/crops`

### Layout
```
[Progress] ●●●●○  Step 3 of 5
[Title] "फसल और गतिविधि"

[Which activities does this farmer do?]
Multi-select cards (icon + label):
  🌾 Crop farming    🥛 Dairy    🐟 Fishery
  🌿 Horticulture   🐐 Goatery  🐔 Poultry

[Based on selection, show crop input]
For CROP:
  [Crop Type*] Searchable dropdown (wheat, rice, sugarcane, cotton...)
  [Season*]    Kharif / Rabi / Zaid
  [Area*]      Acres

[+ Add Another Crop] button

[CTA] "अगला →"
```

---

## S17 — Add Farmer: Step 4 — Documents

**Route:** `/add-farmer/documents`

### Layout
```
[Progress] ●●●●●  Step 4 of 5
[Title] "दस्तावेज़"]

[Aadhaar Card*]
  [Upload box] front + back
  [Aadhaar Number*] 12-digit input

[PAN Card] (optional)
  [Upload box]

[Land Records] (optional but recommended)
  [Upload box — multiple files allowed]
  "खसरा / खतौनी / 7/12 उतारा"

[Bank Passbook / Statement]
  [Upload box]
  [Account Number] [IFSC]

[Note] "📷 फ़ोटो स्पष्ट और पठनीय होनी चाहिए"

[CTA] "अगला →"
```

### Document States (same as S7)

---

## S18 — Add Farmer: Step 5 — Consent Collection

**Route:** `/add-farmer/consent`

### Layout
```
[Progress] ●●●●● Step 5 of 5
[Title] "किसान की सहमति"
[Subtitle] "किसान को प्रत्येक सहमति समझाएं और उनकी अनुमति लें"

[Consent Item 1]
  [Toggle]  डेटा साझाकरण (Data Sharing)
  "आपका डेटा FarmerPay और बैंक के साथ साझा किया जाएगा"

[Consent Item 2]
  [Toggle]  स्थान ट्रैकिंग (Location Tracking)
  "खेत सत्यापन के लिए GPS उपयोग"

[Consent Item 3]
  [Toggle]  फ़ोटो / वीडियो (Photo & Video)
  "खेत और दस्तावेज़ की फ़ोटो लेना"

[Consent Item 4]
  [Toggle]  बायोमेट्रिक (Biometric Capture)
  "KYC के लिए फिंगरप्रिंट / आईरिस"

[Farmer Signature box]
  "किसान का अंगूठा / हस्ताक्षर"
  [Signature pad or thumbprint box]

[Privacy note] "🔒 सहमति RBI दिशानिर्देशों के अनुसार सुरक्षित रखी जाती है"

[CTA] "किसान जोड़ें ✓"
```

### Validation
- Minimum: Data Sharing consent must be ON
- Signature/thumbprint required

### API
```
POST /api/v1/farmer/register
Body: { name, mobile, dob, gender, type, villageId, address, activities[], cropDetails[] }
→ returns { farmerId }

POST /api/v1/auth/documents/upload (for each doc)

POST /api/v1/choice/intermediary/:intermediaryId/assign/:farmerId

POST /api/v1/sathi/farmer/:farmerId/consents
Body: { consentType: "data_sharing", consentGivenByFarmer: farmerId }
(repeat for each toggled consent)
```

---

## S19 — Add Farmer: Success

**Route:** `/add-farmer/success`

### Layout
```
[Success animation — green checkmark lottie]

[Title] "किसान सफलतापूर्वक जोड़ा गया!"
[Farmer Name + ID card]
  Ramesh Kumar
  Farmer ID: FP-F-00456
  Village: Kharwal, Faridabad

[Next steps card]
  ✅ KYC दस्तावेज़ जमा
  ⏳ बैंक सत्यापन (1-2 दिन)
  📋 3 कार्य असाइन किए गए

[Action buttons]
  [किसान विवरण देखें] → S13
  [और किसान जोड़ें] → S14
  [होम पर जाएं] → S9
```

---
---

# VISIT / TASK FLOW

---

## S20 — Task Detail

**Route:** `/tasks/[taskId]`

### Layout
```
[← back]  "कार्य विवरण"

[Task header card]
  [Task Type chip] Mid-cycle Monitoring
  [Priority chip]  High — red
  [Status chip]    Assigned — grey

[Farmer info row]
  [Avatar] Ram Prasad, Kashi
  [Call] [WhatsApp] buttons

[Commission]
  ₹50/Lakh disbursed loan amount

[Task details]
  📅 Due: Today (15 May 2026)
  📍 Location: Kashi, Varanasi
  📝 Description: "किसान के खेत में फसल की मध्य-चक्र स्थिति की जाँच करें"

[Checklist preview — first 3 items]
  ○ फसल वृद्धि की जाँच करें
  ○ इनपुट उपयोग रिकॉर्ड करें
  ○ फसल फ़ोटो लें
  [सभी आइटम देखें — 7 total]

[Documents needed]
  📄 खेत की फ़ोटो (min 3)
  📄 फसल स्वास्थ्य अवलोकन

[Evidence uploaded]
  (if in_progress) [thumbnail grid]

[Audit trail]
  Assigned: 5 May, 10:00 AM
  Started: (empty if not started)

[CTA] [Start Visit →] or [Continue Visit →] or [View Completed]
```

### API
```
GET /api/v1/sathi/tasks/:taskId
Response: {
  taskId, taskUuid, taskType, priority, status,
  farmerId, farmerName, farmerVillage, farmerMobile,
  dueDate, description, commissionPerLakh,
  checklist: [{ text, isChecked, isRequired }],
  evidenceBundle: { bundleId, items[] },
  auditLog: [{ action, by, at }]
}
```

---

## S21 — Start Visit (GPS Check-in)

**Route:** `/tasks/[taskId]/start`

### Layout
```
[← back]  "विज़िट शुरू करें"

[Map view]
  Current location pin shown
  Farmer farm location pin (if GPS captured)
  Distance: "आप खेत से 0.3 km दूर हैं"

[GPS status]
  ✅ GPS: सक्रिय
  📍 Lat: 25.3176° N, Long: 82.9739° E

[Location accuracy indicator]
  High / Medium / Low accuracy

[Note] "विज़िट शुरू करने के लिए खेत के 500m के भीतर होना ज़रूरी है"

[CTA] "विज़िट शुरू करें ✓"  (enabled only if within 500m or override)
[Override] "मैं खेत पर हूँ" (allows manual override with reason)
```

### GPS Logic
- If within 500m of farmer GPS → auto-enable start
- If GPS unavailable → show "GPS सक्रिय करें" prompt
- Override with text reason required

### API
```
POST /api/v1/sathi/tasks/:taskId/start
Body: {
  startLatitude: 25.3176,
  startLongitude: 82.9739,
  gpsAccuracy: "high",
  overrideReason: null
}
Response: { executionId, startedAt }
```

---

## S22 — Visit Checklist

**Route:** `/tasks/[taskId]/checklist`

One-at-a-time progressive form — one checklist item fills the full screen. Auto-saves to device storage on every answer (offline-safe).

### Layout — Progress Bar + Item Card

```
[← back]  "विज़िट चेकलिस्ट"

[Progress bar]  ████████░░░░  3 / 7 पूर्ण

[Item Card — current item only]
  ─────────────────────────────────
  Item 3 of 7  · [required badge / optional badge]

  [Item label]
  "फसल की फ़ोटो लें"

  [Field — rendered by item.fieldType]
  (see field types below)

  [Mark N/A button]  (always present — tap opens reason picker)

  [← पिछला]   [अगला →]  (next disabled until item answered or marked N/A)
  ─────────────────────────────────
```

### Field Types per Item

| fieldType | Rendered As |
|-----------|-------------|
| `text` | Single-line text input (Hindi/English) |
| `number` | Numeric input with unit label (e.g., kg, acres) |
| `select` | Radio button list (options from checklist config) |
| `boolean` | Yes / No toggle buttons (large, full-width) |
| `photo` | Camera launcher + thumbnail grid (min count enforced) |
| `signature` | Signature pad or OTP confirmation |

### Photo Items (fieldType = photo)

```
[Camera icon — large tap area]  "फ़ोटो लें"
[Gallery icon]  "गैलरी से चुनें"

[Thumbnail grid — 3 cols]
  Each thumbnail:
    [Delete ×]
    [GPS stamp] ← if geotag enabled
    [Timestamp]

[Geotag toggle] 📍 "स्थान टैग करें" — default ON
  (captures lat/lng at photo moment; stored with photo metadata)

[Min count hint] "कम से कम 2 फ़ोटो जरूरी हैं" (amber if not met)
```

### Mark N/A — Reason Picker

Tap [Mark N/A] → bottom sheet:

```
"इस आइटम को छोड़ने का कारण:"

○ लागू नहीं (NOT_APPLICABLE)
○ किसान अनुपस्थित (FARMER_ABSENT)
○ डेटा उपलब्ध नहीं (DATA_UNAVAILABLE)
○ बाद में देंगे (WILL_PROVIDE_LATER)

[पुष्टि करें]  [रद्द करें]
```

Required items marked N/A → amber warning: "यह आइटम जरूरी है — पुष्टि करें कि आप इसे छोड़ना चाहते हैं"

### Final Summary Screen (after last item)

```
[Card]
  ✅ पूर्ण: 6
  ⚠ N/A: 1 · कारण: किसान अनुपस्थित
  ❌ छोड़े गए: 0

[Notes field]  "अतिरिक्त टिप्पणियां..."  (optional)

[CTA] "साक्ष्य अपलोड करें →"
  (enabled only if all required non-N/A items are answered)
```

### Auto-Save Behaviour

- Each answer auto-saved to device AsyncStorage immediately on [अगला →]
- If app crashes mid-checklist → resumes from last saved item on reopen
- On connectivity: answers queued in SathiSyncQueue and flushed when online

### API
```
POST /api/v1/sathi/tasks/:taskId/update
Body: {
  executionId,
  checklistUpdates: [{
    itemId,
    fieldType,
    value,             // string | number | boolean | null (if N/A)
    naReason,          // "NOT_APPLICABLE" | "FARMER_ABSENT" | "DATA_UNAVAILABLE" | "WILL_PROVIDE_LATER" | null
    photoDocumentIds,  // [] if fieldType = photo
    geotagLat,         // null if geotag off
    geotagLng
  }],
  notes: "...",
}
```

---

## S23 — Upload Evidence

**Route:** `/tasks/[taskId]/evidence`

### Layout
```
[← back]  "साक्ष्य अपलोड करें"

[Required Evidence section]

[Farm Photos* — min 3]
  [Photo grid — 3 cols]
  [+ Add Photo] (camera / gallery)
  Each photo: thumbnail + type tag + delete X

[Document uploads]
  [Crop Health Observation form — inline]
    ○ अच्छा (Good)  ○ सामान्य (Average)  ○ खराब (Poor)
    [Notes]

  [Optional: Land record photo]
  [Optional: Input bill photo]

[GPS stamp] "📍 25.3176°N, 82.9739°E — 14:32"
  (auto-applied to all uploads)

[Offline note] if offline:
  "📶 नेटवर्क नहीं — फ़ाइलें डिवाइस में सहेजी जा रही हैं"
  "कनेक्ट होने पर स्वचालित अपलोड होगा"

[CTA] "विज़िट पूर्ण करें →"
```

### Offline Behaviour
- Photos stored in device AsyncStorage / FileSystem
- Added to SathiSyncQueue with `sync_action: create`
- Badge on nav bar shows pending sync count
- Auto-uploads on connectivity restore

### API
```
POST /api/v1/auth/documents/upload (multipart)
  Body: { file, documentType: "farm_photo", taskId, latitude, longitude }

POST /api/v1/sathi/tasks/:taskId/evidence (batch submit bundle)
  Body: { bundleType: "farm_field_verification", items: [{ type, documentId, purpose }] }
```

---

## S24 — Complete Visit

**Route:** `/tasks/[taskId]/complete`

### Layout
```
[← back]  "विज़िट पूर्ण करें"

[Summary card]
  Farmer: Ram Prasad, Kashi
  Task: Mid-cycle Monitoring
  Duration: 1 hr 23 min
  Photos: 4 ✅
  Checklist: 7/7 ✅

[Completion notes]
  [Textarea] "विज़िट सारांश..."

[Farmer sign-off]
  [Signature pad] or
  [OTP confirmation] "किसान के मोबाइल पर OTP भेजें और दर्ज करें"

[GPS checkout stamp]
  📍 Current location captured automatically

[CTA] "विज़िट पूर्ण करें ✓"
```

### On Success
- Task status → completed
- Commission accrued (shown as toast: "₹75 कमाई जोड़ी गई")
- Navigates back to S10 Schedule with success banner

### API
```
POST /api/v1/sathi/tasks/:taskId/complete
Body: {
  executionId,
  endLatitude, endLongitude,
  completionNotes: "...",
  farmerOtp: "1234"  (or signatureDocumentId)
}
Response: { status: "completed", commissionAccrued: 7500 }
```

---
---

# ASSIST FLOWS

---

## S25 — Assist Loan Discovery

**Route:** `/assist/loan/[farmerId]`

### Layout
```
[← back]  "उपयुक्त ऋण खोजें"
[Farmer name chip]

[Farmer profile summary]
  Land: 5.5 acres | Crops: Wheat, Rice | Activity: Crop
  TRUST Band: Strong ●  ·  Readiness: Ready ✅
  (Band label only — numeric score never shown to Sathi per DPDP/RBI compliance)

[Eligible Loan Products — cards]
  [Card]
    KCC Renewal
    Up to ₹2,40,000
    @ 7% p.a. | Tenure: 12 months
    PSL: ✅ Agriculture
    [Apply for Farmer →]

  [Card]
    Input Cost Loan
    Up to ₹85,000
    @ 9% p.a. | Tenure: 6 months
    [Apply for Farmer →]

[Apply for Farmer button]
  → POST /api/v1/dice/los/initiate (on behalf of farmer)
  → Confirm dialog: "क्या आप Ramesh Kumar के लिए KCC आवेदन शुरू करना चाहते हैं?"
```

### API
```
GET /api/v1/dice/products?farmerId=:farmerId
GET /api/v1/dice/eligibility?farmerId=:farmerId
POST /api/v1/sathi/assist/loan
  Body: { farmerId, productId }
```

---

## S26 — Assist ROOTS Data Entry

**Route:** `/assist/roots/[farmerId]`

### Layout
```
[← back]  "रूट्स डेटा सहायता"
[Farmer chip]

[Current ROOTS status card]
  Last Updated: 10 Dec 2024
  Active Cycles: 2
  Pending tasks: 3

[Cycle list]
  Cycle: Wheat — Rabi 2024-25
  Status: Growing
  Pending: Workband 3 not started

  [Help with this cycle →] → opens task-execute flow

[Add New Harvest]
  [Date picker]
  [Qty (kg)]
  [Sale Price (₹/kg)]
  [Buyer Name]

[CTA] "डेटा सहेजें"
```

### API
```
GET /api/v1/roots/cycles?farmerId=:farmerId
POST /api/v1/sathi/roots-verification
POST /api/v1/sathi/roots-verification/:taskId/assisted-entry
POST /api/v1/roots/harvest/:harvestRecordId/sales
```

---

## S27 — Assist KYC Verification

**Route:** `/assist/kyc/[farmerId]`

### Layout
```
[← back]  "KYC सत्यापन"

[KYC Status overview]
  Aadhaar: ✅ Verified
  PAN:     ⏳ Pending upload
  Bank:    ✅ Linked
  Photo:   ❌ Missing

[Action items list]
  [Upload PAN card →]
  [Capture farmer photo →]

[Upload flow per document]
  Camera / Gallery selector
  Crop + confirm
  Submit

[Field Verification]
  [Create address verification task →] → task creation flow
```

### API
```
GET /api/v1/farmer/:farmerId/kyc-status
POST /api/v1/auth/documents/upload
POST /api/v1/sathi/field-verifications
  Body: { farmerId, type: "address", latitude, longitude, checklist[] }
```

---
---

# FINANCIAL SCREENS

---

## S28 — Commissions

**Route:** `/commissions`  
**Access:** Profile menu

### Layout
```
[← back]  "मेरी कमाई"

[KPI row — 3 cards]
  [Total Earned]    ₹12,450  (lifetime)
  [Paid Out]        ₹10,200
  [Pending]         ₹2,250

[Period selector] [April 2026 ▼] (month-year picker)

[Commission bar chart]
  X: months (Jan–Apr)
  Y: ₹ amount
  (bar per month, current month highlighted)

[Ledger table]
  Period | Event Type | Farmer | Gross | Commission (20%) | Status
  Apr-26 | Loan Fee   | Ramesh | ₹500  | ₹100            | Accrued
  Apr-26 | Insurance  | Sita   | ₹200  | ₹40             | Paid

[Status badge map]
  accrued → "प्रतीक्षित" (amber)
  approved → "स्वीकृत" (blue)
  paid → "भुगतान हुआ" (green)
  clawed_back → "वापस लिया" (red)
```

### Empty State
```
[Wallet icon, grey]
"इस महीने कोई कमाई नहीं"
"किसान को ऋण या बीमा दिलाएं और कमाएं"
```

### API
```
GET /api/v1/sathi/commissions?period=2026-04
Response: {
  totalEarned, paidOut, pending,
  ledger: [{ period, eventType, farmerId, farmerName, grossAmount, commissionAmount, payoutStatus }]
}
```

---

## S29 — Incentive Progress

**Route:** `/incentives`

### Layout
```
[← back]  "प्रोत्साहन"

[Current quarter banner]
  Q2 2026: April – June 2026

[Progress card — large]
  [Big number] 67 / 100
  "इस तिमाही में सक्रिय किसान"
  [Progress bar — purple fill]
  "33 और किसान चाहिए → ₹[X] बोनस अनलॉक करें"
  [Days remaining] "47 दिन बचे"

[Milestone map]
  ○ 100 किसान → 10% बोनस
  ○ 250 किसान → 10% बोनस (locked)
  ○ 500 किसान → 10% बोनस (locked)

[Incentive Ledger]
  Q1 2026: 112 किसान | ₹1,200 बोनस | Paid ✅
  Q4 2025: 88 किसान  | — (milestone not reached)
```

### Empty State (new Sathi)
```
"पहली तिमाही में 100 किसानों को सक्रिय करें"
"हर ऋण/बीमा उत्पाद से एक किसान गिना जाता है"
[Start →] → S14 Add Farmer
```

### API
```
GET /api/v1/sathi/incentives
Response: {
  currentQuarter: { start, end, daysRemaining },
  activeBeneficiaries: 67,
  milestoneThreshold: 100,
  projectedBonus: 120000,
  milestones: [{ threshold, rate, status, paidAmount }],
  history: [{ quarter, beneficiaries, bonusAmount, payoutStatus }]
}
```

---
---

# ISSUES & NUDGES

---

## S30 — Issues List

**Route:** `/issues`

### Layout
```
[← back]  "समस्याएं"

[KPI row]
  Total: 12 | Open: 5 | Critical: 2

[Filter chips]
  [All] [Open] [Critical] [Resolved]

[Issue card]
  [Severity badge — red] CRITICAL
  Farmer: Ram Prasad
  Type: Loan Default Risk
  "किसान ने 2 EMI मिस की हैं"
  Opened: 2 May 2026
  Status: Open [⚡ Banker Action Needed]

  [Severity badge — amber] HIGH
  Farmer: Sita Devi
  Type: Document Mismatch
  Status: In Progress
```

### Empty State
```
[Green shield icon]
"कोई समस्या नहीं"
"सभी किसान ठीक हैं"
```

### API
```
GET /api/v1/sathi/issues
  ?status=open&severity=critical
Response: { issues: [...], total, openCount, criticalCount }
```

---

## S31 — Raise Issue

**Route:** `/issues/new`

### Layout
```
[← back]  "समस्या उठाएं"

[Select Farmer*]  Searchable dropdown (from my farmers)

[Issue Type*]  Dropdown:
  - Loan Default Risk / ऋण चूक जोखिम
  - Document Mismatch / दस्तावेज़ बेमेल
  - Insurance Claim Delay / बीमा दावा विलंब
  - Input Quality Issue / इनपुट गुणवत्ता समस्या
  - Fraud Suspicion / धोखाधड़ी संदेह

[Severity*]  Radio: Critical | High | Medium | Low

[Description*]  Textarea (min 20 chars)

[Attach Photo]  Optional camera/gallery

[CTA] "समस्या जमा करें"
```

### On Success
- Toast: "बैंकर को सूचित किया गया"
- Navigates back to S30

### API
```
POST /api/v1/sathi/issues
Body: { farmerId, issueType, severity, description, attachmentId? }
Response: { issueId, status: "open" }
```

---

## S32 — Nudges List

**Route:** `/nudges`

### Layout
```
[← back]  "नज"

[KPI row]
  Sent: 45 | Action Taken: 28 | Conversion: 62%

[Nudge card]
  Farmer: Mukesh Singh
  Type: Repayment Due / भुगतान बकाया
  Channel: WhatsApp
  Sent: 4 May 2026, 10:30 AM
  Action Taken: ✅ हाँ

  Farmer: Sita Devi
  Type: KYC Refresh
  Channel: SMS
  Sent: 3 May 2026
  Action Taken: ❌ नहीं
```

### API
```
GET /api/v1/sathi/nudges
Response: { nudges: [...], total, actionTaken, conversionRate }
```

---

## S33 — Schedule Nudge

**Route:** `/nudges/new`

### Layout
```
[← back]  "नज शेड्यूल करें"

[Select Farmer*]   Dropdown

[Nudge Type*]  Radio:
  - Repayment Due / भुगतान बकाया
  - Policy Renewal / पॉलिसी नवीनीकरण
  - KYC Refresh / KYC अपडेट
  - Subsidy Claim / सब्सिडी दावा

[Channel*]  Radio:
  - SMS
  - WhatsApp
  - Push Notification
  - IVR Call

[Schedule]  Date + Time picker  (default: now)

[Message preview]
  [Auto-generated text based on type + farmer name]
  "प्रिय Mukesh जी, आपकी EMI ₹5,200 की देय तिथि 15 जून 2026 है। कृपया समय पर भुगतान करें। — FarmerPay"

[CTA] "नज भेजें"
```

### API
```
POST /api/v1/sathi/nudges
Body: { farmerId, nudgeType, channel, scheduledAt, customMessage? }
```

---
---

# OFFLINE & SYNC

---

## S35 — Offline Sync Status

**Route:** `/sync-status`  
**Access:** Profile menu OR tap on offline indicator dot

### Layout
```
[← back]  "सिंक स्थिति"

[Connection status banner]
  🟢 Online — सभी डेटा सिंक किया गया
  🔴 Offline — X आइटम प्रतीक्षा में

[Sync queue list]
  [Pending — 3 items]
    📷 Ram Prasad farm photos (4 files, 12 MB)
    📝 Sita Devi consent record
    ✅ Task #T-123 completion

  [Synced today — 8 items]
    ✅ Task #T-120 completed — 2:30 PM
    ✅ Mukesh Singh added — 1:00 PM

[Manual sync button] "अभी सिंक करें"

[Last synced] "अंतिम सिंक: आज 3:45 PM"
```

### Conflict resolution (if conflicts)
```
[Conflict card]
  "Task #T-115 में विरोध"
  Server value vs. Your value
  [सर्वर मूल्य रखें] [मेरा मूल्य रखें]
```

### API
```
POST /api/v1/sathi/sync
Body: { syncQueue: [{ entityType, entityId, action, data }] }
Response: { syncedCount, failedCount, conflicts: [] }

POST /api/v1/sathi/sync/conflicts/:conflictId/resolve
Body: { strategy: "use_server" | "use_client" | "merge", selectedValue? }
```

---

## S36 — ROOTS Field Verification

**Route:** `/roots-verify/[taskId]`  
**Access:** From S10 Schedule (ROOTS Alerts Banner) or task card with type "ROOTS Verification"

This is a specialized, split-view screen distinct from the generic Visit Checklist (S22). Sathi physically verifies crop standing and helps the farmer enter missed ROOTS data.

### Layout — Two-Tab View

```
[← back]  "ROOTS फ़ील्ड सत्यापन"
[Farmer chip]  Ram Prasad · Kashi, Varanasi

[Tab bar]
  [🌾 किसान डेटा]   [✅ फ़ील्ड सत्यापन]
```

---

#### Tab 1 — Farmer ROOTS Data (किसान डेटा)

Shows the ROOTS data Sathi needs to verify against what is physically visible in the field.

```
[Cycle summary card]
  Crop: Wheat · Season: Rabi 2024-25
  Sown: 15 Oct 2024
  Area: 3.5 acres · Field: Khet-A

[Workband status table]
  Workband              | Status     | Last Updated
  ─────────────────────────────────────────────────
  Land Preparation      | ✅ Done    | 10 Oct 2024
  Sowing                | ✅ Done    | 15 Oct 2024
  Fertiliser (Stage 1)  | ⚠ Pending  | —
  Irrigation (Stage 2)  | ○ Not Started | —

[Missing data alert — amber banner]
  "3 वर्कबैंड डेटा दर्ज नहीं हुआ"
  [सहायक डेटा एंट्री करें ▼] → collapses into Assisted Entry sub-form (see below)
```

**Assisted Entry Sub-form (inline, collapsible):**

```
[Workband selector]  Dropdown — shows only pending/not-started workbands

For selected workband, show TaskExecution form:
  Start Date:     [Date picker]
  Inputs used:    [+ Add Input row]
    Item: [searchable dropdown]  Qty: [number]  Unit: [dropdown]  Cost ₹: [number]
  Labour:         [+ Add Labour row]
    Type: [Family/Hired/Contractor]  Count: [number]  Hours: [number]  Wage/day ₹: [number]
  Completion %:   [Slider 0–100]
  End Date:       [Date picker]  (if completion = 100)

[सहेजें] → POST /api/v1/roots/tasks/:taskId/execute (on behalf of farmer)
Toast: "जानकारी सहेजी गई"  ← NEVER "score updated"
```

---

#### Tab 2 — Field Verification (फ़ील्ड सत्यापन)

Sathi's physical observation of what they see at the farm.

```
[Section A — Crop Standing]
  "क्या खेत में फसल खड़ी है?"
  [YES — हाँ ✅]   [NO — नहीं ❌]   (large buttons)

  If NO → follow-up dropdown:
  "फसल नहीं होने का कारण:"
    ○ पहले से कट चुकी (Already Harvested)
    ○ फसल नहीं लगाई (Not Sown)
    ○ फसल खराब हुई (Crop Damaged)
    ○ अन्य (Other) + text field

[Section B — Growth Stage]
  "फसल की वृद्धि अवस्था:"
  Dropdown:
    - Seedling / अंकुरण
    - Vegetative / वानस्पतिक
    - Flowering / पुष्पन
    - Grain Filling / दाना भरना
    - Maturity / परिपक्वता
    - Already Harvested / कट चुकी
    - No Crop Visible / फसल नहीं दिखती

[Section C — Verification Checklist]
  (boolean Yes/No per item)
  □ फसल ROOTS रिकॉर्ड से मेल खाती है?
  □ इनपुट उपयोग दिख रहा है? (fertiliser, irrigation evidence)
  □ फसल स्वास्थ्य सामान्य है?
  □ कोई कीट/बीमारी दिख रही है?
  □ सिंचाई की सुविधा उपस्थित है?

[Section D — Farmer Interview Notes]
  "किसान से पूछें और दर्ज करें:"
  [Textarea]  "किसान ने क्या बताया..."
  Max 500 chars

[Section E — Discrepancy Report]
  (shown only if crop standing or stage doesn't match ROOTS records)

  Severity:  [Minor ●]  [Major ●]  [Critical ●]

  Discrepancy description:
  [Auto-filled: "ROOTS shows Vegetative stage but field shows Grain Filling"]
  [Editable text area]

  Resolution suggestion:  [Update ROOTS data]  [Flag for banker review]  [Both]

[Section F — Farm Photos]
  [Camera] "खेत की फ़ोटो लें" (min 2, max 10)
  Geotag: ON by default
  Each photo: thumbnail + timestamp + GPS coords

[GPS Auto-stamp]
  📍 25.3176°N, 82.9739°E  ·  Accuracy: High
```

### Submission

```
[Submit Card]
  ✅ Crop Standing: Yes
  ✅ Growth Stage: Grain Filling
  ✅ Verification Checklist: 5/5
  ✅ Photos: 3
  ⚠ Discrepancy: 1 (Major)

[CTA] "सत्यापन जमा करें"
  → POST /api/v1/sathi/roots-verification/:taskId/complete

On success:
  - Task status → verified
  - If discrepancy flagged → EWS alert created in SENTINEL
  - Toast: "फ़ील्ड सत्यापन पूर्ण"
  - Navigate → S10 Schedule
```

### Empty State (no active cycles for farmer)

```
[Wheat illustration, grey]
"इस किसान का कोई सक्रिय फसल चक्र नहीं"
"ROOTS डेटा एंट्री में सहायता करें"
[Button] "नया चक्र शुरू करें" → S26 Assist ROOTS Entry
```

### API
```
GET /api/v1/roots/cycles?farmerId=:farmerId
  → active cycles with workband status

GET /api/v1/sathi/roots-verification/:taskId/checklist
  → checklist items config (what to verify)

POST /api/v1/roots/tasks/:taskId/execute
  → assisted workband data entry (on behalf of farmer)
  Body: { startDate, inputs[], labor[], completionPercentage, endDate? }

POST /api/v1/sathi/roots-verification/:taskId/complete
  Body: {
    cropStanding: true,
    noStandingReason: null,
    growthStage: "grain_filling",
    verificationChecklist: [{ itemId, value: true | false }],
    farmerInterviewNotes: "...",
    discrepancy: {
      detected: true,
      severity: "major",
      description: "...",
      resolution: "update_roots_and_flag"
    },
    photoDocumentIds: [],
    gpsLatitude: 25.3176,
    gpsLongitude: 82.9739
  }
```

---
---

# NOTIFICATIONS

---

## S34 — Notifications

**Route:** `/notifications`

### Layout
```
[← back]  "सूचनाएं"
[Mark all read]

[Today]
  🔴 [2h ago] Ram Prasad की EMI मिस हुई — SENTINEL alert
  🟡 [4h ago] Task #T-123 की नियत तारीख आज है
  🟢 [6h ago] Mukesh Singh का ऋण स्वीकृत — ₹75 कमाई

[Yesterday]
  🟢 KCC नवीनीकरण पूर्ण — Sita Devi
  🟡 3 कार्य असाइन किए गए

[This Week]
  ...
```

### Empty State
```
[Bell icon, grey]
"कोई नई सूचना नहीं"
```

---
---

# COMPLETE API REFERENCE

## A. Auth & Registration

| Action | Method | Endpoint |
|--------|--------|----------|
| Send OTP | POST | `/api/v1/auth/otp/send` |
| Verify OTP | POST | `/api/v1/auth/otp/verify` |
| Set MPIN | POST | `/api/v1/auth/mpin/set` |
| Verify MPIN | POST | `/api/v1/auth/mpin/verify` |
| Refresh token | POST | `/api/v1/auth/refresh` |
| Logout | POST | `/api/v1/auth/logout` |
| Upload document | POST | `/api/v1/auth/documents/upload` |

## B. Sathi Profile & Onboarding

| Action | Method | Endpoint |
|--------|--------|----------|
| Create Sathi profile | POST | `/api/v1/sathi/profile/create` |
| Submit KYC | POST | `/api/v1/sathi/kyc/submit` |
| Get intermediary profile | GET | `/api/v1/choice/intermediaries/:choiceId/profile` |
| Update profile | PATCH | `/api/v1/choice/intermediaries/:choiceId` |

## C. Dashboard & Overview

| Action | Method | Endpoint |
|--------|--------|----------|
| Dashboard overview | GET | `/api/v1/sathi/dashboard/overview` |
| Loan stats | GET | `/api/v1/sathi/dashboard/loans` |
| Insurance stats | GET | `/api/v1/sathi/dashboard/insurance` |
| Farmers with coaching priority | GET | `/api/v1/sathi/dashboard/farmers` |

## D. Farmer Management

| Action | Method | Endpoint |
|--------|--------|----------|
| Check if farmer exists | GET | `/api/v1/farmer/check?mobile=` |
| List my farmers | GET | `/api/v1/choice/intermediaries/:choiceId/assigned-farmers` |
| Get farmer detail | GET | `/api/v1/choice/intermediaries/:choiceId/farmers/:farmerId` |
| Register new farmer | POST | `/api/v1/farmer/register` |
| Assign farmer to me | POST | `/api/v1/choice/intermediary/:intermediaryId/assign/:farmerId` |
| Update farmer profile | POST | `/api/v1/sathi/assist/data-entry` |
| Record consent | POST | `/api/v1/sathi/farmer/:farmerId/consents` |
| Get consents | GET | `/api/v1/sathi/farmer/:farmerId/consents` |
| Field verification | POST | `/api/v1/sathi/field-verifications` |
| Get field verifications | GET | `/api/v1/sathi/field-verifications/:farmerId` |
| Get loan readiness + TRUST band | GET | `/api/v1/readiness/:farmerId` ⚠ band label only, no numeric score |

## E. Tasks & Visits

| Action | Method | Endpoint |
|--------|--------|----------|
| Get my tasks | GET | `/api/v1/sathi/agent/:agentId/tasks` |
| Get task detail | GET | `/api/v1/sathi/tasks/:taskId` |
| Start task / GPS check-in | POST | `/api/v1/sathi/tasks/:taskId/start` |
| Update task in progress | POST | `/api/v1/sathi/tasks/:taskId/update` |
| Complete task | POST | `/api/v1/sathi/tasks/:taskId/complete` |
| Get evidence bundle | GET | `/api/v1/sathi/evidence/:bundleId` |

## F. ROOTS Verification (S36)

| Action | Method | Endpoint |
|--------|--------|----------|
| Create ROOTS verification task | POST | `/api/v1/sathi/roots-verification` |
| Get verification checklist config | GET | `/api/v1/sathi/roots-verification/:taskId/checklist` |
| Assisted workband data entry | POST | `/api/v1/roots/tasks/:taskId/execute` |
| Assisted entry (legacy wrapper) | POST | `/api/v1/sathi/roots-verification/:taskId/assisted-entry` |
| Submit field verification | POST | `/api/v1/sathi/roots-verification/:taskId/complete` |
| Get farmer active cycles | GET | `/api/v1/roots/cycles?farmerId=` |

## G. Assist Flows

| Action | Method | Endpoint |
|--------|--------|----------|
| Initiate loan for farmer | POST | `/api/v1/sathi/assist/loan` |
| Initiate insurance for farmer | POST | `/api/v1/sathi/assist/insurance` |
| Get eligible loan products | GET | `/api/v1/dice/products?farmerId=` |
| Get farmer eligibility | GET | `/api/v1/dice/eligibility?farmerId=` |

## H. Commissions & Incentives

| Action | Method | Endpoint |
|--------|--------|----------|
| Get commission ledger | GET | `/api/v1/sathi/commissions?period=YYYY-MM` |
| Get incentive ledger & progress | GET | `/api/v1/sathi/incentives` |
| Get performance KPIs | GET | `/api/v1/choice/intermediaries/:choiceId/performance?month=&year=` |

## I. Issues & Nudges

| Action | Method | Endpoint |
|--------|--------|----------|
| List issues | GET | `/api/v1/sathi/issues` |
| Raise issue | POST | `/api/v1/sathi/issues` |
| Update issue | PATCH | `/api/v1/sathi/issues/:issueId` |
| List nudges | GET | `/api/v1/sathi/nudges` |
| Schedule nudge | POST | `/api/v1/sathi/nudges` |

## J. Offline Sync

| Action | Method | Endpoint |
|--------|--------|----------|
| Push sync queue | POST | `/api/v1/sathi/sync` |
| Resolve conflict | POST | `/api/v1/sathi/sync/conflicts/:conflictId/resolve` |

## K. Location (LGD)

| Action | Method | Endpoint |
|--------|--------|----------|
| List states | GET | `/api/v1/location/states` |
| List districts | GET | `/api/v1/location/districts?stateId=` |
| List blocks | GET | `/api/v1/location/blocks?districtId=` |
| List villages | GET | `/api/v1/location/villages?blockId=` |

---

## Complete Screen Flow Diagram

```
[Splash S1]
  ├── New user → [Phone Login S2] → [OTP S3] → [MPIN Setup S4]
  │                                              → [Profile Onboard S6]
  │                                              → [KYC Upload S7]
  │                                              → [Success S8]
  │                                              → [Home S9]
  │
  └── Returning → [MPIN Login S5] → [Home S9]
                                      │
              ┌───────────────────────┼──────────────────────┐
              ▼                       ▼                      ▼
        [Home Tab S9]         [Schedule Tab S10]      [Profile Tab S11]
              │                       │                      │
        My Farmers ─────────── [Farmer List S12]     Commissions → S28
        Action Req ─────────── [Task Detail S20]     Incentives → S29
        Today Visits ──────────── Start → S21        Issues → S30
        Incentive → S29            Checklist → S22   Nudges → S32
                                   Evidence → S23    Sync → S35
                                   Complete → S24
              │
        [Farmer List S12]
              │
        [Farmer Detail S13]
              ├── [Assist Loan S25]
              ├── [Assist ROOTS S26]
              ├── [Assist KYC S27]
              ├── [Raise Issue S31]
              └── [Schedule Nudge S33]

        [Add Farmer]
         S14 → S15 → S16 → S17 → S18 → S19

        [Schedule Tab S10]
          └── ROOTS Alerts Banner → [ROOTS Field Verification S36]
                                        ├── Tab 1: Farmer ROOTS Data + Assisted Entry
                                        └── Tab 2: Field Verification → Submit → S10
```

---

## Empty States Summary

| Screen | Trigger | Empty State Text | CTA |
|--------|---------|-----------------|-----|
| S9 My Farmers card | 0 farmers | "अभी कोई किसान नहीं जोड़ा" | + पहला किसान जोड़ें |
| S9 Today's Visits | No tasks today | "आज कोई विज़िट नहीं" | — |
| S9 Action Required | All clear | "कोई लंबित कार्य नहीं!" | — |
| S10 Schedule | No tasks on date | "इस दिन कोई विज़िट नहीं" | विज़िट जोड़ें |
| S12 Farmer List | 0 farmers | "पहला किसान जोड़ें" | + किसान जोड़ें |
| S12 Search | No match | "कोई किसान नहीं मिला" | — |
| S13 Readiness / Gap Areas | All gaps resolved | "✅ सभी जानकारी पूरी है — ऋण के लिए तैयार" | — |
| S13 Pending Tasks | All tasks done | "कोई लंबित कार्य नहीं ✅" | — |
| S13 ROOTS Data | Never entered | "फसल डेटा अभी तक नहीं" | सहायता करें → |
| S13 Loans | No loans | "कोई सक्रिय ऋण नहीं" | ऋण खोजें → |
| S22 Checklist | App resume | Resumes from last auto-saved item | — |
| S28 Commissions | 0 events | "इस महीने कोई कमाई नहीं" | किसान जोड़ें |
| S29 Incentives | New Sathi | "100 किसानों का लक्ष्य पूरा करें" | किसान जोड़ें |
| S30 Issues | All resolved | "कोई समस्या नहीं ✅" | — |
| S32 Nudges | None sent | "अभी कोई नज नहीं भेजा" | नज भेजें |
| S34 Notifications | All read | "कोई नई सूचना नहीं" | — |
| S35 Sync Queue | All synced | "सब सिंक हो गया ✅" | — |
| S36 ROOTS Verify | No active cycles | "कोई सक्रिय फसल चक्र नहीं" | नया चक्र शुरू करें → S26 |

---

## Offline-First Rules

1. **Always cached locally:** My farmers list, today's tasks, farmer profiles (last 50 accessed)
2. **Queued when offline:** Task start/complete, consent records, evidence uploads, field verifications, notes
3. **Online-only:** KYC submission, new farmer registration (Aadhaar verification), loan initiation
4. **Sync indicator:** Always visible — red dot (offline/pending), green dot (synced)
5. **Conflict priority:** Server wins by default for financial data; client wins for notes/photos

## Error States (Global)

| Scenario | Toast / Screen |
|----------|---------------|
| No network | Offline banner (persistent, yellow strip at top) |
| Token expired | Redirect to MPIN login, preserve navigation state |
| API 500 | "कुछ गड़बड़ है। पुनः प्रयास करें" + Retry button |
| API 403 | "आपको यह देखने की अनुमति नहीं" |
| GPS denied | "GPS चालू करें — Settings → Location" prompt |
| Upload failed | Per-upload retry button + "बाद में सिंक होगा" fallback |
| Camera denied | "Camera अनुमति दें — Settings → Camera" |
