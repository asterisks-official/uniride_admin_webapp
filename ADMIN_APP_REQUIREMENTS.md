# UniRide Admin WebApp AI Agent Prompt

## 1. Objective
Build a secure, production-ready **Next.js (TypeScript) Admin WebApp** for the UniRide platform that manages users, rides, requests, ratings, reports, notifications, trust scores, and configuration. The app will connect to **Firebase (Auth + Firestore)** and **Supabase (primary operational data)**, using server-only keys where required. Provide real-time dashboards, moderation workflows, and audit logging.

## 2. High-Level Architecture
Hybrid backend:
- **Firebase**: Authentication (custom admin claims), Firestore `users`, `app_config`, legacy collections.
- **Supabase**: Core operational tables (`rides`, `ride_requests`, `ride_chat_messages`, `ride_ratings`, `reports`, `notifications`, `user_stats`, trust score view/functions).
- **OneSignal**: Push notifications broadcast & direct messages.
- **Admin WebApp**: Next.js app with route handlers, server actions, protected dashboards, audit logging.

## 3. Core Domain Entities & Sources
| Entity | Source | Notes |
|--------|--------|-------|
| User | Firestore `users`, Supabase `user_stats`, `ride_ratings` | Rider verification workflow. |
| Ride | Supabase `rides` | Matching, confirmations, cancellations, pricing, fees. |
| Ride Request | Supabase `ride_requests` | Requests from passengers to rides. |
| Chat Message | Supabase `ride_chat_messages` | Pairwise chat between ride participants. |
| Rating | Supabase `ride_ratings` (legacy Firestore optional) | Affects trust score. |
| Notification | Supabase `notifications` | In-app and push; enum `notification_type`. |
| Report | Supabase `reports` | Moderation & abuse tracking. |
| Trust Score | Supabase `user_stats` + `view_trust_score_breakdown` | Composite calculation documented. |
| App Config | Firestore `app_config` | Feature flags & versioning. |
| Audit Log (new) | Supabase `admin_audit_log` | Track admin actions. |
| Flags (optional) | Supabase `admin_flags` | Manual escalation markers. |
| Broadcasts (optional) | Supabase `broadcasts` | Mass notifications metadata. |

## 4. Supabase Tables (Key Fields)
### rides
```
id (UUID), owner_uid (TEXT), from_location, from_lat, from_lng,
to_location, to_lat, to_lng, depart_at (TIMESTAMPTZ), seats_total,
seats_available, price (DECIMAL), vehicle_info, notes, status (ENUM),
visible (BOOLEAN), matched_at, rider_uid, passenger_uid,
confirmation_deadline, rider_confirmed_going, passenger_confirmed_going,
rider_confirmed_completion, passenger_confirmed_completion,
cancelled_at, cancelled_by_uid, cancellation_reason, cancellation_fee,
completed_at, metadata (JSONB)
```
### ride_requests
```
id, ride_id (FK rides), passenger_uid, seats_requested, message,
status, created_at, updated_at
```
### ride_ratings
```
ride_id, rater_uid, rated_uid, rater_role, rating, review, is_visible,
created_at
```
### ride_chat_messages
```
id, ride_id, sender_uid, message, created_at
```
### notifications
```
id, user_uid, type (ENUM), title, message, action_data (JSONB), is_read, created_at, updated_at
```
### reports
```
id, reporter_uid, reported_user_uid, ride_id?, type, description,
status, resolution_note?, created_at, updated_at
```
### user_stats
```
user_uid, trust_score, rating_points, completion_points,
reliability_points, experience_points, total_rides, completed_rides,
late_cancellations, cancellations, no_shows, average_rating, updated_at
```
### admin_audit_log (to create)
```
id, admin_uid, action, entity_type, entity_id, diff (JSONB), created_at
```

## 5. Trust Score Components (From Documentation)
- Rating (0–30): avg_rating * 6 (default 15 if none)
- Completion (0–25): completion_rate * 25 (default 20 if none)
- Reliability (0–25): 25 - (cancellations*2 + late*5 + no_shows*10)
- Experience (0–20): 0→10 baseline, then rides added until cap at 20.
- Total clamped to 0–100 with category bands: Excellent (90–100), Good (70–89), Fair (50–69), Poor (<50).

## 6. Admin Use Cases / Features
1. User Management (search, filter, verify rider, view trust breakdown, ban/delete).
2. Ride Dashboard (active, ongoing, matched awaiting confirmation, cancellations, fees).
3. Requests Moderation (pending queue, accept/decline overrides).
4. Ratings & Reviews Audit (hide abusive rating, remove review, show patterns).
5. Reports Triage (resolve/escalate, attach resolution notes).
6. Trust Score Ranking & Outliers (manual recalc, thresholds).
7. Notifications Console (targeted & broadcast; persists + push via OneSignal).
8. App Config Editor (version & feature flags).
9. Audit Log Viewer (filter by admin/action/entity/date).
10. Data Export (CSV for users, rides, reports, trust metrics).
11. Real-Time Panels (Supabase Realtime for rides/requests; Firestore live for verification queue).
12. Security Enforcement (admin claim validation for every write).

