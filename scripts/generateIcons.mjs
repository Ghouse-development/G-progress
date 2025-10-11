// PWAアイコン生成スクリプト (ESM)
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SVGテンプレート
function createSVG(size) {
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#2563eb"/>
  <text x="50%" y="50%" text-anchor="middle" dy=".35em" fill="white" font-family="Arial, sans-serif" font-size="${size * 0.6}" font-weight="bold">G</text>
</svg>`);
}

async function generateIcons() {
  console.log('🎨 PWAアイコンを生成しています...\n');

  const publicDir = path.join(process.cwd(), 'public');

  try {
    // 192x192 PNG
    const svg192 = createSVG(192);
    await sharp(svg192)
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'icon-192.png'));
    console.log('✅ icon-192.png を生成しました (192x192)');

    // 512x512 PNG
    const svg512 = createSVG(512);
    await sharp(svg512)
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'icon-512.png'));
    console.log('✅ icon-512.png を生成しました (512x512)');

    console.log('\n🎉 PWAアイコンの生成が完了しました！');
    console.log('📁 生成されたファイル:');
    console.log('   - public/icon-192.png');
    console.log('   - public/icon-512.png');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

generateIcons();
