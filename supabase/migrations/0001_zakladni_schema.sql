-- =============================================================================
-- CoachVille certifikace: základní schéma
-- Datový model dle docs/zadani-v2.1.md, kap. 10; stavy dle kap. 7.
-- Certifikační spis se neukládá jako tabulka: skládá se z plan_items
-- + reports + recording_events (kap. 7, F8).
-- =============================================================================

-- ---------- Číselníky ----------

create type user_role as enum ('student', 'mentor', 'verca', 'meira', 'admin');

create type program_type as enum ('acc', 'upgrade_pcc', 'komplet');

create type phase_type as enum ('acc', 'pcc');

create type plan_item_type as enum ('dlouha', 'kratka_s_reportem', 'kratka_bez_vyhodnoceni');

-- Stavy položky plánu = plánovací větev diagramu v kap. 7
-- (splneno_historicky: migrace starších studentů, F1b)
create type plan_item_status as enum (
  'naplanovano', 'po_terminu', 'ceka_na_poplatek',
  'nahrano', 'splneno', 'splneno_historicky', 'zruseno'
);

-- Stavy nahrávky = zpracovatelská větev diagramu v kap. 7
create type recording_status as enum (
  'nahrano', 'zpracovava_se', 'vraceno',
  'ceka_na_schvaleni', 'ceka_na_mentora', 'schuzka_planovana',
  'dokonceno', 'report_odeslan', 'zapocteno'
);

create type report_status as enum ('koncept', 'schvalen', 'odeslan', 'odemcen');

create type meeting_status as enum ('bez_terminu', 'naplanovana', 'dokoncena', 'zrusena');

create type payment_type as enum ('dodatecny_termin_500', 'opravna_1000');

create type payment_status as enum ('ceka', 'uhrazeno');

create type prompt_type as enum ('dlouha', 'kratka');

create type student_status as enum ('aktivni', 'pozastaven', 'certifikovan', 'ukoncen');

create type mcs_status as enum ('nema', 'v_priprave', 'ziskano');

create type job_status as enum ('ceka', 'bezi', 'hotovo', 'chyba');

-- ---------- Pomocný trigger na updated_at ----------

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- Uživatelé ----------

-- Profil ke každému auth.users účtu (magic link, R5). Role řídí přístup (kap. 6).
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  jmeno text not null,
  email text not null,
  role user_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_email_idx on profiles (lower(email));
create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- ---------- Studenti ----------

create table students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles (id) on delete restrict,
  program program_type not null,
  skupina text,
  datum_startu date not null,
  cilove_datum_certifikace date,
  stav student_status not null default 'aktivni',
  poznamky text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger students_updated_at before update on students
  for each row execute function set_updated_at();

-- ---------- Šablony programů ----------

-- Šablony jsou verzované (kap. 8). Pro MVP je zdrojem pravdy kód
-- (src/lib/plan/sablony.ts); tabulky drží kopii pro dohledatelnost,
-- plní se seedem při napojení Supabase.
create table program_templates (
  id uuid primary key default gen_random_uuid(),
  program program_type not null,
  verze int not null,
  base_mesicu int not null,          -- délka layoutové mřížky (acc 12, upgrade 12, komplet 24)
  vychozi_delka_mesicu int not null, -- výchozí délka plánu dle R31 (acc 12, upgrade 12, komplet 30)
  aktivni boolean not null default true,
  created_at timestamptz not null default now(),
  unique (program, verze)
);

create table template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references program_templates (id) on delete cascade,
  poradi int not null,
  typ plan_item_type not null,
  faze phase_type not null,
  mesic numeric not null,  -- pozice na mřížce šablony v měsících od startu
  unique (template_id, poradi)
);

-- ---------- Položky plánu ----------

create table plan_items (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students (id) on delete restrict,
  template_item_id uuid references template_items (id) on delete set null,
  poradi int not null,
  typ plan_item_type not null,
  faze phase_type,
  termin date not null,
  puvodni_termin date,  -- při posunu termínu (F6) zůstává původní kvůli auditu
  stav plan_item_status not null default 'naplanovano',
  splneno_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, poradi)
);
create index plan_items_student_idx on plan_items (student_id);
create index plan_items_termin_idx on plan_items (termin) where stav in ('naplanovano', 'po_terminu');
create trigger plan_items_updated_at before update on plan_items
  for each row execute function set_updated_at();

-- ---------- Nahrávky ----------

create table recordings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students (id) on delete restrict,
  plan_item_id uuid not null references plan_items (id) on delete restrict,
  pokus int not null default 1,  -- 1 = první nahrávka, 2+ = opravná po vrácení (F7)
  puvodni_soubor_path text,
  puvodni_nazev text,
  mp3_path text,
  delka_sekund int,
  souhlas_klienta boolean not null default false,  -- checkbox při uploadu (R16)
  stav recording_status not null default 'nahrano',
  vraceno_duvod text,  -- jen technické důvody (kap. 3)
  nahrano_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recordings_student_idx on recordings (student_id);
create index recordings_plan_item_idx on recordings (plan_item_id);
create index recordings_stav_idx on recordings (stav);
create trigger recordings_updated_at before update on recordings
  for each row execute function set_updated_at();

