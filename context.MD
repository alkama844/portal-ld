# FINAL DEPLOYMENT PREPARATION PROMPT — LUCKYDENTAL

You are working on the existing **Luckydental Dental Management System & Patient Portal**.

You MUST treat the existing:

* `done.md`
* `current.md`
* existing source code
* existing database models
* existing API routes
* existing frontend
* existing environment configuration

as the current source of truth.

Do NOT rebuild the project from scratch.

Your job is to make the project **production-ready for deployment**, with the backend deployable independently to **Render**, while the frontend can be deployed independently to **Vercel or Netlify**.

---

# 1. FIRST: AUDIT BEFORE CHANGING ANYTHING

Before modifying code:

1. Read `done.md`.
2. Read `current.md`.
3. Inspect the complete repository structure.
4. Inspect root `package.json`.
5. Inspect every workspace `package.json`.
6. Inspect all API routes/controllers/services/models.
7. Inspect frontend API client and environment handling.
8. Inspect authentication/session handling.
9. Inspect MongoDB connection handling.
10. Inspect Cloudinary configuration.
11. Inspect CORS configuration.
12. Inspect build/start scripts.
13. Inspect Next.js configuration.
14. Identify anything that will fail when frontend and backend are deployed on different domains.

Create a short internal checklist before implementation.

Do not assume something is working simply because `done.md` says it is working.

Actually verify the implementation.

---

# 2. TARGET DEPLOYMENT ARCHITECTURE

The final architecture should be:

```text
                    ┌─────────────────────┐
                    │      FRONTEND       │
                    │ Next.js             │
                    │ Vercel / Netlify    │
                    └──────────┬──────────┘
                               │
                               │ BACKEND_URL
                               ▼
                    ┌─────────────────────┐
                    │       BACKEND       │
                    │ Express + Node.js   │
                    │ Render              │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             ▼                 ▼                 ▼
        MongoDB           Cloudinary         Future SMS
        Database          Image Storage       Provider
```

The backend must be independently deployable.

The frontend must communicate with the backend through the backend deployment URL.

---

# 3. CREATE A DEDICATED RENDER DEPLOYMENT FOLDER

Create a clear dedicated deployment structure for the backend.

Preferred structure:

```text
patient-portal/
│
├── apps/
│   ├── web/
│   └── api/
│
├── packages/
│   └── shared/
│
├── deploy/
│   └── render/
│       ├── README.md
│       ├── render.yaml
│       └── ...
│
├── current.md
├── done.md
├── deploy_guide.md
├── package.json
└── README.md
```

If a better structure is required by the existing monorepo, use the better structure, but the purpose must remain:

> There must be a clearly identifiable deployment configuration specifically for the Render backend.

Do NOT duplicate the entire backend.

The deployment folder should contain deployment configuration/documentation, not unnecessary copies of source code.

---

# 4. RENDER BACKEND MUST BE DEPLOYABLE INDEPENDENTLY

Make `apps/api` production-ready for Render.

The backend must:

* Build successfully.
* Start successfully.
* Listen on Render's dynamically provided `PORT`.
* Never hardcode production ports.
* Connect to MongoDB using `MONGODB_URI`.
* Connect to Cloudinary using environment variables.
* Use `NODE_ENV`.
* Use `JWT_SECRET`.
* Use correct CORS configuration.
* Expose a health endpoint.
* Handle graceful shutdown.
* Handle database connection errors.
* Avoid development-only dependencies in production startup.
* Avoid filesystem persistence assumptions.
* Not depend on the frontend running locally.

Render will provide:

```env
PORT
```

Therefore:

```text
process.env.PORT
```

must always be used.

Fallback to `5000` only for local development.

---

# 5. IMPORTANT: RENDER FILESYSTEM

Do NOT treat Render's local filesystem as permanent database/storage.

Patient data must remain in:

```text
MongoDB
```

Patient images must remain in:

```text
Cloudinary
```

Temporary files may use the local filesystem only when absolutely necessary and must be treated as disposable.

Do NOT implement a fake local JSON database as a production persistence layer.

Do NOT save permanent patient records into Render's filesystem.

---

# 6. RENDER CONFIGURATION

Create a proper Render deployment configuration.

Prefer using:

```text
deploy/render/render.yaml
```

or another clean Render-compatible configuration.

The configuration must clearly define:

