import { describe, it, expect } from 'vitest';
import { generateReport, type ReportSummary } from './reporter.js';
import type { TranspileResult, TransformGaps, GapCategory } from '../../types/index.js';

/**
 * Create a minimal TranspileResult for testing.
 */
function createTestResult(overrides: Partial<TranspileResult> = {}): TranspileResult {
  return {
    success: true,
    errors: [],
    warnings: [],
    gaps: {
      unmappedFields: [],
      approximations: [],
    },
    ...overrides,
  };
}

/**
 * Create test gaps with various categories.
 */
function createTestGaps(counts: {
  unsupported?: number;
  platform?: number;
  missingDep?: number;
  approximations?: number;
}): TransformGaps {
  const gaps: TransformGaps = {
    unmappedFields: [],
    approximations: [],
  };

  // Add unmapped fields
  for (let i = 0; i < (counts.unsupported || 0); i++) {
    gaps.unmappedFields.push({
      field: `unsupported-field-${i}`,
      value: 'test',
      reason: 'Not available in OpenCode',
      sourceFile: 'commands.xml',
      category: 'unsupported',
      suggestion: 'Remove this feature',
    });
  }

  for (let i = 0; i < (counts.platform || 0); i++) {
    gaps.unmappedFields.push({
      field: `platform-field-${i}`,
      value: 'test',
      reason: 'Syntax differs in OpenCode',
      sourceFile: 'agents.xml',
      category: 'platform',
      suggestion: 'Use OpenCode syntax',
    });
  }

  for (let i = 0; i < (counts.missingDep || 0); i++) {
    gaps.unmappedFields.push({
      field: `missing-dep-field-${i}`,
      value: 'test',
      reason: 'Requires external module',
      sourceFile: 'models.xml',
      category: 'missing-dependency',
      suggestion: 'Install the plugin',
    });
  }

  // Add approximations
  for (let i = 0; i < (counts.approximations || 0); i++) {
    gaps.approximations.push({
      original: `approx-field-${i}`,
      approximatedAs: 'approximated-value',
      reason: 'Approximated for compatibility',
      sourceFile: 'commands.xml',
      category: 'platform',
    });
  }

  return gaps;
}

