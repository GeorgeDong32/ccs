/**
 * Analytics-Only Express Server
 *
 * Minimal server that only mounts /api/usage/* routes, health check, and
 * static analytics frontend shell. Does NOT mount full Dashboard routes,
 * auth, WebSocket, auto-sync watcher, or CLIProxy services.
 */

import express from 'express';
import http from 'http';
import path from 'path';
import multer from 'multer';
import { usageRoutes } from './usage';
import { shutdownUsageAggregator } from './usage/aggregator';
import { createLogger } from '../services/logging';

const logger = createLogger('analytics-server');

export interface AnalyticsServerOptions {
  port: number;
  host: string;
  staticDir?: string;
}

export interface AnalyticsServerInstance {
  server: http.Server;
  cleanup: () => void;
}

/** Check if a host string is a loopback address */
export function isLoopbackHost(host: string): boolean {
  return host === '127.0.0.1' || host === 'localhost' || host === '::1' || host === '[::1]';
}

/**
 * Create and start the analytics-only Express server
 */
export async function startAnalyticsServer(
  options: AnalyticsServerOptions
): Promise<AnalyticsServerInstance> {
  const app = express();
  const server = http.createServer(app);

  // JSON body parsing with error handler for malformed JSON
  app.use(express.json());
  app.use(
    express.json({
      type: ['application/json', 'application/cloudevents+json'],
    })
  );

  // Multipart middleware for cursor CSV upload
  const analyticsUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  });
  app.use((req, _res, next) => {
    if (req.method === 'POST' && req.path.startsWith('/api/usage/cursor/import')) {
      analyticsUpload.single('file')(req, _res, next);
    } else {
      next();
    }
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', mode: 'analytics-only' });
  });

  // Usage API routes
  app.use('/api/usage', usageRoutes);

  // Serve the analytics frontend shell
  const staticDir = options.staticDir || path.resolve(__dirname, '../../dist/ui');
  // Non-usage API routes return 404
  app.use('/api/', (_req, res) => {
    res.status(404).json({ error: 'Not found - analytics-only mode' });
  });

  app.use(express.static(staticDir));

  // SPA fallback — serve analytics HTML for any non-API route
  app.get('*', (_req, res) => {
    res.sendFile(path.join(staticDir, 'index.analytics.html'), (err) => {
      if (err) {
        res.status(404).json({ error: 'Analytics frontend not found' });
      }
    });
  });

  return new Promise((resolve, reject) => {
    server.on('error', (err: Error) => {
      logger.error('server.start_failed', 'Analytics server failed to start', {
        error: err.message,
      });
      reject(err);
    });

    server.listen(options.port, options.host, () => {
      const addr = server.address();
      const actualPort = typeof addr === 'object' && addr ? addr.port : options.port;
      logger.info('server.listening', 'Analytics-only server listening', {
        host: options.host,
        port: actualPort,
      });

      const cleanup = () => {
        shutdownUsageAggregator();
        server.close();
      };

      resolve({ server, cleanup });
    });
  });
}
