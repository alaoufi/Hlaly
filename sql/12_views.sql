-- ============================================================
--  مراح — عدّادات المشاهدات: مشاهدات مواضيع المنتدى + زيارات الموقع
--  نفّذه بعد 11_forum_category_hide.sql. آمن للتكرار.
-- ============================================================

-- 1) مشاهدات مواضيع المنتدى -----------------------------------
alter table public.mrahi_forum_topics
  add column if not exists view_count bigint not null default 0;

-- زيادة عدّاد مشاهدات موضوع (يتجاوز RLS عبر security definer حتى يحتسب
-- لكل عضو يملك صلاحية العرض، دون أن يملك صلاحية تعديل الموضوع).
-- لا يلمس updated_at/last_activity فلا يتأثر مؤشّر «(مُعدّل)» ولا الترتيب.
create or replace function public.mrahi_forum_topic_view(p_topic_id bigint)
  returns bigint language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  if not (public.mrahi_can('forum','view') or public.mrahi_forum_any_mod()) then
    return null;
  end if;
  update public.mrahi_forum_topics
     set view_count = view_count + 1
   where id = p_topic_id
   returning view_count into v;
  return v;
end;
$$;
grant execute on function public.mrahi_forum_topic_view(bigint) to authenticated;

-- 2) عدّادات عامة (زيارات الموقع) ------------------------------
create table if not exists public.mrahi_counters (
  key        text primary key,
  value      bigint not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.mrahi_counters enable row level security;

-- القراءة متاحة لكل عضو مسجّل الدخول (لعرض الرقم في الرئيسية)
drop policy if exists mcnt_sel on public.mrahi_counters;
create policy mcnt_sel on public.mrahi_counters for select using (auth.uid() is not null);
-- لا سياسات كتابة: التحديث يتم حصراً عبر الدالة أدناه (security definer)

-- زيادة عدّاد زيارات الموقع وإرجاع القيمة الجديدة (مرة لكل دخول/جلسة)
create or replace function public.mrahi_site_visit()
  returns bigint language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  if auth.uid() is null then return null; end if;
  insert into public.mrahi_counters(key, value, updated_at)
       values ('site_visits', 1, now())
  on conflict (key) do update
       set value = public.mrahi_counters.value + 1, updated_at = now()
   returning value into v;
  return v;
end;
$$;
grant execute on function public.mrahi_site_visit() to authenticated;
