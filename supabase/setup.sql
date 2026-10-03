-- ============================================================================
--  BHOOMI INFRATECH — SUPABASE SETUP
--  ---------------------------------------------------------------------------
--  How to run:
--    1. Create a project at https://supabase.com (free tier is fine).
--    2. Open  SQL Editor  → New query.
--    3. Replace the admin email below (marked ADMIN EMAIL) with the email
--       you will sign in with at /admin/.
--    4. Paste this whole script and run it.
--
--  What it does:
--    * Creates all content tables + row-level-security policies
--    * Creates a public storage bucket "media" for uploaded images
--    * Seeds the database with the current website content so the public
--      site looks exactly the same after wiring up config.js
--
--  Public site  → reads content with the anon key (SELECT only)
--                 + inserts visitor inquiries
--  Admin console → authenticated session AND email on the admin_users list
-- ============================================================================


-- ============================================================================
-- 1. HELPER FUNCTION + TRIGGER
-- ============================================================================

-- The admin allow-list must exist before is_admin() below references it,
-- because PostgreSQL validates SQL function bodies at creation time.
create table if not exists public.admin_users (
  email      text primary key,
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER so RLS policies can check the allow-list WITHOUT making
-- admin_users readable by the public (which would leak every admin email).
-- search_path is pinned so no caller can shadow the table lookup.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where email = (select auth.jwt() ->> 'email')
  );
$$;

-- never expose the function's input surface beyond its boolean result
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- (triggers are dropped + re-created after the tables exist, below)


