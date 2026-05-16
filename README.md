# QueueLess
**Smart Hospital Queue Management — Lahore, Pakistan**

> Every token. Every hospital. One screen.

---

## What it is

QueueLess is a mobile-first app that lets patients see **live wait times across multiple nearby hospitals before leaving home**, then track their queue position in real-time after they arrive. Walk-in patients who never use the app are still counted — the receptionist issues their token through the same system, so queue numbers are always accurate.

---

## Monorepo Structure

```
queueless/
├── apps/
│   ├── mobile/          # Expo React Native — patient + doctor app
│   └── web/             # Vite React — receptionist + admin dashboard
├── packages/
│   ├── api/             # Express + TypeScript backend
│   └── shared/          # Shared TypeScript types (used by all three)
├── supabase/
│   ├── schema.sql        # Run first — creates all tables + RLS policies
│   └── seed.sql          # Run second — 5 Lahore hospitals, 11 doctors, sample queues
└── package.json          # Root (npm workspaces)
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Mobile app | React Native + Expo |
| Web dashboard | React + Vite + TypeScript |
| Backend API | Node.js + Express + TypeScript |
| Database | PostgreSQL via Supabase |
| Real-time | Supabase Realtime (live queue updates) |
| Auth | Supabase Auth (JWT, role-based) |
| Notifications | Twilio SMS + WhatsApp |
| Maps | Google Maps API + expo-location |
| State | Zustand |
| Styling | Tailwind CSS / NativeWind |

---

## Setup

### 1. Prerequisites

- Node.js 18+
- A free [Supabase](https://supabase.com) account
- (Optional) [Twilio](https://twilio.com) account for notifications

### 2. Database

1. Create a new Supabase project
2. In the Supabase dashboard → **SQL Editor**, run:
   - `supabase/schema.sql` (creates all tables, enums, RLS policies, realtime)
   - `supabase/seed.sql` (inserts 5 Lahore hospitals, 11 doctors, sample queues)
3. Go to **Settings → API** and copy your:
   - Project URL
   - `service_role` secret key (for the API)
   - `anon` public key (for the mobile/web apps)

### 3. API

```bash
cd packages/api
cp .env.example .env
# Fill in SUPABASE_URL and SUPABASE_SERVICE_KEY
npm install
npm run dev        # starts on http://localhost:4000
```

### 4. Web dashboard (Receptionist / Admin)

```bash
cd apps/web
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev        # starts on http://localhost:5173
```

### 5. Mobile app

```bash
cd apps/mobile
cp .env.example .env
# Fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
npm install
npx expo start     # scan QR with Expo Go on your phone
```

---

## User Roles

| Role | Interface | Key action |
|---|---|---|
| **Patient** | Mobile app | See live hospital comparison, book/join queue, track position |
| **Receptionist** | Web dashboard | Issue tokens for walk-ins (one tap → receipt prints) |
| **Doctor** | Mobile app | Tap "Next Patient" to advance the queue |
| **Admin** | Web dashboard | Monitor all queues, manage doctors, view analytics |

---

## Key Features

- **Multi-hospital comparison screen** — default view sorted by distance + live wait time
- **Unified token system** — walk-in tokens and app bookings in the same queue
- **Real-time queue position** — updates instantly via Supabase Realtime
- **WhatsApp + SMS alerts** — notified when 3 patients away (no internet needed for SMS)
- **Receipt printing** — walk-in patients get a paper slip with QR code to track queue in browser
- **Specialty / symptom search** — find doctors across all hospitals by specialty

---

## Development Phases

| Phase | Week | Status |
|---|---|---|
| 1 — Foundation | 1 | ✅ Monorepo, DB schema, shared types |
| 2 — Backend API | 2 | 🔨 In progress |
| 3 — Patient mobile app | 3–4 | Pending |
| 4 — Receptionist web | 5 | Pending |
| 5 — Doctor interface | 5–6 | Pending |
| 6 — Notifications | 6 | Pending |
| 7 — Admin dashboard | 7 | Pending |
| 8 — Polish + usability testing | 8–9 | Pending |

---

## HCI Project — FAST NUCES Lahore, 2026

Survey: 33 respondents in Lahore. 67% would use a queue app. 39% have left a hospital due to long queues. 82% never receive queue notifications.
