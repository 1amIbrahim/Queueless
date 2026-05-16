# QueueLess — Project Plan
**Smart Hospital Queue Management | Lahore, Pakistan | HCI 2026**

---

## Overview

QueueLess solves two compounding problems Pakistani hospital patients face:

1. **Before leaving home** — no way to know which hospital is busy right now
2. **After arriving** — no real-time queue visibility, no notifications

The solution is a **unified token system**: every token — whether booked through the app or issued at the reception desk for a walk-in — flows through one system. This makes queue counts accurate, which makes the core feature possible: a **real-time multi-hospital comparison screen** showing live wait times before the patient even leaves home.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Mobile App | React Native + Expo | Cross-platform iOS/Android; Expo simplifies builds and testing |
| Web Dashboard | React + Vite + TypeScript | Fast setup; runs in browser for receptionist/admin desks |
| Backend API | Node.js + Express + TypeScript | Fast to build; strong real-time and middleware support |
| Database | PostgreSQL via Supabase | Relational model fits queues perfectly; free hosted tier |
| Real-time | Supabase Realtime | Live queue updates pushed to all clients — no manual websocket code |
| Auth | Supabase Auth | JWT-based; role system: patient / receptionist / doctor / admin |
| Notifications | Twilio SMS + WhatsApp API | #1 requested feature in survey; Twilio covers both channels |
| Maps | Google Maps API + expo-location | Sort hospitals by real GPS distance |
| State Management | Zustand | Lightweight; no boilerplate |
| Styling (Mobile) | NativeWind (Tailwind for RN) | Rapid UI; consistent with web Tailwind |
| Styling (Web) | Tailwind CSS | Utility-first; fast to iterate |

---

## Repository Structure

```
queueless/
├── apps/
│   ├── mobile/              # Expo React Native — patient + doctor app
│   └── web/                 # Vite React — receptionist + admin dashboard
├── packages/
│   ├── api/                 # Express + TypeScript backend
│   └── shared/              # Shared TypeScript types (used by all three apps)
├── supabase/
│   ├── schema.sql           # All tables, enums, RLS policies, Realtime config
│   └── seed.sql             # 5 Lahore hospitals, 11 doctors, sample queues
├── package.json             # Root — npm workspaces
├── .gitignore
└── README.md
```

---

## Database Tables

| Table | Purpose |
|---|---|
| `users` | Extends Supabase auth — stores role, name, phone, hospital_id |
| `hospitals` | Name, GPS coordinates, address, phone |
| `departments` | Belongs to a hospital; has a specialty (general, cardiology, etc.) |
| `doctors` | Belongs to a hospital + department; stores working hours as JSON |
| `queues` | One per doctor per day; tracks status (open/paused/closed) and avg time per patient |
| `tokens` | Each token belongs to a queue; type = app or walkin; status = waiting/called/completed/no_show/cancelled |
| `appointments` | Links a token to a patient, doctor, and hospital |
| `notifications` | Log of every SMS/WhatsApp sent, with delivery status |

---

## User Roles & Interfaces

| Role | Interface | Primary Actions |
|---|---|---|
| **Patient** | Mobile app | Browse hospital comparison screen, book/join queue, track live position, receive alerts |
| **Receptionist** | Web dashboard | Issue walk-in tokens (one tap), print receipts, monitor live queues |
| **Doctor** | Mobile app (same app, different role view) | Tap "Next Patient" to advance queue |
| **Admin** | Web dashboard (same app, different role view) | Monitor all doctors/queues, manage doctors, view analytics |

---

## API Endpoints

| Method | Endpoint | Who calls it | What it does |
|---|---|---|---|
| GET | `/hospitals/nearby?lat&lng&radius_km&specialty` | Patient app | Returns hospitals sorted by distance + live wait time |
| GET | `/hospitals/:id/queues` | Patient app, Admin | Returns all queues for a hospital with live token counts |
| POST | `/queues` | Doctor, Admin | Creates a queue for today |
| PATCH | `/queues/:id` | Admin, Receptionist | Updates queue status or avg time per patient |
| GET | `/queues/:id` | Receptionist, Doctor | Full queue state + waiting tokens |
| POST | `/tokens` | Patient, Receptionist | Issues a new token (app booking or walk-in) |
| GET | `/tokens/:id/position` | Patient | Returns live position + estimated wait |
| PATCH | `/tokens/:id/cancel` | Patient, Receptionist | Cancels a token |
| POST | `/tokens/call-next` | Doctor | Advances the queue; marks next token as "called" |
| POST | `/notifications/send` | System (triggered at position 3) | Sends SMS + WhatsApp via Twilio |

