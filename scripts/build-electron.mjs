/**
 * Electron 构建脚本
 * 1. Vite 构建
 * 2. 将 sql.js 本地文件复制到 dist/
 * 3. 修改 index.html 引用本地文件
 */
import { execSync } from 'child_process';
import { copyFileSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

console.log('🔨 Step 1: Vite build...');
execSync('npx vite build', { cwd: root, stdio: 'inherit' });

console.log('🔨 Step 2: Copy sql.js local files...');
const distDir = join(root, 'dist');
const sqlJsDir = join(root, 'node_modules', 'sql.js', 'dist');

// 复制 sql-wasm.wasm
copyFileSync(join(sqlJsDir, 'sql-wasm.wasm'), join(distDir, 'sql-wasm.wasm'));
// 复制 sql-wasm.js（用于生产环境离线加载）
copyFileSync(join(sqlJsDir, 'sql-wasm.js'), join(distDir, 'sql-wasm.js'));

console.log('🔨 Step 3: Update index.html for offline...');
const htmlPath = join(distDir, 'index.html');
let html = readFileSync(htmlPath, 'utf-8');

// 替换 CDN sql.js 为本地文件
html = html.replace(
  'src="https://sql.js.org/dist/sql-wasm.js"',
  'src="./sql-wasm.js"'
);

// 替换 Google Fonts 为内联/本地（可选，保留 CDN 但在 Electron 中可用）
// 保留 Google Fonts（有网络时加载，无网络时使用 fallback 字体）

writeFileSync(htmlPath, html, 'utf-8');

console.log('✅ Build complete! Run electron-builder now.');
