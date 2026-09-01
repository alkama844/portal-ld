# Luckydental Production Deployment Guide (`deploy_guide.md`)

This guide provides complete, step-by-step instructions for deploying the **Luckydental Dental Management System** into production. The system is architected for independent multi-cloud deployment:
- **Backend API**: Deployed independently to **Render** (Node.js/Express)
- **Frontend Web App**: Deployed independently to **Vercel** (or **Netlify**) (Next.js App Router)
- **Database**: **MongoDB Atlas**
- **Media Storage & CDN**: **Cloudinary**

---

## Part 1 — Prerequisites

Before starting deployment, ensure you have:
1. **GitHub Account**: Push this `patient-portal` repository to a private or public GitHub repo.
2. **MongoDB Atlas Account**: A free or dedicated MongoDB database cluster ([mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)).
3. **Cloudinary Account**: Cloudinary cloud name, API key, and API secret ([cloudinary.com](https://cloudinary.com)).
4. **Render Account**: For hosting the backend web service ([render.com](https://render.com)).
5. **Vercel Account** (or **Netlify**): For hosting the Next.js frontend ([vercel.com](https://vercel.com) / [netlify.com](https://netlify.com)).

---

## Part 2 — Backend Deployment to Render

You can deploy the backend using Render's Web UI or via the automated Blueprint specification in `deploy/render/render.yaml`.

### Method A: Web UI Manual Setup (Recommended)
1. Log in to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository containing `patient-portal`.
4. Configure the service settings:
   - **Name**: `luckydental-api`
   - **Region**: `Oregon (US West)` (or your preferred region)
   - **Branch**: `main`
   - **Root Directory**: *(Leave blank — uses repository root)*
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build:api`
   - **Start Command**: `npm run start:api`
   - **Plan Type**: `Free` or `Starter`
5. Expand **Advanced** -> **Health Check Path**:
   - Set to `/api/health`
6. Add the environment variables specified in **Part 3** below.
7. Click **Create Web Service**.

### Method B: Render Blueprint Deploy
1. In Render, click **New +** -> **Blueprint**.
2. Select your repository. Render will automatically read `deploy/render/render.yaml`.
3. Provide the secret environment variables when prompted and click **Apply**.

---

## Part 3 — Backend Environment Variables on Render

Configure these key-value pairs in the **Environment** tab on Render:

| Variable Name | Required | Default / Example Value | Description |
|---|---|---|---|
| `NODE_ENV` | **YES** | `production` | Enables production optimizations & secure cross-origin cookies |
| `PORT` | **AUTO** | `5000` *(Render injects automatically)* | Port assigned dynamically by Render |
| `MONGODB_URI` | **YES** | `mongodb+srv://<user>:<pwd>@cluster0.mongodb.net/luckydental?retryWrites=true&w=majority` | Primary persistent MongoDB connection string |
| `JWT_SECRET` | **YES** | `super_secure_random_jwt_secret_key_32_chars` | 32+ character secret for signing authentication JWTs |
| `CORS_ORIGIN` | **YES** | `https://luckydental.vercel.app` | Production frontend domain (supports comma-separated URLs) |
| `ADMIN_DEFAULT_EMAIL` | **YES** | `admin@clinic.com` | Primary admin login email |
| `ADMIN_DEFAULT_PASSWORD` | **YES** | `YourSecurePassword123!` | Primary admin login password (auto-seeded on first run) |
| `CLOUDINARY_CLOUD_NAME` | **YES** | `mahkgdyp` | Cloudinary Cloud Name |
| `CLOUDINARY_API_KEY` | **YES** | `885999628435599` | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | **YES** | `<your_cloudinary_api_secret>` | Cloudinary API Secret |
| `MAX_PROFILE_IMAGE_SIZE_MB` | NO | `1` | Max patient profile image upload size in MB |
| `UPLOAD_TEMP_MAX_AGE_MINUTES`| NO | `60` | Staging upload garbage collection interval |

---

## Part 4 — Find Your Render Backend URL

Once Render completes the build, your live service URL will appear at the top of the dashboard:
```text
https://luckydental-api.onrender.com
```
Test the health endpoint in your browser:
```text
https://luckydental-api.onrender.com/api/health
```
Expected output:
```json
{
  "status": "healthy",
  "database": "connected",
  "storage": "cloudinary",
  "uptime": 14.2
}
```

---

## Part 5 — Frontend Deployment

### Deploying to Vercel (Recommended)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** -> **Project**.
2. Import your GitHub repository.
3. In the project setup screen:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click *Edit* and select `apps/web`.
   - **Build Command**: `npm run build` (or leave default `next build`)
   - **Output Directory**: `Next.js default`
4. Expand **Environment Variables** and add the single required variable:
   - **Key**: `BACKEND_URL`
   - **Value**: `https://luckydental-api.onrender.com` *(Your Render URL from Part 4)*
5. Click **Deploy**.

### Alternative: Deploying to Netlify
1. Go to [Netlify Dashboard](https://app.netlify.com) and click **Add new site** -> **Import an existing project**.
2. Select your repository.
3. Configure site build:
   - **Base directory**: `apps/web`
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
4. Add environment variable:
   - `BACKEND_URL`: `https://luckydental-api.onrender.com`
5. Click **Deploy site**.

---

## Part 6 — Single Frontend Environment Variable Rule

The Luckydental frontend uses **ONE** single environment variable for all API communication:

```env
BACKEND_URL=https://luckydental-api.onrender.com
```

> **Why this matters**: You do **not** need to maintain duplicate variables like `NEXT_PUBLIC_API_URL`, `API_URL`, or `SERVER_URL`. The Next.js build bridge in `next.config.js` automatically bakes `BACKEND_URL` into the client API client.
> 
> In local development without environment variables, it defaults gracefully to `http://localhost:5000`.

---

## Part 7 — CORS Configuration

To allow your Vercel or Netlify frontend to communicate with your Render backend:
1. Copy your live frontend domain from Vercel (e.g., `https://luckydental.vercel.app`).
2. Open your **Render Dashboard** -> `luckydental-api` -> **Environment**.
3. Set `CORS_ORIGIN` to your frontend domain:
   ```env
   CORS_ORIGIN=https://luckydental.vercel.app
   ```
   *(If you have multiple domains, e.g. custom domain + preview URL, separate them with commas: `https://luckydental.com,https://luckydental.vercel.app`)*.
4. Save changes. Render will automatically re-deploy.

---

## Part 8 — Authentication & Cross-Origin Cookies

The system uses two synchronized authentication methods to guarantee 100% login reliability across different domains:
1. **HTTP-Only Cookies (`admin_token`)**:
   - Configured with `secure: true` and `sameSite: 'none'` in production, allowing HTTPS cross-origin credential passing.
2. **Bearer Token Fallback**:
   - The frontend stores the JWT in `localStorage` upon login and attaches `Authorization: Bearer <token>` to every request.
   - This ensures full functionality even for browsers (like Safari) that restrict third-party cross-site cookies.

---

## Part 9 — Cloudinary Configuration

1. In your Cloudinary console, locate:
   - Cloud Name
   - API Key
   - API Secret
2. Set them on Render: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
3. The Sharp image pipeline automatically auto-rotates EXIF metadata, converts photos to WebP format strictly under 1MB, and cleans up replaced or deleted patient assets automatically.

---

## Part 10 — MongoDB Atlas Connection

1. In MongoDB Atlas, create a database user with Read/Write privileges.
2. Under **Network Access**, add `0.0.0.0/0` (Allow access from anywhere) so Render's dynamic IP addresses can reach the cluster.
3. Copy your SRV connection string:
   ```text
   mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/luckydental?retryWrites=true&w=majority
   ```
4. Set it as `MONGODB_URI` in Render's environment settings.

---

## Part 11 — Post-Deployment Verification Checklist

Once both services are deployed, perform this smoke test:

- [ ] **1. Health Check**: Visit `https://luckydental-api.onrender.com/api/health` — should return `200 OK` with `"database": "connected"`.
- [ ] **2. Frontend Load**: Visit `https://luckydental.vercel.app` — should render the Luckydental Login page.
- [ ] **3. Admin Login**: Log in with `admin@clinic.com` and your configured `ADMIN_DEFAULT_PASSWORD`.
- [ ] **4. Dashboard**: Verify metric cards show real active data (0 patients or existing records).
- [ ] **5. Register Patient**: Create a new patient `#1001` with name, phone, age, and problem.
- [ ] **6. Upload Image**: Attach a patient profile photo and verify Cloudinary CDN delivery.
- [ ] **7. Create Receipt**: Add dental packages, enter a cash deposit, pick an appointment date/time, and finalize the invoice.
- [ ] **8. Print Receipt**: Open the receipt and verify clean monochrome A4 print styling.
- [ ] **9. Check Schedule**: Verify the appointment appears under `/appointments` (in `Today`, `Tomorrow`, or `Upcoming` tab).
- [ ] **10. Public Portal**: Click *Share* on the patient profile, open the `/public/patient/<token>` link in an incognito window, and verify strict data isolation.
- [ ] **11. Cascade Delete**: Delete a test patient and verify their revenue and appointment disappear from dashboard statistics.

---

## Part 12 — Troubleshooting Guide

### 1. `CORS Error: Access to fetch has been blocked by CORS policy`
- **Cause**: The `CORS_ORIGIN` environment variable on Render does not match your Vercel frontend URL.
- **Fix**: Update `CORS_ORIGIN` in Render to match your exact frontend domain (including `https://`, without a trailing slash).

### 2. `401 Unauthorized` or Login Session Not Persisting
- **Cause**: Browser blocked cross-site cookie or `JWT_SECRET` changed.
- **Fix**: The frontend automatically uses Bearer headers from `localStorage`. Clear your browser storage, verify `JWT_SECRET` is set in Render, and log in again.

### 3. `MongoDB connection failed` or Server Exits
- **Cause**: IP whitelist in MongoDB Atlas is blocking Render or `MONGODB_URI` contains incorrect credentials.
- **Fix**: In MongoDB Atlas -> Network Access, ensure `0.0.0.0/0` is allowed. Double check the database password (encode special characters if necessary).

### 4. `Cloudinary upload failed`
- **Cause**: Cloudinary credentials missing or invalid.
- **Fix**: Verify `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` are set in Render. Run `npm run test:cloudinary` locally to verify keys.

### 5. `Render Free Tier Spinning Down (Cold Start)`
- **Cause**: Free tier web services on Render sleep after 15 minutes of inactivity. The first request takes 30-50 seconds to wake up.
- **Fix**: The frontend API client has a built-in 30-second timeout. For instant response in production, upgrade the Render instance to the **Starter** plan ($7/mo) or use an uptime monitor pinging `/api/health`.

### 6. `Next.js Build Error on Vercel`
- **Cause**: Incorrect Root Directory selected in Vercel.
- **Fix**: In Vercel Project Settings -> General -> Root Directory, ensure `apps/web` is selected.
