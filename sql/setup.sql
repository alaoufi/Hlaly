-- ============================================================
-- مراحي — إعداد قاعدة البيانات كاملاً (شغّله مرة واحدة في Supabase ▸ SQL Editor)
-- يجمع كل الملفات بالترتيب الصحيح. آمن للتكرار.
-- ============================================================


-- ======================== 01_schema.sql ========================

-- ============================================================
--  مراحي — مخطط قاعدة البيانات والصلاحيات (Supabase / Postgres)
--  مزرعة واحدة مشتركة + مستخدمون بأدوار وصلاحيات تفصيلية لكل قسم.
--  نفّذ هذا الملف كاملاً في: Supabase → SQL Editor → Run
-- ============================================================

-- ---------- 1) جدول الأعضاء والصلاحيات ----------
create table if not exists public.mrahi_members (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  username   text,                       -- اسم مستخدم للدخول (اختياري)
  phone      text,                       -- رقم الجوال للدخول
  role       text not null default 'member' check (role in ('admin','member')),
  is_active  boolean not null default false,
  -- صلاحيات تفصيلية: { "animals": {"view":true,"edit":true}, "breeding": {...}, ... }
  perms      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
-- لا يتكرّر الجوال ولا اسم المستخدم (نتجاهل الفارغ/المعدوم)
create unique index if not exists mrahi_members_phone_key
  on public.mrahi_members (phone) where phone is not null and phone <> '';
create unique index if not exists mrahi_members_username_key
  on public.mrahi_members (lower(username)) where username is not null and username <> '';

-- ---------- 2) دوال الصلاحية (SECURITY DEFINER لتفادي التكرار في RLS) ----------
create or replace function public.mrahi_is_member() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from mrahi_members
                 where user_id = auth.uid() and is_active);
$$;

create or replace function public.mrahi_is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from mrahi_members
                 where user_id = auth.uid() and is_active and role = 'admin');
$$;

-- يتحقق من صلاحية قسم (mod) لإجراء (act = 'view' أو 'edit'). المدير لديه كل شيء.
create or replace function public.mrahi_can(mod text, act text) returns boolean
  language sql stable security definer set search_path = public as $$
  select public.mrahi_is_admin() or exists (
    select 1 from mrahi_members
    where user_id = auth.uid() and is_active
      and coalesce((perms #>> array[mod, act])::boolean, false)
  );
$$;

-- ---------- 3) إنشاء صف عضو تلقائياً عند تسجيل مستخدم جديد ----------
create or replace function public.mrahi_handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.mrahi_members (user_id, full_name, username, phone, role, is_active, perms)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', ''),
          nullif(new.raw_user_meta_data->>'username', ''),
          nullif(new.raw_user_meta_data->>'phone', ''),
          'member', false, '{}'::jsonb)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_marahi on auth.users;
drop trigger if exists on_auth_user_created_mrah on auth.users;
create trigger on_auth_user_created_mrah
  after insert on auth.users
  for each row execute function public.mrahi_handle_new_user();

-- ---------- 3أ) استرجاع بريد الدخول من الجوال أو اسم المستخدم ----------
-- تُستدعى من الواجهة (anon) قبل المصادقة لتحويل المُعرّف إلى البريد الداخلي.
create or replace function public.mrahi_resolve_login(ident text) returns text
  language sql stable security definer set search_path = public, auth as $$
  select u.email
    from public.mrahi_members m
    join auth.users u on u.id = m.user_id
   where m.phone = ident or lower(m.username) = lower(ident)
   order by (m.phone = ident) desc
   limit 1;
$$;
revoke all on function public.mrahi_resolve_login(text) from public;
grant execute on function public.mrahi_resolve_login(text) to anon, authenticated;

-- ---------- 4) جداول البيانات ----------
create table if not exists public.mrahi_animals (
  id          bigint generated always as identity primary key,
  type        text not null default 'sheep',
  pen         text default '',
  code        text default '',
  idkind      text default 'number',
  name        text default '',
  sex         text default 'female',
  birth       date,
  color       text default '',
  status      text default 'present',
  source      text default 'purchased',
  buy_date    date,
  buy_price   numeric,
  sale_date   date,
  sale_price  numeric,
  dead_date   date,
  mother_id   bigint references public.mrahi_animals(id) on delete set null,
  father_id   bigint references public.mrahi_animals(id) on delete set null,
  father_name text default '',
  notes       text default '',
  created_at  timestamptz not null default now(),
  created_by  uuid default auth.uid()
);

