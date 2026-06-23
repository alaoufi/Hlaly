// يولّد أيقونات وشاشة بداية أندرويد من شعار مراح (علامة الأذن) عبر sharp.
// المُخرجات في assets/ ليستهلكها @capacitor/assets ويبني أيقونات النظام.
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const GREEN = '#2E7D32';
mkdirSync('assets', { recursive: true });

// الشكل الأبيض (علامة الأذن) مع تفاصيله الخضراء — يُستخدم فوق خلفية شفافة/خضراء
const mark = `
  <circle cx="256" cy="180" r="92" fill="#FFFFFF"/>
  <circle cx="256" cy="180" r="34" fill="${GREEN}"/>
  <rect x="176" y="250" width="160" height="150" rx="28" fill="#FFFFFF"/>
  <rect x="212" y="300" width="88" height="16" rx="8" fill="${GREEN}"/>
  <rect x="212" y="338" width="88" height="16" rx="8" fill="${GREEN}"/>`;

// أيقونة كاملة (مربّع أخضر بحواف دائرية + العلامة) — للأنظمة القديمة
const iconOnly = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="${GREEN}"/>${mark}</svg>`;

// الواجهة (foreground) للأيقونة التكيّفية: العلامة فقط داخل المنطقة الآمنة (~70%)
const foreground = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <g transform="translate(256,256) scale(0.70) translate(-256,-256)">${mark}</g></svg>`;

// الخلفية (background) للأيقونة التكيّفية: لون أخضر صلب
const background = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${GREEN}"/></svg>`;

// شاشة البداية: خلفية خضراء والعلامة في الوسط
const splash = (bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${bg}"/>
  <g transform="translate(512,512) scale(1.4) translate(-256,-256)">${mark}</g></svg>`;

const render = (svg, size, file) => sharp(Buffer.from(svg)).resize(size, size).png().toFile(`assets/${file}`);

await Promise.all([
  render(iconOnly, 1024, 'icon-only.png'),
  render(foreground, 1024, 'icon-foreground.png'),
  render(background, 1024, 'icon-background.png'),
  render(splash(GREEN), 2732, 'splash.png'),
  render(splash(GREEN), 2732, 'splash-dark.png'),
]);
console.log('✓ assets/ (أيقونات + شاشة بداية) جاهزة');
