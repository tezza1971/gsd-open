/**
 * LLM Client for Enhancement Engine
 *
 * Detects and uses OpenCode's configured LLM model.
 * Supports Anthropic and OpenAI providers via direct API calls (no SDK dependencies).
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Model configuration detected from OpenCode settings
 */
export interface ModelConfig {
  /** LLM provider (e.g., "anthropic", "openai") */
  provider: string;

  /** Model identifier (e.g., "claude-3-5-sonnet-20241022", "gpt-4") */
  model: string;
}

/**
 * Detects OpenCode's configured LLM model from settings file.
 * Checks common configuration file locations and formats.
 *
 * @param opencodeConfigPath - Path to OpenCode config directory
 * @returns Model configuration or null if not found/configured
 */
export async function detectOpenCodeModel(opencodeConfigPath: string): Promise<ModelConfig | null> {
  try {
    // Check for settings.json (most common)
    const settingsPath = join(opencodeConfigPath, 'settings.json');
    if (existsSync(settingsPath)) {
      const content = JSON.parse(await readFile(settingsPath, 'utf-8'));
      if (content.llm?.provider && content.llm?.model) {
        return {
          provider: content.llm.provider,
          model: content.llm.model
        };
      }
    }

    // Check for config.json as fallback
    const configPath = join(opencodeConfigPath, 'config.json');
    if (existsSync(configPath)) {
      const content = JSON.parse(await readFile(configPath, 'utf-8'));
      if (content.llm?.provider && content.llm?.model) {
        return {
          provider: content.llm.provider,
          model: content.llm.model
        };
      }
      // Also check for top-level provider/model
      if (content.provider && content.model) {
        return {
          provider: content.provider,
          model: content.model
        };
      }
    }

    return null;
  } catch (error) {
    // Silently handle JSON parse errors or missing files
    return null;
  }
}

/**
 * Calls Anthropic's Messages API directly using fetch.
 * No SDK dependencies - pure Node.js implementation.
 *
 * @param prompt - Text prompt to send
 * @param model - Model identifier
 * @param apiKey - Anthropic API key
 * @returns LLM response text
 */
async function callAnthropic(prompt: string, model: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // Extract text from content array
  if (data.content && Array.isArray(data.content) && data.content.length > 0) {
    return data.content[0].text || '';
  }

  throw new Error('Invalid response format from Anthropic API');
}

/**
 * Calls OpenAI's Chat Completions API directly using fetch.
 * No SDK dependencies - pure Node.js implementation.
 *
 * @param prompt - Text prompt to send
 * @param model - Model identifier
 * @param apiKey - OpenAI API key
 * @returns LLM response text
 */
async function callOpenAI(prompt: string, model: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4096
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // Extract text from choices
  if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
    return data.choices[0].message?.content || '';
  }

  throw new Error('Invalid response format from OpenAI API');
}

/**
 * Calls configured LLM with retry logic.
 * Uses OpenCode's model configuration and environment variables for API keys.
 *
 * @param prompt - Text prompt to send to LLM
 * @param opencodeConfigPath - Path to OpenCode config directory
 * @returns LLM response text
 * @throws Error if model not configured or API call fails after retry
 */
export async function callLLM(prompt: string, opencodeConfigPath: string): Promise<string> {
  // Detect model configuration
  const modelConfig = await detectOpenCodeModel(opencodeConfigPath);

  if (!modelConfig) {
    throw new Error(
      'No LLM model configured in OpenCode. Please configure a model in settings.json or config.json.'
    );
  }

  // Get API key from environment
  let apiKey: string | undefined;
  if (modelConfig.provider === 'anthropic') {
    apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY environment variable not set. Please set it to use Anthropic models.'
      );
    }
  } else if (modelConfig.provider === 'openai') {
    apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY environment variable not set. Please set it to use OpenAI models.'
      );
    }
  } else {
    throw new Error(
      `Unsupported LLM provider: ${modelConfig.provider}. Only "anthropic" and "openai" are supported.`
    );
  }

  // Call LLM with retry logic (1 retry with exponential backoff)
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (modelConfig.provider === 'anthropic') {
        return await callAnthropic(prompt, modelConfig.model, apiKey);
      } else if (modelConfig.provider === 'openai') {
        return await callOpenAI(prompt, modelConfig.model, apiKey);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If this was the first attempt, wait before retry
      if (attempt === 0) {
        // Exponential backoff: 1 second for first retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // Both attempts failed
  throw new Error(
    `LLM call failed after 2 attempts: ${lastError?.message || 'Unknown error'}`
  );
}
