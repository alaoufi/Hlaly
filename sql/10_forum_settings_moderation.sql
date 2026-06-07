-- ============================================================
--  مراح — حزمة إعدادات وإشراف المنتدى: حظر الأعضاء + إخفاء المشاركات
--  (التفعيل/التعطيل ووضع إنشاء المواضيع يُخزَّنان في mrahi_settings)
--  نفّذه بعد 09_forum_threaded.sql. آمن للتكرار.
-- ============================================================

-- 1) حظر أعضاء من المنتدى
create table if not exists public.mrahi_forum_bans (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  reason     text default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.mrahi_forum_bans enable row level security;

create or replace function public.mrahi_forum_is_banned() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.mrahi_forum_bans b where b.user_id = auth.uid());
$$;

drop policy if exists fban_sel on public.mrahi_forum_bans;
create policy fban_sel on public.mrahi_forum_bans for select using (user_id = auth.uid() or public.mrahi_forum_any_mod());
drop policy if exists fban_ins on public.mrahi_forum_bans;
create policy fban_ins on public.mrahi_forum_bans for insert with check (public.mrahi_is_admin());
drop policy if exists fban_del on public.mrahi_forum_bans;
create policy fban_del on public.mrahi_forum_bans for delete using (public.mrahi_is_admin());

-- 2) إخفاء مشاركة (بديل ناعم للحذف)
alter table public.mrahi_forum_posts add column if not exists is_hidden boolean not null default false;

-- حارس: فقط مشرف القسم (أو المدير) يغيّر is_answer / is_hidden
create or replace function public.mrahi_forum_answer_guard() returns trigger
  language plpgsql security definer set search_path = public as $$
declare cat bigint;
begin
  if (tg_op = 'INSERT' and (new.is_answer or new.is_hidden))
     or (tg_op = 'UPDATE' and (new.is_answer is distinct from old.is_answer or new.is_hidden is distinct from old.is_hidden)) then
    select category_id into cat from public.mrahi_forum_topics where id = new.topic_id;
    if not public.mrahi_forum_is_mod(cat) then
      new.is_answer := coalesce(old.is_answer, false);
      new.is_hidden := coalesce(old.is_hidden, false);
    end if;
  end if;
  return new;
end;
$$;

-- 3) منع المحظور من النشر/الإعجاب
drop policy if exists ftop_ins on public.mrahi_forum_topics;
create policy ftop_ins on public.mrahi_forum_topics for insert with check (
  (public.mrahi_can('forum','add') or public.mrahi_forum_is_mod(category_id)) and author_id = auth.uid()
  and not public.mrahi_forum_is_banned()
);
drop policy if exists fpost_ins on public.mrahi_forum_posts;
create policy fpost_ins on public.mrahi_forum_posts for insert with check (
  (public.mrahi_can('forum','add') or public.mrahi_forum_is_mod((select category_id from public.mrahi_forum_topics t where t.id = topic_id)))
  and author_id = auth.uid()
  and not public.mrahi_forum_is_banned()
  and (public.mrahi_forum_is_mod((select category_id from public.mrahi_forum_topics t where t.id = topic_id))
       or not exists (select 1 from public.mrahi_forum_topics t where t.id = topic_id and t.is_locked))
);
drop policy if exists flike_ins on public.mrahi_forum_likes;
create policy flike_ins on public.mrahi_forum_likes for insert with check (
  (public.mrahi_can('forum','view') or public.mrahi_forum_any_mod()) and user_id = auth.uid()
  and not public.mrahi_forum_is_banned()
);

-- 4) إخفاء المشاركات المخفية عن غير المشرف وغير صاحبها
drop policy if exists fpost_sel on public.mrahi_forum_posts;
create policy fpost_sel on public.mrahi_forum_posts for select using (
  (public.mrahi_can('forum','view') or public.mrahi_forum_any_mod())
  and (not is_hidden or author_id = auth.uid()
       or public.mrahi_forum_is_mod((select category_id from public.mrahi_forum_topics t where t.id = topic_id)))
);
