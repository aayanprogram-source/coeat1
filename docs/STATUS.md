# Build status

Last updated: 2026-11-13. Source spec: `Final_Production_Build_Prompt_v2.pdf`.

This is a work in progress. The backend and the superadmin dashboard are built and verified. The restaurant dashboard is written but not yet compiling. The customer mobile app is not started.

## Verified (tests or a production build prove it)

| Area | What exists | Evidence |
| --- | --- | --- |
| Database | 22 forward-only migrations: 69 tables, row level security on every table, storage buckets, 128 SQL functions, scheduled jobs | Applies cleanly to an empty Postgres 17 |
| Business rules | Personal codes, new-customer check, no overselling, timing windows, discount and fee maths in paise, idempotent redemption, undo versus manager reversal, held then released referral credits, rewards by level, group visits with credit cap, ratings with check-in, badges, fraud flags, rate limits, invoices with sequential numbers and GST, payment webhook idempotency, boosts billed per active day, sponsored placements, DPDP export and deletion with anonymising, legal re-acceptance, login lockout | 46 SQL tests pass, including 50 parallel requests for 20 codes producing exactly 20 |
| Configuration engine | Typed settings registry, `app_config` with version tag, audited and bounded `update_setting`, legal drafts and publishing, master data writer, integrations with Vault-backed secrets, go-live checklist | Covered by SQL tests |
| Shared packages | Design tokens, typed `Database` generated from the schema, Zod schemas, English strings, UI component library, shared dashboard kit (middleware, CSP, clients, providers) | Typecheck and unit tests pass |
| Superadmin dashboard | 17 screens: overview, go-live checklist, restaurants, offers, redemptions, fraud, users and reports, billing, boosts, settings with history and rollback, content, master data, notifications, integrations, data requests and breaches, team and roles, audit and error log; mandatory TOTP two-factor | Production build passes; security headers, nonce CSP, auth redirect and health endpoint checked on a running build |
| Edge Functions | SMS hook, integration tests, push delivery, payment webhook, payment link creation, email, account purge | Signature checks, provider requests, retries and push batching unit tested (10 tests). The functions themselves have not been run on Supabase |
| Bootstrap | `pnpm bootstrap:superadmin` | Written; not run against a live project |

## Written but not yet compiling

**Restaurant dashboard** (`apps/restaurant`). All screens are written: sign in and sign up, onboarding wizard with map pin, menu builder and CSV import, overview, offers with calculator and code card preview, counter redeem screen with QR scan, promoters, reviews, billing, boosts, staff, settings, status and legal re-acceptance gates. Remaining before it builds:

- About 78 copy strings missing from the English strings package.
- Three calls need a null `p_id` argument.
- Pages for each route, the link fallback page and the app-link association files are not created yet.

## Not started

- **Customer mobile app** (`apps/mobile`, Expo): every screen in section 10 of the spec, push registration, deep links, offline handling.
- **Playwright end-to-end tests** for both dashboards and mobile flows. These need a running Supabase project, which this machine does not have.
- **Accessibility check** with axe on both dashboards.
- **CI workflow** (typecheck, lint, tests, migrations on an empty database, builds, unused code check).
- **Documentation**: README, DEPLOYMENT, DECISIONS and TESTING (acceptance test results).
- **Cleanup pass**: a few files hold more than one component, lint and the unused-code check have not been run across the repo, and the repo has no first release tag.

## Acceptance tests (section 18 of the spec)

| Test | State |
| --- | --- |
| 1 Superadmin setup and checklist | Database side passes; needs live project and UI run |
| 2 Restaurant sign up, approval, offer bounds | Database side passes; dashboard not built |
| 3 Settings reach apps within 60 seconds, audited | Audit and version bump pass; 60 second delivery needs a live project |
| 4 to 11 Stories, codes, refusals, concurrency, money, undo, credits, groups | Pass in SQL tests |
| 12 Row level security | Passes in SQL tests |
| 13 Expiry and waitlist | Passes in SQL tests |
| 14 Fraud flags | Passes in SQL tests |
| 15 Invoices and webhook | Passes in SQL tests |
| 16 Deletion and export | Passes in SQL tests |
| 17 Legal re-acceptance | Passes in SQL tests |
| 18 Builds, health, unused code | Admin build and health pass; the rest pending |
| 19 Sponsored placements | Passes in SQL tests; app screens pending |

## What needs your action before launch

SMS provider and DLT registration, Google Maps keys, Razorpay account, SMTP account, Expo and store accounts, domain names, a lawyer's review of the legal text you enter, an accountant's review of GST invoicing, and a Supabase project (the tests here ran on a local Postgres, not on Supabase itself).

## How to run what exists

```
pnpm install
pnpm --filter @datapal/db test     # 46 database tests
pnpm db:settings && pnpm db:types  # regenerate defaults and types
```

Fill the seven names in `.env` before building either dashboard.
