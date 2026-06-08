import './src/config/env.js';
import { execSync } from 'child_process';
import http from 'http';
import app from './src/app.js';
import connectDB from './src/config/db.js';
import redis from './src/config/redis.js';
import logger from './src/utils/logger.js';
import env from './src/config/env.js';
import browserManager from './src/automation/browser/browserManager.js';
import { startJobDiscoveryWorker, stopJobDiscoveryWorker } from './src/workers/jobDiscovery.worker.js';
import { startResumeAnalysisWorker, stopResumeAnalysisWorker } from './src/workers/resumeAnalysis.worker.js';
import { startAutoApplyWorker, stopAutoApplyWorker } from './src/workers/autoApply.worker.js';
import { startNotificationWorker, stopNotificationWorker } from './src/workers/notification.worker.js';

// ─── Kill processes holding a port (Windows) ──────────────────────────────────

const freePort = (port) => {
  try {
    const out = execSync(`netstat -ano`, {
      encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'],
    });
    let freed = false;
    for (const line of out.split('\n')) {
      // Match ONLY the exact port (not substrings like :50001 containing :5000)
      if (!/ TCP | UDP /.test(line)) continue;
      if (!new RegExp(`[: ]${port} `).test(line)) continue;
      if (!line.includes('LISTENING')) continue;
      const pid = line.trim().split(/\s+/).at(-1);
      if (!pid || !/^\d+$/.test(pid) || pid === '0') continue;
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        logger.info(`Killed PID ${pid} that was holding port ${port}`);
        freed = true;
      } catch {}
    }
    return freed;
  } catch {
    return false;
  }
};

// ─── Bind the server with EADDRINUSE retry ────────────────────────────────────

const bindServer = (server, port) =>
  new Promise((resolve, reject) => {
    const onListening = () => {
      server.removeListener('error', onError);
      resolve();
    };
    const onError = async (err) => {
      server.removeListener('listening', onListening);
      if (err.code !== 'EADDRINUSE') return reject(err);

      logger.warn(`Port ${port} in use — attempting to free it automatically…`);
      const freed = freePort(port);
      if (!freed) {
        return reject(new Error(`Port ${port} is in use and could not be freed. Kill the blocking process manually and restart.`));
      }

      logger.info(`Port ${port} freed — retrying listen in 1.5 s`);
      await new Promise((r) => setTimeout(r, 1_500));

      // Re-attach one-shot listeners for the retry
      server.once('listening', () => {
        logger.info(`Server running on port ${port} [${env.NODE_ENV}]`);
        resolve();
      });
      server.once('error', (retryErr) => reject(retryErr));
      server.listen(port);
    };

    server.once('listening', onListening);
    server.once('error', onError);
    server.listen(port);
  });

// ─── Start ────────────────────────────────────────────────────────────────────

const start = async () => {
  await connectDB();
  await redis.ping();
  logger.info('Redis ping OK');

  const server = http.createServer(app);

  // Track open sockets so graceful shutdown can destroy them immediately
  const sockets = new Set();
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  });

  // Bind port (with EADDRINUSE auto-recovery)
  await bindServer(server, env.PORT);
  logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);

  // Start BullMQ workers AFTER the server is bound
  startJobDiscoveryWorker();
  startResumeAnalysisWorker();
  startAutoApplyWorker();
  startNotificationWorker();
  logger.info('Workers initialised');

  // ─── Graceful shutdown ───────────────────────────────────────────────────────

  const shutdown = async (signal) => {
    logger.warn(`${signal} received — shutting down gracefully`);

    // Destroy all tracked sockets immediately so server.close() doesn't
    // wait for the long-lived progress-polling connections to time out.
    for (const socket of sockets) {
      socket.destroy();
    }

    server.close(async () => {
      await Promise.allSettled([
        stopJobDiscoveryWorker(),
        stopResumeAnalysisWorker(),
        stopAutoApplyWorker(),
        stopNotificationWorker(),
      ]);
      await browserManager.shutdown();
      await redis.quit();
      process.exit(0);
    });

    // Force exit if graceful shutdown hangs beyond 8 s
    setTimeout(() => process.exit(1), 8_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
};

start().catch((err) => {
  logger.error(`Startup failed: ${err.message}`);
  process.exit(1);
});

// Unhandled rejections — log but don't exit (async errors should be caught at the call site)
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled rejection: ${reason?.message || reason}`);
});

// Uncaught synchronous exceptions — the process may be in an unknown state, exit after logging
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.message}\n${err.stack}`);
  setTimeout(() => process.exit(1), 500);
});
