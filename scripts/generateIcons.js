// PWAアイコン生成スクリプト
// canvasパッケージを使わずにSVGを生成して、それを使う方法
const fs = require('fs');
const path = require('path');

// SVGテンプレート
function createSVG(size) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#2563eb"/>
  <text x="50%" y="50%" text-anchor="middle" dy=".35em" fill="white" font-family="Arial, sans-serif" font-size="${size * 0.6}" font-weight="bold">G</text>
</svg>`;
}

// SVGファイルを生成
const publicDir = path.join(process.cwd(), 'public');

// 192x192 SVG
const svg192 = createSVG(192);
fs.writeFileSync(path.join(publicDir, 'icon-192.svg'), svg192);
console.log('✅ icon-192.svg を生成しました');

// 512x512 SVG
const svg512 = createSVG(512);
fs.writeFileSync(path.join(publicDir, 'icon-512.svg'), svg512);
console.log('✅ icon-512.svg を生成しました');

console.log('\n📝 注意: SVGファイルを生成しました。');
console.log('PNG形式が必要な場合は、オンラインツール（https://cloudconvert.com/svg-to-png）で変換してください。');
console.log('\nまたは、manifest.jsonを更新してSVGを直接使用することもできます:');
console.log('- icon-192.svg');
console.log('- icon-512.svg');
