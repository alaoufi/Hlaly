-- ============================================================
--  مراح — منتدى النقاش: أقسام + مواضيع + ردود + إعجابات
--  كل الأعضاء المفعّلين يقرؤون وينشرون. المدير يدير الأقسام ويشرف.
--  نفّذه مرة واحدة في: Supabase ▸ SQL Editor. آمن للتكرار.
-- ============================================================

-- 1) الجداول
create table if not exists public.mrahi_forum_categories (
  id          bigint generated always as identity primary key,
  name        text not null,
  description text default '',
  icon        text default '💬',
  sort        int default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid default auth.uid()
);

create table if not exists public.mrahi_forum_topics (
  id            bigint generated always as identity primary key,
  category_id   bigint references public.mrahi_forum_categories(id) on delete set null,
  title         text not null,
  body          text not null default '',
  author_id     uuid default auth.uid() references auth.users(id) on delete set null,
  author_name   text default '',
  is_pinned     boolean not null default false,
  is_locked     boolean not null default false,
  reply_count   int not null default 0,
  last_activity timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists mrahi_forum_topics_cat_idx on public.mrahi_forum_topics(category_id, is_pinned desc, last_activity desc);

create table if not exists public.mrahi_forum_posts (
  id          bigint generated always as identity primary key,
  topic_id    bigint not null references public.mrahi_forum_topics(id) on delete cascade,
  body        text not null default '',
  author_id   uuid default auth.uid() references auth.users(id) on delete set null,
  author_name text default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists mrahi_forum_posts_topic_idx on public.mrahi_forum_posts(topic_id, created_at);

create table if not exists public.mrahi_forum_likes (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  topic_id   bigint references public.mrahi_forum_topics(id) on delete cascade,
  post_id    bigint references public.mrahi_forum_posts(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists mrahi_forum_like_topic_uq on public.mrahi_forum_likes(user_id, topic_id) where topic_id is not null;
create unique index if not exists mrahi_forum_like_post_uq  on public.mrahi_forum_likes(user_id, post_id)  where post_id  is not null;

-- 2) مزامنة عدّاد الردود وآخر نشاط للموضوع
create or replace function public.mrahi_forum_sync_topic() returns trigger
  language plpgsql security definer set search_path = public as $$
declare tid bigint;
begin
  tid := coalesce(new.topic_id, old.topic_id);
  update public.mrahi_forum_topics t
     set reply_count = (select count(*) from public.mrahi_forum_posts p where p.topic_id = tid),
         last_activity = greatest(t.created_at,
           coalesce((select max(p.created_at) from public.mrahi_forum_posts p where p.topic_id = tid), t.created_at))
   where t.id = tid;
  return null;
end;
$$;
drop trigger if exists mrahi_forum_posts_sync on public.mrahi_forum_posts;
create trigger mrahi_forum_posts_sync
  after insert or delete on public.mrahi_forum_posts
  for each row execute function public.mrahi_forum_sync_topic();

-- 3) حماية أعمدة الإشراف (تثبيت/إغلاق) من غير المدير
create or replace function public.mrahi_forum_topic_guard() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if not public.mrahi_is_admin() then
    new.is_pinned := old.is_pinned;
    new.is_locked := old.is_locked;
  end if;
  return new;
end;
$$;
drop trigger if exists mrahi_forum_topic_guard_tg on public.mrahi_forum_topics;
create trigger mrahi_forum_topic_guard_tg
  before update on public.mrahi_forum_topics
  for each row execute function public.mrahi_forum_topic_guard();

-- 4) تفعيل RLS
alter table public.mrahi_forum_categories enable row level security;
alter table public.mrahi_forum_topics     enable row level security;
alter table public.mrahi_forum_posts      enable row level security;
alter table public.mrahi_forum_likes      enable row level security;

-- 5) السياسات — الأقسام (المدير يديرها، الأعضاء يقرؤون)
drop policy if exists fcat_sel on public.mrahi_forum_categories;
create policy fcat_sel on public.mrahi_forum_categories for select using (public.mrahi_is_member());
drop policy if exists fcat_ins on public.mrahi_forum_categories;
create policy fcat_ins on public.mrahi_forum_categories for insert with check (public.mrahi_is_admin());
drop policy if exists fcat_upd on public.mrahi_forum_categories;
create policy fcat_upd on public.mrahi_forum_categories for update using (public.mrahi_is_admin()) with check (public.mrahi_is_admin());
drop policy if exists fcat_del on public.mrahi_forum_categories;
create policy fcat_del on public.mrahi_forum_categories for delete using (public.mrahi_is_admin());

