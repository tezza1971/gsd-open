import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectCommand } from './detect.js';
import type { CLIOptions } from '../types/index.js';

// Mock modules
vi.mock('@clack/prompts', () => ({
  select: vi.fn(),
  text: vi.fn(),
  isCancel: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
}));

vi.mock('../lib/detection/gsd-detector.js', () => ({
  detectGSD: vi.fn(),
}));

vi.mock('../lib/detection/opencode-detector.js', () => ({
  detectOpenCode: vi.fn(),
}));

vi.mock('../lib/detection/reporter.js', () => ({
  formatDetectionReport: vi.fn(() => 'Mock report'),
}));

vi.mock('../lib/logger.js', () => ({
  log: {
    info: vi.fn(),
    verbose: vi.fn(),
  },
}));

// Import mocked modules
import { select, isCancel } from '@clack/prompts';
import { spawnSync } from 'node:child_process';
import { detectGSD } from '../lib/detection/gsd-detector.js';
import { detectOpenCode } from '../lib/detection/opencode-detector.js';
import { log } from '../lib/logger.js';

describe('detectCommand - stale GSD handling', () => {
  const mockOptions: CLIOptions = {
    verbose: false,
    quiet: false,
    dryRun: false,
  };

  const freshGSDResult = {
    found: true,
    valid: true,
    fresh: true,
    path: '/mock/.claude',
    daysOld: 30,
  };

  const staleGSDResult = {
    found: true,
    valid: true,
    fresh: false,
    path: '/mock/.claude',
    daysOld: 120,
  };

  const opencodeResult = {
    found: true,
    path: '/usr/bin/opencode',
  };

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(detectOpenCode).mockResolvedValue(opencodeResult);
    vi.mocked(isCancel).mockReturnValue(false);

    // Reset process.exitCode
    process.exitCode = undefined;
  });

  afterEach(() => {
    // Clean up process.exitCode after each test
    process.exitCode = undefined;
  });

  it('should prompt user when GSD is stale in non-quiet mode', async () => {
    vi.mocked(detectGSD).mockResolvedValue(staleGSDResult);
    vi.mocked(select).mockResolvedValue('continue');

    await detectCommand(mockOptions);

    expect(select).toHaveBeenCalledWith({
      message: expect.stringContaining('120 days old'),
      options: expect.arrayContaining([
        expect.objectContaining({ value: 'update' }),
        expect.objectContaining({ value: 'continue' }),
        expect.objectContaining({ value: 'cancel' }),
      ]),
    });
  });

  it('should skip prompt when GSD is stale but quiet mode is enabled', async () => {
    vi.mocked(detectGSD).mockResolvedValue(staleGSDResult);

    const quietOptions = { ...mockOptions, quiet: true };
    await detectCommand(quietOptions);

    expect(select).not.toHaveBeenCalled();
    // Exit code is SUCCESS (0) because report.ready=true (both GSD and OpenCode found)
    // The stale warning is shown in the report but doesn't block operation
    expect(process.exitCode).toBe(0);
  });

  it('should not prompt when GSD is fresh', async () => {
    vi.mocked(detectGSD).mockResolvedValue(freshGSDResult);

    await detectCommand(mockOptions);

    // select should not be called for stale GSD prompt
    // (it might be called for other prompts if GSD/OpenCode not found)
    expect(select).not.toHaveBeenCalled();
  });

  it('should run git pull when update option is selected', async () => {
    vi.mocked(detectGSD).mockResolvedValue(staleGSDResult);
    vi.mocked(select).mockResolvedValue('update');
    vi.mocked(spawnSync).mockReturnValue({
      error: undefined,
      status: 0,
      stdout: '',
      stderr: '',
      pid: 1234,
      output: [],
      signal: null,
    } as any);

    await detectCommand(mockOptions);

    expect(spawnSync).toHaveBeenCalledWith(
      'git',
      ['pull'],
      expect.objectContaining({
        cwd: '/mock/.claude',
        encoding: 'utf-8',
        timeout: 30000,
        stdio: 'inherit',
      })
    );

    expect(log.info).toHaveBeenCalledWith(
      expect.stringContaining('updated successfully')
    );
  });

  it('should handle git pull failure gracefully', async () => {
    vi.mocked(detectGSD).mockResolvedValue(staleGSDResult);
    vi.mocked(select).mockResolvedValue('update');
    vi.mocked(spawnSync).mockReturnValue({
      error: new Error('git not found'),
      status: 1,
      stdout: '',
      stderr: 'error',
      pid: 1234,
      output: [],
      signal: null,
    } as any);

    await detectCommand(mockOptions);

    expect(log.info).toHaveBeenCalledWith(
      expect.stringContaining('Failed to update')
    );
  });

  it('should continue without action when continue option is selected', async () => {
    vi.mocked(detectGSD).mockResolvedValue(staleGSDResult);
    vi.mocked(select).mockResolvedValue('continue');

    await detectCommand(mockOptions);

    expect(spawnSync).not.toHaveBeenCalled();
    // Exit code is SUCCESS (0) because report.ready=true (both GSD and OpenCode found)
    expect(process.exitCode).toBe(0);
  });

  it('should exit gracefully when cancel option is selected', async () => {
    vi.mocked(detectGSD).mockResolvedValue(staleGSDResult);
    vi.mocked(select).mockResolvedValue('cancel');

    await detectCommand(mockOptions);

    expect(process.exitCode).toBe(0); // SUCCESS exit code
  });

  it('should handle Ctrl+C cancellation in stale prompt', async () => {
    vi.mocked(detectGSD).mockResolvedValue(staleGSDResult);
    vi.mocked(select).mockResolvedValue(Symbol('cancel') as any);
    vi.mocked(isCancel).mockReturnValue(true);

    await detectCommand(mockOptions);

    expect(log.info).toHaveBeenCalledWith('Detection cancelled.');
    expect(process.exitCode).toBe(0); // SUCCESS exit code
  });
});
