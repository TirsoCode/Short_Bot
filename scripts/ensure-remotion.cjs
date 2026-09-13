const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const remotionDir = path.join(__dirname, '..', 'remotion');
const remotionBin = path.join(remotionDir, 'node_modules', '.bin', 'remotion');

if (process.env.NODE_ENV === 'production') {
  console.log('[remotion] skip (producción/Vercel): remotion no se instala en serverless');
  process.exit(0);
}

if (fs.existsSync(remotionBin)) {
  console.log('[remotion] ya instalado');
  process.exit(0);
}

console.log('[remotion] instalando dependencias de remotion/ (primera vez)...');
try {
  execSync('npm --prefix remotion install', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  console.log('[remotion] instalado. Primer render descargará Chromium automáticamente.');
} catch (error) {
  console.error('[remotion] fallo al instalar: ' + (error.message || error));
  process.exit(1);
}