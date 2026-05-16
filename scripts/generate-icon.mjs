/**
 * 生成 懒人笔记 应用图标
 * 输出: public/icon.png (256x256)
 */
import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'public');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const size = 256;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext('2d');

// 圆角矩形背景
const r = 48;
ctx.beginPath();
ctx.moveTo(r, 0);
ctx.lineTo(size - r, 0);
ctx.quadraticCurveTo(size, 0, size, r);
ctx.lineTo(size, size - r);
ctx.quadraticCurveTo(size, size, size - r, size);
ctx.lineTo(r, size);
ctx.quadraticCurveTo(0, size, 0, size - r);
ctx.lineTo(0, r);
ctx.quadraticCurveTo(0, 0, r, 0);
ctx.closePath();
ctx.fillStyle = '#00A82D';
ctx.fill();

// 中间的三条线（笔记图标）
ctx.strokeStyle = '#FFFFFF';
ctx.lineWidth = 12;
ctx.lineCap = 'round';

const cx = size / 2;
const cy = size / 2;
const w = 80;

// 第一条线（顶部）
ctx.beginPath();
ctx.moveTo(cx - w/2, cy - 28);
ctx.lineTo(cx + w/2, cy - 28);
ctx.stroke();

// 第二条线（中间）
ctx.beginPath();
ctx.moveTo(cx - w/2, cy);
ctx.lineTo(cx + w/4, cy);
ctx.stroke();

// 第三条线（底部）
ctx.beginPath();
ctx.moveTo(cx - w/2, cy + 28);
ctx.lineTo(cx + w/3, cy + 28);
ctx.stroke();

// 保存
const buffer = canvas.toBuffer('image/png');
writeFileSync(join(outDir, 'icon.png'), buffer);
console.log('✅ Icon generated: public/icon.png');
