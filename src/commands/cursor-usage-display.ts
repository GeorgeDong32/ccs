/**
 * Cursor Usage CLI Display
 *
 * Terminal output rendering for `ccs cursor usage` subcommand.
 * Uses ASCII-only markers: [OK], [X], [i]
 */

import { ok, fail, info } from '../utils/ui';
import type { CursorImportResult } from '../web-server/usage/cursor-csv-parser';
import type { CursorDataStatus } from '../web-server/usage/cursor-data-store';

/**
 * Render successful import result
 */
export function renderCursorUsageImport(result: CursorImportResult): number {
  console.log(ok('Imported Cursor usage data'));
  console.log('');
  console.log(`    Rows:    ${result.rowsParsed} parsed, ${result.rowsSkipped} skipped`);

  if (result.dateRange) {
    const from = result.dateRange.from;
    const to = result.dateRange.to;
    const fromDate = `${from.slice(0, 4)}-${from.slice(4, 6)}-${from.slice(6, 8)}`;
    const toDate = `${to.slice(0, 4)}-${to.slice(4, 6)}-${to.slice(6, 8)}`;
    console.log(`    Date:    ${fromDate} to ${toDate}`);
  }

  console.log(`    Tokens:  ${result.totalTokens.toLocaleString()} total`);
  console.log(`    Models:  ${result.models.join(', ')}`);

  if (result.mergedWithExisting) {
    console.log(`    ${info('Merged with existing data')}`);
  }

  console.log('');
  console.log(ok('Data saved to cache'));
  return 0;
}

/**
 * Render import error
 */
export function renderCursorUsageError(message: string, details?: string): number {
  console.error(fail('Failed to import Cursor usage data'));
  console.error(`    ${message}`);
  if (details) {
    console.error(`    ${details}`);
  }
  return 1;
}

/**
 * Render current Cursor usage data status
 */
export function renderCursorUsageStatus(status: CursorDataStatus): number {
  if (!status.hasData) {
    console.log(info('No Cursor usage data imported'));
    console.log('');
    console.log('    Use: ccs cursor usage --import <file>');
    return 0;
  }

  console.log(info('Cursor Usage Data'));
  console.log('');

  if (status.importedAt) {
    const date = new Date(status.importedAt);
    const formatted = date.toISOString().replace('T', ' ').slice(0, 19);
    console.log(`    Imported:      ${formatted}`);
  }

  if (status.dateRange) {
    const from = status.dateRange.from;
    const to = status.dateRange.to;
    const fromDate = `${from.slice(0, 4)}-${from.slice(4, 6)}-${from.slice(6, 8)}`;
    const toDate = `${to.slice(0, 4)}-${to.slice(4, 6)}-${to.slice(6, 8)}`;
    console.log(`    Date Range:    ${fromDate} to ${toDate}`);
  }

  console.log(`    Events:        ${status.totalEvents}`);
  console.log(`    Total Tokens:  ${status.totalTokens.toLocaleString()}`);

  if (status.models.length > 0) {
    console.log('');
    console.log('    Model Breakdown:');
    for (const model of status.models) {
      console.log(`      ${model}`);
    }
  }

  return 0;
}

/**
 * Render clear result
 */
export function renderCursorUsageClear(eventsRemoved: number): number {
  console.log(ok(`Cursor usage data cleared (${eventsRemoved} events removed)`));
  return 0;
}

/**
 * Render usage help
 */
export function renderCursorUsageHelp(): number {
  console.log('');
  console.log('Usage: ccs cursor usage [options]');
  console.log('');
  console.log('Options:');
  console.log('  --import <file>   Import usage data from Cursor CSV export');
  console.log('  --show            Show current stored usage summary');
  console.log('  --clear           Clear all stored Cursor usage data');
  console.log('  --help            Show this help message');
  console.log('');
  return 0;
}