* backend service
* build command
* start command
* environment variables
* health check path
* runtime
* root directory if necessary

If the monorepo requires commands such as:

```bash
npm install
npm run build
npm start
```

make sure they work from Render's selected root directory.

The backend must be deployable without deploying the frontend.

---

# 7. BACKEND ROOT DIRECTORY

Make deployment simple.

I want to be able to deploy the backend independently.

If Render requires the root directory to be:

```text
apps/api
```

make sure `apps/api` contains everything necessary for the backend build/start process.

If the workspace architecture requires the repository root, configure Render correctly instead.

Do NOT break npm workspaces simply to make deployment look simpler.

The final `deploy_guide.md` must clearly explain exactly which Render:

```text
Root Directory
Build Command
Start Command
```

to use.

---

# 8. FRONTEND BACKEND URL ARCHITECTURE

This is extremely important.

The frontend must use ONE environment variable:

```env
BACKEND_URL
```

for the deployed backend URL.

Example:

```env
BACKEND_URL=https://luckydental-api.onrender.com
```

Do NOT require the user to maintain two separate backend URL variables such as:

```env
BACKEND_URL=...
NEXT_PUBLIC_API_URL=...
```

if they represent the same backend.

Avoid duplicate configuration.

---

# 9. AUTOMATIC API URL HANDLING

Implement a centralized API configuration.

There must be ONE source of truth for the backend URL.

For example:

```text
frontend API client
        ↓
BACKEND_URL
        ↓
all API requests
```

Every frontend API request must use the centralized API client.

Do NOT scatter hardcoded URLs throughout components.

Search the entire frontend for:

```text
localhost:5000
localhost
127.0.0.1
hardcoded Render URL
hardcoded API URL
```

Remove production-breaking hardcoded API URLs.

---

# 10. IMPORTANT NEXT.JS ENVIRONMENT RULE

Because Next.js has different server/client environment behavior, carefully design the API URL mechanism.

Do NOT expose sensitive backend secrets to the browser.

If browser-side requests require a public backend URL, use the safest architecture possible while still honoring the requirement that the backend URL is configured from one environment source.

If a server-side proxy/rewrite is the cleanest architecture, implement it.

The important requirement is:

> The developer should configure the backend URL once, not maintain multiple duplicate backend URL variables.

Document exactly how this works.

---

# 11. LOCAL DEVELOPMENT

Local development must continue working.

Expected local architecture:

```text
Frontend:
http://localhost:3000

Backend:
http://localhost:5000
```

Production:

```text
Frontend:
https://your-frontend-domain.com

Backend:
https://your-backend.onrender.com
```

The same codebase must support both environments.

Do not hardcode either environment.

---

# 12. CORS

Audit and fix CORS.

The backend must support:

```text
localhost frontend
production Vercel frontend
production Netlify frontend
custom frontend domain if configured
```

Do NOT use:

```text
Access-Control-Allow-Origin: *
```

for authenticated production requests unless there is a specific reason.

Use environment-driven allowed origins.

Example concept:

```env
CORS_ORIGIN=https://yourfrontend.vercel.app
```

If multiple origins are supported, implement this safely.

Credentials must continue working because authentication uses HTTP-only cookies.

Verify:

```text
credentials: true
```

behavior where required.

---

# 13. AUTHENTICATION DEPLOYMENT AUDIT

Because frontend and backend may live on different domains, carefully inspect JWT cookie configuration.

Verify:

* `httpOnly`
* `secure`
* `sameSite`
* domain behavior
* CORS credentials
* login
* logout
* `/api/auth/me`

The production deployment must not break login because frontend/backend are on different domains.

Do not blindly change cookie settings.

Test the actual cross-origin architecture.

---

# 14. COOKIE / JWT SECURITY

Production cookies should use secure settings appropriate for HTTPS.

Development should continue working on localhost.

Create environment-aware configuration.

Example conceptual behavior:

```text
development:
secure = false

production:
secure = true
```

Choose the correct `SameSite` configuration based on the actual deployment architecture.

Document any required frontend/backend domain relationship.

---

# 15. ENVIRONMENT VARIABLES

Audit every environment variable currently used by:

```text
apps/api
apps/web
packages/shared
```

Search the entire repository for:

```text
process.env
NEXT_PUBLIC_
MONGODB
JWT
CLOUDINARY
CORS
PORT
```

