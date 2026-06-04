-- ترقية جدول أنواع التطعيمات: إضافة الحقول الناقصة
-- شغّل هذا الملف مرة واحدة في Supabase ▸ SQL Editor.
-- آمن للتكرار (IF NOT EXISTS) ولا يؤثر على البيانات الموجودة.

alter table public.mrahi_vaccine_types add column if not exists usage                text default '';   -- الاستخدام
alter table public.mrahi_vaccine_types add column if not exists dose                 text default '';   -- الجرعة
alter table public.mrahi_vaccine_types add column if not exists recommended_age      text default '';   -- العمر الموصى به
alter table public.mrahi_vaccine_types add column if not exists validity_days        int  default 0;    -- مدة الفاعلية (أيام)
alter table public.mrahi_vaccine_types add column if not exists milk_withdrawal_days int  default 0;    -- مدة التحريم للحليب
alter table public.mrahi_vaccine_types add column if not exists meat_withdrawal_days int  default 0;    -- مدة التحريم للحوم

-- نقل قيمة التحريم القديمة (إن وُجدت) إلى عمودي الحليب واللحم لمرة واحدة
update public.mrahi_vaccine_types
   set milk_withdrawal_days = withdrawal_days,
       meat_withdrawal_days = withdrawal_days
 where coalesce(withdrawal_days,0) > 0
   and coalesce(milk_withdrawal_days,0) = 0
   and coalesce(meat_withdrawal_days,0) = 0;
