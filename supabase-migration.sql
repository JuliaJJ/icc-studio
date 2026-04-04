-- ─────────────────────────────────────────────────────────────────────────────
-- ICC Studio — Initial Schema Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID generation
create extension if not exists "pgcrypto";


-- ─── brands ──────────────────────────────────────────────────────────────────
create table brands (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  short_code      text not null,
  tagline         text,
  accent_color    text not null,
  tag_bg_color    text,
  tag_text_color  text,
  quick_links     jsonb default '[]'::jsonb,
  sort_order      integer default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table brands enable row level security;

create policy "Authenticated users can manage brands"
  on brands for all
  to authenticated
  using (true)
  with check (true);


-- ─── tasks ───────────────────────────────────────────────────────────────────
create table tasks (
  id          uuid primary key default gen_random_uuid(),
  brand_id    uuid not null references brands(id) on delete cascade,
  title       text not null,
  status      text not null default 'open' check (status in ('open', 'done')),
  priority    text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  due_date    date,
  notes       text,
  sort_order  integer default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table tasks enable row level security;

create policy "Authenticated users can manage tasks"
  on tasks for all
  to authenticated
  using (true)
  with check (true);


-- ─── products ────────────────────────────────────────────────────────────────
create table products (
  id                   uuid primary key default gen_random_uuid(),
  brand_id             uuid not null references brands(id) on delete cascade,
  name                 text not null,
  niche                text,
  product_type         text,
  platform             text[] default '{}',
  status               text not null default 'idea' check (status in ('idea', 'in_progress', 'ready', 'live', 'paused')),
  price                numeric(10, 2),
  sku                  text,
  description          text,
  keywords             text[] default '{}',
  ad_creative_notes    text,
  listed_at            date,
  target_launch_date   date,
  last_updated_at      date,
  image_urls           text[] default '{}',
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table products enable row level security;

create policy "Authenticated users can manage products"
  on products for all
  to authenticated
  using (true)
  with check (true);


-- ─── assets ──────────────────────────────────────────────────────────────────
create table assets (
  id            uuid primary key default gen_random_uuid(),
  brand_id      uuid not null references brands(id) on delete cascade,
  filename      text not null,
  role          text check (role in ('source_file', 'mockup', 'listing_image', 'ad_creative')),
  source_tool   text,
  source_ref    text,
  external_url  text,
  niche         text,
  specs         text,
  notes         text,
  file_url      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table assets enable row level security;

create policy "Authenticated users can manage assets"
  on assets for all
  to authenticated
  using (true)
  with check (true);


-- ─── asset_product_links ─────────────────────────────────────────────────────
create table asset_product_links (
  id          uuid primary key default gen_random_uuid(),
  asset_id    uuid not null references assets(id) on delete cascade,
  product_id  uuid not null references products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique(asset_id, product_id)
);

alter table asset_product_links enable row level security;

create policy "Authenticated users can manage asset_product_links"
  on asset_product_links for all
  to authenticated
  using (true)
  with check (true);


-- ─── campaigns ───────────────────────────────────────────────────────────────
create table campaigns (
  id            uuid primary key default gen_random_uuid(),
  brand_id      uuid not null references brands(id) on delete cascade,
  name          text not null,
  platform      text,
  status        text not null default 'draft' check (status in ('draft', 'active', 'paused', 'ended')),
  start_date    date,
  end_date      date,
  budget_daily  numeric(10, 2),
  spend_total   numeric(10, 2) default 0,
  impressions   integer default 0,
  clicks        integer default 0,
  roas          numeric(8, 2),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table campaigns enable row level security;

create policy "Authenticated users can manage campaigns"
  on campaigns for all
  to authenticated
  using (true)
  with check (true);


-- ─── asset_campaign_links ────────────────────────────────────────────────────
create table asset_campaign_links (
  id           uuid primary key default gen_random_uuid(),
  asset_id     uuid not null references assets(id) on delete cascade,
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique(asset_id, campaign_id)
);

alter table asset_campaign_links enable row level security;

create policy "Authenticated users can manage asset_campaign_links"
  on asset_campaign_links for all
  to authenticated
  using (true)
  with check (true);


-- ─── prompts ─────────────────────────────────────────────────────────────────
create table prompts (
  id                 uuid primary key default gen_random_uuid(),
  brand_id           uuid not null references brands(id) on delete cascade,
  title              text not null,
  platform           text check (platform in ('Midjourney', 'Kittl', 'Claude', 'ChatGPT', 'Other')),
  tags               text[] default '{}',
  content            text not null,
  example_output_url text,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table prompts enable row level security;

create policy "Authenticated users can manage prompts"
  on prompts for all
  to authenticated
  using (true)
  with check (true);


-- ─── launch_events ───────────────────────────────────────────────────────────
create table launch_events (
  id           uuid primary key default gen_random_uuid(),
  brand_id     uuid not null references brands(id) on delete cascade,
  name         text not null,
  launch_date  date not null,
  end_date     date,
  status       text not null default 'planned' check (status in ('planned', 'ready', 'soon', 'live', 'ended')),
  notes        text,
  product_ids  uuid[] default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table launch_events enable row level security;

create policy "Authenticated users can manage launch_events"
  on launch_events for all
  to authenticated
  using (true)
  with check (true);


-- ─── revenue_entries ─────────────────────────────────────────────────────────
create table revenue_entries (
  id          uuid primary key default gen_random_uuid(),
  brand_id    uuid not null references brands(id) on delete cascade,
  month       integer not null check (month between 1 and 12),
  year        integer not null,
  platform    text not null,
  amount      numeric(10, 2) not null,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table revenue_entries enable row level security;

create policy "Authenticated users can manage revenue_entries"
  on revenue_entries for all
  to authenticated
  using (true)
  with check (true);


-- ─── keywords ────────────────────────────────────────────────────────────────
create table keywords (
  id          uuid primary key default gen_random_uuid(),
  brand_id    uuid not null references brands(id) on delete cascade,
  niche       text not null,
  keyword     text not null,
  notes       text,
  sort_order  integer default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table keywords enable row level security;

create policy "Authenticated users can manage keywords"
  on keywords for all
  to authenticated
  using (true)
  with check (true);


-- ─── updated_at trigger ──────────────────────────────────────────────────────
-- Automatically keeps updated_at current on every row update

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_brands_updated_at
  before update on brands
  for each row execute function set_updated_at();

create trigger trg_tasks_updated_at
  before update on tasks
  for each row execute function set_updated_at();

create trigger trg_products_updated_at
  before update on products
  for each row execute function set_updated_at();

create trigger trg_assets_updated_at
  before update on assets
  for each row execute function set_updated_at();

create trigger trg_campaigns_updated_at
  before update on campaigns
  for each row execute function set_updated_at();

create trigger trg_prompts_updated_at
  before update on prompts
  for each row execute function set_updated_at();

create trigger trg_launch_events_updated_at
  before update on launch_events
  for each row execute function set_updated_at();

create trigger trg_revenue_entries_updated_at
  before update on revenue_entries
  for each row execute function set_updated_at();

create trigger trg_keywords_updated_at
  before update on keywords
  for each row execute function set_updated_at();


-- ─── Seed: initial brands ────────────────────────────────────────────────────
-- Insert the four initial brands so brand_id is available immediately.
-- Replace these UUIDs with the actual ones if you already have them.

insert into brands (name, short_code, tagline, accent_color, tag_bg_color, tag_text_color, sort_order) values
  ('Bare Wall Club',    'BWC', 'Wall art · Etsy / Gumroad',        '#1D9E75', '#E0F5ED', '#0F5C43', 1),
  ('Esoterica Press',   'EP',  'Journals · Tarot / Astrology',     '#7F77DD', '#EEEDFB', '#4A42A8', 2),
  ('Niche Apparel Co.', 'NAC', 'Nurses · Teachers · Trades POD',  '#D85A30', '#FAEEE8', '#943D21', 3),
  ('Prompt Collective', 'PC',  'AI prompt packs · Gumroad / Stan', '#BA7517', '#F7EDDA', '#7A4D0F', 4);


-- ─── Phase 4 additions ───────────────────────────────────────────────────────
-- Run this block if you applied the initial migration before Phase 4 was built.

-- ─── Phase 6 additions ───────────────────────────────────────────────────────

alter table products add column if not exists tier text;
alter table products add column if not exists theme text;
alter table products add column if not exists palette text;
alter table products add column if not exists formats text[] default '{}';
alter table products add column if not exists sizes text[] default '{}';
alter table products add column if not exists fulfillment text;
alter table products add column if not exists is_bundle boolean default false;

-- Products contained in a bundle
create table if not exists bundle_members (
  id         uuid primary key default gen_random_uuid(),
  bundle_id  uuid not null references products(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  sort_order integer default 0,
  unique(bundle_id, product_id)
);

alter table bundle_members enable row level security;

create policy "Authenticated users can manage bundle_members"
  on bundle_members for all
  to authenticated using (true) with check (true);

-- Reusable value libraries per brand: formats, sizes, shop sections
create table if not exists value_library (
  id         uuid primary key default gen_random_uuid(),
  brand_id   uuid not null references brands(id) on delete cascade,
  type       text not null,   -- 'format' | 'size' | 'shop_section'
  value      text not null,
  created_at timestamptz not null default now(),
  unique(brand_id, type, value)
);

alter table value_library enable row level security;

create policy "Authenticated users can manage value_library"
  on value_library for all
  to authenticated using (true) with check (true);


alter table campaigns add column if not exists niche text;
alter table campaigns add column if not exists product_ids uuid[] default '{}';
alter table brands add column if not exists platform_tabs text[] default '{"Etsy","Pinterest","Social"}';
alter table products add column if not exists platform_content jsonb default '{}'::jsonb;


-- ─── product_assets ──────────────────────────────────────────────────────────
-- Per-platform media files attached to a product (separate from the design
-- asset library). Each row is one image or video for a specific platform.

create table if not exists product_assets (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  brand_id    uuid not null references brands(id) on delete cascade,
  platform    text not null,
  media_type  text not null default 'image' check (media_type in ('image', 'video')),
  file_url    text not null,
  label       text,
  sort_order  integer default 0,
  created_at  timestamptz not null default now()
);

alter table product_assets enable row level security;

create policy "Authenticated users can manage product_assets"
  on product_assets for all
  to authenticated
  using (true)
  with check (true);


-- ─── Storage bucket ───────────────────────────────────────────────────────────
-- Run this separately in the Storage tab, or uncomment if your plan allows SQL storage ops:
-- insert into storage.buckets (id, name, public) values ('icc-assets', 'icc-assets', false);
