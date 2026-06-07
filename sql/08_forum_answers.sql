-- ============================================================
--  مراح — الإجابة المعتمدة: المشرف/المدير يميّز ردّاً ليظهر مباشرة بعد الموضوع
--  نفّذه بعد 07_forum_moderators.sql. آمن للتكرار.
-- ============================================================

alter table public.mrahi_forum_posts add column if not exists is_answer boolean not null default false;

-- حارس: فقط مشرف القسم (أو المدير) يستطيع تغيير حالة الاعتماد
create or replace function public.mrahi_forum_answer_guard() returns trigger
  language plpgsql security definer set search_path = public as $$
declare cat bigint;
begin
  if (tg_op = 'INSERT' and new.is_answer) or (tg_op = 'UPDATE' and new.is_answer is distinct from old.is_answer) then
    select category_id into cat from public.mrahi_forum_topics where id = new.topic_id;
    if not public.mrahi_forum_is_mod(cat) then
      new.is_answer := coalesce(old.is_answer, false);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_forum_answer_guard on public.mrahi_forum_posts;
create trigger trg_forum_answer_guard before insert or update on public.mrahi_forum_posts
  for each row execute function public.mrahi_forum_answer_guard();
