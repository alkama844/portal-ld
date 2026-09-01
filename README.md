# Luckydental Management System & Patient Portal

A modern, production-grade dental clinic administration and patient management platform built with Next.js 14, Express, TypeScript, MongoDB, and Cloudinary.

---

## Features Overview

- **Electronic Health Records (EHR)**: Full patient registration with atomic collision-proof sequence numbering starting at `#1001`.
- **Debounced Duplicate Phone Detection**: Real-time 600ms debounced checking with non-blocking modal actions.
- **Singleton Billing & Invoice Engine**: Guarantees exactly one active financial receipt per patient, snapshotting treatment package prices and automatically maintaining an immutable version audit trail (`v1`, `v2`, `v3`).
- **Integrated Scheduling**: Interactive DatePicker & TimePicker for instant appointment booking directly from receipts or the `/appointments` schedule (with `Today`, `Tomorrow`, `Upcoming`, `Past`, and `All` tabs).
- **Secure Public Patient Portals**: Cryptographic 24-character hex tokens (`/public/patient/<token>`) with strict data isolation and IDOR protection.
- **Optimized Media Pipeline**: Multi-pass Sharp WebP compression (<= 1MB) with direct streaming to Cloudinary CDN and automatic deletion of replaced/orphaned assets.
- **Visual Design System**: Crimson glassmorphism with dark obsidian mode (`#070707`) and crisp clinical light mode.

---

## Architecture & Tech Stack

- **Monorepo**: npm workspaces (`packages/shared`, `apps/api`, `apps/web`).
- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, Lucide React Icons.
- **Backend API**: Node.js, Express 4.19, TypeScript, Sharp 0.34, Multer, Helmet, CORS.
- **Database**: MongoDB 6+ / 7+ via Mongoose 8.4 (Connection pooling: `maxPoolSize: 10`, `minPoolSize: 2`, `autoIndex: true`).
- **Media CDN**: Cloudinary SDK v2.
- **Authentication**: JWT signed tokens via HTTP-only cookies (`sameSite: 'none'`, `secure: true` in production) and Bearer header fallback.

---

## Repository Structure

```text
patient-portal/
├── apps/
│   ├── api/                     # Express REST API (TypeScript)
│   └── web/                     # Next.js App Router Web Application
├── packages/
│   └── shared/                  # Shared TypeScript types, interfaces & enums
├── deploy/
│   └── render/                  # Render backend blueprint (render.yaml)
├── README.md                    # Project Documentation
└── package.json                 # Monorepo root configuration
```

---

## Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
- Set backend environment variables in `apps/api/.env`
- Set frontend environment variables in `apps/web/.env.local`

### 3. Run Development Servers
```bash
npm run dev
```
- **Web App**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/api/health`

Default Admin Login:
- **Email**: `admin@clinic.com`
- **Password**: `admin123`

---

## Production Deployment

Luckydental is architected for independent multi-cloud deployment:

1. **Backend (Render)**:
   - Root Directory: `.`
   - Build Command: `npm install && npm run build:api`
   - Start Command: `npm run start:api`
   - Health Check: `/api/health`

2. **Frontend (Vercel / Netlify)**:
   - Base Directory: `apps/web`
   - Build Command: `npm run build`
   - Publish Directory: `apps/web/.next`
   - Environment Variable: `BACKEND_URL=https://<your-render-backend-url>`

---

## Testing & Verification

- **Typecheck Entire Monorepo**:
  ```bash
  npm run typecheck
  ```
- **Build Entire Monorepo**:
  ```bash
  npm run build
  ```
- **Database Integrity Audit**:
  ```bash
  npm run audit:db --workspace=apps/api
  ```
- **Test Cloudinary Storage**:
  ```bash
  npm run test:cloudinary --workspace=apps/api
  ```

---

## License

Private & Confidential — Luckydental Clinic Management System.
