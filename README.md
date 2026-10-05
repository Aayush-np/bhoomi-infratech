<div align="center">

# BHOOMI INFRATECH

**Civil Construction · Infrastructure · Real Estate**

A production-grade, fully data-driven company website with a custom admin CMS,
PostgreSQL backend and hardened security — built from scratch, no frameworks.

[![Live Site](https://img.shields.io/badge/LIVE-bhoomiinfratech.netlify.app-f5a623?style=for-the-badge&logo=netlify&logoColor=white)](https://bhoomiinfratech.netlify.app)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20RLS-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Vanilla JS](https://img.shields.io/badge/Vanilla-ES6%2B-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![No Build Step](https://img.shields.io/badge/Build%20Step-none-101010?style=for-the-badge)

</div>

---

## Overview

Complete web platform for a construction & infrastructure company — marketing
site + private admin console, powered by Supabase (PostgreSQL with row-level
security) and deployed as a static site on Netlify. Every section of the public
site (projects, services, gallery, news, testimonials, company profile, contact)
is rendered live from the database; the admin console manages it all — no code
edits needed to change content. If the backend is unreachable, the site
gracefully falls back to built-in content so it can never go blank.

> This project was also put through a **full self-audit / pen-test cycle**
> (RLS review, XSS sink hunting, info-disclosure probing, CSP hardening) —
> see [Security](#security).

## Features

**Public site**
- Animated hero with rotating photo stack, scramble text, magnetic buttons
- Live-rendered portfolio (featured stack + filterable field register)
- Service detail cards, project modals with spec sheets & progress bars
- News dispatches + announcements, testimonial slider, masonry gallery + lightbox
- Interactive Leaflet map (Ctrl-zoom only), contact form → real database rows
- Fully responsive, keyboard-navigable, `prefers-reduced-motion` aware

**Admin console** (`/admin/`)
- Email + password auth gated by a server-side allow-list, optional
  Cloudflare Turnstile CAPTCHA
- Dashboard: record counts, 6-month inquiry chart, active-build progress
- Full CRUD for projects, services, gallery (multi-upload + ordering),
  news/announcements, testimonials-backed sections, company settings
- Inquiry inbox: search, status workflow (new → contacted → closed),
  CSV export
- Image uploads to Supabase Storage with preview & cleanup

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML/CSS/JS (ES6+), zero dependencies, no build step |
| Maps | Leaflet + OpenStreetMap |
| Backend | Supabase — PostgreSQL, Row-Level Security, Storage, Auth |
| Security | RLS policies, SECURITY DEFINER guards, CSP + hardened headers, Turnstile CAPTCHA, honeypot |
| Hosting / CI | Netlify (static deploy, `_redirects`, `_headers`) |

## Architecture

```
Visitor                     Admin                        Supabase
   │                          │                              │
   ├─ index.html + cms.js ────┼────────── SELECT (anon RLS) ─┤  projects / services
   │   hydrates page in place │                              │  news / gallery / …
   ├─ contact form ───────────┼────────── INSERT (bounded) ──┤  inquiries
   │                          │                              │
   │                     admin/index.html                    │
   │                     email+password auth ── sign-in ────▶│  GoTrue + Turnstile
   │                     is_admin() (SECURITY DEFINER)       │
   │                          └────────── CRUD / uploads ───▶│  all tables + media bucket
```

## Project Structure

```
├── index.html            # Public site (single page)
├── 404.html              # Branded 404 (also used to mask internal files)
├── config.js             # Public config: Supabase URL + anon key, Turnstile key
├── _headers              # Netlify security headers incl. Content-Security-Policy
├── _redirects            # Force-404s internal files (setup.sql, *.md, .env…)
├── css/style.css         # Public design system
├── js/
│   ├── cms.js            # Data hydration layer (escapes/sanitizes all DB content)
│   └── main.js           # UI modules — sliders, modals, map, inquiry form
├── admin/                # Admin console (auth-gated SPA)
│   ├── index.html
│   └── css|js/           # ui kit, api layer, forms, hash router, views/*
├── supabase/setup.sql    # Schema + RLS + storage bucket + seed data (run once)
├── img/                  # Static assets
└── README-ADMIN.md       # Admin console deep-dive (setup, workflows)
```

## Security

Security was treated as a first-class feature, verified with live probes:

- **Row-Level Security everywhere** — anon role can only `SELECT` public
  content and `INSERT` length-bounded inquiries; all writes require an
  authenticated admin session checked via `is_admin()`
  (`SECURITY DEFINER`, pinned `search_path`).
- **Private admin allow-list** — `admin_users` is *not* publicly readable;
  members can only read their own row.
- **XSS-hardened rendering** — every DB value reaching `innerHTML` is escaped;
  the two markup-allowing fields are sanitized to `<b>`/`<br>` only; includes
  a payload regression test.
- **Content-Security-Policy** on all pages (no inline scripts allowed),
  `frame-ancestors` anti-clickjacking, `nosniff`, Referrer & Permissions
  policies, `no-store` on the admin shell.
- **Info-disclosure blocks** — setup SQL, markdown docs, env/git/config files
  force-404 on Netlify even though they exist in the repo.
- **Abuse controls** — honeypot + submission throttle on the contact form,
  optional Turnstile CAPTCHA on admin sign-in/sign-up.
- Public config contains **only public-by-design keys** — no secrets in the repo.

## Quick Start (local)

```bash
# any static server works — no build step
python -m http.server 8080

# public site   → http://localhost:8080
# admin console → http://localhost:8080/admin/
```

## Deployment (Netlify)

The repo is deploy-ready: connect it on Netlify with **no build command** and
the root as the publish directory. `_headers` and `_redirects` are applied
automatically.

## Author

**Aayush Jaiswal**
📧 aayush.cse24@cmrit.ac.in · 🔗 [Live Demo](https://bhoomiinfratech.netlify.app)

## License

[MIT](LICENSE) © 2026 Aayush Jaiswal
