import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { transformToOpenCode } from './transformer.js';
import { emitOpenCodeConfig } from './emitter.js';
import type { GSDIntermediate } from './ir-types.js';

// Mock fs/promises for user override loading
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

import { readFile } from 'node:fs/promises';
const mockReadFile = vi.mocked(readFile);

/**
 * Create a minimal valid GSD Intermediate for testing.
 */
function createTestIR(overrides: Partial<GSDIntermediate> = {}): GSDIntermediate {
  return {
    version: '1.0',
    source: {
      path: '/test/gsd',
      hash: 'abc123',
      timestamp: '2024-01-01T00:00:00Z',
    },
    agents: [],
    commands: [],
    models: [],
    config: {},
    gaps: {
      unmappedFields: [],
      approximations: [],
    },
    ...overrides,
  };
}

describe('transformer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no user override file
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('transformToOpenCode', () => {
    it('transforms empty IR successfully', async () => {
      const ir = createTestIR();
      const result = await transformToOpenCode(ir);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.opencode).toBeDefined();
      expect(result.opencode?.agents).toHaveLength(0);
      expect(result.opencode?.commands).toHaveLength(0);
      expect(result.opencode?.models).toHaveLength(0);
    });

    it('transforms agents with field mappings', async () => {
      const ir = createTestIR({
        agents: [
          {
            name: 'test-agent',
            description: 'A test agent',
            model: 'gpt-4',
            temperature: 0.5,
            systemPrompt: 'You are a helpful assistant.',
            maxTokens: 1000,
          },
        ],
      });

      const result = await transformToOpenCode(ir);

      expect(result.success).toBe(true);
      expect(result.opencode?.agents).toHaveLength(1);

      const agent = result.opencode!.agents[0];
      expect(agent.name).toBe('test-agent');
      expect(agent.description).toBe('A test agent');
      expect(agent.model).toBe('gpt-4');
      expect(agent.temperature).toBe(0.5);
      expect(agent.systemMessage).toBe('You are a helpful assistant.');
      expect(agent.maxTokens).toBe(1000);
    });

    it('applies default temperature when not specified', async () => {
      const ir = createTestIR({
        agents: [
          {
            name: 'no-temp-agent',
            model: 'gpt-4',
            systemPrompt: 'Hello',
          },
        ],
      });

      const result = await transformToOpenCode(ir);

      expect(result.success).toBe(true);
      expect(result.opencode?.agents[0].temperature).toBe(0.7); // Default from rules
    });

    it('transforms commands with field mappings', async () => {
      const ir = createTestIR({
        commands: [
          {
            name: '/test-cmd',
            description: 'A test command',
            template: 'Do something with {{input}}',
          },
        ],
      });

      const result = await transformToOpenCode(ir);

      expect(result.success).toBe(true);
      expect(result.opencode?.commands).toHaveLength(1);

      const cmd = result.opencode!.commands[0];
      expect(cmd.name).toBe('/test-cmd');
      expect(cmd.description).toBe('A test command');
      expect(cmd.promptTemplate).toBe('Do something with {{input}}');
    });

    it('tracks variable approximations in commands', async () => {
      const ir = createTestIR({
        commands: [
          {
            name: '/var-cmd',
            description: 'Command with variables',
            template: 'Process {{input}}',
            variables: [
              { name: 'input', type: 'string', description: 'The input data' },
            ],
          },
        ],
      });

      const result = await transformToOpenCode(ir);

      expect(result.success).toBe(true);
      expect(result.gaps.approximations.length).toBeGreaterThan(0);

      const varApprox = result.gaps.approximations.find((a) =>
        a.original.includes('variables')
      );
      expect(varApprox).toBeDefined();
    });

    it('transforms models with field mappings', async () => {
      const ir = createTestIR({
        models: [
          {
            name: 'custom-model',
            provider: 'anthropic',
            endpoint: 'https://api.example.com',
          },
        ],
      });

      const result = await transformToOpenCode(ir);

      expect(result.success).toBe(true);
      expect(result.opencode?.models).toHaveLength(1);

      const model = result.opencode!.models[0];
      expect(model.modelId).toBe('custom-model'); // name -> modelId mapping
      expect(model.provider).toBe('anthropic');
      expect(model.endpoint).toBe('https://api.example.com');
    });

    it('transforms config settings', async () => {
      const ir = createTestIR({
        config: {
          theme: { dark: true },
          keybindings: { save: 'ctrl+s' },
        },
      });

      const result = await transformToOpenCode(ir);

      expect(result.success).toBe(true);
      expect(result.opencode?.settings.theme).toEqual({ dark: true });
      expect(result.opencode?.settings.keybindings).toEqual({ save: 'ctrl+s' });
    });

    it('tracks unmapped permissions as gap', async () => {
      const ir = createTestIR({
        config: {
          permissions: { fileAccess: true, networkAccess: false },
        },
      });

      const result = await transformToOpenCode(ir);

      expect(result.success).toBe(true);
      expect(result.gaps.unmappedFields).toContain('config.permissions');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('tracks tools approximation in agents', async () => {
      const ir = createTestIR({
        agents: [
          {
            name: 'tool-agent',
            model: 'gpt-4',
            tools: ['read', 'write', 'execute'],
          },
        ],
      });

      const result = await transformToOpenCode(ir);

      expect(result.success).toBe(true);
      expect(result.opencode?.agents[0].tools).toEqual(['read', 'write', 'execute']);

      const toolApprox = result.gaps.approximations.find((a) =>
        a.original.includes('tools')
      );
      expect(toolApprox).toBeDefined();
    });

    it('warns when agent missing model field', async () => {
      const ir = createTestIR({
        agents: [
          {
            name: 'no-model-agent',
            systemPrompt: 'Hello',
          },
        ],
      });

      const result = await transformToOpenCode(ir);

      expect(result.warnings.some((w) => w.includes('model'))).toBe(true);
    });

    it('loads user override rules when present', async () => {
      const userRules = {
        agents: {
          defaults: {
            temperature: 0.9, // Override default temperature
          },
        },
      };

      mockReadFile.mockResolvedValueOnce(JSON.stringify(userRules));

      const ir = createTestIR({
        agents: [
          {
            name: 'override-test',
            model: 'gpt-4',
          },
        ],
      });

      const result = await transformToOpenCode(ir);

      expect(result.success).toBe(true);
      expect(result.opencode?.agents[0].temperature).toBe(0.9);
    });
  });
});