---

## Phases

---

### Phase 1 — Foundation ✅
**Duration:** Week 1
**Status:** Complete

Everything needed for the team to start building in parallel.

**Delivered:**
- Monorepo with npm workspaces (`apps/mobile`, `apps/web`, `packages/api`, `packages/shared`)
- All `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.js` files
- Shared TypeScript types (`packages/shared/src/types.ts`) — full shapes for all DB tables + API request/response objects
- Full Supabase schema (`supabase/schema.sql`) — all tables, enums, Row Level Security policies, Realtime enabled on `tokens` and `queues`
- Seed data (`supabase/seed.sql`) — 5 real Lahore hospitals, 11 doctors across specialties, sample queues with varying wait times
- All `.env.example` files for each app
- `README.md` with full setup guide

---

### Phase 2 — Backend API
**Duration:** Week 2
**Status:** Scaffolded — needs `npm install` and `.env` setup

The backend is already written. What remains is wiring it to a real Supabase project and testing every endpoint.

**Checklist:**
- [ ] Create Supabase project, run `schema.sql` then `seed.sql`
- [ ] Copy Supabase URL + service key into `packages/api/.env`
- [ ] Run `npm install` in `packages/api` and start the dev server
- [ ] Test `GET /hospitals/nearby` returns the 5 seeded hospitals sorted by wait time
- [ ] Test `POST /tokens` creates a token and returns position + ETA
- [ ] Test `POST /tokens/call-next` advances the queue and updates token status
- [ ] Test `GET /tokens/:id/position` returns correct position
- [ ] (Optional) Create a Postman collection for the full API

**Files:**
- [packages/api/src/index.ts](packages/api/src/index.ts)
- [packages/api/src/routes/hospitals.ts](packages/api/src/routes/hospitals.ts)
- [packages/api/src/routes/tokens.ts](packages/api/src/routes/tokens.ts)
- [packages/api/src/routes/queues.ts](packages/api/src/routes/queues.ts)
- [packages/api/src/routes/notifications.ts](packages/api/src/routes/notifications.ts)

---

### Phase 3 — Patient Mobile App
**Duration:** Weeks 3–4
**Status:** Pending

The patient-facing React Native app. The comparison screen is the **Core USP** — build it first.

**Screens to build:**

#### 1. Onboarding / Auth
- Sign up (name, phone, password) and login
- Role is set to `patient` by default

#### 2. Comparison Screen (Home Tab) ← Build first
- **Nearby tab (default):** List of hospitals sorted by distance + current min wait time
  - Each card: hospital name, distance, specialty badges, wait time chip, queue count
  - Live wait numbers update via Supabase Realtime subscription
  - Pull-to-refresh
- **By Specialty tab:** Specialty picker (general, cardiology, dermatology…) or symptom text field → shows matching doctors across all hospitals ranked by wait time
- Empty state when no hospitals found within radius
- Loading skeletons while data fetches

#### 3. Hospital Detail
- Hospital name, address, phone, map pin
- List of doctors: name, specialty, queue length, estimated wait
- "Join Queue" button per doctor → issues an app token → navigates to My Token screen

#### 4. My Token
- Large token number display
- Live position in queue (e.g., "3rd in line")
- Estimated wait time countdown
- Progress bar or visual indicator
- "You're next!" alert state
- "Cancel" button
- Updates in real-time via Supabase Realtime

#### 5. Booking History
- List of past and active appointments
- Doctor name, hospital, date, token number, status badge

**Realtime pattern:**
```ts
supabase
  .channel('queue-updates')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tokens' }, handler)
  .subscribe()
```

