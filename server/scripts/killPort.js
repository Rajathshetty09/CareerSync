/**
 * Kill whatever process is holding PORT (default 5000) before nodemon starts.
 * Works on Windows via netstat + taskkill.
 */
import { execSync } from 'child_process';

const port = process.env.PORT || 5000;

try {
  const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
  const pids = new Set();
  for (const line of out.split('\n')) {
    if (!line.includes('LISTENING')) continue;
    const pid = line.trim().split(/\s+/).at(-1);
    if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid);
  }
  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
      console.log(`[predev] Freed port ${port} — killed PID ${pid}`);
    } catch {}
  }
} catch {
  // port was already free
}
