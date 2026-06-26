// يولّد أيقونات التطبيق من صورة الأيقونة الكاملة (بخلفيتها) عبر sharp، وشاشة البداية من شعار الجمل.
// مصدر الأيقونة: branding/app-photo.png (صورة مربّعة تُستخدم كما هي بخلفيتها).
// مصدر شاشة البداية: branding/camel.png (جمل مقصوص على خلفية خضراء).
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const GREEN = { r: 0x2e, g: 0x7d, b: 0x32, alpha: 1 };
const CAMEL = 'branding/camel.png';      // جمل مقصوص (لشاشة البداية)
const PHOTO = 'branding/app-photo.png';  // صورة الأيقونة الكاملة بخلفيتها
mkdirSync('assets', { recursive: true });

const solid = (size, color) => sharp({ create: { width: size, height: size, channels: 4, background: color } });
const roundedMask = (size, rad) =>
  Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${rad}" ry="${rad}"/></svg>`);
const camel = (inner) =>
  sharp(CAMEL).trim().resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();

// أيقونة من الصورة الكاملة (بخلفيتها) — قصّ مركزي مربّع، مع إمكانية تدوير الحواف
async function photoIcon(size, rounded, file) {
  let img = await sharp(PHOTO).resize(size, size, { fit: 'cover', position: 'center' }).png().toBuffer();
  if (rounded) {
    img = await sharp(img).composite([{ input: roundedMask(size, Math.round(size * 0.22)), blend: 'dest-in' }]).png().toBuffer();
  }
  await sharp(img).toFile(file);
}
const transparent = (size, file) =>
  sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toFile(file);
async function splash(size, file) {
  await solid(size, GREEN).composite([{ input: await camel(Math.round(size * 0.45)), gravity: 'center' }]).png().toFile(file);
}

// أيقونات أندرويد (assets/ ⇐ @capacitor/assets) — الصورة الكاملة بخلفيتها.
// الواجهة شفافة والخلفية هي الصورة، فتظهر الصورة بخلفيتها داخل قالب النظام (تكيّفية)، والأيقونة المربّعة كاملة.
await photoIcon(1024, false, 'assets/icon-only.png');
await photoIcon(1024, false, 'assets/icon-background.png');
await transparent(1024, 'assets/icon-foreground.png');
await splash(2732, 'assets/splash.png');
await splash(2732, 'assets/splash-dark.png');

// أيقونات الويب (PWA) — الصورة الكاملة (180 بحواف دائرية لأبل)
await photoIcon(512, false, 'icon-512.png');
await photoIcon(192, false, 'icon-192.png');
await photoIcon(512, true, 'icon-180.png');

console.log('✓ أيقونات التطبيق جاهزة من branding/app-photo.png (وشاشة البداية من camel.png)');