## 7. REST API Endpoint Specification (Server Route Handlers)
### Users
- `GET /api/users?query=&role=&verificationStatus=&trustMin=&trustMax=&page=&pageSize=`
- `GET /api/users/:uid`
- `POST /api/users/:uid/verify-rider` body `{approved: boolean, note?: string}`
- `POST /api/users/:uid/ban` body `{reason: string}`
- `DELETE /api/users/:uid`
- `POST /api/users/:uid/trust/recalculate`
- `GET /api/users/:uid/trust/breakdown`
### Rides
- `GET /api/rides?status=&ownerUid=&matched=&fromDate=&toDate=&page=&pageSize=`
- `GET /api/rides/:id`
- `POST /api/rides/:id/cancel` body `{reason: string}`
- `POST /api/rides/:id/force-complete`
- `GET /api/rides/:id/chat`
- `GET /api/rides/:id/ratings`
### Requests
- `GET /api/requests?rideId=&status=&page=&pageSize=`
- `POST /api/requests/:id/force-accept`
- `POST /api/requests/:id/force-decline`
### Ratings
- `GET /api/ratings?rideId=&userUid=&page=&pageSize=`
- `POST /api/ratings/:ratingId/hide`
- `DELETE /api/ratings/:ratingId`
### Reports
- `GET /api/reports?status=&reportedUid=&page=&pageSize=`
- `POST /api/reports/:id/resolve` body `{resolutionNote: string}`
- `POST /api/reports/:id/escalate` body `{reason: string}`
### Notifications
- `GET /api/notifications?userUid=&unreadOnly=`
- `POST /api/notifications/broadcast` body `{title, message, segment?, userUids?}`
- `POST /api/notifications/:id/mark-read`
- `DELETE /api/notifications/:id`
### Trust
- `GET /api/trust/ranking?min=&max=&page=&pageSize=`
- `GET /api/trust/outliers?below=50&above=90`
- `POST /api/trust/:uid/recalculate`
- `GET /api/trust/:uid/history` (if history implemented)
### Config
- `GET /api/config`
- `PATCH /api/config` body `{minVersion?, flags?}`
### Audit
- `GET /api/audit?adminUid=&entityType=&entityId=&fromDate=&toDate=&page=`
### Export
- `GET /api/export/users.csv`
- `GET /api/export/rides.csv`

## 8. Tech Stack & Libraries
- Next.js (App Router, TypeScript)
- React 18, Server Components + Client Components as needed
- Tailwind CSS + shadcn/ui (optional) for rapid UI
- Data fetching: Server Actions + React Query (client state)
- Auth: Firebase client login (ID token) + server verification via Admin SDK
- Supabase JS (service role on server only)
- Zod for schema validation
- CSV export: `fast-csv` or custom
- Logging: structured console + optional Datadog integration (future)

## 9. Environment Variables
Server-only:
```
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ONESIGNAL_REST_API_KEY
ADMIN_SESSION_SECRET
```
Client-exposed:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_ONESIGNAL_APP_ID
```
Rules:
- Never expose `SUPABASE_SERVICE_ROLE_KEY` client-side.
- Replace `\n` in private key before initialization.

## 10. Initialization Code Samples
### Firebase Admin
```ts
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}
export const authAdmin = getAuth();
```
### Supabase Server Client
```ts
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
```
### Admin Claim Verification
```ts
export async function assertAdmin(idToken: string) {
  const decoded = await authAdmin.verifyIdToken(idToken);
  if (!decoded.admins) throw new Error('Forbidden');
  return decoded;
}
```

## 11. Directory Structure (Target)
```
app/
  (admin)/
    dashboard/page.tsx
    users/page.tsx
    rides/page.tsx
    requests/page.tsx
    trust/page.tsx
    reports/page.tsx
    notifications/page.tsx
    config/page.tsx
  api/
    users/[uid]/route.ts
    users/route.ts
    rides/[id]/route.ts
    rides/route.ts
    ... (others as spec)
lib/
  firebase/admin.ts
  firebase/client.ts
  supabase/server.ts
  repos/
    usersRepo.ts
    ridesRepo.ts
    trustRepo.ts
    reportsRepo.ts
    notificationsRepo.ts
    auditRepo.ts
  security/authGuard.ts
  validation/schemas.ts
components/
  tables/...
  forms/...
  charts/...
utils/
  formatting.ts
  csv.ts
