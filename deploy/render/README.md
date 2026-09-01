# Render Backend Deployment Guide — Luckydental API

This directory contains the deployment specification and blueprint for deploying the **Luckydental Express API** independently to [Render](https://render.com).

---

## 1. Fast Deploy via Blueprint
1. In your Render Dashboard, click **New +** -> **Blueprint**.
2. Connect your Git repository containing `patient-portal`.
3. Point Render to `deploy/render/render.yaml`.
4. Fill in the sensitive environment variables (`MONGODB_URI`, `CLOUDINARY_API_SECRET`, `CORS_ORIGIN`).
5. Click **Apply** to deploy.

---

## 2. Manual Web Service Configuration
If creating a manual **Web Service** on Render instead of using Blueprints:

| Setting | Value |
|---|---|
| **Name** | `luckydental-api` |
| **Environment** | `Node` |
| **Region** | `Oregon (US West)` or closest region |
| **Branch** | `main` |
| **Root Directory** | *(Leave blank - uses repository root)* |
| **Build Command** | `npm install && npm run build:api` |
| **Start Command** | `npm run start:api` |
| **Health Check Path** | `/api/health` |

---

## 3. Required Environment Variables on Render
Configure these in the **Environment** tab:

| Variable | Required | Sample Value / Description |
|---|---|---|
| `NODE_ENV` | Yes | `production` |
| `PORT` | Auto | Render assigns `10000` (API handles dynamically) |
| `MONGODB_URI` | Yes | `mongodb+srv://<user>:<password>@cluster0.mongodb.net/luckydental` |
| `JWT_SECRET` | Yes | Secure 32+ character random string |
| `CORS_ORIGIN` | Yes | `https://your-frontend.vercel.app` (or comma-separated URLs) |
| `ADMIN_DEFAULT_EMAIL` | Yes | `admin@clinic.com` |
| `ADMIN_DEFAULT_PASSWORD` | Yes | `admin123` (or custom secure password) |
| `CLOUDINARY_CLOUD_NAME` | Yes | Your Cloudinary Cloud Name (e.g. `mahkgdyp`) |
| `CLOUDINARY_API_KEY` | Yes | Your Cloudinary API Key (e.g. `885999628435599`) |
| `CLOUDINARY_API_SECRET` | Yes | Your Cloudinary API Secret |

---

## 4. Verification
Once deployed, verify your service by navigating to:
```text
https://<your-render-service>.onrender.com/api/health
```
Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "storage": "cloudinary",
  "uptime": 12.34
}
```
