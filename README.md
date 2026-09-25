# SEBA IT Internet — ISP Website & Control Platform

A bilingual (English / বাংলা) ISP website and secure staff dashboard for Bangladesh internet service providers,
built from the *White-Label ISP Website & Internal Control Platform — PRD v1.1*.
The demo brand is **SEBA IT Internet**. The platform is white-label: every brand string, color, contact, logo,
package, coverage area, payment instruction and page text is managed from the dashboard, so no code changes are needed.

> **বাংলা সারসংক্ষেপ:** এটি একটি সম্পূর্ণ ডায়নামিক ISP ওয়েবসাইট + অ্যাডমিন ড্যাশবোর্ড। প্যাকেজ, কভারেজ (জেলা → থানা → এলাকা),
> বিল পরিশোধ নির্দেশনা, ব্লগ, FAQ, রিভিউ, অফার, অফিস, ব্র্যান্ডের রং/লোগো, হোম পেজের প্রতিটি সেকশন — সব ড্যাশবোর্ড থেকে ইংরেজি ও বাংলায়
> পরিবর্তন করা যায়। লিড (নতুন সংযোগ, কর্পোরেট, যোগাযোগ, কভারেজ আগ্রহ), লাইভ চ্যাট, নোটিফিকেশন, ইউজার/রোল/পারমিশন ও অডিট লগ আছে।

---

## Features

### Public website (`/` English, `/bn` Bangla)
| Page | Highlights |
|---|---|
| Home | Hero, quick coverage checker, featured packages, Home vs Corporate, why choose us, current offer, 4-step process, stats, reviews, blog, FAQ, support channels, final CTA — **order and visibility controlled from the dashboard** |
| Packages | All active packages, VAT/installation notes, "Get this plan" pre-selects the package |
| Corporate | Service cards, benefits, corporate inquiry form (stored separately from home leads) |
| Coverage | District → Thana/Upazila → Area checker, available / unavailable states, "Notify me" lead capture, browse-coverage list |
| Pay Bill | Instruction-only bKash / Nagad / Rocket cards + multiple bank accounts, copy buttons, optional QR (no payment gateway) |
| Blog | Categories, search, pagination, featured post, detail page with share links, related posts, BlogPosting JSON-LD |
| About, Support/FAQ, Contact, Get Connection | Mission/vision, offices, searchable FAQ (FAQPage JSON-LD), support channels, validated forms |
| Legal | Privacy, Terms, Payment/Refund — editable bilingual pages |
| Live chat widget | Persistent visitor conversations, realtime (Ably) with automatic polling fallback |

SEO: per-page titles and descriptions, canonical, `hreflang` (en-BD / bn-BD / x-default), Open Graph, dynamic `sitemap.xml` and `robots.txt`
(staging/preview is automatically `noindex`), Organization JSON-LD, correct 404s.

### Staff dashboard (`/admin`, English only)
Overview · Connection Requests · Corporate Inquiries · Contact Messages · Coverage Interest · Live Chat · Notifications ·
Home CMS / Pages · Packages · Corporate Services · Coverage · Offers · Payment Methods · FAQ · Reviews · Blog (+ preview) ·
Offices · Media Library (Cloudinary) · Brand Settings · Navigation & Footer · Social Links · SEO · Settings · Users ·
Roles & Permissions · Audit Logs · My Profile / 2FA / Sessions.

- Lead workflow: status, internal notes, status history, CSV export (formula-injection safe), privacy anonymization
- Reordering, activate/deactivate, archive-instead-of-delete rules (e.g. packages used by leads are archived)
- Default roles: **Super Admin, Admin, Moderator, Support Admin** (least privilege, PRD §9); custom roles supported

### Security (PRD §18)
- Argon2id password hashing, 256-bit opaque session tokens stored only as HMAC hashes, HttpOnly/SameSite cookies
- 12 h absolute / 60 min idle sessions, revocation on logout / password change / disable
- Optional TOTP 2FA with hashed one-time recovery codes (secret AES-256-GCM encrypted); can be required per role
- Password confirmation (10 min window) for payments, users, roles and security settings
- Server-side permission checks on every page, server action and API route; no privilege escalation; the last Super Admin is protected
- Nonce-based CSP, HSTS, `X-Frame-Options`, `nosniff`, Referrer-/Permissions-Policy, origin checks on every mutation
- Zod validation, server-side HTML sanitization, rate limiting (Upstash or in-memory), honeypot + optional Cloudflare Turnstile
- Append-only audit log with IP hashes; no secrets in client bundles, logs or error messages

---

## Tech stack
Next.js 16 (App Router, React 19, Server Components) · TypeScript (strict) · Tailwind CSS v4 · PostgreSQL · Prisma 6 · Zod ·
Cloudinary (signed uploads) · Resend (email) · Ably (realtime, optional) · Upstash Redis (rate limit, optional) · Vitest.

Every external provider is optional in development. The app keeps working without them: leads are still saved, chat falls back to polling, and rate limits are kept in memory.

---

## Quick start (local)

Requirements: **Node.js 20.9+** (22 recommended) and **PostgreSQL** (easiest: Docker Desktop).