Create accurate:

```text
apps/api/.env.example
apps/web/.env.example
```

Do not put actual secrets into `.env.example`.

---

# 16. ENVIRONMENT VARIABLE DOCUMENTATION

`deploy_guide.md` must contain a table similar to:

| Variable              | Where               | Required | Purpose                |
| --------------------- | ------------------- | -------: | ---------------------- |
| MONGODB_URI           | Render              |      YES | MongoDB connection     |
| JWT_SECRET            | Render              |      YES | Authentication signing |
| CLOUDINARY_CLOUD_NAME | Render              |      YES | Cloudinary             |
| CLOUDINARY_API_KEY    | Render              |      YES | Cloudinary             |
| CLOUDINARY_API_SECRET | Render              |      YES | Cloudinary             |
| CORS_ORIGIN           | Render              |      YES | Frontend origin        |
| NODE_ENV              | Render              |      YES | production             |
| PORT                  | Render              |     AUTO | Render assigned port   |
| BACKEND_URL           | Frontend deployment |      YES | Backend URL            |

If the implementation uses different variable names, document the actual names.

Do not invent environment variables that the code doesn't use.

---

# 17. DO NOT DUPLICATE BACKEND_URL

This requirement is strict.

I want:

```env
BACKEND_URL=https://...
```

as the single backend URL configuration.

Do not create:

```env
NEXT_PUBLIC_API_URL
API_URL
SERVER_URL
BACKEND_API_URL
```

for the same purpose.

If an internal server-only variable is technically unavoidable, document why and ensure the user is not required to manually maintain duplicate values.

---

# 18. VERCEL READINESS

Make the frontend deployable to Vercel.

Verify:

* Next.js build
* production build
* environment variables
* API requests
* authentication
* cookies
* image domains
* Cloudinary images
* dynamic routes
* public patient routes
* receipt pages
* print styles
* client-side navigation

Run:

```bash
npm run build
```

and fix all errors.

Do not declare success based only on TypeScript passing.

---

# 19. NETLIFY READINESS

Also make sure the frontend can be deployed to Netlify if desired.

Document whether:

```text
Next.js App Router
```

requires any specific Netlify configuration.

If a configuration file is needed, add it.

Do not add unnecessary configuration.

---

# 20. CLOUDINARY AUDIT

Verify the existing Cloudinary system.

Requirements:

* profile image upload works
* Sharp compression works
* WebP conversion works
* image size limit remains enforced
* Cloudinary upload works in production
* deleted/replaced images are cleaned up
* Cloudinary URLs work from deployed frontend
* Next.js remote image configuration is correct

Do not move permanent images to Render storage.

---

# 21. MONGODB AUDIT

Verify:

* MongoDB connection URI
* connection pooling
* reconnect/error behavior
* indexes
* atomic counters
* patient persistence
* receipt persistence
* appointment persistence
* package persistence
* custom fields
* admin persistence

Test:

```text
create patient
refresh
restart backend
fetch patient
edit patient
create receipt
refresh
fetch receipt
create appointment
refresh
fetch appointment
```

All persistent data must come from MongoDB.

---

# 22. FIX DELETED PATIENT DATA BUG

There is an important known issue:

> The main dashboard still shows deleted patients and their money amounts.

Investigate the root cause.

Do NOT simply hide deleted records in the UI.

Fix the database/query/business logic.

When a patient is deleted:

* Patient must no longer appear in dashboard recent patients.
* Patient must no longer contribute to patient counts.
* Patient's receipts must not contribute to dashboard revenue if the business rule is deletion/removal.
* Patient's outstanding due must not contribute.
* Patient must disappear from schedule if appointments are deleted/invalidated according to the existing deletion policy.
* Patient search must not return deleted records.
* Patient profile must return proper not-found behavior.
* Related receipt queries must respect patient existence.
* Dashboard aggregation must not count orphaned receipts.

Use proper MongoDB filtering and/or controlled cascading cleanup.

Do NOT introduce accidental data loss.

---

# 23. DATA INTEGRITY

Audit orphaned records.

Check for:

```text
receipt → missing patient
appointment → missing patient
```

Decide the correct behavior.

The application must never display financial or appointment information for a patient that no longer exists.

Implement safe consistency rules.

---

# 24. RECEIPT SYSTEM AUDIT

