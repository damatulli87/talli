# Talli — Vercel Deployment Guide

## Overview

This app runs entirely on:
- **Frontend**: Vite + React → deployed to Vercel
- **Backend/Auth**: Supabase (database, auth, file storage)
- **AI receipt scan**: Vercel serverless function → Anthropic Claude (optional)

---

## Step 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Click **New project**, choose a name (e.g. `talli`), set a database password, pick a region.
3. After the project is ready, go to **Settings → API** and note:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon / public key** → `VITE_SUPABASE_ANON_KEY`

---

## Step 2 — Run the Database Schema

In Supabase, open the **SQL Editor** and run the following SQL:

```sql
-- Tables
CREATE TABLE cycle_configs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  schedule_type   TEXT,
  work_days       INTEGER[],
  travel_days     INTEGER[],
  daily_rate      NUMERIC,
  travel_day_rate NUMERIC,
  travel_day_multiplier NUMERIC,
  cycle_type      TEXT,
  weeks_on        INTEGER,
  weeks_off       INTEGER,
  days_on         INTEGER,
  days_off        INTEGER,
  cycle_start_date DATE,
  cycle_days      INTEGER,
  label           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expenses (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount                 NUMERIC NOT NULL,
  category               TEXT NOT NULL,
  description            TEXT,
  date                   DATE NOT NULL,
  counts_toward_per_diem BOOLEAN DEFAULT TRUE,
  week_start             DATE,
  receipt_url            TEXT,
  receipt_ocr_data       JSONB,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cycle_overrides (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cycle_start_key  DATE NOT NULL,
  day_overrides    JSONB,
  note             TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security — each user sees only their own data
ALTER TABLE cycle_configs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_overrides  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own cycle_configs"   ON cycle_configs   FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own expenses"        ON expenses        FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own cycle_overrides" ON cycle_overrides FOR ALL USING (auth.uid() = user_id);

-- Storage bucket for receipt photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "upload own receipts" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "receipts are public" ON storage.objects
  FOR SELECT USING (bucket_id = 'receipts');

CREATE POLICY "delete own receipts" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## Step 3 — Enable Auth Providers in Supabase

1. Go to **Authentication → Providers**.
2. Enable **Google** (requires Google OAuth client ID + secret from Google Cloud Console).
3. Email (magic link) is enabled by default — no extra steps needed.
4. Under **URL Configuration**, set:
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**: `https://your-app.vercel.app/**`

---

## Step 4 — Deploy to Vercel

### Option A — Vercel CLI (recommended for first deploy)

```bash
npm install -g vercel
cd path/to/Talli
vercel
```

Follow the prompts. When asked for framework, choose **Vite**.

### Option B — Vercel Dashboard (Git-connected)

1. Push the `Talli` folder to a GitHub repository.
2. Go to [vercel.com](https://vercel.com) → **New Project** → import the repo.
3. Vercel auto-detects the framework as Vite.
4. Verify settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

---

## Step 5 — Set Environment Variables in Vercel

In your Vercel project → **Settings → Environment Variables**, add:

| Variable | Value | Required |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` | ✅ |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | ✅ |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Optional (enables AI receipt scan) |

> **Note**: `VITE_` prefix makes variables available to the browser bundle. `ANTHROPIC_API_KEY` has no prefix — it is only used server-side in the `api/scan-receipt.js` function.

---

## Step 6 — Deploy

Click **Deploy** in Vercel, or run `vercel --prod` from the CLI.

---

## What Still Depends on Base44

**Nothing.** The migration is complete:

| Feature | Was | Now |
|---|---|---|
| Database (expenses, configs, overrides) | Base44 entities | Supabase Postgres |
| Authentication | Base44 token/redirect | Supabase Auth (Google + magic link) |
| File upload (receipts) | Base44 `UploadFile` | Supabase Storage |
| AI receipt OCR | Base44 `InvokeLLM` | Vercel function → Anthropic Claude |
| App icon | Base44 CDN | Local `/public/favicon.svg` |

---

## Local Development

1. Copy `.env.example` to `.env.local` and fill in your Supabase values:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ANTHROPIC_API_KEY=sk-ant-...  # optional
   ```
2. Install dependencies and start the dev server:
   ```bash
   npm install
   npm run dev
   ```

---

## Custom App Icon

The current favicon is a placeholder SVG at `public/favicon.svg`. To use the original Talli icon:
1. Download `talli_app_icon.png` and save it to `public/`.
2. Update `index.html` and `public/manifest.json` to point to `/talli_app_icon.png`.
