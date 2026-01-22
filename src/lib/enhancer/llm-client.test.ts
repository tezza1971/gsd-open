import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectOpenCodeModel, callLLM } from './llm-client.js';

// Mock node:fs
vi.mock('node:fs');
vi.mock('node:fs/promises');

// Mock fetch
global.fetch = vi.fn();

describe('LLM Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  describe('detectOpenCodeModel', () => {
    it('returns null when no config files exist', async () => {
      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await detectOpenCodeModel('/home/user/.config/opencode');

      expect(result).toBeNull();
    });

    it('detects model from settings.json with llm object', async () => {
      const fs = await import('node:fs');
      const fsPromises = await import('node:fs/promises');

      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return String(path).endsWith('settings.json');
      });

      vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify({
        llm: {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022'
        }
      }));

      const result = await detectOpenCodeModel('/home/user/.config/opencode');

      expect(result).toEqual({
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022'
      });
    });

    it('detects model from config.json with llm object', async () => {
      const fs = await import('node:fs');
      const fsPromises = await import('node:fs/promises');

      // settings.json doesn't exist, config.json does
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return String(path).endsWith('config.json');
      });

      vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify({
        llm: {
          provider: 'openai',
          model: 'gpt-4'
        }
      }));

      const result = await detectOpenCodeModel('/home/user/.config/opencode');

      expect(result).toEqual({
        provider: 'openai',
        model: 'gpt-4'
      });
    });

    it('detects model from config.json with top-level provider/model', async () => {
      const fs = await import('node:fs');
      const fsPromises = await import('node:fs/promises');

      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return String(path).endsWith('config.json');
      });

      vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify({
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022'
      }));

      const result = await detectOpenCodeModel('/home/user/.config/opencode');

      expect(result).toEqual({
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022'
      });
    });

    it('returns null when config exists but has no LLM settings', async () => {
      const fs = await import('node:fs');
      const fsPromises = await import('node:fs/promises');

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify({
        someOtherSetting: 'value'
      }));

      const result = await detectOpenCodeModel('/home/user/.config/opencode');

      expect(result).toBeNull();
    });

    it('returns null when JSON parse fails', async () => {
      const fs = await import('node:fs');
      const fsPromises = await import('node:fs/promises');

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue('{ invalid json');

      const result = await detectOpenCodeModel('/home/user/.config/opencode');

      expect(result).toBeNull();
    });
  });

  describe('callLLM', () => {
    it('throws error when no model is configured', async () => {
      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await expect(
        callLLM('test prompt', '/home/user/.config/opencode')
      ).rejects.toThrow('No LLM model configured');
    });

    it('throws error when ANTHROPIC_API_KEY is missing', async () => {
      const fs = await import('node:fs');
      const fsPromises = await import('node:fs/promises');

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify({
        llm: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' }
      }));

      await expect(
        callLLM('test prompt', '/home/user/.config/opencode')
      ).rejects.toThrow('ANTHROPIC_API_KEY environment variable not set');
    });

    it('throws error when OPENAI_API_KEY is missing', async () => {
      const fs = await import('node:fs');
      const fsPromises = await import('node:fs/promises');

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify({
        llm: { provider: 'openai', model: 'gpt-4' }
      }));

      await expect(
        callLLM('test prompt', '/home/user/.config/opencode')
      ).rejects.toThrow('OPENAI_API_KEY environment variable not set');
    });

    it('throws error for unsupported provider', async () => {
      const fs = await import('node:fs');
      const fsPromises = await import('node:fs/promises');

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify({
        llm: { provider: 'unknown', model: 'some-model' }
      }));

      process.env.UNKNOWN_API_KEY = 'test-key';

      await expect(
        callLLM('test prompt', '/home/user/.config/opencode')
      ).rejects.toThrow('Unsupported LLM provider: unknown');
    });

    it('calls Anthropic API successfully', async () => {
      const fs = await import('node:fs');
      const fsPromises = await import('node:fs/promises');

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify({
        llm: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' }
      }));

      process.env.ANTHROPIC_API_KEY = 'test-key';

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: 'LLM response text' }]
        })
      } as Response);

      const result = await callLLM('test prompt', '/home/user/.config/opencode');

      expect(result).toBe('LLM response text');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-key',
            'anthropic-version': '2023-06-01'
          })
        })
      );
    });

    it('calls OpenAI API successfully', async () => {
      const fs = await import('node:fs');
      const fsPromises = await import('node:fs/promises');

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify({
        llm: { provider: 'openai', model: 'gpt-4' }
      }));

      process.env.OPENAI_API_KEY = 'test-key';

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: { content: 'OpenAI response text' }
            }
          ]
        })
      } as Response);

      const result = await callLLM('test prompt', '/home/user/.config/opencode');

      expect(result).toBe('OpenAI response text');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key'
          })
        })
      );
    });

    it('retries once on API failure', async () => {
      const fs = await import('node:fs');
      const fsPromises = await import('node:fs/promises');

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify({
        llm: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' }
      }));

      process.env.ANTHROPIC_API_KEY = 'test-key';

      // First call fails, second succeeds
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Server error'
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            content: [{ text: 'Success after retry' }]
          })
        } as Response);

      const result = await callLLM('test prompt', '/home/user/.config/opencode');

      expect(result).toBe('Success after retry');
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('throws error after 2 failed attempts', async () => {
      const fs = await import('node:fs');
      const fsPromises = await import('node:fs/promises');

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify({
        llm: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' }
      }));

      process.env.ANTHROPIC_API_KEY = 'test-key';

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Persistent server error'
      } as Response);

      await expect(
        callLLM('test prompt', '/home/user/.config/opencode')
      ).rejects.toThrow('LLM call failed after 2 attempts');

      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('includes prompt in API request body', async () => {
      const fs = await import('node:fs');
      const fsPromises = await import('node:fs/promises');

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify({
        llm: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' }
      }));

      process.env.ANTHROPIC_API_KEY = 'test-key';

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: 'response' }]
        })
      } as Response);

      await callLLM('my test prompt', '/home/user/.config/opencode');

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.messages[0].content).toBe('my test prompt');
    });
  });
});