styles/
public/
```

## 12. Security & Access Control
- All write endpoints call `assertAdmin`.
- Use middleware for protected routes (Edge if needed).
- Implement rate limiting on destructive actions (ban/delete) and broadcast.
- Record each admin mutation in `admin_audit_log` (fields: action, entity_type, entity_id, diff snapshot).
- Prevent mass deletion – implement confirmation step + soft-ban alternative.

## 13. Audit Logging Pattern
```ts
async function logAdminAction(adminUid: string, action: string, entityType: string, entityId: string | null, diff: any) {
  await supabase.from('admin_audit_log').insert({
    admin_uid: adminUid,
    action,
    entity_type: entityType,
    entity_id: entityId,
    diff,
  });
}
```
Call after successful write, capturing pre & post states if possible.

## 14. Real-Time Strategy
- Supabase Realtime for: rides status changes, requests, notifications unread counts.
- Firestore snapshots for: pending rider verifications (`riderVerificationStatus == 'pending'`).
- Use React Query with `onUpdate` merging logic.

## 15. Moderation Workflows
### Rider Verification
1. Filter users by `riderVerificationStatus = 'pending'`.
2. Approve: set `riderVerificationStatus = 'approved'`, `isRiderVerified = true`.
3. Reject: set `riderVerificationStatus = 'rejected'`, include note.
### Reports Resolution
- Resolve: `status='resolved'`, add `resolution_note`.
- Escalate: `status='escalated'`, create `admin_flags` entry.

## 16. Notifications Broadcasting
- Insert row in `notifications` for each targeted user.
- Fire OneSignal REST API:
```ts
await fetch('https://onesignal.com/api/v1/notifications', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
  },
  body: JSON.stringify({
    app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
    include_external_user_ids: userUids,
    headings: { en: title },
    contents: { en: message },
    data: actionData,
  })
});
```

## 17. CSV Export Pattern
```ts
import { Parser } from 'json2csv';
export function toCSV(rows: any[]) {
  const parser = new Parser();
  return parser.parse(rows);
}
```
Return with `Content-Type: text/csv`.

## 18. Testing Strategy
- Unit: Repos (mock Supabase/Firebase), validation schemas (Zod). 
- Integration: API route handlers using supertest (Node environment). 
- E2E (future): Playwright for admin flows. 
- Trust score recalc test: call endpoint, assert changed values. 

## 19. Performance Considerations
- Paginate large tables (default pageSize 50). 
- Add indexes: `rides(status, matched_at DESC)`, `ride_requests(ride_id, created_at DESC)`, `reports(status, created_at DESC)`, `admin_audit_log(entity_type, entity_id)`.
- Cache trust ranking (ISR 60s) if load high.

## 20. Error Handling Conventions
Return JSON envelope:
```json
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```
Success:
```json
{ "ok": true, "data": ... }
```
Map errors: auth → 401/403, validation → 400, not found → 404, conflict → 409, server → 500.

## 21. Style & Code Guidelines
- TypeScript strict.
- No implicit `any`.
- Centralize validation in `validation/schemas.ts`.
- Reusable table components; server-driven filtering.
- Avoid client-side exposure of service role keys.
- Use semantic HTML + accessible components.

## 22. Incremental Delivery Plan
Sprint 1:
- Env setup, auth guard, users list, trust ranking, audit log base.
Sprint 2:
- Rides dashboard, requests moderation, verification queue.
Sprint 3:
- Reports triage, notifications broadcast, CSV export.
Sprint 4:
- Chat viewer, rating moderation, config editor.
Sprint 5:
- Analytics & performance optimizations, polish & accessibility.

## 23. Agent Execution Instructions
1. Confirm environment variables existence – generate `.env.example`.
2. Scaffold directory structure and initial clients.
3. Implement users endpoints + pages (pagination, filters, trust breakdown fetch).
4. Add audit logging wrapper and integrate with each mutation.
5. Implement rides queries + cancellation action.
6. Add trust score recalc endpoint.
7. Provide seed scripts / sample mock data (optional for local dev).
8. Validate all endpoints with unit tests (in `__tests__/api`).
9. Produce README with setup + usage instructions.
10. Provide security checklist before completion.

## 24. Non-Functional Requirements
- Security: least privilege; all writes behind verified admin claim.
- Observability: console structured logs; upgrade path to external logging.
- Resilience: graceful failure for partial Supabase outages; fallback messages.
- Maintainability: modular repos; single responsibility.

## 25. Future Extensions & Advanced Features (Do Not Build Now)
Below is a consolidated catalogue of advanced / nice-to-have capabilities for later phases. Keep these OUT of initial sprints unless explicitly pulled in. Categorized for clarity.

### Access & Security
- Granular RBAC (roles: super-admin, moderator, support, readonly analyst).
- Impersonate user / "view as" session (with audit + cooldown).
- API token management (personal admin API keys w/ scopes & expiry).
- Session management console (enumerate, revoke active admin sessions).
- Security center (failed login attempts, anomaly / brute force detection dashboard).
- Rate limiting monitor (display per-endpoint throttle usage & violations).
- Data privacy tooling (GDPR delete automation, export personal data bundle).

### Moderation & Operations
- Dispute / refund workflow (fare disagreements, cancellation fee overrides, credit issuance ledger).
- Payment / financial ledger integration (track platform fees, rider earnings, settlement status).
- Bulk operations (batch approve rider verifications, batch notify segments).
- Soft delete with restore (users, rides, ratings) + retention policy & purge scheduler.
- Scheduled tasks dashboard (list cron jobs: trust score sweeps, expired confirmation cleanup, stale ride archival).
- Manual trust score override (adjust delta + mandatory audit diff justification).
- Predictive risk alerts (flag users trending toward low reliability).

### Data & Analytics
- GraphQL gateway for flexible querying / BI tooling integration.
- Advanced search (multi-field, full-text, fuzzy, phonetic matching on names / locations).
- Performance charts (DAU, rides per hour, cancellation ratios, average confirmation latency, trust score distribution histogram).
- SLA / uptime panel (status of Firebase, Supabase, OneSignal, error budget tracking).
- Dependency health (migration version sync, trigger status, function execution errors).
- Caching layer (Redis/Edge) stats viewer (hit rate, top keys, cold path warnings).

### Communication & Engagement
- Broadcast segmentation builder (dynamic queries on trust score, geography, recent activity).
- Email template editor + preview + send (if email channel added later).
- Real-time presence indicators (online/offline for riders/passengers; websocket scaling plan).
- In-app announcements / banner management (scheduled start/end, targeting rules).

### UI/UX & Accessibility
- Dark mode / theme system (design tokens, Tailwind CSS variables, theme toggle persisted to user profile).
- Localization / i18n (multi-language admin panel, dynamic locale loading).
- Accessibility compliance checklist (WCAG AA automated lint, focus trap library integration).
- Custom dashboard builder (drag-and-drop widgets, saved layouts per admin).

### Reliability & Quality
- Error tracking integration panel (Crashlytics/Sentry summaries, top issues, link to stack traces).
- Automated regression smoke tests trigger dashboard (Playwright run history, failure diff snapshots).
- Feature flag management UI (rollout %, targeted cohorts, gradual escalation).
- Backup / point-in-time snapshot orchestration (request on-demand export; restore simulation environment).

### Messaging & Realtime Enhancements
- WebSockets overlay for chat moderation (live message stream & intervention actions).
- Intelligent spam / abuse classifier for chat & ratings (ML pipeline stub + human verification queue).

### Architectural / DevOps Enhancements
- Infrastructure cost monitor (estimate Supabase row storage, Firebase doc counts, push volume, monthly cost projection).
- CI pipeline status widget (latest build, test coverage trend, failing test heatmap).
- Release management panel (semantic version tagging, changelog generation).

Retain this list as a backlog; each item requires separate privacy / security assessment before implementation.

## 26. Acceptance Criteria Summary
- All specified endpoints implemented with validation & auth.
- Admin dashboards render key data sets with pagination & filtering.
- Trust score breakdown visible per user & recalc works.
- Rider verification workflow operational.
- Reports can be resolved/escalated.
- Notifications broadcast tool sends and persists entries.
- Audit log records every mutation.
- Unit tests cover core repos & validation.

## 27. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Service role leakage | Server-only imports, no exposure in client bundles. |
| Large queries slow | Pagination + indexes + selective field projection. |
| Inconsistent trust score after deletes | Trigger recalculation post cascading deletes. |
| Missing audit entries | Wrap all mutations in a common helper. |

## 28. Provide Output Formatting
When returning code/artifacts: supply diff-friendly blocks, avoid extraneous commentary, keep responses deterministic.

---
**Prompt Instruction to AI Agent:**
"Using the specification above, generate the full Next.js (TypeScript) admin application scaffold, implementing Sprint 1 deliverables: environment setup, firebase and supabase clients, auth guard, users listing endpoint and page, trust ranking endpoint and page, audit logging table migration (SQL) and logging helper, plus a README with setup steps. Include `.env.example`, initial Zod schemas, basic unit tests for users repo, and route handlers for `/api/users`, `/api/users/[uid]`, `/api/users/[uid]/trust/breakdown`, `/api/users/[uid]/trust/recalculate`, `/api/trust/ranking`. Ensure service role key is server-only, apply strict TypeScript, and produce minimal but functional UI with Tailwind. After scaffold, outline next sprints."

Use this prompt to begin implementation. Adjust for updated Supabase schema if new migrations are added.

---
Last Updated: 2025-11-20