create table if not exists public.mrahi_matings (
  id         bigint generated always as identity primary key,
  animal_id  bigint references public.mrahi_animals(id) on delete cascade,
  date       date,
  sire_code  text default '',
  sire_name  text default '',
  notes      text default '',
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

create table if not exists public.mrahi_pregnancies (
  id          bigint generated always as identity primary key,
  animal_id   bigint references public.mrahi_animals(id) on delete cascade,
  mating_date date,
  gest        int default 150,
  expected    date,
  status      text default 'monitoring',
  notes       text default '',
  created_at  timestamptz not null default now(),
  created_by  uuid default auth.uid()
);

create table if not exists public.mrahi_births (
  id             bigint generated always as identity primary key,
  mother_id      bigint references public.mrahi_animals(id) on delete cascade,
  offspring_id   bigint references public.mrahi_animals(id) on delete set null,
  offspring_code text default '',
  date           date,
  sex            text default 'female',
  father_name    text default '',
  notes          text default '',
  created_at     timestamptz not null default now(),
  created_by     uuid default auth.uid()
);

create table if not exists public.mrahi_vaccine_types (
  id               bigint generated always as identity primary key,
  name             text not null,
  vaccine_name     text default '',
  usage            text default '',           -- الاستخدام
  dose             text default '',           -- الجرعة
  recommended_age  text default '',           -- العمر الموصى به
  validity_days    int default 0,             -- مدة الفاعلية (أيام)
  milk_withdrawal_days int default 0,         -- مدة التحريم للحليب
  meat_withdrawal_days int default 0,         -- مدة التحريم للحوم
  withdrawal_days  int default 0,             -- (قديم) يبقى للتوافق
  species          jsonb default '[]'::jsonb,
  notes            text default '',
  created_at       timestamptz not null default now(),
  created_by       uuid default auth.uid()
);

create table if not exists public.mrahi_treatment_types (
  id              bigint generated always as identity primary key,
  name            text not null,
  form            text,
  dose            text default '',
  duration_days   int default 0,
  withdrawal_days int default 0,
  species         jsonb default '[]'::jsonb,
  treats          text default '',
  notes           text default '',
  created_at      timestamptz not null default now(),
  created_by      uuid default auth.uid()
);
alter table public.mrahi_treatment_types enable row level security;
drop policy if exists tt_sel on public.mrahi_treatment_types;
create policy tt_sel on public.mrahi_treatment_types for select using (public.mrahi_can('treatments','view'));
drop policy if exists tt_ins on public.mrahi_treatment_types;
create policy tt_ins on public.mrahi_treatment_types for insert with check (public.mrahi_can('treatments','add'));
drop policy if exists tt_upd on public.mrahi_treatment_types;
create policy tt_upd on public.mrahi_treatment_types for update using (public.mrahi_can('treatments','edit')) with check (public.mrahi_can('treatments','edit'));
drop policy if exists tt_del on public.mrahi_treatment_types;
create policy tt_del on public.mrahi_treatment_types for delete using (public.mrahi_can('treatments','delete'));

create table if not exists public.mrahi_vaccinations (
  id              bigint generated always as identity primary key,
  animal_id       bigint references public.mrahi_animals(id) on delete cascade,
  type_id         bigint references public.mrahi_vaccine_types(id) on delete set null,
  date            date,
  withdrawal_end  date,
  next_due        date,
  notes           text default '',
  created_at      timestamptz not null default now(),
  created_by      uuid default auth.uid()
);

create table if not exists public.mrahi_treatments (
  id              bigint generated always as identity primary key,
  animal_id       bigint references public.mrahi_animals(id) on delete cascade,
  treatment_type  text default '',
  med_name        text default '',
  withdrawal_days int default 0,
  date            date,
  withdrawal_end  date,
  action          text default '',
  notes           text default '',
  created_at      timestamptz not null default now(),
  created_by      uuid default auth.uid()
);

-- سجل النسخ الاحتياطية: لكل مستخدم نسخه الخاصة (يراها ويستعيدها هو فقط)
create table if not exists public.mrahi_backups (
  id          bigint generated always as identity primary key,
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  label       text default '',
  note        text default '',
  payload     jsonb not null,          -- لقطة كاملة من بيانات المزرعة وقت النسخ
  animals_count int default 0,
  created_at  timestamptz not null default now()
);
create index if not exists mrahi_backups_owner_idx on public.mrahi_backups(owner_id, created_at desc);

-- ---------- 5) تفعيل RLS ----------
alter table public.mrahi_members      enable row level security;
alter table public.mrahi_animals      enable row level security;
alter table public.mrahi_matings      enable row level security;
alter table public.mrahi_pregnancies  enable row level security;
alter table public.mrahi_births       enable row level security;
alter table public.mrahi_vaccine_types enable row level security;
alter table public.mrahi_vaccinations enable row level security;
alter table public.mrahi_treatments   enable row level security;
alter table public.mrahi_backups      enable row level security;

