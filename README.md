# AIbooking Clinic – AI receptionist for clinics

Sales demo **and** platform foundation for AIbooking Clinic: an AI receptionist that answers the clinic's phone and a voice/chat widget on the website – and **books, rebooks and cancels appointments, explains prices and insurance** straight into the clinic's calendar.

> **Your clinic answers every call – even when you're with a client.**

Built on the same concept and architecture as [AIbooking Restaurant](https://github.com/MagnoraMarketing/Restaurant-), re-designed and re-written for clinics. First version is in **English**.

## Clinic types (7)

| Type | Demo clinic | Typical calls the AI handles |
| --- | --- | --- |
| 💆 Massage clinic | `calm-hands` | Right massage & length, therapist, insurance cover, gift cards |
| ✂️ Hair salon | `studio-nord` | Cut/colour with the right duration & stylist, from-prices, patch tests |
| 🦴 Chiropractor | `align-chiro` | Acute same-day slots, first consultations, subsidy, referral questions |
| 🏃 Physiotherapy | `movewell-physio` | Assessments & follow-ups, referral/subsidy, insurance (Tryg, Skandia …) |
| 🦷 Dental clinic | `smile-dental` | Emergency appointments, check-ups, hygienist, new patients (approved by clinic) |
| 🌸 Beauty & skin clinic | `glow-skin` | Facials, peels, lashes, downtime questions, free consultations |
| 🦶 Podiatry | `step-foot` | Regular foot care, diabetic feet with referral, ingrown toenails |

## What's included

| Area | Where |
| --- | --- |
| Home page: example clinic website with live AI receptionist, the 4 call types, 7 solutions, backend preview, pricing, clinic types, integrations & API | `/` |
| Header with **Solutions** and **Clinic types** mega menus | `src/components/site/SiteHeader.tsx` |
| 7 clinic-type pages with animated call, price list, team and booking rules | `/clinics/[type]` |
| 7 demo clinics (multi-tenant) – own website, treatments & prices, team, FAQ | `/demo`, `/demo/[slug]` |
| Online booking (treatment → practitioner → date → free times) | `/demo/[slug]/book` |
| Self-service rebooking & cancellation (reference + phone) | `/demo/[slug]/manage` |
| NFC review chip (fixed address, target managed in admin) | `/r/[slug]` |
| Backend: dashboard, calls & voice (simulate booking/rebooking/cancellation calls), day calendar per practitioner with change log, services & prices, team working days, clients, QR & NFC, integrations, AI receptionist (incl. call-forwarding codes and embed code) | `/admin` |
| Partner programme with earnings calculator | `/partner` |
| REST API | `src/app/api` |
| Supabase schema (multi-tenant + RLS + no-double-booking constraint) and seed | `supabase/` |

### Pricing (shown on the home page and in "Book a demo")
Defined in one place: `src/lib/demo/catalog.ts` → `PRICES`.

| Item | Price |
| --- | --- |
| Clinic website with price list & booking | from €200 |
| AIbooking platform | €50 / month |
| Import of your price list & services | €100 |
| Calendar / practice system integration | from €150 |
| QR code for print | €30 per piece |
| NFC review chip | €30 per piece |
| AI minutes · Starter (phone + voice widget) | €134 / 150 min |
| AI minutes · Clinic | €329 / 400 min |
| AI minutes · Busy clinic | €749 / 1,000 min |

Partners get 50 % of the sale and 50 % of the subscription (`PARTNER_SHARE`).

## Getting started

```bash
npm install
cp .env.example .env.local   # everything is optional – without keys it all runs in demo mode
npm run dev                  # http://localhost:3000
npm run build                # production build (typecheck included)
npm run test:assistant       # smoke test: real booking, rebooking & cancellation conversations
```

Without environment variables the app runs in **demo mode**: in-memory data with demo appointments and calls, open admin, and the AIbooking "Clinic" voice agent (`widget.js`, `data-widget-id="NuQB1HFdM8Q3MI"`). Set `NEXT_PUBLIC_AIBOOKING_WIDGET_URL=` (empty) to use the built-in English demo receptionist instead (chat + voice via the browser's Web Speech API, `en-GB`).

## Focus: inbound calls & the AI voice widget

Both channels use the same flows and the same API, so a client can book by phone and move the appointment in the widget (or the other way round):

| Flow | What happens |
| --- | --- |
| **Booking** | Understands the treatment ("60 min deep tissue", "men's cut", "toothache"), preferred practitioner, day and time of day ("tomorrow afternoon") → offers real free times → name + phone → confirms. New patients can require clinic approval (`pending`). |
| **Rebooking** | Finds the appointment by reference + phone (AIbooking Voice may use caller ID) → offers new times with the same practitioner, or anyone qualified → moves it and logs the change. |
| **Cancellation** | Checks the cancellation window → explains the late fee if it applies and offers to move instead → cancels and frees the slot. |
| **Prices & questions** | Prices and durations from the price list, insurance/subsidy/referral info, opening hours, address, parking, payment, team and the clinic's own FAQ. |

The scheduling engine (`src/lib/hours.ts`) is shared by the server, the website and the AI: treatment durations, buffers between clients, practitioners' working days, min. notice and max. days ahead. The server re-checks every booking and rebooking, and in Supabase an exclusion constraint makes double-booking a practitioner impossible.

## Languages

The site follows the visitor's browser language (`Accept-Language`) and falls back to English. Visitors can switch between **English, Español, Deutsch and العربية** in the header, footer or clinic pages; the choice is stored in the `lang` cookie. Arabic is rendered right-to-left with Noto Sans Arabic.

- UI text is written in English and wrapped in `t("…")` (`useT()` in client components, `await getT()` in server components). Dates, prices and durations use the locale-aware helpers in `src/lib/format.ts`.
- Translations live in `scripts/i18n/tr*.py` as `(English, Spanish, German, Arabic)` rows. After changing UI text run:
  ```bash
  python3 scripts/i18n/extract.py   # collect every English string → scripts/i18n/keys.json
  python3 scripts/i18n/build.py     # write src/lib/i18n/dict/{es,de,ar}.ts and list untranslated keys
  ```
  Missing keys fall back to English (names, addresses and brands are intentionally left untranslated).
- The external AIbooking widget and the Vapi assistant set their own language in their dashboards; the built-in demo receptionist answers in English.

## Architecture

```
Channels                     AIbooking Clinic                         The clinic's systems
────────                     ────────────────                         ────────────────────
Phone (AI Voice) ────┐
Voice/chat widget ───┤       GET  /api/availability ┐                 ┌─ AIbooking Calendar (/admin)
Website booking ─────┼─────► POST /api/appointments ├─ services.ts ───┼─ Cal.com (→ Google/Outlook)
QR at reception ─────┤       PATCH /api/appointments/:id  (rules,     ├─ Practice/journal system (HMAC webhook)
Practice system ─────┘       POST /api/webhooks, /api/calls  buffers) ├─ SMS confirmations
                                                                      └─ Custom API
```

- **`src/lib/server/services.ts`** – all business logic (availability, booking, rebooking, cancellation policy, lookup, call log). AI Voice can send names ("deep tissue", "Sofie") instead of ids.
- **`src/lib/hours.ts`** – opening hours + scheduling engine (clinic time zone Europe/Copenhagen).
- **`src/lib/match.ts`** – fuzzy matching of free text to services and practitioners.
- **`src/lib/server/repository/`** – `memory` (demo) or `supabase` (when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set). Every query filters on `clinic_id`.
- **`src/lib/server/integrations/`** – adapters for Cal.com, practice system, SMS and custom API. Failures never block a booking; everything is logged in the webhook log.
- **`src/lib/assistant/`** – the demo receptionist's English conversation engine. The real AIbooking agent replaces it via the widget configuration.

### AIbooking widget
| Variable | Effect |
| --- | --- |
| `NEXT_PUBLIC_AIBOOKING_WIDGET_URL` ends in `.js` (default) | The script is loaded with `data-widget-id` (`NEXT_PUBLIC_AIBOOKING_WIDGET_ID`, default `NuQB1HFdM8Q3MI`). Buttons on the page open it via `window.aibooking.open()` |
| `NEXT_PUBLIC_AIBOOKING_WIDGET_URL` other URL | Shown as an iframe (`?agentId=…&clinicId=…&language=en`) |
| set to empty | Built-in English demo receptionist |

Agent ids can be set per clinic (admin → AI receptionist / table `ai_agents`) and fall back to `NEXT_PUBLIC_AIBOOKING_AGENT_ID`.

### Phone line
The clinic keeps its own number and forwards calls to its AI number – e.g. `**61*<number>#` (no answer), `**67*<number>#` (busy), `**21*<number>#` (always), `##002#` (off). Shown per clinic in admin → AI receptionist.

### API

| Method | Path | Access |
| --- | --- | --- |
| GET | `/api/availability?clinicId=&serviceId=\|service=&date=[&practitionerId=\|practitioner=][&excludeAppointmentId=]` | public |
| POST | `/api/appointments` | public |
| GET | `/api/appointments?clinicId=&date=\|from=&to=` | admin |
| GET | `/api/appointments/lookup?clinicId=&reference=&phone=` | public (reference + phone) · AIbooking Voice with API key: phone only |
| GET / PATCH | `/api/appointments/:id` | PATCH: admin, or client with matching phone (`{ phone, source }`, rebook/cancel only) |
| GET / PATCH | `/api/clinics/:id` | GET public · PATCH admin |
| GET / PATCH | `/api/clinics/:id/services` | GET public (price list, team) · PATCH admin |
| PATCH | `/api/clinics/:id/practitioners` | admin |
| GET / POST | `/api/calls` | admin / AIbooking Voice |
| POST | `/api/webhooks` | signed (`X-AIbooking-Signature: t=…,v1=HMAC`) or API key. Events: `appointment.created`, `appointment.rescheduled`, `appointment.cancelled`, `call.completed` |
| GET | `/api/customers`, `/api/integrations`, `/api/webhooks` | admin |

Admin access = `DEMO_MODE=true`, admin cookie (login at `/admin/login`) or `Authorization: Bearer $ADMIN_API_KEY`.

## Supabase

1. Create a project and run `supabase/migrations/0001_init.sql` (SQL editor or `supabase db push`).
2. Run `supabase/seed.sql` for the demo clinics (generated with `npm run db:seed-sql`).
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (server-side only).

All tenant tables have `clinic_id`, and Row Level Security limits users (table `users`, linked to Supabase Auth) to their own clinic.

## Deploy on Vercel

1. Import the repo in Vercel (framework: Next.js – no extra build settings).
2. Set environment variables from `.env.example`. In production: `DEMO_MODE=false`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `ADMIN_API_KEY` and Supabase.
3. Webhooks: AIbooking Voice → `/api/webhooks` (and `/api/calls`).

> Demo mode uses an in-memory store. On Vercel it lives per serverless instance, so demo data can reset. Use Supabase for anything that must be kept.

## Security
- No keys in the code or in the browser – only `NEXT_PUBLIC_*` is sent to the client.
- Clients can only move or cancel their own appointment (reference + phone), never change its status otherwise.
- Prices, durations and availability are always recalculated on the server.

## Next steps
- Danish (and other) translations – all copy is currently plain English in the components and `src/lib/demo/*`.
