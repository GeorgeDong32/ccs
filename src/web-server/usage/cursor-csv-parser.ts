/**
 * Cursor CSV Parser
 *
 * Streaming parser for Cursor IDE usage CSV exports.
 * Validates header schema and extracts token usage per event.
 *
 * CSV format (expected columns):
 *   Date, Cloud Agent ID, Automation ID, Kind, Model, Max Mode,
 *   Input (w/ Cache Write), Input (w/o Cache Write), Cache Read,
 *   Output Tokens, Total Tokens, Requests
 */

import * as fs from 'fs';
import * as readline from 'readline';

/** Parsed event from a single CSV row */
export interface CursorUsageEvent {
  timestamp: string;
  model: string;
  kind: string;
  maxMode: boolean;
  inputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
  totalTokens: number;
  requests: number;
  cloudAgentId: string;
  automationId: string;
}

/** Result of CSV import operation */
export interface CursorImportResult {
  rowsParsed: number;
  rowsSkipped: number;
  dateRange: { from: string; to: string } | null;
  totalTokens: number;
  totalRequests: number;
  models: string[];
  mergedWithExisting: boolean;
}

/** Parser error with details */
export class CursorCsvError extends Error {
  constructor(
    message: string,
    public readonly details?: string
  ) {
    super(message);
    this.name = 'CursorCsvError';
  }
}

// Required columns for schema validation (subset of full schema)
const REQUIRED_COLUMNS = ['Date', 'Model', 'Output Tokens', 'Total Tokens', 'Requests'];

/**
 * Parse a quoted CSV field — remove surrounding quotes if present
 */
function unquoteField(field: string): string {
  const trimmed = field.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Parse a single CSV line into fields, handling quoted values with commas
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  // Push the last field
  fields.push(current.trim());

  return fields;
}

/**
 * Validate CSV header against expected schema
 * Returns column index mapping for robust parsing
 */
function validateHeader(headerLine: string): Map<string, number> {
  const columns = parseCsvLine(headerLine);
  const columnMap = new Map<string, number>();

  columns.forEach((col, index) => {
    columnMap.set(col.trim(), index);
  });

  // Check required columns exist
  const missingColumns = REQUIRED_COLUMNS.filter((col) => !columnMap.has(col));
  if (missingColumns.length > 0) {
    throw new CursorCsvError(
      'Invalid CSV format',
      `Missing required columns: ${missingColumns.join(', ')}`
    );
  }

  return columnMap;
}

/**
 * Parse a number field from CSV, returning 0 for invalid values
 */
function parseNumberField(value: string): number {
  const unquoted = unquoteField(value);
  if (!unquoted || unquoted === '') return 0;
  const num = parseInt(unquoted, 10);
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

/**
 * Extract date portion (YYYYMMDD) from ISO timestamp
 */
function extractDateFromIso(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (!Number.isFinite(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Parse a Cursor usage CSV file using streaming
 * Validates header, extracts events, handles malformed rows gracefully
 */
export async function parseCursorCsv(filePath: string): Promise<CursorUsageEvent[]> {
  const events: CursorUsageEvent[] = [];
  let fileStream: fs.ReadStream | null = null;
  let rl: readline.Interface | null = null;
  let columnMap: Map<string, number> | null = null;

  try {
    fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      // Track line count for potential debugging (not used in current implementation)
      // lineNumber++;

      // Skip empty lines
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // First non-empty line is the header
      if (!columnMap) {
        columnMap = validateHeader(trimmedLine);
        continue;
      }

      // Parse data row
      try {
        const fields = parseCsvLine(trimmedLine);
        const get = (colName: string): string => {
          // columnMap is guaranteed to be set at this point (after header validation)
          const idx = columnMap ? columnMap.get(colName) : undefined;
          return idx !== undefined && idx < fields.length ? fields[idx] : '';
        };

        const timestampRaw = unquoteField(get('Date'));
        const model = unquoteField(get('Model'));

        // Skip rows with missing essential data
        if (!timestampRaw || !model) continue;

        const inputWithCache = parseNumberField(get('Input (w/ Cache Write)'));
        const inputWithoutCache = parseNumberField(get('Input (w/o Cache Write)'));
        const cacheWriteTokens = Math.max(0, inputWithCache - inputWithoutCache);

        events.push({
          timestamp: timestampRaw,
          model,
          kind: unquoteField(get('Kind')),
          maxMode: unquoteField(get('Max Mode')).toLowerCase() === 'yes',
          inputTokens: inputWithoutCache,
          cacheWriteTokens,
          cacheReadTokens: parseNumberField(get('Cache Read')),
          outputTokens: parseNumberField(get('Output Tokens')),
          totalTokens: parseNumberField(get('Total Tokens')),
          requests: parseNumberField(get('Requests')) || 1,
          cloudAgentId: unquoteField(get('Cloud Agent ID')),
          automationId: unquoteField(get('Automation ID')),
        });
      } catch {
        // Skip malformed rows silently
      }
    }
  } finally {
    rl?.close();
    fileStream?.destroy();
  }

  if (!columnMap) {
    throw new CursorCsvError('Invalid CSV format', 'No header row found');
  }

  return events;
}

/**
 * Get the date range from a set of events
 */
export function getEventsDateRange(events: CursorUsageEvent[]): {
  from: string;
  to: string;
} | null {
  if (events.length === 0) return null;

  let minDate = '';
  let maxDate = '';

  for (const event of events) {
    const date = extractDateFromIso(event.timestamp);
    if (!date) continue;
    if (!minDate || date < minDate) minDate = date;
    if (!maxDate || date > maxDate) maxDate = date;
  }

  return minDate && maxDate ? { from: minDate, to: maxDate } : null;
}

/**
 * Get unique model names from events
 */
export function getUniqueModels(events: CursorUsageEvent[]): string[] {
  const modelSet = new Set(events.map((e) => e.model));
  return Array.from(modelSet).sort();
}

/**
 * Compute aggregate totals from events
 */
export function computeEventTotals(events: CursorUsageEvent[]): {
  totalTokens: number;
  totalRequests: number;
} {
  let totalTokens = 0;
  let totalRequests = 0;
  for (const event of events) {
    totalTokens += event.totalTokens;
    totalRequests += event.requests;
  }
  return { totalTokens, totalRequests };
}
