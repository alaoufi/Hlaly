-- ============================================================
--  مراح — خصوصية الأعضاء + مشاركة الحلال بدعوة وقبول متبادل
--  • معلومات الأعضاء سرية: لا يقرأ جدول الأعضاء إلا المدير أو صاحب الصف.
--  • مشاركة الحلال: صاحب الحلال يدعو عضواً (بالجوال/المعرّف)، والعضو يقبل،
--    فيحصل على وصول «عرض فقط» لحلال الداعي. التعديل يبقى للمالك وحده.
--  نفّذه بعد 13_owner_accounts.sql. آمن للتكرار.
-- ============================================================

-- 1) خصوصية الأعضاء: القراءة للمدير أو صاحب الصف فقط
--    (أسماء كتّاب المنتدى مخزّنة على المشاركات، فلا يتأثر عرضها)
drop policy if exists members_select on public.mrahi_members;
create policy members_select on public.mrahi_members for select
  using (public.mrahi_is_admin() or user_id = auth.uid());

-- 2) جدول دعوات مشاركة الحلال
create table if not exists public.mrahi_herd_shares (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,  -- صاحب الحلال (الداعي)
  member_id    uuid not null references auth.users(id) on delete cascade,  -- العضو المدعوّ
  owner_name   text,                                                       -- اسم مُلَقّن (لتفادي قراءة جدول الأعضاء)
  member_name  text,
  status       text not null default 'pending' check (status in ('pending','accepted','declined','revoked')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  unique (owner_id, member_id),
  check (owner_id <> member_id)
);
create index if not exists mrahi_hs_owner_idx  on public.mrahi_herd_shares(owner_id);
create index if not exists mrahi_hs_member_idx on public.mrahi_herd_shares(member_id);

alter table public.mrahi_herd_shares enable row level security;

-- يرى الطرفان الدعوة (والمدير)
drop policy if exists hs_sel on public.mrahi_herd_shares;
create policy hs_sel on public.mrahi_herd_shares for select
  using (owner_id = auth.uid() or member_id = auth.uid() or public.mrahi_is_admin());

-- إنشاء الدعوة: من صاحب الحلال فقط (يُستحسن عبر الدالة أدناه)
drop policy if exists hs_ins on public.mrahi_herd_shares;
create policy hs_ins on public.mrahi_herd_shares for insert
  with check (owner_id = auth.uid() and owner_id <> member_id);

-- تحديث الحالة: أيٌّ من الطرفين (المدعوّ يقبل/يرفض، الداعي يسحب)
drop policy if exists hs_upd on public.mrahi_herd_shares;
create policy hs_upd on public.mrahi_herd_shares for update
  using (owner_id = auth.uid() or member_id = auth.uid())
  with check (owner_id = auth.uid() or member_id = auth.uid());

-- حذف الدعوة/المشاركة: أيٌّ من الطرفين أو المدير
drop policy if exists hs_del on public.mrahi_herd_shares;
create policy hs_del on public.mrahi_herd_shares for delete
  using (owner_id = auth.uid() or member_id = auth.uid() or public.mrahi_is_admin());

-- 3) دالة: هل حلال هذا المالك مُشارَك معي (وقبلتُ)؟
create or replace function public.mrahi_shared_with_me(p_owner uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.mrahi_herd_shares s
    where s.owner_id = p_owner and s.member_id = auth.uid() and s.status = 'accepted'
  );
$$;

-- 4) إعادة كتابة سياسات «العرض» على سجلّات الحلال لتشمل المشارَك معه (عرض فقط)
--    (الإضافة/التعديل/الحذف تبقى كما هي: للمالك أو المدير)
drop policy if exists animals_sel on public.mrahi_animals;
create policy animals_sel on public.mrahi_animals for select using (
  public.mrahi_is_admin()
  or (owner_id = auth.uid() and public.mrahi_can('animals','view'))
  or public.mrahi_shared_with_me(owner_id));

drop policy if exists matings_sel on public.mrahi_matings;
create policy matings_sel on public.mrahi_matings for select using (
  public.mrahi_is_admin()
  or (owner_id = auth.uid() and public.mrahi_can('breeding','view'))
  or public.mrahi_shared_with_me(owner_id));

drop policy if exists preg_sel on public.mrahi_pregnancies;
create policy preg_sel on public.mrahi_pregnancies for select using (
  public.mrahi_is_admin()
  or (owner_id = auth.uid() and public.mrahi_can('breeding','view'))
  or public.mrahi_shared_with_me(owner_id));

