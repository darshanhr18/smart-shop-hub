const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate a valid 1x1 base PNG buffer and write 192 and 512 files
// A minimal 1x1 blue PNG image buffer
const minimalPngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), minimalPngBuffer);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), minimalPngBuffer);

console.log('App icons generated successfully in public/icons/');