Verify the singleton receipt requirement.

Expected:

```text
1 patient
   ↓
1 current receipt
```

Editing the receipt:

```text
same receipt
   ↓
new version/history
```

Do NOT create a new independent receipt every time the admin opens or saves the page.

Only intentional update operations should create a new version in history.

Verify:

* package selection
* multiple packages
* price snapshot
* discount
* cash deposit
* due
* payment complete
* appointment
* receipt number
* date/time
* patient name
* patient phone
* clinic identity
* print
* preview
* re-opening receipt
* profile receipt
* public receipt

All should use the same canonical `ReceiptDocument`.

---

# 25. RECEIPT DISPLAY CONSISTENCY

There must be ONE canonical receipt component.

The same full receipt design must appear in:

```text
Receipt creation
Receipt preview
Patient profile
Receipt history
Global receipts
Print
Public shared receipt
```

Do not have a small alternate receipt implementation.

If multiple implementations exist, consolidate them.

---

# 26. APPOINTMENT SYSTEM AUDIT

Verify that appointment scheduling exists directly inside the receipt workflow.

Flow:

```text
Create patient
     ↓
Receipt
     ↓
Select packages
     ↓
Payment
     ↓
Appointment date
     ↓
Appointment time
     ↓
Save
```

Date picker MUST include time picker.

Time picker must support:

* selectable time
* manual time entry/editing if appropriate
* AM/PM
* editing existing appointment
* saving corrected date/time

---

# 27. APPOINTMENT EDITING

From patient profile:

```text
Patient
   ↓
Appointment
   ↓
Edit
   ↓
Date
   ↓
Time
   ↓
Save
```

Changes must persist to MongoDB.

Refreshing the page must show the updated appointment.

---

# 28. SCHEDULE SYSTEM

Audit `/appointments`.

Required:

* Today
* Upcoming
* Past
* All
* date filtering
* calendar
* time display
* patient name
* patient number
* phone
* treatment/category
* appointment status
* patient profile navigation
* edit appointment
* cancel
* mark completed

When an appointment is saved:

> Save = approve.

Do NOT ask the admin to approve/reject immediately after saving.

---

# 29. PATIENT DUPLICATE PHONE DETECTION

Verify:

```text
Admin enters phone
        ↓
system checks MongoDB
        ↓
existing patient found
        ↓
show patient name
        ↓
See Details
        ↓
Accept existing patient / continue appropriately
```

Make sure the check is:

* debounced
* fast
* non-blocking
* safe
* based on normalized phone numbers

Do not create duplicate patients from rapid submission.

---

# 30. RAPID CLICK PROTECTION

Every mutation button must prevent duplicate requests.

Especially:

```text
Save Patient
Save Receipt
Update Receipt
Save Appointment
Create Package
Update Package
Upload Image
Delete
Share
```

Expected behavior:

```text
Click Save
   ↓
Button disabled
   ↓
Loading state
   ↓
Request
   ↓
Success
   ↓
Button restored
```

Do not allow rapid double-click to create duplicates.

---

# 31. LOCAL STORAGE DRAFT SYSTEM

Keep localStorage only for temporary unsaved drafts.

Never treat localStorage as the primary database.

Receipt draft:

```text
luckydental_receipt_draft_[patientNumber]
```

must:

* survive refresh
* restore draft
* clear after successful persistence
* never overwrite server data accidentally
* not contain secrets

---

# 32. RESPONSIVE UI AUDIT

Perform a complete UI audit.

Required:

```text
320px mobile
375px mobile
430px mobile
768px tablet
1024px tablet/small laptop
1280px desktop
1440px desktop
1920px desktop
```

Fix:

* horizontal overflow
* broken cards
* tables
* modals
* date pickers
* time pickers
* receipt preview
* sidebar
* navbar
* dashboard cards
* patient profile
* forms
* package cards
* schedule
* filters
* buttons
* dialogs
* public patient page

Mobile must NOT simply be a scaled desktop version.

---

# 33. MOBILE TABLES

Tables must be usable on mobile.

Use:

* responsive cards
* horizontal scrolling where appropriate
* stacked information
* compact actions

Do not allow the entire page to overflow horizontally.

---

# 34. DESIGN SYSTEM

Maintain the existing Luckydental design.

Primary style:

