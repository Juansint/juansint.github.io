/*
 * Genera og-image.png (1200×630) en la raíz del repo: nombre, subtítulo y una
 * composición estática de cubos con la misma paleta y estilo que el hero.
 *
 * Uso (desde la raíz del repo):
 *   npm i --no-save puppeteer-core@23
 *   node scripts/og-image.js
 *
 * Usa el Chrome instalado. Si no está en la ruta por defecto de macOS:
 *   CHROME_PATH="/ruta/a/chrome" node scripts/og-image.js
 */
'use strict';

const path = require('path');
const puppeteer = require('puppeteer-core');

const OUT = path.join(__dirname, '..', 'og-image.png');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const WIDTH = 1200;
const HEIGHT = 630;
const SAFE = 80; // margen de seguridad: LinkedIn y WhatsApp recortan los bordes

// [x, y, tamaño, paleta, ángulo en grados, etiqueta]
const CUBES = [
  [930, 150, 92, 'navy', -14, '{ }'],
  [1060, 250, 64, 'orange', 18, null],
  [820, 280, 58, 'gray', 24, null],
  [985, 345, 108, 'navy', 9, '</>'],
  [1100, 455, 54, 'navy', -22, null],
  [860, 440, 70, 'navy', 32, null],
  [1110, 120, 46, 'gray', -30, null],
  [760, 150, 40, 'navy', 12, null],
  [930, 520, 50, 'orange', -8, '{ }']
];

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; }
  body {
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    position: relative;
    overflow: hidden;
    background: #FAFAF8;
    font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #16191D;
    -webkit-font-smoothing: antialiased;
  }
  canvas { position: absolute; inset: 0; }
  .text {
    position: absolute;
    left: ${SAFE}px;
    top: ${SAFE}px;
    bottom: ${SAFE}px;
    width: 600px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .eyebrow {
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    font-size: 22px;
    color: #5F5E5A;
  }
  .eyebrow::before {
    content: "";
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #C4805F;
  }
  h1 {
    margin: 28px 0 0;
    font-size: 88px;
    line-height: 1.02;
    letter-spacing: -0.035em;
    font-weight: 700;
  }
  .rule {
    width: 56px;
    height: 4px;
    margin-top: 32px;
    border-radius: 2px;
    background: #C4805F;
  }
  p {
    margin: 24px 0 0;
    font-size: 34px;
    line-height: 1.3;
    color: #5F5E5A;
  }
</style>
</head>
<body>
  <canvas width="${WIDTH * 2}" height="${HEIGHT * 2}" style="width:${WIDTH}px;height:${HEIGHT}px"></canvas>
  <div class="text">
    <div class="eyebrow">juansint.github.io</div>
    <h1>Juan Carlos<br>Domínguez</h1>
    <div class="rule"></div>
    <p>Desarrollador web · Madrid</p>
  </div>
<script>
  const PALETTES = {
    navy:   { front: '#1E3A5F', side: '#12263F', shine: '#4A6B8F' },
    orange: { front: '#C4805F', side: '#8C5A43', shine: '#E2B39C' },
    gray:   { front: '#888780', side: '#5F5E5A', shine: '#B4B2A9' }
  };
  const cubes = ${JSON.stringify(CUBES)};
  const canvas = document.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);

  function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Mismo dibujo que js/hero-cubes.js: lateral desplazado, frontal y franja superior clara
  for (const [x, y, s, kind, deg, label] of cubes) {
    const p = PALETTES[kind];
    const half = s / 2;
    const depth = Math.max(4, s * 0.14);
    const radius = Math.max(6, s * 0.11);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(deg * Math.PI / 180);
    ctx.fillStyle = p.side;
    roundedRect(-half + depth, -half + depth, s, s, radius);
    ctx.fill();
    ctx.fillStyle = p.front;
    roundedRect(-half, -half, s, s, radius);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = p.shine;
    ctx.fillRect(-half, -half, s, s * 0.3);
    ctx.restore();
    if (label) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '600 ' + Math.round(s * 0.3) + 'px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, s * 0.04);
    }
    ctx.restore();
  }
</script>
</body>
</html>`;

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: OUT, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
  await browser.close();
  console.log('Generada ' + path.relative(process.cwd(), OUT));
})();
