/**
 * Usage Analytics API Routes
 *
 * Provides REST endpoints for Claude Code usage analytics.
 * Supports daily, monthly, and session-based usage data aggregation.
 *
 * Route handlers are in ./handlers.ts
 */

import { Router } from 'express';
import multer from 'multer';
import {
  handleSummary,
  handleDaily,
  handleHourly,
  handleModels,
  handleSessions,
  handleMonthly,
  handleRefresh,
  handleStatus,
  handleInsights,
  handleCursorImport,
  handleCursorStatus,
  handleCursorDataClear,
} from './handlers';

export { prewarmUsageCache, clearUsageCache, getLastFetchTimestamp } from './aggregator';

// Multer configuration for CSV upload (memory storage, 10MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const usageRoutes = Router();

// Summary endpoint
usageRoutes.get('/summary', handleSummary);

// Daily usage endpoint
usageRoutes.get('/daily', handleDaily);

// Hourly usage endpoint
usageRoutes.get('/hourly', handleHourly);

// Models usage endpoint
usageRoutes.get('/models', handleModels);

// Sessions endpoint
usageRoutes.get('/sessions', handleSessions);

// Monthly usage endpoint
usageRoutes.get('/monthly', handleMonthly);

// Cache refresh endpoint
usageRoutes.post('/refresh', handleRefresh);

// Status endpoint
usageRoutes.get('/status', handleStatus);

// Insights endpoint (anomaly detection)
usageRoutes.get('/insights', handleInsights);

// Cursor usage endpoints
usageRoutes.post('/cursor/import', upload.single('file'), handleCursorImport);
usageRoutes.get('/cursor/status', handleCursorStatus);
usageRoutes.delete('/cursor/data', handleCursorDataClear);