```text
Red glassmorphism
Modern
Premium
Clinical
Clean
Responsive
Smooth animation
```

Dark mode:

```text
deep obsidian
crimson/red glass
subtle glow
```

Light mode:

```text
clean clinical background
white glass cards
red accents
```

Do not make it overly flashy.

This is a dental management application.

---

# 35. ICON POLICY

No emojis.

Use:

```text
Lucide React
SVG
vector icons
```

throughout the application.

Remove accidental emoji UI elements.

---

# 36. DASHBOARD AUDIT

The dashboard must display only valid active data.

Verify:

```text
Total Patients
Today's Visits
Upcoming Visits
Today's Revenue
Total Revenue
Outstanding Due
Recent Patients
Today's Schedule
```

Every metric must be calculated from valid database records.

Deleted patients must never contribute to:

```text
patient count
revenue
due
recent patients
schedule
```

---

# 37. PUBLIC PATIENT PORTAL

Verify:

```text
Private
   ↓
403 Access Denied
```

Public:

```text
secure token
   ↓
patient profile
   ↓
patient information
   ↓
receipt history
   ↓
receipt details
```

Do not expose:

* admin credentials
* internal database IDs unnecessarily
* sensitive internal notes
* authentication tokens
* Cloudinary secrets
* backend secrets

---

# 38. PUBLIC LINK

Public patient links must use the secure token system already implemented.

Do not replace secure token access with predictable:

```text
/users/1
```

unless that route is authenticated admin-only.

Admin patient routes and public patient routes must remain separate.

---

# 39. SECURITY AUDIT

Perform a complete security audit.

Check:

* JWT validation
* bcrypt
* cookies
* CORS
* Helmet
* rate limiting
* input validation
* MongoDB query injection
* authorization
* IDOR
* public token security
* file upload validation
* MIME validation
* image processing
* file size limits
* secrets
* error leakage
* production logging

Never return:

```text
JWT_SECRET
CLOUDINARY_API_SECRET
MONGODB_URI
```

in API responses.

---

# 40. ERROR HANDLING

Production API errors must return clean responses.

Do not expose stack traces to users.

Development may have detailed logs.

Production should return safe messages.

Ensure frontend displays useful error messages rather than generic broken pages.

---

# 41. HEALTH CHECK

Make sure the backend health endpoint works after deployment.

Use the existing route if already implemented:

```text
/api/health
```

It should return useful information such as:

```json
{
  "success": true,
  "status": "healthy"
}
```

Do not expose secrets.

Configure Render health checking against this endpoint.

---

# 42. LOGGING

Production logs should be useful.

Log:

* startup
* database connection
* server shutdown
* unexpected errors
* important failures

Do NOT log:

* passwords
* JWT secrets
* Cloudinary API secret
* sensitive patient information unnecessarily

---

# 43. BUILD VERIFICATION

Run all available checks.

At minimum:

```bash
npm run typecheck
npm run build
```

for all workspaces where applicable.

Also run the backend production start command locally.

Example:

```bash
npm run build
npm start
```

Verify the server starts correctly.

---

# 44. DEPLOYMENT SIMULATION

Before saying deployment-ready, simulate:

```text
production build
        ↓
production environment variables
        ↓
backend starts
        ↓
MongoDB connects
        ↓
health endpoint works
        ↓
frontend points to backend
        ↓
login works
        ↓
patient CRUD works
        ↓
receipt works
        ↓
appointment works
        ↓
Cloudinary works
```

Fix actual failures.

---

# 45. CREATE deploy_guide.md

Create:

```text
deploy_guide.md
```

at the repository root.

It must be a complete step-by-step deployment guide.

Include:

## Part 1 — Prerequisites

Explain:

* MongoDB Atlas
* Cloudinary
* GitHub
* Render
* Vercel
* Netlify alternative

## Part 2 — Backend Deployment to Render

Explain exactly:

```text
New Web Service
Repository
Root Directory
Build Command
Start Command
Environment Variables
Health Check
Deploy
```

## Part 3 — Backend Environment Variables

Give a table.

## Part 4 — Find Backend URL

Explain that after deployment Render provides something like:

```text
https://luckydental-api.onrender.com
```

## Part 5 — Frontend Deployment

Explain Vercel.

Then explain Netlify as an alternative.

## Part 6 — Frontend Environment Variable

Explain:

