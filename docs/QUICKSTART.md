# Quickstart: see the app running and get an APK

The apps hold no sample data. They show what you enter through the admin dashboard, so you need a backend first. This takes about 30 minutes.

## 1. Create the backend (free)

1. Create a project at supabase.com. Note the project URL, the anon key, the service role key, the project reference, and the database connection string.
2. Open `.env` in the repository root and fill the seven names: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_REF`, `DATABASE_URL`, `SEND_SMS_HOOK_SECRET` (any long random string) and `LINK_DOMAIN` (a domain you own, or `localhost` for now).
3. Apply the database and create the first admin:

```
pnpm install
pnpm db:migrate
pnpm bootstrap:superadmin
```

4. Deploy the Edge Functions and set the hook secret (needs the Supabase CLI):

```
supabase functions deploy --project-ref <ref>
supabase secrets set SEND_SMS_HOOK_SECRET=<same value as .env> --project-ref <ref>
```

5. In the Supabase dashboard, turn on Phone sign-in and add the Send SMS hook pointing at the `send-sms-hook` function.

## 2. Fill in the content (admin dashboard)

```
pnpm --filter @datapal/admin dev
```

Open http://localhost:3001, sign in, set up two-factor, then work down the **Go-live checklist**: product name, company details, the five legal documents, an SMS provider (MSG91 or Twilio) with a successful test send, maps, push, email, one city and one cuisine. The customer app hides sign-in until the SMS test passes.

## 3. Run the restaurant dashboard

```
pnpm --filter @datapal/restaurant dev
```

Open http://localhost:3002. Sign up, complete onboarding, then approve the restaurant from the admin dashboard.

## 4. Run the customer app on your phone

```
cd apps/mobile
npx expo start
```

Scan the QR code with Expo Go. (Camera, contacts and push work best in a real build, see below.)

## 5. Build the APK

Sign in to Expo (free account), then from `apps/mobile`:

```
npx eas-cli login
npx eas-cli init
```

Copy the project id it prints into `packages/core/app-ids.json` as `easProjectId`. Store the three public values for the build:

```
npx eas-cli env:create --environment preview --name SUPABASE_URL --value <url> --visibility plaintext
npx eas-cli env:create --environment preview --name SUPABASE_ANON_KEY --value <anon key> --visibility plaintext
npx eas-cli env:create --environment preview --name LINK_DOMAIN --value <domain> --visibility plaintext
npx eas-cli build --platform android --profile preview
```

When the build finishes, EAS prints a download link for the `.apk`. Install it on any Android phone.

Before a store release, change the app name and identifiers in `packages/core/app-ids.json`.