describe('emitter', () => {
  it('emits separate JSON files for each section', () => {
    const config = {
      agents: [{ name: 'agent1', model: 'gpt-4', systemMessage: 'Hi' }],
      commands: [{ name: '/cmd1', description: 'Cmd', promptTemplate: 'Do' }],
      models: [{ modelId: 'model1', provider: 'openai' }],
      settings: { theme: { dark: true } },
    };

    const result = emitOpenCodeConfig(config);

    expect(result.success).toBe(true);
    expect(Object.keys(result.files)).toContain('agents.json');
    expect(Object.keys(result.files)).toContain('commands.json');
    expect(Object.keys(result.files)).toContain('models.json');
    expect(Object.keys(result.files)).toContain('settings.json');
  });

  it('formats JSON with 2-space indentation', () => {
    const config = {
      agents: [{ name: 'agent1', model: 'gpt-4', systemMessage: 'Hi' }],
      commands: [],
      models: [],
      settings: {},
    };

    const result = emitOpenCodeConfig(config);

    expect(result.files['agents.json']).toContain('  '); // 2-space indent
    expect(result.files['agents.json']).not.toContain('\t'); // No tabs
  });

  it('sorts object keys for deterministic output', () => {
    const config = {
      agents: [
        {
          name: 'agent1',
          model: 'gpt-4',
          systemMessage: 'Hi',
          temperature: 0.5,
        },
      ],
      commands: [],
      models: [],
      settings: {},
    };

    // Parse and check key order
    const result = emitOpenCodeConfig(config);
    const parsed = JSON.parse(result.files['agents.json']);
    const agentKeys = Object.keys(parsed.agents[0]);

    // Keys should be alphabetically sorted
    const sortedKeys = [...agentKeys].sort();
    expect(agentKeys).toEqual(sortedKeys);
  });

  it('produces identical output for same input (deterministic)', () => {
    const config = {
      agents: [{ name: 'agent1', model: 'gpt-4', systemMessage: 'Hi' }],
      commands: [{ name: '/cmd', description: 'D', promptTemplate: 'P' }],
      models: [{ modelId: 'm1', provider: 'openai' }],
      settings: { theme: { dark: true } },
    };

    const result1 = emitOpenCodeConfig(config);
    const result2 = emitOpenCodeConfig(config);

    expect(result1.files).toEqual(result2.files);
  });

  it('skips empty sections', () => {
    const config = {
      agents: [],
      commands: [],
      models: [],
      settings: {},
    };

    const result = emitOpenCodeConfig(config);

    expect(result.success).toBe(true);
    expect(Object.keys(result.files)).toHaveLength(0);
  });
});