-- ---------- 6) سياسات الأعضاء ----------
-- يقرأ كل عضو فعّال قائمة الأعضاء (لعرض الأسماء)، والمدير يدير الكل.
drop policy if exists members_select on public.mrahi_members;
create policy members_select on public.mrahi_members for select
  using (public.mrahi_is_member() or user_id = auth.uid());

drop policy if exists members_update on public.mrahi_members;
create policy members_update on public.mrahi_members for update
  using (public.mrahi_is_admin()) with check (public.mrahi_is_admin());

drop policy if exists members_insert on public.mrahi_members;
create policy members_insert on public.mrahi_members for insert
  with check (public.mrahi_is_admin());

drop policy if exists members_delete on public.mrahi_members;
create policy members_delete on public.mrahi_members for delete
  using (public.mrahi_is_admin() and user_id <> auth.uid());

-- ---------- 7) سياسات أقسام البيانات (view/edit حسب القسم) ----------
-- دالة مساعدة لتقصير التكرار غير متاحة في DDL، لذا نكتب السياسات لكل جدول.

-- الحلال (animals)
drop policy if exists animals_sel on public.mrahi_animals;
create policy animals_sel on public.mrahi_animals for select using (public.mrahi_can('animals','view'));
drop policy if exists animals_ins on public.mrahi_animals;
create policy animals_ins on public.mrahi_animals for insert with check (public.mrahi_can('animals','add'));
drop policy if exists animals_upd on public.mrahi_animals;
create policy animals_upd on public.mrahi_animals for update using (public.mrahi_can('animals','edit')) with check (public.mrahi_can('animals','edit'));
drop policy if exists animals_del on public.mrahi_animals;
create policy animals_del on public.mrahi_animals for delete using (public.mrahi_can('animals','delete'));

-- التلقيح/الحمل/الولادات (breeding)
drop policy if exists matings_sel on public.mrahi_matings;
create policy matings_sel on public.mrahi_matings for select using (public.mrahi_can('breeding','view'));
drop policy if exists matings_ins on public.mrahi_matings;
create policy matings_ins on public.mrahi_matings for insert with check (public.mrahi_can('breeding','add'));
drop policy if exists matings_upd on public.mrahi_matings;
create policy matings_upd on public.mrahi_matings for update using (public.mrahi_can('breeding','edit')) with check (public.mrahi_can('breeding','edit'));
drop policy if exists matings_del on public.mrahi_matings;
create policy matings_del on public.mrahi_matings for delete using (public.mrahi_can('breeding','delete'));

drop policy if exists preg_sel on public.mrahi_pregnancies;
create policy preg_sel on public.mrahi_pregnancies for select using (public.mrahi_can('breeding','view'));
drop policy if exists preg_ins on public.mrahi_pregnancies;
create policy preg_ins on public.mrahi_pregnancies for insert with check (public.mrahi_can('breeding','add'));
drop policy if exists preg_upd on public.mrahi_pregnancies;
create policy preg_upd on public.mrahi_pregnancies for update using (public.mrahi_can('breeding','edit')) with check (public.mrahi_can('breeding','edit'));
drop policy if exists preg_del on public.mrahi_pregnancies;
create policy preg_del on public.mrahi_pregnancies for delete using (public.mrahi_can('breeding','delete'));

