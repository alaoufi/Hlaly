-- ============================================================
--  مراح — ردود متداخلة: الرد على مشاركة معيّنة يظهر مباشرة تحتها
--  نفّذه بعد 08_forum_answers.sql. آمن للتكرار.
-- ============================================================

alter table public.mrahi_forum_posts
  add column if not exists parent_id bigint references public.mrahi_forum_posts(id) on delete cascade;

create index if not exists idx_mrahi_forum_posts_parent on public.mrahi_forum_posts(parent_id);
