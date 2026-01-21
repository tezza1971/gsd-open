#!/usr/bin/env node

import { program } from 'commander';
import { setLogLevel, log } from './lib/logger.js';
import { ExitCode } from './lib/exit-codes.js';
import { showManifesto } from './lib/manifesto.js';
import { detectCommand } from './commands/detect.js';

program
  .name('gfh')
  .description('GSD-for-Hobos: Transpile Claude Code configs to OpenCode')
  .version('0.1.0')
  .option('-v, --verbose', 'enable verbose output')
  .option('-q, --quiet', 'suppress all output except errors')
  .option('--dry-run', 'preview changes without writing files')
  .option('--detect', 'run detection only (skip transpilation)')
  .action(async (options) => {
    try {
      setLogLevel(options.verbose, options.quiet);

      const accepted = await showManifesto();

      if (!accepted) {
        process.exitCode = ExitCode.SUCCESS;
        return;
      }

      if (options.verbose) {
        log.verbose('Verbose mode enabled');
      }

      // Run detection - this is the default action for Phase 2
      // Future phases will add transpilation as next step
      await detectCommand({
        verbose: options.verbose ?? false,
        quiet: options.quiet ?? false,
        dryRun: options.dryRun ?? false,
      });

      // In --detect mode, stop after detection
      if (options.detect) {
        return;
      }

      // Future: transpilation will happen here when ready
      if (options.dryRun) {
        log.info('[DRY RUN] Would proceed with transpilation');
      }
    } catch (error: unknown) {
      log.error(error instanceof Error ? error.message : String(error));
      process.exitCode = ExitCode.ERROR;
    }
  });

program.parse();