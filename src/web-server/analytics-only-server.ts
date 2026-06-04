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

  // JSON body parsing
  app.use(
    express.json({
      type: ['application/json', 'application/cloudevents+json'],
    })
  );

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', mode: 'analytics-only' });
  });

  // Usage API routes
  app.use('/api/usage', usageRoutes);

  // Minimal /api/config endpoints — supports cost-leverage card baseline storage.
  // GET returns full unified config; PUT accepts { version, preferences } and
  // only updates the preferences field (preserves all other config).
  app.get('/api/config', (_req, res) => {
    try {
      const { loadOrCreateUnifiedConfig } = require('../config/config-loader-facade');
      const config = loadOrCreateUnifiedConfig();
      res.json({ success: true, data: config });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  app.put('/api/config', (req, res) => {
    try {
      const { loadOrCreateUnifiedConfig, saveUnifiedConfig } = require('../config/config-loader-facade');
      const body = req.body as { version?: number; preferences?: Record<string, unknown> };
      const config = loadOrCreateUnifiedConfig();
      if (body.preferences !== undefined) {
        config.preferences = { ...(config.preferences || {}), ...body.preferences };
      }
      saveUnifiedConfig(config);
      res.json({ success: true, data: config });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  // Serve the analytics frontend shell
  const staticDir = options.staticDir || path.resolve(__dirname, '../../dist/ui');
  // Non-usage API routes return 404
  app.use('/api/', (_req, res) => {
    res.status(404).json({ error: 'Not found - analytics-only mode' });
  });

  app.use(express.static(staticDir, { index: false }));

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