drop policy if exists births_sel on public.mrahi_births;
create policy births_sel on public.mrahi_births for select using (public.mrahi_can('breeding','view'));
drop policy if exists births_ins on public.mrahi_births;
create policy births_ins on public.mrahi_births for insert with check (public.mrahi_can('breeding','add'));
drop policy if exists births_upd on public.mrahi_births;
create policy births_upd on public.mrahi_births for update using (public.mrahi_can('breeding','edit')) with check (public.mrahi_can('breeding','edit'));
drop policy if exists births_del on public.mrahi_births;
create policy births_del on public.mrahi_births for delete using (public.mrahi_can('breeding','delete'));

-- التطعيمات (vaccines)
drop policy if exists vt_sel on public.mrahi_vaccine_types;
create policy vt_sel on public.mrahi_vaccine_types for select using (public.mrahi_can('vaccines','view'));
drop policy if exists vt_ins on public.mrahi_vaccine_types;
create policy vt_ins on public.mrahi_vaccine_types for insert with check (public.mrahi_can('vaccines','add'));
drop policy if exists vt_upd on public.mrahi_vaccine_types;
create policy vt_upd on public.mrahi_vaccine_types for update using (public.mrahi_can('vaccines','edit')) with check (public.mrahi_can('vaccines','edit'));
drop policy if exists vt_del on public.mrahi_vaccine_types;
create policy vt_del on public.mrahi_vaccine_types for delete using (public.mrahi_can('vaccines','delete'));

drop policy if exists vac_sel on public.mrahi_vaccinations;
create policy vac_sel on public.mrahi_vaccinations for select using (public.mrahi_can('vaccines','view'));
drop policy if exists vac_ins on public.mrahi_vaccinations;
create policy vac_ins on public.mrahi_vaccinations for insert with check (public.mrahi_can('vaccines','add'));
drop policy if exists vac_upd on public.mrahi_vaccinations;
create policy vac_upd on public.mrahi_vaccinations for update using (public.mrahi_can('vaccines','edit')) with check (public.mrahi_can('vaccines','edit'));
drop policy if exists vac_del on public.mrahi_vaccinations;
create policy vac_del on public.mrahi_vaccinations for delete using (public.mrahi_can('vaccines','delete'));

-- العلاجات (treatments)
drop policy if exists trt_sel on public.mrahi_treatments;
create policy trt_sel on public.mrahi_treatments for select using (public.mrahi_can('treatments','view'));
drop policy if exists trt_ins on public.mrahi_treatments;
create policy trt_ins on public.mrahi_treatments for insert with check (public.mrahi_can('treatments','add'));
drop policy if exists trt_upd on public.mrahi_treatments;
create policy trt_upd on public.mrahi_treatments for update using (public.mrahi_can('treatments','edit')) with check (public.mrahi_can('treatments','edit'));
drop policy if exists trt_del on public.mrahi_treatments;
create policy trt_del on public.mrahi_treatments for delete using (public.mrahi_can('treatments','delete'));

-- النسخ الاحتياطية: كل مستخدم يرى/يضيف/يحذف نسخه فقط (صلاحية backup.view)
drop policy if exists bkp_sel on public.mrahi_backups;
create policy bkp_sel on public.mrahi_backups for select
  using (owner_id = auth.uid() and public.mrahi_can('backup','view'));
drop policy if exists bkp_ins on public.mrahi_backups;
create policy bkp_ins on public.mrahi_backups for insert
  with check (owner_id = auth.uid() and public.mrahi_can('backup','view'));
drop policy if exists bkp_del on public.mrahi_backups;
create policy bkp_del on public.mrahi_backups for delete
  using (owner_id = auth.uid() and public.mrahi_can('backup','view'));

-- ============================================================
--  بعد التنفيذ: أنشئ حسابك أول مرة من التطبيق («حساب جديد») ثم نفّذ
--  هذا الأمر لجعل حسابك مديراً (استبدل اسم المستخدم أو الجوال):
--
--  update public.mrahi_members
--     set role = 'admin', is_active = true,
--         perms = '{"animals":{"view":true,"add":true,"edit":true,"delete":true},
--                   "breeding":{"view":true,"add":true,"edit":true,"delete":true},
--                   "vaccines":{"view":true,"add":true,"edit":true,"delete":true},
--                   "treatments":{"view":true,"add":true,"edit":true,"delete":true},
--                   "backup":{"view":true}}'::jsonb
--   where username = 'اسم_المستخدم';   -- أو: where phone = '05xxxxxxxx';
-- ============================================================

