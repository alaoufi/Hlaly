-- ============================================================
--  مراح — النصائح والمعلومات + رتبة "مدير النظام"
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
