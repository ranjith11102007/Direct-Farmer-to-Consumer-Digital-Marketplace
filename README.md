  # Vaikkal — Farm-to-Home Digital Marketplace

A production-ready agricultural marketplace connecting farmers and Farmer Producer
Organizations (FPOs) directly with households, retailers, hotels, restaurants,
institutions, and bulk buyers across Tamil Nadu.

> **Demo environment.** All seeded records are clearly labelled demo data with a
> demo-mode badge. No simulated transactions are presented as real.

**Brand:** Vaikkal (வைக்கல் — harvest / farmyard in Tamil). Original branding,
clean white layout, agricultural green identity, Tamil + English localization.

---

## Architecture

```
┌─ Web / Mobile clients ─────────────────────────────┐
│  Next.js 14 (App Router, React, TypeScript,        │
│  Tailwind CSS, zustand, React Query)               │
└──────────────────────┬─────────────────────────────┘
                       │ REST (JSON)  localhost:3000
┌──────────────────────▼─────────────────────────────┐
│  FastAPI gateway  (CORS, auth, RBAC, rate-limit)   │
│  ┌────────┬────────┬─────────┬────────┬──────────┐ │
│  │Auth    │Product │ Orders/ │ Bulk / │ Delivery │ │
│  │/Users  │Market  │ Payment │ FPO    │ /Logistic│ │
│  └────────┴────────┴─────────┴────────┴──────────┘ │
│  AI services: demand forecast, route optimization, │
│  price simulator, food-loss warnings, recs         │
└──────┬──────────────────────────────┬──────────────┘
       │ PostgreSQL 16                │ Redis 7
       │ (asyncpg, Alembic)           │ (cache, jobs, OTP)
```

### Stack
| Layer      | Technology |
|------------|-----------|
| Frontend   | Next.js 14, TypeScript, Tailwind CSS, zustand, React Query |
| Backend    | FastAPI, SQLAlchemy 2 (async), Pydantic v2 |
| Database   | PostgreSQL 16 (asyncpg) |
| Cache/Jobs | Redis 7 |
| AI         | NumPy, scikit-learn (Gradient Boosting), custom heuristics |
| Payments   | Provider-interface (mock in demo; Razorpay/PayU drop-in) |
| Deployment | Docker Compose |

---

## Features Implemented

### Marketplace
- Location-based shopping (GPS / manual / pincode / saved addresses)
- Full-text search with Tamil names, typo tolerance, voice-search prep
- 12 categories in English + Tamil, product cards, filters (price, distance,
  farmer/FPO, organic, grade, harvest date, packaging, rating)
- Product detail with traceability timeline, transparent price breakdown,
  farmer-share estimate, reviews
- Cart grouped by producer/collection-center, delivery-slot selection,
  incompatible-slot detection, cross-session persistence
- Checkout: address → slot → review → payment → confirmation
- Payment methods (UPI/cards/netbanking/wallet/COD-flag), webhook-signature
  validation, server-side payment verification, idempotency keys
- Order tracking timeline, invoice, refund/replacement/dispute workflow

### Roles (RBAC)
`consumer`, `farmer`, `fpo_admin`, `bulk_buyer`, `delivery_partner`,
`collection_center_operator`, `admin` — server-side authorization on every route.

### Producer & FPO Operations
- Onboarding with verification statuses (draft → submitted → under review →
  verified / rejected / re-verification required)
- Listing workflow with validation (negative qty, invalid price, missing unit,
  duplicates), batch management, quality inspection, collection centers
- Aggregation across farmers; grades/quality not silently merged
- Settlements with explicit statuses (pending/held/partial/settled/failed/
  disputed/reversed) and audit log

### Bulk Procurement
- Requirements, quotations, offer comparison, purchase orders, invoices,
  recurring schedules (daily/weekly/monthly), quality & packaging specs

### Logistics
- Delivery partners + vehicles, pickup/delivery workflow, QR + OTP
  confirmation, proof-of-delivery photos, masked calling, offline queue
- AI route planner: nearest-neighbor + 2-opt, capacity/time-window constraints,
  pickup-before-delivery, ETA, capacity utilization, optimization score

### AI (explainable, advisory)
- **Demand forecast:** moving-average baseline + day-of-week seasonality +
  gradient-boosting residual model; confidence intervals; cold-start fallback
  to category/regional data; low-data mode clearly labelled; MAE/RMSE/MAPE
  accuracy tracking; model version + generation timestamps
- **Route optimization** (above)
- **Fair-price simulator:** local market (mandi) vs direct marketplace vs bulk
  contract comparison
- **Food-loss early warning** with recommended actions
- **Recommendations** (demand alerts, shortage risk, procurement plans) with
  confidence, factors, and "advisory" disclaimers

### Traceability
- Unique batch IDs + batch numbers, tamper-evident event history, QR "trust
  passport" (source village, collection center, harvest date, grade, packing,
  handling stages, certifications), auditor-friendly event log

### Other
- Notifications (in-app/SMS/email/WhatsApp via replaceable provider interface)
- Group orders, subscriptions (weekly baskets), harvest pre-booking,
  reusable-crate loop, sustainability metrics (food miles, consolidation,
  CO₂ estimates), fraud flags, admin dashboard (real DB metrics), impact
  analytics, Tamil + English translations everywhere