drop policy if exists births_sel on public.mrahi_births;
create policy births_sel on public.mrahi_births for select using (
  public.mrahi_is_admin()
  or (owner_id = auth.uid() and public.mrahi_can('breeding','view'))
  or public.mrahi_shared_with_me(owner_id));

drop policy if exists vac_sel on public.mrahi_vaccinations;
create policy vac_sel on public.mrahi_vaccinations for select using (
  public.mrahi_is_admin()
  or (owner_id = auth.uid() and public.mrahi_can('vaccines','view'))
  or public.mrahi_shared_with_me(owner_id));

drop policy if exists trt_sel on public.mrahi_treatments;
create policy trt_sel on public.mrahi_treatments for select using (
  public.mrahi_is_admin()
  or (owner_id = auth.uid() and public.mrahi_can('treatments','view'))
  or public.mrahi_shared_with_me(owner_id));

-- 5) دالة الدعوة بالجوال/اسم المستخدم (تحافظ على سرية الأعضاء)
--    تبحث عن العضو خادمياً وتنشئ دعوة معلّقة، دون كشف دليل الأعضاء.
create or replace function public.mrahi_invite_to_herd(p_identifier text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_in     text := trim(coalesce(p_identifier, ''));
  v_digits text := regexp_replace(v_in, '\D', '', 'g');
  v_target uuid;
  v_tname  text;
  v_oname  text;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'err', 'auth'); end if;
  if length(v_in) = 0 then return jsonb_build_object('ok', false, 'err', 'empty'); end if;

  -- مطابقة باسم المستخدم (تطابق تام) أو بالجوال (تطابق آخر الأرقام، ٧ خانات فأكثر)
  select user_id, full_name into v_target, v_tname
    from public.mrahi_members
   where (username is not null and lower(username) = lower(v_in))
      or (v_digits <> '' and length(v_digits) >= 7
          and regexp_replace(coalesce(phone, ''), '\D', '', 'g') like '%' || v_digits)
   order by (username is not null and lower(username) = lower(v_in)) desc
   limit 1;

  if v_target is null    then return jsonb_build_object('ok', false, 'err', 'notfound'); end if;
  if v_target = auth.uid() then return jsonb_build_object('ok', false, 'err', 'self'); end if;

  select full_name into v_oname from public.mrahi_members where user_id = auth.uid();

  insert into public.mrahi_herd_shares (owner_id, member_id, owner_name, member_name, status)
    values (auth.uid(), v_target, v_oname, v_tname, 'pending')
  on conflict (owner_id, member_id)
    do update set status = 'pending', owner_name = excluded.owner_name,
                  member_name = excluded.member_name, responded_at = null;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.mrahi_invite_to_herd(text) to authenticated;

-- 6) ضبط انتقالات حالة المشاركة (قبول/رفض للمدعوّ، سحب/إعادة دعوة للمالك)
create or replace function public.mrahi_hs_guard() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if public.mrahi_is_admin() then return new; end if;
  if auth.uid() = old.member_id and auth.uid() <> old.owner_id then
    if old.status <> 'pending' then raise exception 'invite not pending'; end if;
    if new.status not in ('accepted','declined') then raise exception 'invalid status'; end if;
    if new.owner_id <> old.owner_id or new.member_id <> old.member_id then raise exception 'parties immutable'; end if;
    return new;
  elsif auth.uid() = old.owner_id then
    if new.status not in ('revoked','pending') then raise exception 'owner may only revoke or re-invite'; end if;
    if new.owner_id <> old.owner_id or new.member_id <> old.member_id then raise exception 'parties immutable'; end if;
    return new;
  end if;
  raise exception 'forbidden';
end;
$$;
drop trigger if exists mrahi_hs_guard on public.mrahi_herd_shares;
create trigger mrahi_hs_guard before update on public.mrahi_herd_shares
  for each row execute function public.mrahi_hs_guard();

-- 7) إبقاء أسماء مشرفي المنتدى ظاهرة للعموم رغم سرية دليل الأعضاء (تخزين مُلَقّن)
alter table public.mrahi_forum_moderators add column if not exists member_name text;
update public.mrahi_forum_moderators fm
   set member_name = m.full_name
  from public.mrahi_members m
 where m.user_id = fm.user_id and (fm.member_name is null or fm.member_name = '');
