# Bhoomi Infratech — Admin Console

Premium admin dashboard for the Bhoomi Infratech website. Everything the
admin edits here is stored in a **Supabase** database (Postgres) and served
to the public website on the visitor's next visit. No page reload of your
editor required — the site is fully data-driven after setup.

## What you can manage

| Section | Capabilities |
|---|---|
| **Dashboard** | Record counts, 6-month inquiry chart, active build progress, latest inquiries |
| **Projects** | Add / edit / delete, ongoing↔completed, progress %, category, featured (homepage stack) vs grid placement, spec sheet, image upload |
| **Services** | Add / edit / delete, summary + detail copy, scope, two tag sets, image |
| **Gallery** | Multi-upload (drag & drop), captions, reorder, site-gallery ↔ hero-stack, replace, delete |
| **News & Notices** | News cards (photo + expandable dispatch) and announcement rows — full CRUD |
| **Inquiries** | Search, filter by status / project type, mark contacted/closed, detail view, CSV export, delete |
| **Settings** | Company profile (about, mission/vision, values), headline stats, contact & office details |

## One-time setup (≈10 minutes)

1. **Create a Supabase project**
   Go to [supabase.com](https://supabase.com) → *New project* (free tier is
   enough). Wait for it to finish deploying.

2. **Run the database script**
   Supabase Dashboard → *SQL Editor* → *New query*.
   Open `supabase/setup.sql`, **replace the admin email** at the top of
   section 4 with the email you will use in the admin console, then paste
   and run the whole script.
   It creates all tables, security policies, the public `media` image
   bucket, and seeds the database with the current website content — so
   the public site looks exactly the same after wiring.

3. **Point the site at your project**
   Supabase Dashboard → *Project Settings* → *API*. Copy the **Project URL**
   and the **anon public key** into `config.js` (root folder):

   ```js
   window.SITE_CONFIG = {
     supabaseUrl: 'https://xxxx.supabase.co',
     supabaseAnonKey: 'eyJhbGciOi...'
   };
   ```

4. **Create your admin account**
   Open `/admin/` on the deployed site → *Create an account* with the admin
   email you registered in step 2 (any password, min 6 characters).
   Then *Sign in*. Done — you are on the admin list.

5. **Enable login CAPTCHA (recommended — stops password-spraying bots)**
   - Create a free [Cloudflare Turnstile](https://dash.cloudflare.com) →
     *Add site* (choose "Managed", add your Netlify domain). Copy the
     **Site Key** and **Secret Key**.
   - Supabase Dashboard → *Authentication* → *Attack Protection* →
     **Enable CAPTCHA protection** → choose Cloudflare Turnstile → paste
     the **Secret Key** → Save.
   - Paste the **Site Key** into `config.js` as `captchaSiteKey`.
   The admin sign-in / sign-up form will then show a CAPTCHA widget and
   refuse to submit without it.

### Adding more admins
Admin access is an email allow-list. To add someone:

```sql
insert into public.admin_users (email) values ('partner@bhoomiinfratech.com');
```

(run in the Supabase SQL editor) — or remove them with
`delete from public.admin_users where email = '…'`.

## How it works

- **Public site** (`index.html` + `js/cms.js`) — on load it fetches every
  content collection from Supabase and hydrates the page in place: stats,
  about, services, projects (stack + grid), gallery + hero stack, news,
  announcements, testimonials, contact block.
  If the backend is unreachable or `config.js` is empty, the page keeps
  its built-in content — the site can never go blank.
- **Inquiries** — the public contact form now writes real submissions to
  the `inquiries` table (reference number `INQ-YYYY-NNNN` is kept).
- **Images** — uploads go to the public `media` storage bucket
  (`/media/…/filename.jpg`), referenced by URL, so they load fast on the
  public site.
- **Security** — row-level security: visitors can only *read* content and
  *insert* inquiries (length-bounded, plus a honeypot field and a 30-second
  throttle on the public form). All writes require a signed-in session whose
  email is on `admin_users`. The anon key is safe to expose.
  - `/supabase/*` and `/README-ADMIN.md` are force-blocked (404) on Netlify
    via `_redirects` — setup scripts and internals are never downloadable.
  - A Content-Security-Policy, `X-Frame-Options`, `nosniff`,
    `Referrer-Policy` and `Permissions-Policy` are served from `_headers`;
    `/admin/*` additionally denies framing and caching.
  - Optional Cloudflare Turnstile CAPTCHA protects sign-in / sign-up
    (see setup step 5).
  - All DB content injected via `innerHTML` is HTML-escaped; the two fields
    that intentionally allow markup (`lede`, hero captions) are sanitized
    to `<b>`/`<br>` only.
  - The `admin_users` allow-list itself is **not** publicly readable — the
    `is_admin()` RLS helper runs `SECURITY DEFINER` (with a pinned
    `search_path`), and signed-in users may only read their own row.
  ⚠️ **If you ran an older version of `setup.sql`** (where
  `admin_users` was publicly readable), re-run the updated
  `supabase/setup.sql` — the previous policy leaked your admin email list
  to anyone holding the public anon key.

## File map (new)

```
config.js                  → your Supabase URL + anon key (edit this)
supabase/setup.sql         → schema, RLS, bucket, seed data (run once)
js/cms.js                  → public-site data hydration layer
admin/                     → the console (static — deploy with the site)
  index.html
  css/admin.css
  js/ui.js                 → toasts, modals, confirms, states, helpers
  js/api.js                → Supabase auth/CRUD/storage
  js/forms.js              → validation, image uploader, specs/tags editors
  js/app.js                → auth gate + hash router + sidebar counts
  js/views/*.js            → dashboard, projects, services, gallery,
                             news, inquiries, settings
```

Existing files were touched minimally: `index.html` (gallery section,
script tags, admin footer link), `js/main.js` (CMS-aware bindings with
fallbacks to the original hardcoded data), `css/style.css` (two tiny
additions). Nothing in the public design was changed.

## Local testing

The site is static — serve the folder with any static server:

```bash
# from D:\Bhoomi_Infratech
python -m http.server 8080
```

Then open `http://localhost:8080` (public) and
`http://localhost:8080/admin/` (console).

## Verification checklist after setup

1. Add a test project in **Admin → Projects** → open the public site:
   it appears in the featured stack and/or field grid.
2. Edit its progress → public site shows the new percentage and bar.
3. Delete it → it disappears from the public site.
4. Upload a gallery image → it appears in the masonry gallery (and hero
   stack if chosen).
5. Publish a news item → it appears under News & Announcements.
6. Submit the public contact form → it lands in **Admin → Inquiries**
   with the right fields and a status selector.
7. Change a stat number in **Settings** → the amber stats band updates.