-- ======================== 02_auth-phone-username.sql ========================

-- ============================================================
--  ترقية الدخول: جوال + اسم مستخدم + رقم سري (٤ خانات) بلا بريد
--  نفّذ هذا الملف في: Supabase → SQL Editor → Run
--  (آمن للتكرار — لا يحذف أي بيانات موجودة)
-- ============================================================

-- 1) أعمدة الجوال واسم المستخدم على جدول الأعضاء
alter table public.mrahi_members add column if not exists username text;
alter table public.mrahi_members add column if not exists phone    text;

create unique index if not exists mrahi_members_phone_key
  on public.mrahi_members (phone) where phone is not null and phone <> '';
create unique index if not exists mrahi_members_username_key
  on public.mrahi_members (lower(username)) where username is not null and username <> '';

-- 2) تحديث مُشغّل إنشاء العضو ليحفظ الجوال واسم المستخدم من بيانات التسجيل
create or replace function public.mrahi_handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.mrahi_members (user_id, full_name, username, phone, role, is_active, perms)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', ''),
          nullif(new.raw_user_meta_data->>'username', ''),
          nullif(new.raw_user_meta_data->>'phone', ''),
          'member', false, '{}'::jsonb)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- 3) دالة تحويل (الجوال أو اسم المستخدم) إلى البريد الداخلي للدخول
create or replace function public.mrahi_resolve_login(ident text) returns text
  language sql stable security definer set search_path = public, auth as $$
  select u.email
    from public.mrahi_members m
    join auth.users u on u.id = m.user_id
   where m.phone = ident or lower(m.username) = lower(ident)
   order by (m.phone = ident) desc
   limit 1;
$$;
revoke all on function public.mrahi_resolve_login(text) from public;
grant execute on function public.mrahi_resolve_login(text) to anon, authenticated;

-- ============================================================
--  مهم — في Supabase → Authentication → Sign In / Providers → Email:
--  أوقِف خيار «Confirm email» (تأكيد البريد) حتى يعمل الدخول فوراً
--  بعد التسجيل (لأن البريد الداخلي وهمي ولا يصله رابط تأكيد).
-- ============================================================

-- ======================== 03_tips-and-sysadmin.sql ========================

-- ============================================================
--  مراحي — النصائح والمعلومات + رتبة "مدير النظام"
--  نفّذ هذا الملف في: Supabase → SQL Editor → Run
--  (مستقل — يعمل فوق المخطط الأساسي schema.sql)
-- ============================================================

-- ---------- 1) رتبة مدير النظام ----------
-- صلاحية منفصلة عن إدارة المراح: تتحكّم بالمحتوى العام (النصائح والمعلومات).
alter table public.mrahi_members
  add column if not exists is_sysadmin boolean not null default false;

create or replace function public.mrahi_is_sysadmin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from mrahi_members
                 where user_id = auth.uid() and is_active and is_sysadmin);
$$;

-- ---------- 2) جدول النصائح والمعلومات ----------
create table if not exists public.mrahi_tips (
  id          bigint generated always as identity primary key,
  kind        text not null default 'tip' check (kind in ('tip','info')), -- نصيحة أو معلومة
  title       text not null,
  brief       text not null default '',   -- المختصر (يظهر في الرئيسية)
  detail      text default '',            -- التفصيل (يظهر عند النقر)
  is_active   boolean not null default true,
  sort        int default 0,
  created_at  timestamptz not null default now(),
  created_by  uuid default auth.uid()
);

-- ---------- 3) سياسات RLS ----------
alter table public.mrahi_tips enable row level security;

-- كل عضو فعّال يقرأ النصائح والمعلومات (لعرضها في الرئيسية)
drop policy if exists tips_sel on public.mrahi_tips;
create policy tips_sel on public.mrahi_tips for select
  using (public.mrahi_is_member());

-- الإضافة/التعديل/الحذف لمدير النظام فقط
drop policy if exists tips_ins on public.mrahi_tips;
create policy tips_ins on public.mrahi_tips for insert
  with check (public.mrahi_is_sysadmin());
