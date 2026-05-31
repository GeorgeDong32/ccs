/**
 * Check analytics-only bundle for forbidden imports
 *
 * After building the analytics-only frontend shell, scan the output bundle
 * for strings that indicate forbidden modules were bundled (auth-context,
 * WebSocket, Layout, App.tsx, etc.)
 *
 * Usage: node scripts/check-analytics-imports.js <bundle-dir>
 */

const fs = require('fs');
const path = require('path');

const FORBIDDEN_PATTERNS = [
  { pattern: /auth[_-]?context/i, name: 'AuthContext' },
  { pattern: /use[_-]?websocket/i, name: 'useWebSocket' },
  { pattern: /app[_-]?sidebar/i, name: 'AppSidebar' },
  { pattern: /["']Layout["']/, name: 'Layout' },
  { pattern: /App\.tsx/, name: 'App.tsx' },
  { pattern: /RequireAuth/, name: 'RequireAuth' },
  { pattern: /ConnectionIndicator/, name: 'ConnectionIndicator' },
];

function walkDir(dir) {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...walkDir(fullPath));
      } else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) {
        results.push(fullPath);
      }
    }
  } catch {
    // skip if dir doesn't exist
  }
  return results;
}

function main() {
  const bundleDir = process.argv[2];
  if (!bundleDir) {
    console.error('Usage: node scripts/check-analytics-imports.js <bundle-dir>');
    process.exit(1);
  }

  const jsFiles = walkDir(bundleDir);
  const analyticsBundle = jsFiles.filter((f) => f.includes('analytics'));

  if (analyticsBundle.length === 0) {
    console.log('[i] No analytics-specific bundles found — checking all bundles');
  }

  const filesToCheck = analyticsBundle.length > 0 ? analyticsBundle : jsFiles;
  let violations = [];

  for (const filePath of filesToCheck) {
    const content = fs.readFileSync(filePath, 'utf-8');
    for (const { pattern, name } of FORBIDDEN_PATTERNS) {
      if (pattern.test(content)) {
        violations.push({ file: path.basename(filePath), pattern: name });
      }
    }
  }

  if (violations.length > 0) {
    console.error('[X] Forbidden imports detected in analytics bundle:');
    for (const v of violations) {
      console.error(`    - ${v.pattern} found in ${v.file}`);
    }
    console.error('\n    This means the analytics shell transitively imports modules from');
    console.error('    the full Dashboard. Review AnalyticsOnlyApp.tsx imports and the');
    console.error('    AnalyticsPage dependency chain.');
    process.exit(1);
  }

  console.log('[OK] Analytics bundle check passed — no forbidden imports detected');
}

main();
