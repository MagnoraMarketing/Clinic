-- AIbooking Clinic – initial multi-tenant schema
-- Every tenant table has clinic_id, so many clinics (A, B, C, D …) can run on the
-- same platform without data being mixed. Row Level Security is enabled on all
-- tables: users only see data for the clinics they belong to (via the users table).
-- The server uses the service role key, which bypasses RLS.

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist"; -- for the no-double-booking constraint

-- ---------------------------------------------------------------------------
-- Clinics (tenants)
-- ---------------------------------------------------------------------------
create table if not exists clinics (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name            text not null,
  tagline         text not null default '',
  description     text not null default '',
  type            text not null default 'massage'
                  check (type in ('massage','hair','chiropractic','physio','dental','beauty','podiatry')),
  emoji           text not null default '🌿',
  accent_color    text not null default '#3fcfab',
  hero_image      text not null default '',
  address         text not null default '',
  city            text not null default '',
  phone           text not null default '',
  email           text not null default '',
  parking         text not null default '',
  insurance       text not null default '',             -- what the AI says about insurance / subsidy / referral
  review_url      text not null default '',             -- target of the NFC review chip (/r/<slug>)
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists clinic_settings (
  clinic_id       uuid primary key references clinics(id) on delete cascade,
  opening_hours   jsonb not null default '[]'::jsonb,   -- [{day,open,close,closed}]
  booking         jsonb not null default '{"enabled":true,"slotMinutes":15,"bufferMinutes":10,"minNoticeHours":2,"maxDaysAhead":60,"cancellationHours":24,"lateCancellationFee":0,"confirmNewClients":false,"rules":""}'::jsonb,
  payment_methods text[] not null default array['card','mobilepay']::text[],
  faq             jsonb not null default '[]'::jsonb,   -- [{question,answer,keywords}]
  updated_at      timestamptz not null default now()
);

-- Platform users (clinic owners/staff) linked to Supabase Auth
create table if not exists users (
  id              uuid primary key references auth.users(id) on delete cascade,
  clinic_id       uuid not null references clinics(id) on delete cascade,
  email           text not null,
  name            text not null default '',
  role            text not null default 'staff' check (role in ('owner','manager','staff')),
  created_at      timestamptz not null default now()
);
create index if not exists users_clinic_idx on users(clinic_id);

-- ---------------------------------------------------------------------------
-- Price list: categories, services, practitioners
-- ---------------------------------------------------------------------------
create table if not exists service_categories (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references clinics(id) on delete cascade,
  name            text not null,
  emoji           text not null default '',
  sort_order      integer not null default 0
);
create index if not exists service_categories_clinic_idx on service_categories(clinic_id);

create table if not exists practitioners (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references clinics(id) on delete cascade,
  name            text not null,
  title           text not null default '',
  bio             text not null default '',
  color           text not null default '#3fcfab',
  work_days       smallint[] not null default array[1,2,3,4,5]::smallint[],  -- 0 = Sunday
  active          boolean not null default true,
  sort_order      integer not null default 0
);
create index if not exists practitioners_clinic_idx on practitioners(clinic_id);

create table if not exists services (
  id               uuid primary key default gen_random_uuid(),
  clinic_id        uuid not null references clinics(id) on delete cascade,
  category_id      uuid references service_categories(id) on delete set null,
  name             text not null,
  description      text not null default '',
  duration_minutes integer not null check (duration_minutes between 5 and 480),
  price            numeric(10,2) not null default 0 check (price >= 0),
  price_from       boolean not null default false,
  emoji            text not null default '',
  aliases          text[] not null default array[]::text[],   -- words the AI should recognise
  popular          boolean not null default false,
  new_clients_only boolean not null default false,
  available        boolean not null default true,
  practitioner_ids uuid[] not null default array[]::uuid[],   -- empty = all practitioners
  sort_order       integer not null default 0
);
create index if not exists services_clinic_idx on services(clinic_id);

-- ---------------------------------------------------------------------------
-- Appointments
-- ---------------------------------------------------------------------------
create table if not exists appointments (
  id                uuid primary key default gen_random_uuid(),
  clinic_id         uuid not null references clinics(id) on delete cascade,
  reference         text not null,
  source            text not null default 'website' check (source in ('website','chat','voice','phone','api')),
  status            text not null default 'confirmed'
                    check (status in ('pending','confirmed','checked_in','completed','cancelled','no_show')),
  date              date not null,
  time              time not null,
  duration_minutes  integer not null,
  service_id        uuid references services(id) on delete set null,
  service_name      text not null,
  practitioner_id   uuid not null references practitioners(id) on delete restrict,
  practitioner_name text not null,
  price             numeric(10,2) not null default 0,
  customer_name     text not null,
  customer_phone    text not null,
  customer_email    text,
  new_client        boolean not null default false,
  comment           text,
  changes           jsonb not null default '[]'::jsonb,  -- rebooking log [{at,by,from,to}]
  cancelled_at      timestamptz,
  late_cancellation boolean not null default false,
  external_refs     jsonb not null default '{}'::jsonb,
  -- Time range the practitioner is busy (used by the constraint below)
  slot              tsrange generated always as (tsrange(date + time, date + time + make_interval(mins => duration_minutes))) stored,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (clinic_id, reference),
  -- A practitioner can never be double-booked – even if two channels book the same second
  constraint appointments_no_overlap exclude using gist (practitioner_id with =, slot with &&)
    where (status in ('pending','confirmed','checked_in','completed'))
);
create index if not exists appointments_clinic_date_idx on appointments(clinic_id, date);
create index if not exists appointments_phone_idx on appointments(clinic_id, customer_phone);

-- ---------------------------------------------------------------------------
-- Calls handled by the AI receptionist (AIbooking Voice)
-- ---------------------------------------------------------------------------
create table if not exists calls (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references clinics(id) on delete cascade,
  from_number     text not null default '',
  channel         text not null default 'phone' check (channel in ('phone','voice_widget')),
  started_at      timestamptz not null default now(),
  duration_sec    integer not null default 0,
  outcome         text not null default 'question'
                  check (outcome in ('booking','rebooking','cancellation','question','transfer','missed')),
  summary         text not null default '',
  transcript      jsonb not null default '[]'::jsonb,   -- [{who:'caller'|'ai',text}]
  appointment_id  uuid references appointments(id) on delete set null
);
create index if not exists calls_clinic_idx on calls(clinic_id, started_at desc);

-- ---------------------------------------------------------------------------
-- AI agents, integrations, webhook log
-- ---------------------------------------------------------------------------
create table if not exists ai_agents (
  clinic_id       uuid primary key references clinics(id) on delete cascade,
  agent_id        text,
  voice_agent_id  text,
  chat_agent_id   text,
  phone_number    text,                                 -- the clinic's AI phone line
  theme           text not null default 'dark' check (theme in ('dark','light')),
  accent_color    text,
  welcome_message text,
  position        text not null default 'bottom-right' check (position in ('bottom-right','bottom-left')),
  enabled         boolean not null default true
);

create table if not exists integrations (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references clinics(id) on delete cascade,
  kind            text not null check (kind in ('aibooking_calendar','calendar_sync','practice_system','sms','custom_api')),
  enabled         boolean not null default false,
  config          jsonb not null default '{}'::jsonb,   -- never store secrets here in plain text – use Vault
  unique (clinic_id, kind)
);

create table if not exists webhook_log (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid references clinics(id) on delete cascade,
  direction       text not null check (direction in ('inbound','outbound')),
  event           text not null,
  target          text not null default '',
  status          text not null,
  detail          text,
  created_at      timestamptz not null default now()
);
create index if not exists webhook_log_clinic_idx on webhook_log(clinic_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security: users only see their own clinic's rows
-- ---------------------------------------------------------------------------
create or replace function current_clinic_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select clinic_id from users where id = auth.uid()
$$;

do $$
declare t text;
begin
  foreach t in array array['clinic_settings','service_categories','practitioners','services','appointments','calls','ai_agents','integrations','webhook_log'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_tenant', t);
    execute format('create policy %I on %I for all using (clinic_id in (select current_clinic_ids())) with check (clinic_id in (select current_clinic_ids()))', t || '_tenant', t);
  end loop;
end $$;

alter table clinics enable row level security;
drop policy if exists clinics_tenant on clinics;
create policy clinics_tenant on clinics for all using (id in (select current_clinic_ids())) with check (id in (select current_clinic_ids()));

alter table users enable row level security;
drop policy if exists users_self on users;
create policy users_self on users for select using (id = auth.uid() or clinic_id in (select current_clinic_ids()));
