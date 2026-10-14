# PaperPulse

A free Cambridge exam-preparation platform prototype for students from Class 7 to A Levels.

**Status:** React/Vite website source and a Cloudflare Workers + D1 starter are committed here. This is not yet deployed as a live website, and the catalogue/progress screens currently include illustrative demo data.

## Run locally

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Create a production bundle with `npm run build`.

## What's included

- Responsive React frontend with Home, Dashboard, Past Papers, Topicals, Worksheet Builder, Community, Account, and Admin preview screens.
- Search and filters for sample paper metadata, save-for-later UI, subject/topic browser, live worksheet preview, theme toggle and mobile navigation.
- Cloudflare Worker API starter for account registration/login/logout, subjects/topics, rights-filtered resource metadata, saved resources, practice attempts, discussions/replies and an admin overview.
- D1 relational schema for accounts/sessions, subjects/topics, resources and rights status, practice history, saved resources, worksheets, discussions, replies, reports and notifications.

## Configure Cloudflare API

See [cloudflare/README.md](cloudflare/README.md). Briefly: create a D1 database, copy `cloudflare/wrangler.toml.example` to `cloudflare/wrangler.toml`, set your D1 ID and allowed origins, apply `schema.sql`, and deploy the Worker. Then copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL`.

Do not commit `.env.local`, API secrets or real credentials. The Worker is a starter and needs rate limiting, email verification, password recovery, abuse monitoring, age-appropriate community safeguards, privacy/deletion workflows and a security review before public launch.

## Content rights

The past-paper entries and dashboard metrics in the UI are sample data, not a complete verified catalogue or downloadable files. Only publish papers or learning resources that PaperPulse is licensed or otherwise authorized to distribute or link to. Track source and rights status; do not scrape or mirror third-party archives without permission.

## Current limitations

The frontend's other screens are still demo-driven until their read/write actions are connected to the API. The account form can call the Worker once configured. This repo does not mean the website is deployed; Cloudflare Pages or another hosting target still needs to be configured.