-- المواضيع
drop policy if exists ftop_sel on public.mrahi_forum_topics;
create policy ftop_sel on public.mrahi_forum_topics for select using (public.mrahi_is_member());
drop policy if exists ftop_ins on public.mrahi_forum_topics;
create policy ftop_ins on public.mrahi_forum_topics for insert with check (public.mrahi_is_member() and author_id = auth.uid());
drop policy if exists ftop_upd on public.mrahi_forum_topics;
create policy ftop_upd on public.mrahi_forum_topics for update using (public.mrahi_is_member() and (author_id = auth.uid() or public.mrahi_is_admin())) with check (public.mrahi_is_member() and (author_id = auth.uid() or public.mrahi_is_admin()));
drop policy if exists ftop_del on public.mrahi_forum_topics;
create policy ftop_del on public.mrahi_forum_topics for delete using (author_id = auth.uid() or public.mrahi_is_admin());

-- الردود (يُمنع الرد على موضوع مُغلق إلا للمدير)
drop policy if exists fpost_sel on public.mrahi_forum_posts;
create policy fpost_sel on public.mrahi_forum_posts for select using (public.mrahi_is_member());
drop policy if exists fpost_ins on public.mrahi_forum_posts;
create policy fpost_ins on public.mrahi_forum_posts for insert with check (
  public.mrahi_is_member() and author_id = auth.uid()
  and (public.mrahi_is_admin() or not exists (select 1 from public.mrahi_forum_topics t where t.id = topic_id and t.is_locked))
);
drop policy if exists fpost_upd on public.mrahi_forum_posts;
create policy fpost_upd on public.mrahi_forum_posts for update using (author_id = auth.uid() or public.mrahi_is_admin()) with check (author_id = auth.uid() or public.mrahi_is_admin());
drop policy if exists fpost_del on public.mrahi_forum_posts;
create policy fpost_del on public.mrahi_forum_posts for delete using (author_id = auth.uid() or public.mrahi_is_admin());

-- الإعجابات (كل عضو يدير إعجاباته فقط)
drop policy if exists flike_sel on public.mrahi_forum_likes;
create policy flike_sel on public.mrahi_forum_likes for select using (public.mrahi_is_member());
drop policy if exists flike_ins on public.mrahi_forum_likes;
create policy flike_ins on public.mrahi_forum_likes for insert with check (public.mrahi_is_member() and user_id = auth.uid());
drop policy if exists flike_del on public.mrahi_forum_likes;
create policy flike_del on public.mrahi_forum_likes for delete using (user_id = auth.uid());

-- 6) أقسام افتراضية (مرة واحدة)
insert into public.mrahi_forum_categories (name, description, icon, sort)
select v.name, v.description, v.icon, v.sort from (values
  ('نقاش عام',          'مواضيع عامة حول تربية الحلال',        '💬', 1),
  ('أمراض وعلاج',       'استشارات حول الأمراض والعلاجات',      '🩺', 2),
  ('تطعيمات ووقاية',    'نقاش حول التطعيمات والوقاية',          '💉', 3),
  ('تغذية وأعلاف',      'الأعلاف والتغذية وأنظمتها',            '🌾', 4),
  ('بيع وشراء',         'إعلانات البيع والشراء بين الأعضاء',    '🏷️', 5),
  ('أسئلة واستشارات',   'اطرح سؤالك على المجتمع',               '❓', 6)
) as v(name, description, icon, sort)
where not exists (select 1 from public.mrahi_forum_categories);

-- 7) التحديث اللحظي (Realtime) للمواضيع والردود
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='mrahi_forum_topics') then
    alter publication supabase_realtime add table public.mrahi_forum_topics;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='mrahi_forum_posts') then
    alter publication supabase_realtime add table public.mrahi_forum_posts;
  end if;
end $$;
