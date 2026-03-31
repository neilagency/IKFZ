import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');

// Create a simple "iK" favicon SVG (matching the site's green brand icon)
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#37bc46"/>
  <text x="256" y="340" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="280" fill="white" text-anchor="middle" dominant-baseline="central" letter-spacing="-10">iK</text>
</svg>`;

const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

async function generate() {
  const svgBuffer = Buffer.from(faviconSvg);

  for (const { name, size } of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(publicDir, name));
    console.log(`✅ Generated ${name} (${size}x${size})`);
  }

  // Generate favicon.ico (32x32 PNG renamed — browsers accept PNG as .ico)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));
  console.log('✅ Generated favicon.ico');

  // Also save the SVG version
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), faviconSvg);
  console.log('✅ Generated icon.svg');

  console.log('\n🎉 All favicons generated!');
}

generate().catch(console.error);