- Concurrency-safe inventory via an append-only inventory ledger

---

## Getting Started

### Option A — Docker Compose (recommended)

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- API + Swagger docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

### Option B — Local development

**Backend**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
copy .env.example .env          # then edit DATABASE_URL etc.
python seed.py                  # creates tables + demo data
uvicorn app.main:app --reload   # http://localhost:8000
```

**Frontend**

```bash
cd frontend
npm install
npm run dev                     # http://localhost:3000
```

---

## Demo accounts

Seeded by `backend/seed.py`. Password for **all** accounts:
`Vaikkal@Demo123`

| Role               | Phone / Email                    |
|--------------------|----------------------------------|
| Admin              | admin@vaikkal.in                 |
| Farmer (organic)   | farmer1@vaikkal.in (Murugan)     |
| Farmer             | farmer2@vaikkal.in (Meenakshi)   |
| FPO admin          | fpo1@vaikkal.in (Kongunadu FPO)  |
| Bulk buyer (hotel) | buyer-hotel@vaikkal.in           |
| Bulk buyer (retail)| buyer-retail@vaikkal.in          |
| Delivery partner   | delivery1@vaikkal.in             |
| Consumer           | consumer1@vaikkal.in / consumer2@vaikkal.in |

Phones follow the pattern `9810000000`–`9870000001`.

> **Demo disclaimer:** All data below is seeded, simulated sample data for the
> hackathon demo environment. Payments, earnings, locations, ratings, stock and
> GPS traces in the demo are **not** real transactions.

---

## Demo walkthrough (hackathon story)

1. Log in as `farmer1@vaikkal.in` → see demand forecast cards, inventory,
   settlements.
2. Log in as `buyer-hotel@vaikkal.in` → open the daily **300 kg tomato**
   requirement → view the Kongunadu FPO quotation.
3. Log in as admin → approve users/products, review queues and the AI forecast
   dashboard, inspect the route plan for today's stops.
4. As a consumer → browse, search "தக்காளி / tomato", add to cart, checkout.
5. Traceability: every listing links to a batch passport with QR data and event
   history.

---

## Testing

Backend (with a running Postgres for integration tests):

```bash
cd backend
pytest -q                 # unit + integration tests under backend/tests
```

Frontend:

```bash
cd frontend
npm run typecheck         # tsc --noEmit
npm run lint              # next lint
npm run build             # production build
```

---

## API surface (summary)

| Area        | Endpoints |
|-------------|-----------|
| Auth        | register, send-otp, verify-otp, login, logout, refresh, me |
| Products    | categories, search, nearby, product detail, producer profile, recommendations |
| Orders      | cart, checkout, create, verify-payment, track, cancel, refund, confirm-delivery |
| Producer    | profile, verification, listings, batches, inventory, forecasts, settlements, orders |
| Bulk        | requirements, quotations, compare, accept, purchase-orders |
| Delivery    | partner registration, routes, stop updates, pickup/delivery confirm |
| Admin       | dashboard metrics, verification/product queues, analytics, settlements |
| AI          | forecast (generate/get), recommendations, route plan, price simulator, food-loss |
| Misc        | notifications, traceability, locations, reviews, group orders, subscriptions, harvest pre-booking, sustainability |

Full interactive docs: http://localhost:8000/docs (OpenAPI / Swagger).

---

## Production notes

- Env secrets live in environment variables / `.env` (never committed).
- Payment/SMS/WhatsApp/logistics/maps providers are pluggable interfaces ready
  to point at Razorpay/PayU, MSG91/Twilio, Gupshup, Google Maps/Mapbox, etc.
- Run `alembic upgrade head` instead of `create_all` in production.
- Add managed queues (Redis/Celery) for forecasting, notifications, settlements,
  and route recalculation.
- Before commercial launch in India, obtain professional advice on data
  protection, consumer protection, payments, taxation (GST/TDS), food safety
  (FSSAI), logistics, and marketplace compliance.

---

## Project structure

```
backend/
  app/
    api/v1/        ├─ routers (auth, products, orders, producer, bulk, ...)
    models/        ├─ SQLAlchemy models (45+ entities)
    schemas/       ├─ Pydantic schemas
    services/      ├─ business logic (auth, order, inventory, settlement, ...)
    ai/            ├─ forecasting, routing, pricing, food-loss, recommendations
    utils/         ├─ security, helpers, validators
  seed.py          ├─ demo data
  tests/           ├─ test suites
  alembic/         ├─ migrations
frontend/
  src/
    app/           ├─ Next.js App Router pages
    components/    ├─ UI, layout, marketplace, producer, admin, delivery, AI
    i18n/          ├─ en.ts / ta.ts translation keys
    store/         ├─ zustand (auth, cart, location, UI)
    lib/           ├─ api client, utils
    hooks/         ├─ React Query hooks
docker-compose.yml
```

**Vaikkal** — farm-fresh products from verified producers, delivered with
transparent pricing. இயற்கை வேளாண்மை, நேரடி விலை, நம்பிக்கையான விநியோகம்.