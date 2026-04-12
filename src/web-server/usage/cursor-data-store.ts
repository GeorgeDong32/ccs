/**
 * Cursor Usage Data Store
 *
 * Manages persistence of imported Cursor usage data.
 * Stores events in a separate cache file from Claude Code usage.
 *
 * Cache location: ~/.ccs/cache/cursor-usage.json
 * Write pattern: Atomic (temp file + rename)
 */

import * as fs from 'fs';
import * as path from 'path';
import { getCcsDir } from '../../utils/config-manager';
import {
  parseCursorCsv,
  getEventsDateRange,
  getUniqueModels,
  computeEventTotals,
  CursorUsageEvent,
  CursorImportResult,
  CursorCsvError,
} from './cursor-csv-parser';

/** On-disk cache format */
export interface CursorDataCache {
  version: number;
  events: CursorUsageEvent[];
  importedAt: string;
  dateRange: { from: string; to: string } | null;
}

/** Status response for stored Cursor data */
export interface CursorDataStatus {
  hasData: boolean;
  importedAt: string | null;
  dateRange: { from: string; to: string } | null;
  totalEvents: number;
  totalTokens: number;
  models: string[];
}

// Current cache version — increment to invalidate
const CACHE_VERSION = 1;

function getCacheDir(): string {
  return path.join(getCcsDir(), 'cache');
}

function getCacheFile(): string {
  return path.join(getCacheDir(), 'cursor-usage.json');
}

function ensureCacheDir(): void {
  const dir = getCacheDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Create a composite key for deduplication: (timestamp, model, requests)
 */
function eventKey(event: CursorUsageEvent): string {
  return `${event.timestamp}|${event.model}|${event.requests}`;
}

/**
 * Load stored Cursor usage events from disk cache
 * Returns empty array if no data exists
 */
export function loadCursorData(): CursorUsageEvent[] {
  try {
    const cacheFile = getCacheFile();
    if (!fs.existsSync(cacheFile)) return [];

    const data = fs.readFileSync(cacheFile, 'utf-8');
    const cache: CursorDataCache = JSON.parse(data);

    if (cache.version !== CACHE_VERSION) return [];
    return cache.events || [];
  } catch {
    return [];
  }
}

/**
 * Save Cursor usage events to disk cache (atomic write)
 */
export function saveCursorData(events: CursorUsageEvent[]): void {
  try {
    ensureCacheDir();

    const cache: CursorDataCache = {
      version: CACHE_VERSION,
      events,
      importedAt: new Date().toISOString(),
      dateRange: getEventsDateRange(events),
    };

    // Atomic write: temp file + rename
    const cacheFile = getCacheFile();
    const tempFile = cacheFile + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(cache), 'utf-8');
    fs.renameSync(tempFile, cacheFile);
  } catch {
    // Non-fatal — import can still succeed in-memory
  }
}

/**
 * Merge new events with existing data, deduplicating by composite key
 */
function mergeEvents(
  existing: CursorUsageEvent[],
  incoming: CursorUsageEvent[]
): { events: CursorUsageEvent[]; mergedCount: number } {
  const eventMap = new Map<string, CursorUsageEvent>();

  // Add existing events first
  for (const event of existing) {
    eventMap.set(eventKey(event), event);
  }

  // Overwrite with new events (newer data wins on collision)
  let mergedCount = 0;
  for (const event of incoming) {
    const key = eventKey(event);
    if (eventMap.has(key)) mergedCount++;
    eventMap.set(key, event);
  }

  return {
    events: Array.from(eventMap.values()),
    mergedCount,
  };
}

/**
 * Import a CSV file: parse, merge with existing data, persist
 */
export async function importCsvFile(filePath: string): Promise<CursorImportResult> {
  // Parse the CSV file
  const newEvents = await parseCursorCsv(filePath);
  if (newEvents.length === 0) {
    throw new CursorCsvError('No valid data found in CSV file');
  }

  // Load existing data and merge
  const existing = loadCursorData();
  const { events: mergedEvents } = mergeEvents(existing, newEvents);

  // Persist merged data
  saveCursorData(mergedEvents);

  // Compute result stats from newly imported events
  const totals = computeEventTotals(newEvents);
  const dateRange = getEventsDateRange(newEvents);
  const models = getUniqueModels(newEvents);

  return {
    rowsParsed: newEvents.length,
    rowsSkipped: 0,
    dateRange,
    totalTokens: totals.totalTokens,
    totalRequests: totals.totalRequests,
    models,
    mergedWithExisting: existing.length > 0,
  };
}

/**
 * Get status summary of stored Cursor data
 */
export function getCursorStatus(): CursorDataStatus {
  try {
    const cacheFile = getCacheFile();
    if (!fs.existsSync(cacheFile)) {
      return {
        hasData: false,
        importedAt: null,
        dateRange: null,
        totalEvents: 0,
        totalTokens: 0,
        models: [],
      };
    }

    const data = fs.readFileSync(cacheFile, 'utf-8');
    const cache: CursorDataCache = JSON.parse(data);

    if (cache.version !== CACHE_VERSION) {
      return {
        hasData: false,
        importedAt: null,
        dateRange: null,
        totalEvents: 0,
        totalTokens: 0,
        models: [],
      };
    }

    const totals = computeEventTotals(cache.events);
    return {
      hasData: cache.events.length > 0,
      importedAt: cache.importedAt,
      dateRange: cache.dateRange,
      totalEvents: cache.events.length,
      totalTokens: totals.totalTokens,
      models: getUniqueModels(cache.events),
    };
  } catch {
    return {
      hasData: false,
      importedAt: null,
      dateRange: null,
      totalEvents: 0,
      totalTokens: 0,
      models: [],
    };
  }
}

/**
 * Clear all stored Cursor usage data
 * Returns the number of events removed
 */
export function clearCursorData(): number {
  try {
    const cacheFile = getCacheFile();
    if (!fs.existsSync(cacheFile)) return 0;

    const data = fs.readFileSync(cacheFile, 'utf-8');
    const cache: CursorDataCache = JSON.parse(data);
    const count = cache.events?.length ?? 0;

    fs.unlinkSync(cacheFile);
    return count;
  } catch {
    return 0;
  }
}
