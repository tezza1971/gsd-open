import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseGSDFiles } from './parser.js';
import type { Stats } from 'node:fs';

// Mock node:fs/promises
vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    promises: {
      access: vi.fn(),
      readdir: vi.fn(),
      readFile: vi.fn(),
      stat: vi.fn()
    }
  };
});

const mockFs = await import('node:fs').then(m => m.promises);

describe('parseGSDFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse valid GSD directory with agent XML', async () => {
    const gsdPath = '/home/user/.claude/get-shit-done';

    // Mock directory access
    vi.mocked(mockFs.access).mockResolvedValue(undefined);

    // Mock directory listing
    vi.mocked(mockFs.readdir).mockResolvedValueOnce([
      { name: 'agents', isFile: () => false, isDirectory: () => true } as any,
      { name: 'package.json', isFile: () => true, isDirectory: () => false } as any
    ] as any);

    vi.mocked(mockFs.readdir).mockResolvedValueOnce([
      { name: 'qa-agent.xml', isFile: () => true, isDirectory: () => false } as any
    ] as any);

    // Mock file reads
    vi.mocked(mockFs.readFile).mockImplementation(async (path: any) => {
      if (path.includes('package.json')) {
        return JSON.stringify({ version: '1.0.0' });
      }
      if (path.includes('qa-agent.xml')) {
        return `
          <agent>
            <name>qa-agent</name>
            <description>Quality assurance agent</description>
            <model>sonnet-3.5</model>
            <temperature>0.7</temperature>
            <system-prompt>You are a QA engineer.</system-prompt>
            <tools>
              <tool>bash</tool>
              <tool>read</tool>
            </tools>
          </agent>
        `;
      }
      return '';
    });

    const result = await parseGSDFiles(gsdPath);

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.ir).toBeDefined();
    expect(result.ir?.agents).toHaveLength(1);
    expect(result.ir?.agents[0]).toMatchObject({
      name: 'qa-agent',
      description: 'Quality assurance agent',
      model: 'sonnet-3.5',
      temperature: 0.7,
      systemPrompt: 'You are a QA engineer.',
      tools: ['bash', 'read']
    });
    expect(result.ir?.source.version).toBe('1.0.0');
    expect(result.ir?.source.path).toBe(gsdPath);
    expect(result.ir?.source.hash).toBeTruthy();
  });

  it('should return error when directory does not exist', async () => {
    const gsdPath = '/nonexistent/path';

    vi.mocked(mockFs.access).mockRejectedValue(new Error('ENOENT'));

    const result = await parseGSDFiles(gsdPath);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].file).toBe(gsdPath);
    expect(result.errors[0].message).toContain('not found');
    expect(result.ir).toBeUndefined();
  });

  it('should handle malformed XML and return partial IR', async () => {
    const gsdPath = '/home/user/.claude/get-shit-done';

    vi.mocked(mockFs.access).mockResolvedValue(undefined);

    vi.mocked(mockFs.readdir).mockResolvedValueOnce([
      { name: 'agents', isFile: () => false, isDirectory: () => true } as any
    ] as any);

    vi.mocked(mockFs.readdir).mockResolvedValueOnce([
      { name: 'good-agent.xml', isFile: () => true, isDirectory: () => false } as any,
      { name: 'bad-agent.xml', isFile: () => true, isDirectory: () => false } as any
    ] as any);

    vi.mocked(mockFs.readFile).mockImplementation(async (path: any) => {
      if (path.includes('good-agent.xml')) {
        return '<agent><name>good</name></agent>';
      }
      if (path.includes('bad-agent.xml')) {
        return '<agent><description>Missing name tag</description></agent>';
      }
      return '';
    });

    const result = await parseGSDFiles(gsdPath);

    // Partial success - one agent parsed, one error
    expect(result.success).toBe(false); // Has errors
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].file).toContain('bad-agent.xml');
    expect(result.errors[0].message).toContain('missing required <name>');
    expect(result.ir).toBeDefined();
    expect(result.ir?.agents).toHaveLength(1);
    expect(result.ir?.agents[0].name).toBe('good');
  });

  it('should return success for empty directory', async () => {
    const gsdPath = '/home/user/.claude/get-shit-done';

    vi.mocked(mockFs.access).mockResolvedValue(undefined);
    vi.mocked(mockFs.readdir).mockResolvedValue([] as any);

    const result = await parseGSDFiles(gsdPath);

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.ir).toBeDefined();
    expect(result.ir?.agents).toHaveLength(0);
    expect(result.ir?.commands).toHaveLength(0);
    expect(result.ir?.models).toHaveLength(0);
  });

  it('should generate deterministic hash for same content', async () => {
    const gsdPath = '/home/user/.claude/get-shit-done';

    const fileContent = '<agent><name>test</name></agent>';

    // First parse
    vi.mocked(mockFs.access).mockResolvedValue(undefined);
    vi.mocked(mockFs.readdir).mockResolvedValue([
      { name: 'test.xml', isFile: () => true, isDirectory: () => false } as any
    ] as any);
    vi.mocked(mockFs.readFile).mockResolvedValue(fileContent);

    const result1 = await parseGSDFiles(gsdPath);
    const hash1 = result1.ir?.source.hash;

    // Reset mocks and parse again with same content
    vi.clearAllMocks();
    vi.mocked(mockFs.access).mockResolvedValue(undefined);
    vi.mocked(mockFs.readdir).mockResolvedValue([
      { name: 'test.xml', isFile: () => true, isDirectory: () => false } as any
    ] as any);
    vi.mocked(mockFs.readFile).mockResolvedValue(fileContent);

    const result2 = await parseGSDFiles(gsdPath);
    const hash2 = result2.ir?.source.hash;

    expect(hash1).toBe(hash2);
    expect(hash1).toBeTruthy();
  });

  it('should parse command XML with variables', async () => {
    const gsdPath = '/home/user/.claude/get-shit-done';

    vi.mocked(mockFs.access).mockResolvedValue(undefined);

    // Mock readdir to return different results based on path
    vi.mocked(mockFs.readdir).mockImplementation(async (path: any) => {
      if (String(path).endsWith('get-shit-done')) {
        return [
          { name: 'commands', isFile: () => false, isDirectory: () => true }
        ] as any;
      }
      if (String(path).includes('commands')) {
        return [
          { name: 'plan.xml', isFile: () => true, isDirectory: () => false }
        ] as any;
      }
      return [] as any;
    });

    const commandXML = `<command>
<name>/gsd:plan</name>
<description>Create a plan</description>
<template>Create plan for {phase}</template>
<agent>planner</agent>
<variables>
<variable>
<name>phase</name>
<type>string</type>
<description>Phase name</description>
<required>true</required>
</variable>
</variables>
</command>`;

    vi.mocked(mockFs.readFile).mockResolvedValue(commandXML);

    const result = await parseGSDFiles(gsdPath);

    // Debug
    console.log('Result:', JSON.stringify({
      success: result.success,
      agents: result.ir?.agents.length,
      commands: result.ir?.commands.length,
      models: result.ir?.models.length,
      errors: result.errors
    }, null, 2));

    expect(result.success).toBe(true);
    expect(result.ir?.commands).toHaveLength(1);
    expect(result.ir?.commands[0]).toMatchObject({
      name: '/gsd:plan',
      description: 'Create a plan',
      template: 'Create plan for {phase}',
      agent: 'planner'
    });
    expect(result.ir?.commands[0].variables).toHaveLength(1);
    expect(result.ir?.commands[0].variables?.[0]).toMatchObject({
      name: 'phase',
      type: 'string',
      description: 'Phase name',
      required: true
    });
  });

  it('should parse model XML', async () => {
    const gsdPath = '/home/user/.claude/get-shit-done';

    vi.mocked(mockFs.access).mockResolvedValue(undefined);

    vi.mocked(mockFs.readdir).mockResolvedValueOnce([
      { name: 'models', isFile: () => false, isDirectory: () => true } as any
    ] as any);

    vi.mocked(mockFs.readdir).mockResolvedValueOnce([
      { name: 'sonnet.xml', isFile: () => true, isDirectory: () => false } as any
    ] as any);

    vi.mocked(mockFs.readFile).mockImplementation(async (path: any) => {
      if (path.includes('sonnet.xml')) {
        return `
          <model>
            <name>sonnet-3.5</name>
            <provider>anthropic</provider>
            <endpoint>https://api.anthropic.com/v1</endpoint>
          </model>
        `;
      }
      return '';
    });

    const result = await parseGSDFiles(gsdPath);

    expect(result.success).toBe(true);
    expect(result.ir?.models).toHaveLength(1);
    expect(result.ir?.models[0]).toMatchObject({
      name: 'sonnet-3.5',
      provider: 'anthropic',
      endpoint: 'https://api.anthropic.com/v1'
    });
  });

  it('should parse JSON config file', async () => {
    const gsdPath = '/home/user/.claude/get-shit-done';

    vi.mocked(mockFs.access).mockResolvedValue(undefined);

    vi.mocked(mockFs.readdir).mockResolvedValueOnce([
      { name: 'config.json', isFile: () => true, isDirectory: () => false } as any
    ] as any);

    vi.mocked(mockFs.readFile).mockImplementation(async (path: any) => {
      if (path.includes('config.json')) {
        return JSON.stringify({
          theme: { color: 'blue' },
          keybindings: { 'ctrl+p': 'plan' },
          permissions: { filesystem: true },
          customField: 'value'
        });
      }
      return '';
    });

    const result = await parseGSDFiles(gsdPath);

    expect(result.success).toBe(true);
    expect(result.ir?.config.theme).toEqual({ color: 'blue' });
    expect(result.ir?.config.keybindings).toEqual({ 'ctrl+p': 'plan' });
    expect(result.ir?.config.permissions).toEqual({ filesystem: true });
    expect(result.ir?.config.custom?.customField).toBe('value');
  });

  it('should parse Markdown template with frontmatter', async () => {
    const gsdPath = '/home/user/.claude/get-shit-done';

    vi.mocked(mockFs.access).mockResolvedValue(undefined);

    vi.mocked(mockFs.readdir).mockResolvedValueOnce([
      { name: 'templates', isFile: () => false, isDirectory: () => true } as any
    ] as any);

    vi.mocked(mockFs.readdir).mockResolvedValueOnce([
      { name: 'plan.md', isFile: () => true, isDirectory: () => false } as any
    ] as any);

    vi.mocked(mockFs.readFile).mockImplementation(async (path: any) => {
      if (path.includes('plan.md')) {
        return `---
name: /gsd:plan-template
description: Plan creation template
type: command
---

# Plan Template

Create a plan for {phase}`;
      }
      return '';
    });

    const result = await parseGSDFiles(gsdPath);

    expect(result.success).toBe(true);
    expect(result.ir?.commands).toHaveLength(1);
    expect(result.ir?.commands[0]).toMatchObject({
      name: '/gsd:plan-template',
      description: 'Plan creation template'
    });
    expect(result.ir?.commands[0].template).toContain('# Plan Template');
  });

  it('should handle invalid JSON with error', async () => {
    const gsdPath = '/home/user/.claude/get-shit-done';

    vi.mocked(mockFs.access).mockResolvedValue(undefined);

    vi.mocked(mockFs.readdir).mockResolvedValueOnce([
      { name: 'bad.json', isFile: () => true, isDirectory: () => false } as any
    ] as any);

    vi.mocked(mockFs.readFile).mockResolvedValue('{ invalid json }');

    const result = await parseGSDFiles(gsdPath);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].file).toContain('bad.json');
    expect(result.errors[0].message).toContain('Invalid JSON');
  });

  it('should skip ignored directories like node_modules and .git', async () => {
    const gsdPath = '/home/user/.claude/get-shit-done';

    vi.mocked(mockFs.access).mockResolvedValue(undefined);

    vi.mocked(mockFs.readdir).mockResolvedValueOnce([
      { name: 'node_modules', isFile: () => false, isDirectory: () => true } as any,
      { name: '.git', isFile: () => false, isDirectory: () => true } as any,
      { name: 'agents', isFile: () => false, isDirectory: () => true } as any
    ] as any);

    vi.mocked(mockFs.readdir).mockResolvedValueOnce([
      { name: 'test.xml', isFile: () => true, isDirectory: () => false } as any
    ] as any);

    vi.mocked(mockFs.readFile).mockResolvedValue('<agent><name>test</name></agent>');

    const result = await parseGSDFiles(gsdPath);

    expect(result.success).toBe(true);
    // Should only call readdir twice: root and agents/ (not node_modules or .git)
    expect(vi.mocked(mockFs.readdir)).toHaveBeenCalledTimes(2);
  });

  it('should handle cross-platform paths correctly', async () => {
    const gsdPath = process.platform === 'win32'
      ? 'C:\\Users\\test\\.claude\\get-shit-done'
      : '/home/test/.claude/get-shit-done';

    vi.mocked(mockFs.access).mockResolvedValue(undefined);
    vi.mocked(mockFs.readdir).mockResolvedValue([] as any);

    const result = await parseGSDFiles(gsdPath);

    expect(result.success).toBe(true);
    expect(result.ir?.source.path).toBe(gsdPath);
  });
});
