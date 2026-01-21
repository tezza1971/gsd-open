#!/usr/bin/env node

import { program } from 'commander';
import { setLogLevel, log } from './lib/logger.js';
import { ExitCode } from './lib/exit-codes.js';
import { showManifesto } from './lib/manifesto.js';

program
  .name('gfh')
  .description('GSD-for-Hobos: Transpile Claude Code configs to OpenCode')
  .version('0.1.0')
  .option('-v, --verbose', 'enable verbose output')
  .option('-q, --quiet', 'suppress all output except errors')
  .option('--dry-run', 'preview changes without writing files')
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

      log.success('Ready to transpile!');

      if (options.dryRun) {
        log.info('[DRY RUN] Would proceed with transpilation');
      }
    } catch (error: any) {
      log.error(error instanceof Error ? error.message : String(error));
      process.exitCode = ExitCode.ERROR;
    }
  });

program.parse();