drop policy if exists tips_upd on public.mrahi_tips;
create policy tips_upd on public.mrahi_tips for update
  using (public.mrahi_is_sysadmin()) with check (public.mrahi_is_sysadmin());
drop policy if exists tips_del on public.mrahi_tips;
create policy tips_del on public.mrahi_tips for delete
  using (public.mrahi_is_sysadmin());

-- ---------- 4) تعديل سياسة الأعضاء: مدير النظام يدير عمود is_sysadmin ----------
-- مدير المراح (admin) يعدّل بيانات الأعضاء كالمعتاد، ومدير النظام يستطيع كذلك
-- منح/سحب رتبة مدير النظام للآخرين.
drop policy if exists members_update on public.mrahi_members;
create policy members_update on public.mrahi_members for update
  using (public.mrahi_is_admin() or public.mrahi_is_sysadmin())
  with check (public.mrahi_is_admin() or public.mrahi_is_sysadmin());

-- ============================================================
--  بعد التنفيذ: عيّن أول مدير نظام (استبدل اسم المستخدم أو الجوال):
--
--  update public.mrahi_members set is_sysadmin = true
--   where username = 'اسم_المستخدم';   -- أو: where phone = '05xxxxxxxx';
-- ============================================================

-- ======================== 04_secure-existing-tables.sql ========================

-- ============================================================
--  حماية مشاركة القاعدة: تفعيل RLS على كل جداول المخطط public
-- ------------------------------------------------------------
--  لماذا؟ تطبيق mrahi يعمل في المتصفّح بمفتاح anon العلني.
--  أي جدول بلا RLS في نفس المشروع يصبح مكشوفاً عبر REST API لأي
--  شخص يملك المفتاح. تفعيل RLS (بدون سياسات) يمنع anon تماماً،
--  بينما الخادم (service_role) يتخطّى RLS فتستمر منصة alaoufi.me
--  بالعمل دون أي تغيير.
--
--  نفّذه مرة واحدة في: Supabase → SQL Editor → Run
--  آمن للتكرار، ولا يحذف ولا يعدّل أي بيانات.
-- ============================================================

do $$
declare
  r record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security;', r.tablename);
  end loop;
end $$;

-- تحقق (اختياري): يجب أن تكون rowsecurity = true لكل الجداول
-- select tablename, rowsecurity from pg_tables where schemaname='public' order by tablename;

-- ملاحظة:
--  • جداول mrahi_* لديها سياساتها الخاصة (من schema.sql) فتعمل عادي.
--  • جداول منصة alaoufi.me القديمة ستصبح محميّة من anon،
--    والخادم يصل لها عبر service_role كالمعتاد.

-- ======================== 05_migrate-vaccine-fields.sql ========================

-- ترقية جدول أنواع التطعيمات: إضافة الحقول الناقصة
-- شغّل هذا الملف مرة واحدة في Supabase ▸ SQL Editor.
-- آمن للتكرار (IF NOT EXISTS) ولا يؤثر على البيانات الموجودة.

alter table public.mrahi_vaccine_types add column if not exists usage                text default '';   -- الاستخدام
alter table public.mrahi_vaccine_types add column if not exists dose                 text default '';   -- الجرعة
alter table public.mrahi_vaccine_types add column if not exists recommended_age      text default '';   -- العمر الموصى به
alter table public.mrahi_vaccine_types add column if not exists validity_days        int  default 0;    -- مدة الفاعلية (أيام)
alter table public.mrahi_vaccine_types add column if not exists milk_withdrawal_days int  default 0;    -- مدة التحريم للحليب
alter table public.mrahi_vaccine_types add column if not exists meat_withdrawal_days int  default 0;    -- مدة التحريم للحوم

-- نقل قيمة التحريم القديمة (إن وُجدت) إلى عمودي الحليب واللحم لمرة واحدة
update public.mrahi_vaccine_types
   set milk_withdrawal_days = withdrawal_days,
       meat_withdrawal_days = withdrawal_days
 where coalesce(withdrawal_days,0) > 0
   and coalesce(milk_withdrawal_days,0) = 0
   and coalesce(meat_withdrawal_days,0) = 0;
