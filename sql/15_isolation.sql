-- ============================================================
--  مراح — عزل تامّ لمُحفِّزات المصادقة عن أي تطبيق آخر
--  المشكلة: مُحفِّزا auth.users (التأكيد التلقائي + إنشاء العضو) كانا
--  يعملان على كل تسجيل في مشروع Supabase. فلو شارك تطبيقٌ آخر نفس
--  المشروع، لتأثّرت تسجيلاته بمنطق مراح.
--  الحلّ: تحصين الدالتين لتعملا فقط حين يكون التطبيق 'mrahi'
--  (تطبيق مراح يضع app:'mrahi' في بيانات التسجيل). يكفي تعديل جسم
--  الدالتين — المُحفِّزات تبقى كما هي. آمن للتكرار.
-- ============================================================

-- 1) التأكيد التلقائي للبريد: لمراح فقط، ولا يمسّ تطبيقات أخرى
create or replace function public.mrahi_auto_confirm() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.raw_user_meta_data->>'app','') <> 'mrahi' then
    return new;  -- عزل: اترك تسجيلات التطبيقات الأخرى بلا تغيير
  end if;
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;

-- 2) إنشاء صف العضو تلقائياً: لمراح فقط
create or replace function public.mrahi_handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  atype    text;
  v_active boolean;
  v_perms  jsonb;
begin
  if coalesce(new.raw_user_meta_data->>'app','') <> 'mrahi' then
    return new;  -- عزل: لا تُنشئ عضو مراح لتسجيلات تطبيق آخر
  end if;

  atype := lower(coalesce(nullif(new.raw_user_meta_data->>'account_type',''), 'owner'));
  if atype = 'visitor' then
    -- الزائر: دخول فوري + صلاحية المنتدى فقط
    v_active := true;
    v_perms  := '{"forum":{"view":true,"add":true,"edit":true,"delete":true}}'::jsonb;
  else
    -- صاحب الحلال: بانتظار موافقة المدير، بصلاحيات كاملة على حلاله
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
