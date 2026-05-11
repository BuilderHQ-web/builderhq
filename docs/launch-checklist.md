# Launch checklist

Things that have to be right before flipping the DNS to Vercel. Each item
is either ✅ done in code (verifiable in this repo) or ⚠️ you-action
(needs to be done in a dashboard outside the repo).

## ✅ In-code (already wired)

- Auth.js v5 with secure cookies (auto-detects HTTPS via `AUTH_URL`)
- Argon2id password hashing with OWASP 2024 params
- `users.deleted_at` soft-delete column, redact_user() SQL helper
- Sentry SDK wired (client + server + edge + instrumentation)
- Rate-limit primitives on signup / signin / forgot / verify-resend
- Global `error.tsx` + `not-found.tsx`
- `/dev/*` gated to NODE_ENV !== production AND admin role
- Account deletion (user side + admin side)
- Admin module: pending review queue, builder approve/reject, user moderation
- Audit log of every admin action
- Email templates rendered by react-email
- R2 presigned uploads with sanitised keys + 5-min URL TTL
- Edge middleware (`proxy.ts`) gates `/admin/*` and bounces unauth'd users

## ⚠️ You-action — dashboards / DNS / external

### Resend domain verification

Without this, every email goes to spam (or doesn't deliver at all).

1. Resend dashboard → Domains → Add `builderhq.com.au`
2. Add these DNS records at your registrar (Cloudflare / GoDaddy / wherever):

   | Type  | Host                                      | Value                                       | Notes |
   |-------|-------------------------------------------|---------------------------------------------|-------|
   | MX    | `send`                                    | `feedback-smtp.us-east-1.amazonses.com`     | priority 10 |
   | TXT   | `send`                                    | `v=spf1 include:amazonses.com ~all`         | SPF |
   | TXT   | `resend._domainkey`                       | (long key from Resend dashboard)            | DKIM |
   | TXT   | `_dmarc`                                  | `v=DMARC1; p=none;`                         | DMARC — start with p=none, tighten later |

3. Wait for Resend to report "Verified" (~5–60 min)
4. Update `EMAIL_FROM` env to use the verified domain:
   `EMAIL_FROM="BuilderHQ <noreply@builderhq.com.au>"`
5. Send a test email — sign up a new account on staging, check Gmail + Outlook deliverability + Spam folder

### R2 CORS for production origin

Without this, presigned PUT uploads from the browser get blocked.

1. Cloudflare dashboard → R2 → bucket → CORS Policy
2. Allow the production origin you're launching on (e.g. `https://app.builderhq.com.au`):

   ```json
   [
     {
       "AllowedOrigins": ["https://app.builderhq.com.au", "https://builderhq.com.au"],
       "AllowedMethods": ["GET", "PUT"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

3. Save. Test by uploading a file to a project from the live site.

### Upstash Redis (rate limiting)

Without this, the limiters in `src/lib/ratelimit.ts` no-op — fine for
dev, bad for production launch.

1. Upstash dashboard → Create database → name `builderhq-prod` → Global (multi-region) → free tier
2. Copy the REST URL + REST Token from the Details tab
3. Add to Vercel env (preview + production scopes):
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### Sentry project

1. sentry.io → New Project → Next.js → name `builderhq`
2. Copy the DSN. Add to Vercel env:
   - `SENTRY_DSN` (server scope, all envs)
   - `NEXT_PUBLIC_SENTRY_DSN` (client + server scope, all envs)
3. For source-map upload (optional but useful):
   - Sentry → Settings → Auth Tokens → Create token with `project:write` + `release:write` scope
   - Add to Vercel env (all envs): `SENTRY_AUTH_TOKEN`, `SENTRY_ORG=<slug>`, `SENTRY_PROJECT=<slug>`

### Vercel project + env

1. Vercel → Import → connect your repo
2. Set env vars (use values from your `.env.local` for the dev-shared values, real values from the dashboards above for the prod-only ones):

   **Required (build fails without these):**
   - `AUTH_SECRET` (regenerate fresh for prod: `openssl rand -base64 32`)
   - `AUTH_URL` (= production URL — e.g. `https://app.builderhq.com.au`)
   - `DATABASE_URL` (Neon pooled)
   - `DATABASE_URL_UNPOOLED` (Neon direct — needed by migration runner)
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`
   - `NEXT_PUBLIC_APP_URL` (= same as AUTH_URL)
   - `VERIFICATION_PROXY_URL`

   **Required for launch (no defaults):**
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
   - `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`

   **Optional but recommended:**
   - `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`

### DNS — point a subdomain at Vercel

The lowest-risk path for today:

1. Pick a subdomain (e.g. `app.builderhq.com.au`)
2. Vercel project → Settings → Domains → Add `app.builderhq.com.au`
3. Vercel shows you the CNAME to add at your registrar:
   ```
   app  CNAME  cname.vercel-dns.com
   ```
4. After DNS propagates (5–60 min), Vercel auto-provisions SSL.

The apex `builderhq.com.au` stays pointed at Bubble for now — your
existing mobile app keeps working untouched.

## ⚠️ Smoke-test before announcing

Walk these on the live URL using a real account:

- [ ] Sign up → email verification arrives → click link → onboarding loads
- [ ] Complete owner onboarding → land on /owner dashboard
- [ ] Upload a project (with a real image + drawing file)
- [ ] Sign up second account as builder → onboarding → /builder
- [ ] Builder browses → sees the owner's project → opens detail
- [ ] Builder unlocks (founding-builder grant should auto-apply)
- [ ] Builder submits a tender
- [ ] Owner receives notification + sees tender in /owner/projects/[slug]/tenders
- [ ] Owner messages the builder → builder receives message
- [ ] Forgot password → email arrives → reset → log in with new password
- [ ] Promote yourself to admin (`node scripts/make-admin.mjs you@example.com`)
- [ ] /admin loads → approve the builder → audit log shows the action
- [ ] Settings → Delete account → confirms + signs out → can't sign back in

If any step breaks, fix before opening the gates. Sentry will surface
client errors; Vercel logs surface server errors; both deserve a watch
in the first hour after launch.
