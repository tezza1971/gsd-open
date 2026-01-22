#!/usr/bin/env node

/**
 * GSD Open CLI
 *
 * Main entry point that orchestrates the full installer flow:
 * 1. Detect GSD installation
 * 2. Detect/create OpenCode config directory
 * 3. Cache OpenCode documentation
 * 4. Scan GSD commands from skills/
 * 5. Transpile commands to OpenCode format
 * 6. Merge with existing commands
 * 7. Write updated commands.json
 */

import { detectGsd, detectOpenCode } from './lib/detector.js';
import { scanGsdCommands } from './lib/transpiler/scanner.js';
import { convertBatch } from './lib/transpiler/converter.js';
import {
  readCommands,
  mergeCommands,
  writeCommands,
} from './lib/installer/commands-manager.js';
import { ensureOpenCodeDocsCache } from './lib/cache/manager.js';

async function main() {
  console.log('→ Detecting GSD installation...');
  const gsdResult = detectGsd();

  if (!gsdResult.found) {
    console.error('✗', gsdResult.error);
    process.exit(1);
  }

  console.log('  ✓ Found at', gsdResult.path);

  console.log('→ Detecting OpenCode installation...');
  const opencodeResult = detectOpenCode();

  if (!opencodeResult.found) {
    console.error('✗', opencodeResult.error);
    process.exit(1);
  }

  console.log(
    '  ✓',
    opencodeResult.created ? 'Created at' : 'Found at',
    opencodeResult.path
  );

  // Cache OpenCode documentation for future /gsdo use
  console.log('→ Caching OpenCode documentation...');
  const cacheResult = await ensureOpenCodeDocsCache();

  if (cacheResult.cached) {
    if (cacheResult.stale) {
      console.log('  ⚠ Using stale cache (download failed)');
    } else {
      console.log('  ✓ Documentation cached');
    }
  } else {
    console.log('  ⚠ Cache unavailable:', cacheResult.error);
    console.log('  → Continuing without cached docs');
  }

  console.log('→ Scanning for /gsd:* commands...');
  const gsdCommands = scanGsdCommands(gsdResult.path!);
  console.log(`  ✓ Found ${gsdCommands.length} commands`);

  if (gsdCommands.length === 0) {
    console.log('\n✓ No commands to transpile');
    process.exit(0);
  }

  console.log('→ Transpiling commands...');
  const transpileResult = convertBatch(gsdCommands);
  console.log(`  ✓ ${transpileResult.successful.length} successful`);

  if (transpileResult.failed.length > 0) {
    console.log(`  ⚠ ${transpileResult.failed.length} failed`);
    // Log first few failures for debugging
    transpileResult.failed.slice(0, 3).forEach((failure) => {
      console.log(`    - ${failure.name}: ${failure.error}`);
    });
  }

  if (transpileResult.warnings.length > 0) {
    console.log(`  ⚠ ${transpileResult.warnings.length} warnings`);
  }

  console.log('→ Writing to OpenCode...');
  const existingCommands = readCommands(opencodeResult.path!);
  const mergedCommands = mergeCommands(
    existingCommands,
    transpileResult.successful
  );
  writeCommands(opencodeResult.path!, mergedCommands);
  console.log(`  ✓ ${opencodeResult.path}/commands.json updated`);

  console.log('\n✓ Installation complete');
  console.log(
    `  ${transpileResult.successful.length} GSD commands available in OpenCode`
  );
}

// Run main and handle errors
main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