```bash
cd seba-it-internet
cp .env.example .env          # Windows CMD: copy .env.example .env
docker compose up -d          # starts PostgreSQL (skip if you already have Postgres; then edit DATABASE_URL in .env)
npm install
npm run setup                 # creates tables + loads the SEBA IT demo data
npm run dev                   # open http://localhost:3000
```

**Dashboard login:** http://localhost:3000/admin
| | |
|---|---|
| Email | `admin@sebait.local` |
| Password | `SebaIT@Admin2026` |

Both come from `DEMO_ADMIN_EMAIL` / `DEMO_ADMIN_PASSWORD` in `.env` (nothing is hard-coded). Change the password after
login (**My Profile → Password**). Dev-only role test accounts `manager@`, `moderator@` and `support@sebait.local` use the same password.

The seed creates the complete demo: 8 packages, coverage (Dhaka / Gazipur / Narayanganj), **bKash, Nagad, Rocket and a
demo bank account** (placeholder numbers — edit in **Payment Methods**), 12 FAQs, reviews, 4 blog posts, an offer,
offices, navigation, every page section, SEO defaults and roles. Running `npm run db:seed` again is safe — existing data is never overwritten.

### Scripts
| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Develop / production build / serve |
| `npm run lint` · `npm run typecheck` · `npm test` | ESLint · TypeScript · Vitest unit tests |
| `npm run db:migrate` | Create a new migration in development |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run setup` | Apply migrations + demo seed (first run) |
| `npm run db:seed` | Demo seed only (requires `ALLOW_DEMO_SEED=true`) |

---

## Deploying to Vercel

1. Create a managed PostgreSQL database (Neon, Supabase, Railway, RDS…) with backups enabled.
2. Import the repository into Vercel and set the environment variables from `.env.example`
   (`DATABASE_URL`, `DIRECT_DATABASE_URL`, `APP_URL=https://your-domain`, `SESSION_SECRET`, `APP_ENCRYPTION_KEY`, provider keys).
3. Build command: `npx prisma migrate deploy && next build` (or run `npm run db:deploy` from CI). Never use `prisma db push` in production.
4. Seed **once** with demo data only if you want the demo content (`ALLOW_DEMO_SEED=true`), then immediately change the
   admin password, replace demo packages/prices, payment numbers, coverage, offices and legal copy from the dashboard.
5. Preview deployments are automatically `noindex`. Set `ALLOW_INDEXING=false` on any other staging environment.

### Integrations
| Service | Env vars | Without it |
|---|---|---|
| Cloudinary | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Uploads disabled; built-in illustrations are shown |
| Resend | `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_SUPPORT_TO` | Emails logged as "not configured"; submissions still saved |
| Ably | `ABLY_API_KEY` | Chat/notifications poll every 5–10 s |
| Upstash Redis | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Per-instance in-memory rate limits |
| Cloudflare Turnstile | `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Honeypot + rate limit only (enable in Settings → Security) |

The dashboard **Settings** page shows which integrations are configured.

---

## Project structure

```
prisma/                 schema.prisma, migrations/, seed.ts
src/proxy.ts            locale routing (/ → en, /bn), admin gate, CSP nonce
src/app/[locale]/       public pages (EN unprefixed, BN under /bn)
src/app/admin/          dashboard: (auth) login/2FA/reset, (panel) all modules
src/app/api/v1/         public, chat, realtime and admin REST endpoints (PRD §11 envelope)
src/components/public   website UI (header, footer, forms, coverage checker, chat widget…)
src/components/admin    dashboard UI (generic resource form/table, chat console, media…)
src/features/           shared definitions: page sections, CRUD resources, form fields, schemas
src/lib/                env, db, auth (sessions, RBAC, TOTP), security, i18n, email, realtime, cloudinary, rate-limit
src/server/             server services: cached public data, leads, chat, notifications, audit, admin actions
tests/unit/             Vitest unit tests
```

### Adding content types
Most dashboard modules are **config-driven**: fields defined in `src/features/admin/resources.ts` drive the form, validation
and list; server behavior (permissions, hooks, cache tags, delete rules) lives in `src/server/admin/resources.ts`.
Page sections are defined in `src/features/sections.ts`.

---

## Launch checklist (PRD §25)
- [ ] Production PostgreSQL with backups; `prisma migrate deploy` applied
- [ ] All secrets set in Vercel; `APP_URL` is the real HTTPS domain
- [ ] Cloudinary, Resend (verified domain), Ably, Upstash configured and tested
- [ ] Real brand, logo, colors, contacts, social links, offices entered
- [ ] Packages/tariff, VAT and installation notes verified by the ISP
- [ ] Coverage areas and payment numbers/bank details/QR verified
- [ ] Legal pages reviewed and approved
- [ ] Demo users removed or passwords changed; 2FA enabled for admins
- [ ] robots/sitemap/canonical/hreflang checked on the production domain

## Out of scope for V1 (per PRD)
Customer self-care portal, online payment gateway, billing/RADIUS integration, SME packages, native apps,
Meta inbox integration, page builder, and multi-tenant SaaS (the code is structured to allow a later migration).
# seba-it-internet
