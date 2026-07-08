const { createCanvas, registerFont, loadImage } = require('canvas');
const fs = require('fs');

const W = 680, H = 240;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

ctx.fillStyle = '#1e1e2e';
ctx.fillRect(0, 0, W, H);

const gradient = ctx.createLinearGradient(0, 0, 0, H);
gradient.addColorStop(0, '#1e1e2e');
gradient.addColorStop(1, '#11111b');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, W, H);

ctx.shadowColor = 'rgba(88, 101, 242, 0.3)';
ctx.shadowBlur = 40;
ctx.fillStyle = '#5865F2';
ctx.beginPath();
ctx.arc(60, 120, 180, 0, Math.PI * 2);
ctx.fill();
ctx.shadowBlur = 0;

const cards = [
  { label: '/setup', color: '#5865F2', icon: '⚙️', x: 20, y: 20 },
  { label: '/status', color: '#3498db', icon: '📊', x: 175, y: 20 },
  { label: '/help', color: '#2ecc71', icon: '❓', x: 330, y: 20 },
  { label: '/logs', color: '#e67e22', icon: '📋', x: 485, y: 20 },
  { label: '/punish', color: '#e74c3c', icon: '🔨', x: 20, y: 90 },
  { label: '/verify', color: '#1abc9c', icon: '✅', x: 175, y: 90 },
  { label: '/whitelist', color: '#9b59b6', icon: '📜', x: 330, y: 90 },
  { label: '/panel', color: '#f39c12', icon: '🖥️', x: 485, y: 90 },
];

for (const card of cards) {
  const cx = card.x, cy = card.y, cw = 140, ch = 58;

  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;

  ctx.fillStyle = '#2a2a3e';
  ctx.beginPath();
  ctx.roundRect(cx, cy, cw, ch, 8);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.fillStyle = card.color;
  ctx.beginPath();
  ctx.roundRect(cx, cy, 4, ch, 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(card.label, cx + cw / 2, cy + ch / 2 + 1);

  ctx.font = '13px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#8888aa';
  ctx.fillText(card.icon, cx + cw - 22, cy + 15);
}

ctx.shadowBlur = 0;
ctx.fillStyle = '#5865F2';
ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
ctx.textAlign = 'left';
ctx.textBaseline = 'bottom';
ctx.fillText('🛡️ Rox Security v1.0', 15, H - 12);

ctx.fillStyle = '#6666aa';
ctx.font = '10px "Segoe UI", Arial, sans-serif';
ctx.textAlign = 'right';
ctx.fillText('/help · Anti-Raid Protection', W - 15, H - 12);

const buffer = canvas.toBuffer('image/png');
const outPath = 'C:\\Users\\abrah\\OneDrive\\Imágenes\\Desktop\\Rox Studios\\Rox Security\\banner.png';
fs.writeFileSync(outPath, buffer);
console.log(`✅ Banner created: ${outPath}`);
console.log(`📐 Size: ${W}x${H}`);
