-- ============================================================
--  مراح — أنواع الحسابات: «صاحب حلال» (خاص) و«زائر» (مجتمع فقط)
--  • الزائر: يدخل فوراً، يقرأ كل شيء ويشارك في المنتدى، بلا حلال.
--  • صاحب الحلال: بانتظار موافقة المدير، ثم يدير حلاله الخاص المعزول.
--  • سجلّات الحلال تُعزل لكل مالك عبر owner_id؛ المدير يرى الكل.
--  نفّذه بعد 12_views.sql. آمن للتكرار.
-- ============================================================

-- 1) نوع الحساب على صف العضو
alter table public.mrahi_members
  add column if not exists account_type text not null default 'owner';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'mrahi_members_account_type_chk') then
    alter table public.mrahi_members
      add constraint mrahi_members_account_type_chk check (account_type in ('owner','visitor'));
  end if;
end $$;

-- 2) إنشاء صف العضو تلقائياً حسب نوع الحساب المختار عند التسجيل
create or replace function public.mrahi_handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  atype    text := lower(coalesce(nullif(new.raw_user_meta_data->>'account_type',''), 'owner'));
  v_active boolean;
  v_perms  jsonb;
begin
  if atype = 'visitor' then
    -- الزائر: دخول فوري + صلاحية المنتدى فقط (التعديل/الحذف مقيّدان بصاحب المحتوى في RLS)
    v_active := true;
    v_perms  := '{"forum":{"view":true,"add":true,"edit":true,"delete":true}}'::jsonb;
  else
    -- صاحب الحلال: بانتظار موافقة المدير، وبصلاحيات كاملة على حلاله الخاص
    atype    := 'owner';
    v_active := false;
    v_perms  := '{"animals":{"view":true,"add":true,"edit":true,"delete":true},
                  "breeding":{"view":true,"add":true,"edit":true,"delete":true},
                  "vaccines":{"view":true,"add":true,"edit":true,"delete":true},
                  "treatments":{"view":true,"add":true,"edit":true,"delete":true},
                  "forum":{"view":true,"add":true,"edit":true,"delete":true},
                  "backup":{"view":true}}'::jsonb;
  end if;

  insert into public.mrahi_members (user_id, full_name, username, phone, role, is_active, account_type, perms)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', ''),
          nullif(new.raw_user_meta_data->>'username', ''),
          nullif(new.raw_user_meta_data->>'phone', ''),
          'member', v_active, atype, v_perms)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- 3) دالة الملكية: صاحب الصف نفسه أو المدير
create or replace function public.mrahi_owns(p_owner uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select p_owner = auth.uid() or public.mrahi_is_admin();
$$;

-- 4) عمود المالك على سجلّات الحلال + فهارس
--    (الجداول فارغة حالياً، فإضافة NOT NULL آمنة)
alter table public.mrahi_animals      add column if not exists owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table public.mrahi_matings      add column if not exists owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table public.mrahi_pregnancies  add column if not exists owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table public.mrahi_births       add column if not exists owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table public.mrahi_vaccinations add column if not exists owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table public.mrahi_treatments   add column if not exists owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade;

create index if not exists mrahi_animals_owner_idx      on public.mrahi_animals(owner_id);
create index if not exists mrahi_matings_owner_idx      on public.mrahi_matings(owner_id);
create index if not exists mrahi_pregnancies_owner_idx  on public.mrahi_pregnancies(owner_id);
create index if not exists mrahi_births_owner_idx       on public.mrahi_births(owner_id);
create index if not exists mrahi_vaccinations_owner_idx on public.mrahi_vaccinations(owner_id);
create index if not exists mrahi_treatments_owner_idx   on public.mrahi_treatments(owner_id);

-- 5) إعادة كتابة السياسات بعزل المالك (الصلاحية + الملكية)
--    الحلال
drop policy if exists animals_sel on public.mrahi_animals;
create policy animals_sel on public.mrahi_animals for select using (public.mrahi_can('animals','view') and public.mrahi_owns(owner_id));
drop policy if exists animals_ins on public.mrahi_animals;
create policy animals_ins on public.mrahi_animals for insert with check (public.mrahi_can('animals','add') and (owner_id = auth.uid() or public.mrahi_is_admin()));
drop policy if exists animals_upd on public.mrahi_animals;
create policy animals_upd on public.mrahi_animals for update using (public.mrahi_can('animals','edit') and public.mrahi_owns(owner_id)) with check (public.mrahi_can('animals','edit') and public.mrahi_owns(owner_id));
drop policy if exists animals_del on public.mrahi_animals;
create policy animals_del on public.mrahi_animals for delete using (public.mrahi_can('animals','delete') and public.mrahi_owns(owner_id));

