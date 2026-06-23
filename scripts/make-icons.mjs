// يولّد أيقونات وشاشة بداية أندرويد + أيقونات الويب من شعار مراح (صورة جمل) عبر sharp.
// المصدر: branding/camel.png (جمل مقصوص على خلفية شفافة).
// مُخرجات assets/ يستهلكها @capacitor/assets لبناء أيقونات النظام، ومُخرجات الجذر للويب (PWA).
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const GREEN = { r: 0x2e, g: 0x7d, b: 0x32, alpha: 1 };
const CAMEL = 'branding/camel.png';
mkdirSync('assets', { recursive: true });

// الجمل مقصوصاً ومُحجّماً ليملأ مربّعاً داخلياً مع هامش، فوق خلفية شفافة
const camel = (inner) =>
  sharp(CAMEL).trim().resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();

const solid = (size, color) =>
  sharp({ create: { width: size, height: size, channels: 4, background: color } });

const roundedMask = (size, rad) =>
  Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${rad}" ry="${rad}"/></svg>`);

// أيقونة مربّعة (خلفية خضراء + جمل في الوسط) مع إمكانية تدوير الحواف
async function squareIcon(size, inner, rounded, file) {
  let img = await solid(size, GREEN).composite([{ input: await camel(inner), gravity: 'center' }]).png().toBuffer();
  if (rounded) {
    img = await sharp(img).composite([{ input: roundedMask(size, Math.round(size * 0.22)), blend: 'dest-in' }]).png().toBuffer();
  }
  await sharp(img).toFile(file);
}

// واجهة شفافة (للأيقونة التكيّفية): الجمل فقط داخل المنطقة الآمنة
async function transparentIcon(size, inner, file) {
  await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await camel(inner), gravity: 'center' }]).png().toFile(file);
}

async function splash(size, file) {
  await solid(size, GREEN).composite([{ input: await camel(Math.round(size * 0.45)), gravity: 'center' }]).png().toFile(file);
}

// أيقونات أندرويد (assets/ ⇐ @capacitor/assets)
await squareIcon(1024, 760, false, 'assets/icon-only.png');
await transparentIcon(1024, 620, 'assets/icon-foreground.png');
await solid(1024, GREEN).png().toFile('assets/icon-background.png');
await splash(2732, 'assets/splash.png');
await splash(2732, 'assets/splash-dark.png');

// أيقونات الويب (PWA) — تُحفظ في الجذر وتُتابَع في Git
await squareIcon(512, 380, false, 'icon-512.png');   // maskable
await squareIcon(192, 142, false, 'icon-192.png');   // any
await squareIcon(512, 360, true, 'icon-180.png');    // apple-touch (حواف دائرية)

console.log('✓ أيقونات أندرويد + الويب وشاشة البداية جاهزة (من branding/camel.png)');
