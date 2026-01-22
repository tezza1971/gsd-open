/**
 * LLM API Configuration Types
 *
 * Defines types for multi-provider API configuration, detection, and testing.
 */

/**
 * Provider configuration defining connection details for a specific LLM provider
 */
export interface APIProvider {
  /** Display name for user-facing messages (e.g., "OpenAI", "Anthropic") */
  name: string;
  /** Environment variable names to check for API key (in priority order) */
  envVars: string[];
  /** Default API endpoint URL for this provider */
  endpoint: string;
  /** Model identifier to use for connectivity testing */
  testModel: string;
}

/**
 * Resolved API configuration ready for LLM requests
 */
export interface APIConfig {
  /** Provider name (matches APIProvider.name) */
  provider: string;
  /** Actual API key value (stored in memory only, never persisted) */
  apiKey: string;
  /** Resolved API endpoint URL */
  endpoint: string;
  /** Default model to use for enhancement requests */
  model: string;
}

/**
 * Hardcoded provider configurations for supported LLM providers
 */
export const PROVIDER_CONFIGS: Record<string, APIProvider> = {
  openai: {
    name: 'OpenAI',
    envVars: ['OPENAI_API_KEY'],
    endpoint: 'https://api.openai.com/v1',
    testModel: 'gpt-4-turbo'
  },
  anthropic: {
    name: 'Anthropic',
    envVars: ['ANTHROPIC_API_KEY'],
    endpoint: 'https://api.anthropic.com/v1',
    testModel: 'claude-3-5-sonnet-20241022'
  },
  openrouter: {
    name: 'OpenRouter',
    envVars: ['OPENROUTER_API_KEY'],
    endpoint: 'https://openrouter.ai/api/v1',
    testModel: 'anthropic/claude-3.5-sonnet'
  },
  azure: {
    name: 'Azure OpenAI',
    envVars: ['AZURE_OPENAI_API_KEY'],
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
    testModel: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4'
  }
};

/**
 * Priority order for automatic provider detection
 */
export const PROVIDER_PRIORITY = ['openai', 'anthropic', 'openrouter', 'azure'] as const;

export type ProviderKey = typeof PROVIDER_PRIORITY[number];