**Files to create:**
- `apps/mobile/app/(tabs)/index.tsx` — Comparison screen
- `apps/mobile/app/hospital/[id].tsx` — Hospital detail
- `apps/mobile/app/token/[id].tsx` — My Token live view
- `apps/mobile/app/history.tsx` — Booking history
- `apps/mobile/store/authStore.ts` — Zustand auth store
- `apps/mobile/store/queueStore.ts` — Zustand queue + realtime store
- `apps/mobile/lib/supabase.ts` — Supabase client

---

### Phase 4 — Receptionist Web Dashboard
**Duration:** Week 5
**Status:** Pending

The web interface used at the hospital front desk. Optimised for speed — the receptionist must issue a token in under 5 seconds.

**Pages to build:**

#### 1. Login
- Email + password login (Supabase Auth)
- Redirects to Token Generator on success

#### 2. Token Generator (main screen)
- Large "Issue New Token" button — dominant on screen
- Optional fields: patient name, patient phone
- Doctor selector (dropdown showing doctors at this hospital, with live queue length next to each name)
- On submit: calls `POST /tokens` with type `walkin` → shows receipt modal
- Receipt modal: token number, doctor name, estimated wait, hospital name, QR code (links to live position tracker URL)
- Print button (triggers `window.print()` or `expo-print`)

#### 3. Live Queue Monitor
- Cards for each doctor at this hospital
- Each card: doctor name, specialty, tokens waiting, current token being seen, queue status badge
- Updates live via Supabase Realtime
- Mark No-Show button per token
- Pause / Resume queue button per doctor

#### 4. Queue Management
- Table of all tokens for today (filterable by doctor, status)
- Actions: cancel token, move token, mark no-show

**Files to create:**
- `apps/web/src/pages/Login.tsx`
- `apps/web/src/pages/TokenGenerator.tsx`
- `apps/web/src/pages/QueueMonitor.tsx`
- `apps/web/src/pages/QueueManagement.tsx`
- `apps/web/src/components/ReceiptModal.tsx`
- `apps/web/src/components/DoctorQueueCard.tsx`
- `apps/web/src/lib/supabase.ts`
- `apps/web/src/store/authStore.ts`

---

### Phase 5 — Doctor Interface
**Duration:** Weeks 5–6
**Status:** Pending

The doctor view inside the same mobile app (role-based navigation). Minimal by design — doctors have seconds between patients.

**Screens to build:**

#### 1. My Queue
- Current patient being seen (token number + name if available)
- Large **"Next Patient →"** button — calls `POST /tokens/call-next`
- Queue of upcoming patients (first 5 tokens shown)
- Today's stats: patients seen, avg time per patient

#### 2. Queue Setup (shown if no queue exists for today)
- "Open Queue for Today" button → calls `POST /queues`
- Set average time per patient (slider: 5–30 min)

#### 3. Queue Control
- Pause / Resume queue toggle
- Close queue for the day

**Key UX:** The Next Patient button must be impossible to miss — full-width, high contrast, large text. It is the doctor's entire interaction with the app during a working day.

**Files to create:**
- `apps/mobile/app/doctor/queue.tsx` — main doctor screen
- `apps/mobile/app/doctor/setup.tsx` — queue setup

---

### Phase 6 — WhatsApp & SMS Notifications
**Duration:** Week 6
**Status:** Pending

Patients get alerted when they are 3 patients away. No internet required for SMS — critical for Pakistan.

**How it works:**
1. Every time `POST /tokens/call-next` is called, the API checks all waiting tokens in that queue
2. Any token at position 3 triggers `POST /notifications/send`
3. Twilio sends SMS and/or WhatsApp to `patient_phone`
4. Delivery is logged in the `notifications` table

**Message format:**
> "Your token #12 at Services Hospital (Dr. Imran Khalid) is 2 patients away. Est. wait: 16 min. — QueueLess"

**Setup steps:**
- [ ] Create Twilio account, get Account SID + Auth Token
- [ ] Get a Twilio phone number for SMS
- [ ] Join Twilio WhatsApp sandbox (for dev) or apply for WhatsApp Business (for prod)
- [ ] Add Twilio credentials to `packages/api/.env`
- [ ] Test end-to-end: issue token → drain queue → confirm SMS arrives at position 3

**Files:**
- [packages/api/src/routes/notifications.ts](packages/api/src/routes/notifications.ts) ← already written

---

### Phase 7 — Admin Dashboard
**Duration:** Week 7
**Status:** Pending

