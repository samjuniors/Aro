const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

// Canonical Aro SVG logo definition with userSpaceOnUse gradient
const aroSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#6EE7B7"/>
      <stop offset="55%" stop-color="#10B981"/>
      <stop offset="100%" stop-color="#0D9488"/>
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="30" height="30" rx="8" fill="#101214"/>
  <rect x="1" y="1" width="30" height="30" rx="8" fill="none" stroke="#27272a" stroke-width="1"/>
  <path d="M16 7.2 L24 25" stroke="url(#g)" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M16 7.2 L8 25" stroke="url(#g)" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M11.6 19.6 L20.4 19.6" stroke="url(#g)" stroke-width="2.2" stroke-linecap="round"/>
</svg>`;

function buildIco(entries) {
  // entries: array of { width, height, buffer }
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(entries.length, 4);

  let offset = 6 + entries.length * 16;
  const dirs = [];
  for (const entry of entries) {
    const dir = Buffer.alloc(16);
    dir.writeUInt8(entry.width >= 256 ? 0 : entry.width, 0);
    dir.writeUInt8(entry.height >= 256 ? 0 : entry.height, 1);
    dir.writeUInt8(0, 2); // color palette count
    dir.writeUInt8(0, 3); // reserved
    dir.writeUInt16LE(1, 4); // color planes
    dir.writeUInt16LE(32, 6); // bits per pixel
    dir.writeUInt32LE(entry.buffer.length, 8); // image size
    dir.writeUInt32LE(offset, 12); // image offset
    dirs.push(dir);
    offset += entry.buffer.length;
  }

  return Buffer.concat([header, ...dirs, ...entries.map(e => e.buffer)]);
}

function buildIcns(entries) {
  // Map standard ICNS type codes to sizes
  const sizeMap = {
    16: ['icp4'],
    32: ['icp5', 'ic11'],
    64: ['icp6', 'ic12'],
    128: ['ic07'],
    256: ['ic08', 'ic13'],
    512: ['ic09', 'ic14'],
    1024: ['ic10']
  };

  const chunks = [];
  let totalLength = 8;

  for (const entry of entries) {
    const types = sizeMap[entry.width] || [];
    for (const type of types) {
      const typeBuf = Buffer.from(type, 'ascii');
      const chunkLen = 8 + entry.buffer.length;
      const lenBuf = Buffer.alloc(4);
      lenBuf.writeUInt32BE(chunkLen, 0);
      chunks.push(typeBuf, lenBuf, entry.buffer);
      totalLength += chunkLen;
    }
  }

  const header = Buffer.alloc(8);
  header.write('icns', 0, 4, 'ascii');
  header.writeUInt32BE(totalLength, 4);

  return Buffer.concat([header, ...chunks]);
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1024,
    height: 1024,
    show: false,
    frame: false,
    webPreferences: {
      backgroundThrottling: false
    }
  });

  const html = `<!DOCTYPE html><html><head><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent;width:1024px;height:1024px;}svg{display:block;width:1024px;height:1024px;}</style></head><body>${aroSvg}</body></html>`;
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

  // Helper to render square icon at any dimension
  async function renderPng(size) {
    const dataUrl = await win.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = ${size};
        canvas.height = ${size};
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, ${size}, ${size});
          resolve(canvas.toDataURL('image/png'));
        };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(\`${aroSvg}\`);
      });
    `);
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    return Buffer.from(base64, 'base64');
  }

  // Helper to render wide centered tile
  async function renderWidePng(w, h, tileSize) {
    const dataUrl = await win.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = ${w};
        canvas.height = ${h};
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
          const x = Math.floor((${w} - ${tileSize}) / 2);
          const y = Math.floor((${h} - ${tileSize}) / 2);
          ctx.drawImage(img, x, y, ${tileSize}, ${tileSize});
          resolve(canvas.toDataURL('image/png'));
        };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(\`${aroSvg}\`);
      });
    `);
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    return Buffer.from(base64, 'base64');
  }

  console.log('[generator] Rendering standard icon sizes...');
  const cache = new Map();
  async function getPng(size) {
    if (!cache.has(size)) {
      cache.set(size, await renderPng(size));
    }
    return cache.get(size);
  }

  function write(relPath, buffer) {
    const full = path.join(repoRoot, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, buffer);
    console.log('  Wrote:', relPath, `(${buffer.length} bytes)`);
  }

  // 1. Primary Desktop Assets
  const png1024 = await getPng(1024);
  const png256 = await getPng(256);
  const png180 = await getPng(180);
  const png128 = await getPng(128);
  const png64 = await getPng(64);
  const png48 = await getPng(48);
  const png32 = await getPng(32);
  const png24 = await getPng(24);
  const png16 = await getPng(16);

  write('apps/desktop/assets/icon.png', png1024);
  write('apps/desktop/assets/icon-dark.png', png1024);
  write('apps/desktop/assets/icon-mac.png', png1024);

  // Desktop ICO & ICNS
  const desktopIcoEntries = [
    { width: 16, height: 16, buffer: png16 },
    { width: 24, height: 24, buffer: png24 },
    { width: 32, height: 32, buffer: png32 },
    { width: 48, height: 48, buffer: png48 },
    { width: 64, height: 64, buffer: png64 },
    { width: 128, height: 128, buffer: png128 },
    { width: 256, height: 256, buffer: png256 },
  ];
  const desktopIco = buildIco(desktopIcoEntries);
  write('apps/desktop/assets/icon.ico', desktopIco);
  write('apps/desktop/assets/icon-dark.ico', desktopIco);

  const desktopIcnsEntries = [
    { width: 16, height: 16, buffer: png16 },
    { width: 32, height: 32, buffer: png32 },
    { width: 64, height: 64, buffer: png64 },
    { width: 128, height: 128, buffer: png128 },
    { width: 256, height: 256, buffer: png256 },
    { width: 512, height: 512, buffer: await getPng(512) },
    { width: 1024, height: 1024, buffer: png1024 },
  ];
  const desktopIcns = buildIcns(desktopIcnsEntries);
  write('apps/desktop/assets/icon.icns', desktopIcns);
  write('apps/desktop/assets/icon-dark.icns', desktopIcns);

  // 2. Public web & touch icons in apps/desktop/public
  write('apps/desktop/public/apple-touch-icon.png', png1024);
  write('apps/desktop/public/nous-girl.png', png256);
  write('apps/desktop/public/nous-girl-dark.png', png256);
  write('apps/desktop/public/hermes.png', png1024);
  write('apps/desktop/public/aro-icon.svg', Buffer.from(aroSvg, 'utf-8'));
  write('apps/desktop/public/favicon.svg', Buffer.from(aroSvg, 'utf-8'));

  // 3. AppX Windows store/installer assets in apps/desktop/assets/appx
  const appxScales = [
    { scale: 100, s44: 44, s150: 150, store: 50, wideW: 310, wideH: 150, wideTile: 100 },
    { scale: 125, s44: 55, s150: 188, store: 63, wideW: 388, wideH: 188, wideTile: 125 },
    { scale: 150, s44: 66, s150: 225, store: 75, wideW: 465, wideH: 225, wideTile: 150 },
    { scale: 200, s44: 88, s150: 300, store: 100, wideW: 620, wideH: 300, wideTile: 200 },
    { scale: 400, s44: 176, s150: 600, store: 200, wideW: 1240, wideH: 600, wideTile: 400 }
  ];

  for (const s of appxScales) {
    const qual = s.scale === 100 ? '' : `.scale-${s.scale}`;
    write(`apps/desktop/assets/appx/Square44x44Logo${qual}.png`, await getPng(s.s44));
    write(`apps/desktop/assets/appx/Square150x150Logo${qual}.png`, await getPng(s.s150));
    write(`apps/desktop/assets/appx/StoreLogo${qual}.png`, await getPng(s.store));
    write(`apps/desktop/assets/appx/Wide310x150Logo${qual}.png`, await renderWidePng(s.wideW, s.wideH, s.wideTile));
  }

  const targetSizes = [16, 20, 24, 30, 32, 36, 40, 48, 60, 64, 72, 80, 96, 256];
  for (const size of targetSizes) {
    const targetPng = await getPng(size);
    write(`apps/desktop/assets/appx/Square44x44Logo.targetsize-${size}.png`, targetPng);
    write(`apps/desktop/assets/appx/Square44x44Logo.targetsize-${size}_altform-unplated.png`, targetPng);
    write(`apps/desktop/assets/appx/Square44x44Logo.targetsize-${size}_altform-lightunplated.png`, targetPng);
  }

  // 4. Web & Website Assets
  const webIco = buildIco([
    { width: 16, height: 16, buffer: png16 },
    { width: 32, height: 32, buffer: png32 },
    { width: 48, height: 48, buffer: png48 },
  ]);

  write('web/public/favicon.ico', webIco);
  write('web/public/favicon.svg', Buffer.from(aroSvg, 'utf-8'));
  write('web/public/aro-icon.svg', Buffer.from(aroSvg, 'utf-8'));

  write('website/static/img/favicon.ico', webIco);
  write('website/static/img/favicon-16x16.png', png16);
  write('website/static/img/favicon-32x32.png', png32);
  write('website/static/img/apple-touch-icon.png', png180);
  write('website/static/img/favicon.svg', Buffer.from(aroSvg, 'utf-8'));
  write('website/static/img/logo.png', png1024);
  write('website/static/img/logo-dark.png', png1024);
  write('website/static/img/nous-logo.png', await getPng(150));
  write('website/static/img/nous-logo-dark.png', await getPng(150));

  // 5. Bootstrap Installer
  write('apps/bootstrap-installer/public/nous-girl.png', png256);
  write('apps/bootstrap-installer/src-tauri/icons/32x32.png', png32);
  write('apps/bootstrap-installer/src-tauri/icons/128x128.png', png128);
  write('apps/bootstrap-installer/src-tauri/icons/128x128@2x.png', png256);
  write('apps/bootstrap-installer/src-tauri/icons/icon.ico', buildIco([
    { width: 16, height: 16, buffer: png16 },
    { width: 32, height: 32, buffer: png32 },
    { width: 64, height: 64, buffer: png64 },
    { width: 128, height: 128, buffer: png128 },
    { width: 256, height: 256, buffer: png256 },
  ]));
  write('apps/bootstrap-installer/src-tauri/icons/icon.icns', desktopIcns);

  // 6. Master SVGs in repo assets
  write('assets/icon-master.svg', Buffer.from(aroSvg, 'utf-8'));
  write('assets/icon-master-dark.svg', Buffer.from(aroSvg, 'utf-8'));
  write('prototype/public/aro-icon.svg', Buffer.from(aroSvg, 'utf-8'));

  console.log('[generator] All Aro icons and pictures successfully replaced!');
  app.quit();
});
