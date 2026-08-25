import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

try {
  const rootClientDir = path.resolve('../client');
  if (fs.existsSync(rootClientDir)) {
    console.log('[Build] Building React client from ../client...');
    execSync('npm run build', { cwd: rootClientDir, stdio: 'inherit' });
    
    const clientDist = path.join(rootClientDir, 'dist');
    const targetDist = path.resolve('./dist');
    if (fs.existsSync(clientDist)) {
      fs.cpSync(clientDist, targetDist, { recursive: true });
      console.log('[Build] Copied client/dist to server/dist for static deployment.');
    }
  } else {
    console.log('[Build] Server build complete.');
  }
} catch (err) {
  console.error('[Build Error]:', err.message);
  process.exit(1);
}