Hospital admin view, accessed via the same web app (role-based routing). Focuses on monitoring and management.

**Pages to build:**

#### 1. Hospital Overview
- Total patients seen today
- Active queues count
- Busiest doctor right now
- Alerts: queues with >20 patients waiting

#### 2. Doctor Management
- Add / edit / deactivate doctors
- Set specialty, department, working hours
- Assign doctors to departments

#### 3. Queue Control Panel
- All queues for today across all departments
- Actions: open, pause, close, reassign patients to another doctor

#### 4. Analytics
- Charts (via Recharts):
  - Peak hours heatmap (hour of day vs. patient volume)
  - Average wait time by doctor over last 7 days
  - Busiest departments bar chart
- Date range picker to filter historical data

**Files to create:**
- `apps/web/src/pages/admin/Overview.tsx`
- `apps/web/src/pages/admin/Doctors.tsx`
- `apps/web/src/pages/admin/QueueControl.tsx`
- `apps/web/src/pages/admin/Analytics.tsx`

---

### Phase 8 — Polish, Testing & HCI Deliverables
**Duration:** Weeks 8–9
**Status:** Pending

**Performance:**
- Comparison screen initial load < 2 seconds
- Token position updates within 500ms of doctor tapping Next
- Add loading skeletons everywhere data is async

**UX polish:**
- Empty states: no hospitals nearby, no active queue, no history
- Error states: network failure, Supabase offline
- Onboarding flow for first-time patients (2–3 screens explaining the app)
- Consistent icon set throughout (Expo Vector Icons)

**Accessibility:**
- Minimum tap target: 44×44pt on all buttons
- High contrast for wait time chips (red > 30 min, yellow 10–30 min, green < 10 min)
- Large font option respected via system accessibility settings

**HCI Deliverables:**
- [ ] Conduct 3–5 usability tests using the working prototype (not Figma)
- [ ] Record sessions (with consent) — note where users hesitate or make errors
- [ ] Iterate: fix top 3 pain points found in testing
- [ ] Export final Figma documentation of all screens for submission
- [ ] Write usability testing report: methodology, findings, iterations made

---

## Milestone Summary

| Week | Phase | Key Deliverable |
|---|---|---|
| 1 | Foundation | Monorepo, DB schema, shared types, seed data ✅ |
| 2 | Backend API | All endpoints live and tested against Supabase |
| 3–4 | Patient Mobile App | Comparison screen working with live Supabase data |
| 5 | Receptionist Web | Token generation + receipt printing |
| 5–6 | Doctor Interface | Next Patient button advances queue in real-time |
| 6 | Notifications | SMS + WhatsApp firing via Twilio |
| 7 | Admin Dashboard | Overview, analytics, doctor management |
| 8–9 | Polish + Testing | Usability tests done, HCI report written |

---

## End-to-End Test Scenarios

These should all work before submission:

| Scenario | Steps | Expected result |
|---|---|---|
| Queue comparison | Open patient app, view Nearby tab | 5 hospitals shown, sorted by wait time, numbers match seed data |
| Walk-in token | Receptionist taps "Issue Token", submits | Token created, receipt shown with number + ETA, queue count increments on patient's comparison screen |
| App booking | Patient taps "Join Queue" on Hospital Detail | Token issued, My Token screen shows live position |
| Doctor advances queue | Doctor taps "Next Patient" | Called token status → called; next waiting token's position decrements on patient's phone in real-time |
| SMS notification | Patient at position 3, doctor taps Next | SMS arrives on patient_phone within 30 seconds |
| Receipt QR code | Scan QR on printed receipt | Browser opens live position tracker showing correct token info |
| Admin analytics | Admin opens Analytics page | Charts show today's patient volume and wait time data |

---

## Environment Variables Reference

### `packages/api/.env`
```
PORT=4000
CORS_ORIGIN=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE=+1234567890
TWILIO_WHATSAPP_NUMBER=+14155238886
```

### `apps/web/.env`
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
VITE_API_URL=http://localhost:4000
```

### `apps/mobile/.env`
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
EXPO_PUBLIC_API_URL=http://localhost:4000
EXPO_PUBLIC_GOOGLE_MAPS_KEY=your-google-maps-api-key
```