-- ============================================================================
-- 2. TABLES
-- ============================================================================

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  category    text not null default 'residential'
              check (category in ('residential','commercial','infrastructure','realestate')),
  status      text not null default 'ongoing'
              check (status in ('ongoing','completed')),
  progress    int  not null default 0 check (progress between 0 and 100),
  location    text not null default '',
  client      text not null default '',
  period      text not null default '',
  summary     text not null default '',
  description text not null default '',
  image       text not null default '',
  image_path  text not null default '',
  specs       jsonb not null default '[]'::jsonb,
  featured    boolean not null default false,
  in_grid     boolean not null default true,
  sort        int   not null default 100,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.services (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  summary     text not null default '',
  description text not null default '',
  image       text not null default '',
  image_path  text not null default '',
  scope       text not null default '',
  tags        jsonb not null default '[]'::jsonb,
  detail_tags jsonb not null default '[]'::jsonb,
  sort        int   not null default 100,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.news (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null default 'news'
              check (kind in ('news','announcement')),
  category    text not null default '',
  cta         text not null default 'READ DISPATCH',
  date        date not null default current_date,
  title       text not null default '',
  excerpt     text not null default '',
  body        text not null default '',
  image       text not null default '',
  image_path  text not null default '',
  sort        int   not null default 100,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.testimonials (
  id          uuid primary key default gen_random_uuid(),
  quote       text not null default '',
  emph        text not null default '',
  name        text not null default '',
  role        text not null default '',
  photo       text not null default '',
  photo_path  text not null default '',
  sort        int   not null default 100,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.gallery (
  id          uuid primary key default gen_random_uuid(),
  image       text not null,
  image_path  text not null default '',
  caption     text not null default '',
  section     text not null default 'gallery'
              check (section in ('gallery','hero')),
  sort        int   not null default 100,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.inquiries (
  id           uuid primary key default gen_random_uuid(),
  ref          text not null default '',
  name         text not null default '',
  phone        text not null default '',
  email        text not null default '',
  project_type text not null default '',
  budget       text not null default '',
  message      text not null default '',
  status       text not null default 'new'
               check (status in ('new','contacted','closed')),
  created_at   timestamptz not null default now()
);

create table if not exists public.site_settings (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz not null default now()
);


-- ============================================================================
-- 4. ADMIN EMAIL  (one-time bootstrap of the admin allow-list)
-- ============================================================================
insert into public.admin_users (email) values ('admin@bhoomiinfratech.com')
on conflict (email) do nothing;


-- ============================================================================
-- 5. TRIGGERS (updated_at)
-- ============================================================================
drop trigger if exists trg_projects_touch  on public.projects;
drop trigger if exists trg_services_touch  on public.services;
drop trigger if exists trg_news_touch      on public.news;
drop trigger if exists trg_testimonials_touch on public.testimonials;
drop trigger if exists trg_gallery_touch   on public.gallery;
drop trigger if exists trg_settings_touch  on public.site_settings;

create trigger trg_projects_touch   before update on public.projects
  for each row execute function public.touch_updated_at();
create trigger trg_services_touch   before update on public.services
  for each row execute function public.touch_updated_at();
create trigger trg_news_touch       before update on public.news
  for each row execute function public.touch_updated_at();
create trigger trg_testimonials_touch before update on public.testimonials
  for each row execute function public.touch_updated_at();
create trigger trg_gallery_touch    before update on public.gallery
  for each row execute function public.touch_updated_at();
create trigger trg_settings_touch   before update on public.site_settings
  for each row execute function public.touch_updated_at();


-- ============================================================================
-- 6. ROW LEVEL SECURITY
--    public  : read content + submit inquiries
--    admin   : sign in with an email listed in admin_users
-- ============================================================================

alter table public.admin_users    enable row level security;
alter table public.projects       enable row level security;
alter table public.services       enable row level security;
alter table public.news           enable row level security;
alter table public.testimonials   enable row level security;
alter table public.gallery        enable row level security;
alter table public.inquiries      enable row level security;
alter table public.site_settings  enable row level security;

-- ---- read: everyone (public site) --------------------------------------
--  admin_users is NOT publicly readable: the admin allow-list must stay
--  private. Anonymous visitors get no access at all; a signed-in user may
--  read only their OWN row (so the admin console can verify membership).
drop policy if exists "public read admin_users"     on public.admin_users;
drop policy if exists "admin read own row"          on public.admin_users;
drop policy if exists "public read projects"       on public.projects;
drop policy if exists "public read services"       on public.services;
drop policy if exists "public read news"           on public.news;
drop policy if exists "public read testimonials"   on public.testimonials;
drop policy if exists "public read gallery"        on public.gallery;
drop policy if exists "public read site_settings"  on public.site_settings;

create policy "admin read own row"        on public.admin_users   for select to authenticated using (email = (select auth.jwt() ->> 'email'));
create policy "public read projects"      on public.projects      for select to anon, authenticated using (true);
create policy "public read services"      on public.services      for select to anon, authenticated using (true);
create policy "public read news"          on public.news          for select to anon, authenticated using (true);
create policy "public read testimonials"  on public.testimonials  for select to anon, authenticated using (true);
create policy "public read gallery"       on public.gallery       for select to anon, authenticated using (true);
create policy "public read site_settings" on public.site_settings for select to anon, authenticated using (true);

-- ---- write: admin only ---------------------------------------------------
drop policy if exists "admin write projects"      on public.projects;
drop policy if exists "admin write services"      on public.services;
drop policy if exists "admin write news"          on public.news;
drop policy if exists "admin write testimonials"  on public.testimonials;
drop policy if exists "admin write gallery"       on public.gallery;
drop policy if exists "admin write inquiries"     on public.inquiries;
drop policy if exists "admin write site_settings" on public.site_settings;

create policy "admin write projects"      on public.projects      for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write services"      on public.services      for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write news"          on public.news          for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write testimonials"  on public.testimonials  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write gallery"       on public.gallery       for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write inquiries"     on public.inquiries     for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write site_settings" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- inquiries: visitors may submit (anon), admin manages ----------------
drop policy if exists "public insert inquiries" on public.inquiries;
create policy "public insert inquiries" on public.inquiries
  for insert to anon
  with check (
    length(name)        between 2  and 120
    and length(email)   between 5  and 160
    and length(phone)   between 3  and 40
    and length(project_type) between 1 and 80
    and length(message) between 5  and 4000
  );

-- NOTE: no write policy exists for admin_users — the list is only managed
-- through the Supabase SQL editor (add: insert into public.admin_users values ('you@company.com');)


-- ============================================================================
-- 7. STORAGE — public bucket "media" for uploaded images
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "media public read"  on storage.objects;
drop policy if exists "media admin insert" on storage.objects;
drop policy if exists "media admin update" on storage.objects;
drop policy if exists "media admin delete" on storage.objects;

create policy "media public read" on storage.objects
  for select using (bucket_id = 'media');
create policy "media admin insert" on storage.objects
  for insert with check (bucket_id = 'media' and public.is_admin());
create policy "media admin update" on storage.objects
  for update using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());
create policy "media admin delete" on storage.objects
  for delete using (bucket_id = 'media' and public.is_admin());


-- ============================================================================
-- 8. SEED DATA  (mirrors the current website exactly)
-- ============================================================================

delete from public.projects;
delete from public.services;
delete from public.news;
delete from public.testimonials;
delete from public.gallery;
delete from public.site_settings;

-- ---- Projects -------------------------------------------------------------
insert into public.projects
  (title, category, status, progress, location, client, period, summary, description, image, image_path, specs, featured, in_grid, sort)
values
('Skyline Residency', 'residential', 'ongoing', 68, 'Gaur, Rautahat', 'Skyline Homes LLP', '2024–2027',
 'Twin 14-floor towers, 168 residences.',
 'Twin 14-floor towers, 168 residences, podium amenity deck and two basement parking levels. Currently pouring at Level 14, Tower A.',
 'https://picsum.photos/seed/bhoomi-skyline-residency-tower/980/760', '',
 '[["BUILT-UP AREA","2.4 Lakh Sq.Ft"],["CLIENT","Skyline Homes LLP"],["STRUCTURE","RCC M30 Frame"],["HANDOVER","Q3 2027"]]'::jsonb,
 true, false, 10),

('NH-64 Service Corridor', 'infrastructure', 'completed', 100, 'Madhesh Highway Authority', 'State Highway Authority', '2023–2025',
 '9.2 km road + 6-lane flyover for the highway authority.',
 '9.2 km of service road, one 6-lane flyover, storm-water drainage and pedestrian underpasses — delivered 3 weeks ahead of schedule.',
 'https://picsum.photos/seed/bhoomi-flyover-service-road/980/760', '',
 '[["LENGTH","9.2 KM"],["CLIENT","State Highway Authority"],["SCOPE","ROAD + FLYOVER"],["VALUE","NPR 184 CR"]]'::jsonb,
 true, true, 20),

('Bhoomi Trade Park', 'commercial', 'ongoing', 41, 'Gaur, Rautahat', '', '2024–2028',
 '5-acre G+6 commercial campus, IGBC pre-certified.',
 'A 5-acre commercial campus — four G+6 office blocks, retail arcade, and IGBC-green pre-certified services design. Block B structure complete.',
 'https://picsum.photos/seed/bhoomi-trade-park-commercial/980/760', '',
 '[["SITE AREA","5.0 Acres"],["BUILT-UP AREA","4.1 Lakh Sq.Ft"],["UNITS","4 Blocks · 96 Units"],["HANDOVER","Q2 2028"]]'::jsonb,
 true, true, 30),

('Verdant Villas — Phase I', 'realestate', 'completed', 100, 'Gaur, Rautahat', '', '2021–2023',
 '48 villa plots with clubhouse — sold out and handed over.',
 '48 villa plots with clubhouse, landscaped spine and rain-water harvesting. Sold out within eight months of launch; fully handed over.',
 'https://picsum.photos/seed/bhoomi-verdant-villas-township/980/760', '',
 '[["PLOTS","48 Villas"],["AMENITIES","Club + Park"],["REGISTRATION","NEP/RAU/2021/0914"],["OCCUPANCY","100% Sold"]]'::jsonb,
 true, false, 40),

('Emerald Heights', 'residential', 'completed', 100, 'Gaur', '', '2024',
 '84-unit apartment block with stilt amenities and rooftop garden.',
 'An 84-unit residential apartment block with stilt parking, family amenities and a rooftop garden designed for low-maintenance community living.',
 'https://picsum.photos/seed/bhoomi-emerald-heights-apartments/640/460', '',
 '[["UNITS","84 apartments"],["AMENITIES","Stilt + rooftop garden"],["LOCATION","Gaur, Rautahat"],["DELIVERY","Completed 2024"]]'::jsonb,
 false, true, 50),

('Verdant Villas — Phase II', 'realestate', 'ongoing', 63, 'Gaur', '', '2025–27',
 '62 premium villa plots with central greens and clubhouse.',
 'A premium 62-plot villa community with central greens, a clubhouse and coordinated utility infrastructure for a quiet residential neighbourhood.',
 'https://picsum.photos/seed/bhoomi-verdant-villas-phase2/640/460', '',
 '[["PLOTS","62 villa plots"],["AMENITIES","Clubhouse + greens"],["LOCATION","Gaur, Rautahat"],["HANDOVER","2027"]]'::jsonb,
 false, true, 60),

('Lakeview Waterworks', 'infrastructure', 'ongoing', 27, 'Rautahat', '', '2025–27',
 '18 km piped water network and elevated reservoir for a municipality.',
 'An 18 km piped-water network and elevated reservoir project improving municipal supply reliability across the surrounding settlements.',
 'https://picsum.photos/seed/bhoomi-lakeview-waterworks/640/460', '',
 '[["NETWORK","18 km pipeline"],["ASSET","Elevated reservoir"],["LOCATION","Rautahat"],["DELIVERY","2027"]]'::jsonb,
 false, true, 70),

('The Foundry Lofts', 'commercial', 'completed', 100, 'Gaur', '', '2023',
 'Adaptive reuse of a 1980s foundry into boutique loft offices.',
 'Adaptive reuse of a 1980s foundry into boutique loft offices, retaining the industrial character while introducing modern services and flexible workspaces.',
 'https://picsum.photos/seed/bhoomi-foundry-lofts-office/640/460', '',
 '[["TYPE","Adaptive reuse"],["USE","Boutique offices"],["LOCATION","Gaur"],["DELIVERY","Completed 2023"]]'::jsonb,
 false, true, 80);

-- ---- Services -------------------------------------------------------------
insert into public.services
  (title, summary, description, image, image_path, scope, tags, detail_tags, sort)
values
('Civil Construction',
 'High-rise residential towers, commercial complexes and industrial sheds — RCC frame work executed to IS-code precision, from raft foundation to parapet.',
 'End-to-end civil construction from excavation and raft foundations through RCC framing, masonry, finishing and final handover.',
 'https://picsum.photos/seed/bhoomi-civil-construction-tower/620/430', '',
 'Turnkey RCC · Residential · Commercial · Industrial',
 '["COMMERCIAL","RESIDENTIAL","INDUSTRIAL"]'::jsonb,
 '["FOUNDATION","RCC STRUCTURE","FINISHING"]'::jsonb, 10),

('Infrastructure Development',
 'Roads, flyovers, storm-water drains and water-supply networks built for municipalities and state agencies — engineered for decades, not deadlines.',
 'Durable public infrastructure for municipalities and state agencies, including road corridors, bridges, storm-water systems and water-supply networks.',
 'https://picsum.photos/seed/bhoomi-highway-bridge-infra/620/430', '',
 'Roads · Bridges · Drainage · Utilities',
 '["ROADS","BRIDGES","UTILITIES"]'::jsonb,
 '["ROADWORKS","BRIDGES","DRAINAGE"]'::jsonb, 20),

('Real Estate Development',
 'Clear-title plotted developments, apartment complexes and villa townships — transparent pricing and honest construction updates.',
 'Clear-title real-estate development with planned layouts, internal roads, utilities and transparent construction updates from launch to possession.',
 'https://picsum.photos/seed/bhoomi-realty-township/620/430', '',
 'Plots · Apartments · Villas · Colonies',
 '["PLOTS","APARTMENTS","VILLAS"]'::jsonb,
 '["MASTER PLANNING","DEVELOPMENT","HANDOVER"]'::jsonb, 30),

('Interiors & Renovation',
 'Turnkey interior fit-outs, structural retrofits and façade upgrades for homes, offices and retail — designed, executed and styled by our in-house team.',
 'Turnkey interior fit-outs and structural upgrades for homes, offices and retail spaces, coordinated by one in-house execution team.',
 'https://picsum.photos/seed/bhoomi-interior-fitout/620/430', '',
 'Interiors · Retrofit · Façade Upgrades',
 '["TURNKEY","RETROFIT","FAÇADE"]'::jsonb,
 '["TURNKEY","RETROFIT","FIT-OUT"]'::jsonb, 40),

('Project Management (PMC)',
 'Planning, estimation, tendering and on-site supervision for third-party builds. We run your project like our own — schedules, quality and cost, controlled.',
 'Independent project management for third-party builds, controlling schedule, cost, procurement, site quality and reporting through every milestone.',
 'https://picsum.photos/seed/bhoomi-site-management/620/430', '',
 'Planning · Estimation · QA/QC · Supervision',
 '["PLANNING","QA / QC","SUPERVISION"]'::jsonb,
 '["SCHEDULING","QUALITY CONTROL","REPORTING"]'::jsonb, 50),

('Architecture & Structural Design',
 'Concept drawings, 3D visualisations, structural detailing and statutory approvals — the full paper trail, handled before a single shovel moves.',
 'Concept design, 3D visualization, structural detailing, BOQ preparation and statutory approval support before construction begins.',
 'https://picsum.photos/seed/bhoomi-architect-design-studio/620/430', '',
 'Architecture · Structural Design · Approvals',
 '["3D DESIGN","STRUCTURAL","APPROVALS"]'::jsonb,
 '["3D DESIGN","STRUCTURAL","APPROVALS"]'::jsonb, 60);

-- ---- News + Announcements --------------------------------------------------
insert into public.news
  (kind, category, cta, date, title, excerpt, body, image, image_path, sort)
values
('news', 'CONTRACT', 'READ DISPATCH', '2026-09-12',
 'Bhoomi bags 12-acre township build contract',
 'A landmark EPC contract near Gaur — 340 residences, phase-one ground-breaking scheduled for November 2026.',
 'The EPC agreement covers site development, infrastructure and construction of 340 homes across the first 12 acres. Mobilisation begins in October, with earthwork and boundary works scheduled ahead of the November ground-breaking.',
 'https://picsum.photos/seed/bhoomi-township-contract-signing/640/420', '', 10),

('news', 'COMPANY', 'READ DISPATCH', '2026-08-28',
 'Safety Week 2026: 1.9M incident-free man-hours',
 'All nine active sites marked National Safety Week with drills, harness certification camps and a zero-harm pledge renewal.',
 'Teams completed emergency-response drills, harness inspections and refreshed toolbox-talk materials across all active sites. The week closed with a renewed zero-harm pledge led by project managers and site safety officers.',
 'https://picsum.photos/seed/bhoomi-safety-week-crew/640/420', '', 20),

('news', 'FLEET', 'READ DISPATCH', '2026-07-30',
 'Two new tower cranes join the fleet',
 'Our lifting capacity grows — 12-tonne luffing cranes deployed at Skyline Residency and Trade Park Block C.',
 'The new 12-tonne luffing cranes have completed commissioning and operator familiarisation. One is now supporting the Level 14 pour cycle at Skyline Residency, while the second is serving the rising structure at Trade Park Block C.',
 'https://picsum.photos/seed/bhoomi-crane-fleet-yard/640/420', '', 30),

('announcement', 'SITE NOTICE', 'HIRING', '2026-09-20',
 'Trade Park site office walk-in interviews — site engineers & safety officers.',
 '',
 'Walk-in interviews are open at the Trade Park site office for site engineers and safety officers. Bring an updated CV, qualification documents and experience details. Interviews run Sunday through Friday, 10:00–15:00 NPT.',
 '', '', 40),

('announcement', 'SCHEDULE', 'UPDATE', '2026-09-08',
 'Monsoon pour-window update: Skyline Residency slab cycle shifted to night pours.',
 '',
 'To protect concrete quality during the monsoon, Skyline Residency has moved its slab pours to cooler night windows. Residents and nearby traffic will receive advance notices whenever a pour is scheduled.',
 '', '', 50),

('announcement', 'REALTY', 'VISITS', '2026-08-15',
 'Verdant Villas Phase-II pre-launch open site visits now booking on weekends.',
 '',
 'Weekend site visits for Verdant Villas Phase-II can now be booked with the realty desk. Visitors can review the layout, available plots, road access and utility plans before the official launch.',
 '', '', 60),

('announcement', 'BULLETIN', 'REPORT', '2026-07-22',
 'Q2 client progress reports dispatched for all active residential projects.',
 '',
 'Q2 reports include construction progress, milestone status, cost tracking and upcoming work for every active residential project. Clients can request a project-specific copy from their project coordinator.',
 '', '', 70);

-- ---- Testimonials -----------------------------------------------------------
insert into public.testimonials (quote, emph, name, role, photo, sort)
values
('"Bhoomi handed us our tower three weeks early — and the weekly photo reports meant we never once had to ask what was happening on site."',
 'three weeks early', 'R. Menon', 'DIRECTOR · SKYLINE HOMES LLP',
 'https://picsum.photos/seed/bhoomi-client-rmenon/120/120', 10),

('"Their NH-64 corridor passed every third-party quality audit on the first pass. That almost never happens with road packages of this size."',
 'on the first pass', 'Er. K. Rao', 'CHIEF ENGINEER · HIGHWAY AUTHORITY',
 'https://picsum.photos/seed/bhoomi-client-engineer/120/120', 20),

('"We bought into Verdant Villas off plan. Every promise in the brochure — clubhouse, rain harvesting, the park — was there on handover day."',
 'was there on handover day', 'A. & S. Shetty', 'VILLA OWNERS · VERDANT VILLAS',
 'https://picsum.photos/seed/bhoomi-client-family/120/120', 30);

-- ---- Gallery (site section + hero stack) ------------------------------------
insert into public.gallery (image, caption, section, sort)
values
('https://picsum.photos/seed/bhoomi-field-crane-yard/700/920',   'CRANE YARD — 06:40 NPT',   'gallery', 10),
('https://picsum.photos/seed/bhoomi-field-excavation-work/700/520','EXCAVATION — PLOT 12',   'gallery', 20),
('https://picsum.photos/seed/bhoomi-field-rebar-grid/700/760',   'REBAR GRID — LEVEL 03',    'gallery', 30),
('https://picsum.photos/seed/bhoomi-field-concrete-pump/700/900','POUR #212 — LEVEL 14',     'gallery', 40),
('https://picsum.photos/seed/bhoomi-field-site-office/700/500',  'SITE OFFICE — DAILY STANDUP','gallery', 50),
('https://picsum.photos/seed/bhoomi-field-facade-finishing/700/880','FACADE FINISHING — TOWER B','gallery', 60),
('https://picsum.photos/seed/bhoomi-field-road-corridor/700/520','NH-64 — PIER 18',          'gallery', 70),
('https://picsum.photos/seed/bhoomi-field-interior-fitout/700/780','FIT-OUT — UNIT 07',      'gallery', 80),
('https://picsum.photos/seed/bhoomi-construction-crane-site/900/1100','SITE 047 — SKYLINE RESIDENCY<br>POUR #212 · LEVEL 14 · 06:40 NPT','hero', 10),
('https://picsum.photos/seed/bhoomi-blueprint-desk/900/1100',     'SITE 031 — DESIGN OFFICE<br>COORDINATION SET · REV 08 · 09:15 NPT','hero', 20),
('https://picsum.photos/seed/bhoomi-concrete-pour/900/1100',      'SITE 052 — BHOOMI TRADE PARK<br>BLOCK B · LEVEL 04 · 11:20 NPT','hero', 30),
('https://picsum.photos/seed/bhoomi-steel-frame/900/1100',        'SITE 064 — NH-64 CORRIDOR<br>PIER 18 · DECK POUR · 14:05 NPT','hero', 40),
('https://picsum.photos/seed/bhoomi-finished-residence/900/1100', 'SITE 022 — VERDANT VILLAS<br>HANDOVER WALK · PHASE I · 16:40 NPT','hero', 50);

-- ---- Site settings (company profile, stats, contact) -------------------------
insert into public.site_settings (key, value)
values
('stats', '[{"value":10,"suffix":"+"},{"value":45,"suffix":"+"},{"value":92000,"suffix":" m²"},{"value":120,"suffix":" Cr+"}]'),

('company', '{"about":"Fourteen years of dirt under our nails. Bhoomi Infratech builds the roads, towers, parks and homes that cities are made of — with one crew, one standard, and no shortcuts.","lede":"Founded in 2016, Bhoomi Infratech has grown from a local civil contractor into a <b>multi-disciplinary build house</b> spanning construction, infrastructure, real estate and design — trusted by municipalities, enterprises and families across Madhesh Province.","mission":"Deliver every project on time, on budget and above spec — while keeping every worker safe and every client informed at each milestone.","vision":"To be the region''s most trusted name in infrastructure and real estate — building spaces that serve three generations, not three years.","values":[{"title":"Safety First","text":"Zero-harm sites. Daily toolbox talks, full PPE discipline and independent safety audits on every active project."},{"title":"On-Time, Every Time","text":"CPM-scheduled builds with weekly client progress reports — 92% of our projects have finished ahead of deadline."},{"title":"Material Integrity","text":"Batch-tested concrete, certified steel and vendor-audited supplies. What''s in the mix is on the record."},{"title":"Transparent Dealings","text":"Itemised estimates, milestone-linked billing and clear-title real estate. No surprises after the signature."}]}'),

('contact', '{"phone":"+977 9818624020","tel":"+9779818624020","email":"bhoomiinfratech123@gmail.com","address":"Bhoomi Infratech Pvt. Ltd.\nGaur-5, Rautahat,\nMadhesh Pradesh, Nepal","hours":"Sun–Fri · 09:00–17:00 NPT","field":"Active sites across Madhesh Province.\nSite visits by appointment."}');

-- ============================================================================
-- DONE.
--  Next steps:
--    * Supabase → Authentication → Sign In / Up → make sure the Email
--      provider is enabled (it is by default).
--    * Put the Project URL + anon key into  /config.js
--    * Create your admin account at  /admin/  using the email from step 3.
-- ============================================================================