--    التلقيح
drop policy if exists matings_sel on public.mrahi_matings;
create policy matings_sel on public.mrahi_matings for select using (public.mrahi_can('breeding','view') and public.mrahi_owns(owner_id));
drop policy if exists matings_ins on public.mrahi_matings;
create policy matings_ins on public.mrahi_matings for insert with check (public.mrahi_can('breeding','add') and (owner_id = auth.uid() or public.mrahi_is_admin()));
drop policy if exists matings_upd on public.mrahi_matings;
create policy matings_upd on public.mrahi_matings for update using (public.mrahi_can('breeding','edit') and public.mrahi_owns(owner_id)) with check (public.mrahi_can('breeding','edit') and public.mrahi_owns(owner_id));
drop policy if exists matings_del on public.mrahi_matings;
create policy matings_del on public.mrahi_matings for delete using (public.mrahi_can('breeding','delete') and public.mrahi_owns(owner_id));

--    الحمل
drop policy if exists preg_sel on public.mrahi_pregnancies;
create policy preg_sel on public.mrahi_pregnancies for select using (public.mrahi_can('breeding','view') and public.mrahi_owns(owner_id));
drop policy if exists preg_ins on public.mrahi_pregnancies;
create policy preg_ins on public.mrahi_pregnancies for insert with check (public.mrahi_can('breeding','add') and (owner_id = auth.uid() or public.mrahi_is_admin()));
drop policy if exists preg_upd on public.mrahi_pregnancies;
create policy preg_upd on public.mrahi_pregnancies for update using (public.mrahi_can('breeding','edit') and public.mrahi_owns(owner_id)) with check (public.mrahi_can('breeding','edit') and public.mrahi_owns(owner_id));
drop policy if exists preg_del on public.mrahi_pregnancies;
create policy preg_del on public.mrahi_pregnancies for delete using (public.mrahi_can('breeding','delete') and public.mrahi_owns(owner_id));

--    الولادات
drop policy if exists births_sel on public.mrahi_births;
create policy births_sel on public.mrahi_births for select using (public.mrahi_can('breeding','view') and public.mrahi_owns(owner_id));
drop policy if exists births_ins on public.mrahi_births;
create policy births_ins on public.mrahi_births for insert with check (public.mrahi_can('breeding','add') and (owner_id = auth.uid() or public.mrahi_is_admin()));
drop policy if exists births_upd on public.mrahi_births;
create policy births_upd on public.mrahi_births for update using (public.mrahi_can('breeding','edit') and public.mrahi_owns(owner_id)) with check (public.mrahi_can('breeding','edit') and public.mrahi_owns(owner_id));
drop policy if exists births_del on public.mrahi_births;
create policy births_del on public.mrahi_births for delete using (public.mrahi_can('breeding','delete') and public.mrahi_owns(owner_id));

--    التطعيمات (السجلّات؛ أنواع التطعيمات تبقى مرجعاً مشتركاً)
drop policy if exists vac_sel on public.mrahi_vaccinations;
create policy vac_sel on public.mrahi_vaccinations for select using (public.mrahi_can('vaccines','view') and public.mrahi_owns(owner_id));
drop policy if exists vac_ins on public.mrahi_vaccinations;
create policy vac_ins on public.mrahi_vaccinations for insert with check (public.mrahi_can('vaccines','add') and (owner_id = auth.uid() or public.mrahi_is_admin()));
drop policy if exists vac_upd on public.mrahi_vaccinations;
create policy vac_upd on public.mrahi_vaccinations for update using (public.mrahi_can('vaccines','edit') and public.mrahi_owns(owner_id)) with check (public.mrahi_can('vaccines','edit') and public.mrahi_owns(owner_id));
drop policy if exists vac_del on public.mrahi_vaccinations;
create policy vac_del on public.mrahi_vaccinations for delete using (public.mrahi_can('vaccines','delete') and public.mrahi_owns(owner_id));

--    العلاجات (السجلّات؛ أنواع العلاج تبقى مرجعاً مشتركاً)
drop policy if exists trt_sel on public.mrahi_treatments;
create policy trt_sel on public.mrahi_treatments for select using (public.mrahi_can('treatments','view') and public.mrahi_owns(owner_id));
drop policy if exists trt_ins on public.mrahi_treatments;
create policy trt_ins on public.mrahi_treatments for insert with check (public.mrahi_can('treatments','add') and (owner_id = auth.uid() or public.mrahi_is_admin()));
drop policy if exists trt_upd on public.mrahi_treatments;
create policy trt_upd on public.mrahi_treatments for update using (public.mrahi_can('treatments','edit') and public.mrahi_owns(owner_id)) with check (public.mrahi_can('treatments','edit') and public.mrahi_owns(owner_id));
drop policy if exists trt_del on public.mrahi_treatments;
create policy trt_del on public.mrahi_treatments for delete using (public.mrahi_can('treatments','delete') and public.mrahi_owns(owner_id));