-- Log událostí nahrávky (kap. 10) + auditní stopa (princip 5, kap. 5)
create table recording_events (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null references recordings (id) on delete cascade,
  typ text not null,        -- např. 'nahrano', 'konverze_ok', 'transkripce_ok', 'vraceno', 'report_schvalen'
  detail jsonb,
  actor_profile_id uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index recording_events_recording_idx on recording_events (recording_id);

-- ---------- Transkripty ----------

create table transcripts (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null unique references recordings (id) on delete cascade,
  text text not null,
  segmenty jsonb,  -- časy + mluvčí (diarizace)
  sluzba text,     -- kterou službou vznikl (výběr dle testu, R37)
  created_at timestamptz not null default now()
);

-- ---------- Reporty ----------

create table reports (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null unique references recordings (id) on delete cascade,
  prompt_typ prompt_type not null,
  prompt_verze int not null,
  obsah_ai text not null,  -- původní výstup AI
  obsah text not null,     -- oficiální verze; mentor ji smí před odesláním upravit (R32)
  stav report_status not null default 'koncept',
  schvalil_profile_id uuid references profiles (id) on delete set null,
  schvaleno_at timestamptz,
  odeslano_at timestamptz,
  odemceno_at timestamptz,  -- odemčení studentovi: dlouhá po schůzce, krátká po schválení (R12)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger reports_updated_at before update on reports
  for each row execute function set_updated_at();

-- ---------- Mentoři ----------

create table mentors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles (id) on delete restrict,
  calendly_url text,
  calendly_embed text,
  mcs_stav mcs_status not null default 'nema',
  aktivni boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger mentors_updated_at before update on mentors
  for each row execute function set_updated_at();

-- ---------- Schůzky ----------

-- Vzniká přiřazením mentora k dlouhé nahrávce (F4); termín se pro start
-- zapisuje ručně (R33), má proběhnout do 30 dnů (R34).
create table meetings (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null references recordings (id) on delete restrict,
  mentor_id uuid not null references mentors (id) on delete restrict,
  termin timestamptz,
  stav meeting_status not null default 'bez_terminu',
  dokonceno_odeslano_at timestamptz,  -- „schůzka dokončena + report odeslán" (R12)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index meetings_mentor_idx on meetings (mentor_id);
create index meetings_recording_idx on meetings (recording_id);
create trigger meetings_updated_at before update on meetings
  for each row execute function set_updated_at();

-- ---------- Platby ----------

-- Jediný Stripe odkaz v systému je poplatek 500 Kč (R19, R35);
-- 1 000 Kč za opravnou se hradí mimo systém a jen eviduje (R18).
create table payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students (id) on delete restrict,
  plan_item_id uuid references plan_items (id) on delete set null,
  recording_id uuid references recordings (id) on delete set null,
  typ payment_type not null,
  castka_kc int not null,
  stav payment_status not null default 'ceka',
  stripe_link_odeslan_at timestamptz,
  uhrazeno_oznacil_profile_id uuid references profiles (id) on delete set null,
  uhrazeno_at timestamptz,
  created_at timestamptz not null default now()
);
create index payments_student_idx on payments (student_id);

-- ---------- Master Prompty a knihovna standardů ----------

create table master_prompts (
  id uuid primary key default gen_random_uuid(),
  typ prompt_type not null,
  verze int not null,
  obsah text not null,
  aktivni boolean not null default false,  -- právě jedna aktivní verze na typ (hlídá aplikace)
  platny_od timestamptz not null default now(),
  created_by_profile_id uuid references profiles (id) on delete set null,
  unique (typ, verze)
);

create table standards (
  id uuid primary key default gen_random_uuid(),
  nazev text not null,
  obsah text not null,
  poradi int not null default 0,
  aktivni boolean not null default true,
  updated_at timestamptz not null default now()
);
create trigger standards_updated_at before update on standards
  for each row execute function set_updated_at();

-- ---------- Notifikace ----------

create table notifications (
  id uuid primary key default gen_random_uuid(),
  prijemce_profile_id uuid references profiles (id) on delete set null,
  prijemce_email text not null,
  typ text not null,  -- např. 'pripominka_21d', 'den_d', 'eskalace_14d', 'prirazeni_mentora'
  predmet text not null,
  plan_item_id uuid references plan_items (id) on delete set null,
  recording_id uuid references recordings (id) on delete set null,
  odeslano_at timestamptz,
  doruceno boolean,
  chyba text,
  created_at timestamptz not null default now()
);
create index notifications_prijemce_idx on notifications (prijemce_email, typ);

-- ---------- Fronta úloh ----------

-- Jednoduchá fronta: tabulka + plánované funkce (kap. 11); úlohy konverze,
-- transkripce a vyhodnocení se po chybě opakují.
create table job_queue (
  id uuid primary key default gen_random_uuid(),
  typ text not null,  -- 'konverze_mp3', 'transkripce', 'vyhodnoceni', 'notifikace'
  payload jsonb not null default '{}',
  stav job_status not null default 'ceka',
  pokusy int not null default 0,
  max_pokusu int not null default 3,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  chyba text,
  created_at timestamptz not null default now()
);
create index job_queue_ready_idx on job_queue (run_after) where stav = 'ceka';

-- ---------- Nastavení ----------

-- Konfigurace: parametry notifikační kaskády (R20), Stripe odkaz 500 Kč (R35),
-- adresy odesílatele apod.
create table settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by_profile_id uuid references profiles (id) on delete set null
);

-- ---------- RLS: bezpečný default ----------

-- RLS zapnuto všude, zatím bez policies: anon/authenticated nevidí nic,
-- server pracuje přes service role. Policies dle matice v kap. 6 přibudou
-- společně s napojením Supabase Auth, aby šly rovnou otestovat.
alter table profiles enable row level security;
alter table students enable row level security;
alter table program_templates enable row level security;
alter table template_items enable row level security;
alter table plan_items enable row level security;
alter table recordings enable row level security;
alter table recording_events enable row level security;
alter table transcripts enable row level security;
alter table reports enable row level security;
alter table mentors enable row level security;
alter table meetings enable row level security;
alter table payments enable row level security;
alter table master_prompts enable row level security;
alter table standards enable row level security;
alter table notifications enable row level security;
alter table job_queue enable row level security;
alter table settings enable row level security;