describe('reporter', () => {
  describe('generateReport', () => {
    it('generates report for successful transpilation with no gaps', () => {
      const result = createTestResult();
      const report = generateReport(result);

      expect(report.console).toContain('Transpilation complete!');
      expect(report.console).toContain('All features transpiled successfully! No shortfalls.');
      expect(report.summary.shortfallCount).toBe(0);
    });

    it('generates report for failed transpilation', () => {
      const result = createTestResult({
        success: false,
        errors: ['Something went wrong'],
      });
      const report = generateReport(result);

      expect(report.console).toContain('Transpilation failed!');
      expect(report.console).toContain('Something went wrong');
    });

    it('shows dry run notice when dryRun option set', () => {
      const result = createTestResult();
      const report = generateReport(result, { dryRun: true });

      expect(report.console).toContain('DRY RUN');
      expect(report.console).toContain('No files were written');
    });

    it('shows only summary in quiet mode', () => {
      const result = createTestResult({
        gaps: createTestGaps({ unsupported: 2 }),
      });

      const fullReport = generateReport(result);
      const quietReport = generateReport(result, { quietMode: true });

      // Quiet mode should be shorter
      expect(quietReport.console.length).toBeLessThan(fullReport.console.length);
      // Quiet mode still has summary
      expect(quietReport.console).toContain('SUMMARY');
      // Quiet mode doesn't have detailed shortfalls
      expect(quietReport.console).not.toContain('Unsupported (');
    });

    it('shows backup location when present', () => {
      const result = createTestResult({
        backupLocation: '/path/to/backup',
      });
      const report = generateReport(result);

      expect(report.console).toContain('/path/to/backup');
    });

    it('shows warnings when present', () => {
      const result = createTestResult({
        warnings: ['Warning 1', 'Warning 2'],
      });
      const report = generateReport(result);

      expect(report.console).toContain('Warnings:');
      expect(report.console).toContain('Warning 1');
      expect(report.console).toContain('Warning 2');
    });
  });

  describe('shortfall categorization', () => {
    it('categorizes unsupported gaps correctly', () => {
      const result = createTestResult({
        gaps: createTestGaps({ unsupported: 3 }),
      });
      const report = generateReport(result);

      expect(report.console).toContain('SHORTFALLS (3 issues');
      expect(report.console).toContain('3 unsupported');
      expect(report.console).toContain('Unsupported (3)');
      expect(report.summary.shortfallsByCategory.unsupported).toBe(3);
    });

    it('categorizes platform gaps correctly', () => {
      const result = createTestResult({
        gaps: createTestGaps({ platform: 2 }),
      });
      const report = generateReport(result);

      expect(report.console).toContain('SHORTFALLS (2 issues');
      expect(report.console).toContain('2 platform');
      expect(report.console).toContain('Platform Differences (2)');
      expect(report.summary.shortfallsByCategory.platform).toBe(2);
    });

    it('categorizes missing dependency gaps correctly', () => {
      const result = createTestResult({
        gaps: createTestGaps({ missingDep: 1 }),
      });
      const report = generateReport(result);

      expect(report.console).toContain('SHORTFALLS (1 issues');
      expect(report.console).toContain('1 missing dependency');
      expect(report.console).toContain('Missing Dependencies (1)');
      expect(report.summary.shortfallsByCategory.missingDep).toBe(1);
    });

    it('handles mixed gap categories', () => {
      const result = createTestResult({
        gaps: createTestGaps({
          unsupported: 2,
          platform: 3,
          missingDep: 1,
        }),
      });
      const report = generateReport(result);

      expect(report.console).toContain('SHORTFALLS (6 issues');
      expect(report.summary.shortfallCount).toBe(6);
      expect(report.summary.shortfallsByCategory.unsupported).toBe(2);
      expect(report.summary.shortfallsByCategory.platform).toBe(3);
      expect(report.summary.shortfallsByCategory.missingDep).toBe(1);
    });

    it('includes approximations in shortfall count', () => {
      const result = createTestResult({
        gaps: createTestGaps({
          unsupported: 1,
          approximations: 2,
        }),
      });
      const report = generateReport(result);

      // 1 unsupported + 2 approximations = 3 total
      expect(report.summary.shortfallCount).toBe(3);
    });

    it('shows source file for each gap', () => {
      const result = createTestResult({
        gaps: createTestGaps({ unsupported: 1 }),
      });
      const report = generateReport(result);

      expect(report.console).toContain('Source: commands.xml');
    });

    it('shows suggestion for each gap', () => {
      const result = createTestResult({
        gaps: createTestGaps({ unsupported: 1 }),
      });
      const report = generateReport(result);

      expect(report.console).toContain('Suggestion: Remove this feature');
    });
  });

  describe('summary calculations', () => {
    it('calculates artifact totals from transformedArtifacts', () => {
      const result = createTestResult({
        transformedArtifacts: {
          commands: ['/cmd1', '/cmd2'],
          agents: ['agent1'],
          models: ['model1', 'model2', 'model3'],
        },
      });
      const report = generateReport(result);

      expect(report.summary.totalArtifacts).toBe(6);
      expect(report.console).toContain('Total artifacts: 6');
    });

    it('shows 100% success when no gaps', () => {
      const result = createTestResult({
        transformedArtifacts: {
          commands: ['/cmd1'],
          agents: ['agent1'],
          models: [],
        },
      });
      const report = generateReport(result);

      expect(report.summary.successful).toBe(2);
      expect(report.summary.partial).toBe(0);
      expect(report.summary.failed).toBe(0);
      expect(report.console).toContain('Successful: 2 (100%)');
    });

    it('shows partial success when only approximations', () => {
      const result = createTestResult({
        transformedArtifacts: {
          commands: ['/cmd1'],
          agents: [],
          models: [],
        },
        gaps: createTestGaps({ approximations: 1 }),
      });
      const report = generateReport(result);

      expect(report.summary.partial).toBe(1);
      expect(report.console).toContain('Partial: 1 (100%)');
    });

    it('shows failure when unmapped fields exist', () => {
      const result = createTestResult({
        transformedArtifacts: {
          commands: ['/cmd1'],
          agents: [],
          models: [],
        },
        gaps: createTestGaps({ unsupported: 1 }),
      });
      const report = generateReport(result);

      expect(report.summary.failed).toBe(1);
      expect(report.console).toContain('Failed: 1 (100%)');
    });

    it('handles missing transformedArtifacts gracefully', () => {
      const result = createTestResult();
      const report = generateReport(result);

      expect(report.summary.totalArtifacts).toBe(0);
      expect(report.console).toContain('Artifact details not available');
    });
  });

  describe('artifact sections', () => {
    it('shows commands section when commands present', () => {
      const result = createTestResult({
        transformedArtifacts: {
          commands: ['/cmd1', '/cmd2'],
          agents: [],
          models: [],
        },
      });
      const report = generateReport(result);

      expect(report.console).toContain('Commands (2 items)');
      expect(report.console).toContain('/cmd1');
      expect(report.console).toContain('/cmd2');
      expect(report.console).toContain('Target: .opencode/commands.json');
    });

    it('shows agents section when agents present', () => {
      const result = createTestResult({
        transformedArtifacts: {
          commands: [],
          agents: ['agent1'],
          models: [],
        },
      });
      const report = generateReport(result);

      expect(report.console).toContain('Agents (1 items)');
      expect(report.console).toContain('agent1');
      expect(report.console).toContain('Target: .opencode/agents.json');
    });

    it('shows models section when models present', () => {
      const result = createTestResult({
        transformedArtifacts: {
          commands: [],
          agents: [],
          models: ['model1', 'model2'],
        },
      });
      const report = generateReport(result);

      expect(report.console).toContain('Models (2 items)');
      expect(report.console).toContain('model1');
      expect(report.console).toContain('model2');
      expect(report.console).toContain('Target: .opencode/models.json');
    });
  });

  describe('FormattedReport structure', () => {
    it('returns empty markdown (placeholder for Plan 03)', () => {
      const result = createTestResult();
      const report = generateReport(result);

      expect(report.markdown).toBe('');
    });

    it('returns summary with all expected fields', () => {
      const result = createTestResult();
      const report = generateReport(result);

      expect(report.summary).toHaveProperty('totalArtifacts');
      expect(report.summary).toHaveProperty('successful');
      expect(report.summary).toHaveProperty('partial');
      expect(report.summary).toHaveProperty('failed');
      expect(report.summary).toHaveProperty('shortfallCount');
      expect(report.summary).toHaveProperty('shortfallsByCategory');
      expect(report.summary.shortfallsByCategory).toHaveProperty('unsupported');
      expect(report.summary.shortfallsByCategory).toHaveProperty('platform');
      expect(report.summary.shortfallsByCategory).toHaveProperty('missingDep');
    });
  });
});
