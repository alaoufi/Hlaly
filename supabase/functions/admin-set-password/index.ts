// مراح — دالة حافة: المدير يضبط كلمة مرور مستخدم (رقم سري ٤ أرقام)
// تتطلب توكن مدير مفعّل. تُنشر عبر Supabase Edge Functions (verify_jwt = true).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    // التحقق من هوية المُستدعي عبر التوكن
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    if (!jwt) return json({ error: 'no-auth' }, 401);
    const { data: who, error: werr } = await admin.auth.getUser(jwt);
    if (werr || !who?.user) return json({ error: 'invalid-token' }, 401);

    // التأكد أنّ المُستدعي مدير مفعّل
    const { data: caller } = await admin.from('mrahi_members').select('role,is_active').eq('user_id', who.user.id).maybeSingle();
    if (!caller || caller.role !== 'admin' || !caller.is_active) return json({ error: 'forbidden' }, 403);

    const body = await req.json().catch(() => ({}));
    const target = String(body.target_user_id || '');
    const pin = String(body.pin || '');
    if (!target || !/^\d{4}$/.test(pin)) return json({ error: 'bad-input' }, 400);

    // نفس مخطط كلمة المرور في الواجهة: pin@Mrahi
    const password = `${pin}@Mrahi`;
    const { error } = await admin.auth.admin.updateUserById(target, { password });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
