-- ============================================================
--  مراح — مشرفو الأقسام: لكل قسم مشرفون، لكل مشرف تعريف (بيطري، مربي…)
--  المشرف يُشرف داخل قسمه فقط (تثبيت/إغلاق/حذف/تعديل أي محتوى)، والمدير فوق الجميع.
--  نفّذه بعد 06_forum.sql. آمن للتكرار.
-- ============================================================

create table if not exists public.mrahi_forum_moderators (
  id          bigint generated always as identity primary key,
  category_id bigint not null references public.mrahi_forum_categories(id) on delete cascade,
  user_id     uuid   not null references auth.users(id) on delete cascade,
  title       text default '',
  created_at  timestamptz not null default now(),
  created_by  uuid default auth.uid(),
  unique (category_id, user_id)
);
alter table public.mrahi_forum_moderators enable row level security;

-- مشرف (أو مدير) لقسم معيّن
create or replace function public.mrahi_forum_is_mod(cat bigint) returns boolean
  language sql stable security definer set search_path = public as $$
  select public.mrahi_is_admin() or exists (
    select 1 from public.mrahi_forum_moderators m
    where m.user_id = auth.uid() and m.category_id = cat
  );
$$;
-- مشرف على أي قسم (أو مدير) — يمنح القراءة/المشاركة في المنتدى
create or replace function public.mrahi_forum_any_mod() returns boolean
  language sql stable security definer set search_path = public as $$
  select public.mrahi_is_admin() or exists (
    select 1 from public.mrahi_forum_moderators m where m.user_id = auth.uid()
  );
$$;

-- سياسات جدول المشرفين: القراءة لمن يرى المنتدى، والإدارة للمدير
drop policy if exists fmod_sel on public.mrahi_forum_moderators;
create policy fmod_sel on public.mrahi_forum_moderators for select using (public.mrahi_can('forum','view') or public.mrahi_forum_any_mod());
drop policy if exists fmod_ins on public.mrahi_forum_moderators;
create policy fmod_ins on public.mrahi_forum_moderators for insert with check (public.mrahi_is_admin());
drop policy if exists fmod_upd on public.mrahi_forum_moderators;
create policy fmod_upd on public.mrahi_forum_moderators for update using (public.mrahi_is_admin()) with check (public.mrahi_is_admin());
drop policy if exists fmod_del on public.mrahi_forum_moderators;
create policy fmod_del on public.mrahi_forum_moderators for delete using (public.mrahi_is_admin());

-- تحديث حارس التثبيت/الإغلاق: يسمح لمشرف القسم أيضاً (وليس المدير فقط)
create or replace function public.mrahi_forum_topic_guard() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if not public.mrahi_forum_is_mod(coalesce(old.category_id, new.category_id)) then
    new.is_pinned := old.is_pinned;
    new.is_locked := old.is_locked;
  end if;
  return new;
end;
$$;

-- ===== تحديث سياسات المنتدى لتشمل مشرفي الأقسام =====
-- الأقسام
drop policy if exists fcat_sel on public.mrahi_forum_categories;
create policy fcat_sel on public.mrahi_forum_categories for select using (public.mrahi_can('forum','view') or public.mrahi_forum_any_mod());

-- المواضيع
drop policy if exists ftop_sel on public.mrahi_forum_topics;
create policy ftop_sel on public.mrahi_forum_topics for select using (public.mrahi_can('forum','view') or public.mrahi_forum_any_mod());
drop policy if exists ftop_ins on public.mrahi_forum_topics;
create policy ftop_ins on public.mrahi_forum_topics for insert with check ((public.mrahi_can('forum','add') or public.mrahi_forum_is_mod(category_id)) and author_id = auth.uid());
drop policy if exists ftop_upd on public.mrahi_forum_topics;
create policy ftop_upd on public.mrahi_forum_topics for update
  using ((author_id = auth.uid() and public.mrahi_can('forum','edit')) or public.mrahi_forum_is_mod(category_id))
  with check ((author_id = auth.uid() and public.mrahi_can('forum','edit')) or public.mrahi_forum_is_mod(category_id));
drop policy if exists ftop_del on public.mrahi_forum_topics;
create policy ftop_del on public.mrahi_forum_topics for delete
  using ((author_id = auth.uid() and public.mrahi_can('forum','delete')) or public.mrahi_forum_is_mod(category_id));

-- الردود
drop policy if exists fpost_sel on public.mrahi_forum_posts;
create policy fpost_sel on public.mrahi_forum_posts for select using (public.mrahi_can('forum','view') or public.mrahi_forum_any_mod());
drop policy if exists fpost_ins on public.mrahi_forum_posts;
create policy fpost_ins on public.mrahi_forum_posts for insert with check (
  (public.mrahi_can('forum','add') or public.mrahi_forum_is_mod((select category_id from public.mrahi_forum_topics t where t.id = topic_id)))
  and author_id = auth.uid()
  and (public.mrahi_forum_is_mod((select category_id from public.mrahi_forum_topics t where t.id = topic_id))
       or not exists (select 1 from public.mrahi_forum_topics t where t.id = topic_id and t.is_locked))
);
drop policy if exists fpost_upd on public.mrahi_forum_posts;
create policy fpost_upd on public.mrahi_forum_posts for update
  using ((author_id = auth.uid() and public.mrahi_can('forum','edit')) or public.mrahi_forum_is_mod((select category_id from public.mrahi_forum_topics t where t.id = topic_id)))
  with check ((author_id = auth.uid() and public.mrahi_can('forum','edit')) or public.mrahi_forum_is_mod((select category_id from public.mrahi_forum_topics t where t.id = topic_id)));
drop policy if exists fpost_del on public.mrahi_forum_posts;
create policy fpost_del on public.mrahi_forum_posts for delete
  using ((author_id = auth.uid() and public.mrahi_can('forum','delete')) or public.mrahi_forum_is_mod((select category_id from public.mrahi_forum_topics t where t.id = topic_id)));

-- الإعجابات
drop policy if exists flike_sel on public.mrahi_forum_likes;
create policy flike_sel on public.mrahi_forum_likes for select using (public.mrahi_can('forum','view') or public.mrahi_forum_any_mod());
drop policy if exists flike_ins on public.mrahi_forum_likes;
create policy flike_ins on public.mrahi_forum_likes for insert with check ((public.mrahi_can('forum','view') or public.mrahi_forum_any_mod()) and user_id = auth.uid());
