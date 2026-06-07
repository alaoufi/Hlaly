-- ============================================================
--  مراح — إخفاء/تفعيل قسم فردياً
--  نفّذه بعد 10_forum_settings_moderation.sql. آمن للتكرار.
-- ============================================================

alter table public.mrahi_forum_categories add column if not exists is_hidden boolean not null default false;

-- الأقسام المخفية لا تظهر إلا للمشرفين/المدير
drop policy if exists fcat_sel on public.mrahi_forum_categories;
create policy fcat_sel on public.mrahi_forum_categories for select using (
  (public.mrahi_can('forum','view') or public.mrahi_forum_any_mod())
  and (not is_hidden or public.mrahi_forum_any_mod())
);

-- مواضيع القسم المخفي لا تظهر لغير مشرفه/المدير
drop policy if exists ftop_sel on public.mrahi_forum_topics;
create policy ftop_sel on public.mrahi_forum_topics for select using (
  (public.mrahi_can('forum','view') or public.mrahi_forum_any_mod())
  and (public.mrahi_forum_is_mod(category_id)
       or not exists (select 1 from public.mrahi_forum_categories c where c.id = category_id and c.is_hidden))
);