```env
BACKEND_URL=https://luckydental-api.onrender.com
```

and clearly state that this should be the ONE backend URL configuration.

## Part 7 — CORS

Explain what production frontend origin must be configured in Render.

## Part 8 — Authentication

Explain production cookie requirements.

## Part 9 — Cloudinary

Explain required credentials.

## Part 10 — MongoDB

Explain required connection string.

## Part 11 — Testing

Provide a production checklist.

## Part 12 — Troubleshooting

Include common problems:

```text
CORS error
401 Unauthorized
Cookie not saving
MongoDB connection failed
Cloudinary upload failed
Render health check failed
Frontend cannot reach backend
Next.js build failed
```

---

# 46. CREATE / UPDATE README

Update README with:

```text
Project Overview
Architecture
Development
Environment Variables
Backend
Frontend
Deployment
```

Keep it concise.

Detailed deployment information belongs in:

```text
deploy_guide.md
```

---

# 47. UPDATE current.md

After completing all changes, update:

```text
current.md
```

It must accurately describe the REAL current implementation.

Do not write:

```text
WORKING
```

unless you verified it.

Add:

```text
Deployment Architecture
Render Backend
Vercel/Netlify Frontend
Environment Strategy
Production Security
Known Limitations
```

---

# 48. UPDATE done.md

Add a new deployment-readiness section.

Document:

* Render backend preparation
* frontend deployment preparation
* centralized backend URL
* CORS
* production authentication
* deleted patient dashboard fix
* responsive audit
* production build verification
* deployment documentation

Only mark items completed after verification.

---

# 49. DO NOT BREAK EXISTING FEATURES

This is critical.

Do not remove:

* MongoDB
* Cloudinary
* patient system
* receipt system
* appointment system
* package system
* custom fields
* public sharing
* authentication
* dashboard
* dark/light theme
* receipt version history

Do not rewrite working modules unnecessarily.

Prefer:

```text
audit
→ isolate issue
→ minimal correct fix
→ test
```

rather than:

```text
rewrite everything
```

---

# 50. FINAL QUALITY REQUIREMENT

The final application should feel like a real production dental management SaaS, not a demo.

It must be:

```text
Secure
Persistent
Responsive
Fast
Deployable
Maintainable
Mobile-friendly
Database-driven
Production-ready
```

---

# 51. FINAL VERIFICATION REPORT

At the end, provide a detailed report containing:

## A. What you inspected

List files/directories audited.

## B. What you changed

Detailed list.

## C. Bugs found

For every bug:

```text
Problem
Root Cause
Fix
Verification
```

## D. Features confirmed working

Categorize:

```text
Authentication
Patients
Receipts
Appointments
Packages
Custom Fields
Dashboard
Public Sharing
Cloudinary
MongoDB
Responsive UI
```

## E. Deployment status

Clearly state:

```text
Render Backend: READY / NOT READY
Vercel Frontend: READY / NOT READY
Netlify Frontend: READY / NOT READY
MongoDB: READY / NOT READY
Cloudinary: READY / NOT READY
```

## F. Environment variables

List exactly which variables are required by:

```text
Backend
Frontend
```

## G. Remaining Issues

Do NOT hide unresolved issues.

## H. Testing results

Show the actual results of:

```text
TypeScript
Build
Backend startup
Health check
Database
API
Frontend
```

## I. Files created/modified

Give a concise list.

---

# 52. MOST IMPORTANT RULE

Do not trust `done.md` or `current.md` blindly.

They describe the intended/current state, but your job is to verify the actual implementation.

If documentation says:

```text
WORKING
```

but the code is broken:

> Fix the code and update the documentation.

If documentation says:

```text
MISSING
```

but the feature already exists:

> Verify it and update the documentation.

The final:

```text
current.md
done.md
deploy_guide.md
```

must match the actual codebase.

---

# 53. START NOW

Begin with:

```text
1. Read done.md
2. Read current.md
3. Audit repository
4. Audit deployment architecture
5. Audit frontend API configuration
6. Audit Render compatibility
7. Audit authentication/CORS
8. Audit dashboard deleted-patient issue
9. Audit responsive UI
10. Fix issues
11. Build/test
12. Create deploy_guide.md
13. Update current.md
14. Update done.md
15. Produce final audit report
```

Do not stop after documentation.

Actually implement and verify the changes.
